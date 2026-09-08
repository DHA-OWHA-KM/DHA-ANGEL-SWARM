// ANGEL SWARM — telemetry ingest.
//
// WHY THIS EXISTS, AND WHAT IT HONESTLY IS.
//
// The tasking layer needs one thing from the edge: a stream of physiological
// readings, one per casualty, arriving as fast as the wearable can send them.
// Until this file existed the application generated those readings inside its
// own simulation and read them back out of memory, which proves the decision
// logic and proves nothing whatever about acquisition. A reviewer who works
// in tactical medicine spots that immediately and is right to.
//
// This is the acquisition path. It listens for Cursor on Target (CoT) — the
// message format TAK already carries across tactical networks — extracts the
// medical detail, and republishes it to the browser over Server-Sent Events.
// A wearable that already reaches ATAK or BATDOK therefore reaches ANGEL
// SWARM without anything new on the soldier.
//
// THE SECURITY POSTURE, STATED PLAINLY:
//
//   - The listener is OFF unless -cot is passed. The default build opens
//     nothing but the loopback HTTP port it always opened.
//   - When enabled it binds 127.0.0.1 unless -cot-external is ALSO passed.
//     Two flags, not one, to put a socket on a real interface.
//   - It is receive-only. It parses, it never replies, and it never
//     originates a packet.
//   - The parser is bounded: a datagram over cotMaxDatagram is dropped
//     unread, and the XML decoder is fed a fixed slice rather than a stream.
//
// The CoT <detail> block below carries a prototype extension. CoT detail is
// deliberately open — that is the extension mechanism working as designed —
// but nothing here is a ratified medical CoT schema and this file does not
// claim otherwise.
package main

import (
	"encoding/json"
	"encoding/xml"
	"fmt"
	"log"
	"net"
	"net/http"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

const (
	cotMaxDatagram = 8192
	hubBuffer      = 256
	subBuffer      = 64
)

// reading is the normalised form the browser consumes. One physiological
// observation from one device about one casualty.
type reading struct {
	UID      string  `json:"uid"`      // casualty identifier, from the CoT uid
	Callsign string  `json:"callsign"` // from <contact callsign="">
	CRI      float64 `json:"cri"`      // compensatory reserve, 0..1
	Quality  float64 `json:"quality"`  // signal quality, 0..1
	HR       float64 `json:"hr"`       // heart rate, bpm, 0 if absent
	Lat      float64 `json:"lat"`
	Lon      float64 `json:"lon"`
	Device   string  `json:"device"` // reporting device model
	At       string  `json:"at"`     // CoT event time, RFC3339
	RxAt     int64   `json:"rxAt"`   // receiver wall clock, ms
}

// ---- CoT wire format -------------------------------------------------------

type cotEvent struct {
	XMLName xml.Name  `xml:"event"`
	UID     string    `xml:"uid,attr"`
	Type    string    `xml:"type,attr"`
	Time    string    `xml:"time,attr"`
	Point   cotPoint  `xml:"point"`
	Detail  cotDetail `xml:"detail"`
}

type cotPoint struct {
	Lat float64 `xml:"lat,attr"`
	Lon float64 `xml:"lon,attr"`
}

type cotDetail struct {
	Contact struct {
		Callsign string `xml:"callsign,attr"`
	} `xml:"contact"`
	// Prototype extension. See the file header.
	Medical struct {
		CRI     float64 `xml:"cri,attr"`
		Quality float64 `xml:"quality,attr"`
		HR      float64 `xml:"hr,attr"`
		Source  string  `xml:"source,attr"`
	} `xml:"_medical_"`
}

// ---- the hub ---------------------------------------------------------------

type telemetryHub struct {
	mu   sync.Mutex
	subs map[chan []byte]struct{}

	enabled  atomic.Bool
	bind     string
	external bool

	msgs    atomic.Int64
	dropped atomic.Int64
	lastRx  atomic.Int64 // unix ms

	devMu   sync.Mutex
	devices map[string]int64 // uid -> last seen unix ms
}

func newTelemetryHub() *telemetryHub {
	return &telemetryHub{
		subs:    make(map[chan []byte]struct{}),
		devices: make(map[string]int64),
	}
}

func (h *telemetryHub) subscribe() chan []byte {
	ch := make(chan []byte, subBuffer)
	h.mu.Lock()
	h.subs[ch] = struct{}{}
	h.mu.Unlock()
	return ch
}

func (h *telemetryHub) unsubscribe(ch chan []byte) {
	h.mu.Lock()
	if _, ok := h.subs[ch]; ok {
		delete(h.subs, ch)
		close(ch)
	}
	h.mu.Unlock()
}

// publish is non-blocking per subscriber. A browser tab that has stopped
// draining must not be able to stall the UDP reader — the reading is dropped
// for that subscriber and counted, which is the honest behaviour for a live
// feed. Losing the oldest reading is always better than blocking the newest.
func (h *telemetryHub) publish(b []byte) {
	h.mu.Lock()
	for ch := range h.subs {
		select {
		case ch <- b:
		default:
			h.dropped.Add(1)
		}
	}
	h.mu.Unlock()
}

func (h *telemetryHub) note(uid string) {
	now := time.Now().UnixMilli()
	h.msgs.Add(1)
	h.lastRx.Store(now)
	if uid == "" {
		return
	}
	h.devMu.Lock()
	h.devices[uid] = now
	h.devMu.Unlock()
}

// deviceCount counts devices heard from inside the window. A device that has
// stopped reporting stops being counted, which is what a medic needs to know.
func (h *telemetryHub) deviceCount(window time.Duration) int {
	cut := time.Now().Add(-window).UnixMilli()
	n := 0
	h.devMu.Lock()
	for _, seen := range h.devices {
		if seen >= cut {
			n++
		}
	}
	h.devMu.Unlock()
	return n
}

// ---- UDP listener ----------------------------------------------------------

func (h *telemetryHub) listenCoT(addr string, external bool) error {
	host, port, err := net.SplitHostPort(addr)
	if err != nil {
		host, port = "127.0.0.1", strings.TrimPrefix(addr, ":")
	}
	if host == "" {
		host = "127.0.0.1"
	}
	if !external {
		ip := net.ParseIP(host)
		if host != "localhost" && (ip == nil || !ip.IsLoopback()) {
			return fmt.Errorf("refusing to bind %s: pass -cot-external to put the "+
				"telemetry listener on a non-loopback interface", host)
		}
	}
	ua, err := net.ResolveUDPAddr("udp", net.JoinHostPort(host, port))
	if err != nil {
		return err
	}
	pc, err := net.ListenUDP("udp", ua)
	if err != nil {
		return err
	}
	h.bind = pc.LocalAddr().String()
	h.external = external
	h.enabled.Store(true)

	go func() {
		buf := make([]byte, cotMaxDatagram)
		for {
			n, _, err := pc.ReadFromUDP(buf)
			if err != nil {
				return
			}
			if n <= 0 || n >= cotMaxDatagram {
				h.dropped.Add(1)
				continue
			}
			r, ok := parseCoT(buf[:n])
			if !ok {
				h.dropped.Add(1)
				continue
			}
			h.note(r.UID)
			if b, err := json.Marshal(r); err == nil {
				h.publish(b)
			}
		}
	}()
	return nil
}

func parseCoT(b []byte) (reading, bool) {
	var e cotEvent
	if err := xml.Unmarshal(b, &e); err != nil {
		return reading{}, false
	}
	if e.UID == "" {
		return reading{}, false
	}
	m := e.Detail.Medical
	return reading{
		UID:      e.UID,
		Callsign: e.Detail.Contact.Callsign,
		CRI:      m.CRI,
		Quality:  m.Quality,
		HR:       m.HR,
		Lat:      e.Point.Lat,
		Lon:      e.Point.Lon,
		Device:   m.Source,
		At:       e.Time,
		RxAt:     time.Now().UnixMilli(),
	}, true
}

// ---- HTTP surface ----------------------------------------------------------

func (h *telemetryHub) handleStatus(w http.ResponseWriter, r *http.Request) {
	last := h.lastRx.Load()
	age := -1.0
	if last > 0 {
		age = float64(time.Now().UnixMilli()-last) / 1000.0
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"enabled":    h.enabled.Load(),
		"bind":       h.bind,
		"external":   h.external,
		"transport":  "CoT/UDP",
		"messages":   h.msgs.Load(),
		"dropped":    h.dropped.Load(),
		"devices":    h.deviceCount(30 * time.Second),
		"lastAgeSec": age,
	})
}

