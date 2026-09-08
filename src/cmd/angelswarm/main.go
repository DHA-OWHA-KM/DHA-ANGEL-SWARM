// ANGEL SWARM — local launcher.
//
// This program is deliberately small. It does three things: it finds the
// asset folder that sits next to it, it serves that folder over HTTP on the
// loopback interface, and it opens the machine's browser at that address.
//
// Why a server at all, when the assets are just files on disk? Because a page
// opened with file:// has an opaque origin, and browsers refuse to construct
// Web Workers from an opaque origin. Everything that makes this application
// what it is — the neural network, the analytical database, the map — runs in
// a worker. Serving from 127.0.0.1 costs nothing, installs nothing, touches
// no network interface other than loopback, and makes all of it work.
//
// NETWORK POSTURE, STATED PRECISELY.
//
// This program never originates an outbound request and never writes outside
// the folder you copied. By default it opens exactly one socket: the loopback
// HTTP port above.
//
// It can also ACCEPT physiological telemetry, and that is off unless you ask
// for it. Passing -cot opens a receive-only UDP listener for Cursor on Target
// — the format TAK already carries across tactical networks — bound to
// 127.0.0.1 unless you ALSO pass -cot-external. It parses, it republishes to
// the page, and it never replies. See telemetry.go.
//
// With no -cot flag, unplug the network and it behaves identically. With
// -cot, it needs whatever tactical network is carrying the telemetry, and
// nothing else — there is still no route to the internet in it anywhere.
package main

import (
	"context"
	"embed"
	"errors"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"mime"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"time"
)

//go:embed fallback/*
var fallbackFS embed.FS

const banner = `
  ###   #   #  ###  ####  #     ###  #   #  ###  ####  #   #
 #   #  ##  # #     #     #    #     #   # #   # #   # ## ##
 #####  # # # #  ## ###   #     ###  # # # ##### ####  # # #
 #   #  #  ## #   # #     #        # ## ## #   # #  #  #   #
 #   #  #   #  ###  ####  #### ####  #   # #   # #   # #   #

  Autonomous medical resupply tasking
  UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY
`

// assetRoot locates the web assets. It looks next to the executable first,
// which is what makes "copy the folder anywhere and run it" work, then falls
// back to the working directory so the thing is also runnable from a source
// checkout during development.
func assetRoot() (string, error) {
	var candidates []string

	if exe, err := os.Executable(); err == nil {
		// Resolve symlinks so a link on the desktop still finds its assets.
		if resolved, err := filepath.EvalSymlinks(exe); err == nil {
			exe = resolved
		}
		dir := filepath.Dir(exe)
		candidates = append(candidates,
			filepath.Join(dir, "app"),
			filepath.Join(dir, "..", "app"),
		)
	}
	if wd, err := os.Getwd(); err == nil {
		candidates = append(candidates,
			filepath.Join(wd, "app"),
			wd,
		)
	}

	for _, c := range candidates {
		if st, err := os.Stat(filepath.Join(c, "index.html")); err == nil && !st.IsDir() {
			return filepath.Abs(c)
		}
	}
	return "", fmt.Errorf("could not find an 'app' folder containing index.html next to %s", firstOr(candidates, "?"))
}

func firstOr(s []string, d string) string {
	if len(s) > 0 {
		return s[0]
	}
	return d
}

// listen binds the first free port at or after `preferred`, on loopback only.
// Loopback-only is a deliberate security property: nothing on the network can
// reach this, even on a shared or hostile LAN.
func listen(preferred int) (net.Listener, int, error) {
	for port := preferred; port < preferred+40; port++ {
		ln, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", port))
		if err == nil {
			return ln, port, nil
		}
		if !errors.Is(err, syscall.EADDRINUSE) && !strings.Contains(err.Error(), "in use") &&
			!strings.Contains(err.Error(), "permission") {
			return nil, 0, err
		}
	}
	// Last resort: let the OS choose.
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, 0, err
	}
	return ln, ln.Addr().(*net.TCPAddr).Port, nil
}

// openBrowser is best-effort. If it fails the URL is already on stdout, and
// the user can paste it. Never fatal.
func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	if err := cmd.Start(); err != nil {
		return
	}
	go func() { _ = cmd.Wait() }()
}

// contentTypes covers the extensions Go's built-in table gets wrong or does
// not know. Serving .wasm as anything but application/wasm makes streaming
// compilation fail, which is the difference between a one-second start and a
// five-second one — or, in some browsers, no start at all.
var contentTypes = map[string]string{
	".wasm":        "application/wasm",
	".mjs":         "text/javascript; charset=utf-8",
	".js":          "text/javascript; charset=utf-8",
	".json":        "application/json; charset=utf-8",
	".onnx":        "application/octet-stream",
	".bin":         "application/octet-stream",
	".pmtiles":     "application/octet-stream",
	".data":        "application/octet-stream",
	".parquet":     "application/octet-stream",
	".arrow":       "application/vnd.apache.arrow.file",
	".txt":         "text/plain; charset=utf-8",
	".md":          "text/plain; charset=utf-8",
	".css":         "text/css; charset=utf-8",
	".svg":         "image/svg+xml",
	".woff2":       "font/woff2",
	".map":         "application/json; charset=utf-8",
	".webmanifest": "application/manifest+json",
}

