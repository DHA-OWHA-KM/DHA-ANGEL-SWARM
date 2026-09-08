# ANGEL SWARM — SBOM validation record (verification copy)

UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY

`verification/ANGEL-SWARM-SBOM-validation.txt` is a second copy of the SBOM schema-validation record, kept here so the verification folder is self-contained. It is **not** identical to the copy in `Documentation/`: `diff` reports exactly one differing line, the `date` field, which records an earlier run of the same validation against the same document.

```text
2c2
< date: 2026-09-05T06:17:53.292Z      (Documentation/ANGEL-SWARM-SBOM-validation.txt)
---
> date: 2026-09-04T15:25:44.957Z      (this copy)
```

Every other line — the file validated, the declared format, the component counts, the validator and schema, the options, the result and the caveats — is character-for-character the same. Both runs report `VALID`.

The rendering of the record, with the later timestamp, is at **[../ANGEL-SWARM-SBOM-validation.md](../ANGEL-SWARM-SBOM-validation.md)**. Read that for the substance; this file exists to say what the two copies are and how they differ.