func (h *telemetryHub) handleStream(w http.ResponseWriter, r *http.Request) {
	fl, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, ": ANGEL SWARM telemetry stream\n\n")
	fl.Flush()

	ch := h.subscribe()
	defer h.unsubscribe(ch)

	// A comment frame every 15 s keeps the connection open through anything
	// that reaps idle sockets, and gives the browser a heartbeat it can use
	// to tell "quiet" from "gone".
	tick := time.NewTicker(15 * time.Second)
	defer tick.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case b, ok := <-ch:
			if !ok {
				return
			}
			fmt.Fprintf(w, "data: %s\n\n", b)
			fl.Flush()
		case <-tick.C:
			fmt.Fprintf(w, ": keepalive\n\n")
			fl.Flush()
		}
	}
}

func (h *telemetryHub) routes(mux *http.ServeMux) {
	mux.HandleFunc("/telemetry/status", loopbackOnly(h.handleStatus))
	mux.HandleFunc("/telemetry/stream", loopbackOnly(h.handleStream))
}

// loopbackOnly is the same guard the asset handler applies. The browser
// talking to this server is always on this machine; nothing else may ask.
func loopbackOnly(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
			if ip := net.ParseIP(host); ip != nil && !ip.IsLoopback() {
				http.Error(w, "loopback only", http.StatusForbidden)
				return
			}
		}
		next(w, r)
	}
}

func logTelemetry(h *telemetryHub) {
	if !h.enabled.Load() {
		log.Printf("  ingest   off — pass -cot :6969 to accept CoT telemetry")
		return
	}
	scope := "loopback only"
	if h.external {
		scope = "EXTERNAL INTERFACE — receive-only, never replies"
	}
	log.Printf("  ingest   CoT/UDP on %s (%s)", h.bind, scope)
}
