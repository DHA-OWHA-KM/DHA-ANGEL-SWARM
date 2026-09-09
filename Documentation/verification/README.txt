ANGEL SWARM — VERIFICATION EVIDENCE
UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY

WHAT YOU CAN CHECK YOURSELF, WITHOUT TAKING ANYTHING ON TRUST

  1. THE ENGINE.  Open app/selftest.html in any browser, offline. It checks
     the shipped engine and host UI — including the same js/sim.js and
     js/optimizer.js the application runs — with nothing mocked. Use the
     live summary rather than a copied total. Among the checks is the
     reference result quoted in every document in this package:

         seed 42 · JOA CORAL · capability deployed
         23 / 34 / 35 survivable deaths on 20 / 38 / 0 sorties

      A red row is a real disagreement between the engine and the package
      claim; inspect the live page for current status.

  2. THE SEVEN-THEATRE RESULT.  verification/winprob.mjs re-derives the whole
     win-probability table — 200 paired battles per theatre, 1,400 in total —
     from the shipped engine:

         node winprob.mjs PACOM_CORAL 200

     It reproduces documents/ANGEL-SWARM-WIN-PROBABILITY-v5.9 exactly: seven
     theatres won from seven, every 95% interval excluding zero, adverse in 5
     of 1,400 battles and never by more than one.

  3. THE NETWORK CLAIM.  Pull the network cable, or switch off the adapter,
     and run the application. Nothing changes. Every basemap in it is either
     computed from the scenario's elevation field or drawn from coastline data
     that ships inside the build; there is no tile server and no request ever
     leaves the machine. Current verification covers all fourteen
     destinations and all four map scales; use a fresh instrumented run for
     the exact request and console totals of the tracked commit.

  4. THE BILL OF MATERIALS.  ANGEL-SWARM-SBOM-validation.txt records the
     validation actually performed on documents/ANGEL-SWARM-SBOM.json —
     CycloneDX 1.6, validated with ajv against the CycloneDX project's own
     schema. Every component digest in it was measured off disk.

  security-and-sbom/    Screenshots and instrumented output from the security
                        and supply-chain verification: the zero-egress
                        measurement, the browser-storage audit, and the
                        Settings row that reaches the self-test.

  build_docx_any.cjs    The generator that builds every .docx in documents/
                        from its Markdown source, so the Word files can be
                        regenerated and are not a separate hand-maintained
                        copy that could drift.

WHAT IS NOT HERE, DELIBERATELY: the working screenshot archives from the
development sessions (roughly 95 MB of intermediate captures). They prove
nothing a reader cannot verify directly by the four steps above, and they
would treble the size of this package.
