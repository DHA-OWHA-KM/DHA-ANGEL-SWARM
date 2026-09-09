# Checksums

`UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY`

[`CHECKSUMS.txt`](CHECKSUMS.txt) is the SHA-256 digest of every file in the ANGEL SWARM
v6.5 package as it was shipped, on 8 September 2026, as three zips. It is the record of
what left the machine it was built on. This page explains how to use it and where it no
longer lines up with the repository.

## Verifying the historical package

`CHECKSUMS.txt` is **historical evidence, not the manifest for the current
repository**. Verify it only against the original three-part v6.5 distribution,
from the corresponding package root:

```sh
shasum -a 256 -c CHECKSUMS.txt
```

Every file line prints either `OK` or `FAILED`. On Linux
`sha256sum -c CHECKSUMS.txt` does the same job.

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

## Why it does not validate the current repository

The digests are the record of the shipped v6.5 package. The paths beside them are
the paths of those shipped zips, not necessarily the paths in this repository,
and the repository has since been restructured and updated.

Many written deliverables moved under `Documentation/`:

| Entry prefix in `CHECKSUMS.txt` | Where it is now |
| --- | --- |
| `documents/` | `Documentation/` |
| `deck/` | `Documentation/deck/` |
| `verification/` | `Documentation/verification/` |
| `design-decisions/` | `Documentation/design-decisions/` |

One entry, `video/README.txt`, described the standalone films zip; the repository
instead carries [`Videos/`](Videos/). Product code and documentation have also
changed since v6.5, so rewriting path prefixes is not sufficient to validate the
current tree. Mismatches against current files indicate change since the dated
package, not corruption of that historical record.

## The manifest for this layout

[`CHECKSUMS-REPO.txt`](CHECKSUMS-REPO.txt) is regenerated against the current
tracked tree, with the paths the files actually have. Use that one for a clean
checkout; keep [`CHECKSUMS.txt`](CHECKSUMS.txt) as the shipping record of v6.5.

Neither manifest lists itself. `CHECKSUMS.txt` is the dated distribution record and
predates the Markdown renderings added for repository publication;
`CHECKSUMS-REPO.txt` covers every other tracked file in the current repository.
