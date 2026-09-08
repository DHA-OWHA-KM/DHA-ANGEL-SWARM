ANGEL SWARM
Version 6.5 — 8 September 2026 — FINAL
UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY

WHAT CHANGED IN 6.5 — THE POSITIONING ARGUMENT, AND FOUR CLAIMS THAT WERE
NOT TRUE

  NOTHING IN THE ENGINE MOVED. app/js/sim.js, app/js/optimizer.js and
  app/angel-engine.js are byte-identical to v6.0, v6.3 and v6.4. The
  self-test returns 118 of 118 with zero page errors and zero off-origin
  requests. A presenter who rehearsed v6.4 will find the demo behaves
  identically. What changed is what the documents say, one terminology
  sweep the overhaul had missed, and two false strings on screen.


  1 · COMPLEMENT, NOT SUPPLANT — THE ARGUMENT THE PACKAGE DID NOT MAKE

  The package could describe what the system does and could not say where it
  belongs. That is the question a program office asks first, and losing it
  costs more than any interface defect.

  The argument is now written from evidence rather than assertion, researched
  against primary sources on 5 September and recorded with a URL and a date
  for every claim in RESEARCH/complement-landscape.md. The approved wording
  is RESEARCH/COMPLEMENT-SECTION.md and every document carries that wording
  rather than a paraphrase of it.

  The load-bearing fact is empirical and four months old. In May 2026 the
  44th Medical Brigade, XVIII Airborne Corps, completed an operational
  validation of autonomous Class VIII aerial resupply with Soaring M25
  aircraft. THE AIRCRAFT ARE BOUGHT AND FIELDED. THE RULE THAT DECIDES WHICH
  AIRCRAFT FLIES TO WHICH CASUALTY IS NOT — and not by inference: DIU's
  triage program, TATRC's MEDRAS portfolio and NAVAIR's PMA-263 each place
  allocation outside their own stated scope. The Department has bought every
  layer around the decision this system makes and has bought none of that
  decision.

  ONE CORRECTION MADE BEFORE PUBLICATION. The first draft of this argument
  rested the tasking claim on an Army training article that says soldiers
  learned "how to manually operate the systems." That sentence is about
  flying the aircraft by hand. It is not a statement about who decides which
  aircraft goes to which casualty, and offered as evidence for that it is a
  misattribution a judge can catch in one search. The claim now rests on
  three programs describing their own scope, and the rehearsal pack carries
  the correction as a sentence the presenter must never say.

      the layer below     NAVAIR PMA-263 fields the TRV-150; TRUAS has
                          reached IOC. It does automated launch, waypoint
                          navigation and automated landing — it flies the
                          mission it is given. This produces the mission
                          it is given.

      the layer beside    DIU announced the AI-Assisted Triage and Treatment
                          Tool on 25 February 2026. Its scope is assessment
                          and documentation, explicitly not allocation of
                          evacuation or resupply assets. TATRC's MEDRAS
                          portfolio funds transport, documentation and
                          treatment across sixteen projects; allocation is
                          not a category in it.

      the layer above     On 9 March 2026 the Deputy Secretary designated
                          the Maven Smart System a program of record and
                          moved it to the CDAO MSS Program Office. The FY27
                          request funds third-party applications on MSS.
                          Open DAGIR's OTA is the named onboarding path.

      the clinical lane   The Operational Medicine Care Delivery Platform
                          integrates with MHS GENESIS and references Joint
                          Trauma System guidance. The deadline itself traces
                          to JTS Clinical Practice Guidelines, which is what
                          makes it a clinical term and not a product term.

      the policy frame    DoDD 3000.09 (25 January 2023) paragraph 1.1.b
                          excludes "unarmed platforms … whether autonomous
                          or semi-autonomous" and "autonomous or
                          semi-autonomous systems that are not weapon
                          systems." This tasks unarmed aircraft carrying
                          blood. The applicable rulebook is DoDI 8510.01
                          and RMF, and that assessment is written.

  CDAO's Agent Network, announced June 2026, is architecturally the same
  object as this system and its published use cases do not include medical
  logistics. The package now says so first — an Agent Network-class
  capability for the medical lane — rather than waiting to be told.

  Carried in: use case, DHA alignment and its one pager, the IL5 cost
  analysis, the architecture (as four concrete interfaces), the security
  annex (as a new §6a showing none of the four widens the boundary today),
  the rehearsal script (a spoken beat, a fifteen-second disarm, and five new
  Q&A entries) and README.md.


  2 · FOUR CLAIMS THAT WERE NOT TRUE, FOUND BY CHECKING

  The research was run to build an argument and returned four corrections to
  the project's own material. Each is now fixed everywhere.

      CoT IS INGESTED, NOT EMITTED. The listener is receive-only, off by
      default, bound to loopback unless -cot-external is also passed, and
      never replies. Draft positioning language said the system emits CoT
      over an existing TAK server. That is contradicted by this project's
      own security annex. The honest statement — "we consume the CoT feed
      the joint operations area already produces" — answers the interface
      question and is true.

      NO REPLICATOR ALIGNMENT. Replicator 1 and 2 scope is attritable combat
      autonomy and counter-UAS. No source places logistics or medical
      autonomy in either. Claiming the lineage would have been an unforced
      error.

      NO LINK 16, VMF OR MIL-STD-6017. Those are platform-to-platform
      tactical data links for track and fires. CoT, FHIR and STANAG 4586 are
      the three a medical-logistics decision layer can defend, and STANAG
      4586 is stated as a target interface rather than an implemented one.

      "AT OR BELOW PUBLISHED PERFORMANCE," NOT "WE CITE PUBLISHED ENVELOPES."
      Measured against NAVAIR and Soaring published figures, this build's
      TRV-150C payload is 30 kg against 54 kg, and the M25's is 6.8 kg
      against 11.3 kg. The system under-claims the aircraft it tasks. That
      is a strength and the script now says it aloud.


  3 · THE TERMINOLOGY OVERHAUL HAD MISSED A FILE

  "Change it to CURRENT — TRIAGE & PROXIMITY globally" reached
  app/index.html and app/design.html. It did not reach app/console.html,
  which still carried SEVEN occurrences of the superseded arm name across
  its Mission, Compare, Supply, Analysis and Settings panes.

  None was visible in the demo — angel-map.js reduces that file by allow-list
  to the Dashboard pane's theatre stage and nothing else — but the analyst
  console is a real surface, it ships, and the file is about to be published
  to a public repository. It now carries none.

  Fixing it exposed a pre-existing overlap the shorter name had hidden.
  Measured, not eyeballed: the compare banner covered ONE HUNDRED PER CENT of
  the arm-B pane tag at 1280, 1440 and 1920 — that tag had never been visible
  in side-by-side view. Both tags now sit below the banner in compare view,
  and every absolutely positioned box over the stage was pairwise
  intersected at three widths, deployed and not, to prove zero overlaps. The
  compare tag's descriptor is hidden below 1500px so the longer name holds
  one line. The theatre map inside the iframe is unchanged — identical
  screenshot MD5s across three runs, pixel diff bounding box empty.


  4 · R-11 WAS CLOSED IN v6.3 AND THE RISK REGISTER DID NOT KNOW

  R-11 recorded that two surfaces in the design application badge a
  term-overlap score with a model's name — an all-MiniLM-L6-v2 mark and
  "161 passages" on the Analyst Terminal doctrine tab and on Ask ANGEL.
  Measured against the shipped build, both were replaced in v6.3 with
  TERM OVERLAP · NO MODEL ON THIS PATH and DOCTRINE · QUOTED VERBATIM, NOT
  GENERATED, neither carrying a model name or the mark.

  The entry survived two revisions, and v6.4's own re-verification section
  repeated it as open. The register is not silently corrected: R-11 is struck
  through, marked closed, and the residual risk is recorded as procedural —
  A REGISTER ENTRY THAT OUTLIVES ITS DEFECT IS A FALSE CLAIM IN THE SAME WAY
  AN UNMARKED MODEL OUTPUT IS. See §2.0c of the security annex.

  The same sweep found two live misattributions and fixed them:

      Sensor & Model, doctrine corpus row      credited "Analyst Terminal →
                                               Doctrine, Ask ANGEL citations"
                                               as the consumer

      Ask ANGEL side panel, WHERE MiniLM RUNS  named Analyst Terminal

  The design application makes NO HTTP REQUEST OF ANY KIND — there is not one
  fetch( call in the file — so it loads neither the corpus nor the encoder.
  Both belong to the analyst console, via app/js/doctrine.js. Both strings
  now name it.


  5 · THE SBOM WAS REGENERATED, WHICH IS THE POINT OF R-3

  Three shipped files changed today. R-3 warns that digests are only as
  current as the last generator run, and five were found stale at v6.4 for
  exactly that reason. _sbom_gen.mjs was re-run rather than the document
  hand-edited: 49 top-level components, CycloneDX 1.6, validated VALID
  against the schema with ajv, and every one of the 62 resolvable SHA-256
  digests re-hashed against disk and matching.


  6 · GITHUB PACKAGING

  README.md and .gitignore are written and the repository was measured:
  2.7 GB on disk, ~121 MB tracked after the ignore rules, nothing over
  GitHub's 100 MB hard limit and nothing needing Git LFS. The Go binaries are
  ignored because they were PROVEN reproducible — rebuilt offline to within
  1.0% of the shipped artefact, then used to serve the app and pass 118/118 —
  not because it seemed likely.

  Six decisions are left open for the author in RESEARCH/GITHUB-PREP.md
  rather than made on his behalf: the licence (17 U.S.C. § 105 versus the
  vendored components' own licences), public versus private, the teammate's
  private repository under TEAMMATE/, the eleven typefaces with no licence
  evidence (R-6 — publishing is redistribution, which is the act the licence
  governs), Git LFS, and an unrelated presentation found under DECK/.

  ONE THING TO DO BEFORE git init: OUT/.git exists as an empty repository.
  Left in place it turns OUT/ into a gitlink and silently excludes every
  document in it from the commit, leaving a README that links to files that
  are not there.


  VERIFICATION FOR THIS RELEASE

      engine files                 byte-identical to v6.0 / v6.3 / v6.4
      self-test                    118 assertions, 0 failed, 0 page errors
      off-origin requests          0
      fetch( calls in index.html   0
      app/index.html ≡ design.html identical (md5 61e4da7c…)
      SBOM                         49 components, CycloneDX 1.6 VALID
      SBOM digests                 62 of 62 re-hashed against disk, matching
      seven-theatre sweep          re-run at 200 replications per theatre;
                                   every published figure identical to the
                                   digit, worst single-battle difference +1
