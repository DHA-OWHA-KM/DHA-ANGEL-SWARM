#!/bin/sh
# =============================================================================
#  ANGEL SWARM — one-time language-model fetch (macOS / Linux)
#
#  This folder ships without language-model weights. Run this ONCE, on a
#  machine with an internet connection, from the folder that contains the
#  ANGEL-SWARM launcher. It downloads one file into app/models/llm.gguf and
#  then the folder never needs a network again.
#
#  WHAT IT DOWNLOADS
#    Qwen2.5-0.5B-Instruct, 494 million parameters, quantised to Q4_K_M.
#    About 400 MB. Licence: Apache-2.0 (Alibaba Cloud / Qwen team). The
#    licence permits redistribution and commercial use; it is not shipped
#    inside this package only because 400 MB of weights in a demonstration
#    folder is unreasonable, not because of any restriction.
#
#  WHAT THE MODEL IS USED FOR
#    Composing the after-action summary on the "Mission brief" pane, from
#    figures the application computed itself. It is never asked a clinical
#    question and nothing it writes is fed back into the simulation. The
#    application works without it; that pane simply says so.
#
#  WHAT THIS SCRIPT VERIFIES — read this, the distinction matters
#    1. The bytes on disk match the SHA-256 the distributor declares for the
#       file (fetched from the repository's own metadata). This catches a
#       truncated, resumed-badly or corrupted download, which is the failure
#       this script exists to prevent.
#    2. The file begins with the GGUF magic and a version this build reads.
#    3. The size is in the expected range.
#    4. If EXPECTED_SHA256 below is set, the digest must equal it exactly.
#       It ships EMPTY and the reason is stated at that variable. Setting it
#       is the difference between "not corrupted in transit" and "is the
#       exact file somebody I trust checked". Please read that note.
#
#  Re-running is safe. An existing, valid model file is left alone.
# =============================================================================

set -eu

# ----------------------------------------------------------------- constants
REPO="Qwen/Qwen2.5-0.5B-Instruct-GGUF"
FILE="qwen2.5-0.5b-instruct-q4_k_m.gguf"
# Second source, same model, same quantisation, different packager. Used only
# if the first is unreachable.
ALT_REPO="bartowski/Qwen2.5-0.5B-Instruct-GGUF"
ALT_FILE="Qwen2.5-0.5B-Instruct-Q4_K_M.gguf"

HOST="https://huggingface.co"
MIN_BYTES=300000000        # 300 MB — anything smaller is not this file
MAX_BYTES=600000000        # 600 MB

# -----------------------------------------------------------------------------
# EXPECTED_SHA256 — the trust anchor, and why it is empty.
#
# This script was written inside an air-gapped build environment that is
# denied egress to huggingface.co by policy. The digest of the release file
# could therefore not be observed at authoring time, and writing a plausible
# 64-character string here would have been worse than writing nothing: every
# run would fail, or worse, somebody would delete the check to make it pass.
#
# The script still verifies the download against the SHA-256 the repository
# declares for that file, which is fetched over TLS at download time. That
# proves the bytes arrived intact. It does not, on its own, prove the file is
# what it was the day somebody audited it.
#
# TO PIN IT PROPERLY: run this script once on a machine you trust, take the
# SHA-256 it prints, satisfy yourself it matches the digest shown on the
# model's page, and paste it between the quotes below. Every later run on
# every other machine then checks against that fixed value.
# -----------------------------------------------------------------------------
EXPECTED_SHA256=""

# ------------------------------------------------------------------- plumbing
HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DEST_DIR="$HERE/app/models"
DEST="$DEST_DIR/llm.gguf"
PART="$DEST.part"

say()  { printf '%s\n' "$*"; }
fail() { printf '\n  ERROR: %s\n\n' "$*" >&2; exit 1; }
rule() { printf '  %s\n' '----------------------------------------------------------------'; }

say ''
say '  ANGEL SWARM — language model install'
rule
say "  Model    Qwen2.5-0.5B-Instruct, Q4_K_M quantisation"
say "  Size     about 400 MB"
say "  Licence  Apache-2.0"
say "  Target   app/models/llm.gguf"
rule
say ''

# ---------------------------------------------------------------- tool checks
command -v curl >/dev/null 2>&1 || fail \
"curl is not installed and this script needs it.

    macOS          curl ships with the system; if it is missing, install
                   the Xcode command line tools:  xcode-select --install
    Debian/Ubuntu  sudo apt-get install curl
    Fedora/RHEL    sudo dnf install curl

  If you cannot install curl, download this file in a web browser:
    $HOST/$REPO/resolve/main/$FILE
  and save it as  app/models/llm.gguf  inside this folder."

if command -v sha256sum >/dev/null 2>&1; then
  SHA_CMD="sha256sum"
elif command -v shasum >/dev/null 2>&1; then
  SHA_CMD="shasum -a 256"
else
  SHA_CMD=""
  say '  NOTE: no sha256sum or shasum on this machine. The download will still'
  say '        be checked for size and file format, but not by digest.'
  say ''
fi

digest() { [ -n "$SHA_CMD" ] || return 1; $SHA_CMD "$1" | cut -d' ' -f1; }

# Portable file size.
fsize() { wc -c < "$1" | tr -d ' '; }

# First four bytes, as text. `od` is in POSIX; `xxd` is not.
magic4() { od -An -N4 -c "$1" 2>/dev/null | tr -d ' \n'; }

mkdir -p "$DEST_DIR" || fail "cannot create $DEST_DIR"