// assetHandler serves the folder. http.ServeContent underneath gives us
// Range support for free, which is what lets the map read a slice of a large
// tile archive instead of loading the whole thing.
type assetHandler struct {
	root  string
	files http.Handler
	quiet bool
}

func (h *assetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Loopback only. Belt and braces on top of binding to 127.0.0.1.
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		if ip := net.ParseIP(host); ip != nil && !ip.IsLoopback() {
			http.Error(w, "loopback only", http.StatusForbidden)
			return
		}
	}

	clean := filepath.Clean(r.URL.Path)
	ext := strings.ToLower(filepath.Ext(clean))
	if ct, ok := contentTypes[ext]; ok {
		w.Header().Set("Content-Type", ct)
	}

	// Every asset revalidates on every load, without exception.
	//
	// This used to mark /models and /vendor "immutable, max-age=1y" on the
	// theory that they were content-addressed by build. They are not: the
	// filenames are stable across builds, so a browser that had cached
	// vendor/deck/deck.min.js would keep serving the OLD bundle for a year
	// while the freshly-updated js/ that calls into it loaded normally. The
	// two halves then disagree — the observed failure was a new geo3d.js
	// calling IconLayer against a cached bundle that predated it, throwing
	// once per animation frame. "immutable" is a promise the file will never
	// change at that URL, and updating a folder in place breaks that promise.
	//
	// no-cache does not mean "do not cache" — it means "cache, but
	// revalidate". ServeContent below sets Last-Modified and answers
	// conditional requests with 304, so the 36 MB duckdb wasm costs one
	// round trip on loopback rather than a re-download.
	w.Header().Set("Cache-Control", "no-cache")

	w.Header().Set("Accept-Ranges", "bytes")
	// This application never embeds third-party content and never phones home.
	// Declaring that is cheap and it is the kind of thing a security reviewer
	// will look for.
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Referrer-Policy", "no-referrer")

	if !h.quiet {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, code: 200}
		h.files.ServeHTTP(rec, r)
		if rec.code >= 400 {
			log.Printf("  %d %s (%s)", rec.code, r.URL.Path, time.Since(start).Round(time.Millisecond))
		}
		return
	}
	h.files.ServeHTTP(w, r)
}

type statusRecorder struct {
	http.ResponseWriter
	code int
}

func (s *statusRecorder) WriteHeader(c int) { s.code = c; s.ResponseWriter.WriteHeader(c) }

func main() {
	port := flag.Int("port", 8787, "preferred loopback port")
	noOpen := flag.Bool("no-browser", false, "do not open a browser window")
	quiet := flag.Bool("quiet", false, "suppress request logging")
	cot := flag.String("cot", "", "accept CoT telemetry on this UDP address, e.g. :6969 (off by default)")
	cotExternal := flag.Bool("cot-external", false, "allow the telemetry listener to bind a non-loopback interface")
	flag.Parse()

	log.SetFlags(0)
	fmt.Print(banner)

	// Register the MIME types globally too, for anything that bypasses our
	// header pass.
	for ext, ct := range contentTypes {
		_ = mime.AddExtensionType(ext, ct)
	}

	root, err := assetRoot()
	var handler http.Handler
	if err != nil {
		// Serve the embedded explanation page rather than dying silently —
		// a user who unzipped only the executable gets told what happened.
		sub, _ := fs.Sub(fallbackFS, "fallback")
		handler = http.FileServer(http.FS(sub))
		log.Printf("  ! %v", err)
		log.Printf("  ! Serving the setup notice instead.\n")
	} else {
		handler = &assetHandler{
			root:  root,
			files: http.FileServer(http.Dir(root)),
			quiet: *quiet,
		}
		log.Printf("  assets   %s", root)
	}

	ln, actual, err := listen(*port)
	if err != nil {
		log.Fatalf("  ! could not bind a loopback port: %v", err)
	}
	url := fmt.Sprintf("http://127.0.0.1:%d/", actual)

	// The telemetry hub is inert unless -cot is passed. Its routes are always
	// registered so the browser can ask "is ingest available?" and get an
	// honest no, rather than a 404 it has to interpret.
	hub := newTelemetryHub()
	if *cot != "" {
		if err := hub.listenCoT(*cot, *cotExternal); err != nil {
			log.Fatalf("  ! telemetry: %v", err)
		}
	}

	mux := http.NewServeMux()
	hub.routes(mux)
	mux.Handle("/", handler)

	srv := &http.Server{
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
	}

	log.Printf("  address  %s", url)
	log.Printf("  network  loopback only — nothing leaves this machine")
	logTelemetry(hub)
	log.Printf("\n  Leave this window open while you use ANGEL SWARM.")
	log.Printf("  Press Ctrl+C, or just close this window, to stop.\n")

	if !*noOpen {
		go func() {
			time.Sleep(250 * time.Millisecond)
			openBrowser(url)
		}()
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		if err := srv.Serve(ln); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("  ! server stopped: %v", err)
		}
	}()

	<-stop
	log.Printf("\n  Shutting down.")
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
}
