# ANGEL SWARM — SBOM validation record

UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY

The machine-written record of the schema validation run against `ANGEL-SWARM-SBOM.json`, produced by validating the document with ajv against the CycloneDX project's own JSON Schema. It is reproduced verbatim from `ANGEL-SWARM-SBOM-validation.txt`, which remains the authoritative copy.

## The record

```text
ANGEL SWARM — SBOM validation record
date: 2026-09-05T06:17:53.292Z

file        : OUT/ANGEL-SWARM-SBOM.json
declared    : bomFormat=CycloneDX  specVersion=1.6
components  : 49 top-level, 38 nested file sub-components

validator   : ajv 8.20.0 + ajv-formats 3.0.1
schema      : CycloneDX bom-1.6.schema.json (draft-07), fetched from
              https://raw.githubusercontent.com/CycloneDX/specification/master/schema/bom-1.6.schema.json
              sha256 18f57f7482593bad9f21b4feed09084640cbeff419d62ad5090c5ceccca5b37d
              with its two companion schemas spdx.schema.json and jsf-0.82.schema.json
options     : strict:false (the CycloneDX schema uses $comment and non-standard keywords ajv
              rejects in strict mode); allErrors:true; formats enforced via ajv-formats, with
              iri and iri-reference registered explicitly since ajv-formats does not carry them.
              One format in the schema, idn-email, is not implemented by ajv-formats and is
              reported as ignored. No field in this document uses it.

RESULT      : VALID — the document conforms to the CycloneDX 1.6 JSON Schema
```

## What this does and does not establish

It establishes that the document is well-formed CycloneDX 1.6: every required field is present, every enumerated value (hash algorithms, component types, licence identifiers, lifecycle phases, external-reference types) is one the specification allows, and every `bom-ref` resolves.

It establishes nothing about whether the contents are **true**. The hashes, sizes and versions in the document were measured off the files on disk by `_sbom_gen.mjs` at generation time and can be re-measured by anyone with the repository; the licence determinations were read out of the packages themselves and are cited per component.

No software-composition-analysis scan has been run against this SBOM.

## Note on paths and copies

The record names its input as `OUT/ANGEL-SWARM-SBOM.json`, the path the generator wrote to in the build tree. In this repository that file is `Documentation/ANGEL-SWARM-SBOM.json`.

A second copy of this record is kept at `verification/ANGEL-SWARM-SBOM-validation.txt`. The two differ in one line only — the `date` field, recording an earlier run of the same validation against the same document. See [`verification/ANGEL-SWARM-SBOM-validation.md`](verification/ANGEL-SWARM-SBOM-validation.md).