# ------------------------------------------------- already installed?
if [ -f "$DEST" ]; then
  sz=$(fsize "$DEST")
  if [ "$(magic4 "$DEST")" = "GGUF" ] && [ "$sz" -ge "$MIN_BYTES" ]; then
    say "  A model is already installed:"
    say "    $DEST"
    say "    $sz bytes"
    if [ -n "$SHA_CMD" ]; then say "    sha256 $(digest "$DEST")"; fi
    say ''
    say '  Nothing to do. Delete that file and run this again if you want to'
    say '  replace it.'
    say ''
    exit 0
  fi
  say "  An existing $DEST is not a valid model file. Replacing it."
  rm -f "$DEST"
fi

# ------------------------------------------------------------ pick the source
URL="$HOST/$REPO/resolve/main/$FILE"
say "  Source   $REPO"
say "           $FILE"
say ''
say '  Checking the source is reachable...'
if ! curl -fsIL --max-time 30 "$URL" >/tmp/angel_hdr.$$ 2>/dev/null; then
  say "  The first source did not answer. Trying $ALT_REPO."
  REPO="$ALT_REPO"; FILE="$ALT_FILE"
  URL="$HOST/$REPO/resolve/main/$FILE"
  curl -fsIL --max-time 30 "$URL" >/tmp/angel_hdr.$$ 2>/dev/null || fail \
"neither source could be reached.

  Check the machine has internet access and is not behind a proxy that blocks
  huggingface.co. If it is, download the file in a browser from
    $HOST/$REPO/resolve/main/$FILE
  and save it as  app/models/llm.gguf  inside this folder, then run this
  script again to have it checked."
fi

# The distributor's declared SHA-256. For a large-file-storage object the
# linked ETag is the content digest, which is exactly what we want.
DECLARED=$(tr -d '\r' </tmp/angel_hdr.$$ \
  | awk 'tolower($1) ~ /^x-linked-etag:/ { gsub(/"/,"",$2); print $2 }' \
  | grep -E '^[0-9a-f]{64}$' | tail -n1 || true)
REMOTE_BYTES=$(tr -d '\r' </tmp/angel_hdr.$$ \
  | awk 'tolower($1) ~ /^x-linked-size:|^content-length:/ { print $2 }' \
  | grep -E '^[0-9]+$' | tail -n1 || true)
rm -f /tmp/angel_hdr.$$

if [ -n "$DECLARED" ]; then
  say "  Declared sha256  $DECLARED"
else
  say '  The source did not declare a digest in its headers. The download will'
  say '  be checked for size and format only, and the digest printed for you.'
fi
[ -n "$REMOTE_BYTES" ] && say "  Declared size    $REMOTE_BYTES bytes"
say ''

# --------------------------------------------------------------- the download
# -C - resumes a partial file rather than starting again, which is the whole
# reason the download goes to a .part file first. --retry rides out a dropped
# connection. The file only takes its real name once it has passed every check.
if [ -f "$PART" ]; then
  say "  Resuming an interrupted download ($(fsize "$PART") bytes already here)."
fi
say '  Downloading. This is about 400 MB and may take several minutes.'
say ''

if ! curl -L --fail --retry 5 --retry-delay 2 --retry-connrefused \
        --connect-timeout 30 -C - -o "$PART" "$URL"; then
  fail "the download did not complete.

  The partial file has been kept at
    $PART
  Run this script again and it will carry on from where it stopped."
fi

say ''

# ------------------------------------------------------------------- the checks
[ -f "$PART" ] || fail "the download produced no file."

sz=$(fsize "$PART")
if [ -n "$REMOTE_BYTES" ] && [ "$sz" -ne "$REMOTE_BYTES" ]; then
  fail "size mismatch: got $sz bytes, the source said $REMOTE_BYTES.
  The download is incomplete. Run this script again to resume it."
fi
if [ "$sz" -lt "$MIN_BYTES" ] || [ "$sz" -gt "$MAX_BYTES" ]; then
  rm -f "$PART"
  fail "the downloaded file is $sz bytes, which is outside the expected range
  ($MIN_BYTES to $MAX_BYTES). It has been deleted. This usually means an
  error page was saved instead of the model."
fi
say "  Size     $sz bytes — OK"

if [ "$(magic4 "$PART")" != "GGUF" ]; then
  rm -f "$PART"
  fail "the downloaded file does not begin with the GGUF magic, so it is not
  a model file. It has been deleted."
fi
say '  Format   GGUF — OK'

if [ -n "$SHA_CMD" ]; then
  GOT=$(digest "$PART")
  say "  sha256   $GOT"
  if [ -n "$EXPECTED_SHA256" ] && [ "$GOT" != "$EXPECTED_SHA256" ]; then
    rm -f "$PART"
    fail "the digest does not match the pinned EXPECTED_SHA256 in this script.
  Expected $EXPECTED_SHA256
  Got      $GOT
  The file has been deleted. Do not use it."
  fi
  if [ -n "$DECLARED" ] && [ "$GOT" != "$DECLARED" ]; then
    rm -f "$PART"
    fail "the digest does not match the one the source declared.
  Declared $DECLARED
  Got      $GOT
  The download is corrupt. It has been deleted. Run this script again."
  fi
  if [ -n "$DECLARED" ]; then say '  Digest   matches the source — OK'; fi
  if [ -z "$EXPECTED_SHA256" ]; then
    say ''
    say '  This script has no pinned digest. If you want every future install'
    say '  checked against a fixed value, put the sha256 above into the'
    say '  EXPECTED_SHA256 variable near the top of this file.'
  fi
fi

mv -f "$PART" "$DEST"

say ''
rule
say '  DONE.'
say ''
say "  Installed  $DEST"
say "  Model      Qwen2.5-0.5B-Instruct  Q4_K_M  Apache-2.0"
say ''
say '  Start the launcher and open "Mission brief" in the left-hand rail.'
say '  This machine does not need an internet connection again.'
rule
say ''
