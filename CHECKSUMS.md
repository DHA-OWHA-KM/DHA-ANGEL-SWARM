# Checksums

`UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY`

[`CHECKSUMS.txt`](CHECKSUMS.txt) is the SHA-256 digest of every file in the ANGEL SWARM
v6.5 package as it was shipped, on 5 September 2026, as three zips. It is the record of
what left the machine it was built on. This page explains how to use it and where it no
longer lines up with the repository.

## Verifying

On Linux or macOS, from the root of the repository:

```sh
shasum -a 256 -c CHECKSUMS.txt
```

Every line prints either `OK` or `FAILED`. On Linux `sha256sum -c CHECKSUMS.txt` does
the same job.

On Windows, PowerShell has no `-c` mode, so check a file at a time and compare the hash
by eye against the line in the file:

```powershell
Get-FileHash -Algorithm SHA256 .\ANGEL-SWARM-windows-x64.exe
Select-String -Path .\CHECKSUMS.txt -Pattern 'ANGEL-SWARM-windows-x64.exe'
```

Or check the lot and report only the ones that disagree:

```powershell
Get-Content .\CHECKSUMS.txt |
  Where-Object { $_ -match '^([0-9a-f]{64})\s+(.+)$' } |
  ForEach-Object {
    $expected, $path = $Matches[1], $Matches[2]
    if (Test-Path $path) {
      $actual = (Get-FileHash -Algorithm SHA256 $path).Hash.ToLower()
      if ($actual -ne $expected) { "FAILED  $path" }
    } else { "MISSING $path" }
  }
```

## The paths are the original package paths

The digests are correct. The paths beside them are the paths of the shipped zips, not of
this repository, and the repository has since been restructured for publication.

Everything under `app/`, `src/`, `train/` and `design/`, and every file at the root, is
where `CHECKSUMS.txt` says it is and still verifies byte for byte — 146 of the entries.

The written deliverables have moved into `Documentation/`, so their entries no longer
resolve. `shasum -c` reports those as `FAILED open or read` — a file it cannot find, not
a digest that disagrees — and prints a count of listed files that could not be read. All
66 of them verify at their new paths:

| Entry prefix in `CHECKSUMS.txt` | Where it is now |
| --- | --- |
| `documents/` | `Documentation/` |
| `deck/` | `Documentation/deck/` |
| `verification/` | `Documentation/verification/` |
| `design-decisions/` | `Documentation/design-decisions/` |

One entry, `video/README.txt`, has no counterpart at all: it described the standalone
zip of the films, which the repository carries at the root as [`Videos/`](Videos/)
instead. The films the application itself loads, under `app/video/`, are listed and
verify normally.

The files themselves are unchanged; only their location is. To satisfy yourself of that,
hash one where it now sits and compare it with the digest recorded against its old path
— for example `shasum -a 256 Documentation/ANGEL-SWARM-use-case.md` against the
`documents/ANGEL-SWARM-use-case.md` line. Or rewrite the prefixes and check the whole
set at once:

```sh
sed -e 's| documents/| Documentation/|' \
    -e 's| deck/| Documentation/deck/|' \
    -e 's| verification/| Documentation/verification/|' \
    -e 's| design-decisions/| Documentation/design-decisions/|' \
    CHECKSUMS.txt | shasum -a 256 -c -
```

Against a clean checkout that leaves exactly one line unaccounted for — `video/README.txt`
— and no mismatch anywhere. `shasum` also warns that four lines are improperly
formatted; those are the three header lines of `CHECKSUMS.txt` and the blank one after
them, not files. Anything that reports a genuine mismatch is a real
disagreement and worth taking seriously.

## The manifest for this layout

[`CHECKSUMS-REPO.txt`](CHECKSUMS-REPO.txt) is the same thing regenerated against the
repository as it now stands, with the paths the files actually have. Use that one for a
clean check; keep [`CHECKSUMS.txt`](CHECKSUMS.txt) as the shipping record of v6.5.

Neither manifest lists itself, and neither lists the Markdown renderings added for
publication.
