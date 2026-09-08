# ANGEL SWARM on Replit

## Run

The Replit web preview serves the existing `app/` directory with Python's
standard-library HTTP server:

```sh
cd app && python3 -m http.server 5000 --bind 0.0.0.0
```

No dependency installation, external API, CDN, or secret is required. All
application code, models, fonts, maps, libraries, and videos remain vendored in
the repository.

## Air-gapped distribution

Replit Preview is cloud-hosted and therefore is not itself an air-gapped
environment. This Replit-only run configuration does not modify the shipped Go
launcher or the offline distribution. For a genuinely disconnected machine,
continue to use the platform binary documented in `README.md`; it binds only to
loopback and makes no outbound requests.

The Replit preview does not enable the optional Cursor-on-Target UDP telemetry
listener. That path remains available through the native launcher.