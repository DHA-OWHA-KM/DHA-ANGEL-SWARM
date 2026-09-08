# `src/` — the Go source

UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY

Two small programs: the launcher that serves `app/` and opens a browser at it, and `cotsim`, the device emitter that exercises the telemetry ingest path from outside the application over a real socket. The eight prebuilt binaries at the repository root are these two programs compiled for four platforms.

**`go.mod` declares zero requirements, so this builds offline.** The module is `angelswarm`, Go 1.24, and every import in all three source files is standard library — there is no `go.sum` in the tree because there is nothing to check. No module proxy is contacted, no cache is needed, and the build works on a machine that has never had a network.

## Building

The module root is `src/`, not the repository root, so the build is run from there. Either form works:

```sh
cd src
go build -o ../ANGEL-SWARM-linux-x64 ./cmd/angelswarm
go build -o ../cotsim-linux-x64      ./cmd/cotsim
```

or, without changing directory, using Go's own `-C`:

```sh
go build -C src -o ../ANGEL-SWARM-linux-x64 ./cmd/angelswarm
go build -C src -o ../cotsim-linux-x64      ./cmd/cotsim
```

`go build ./src/cmd/angelswarm` from the repository root does **not** work — Go looks for `go.mod` in the working directory and its parents, finds none, and stops. Cross-compiling is the usual `GOOS`/`GOARCH` pair, for example `GOOS=windows GOARCH=amd64`. The launcher must end up beside the `app` folder, because that is where it looks for its assets.

## Contents

| Path | What it is |
|---|---|
| `go.mod` | Module `angelswarm`, Go 1.24, no requirements. Three lines. |
| `cmd/angelswarm/main.go` | The launcher: finds the `app` folder next to the executable, serves it over HTTP on a loopback port (`-port`, default 8787) and opens the browser. The server exists because a `file://` page has an opaque origin and browsers refuse to construct Web Workers from one; everything load-bearing in the application runs in a worker. It never originates an outbound request and never writes outside the copied folder. |
| `cmd/angelswarm/telemetry.go` | The Cursor on Target ingest, and it is off unless `-cot` is passed. It then binds 127.0.0.1 unless `-cot-external` is passed as well — two flags, not one, to put a socket on a real interface. Receive-only: it parses a size-bounded datagram, republishes to the page over Server-Sent Events, and never replies or originates a packet. |
| `cmd/angelswarm/fallback/index.html` | Embedded with `go:embed` and served when the launcher starts but cannot find its `app` folder: one page saying where it looked and what the folder should look like. |
| `cmd/cotsim/main.go` | The device emitter. Emits CoT over UDP at a configurable cadence (`-devices`, `-rate`, `-target`, deterministic under `-seed`), one event per casualty per reporting interval, with a compensatory reserve that falls the way a bleeding casualty's does. Its own header states plainly that it is not a device driver and asserts nothing about what any fielded monitor speaks today; it exists so the acquisition path is exercised by a real socket and a real parse rather than by the simulation reading its own memory. |
