// ANGEL SWARM — CoT device emitter.
//
// WHAT THIS IS, AND WHAT IT IS NOT.
//
// This program stands in for the wearables. It emits Cursor on Target over
// UDP at a realistic cadence, one event per casualty per reporting interval,
// with a compensatory-reserve value that falls the way a bleeding casualty's
// does and a signal-quality value that degrades as peripheral perfusion goes.
//
// It is NOT a device driver and it is NOT a claim that any particular monitor
// speaks this dialect today. It exists so that the acquisition path in the
// application is exercised by something outside the application — a real
// socket, a real parse, a real drop when the link goes — rather than by the
// simulation reading its own memory. Point a real feed at the same port and
// the application cannot tell the difference, which is the whole point.
//
// The physiology here is deliberately crude. The application has a trained
// network for the hard part; this only has to produce a plausible waveform
// summary at the right rate.
package main

import (
	"flag"
	"fmt"
	"log"
	"math"
	"math/rand"
	"net"
	"os"
	"os/signal"
	"syscall"
	"time"
)

type casualty struct {
	uid      string
	callsign string
	lat, lon float64
	cri      float64 // compensatory reserve, 1.0 = full
	slope    float64 // reserve lost per minute
	quality  float64
	hr       float64
	dead     bool
}

func main() {
	target := flag.String("target", "127.0.0.1:6969", "UDP address to send CoT to")
	n := flag.Int("devices", 24, "number of casualty monitors to simulate")
	hz := flag.Float64("rate", 0.25, "reports per device per second")
	lat := flag.Float64("lat", 21.6, "centre latitude")
	lon := flag.Float64("lon", 122.4, "centre longitude")
	seed := flag.Int64("seed", 42, "deterministic seed")
	quiet := flag.Bool("quiet", false, "suppress per-message logging")
	flag.Parse()

	log.SetFlags(0)
	rng := rand.New(rand.NewSource(*seed))

	addr, err := net.ResolveUDPAddr("udp", *target)
	if err != nil {
		log.Fatalf("target: %v", err)
	}
	conn, err := net.DialUDP("udp", nil, addr)
	if err != nil {
		log.Fatalf("dial: %v", err)
	}
	defer conn.Close()

	cas := make([]*casualty, *n)
	for i := range cas {
		cas[i] = &casualty{
			uid:      fmt.Sprintf("CAS-%03d", i+1),
			callsign: fmt.Sprintf("CAS-%03d", i+1),
			lat:      *lat + (rng.Float64()-0.5)*0.45,
			lon:      *lon + (rng.Float64()-0.5)*0.45,
			cri:      0.55 + rng.Float64()*0.45,
			slope:    0.004 + rng.Float64()*0.030,
			quality:  0.72 + rng.Float64()*0.28,
			hr:       74 + rng.Float64()*38,
		}
	}

	log.Printf("ANGEL SWARM — CoT device emitter")
	log.Printf("  target   %s", conn.RemoteAddr())
	log.Printf("  devices  %d", *n)
	log.Printf("  rate     %.2f reports/device/second", *hz)
	log.Printf("  seed     %d (deterministic)", *seed)
	log.Printf("\n  Ctrl+C to stop. Stopping is the point: it is how you show")
	log.Printf("  the tasking layer carrying on with the link gone.\n")

	interval := time.Duration(float64(time.Second) / (*hz * float64(*n)))
	if interval < time.Millisecond {
		interval = time.Millisecond
	}
	tick := time.NewTicker(interval)
	defer tick.Stop()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	start := time.Now()
	i, sent := 0, 0
	for {
		select {
		case <-stop:
			log.Printf("\n  stopped after %d messages", sent)
			return
		case <-tick.C:
			c := cas[i%len(cas)]
			i++
			if c.dead {
				continue
			}
			dt := (*hz * float64(len(cas)))
			_ = dt
			// Reserve falls; heart rate rises late and not for everyone;
			// quality degrades as perfusion goes.
			c.cri -= c.slope * (interval.Seconds() * float64(len(cas)) / 60.0)
			if c.cri <= 0 {
				c.cri, c.dead = 0, true
			}
			c.hr = math.Min(178, c.hr+(1.0-c.cri)*0.55)
			c.quality = math.Max(0.18, c.quality-0.0016)

			msg := cotEvent(c)
			if _, err := conn.Write([]byte(msg)); err != nil {
				log.Printf("  ! send: %v", err)
				continue
			}
			sent++
			if !*quiet && sent%25 == 0 {
				log.Printf("  %5d messages · %.0fs · %d devices reporting",
					sent, time.Since(start).Seconds(), len(cas))
			}
		}
	}
}

// cotEvent renders one CoT event. The medical values ride in a <detail>
// extension; CoT detail is open by design and this is that mechanism used as
// intended. It is not a ratified medical CoT schema.
func cotEvent(c *casualty) string {
	now := time.Now().UTC()
	stale := now.Add(2 * time.Minute)
	return fmt.Sprintf(
		`<?xml version="1.0" encoding="UTF-8"?>`+
			`<event version="2.0" uid="%s" type="a-f-G-U-C-I" how="m-g" `+
			`time="%s" start="%s" stale="%s">`+
			`<point lat="%.6f" lon="%.6f" hae="0.0" ce="25.0" le="9999999.0"/>`+
			`<detail>`+
			`<contact callsign="%s"/>`+
			`<_medical_ cri="%.4f" quality="%.3f" hr="%.1f" source="CRI-MONITOR-SIM"/>`+
			`</detail></event>`,
		c.uid,
		now.Format(time.RFC3339), now.Format(time.RFC3339), stale.Format(time.RFC3339),
		c.lat, c.lon, c.callsign, c.cri, c.quality, c.hr)
}
