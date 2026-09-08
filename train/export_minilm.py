#!/usr/bin/env python3
"""
ANGEL SWARM — doctrine retrieval: model export and corpus embedding.

This script produces everything the browser needs to answer a plain-English
question by quoting doctrine back, and nothing else. It runs once, offline, at
build time; the application it feeds never opens a socket.

What it emits:

  app/models/minilm/minilm.onnx     int8 sentence encoder, mean-pooled and
                                    L2-normalised inside the graph
  app/models/minilm/vocab.txt       30,522 WordPiece pieces, one per line
  app/models/minilm/meta.json       provenance, sizes, measured agreement
  app/data/doctrine.json            the corpus and its precomputed vectors

Weights are all-MiniLM-L6-v2 (Apache-2.0), taken from the npm package
@lat.md/embed-minilm-fp16 because huggingface.co is unreachable from this
sandbox. The safetensors file carries plain `BertModel` parameter names, so it
loads into a locally-constructed BertModel with no remote config fetch.

Pooling and normalisation are exported INSIDE the ONNX graph. That is a
deliberate choice: it removes the single most common source of silent
mismatch between a Python reference implementation and a JavaScript one. The
browser does tokenisation, and nothing else.

ON THE CORPUS. The passages below are paraphrased reference text written from
knowledge of the actual publications. They are NOT extracts. They stand in for
documents that could not be shipped into this sandbox, and the application
says so on screen, at the top of the pane and again beside every quotation.
Citations are deliberately section-level: a paragraph number that is wrong is
worse than no paragraph number at all, so none are given.
"""

import json
import math
import pathlib
import struct
import sys
import time

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
SRC = pathlib.Path('/tmp/mdl/package/model')
OUT_MODEL = ROOT / 'app' / 'models' / 'minilm'
OUT_DATA = ROOT / 'app' / 'data'

DISCLAIMER = (
    'Paraphrased reference text written for demonstration. Not an extract of '
    'the publication. Consult the authoritative publication before acting.')


# ===========================================================================
#  THE CORPUS
# ===========================================================================

CORPUS = []


def P(pub, section, tags, text):
    """One retrievable passage. Kept to roughly 40-120 words so that a hit is
    small enough to read on screen and large enough to carry its own context."""
    text = ' '.join(text.split())
    CORPUS.append({'pub': pub, 'section': section, 'tags': tags, 'text': text})


# --------------------------------------------------------------------- TCCC
# Tactical Combat Casualty Care, as promulgated by the Committee on Tactical
# Combat Casualty Care. Phase names (Care Under Fire, Tactical Field Care,
# Tactical Evacuation Care) and the MARCH ordering are the load-bearing
# structure and are cited at that level.

TCCC = 'TCCC Guidelines (CoTCCC)'

P(TCCC, 'MARCH sequence', ['march', 'sequence', 'priorities', 'assessment'], """
MARCH orders the treatment of a combat casualty by what kills fastest.
Massive haemorrhage is controlled first, because exsanguination from a
compressible wound kills in minutes. Airway is next, then Respiration, then
Circulation, then Hypothermia and Head injury. The ordering is not a
checklist to be worked through at leisure; it is a statement about time. A
casualty who is bleeding from a limb does not need an airway assessment
before a tourniquet, and a casualty whose bleeding is controlled is no longer
the most urgent problem in the casualty collection point.
""")

P(TCCC, 'MARCH sequence', ['march', 'pawsb', 'secondary'], """
After MARCH is complete and the immediately lethal problems are addressed,
care continues with pain management, antibiotics, wounds and splinting, and
burns. These are not optional. They are simply not what kills a casualty in
the first ten minutes. The sequence exists so that a single responder working
alone under fire, with limited light and limited hands, does the highest-yield
intervention first and does not lose a casualty to a femoral bleed while
taping a chest seal.
""")

P(TCCC, 'Care Under Fire', ['care under fire', 'suppression', 'cover'], """
In Care Under Fire the best medicine is fire superiority. The casualty and
the responder are both still under effective enemy fire, and any treatment
that is not immediately life-saving increases the number of casualties.
Return fire and take cover. Direct the casualty to move to cover and apply
self-aid if able. Airway management is deferred. Only life-threatening
external haemorrhage is treated in this phase, and it is treated with a limb
tourniquet applied over the uniform.
""")

P(TCCC, 'Care Under Fire', ['care under fire', 'tourniquet', 'extraction'], """
Under fire, a tourniquet applied over the clothing, high and tight on the
injured limb, is the correct answer. There is no time to expose the wound and
identify the bleeding vessel, and doing so exposes the responder. The
tourniquet is reassessed later, once the casualty is behind cover, and moved
directly above the wound if the tactical situation permits. Casualties are
moved to cover before further assessment. Cervical spine immobilisation is not
indicated for penetrating trauma in this phase.
""")

P(TCCC, 'Tactical Field Care', ['tactical field care', 'phase', 'assessment'], """
Tactical Field Care begins when the casualty and responder are no longer
under effective hostile fire, or when the injury occurred without contact.
Time available is measured in minutes to hours rather than seconds. The
casualty is assessed systematically through MARCH, weapons and communications
equipment are secured, and a casualty card is started. The tactical situation
can change at any moment and revert care to the Care Under Fire standard, so
interventions are made in an order that leaves the casualty stable if the
responder has to stop.
""")

P(TCCC, 'Massive haemorrhage', ['tourniquet', 'limb', 'extremity', 'haemorrhage'], """
For life-threatening external haemorrhage from an extremity, apply a
recommended limb tourniquet directly to the skin, two to three inches above
the wound and not over a joint. Tighten until bright red bleeding has stopped
and the distal pulse is absent. Pain is expected and is not a reason to
loosen. A tourniquet that has stopped bleeding but left a palpable distal
pulse has not been tightened enough and will continue venous bleeding into
the limb.
""")

P(TCCC, 'Massive haemorrhage', ['tourniquet', 'second tourniquet', 'failure'], """
If one tourniquet does not control the haemorrhage, apply a second
tourniquet side by side with the first and immediately proximal to it. Do not
remove the first. Two tourniquets in series are routinely required in the
thigh, where a single device may not generate enough pressure to occlude the
femoral artery through a large muscle mass. Record the time of application on
the tourniquet and on the casualty card.
""")

P(TCCC, 'Massive haemorrhage', ['tourniquet conversion', 'two hours', 'six hours'], """
Consider converting a tourniquet to a haemostatic or pressure dressing when
the casualty is not in shock, the wound can be closely monitored, and the
tourniquet is not on an amputation. Conversion should be attempted within two
hours of application where the tactical and clinical situation allows. A
tourniquet that has been in place for more than six hours should not be
removed without laboratory capability and close monitoring, because the
metabolic load released from the limb can be fatal.
""")

P(TCCC, 'Massive haemorrhage', ['junctional', 'groin', 'axilla', 'junctional tourniquet'], """
Junctional haemorrhage is bleeding at the groin, buttock, perineum, axilla or
base of the neck, where a limb tourniquet cannot be applied because there is
no limb proximal to the wound. Control it by packing the wound with a
recommended haemostatic dressing and applying firm direct pressure for at
least three minutes, then apply a junctional tourniquet if one is available
and the anatomy allows. Direct pressure must be maintained continuously while
the junctional device is being readied.
""")

P(TCCC, 'Massive haemorrhage', ['haemostatic dressing', 'wound packing', 'pressure'], """
Wounds not amenable to a tourniquet are packed. Open the wound, pack a
haemostatic gauze firmly into the wound tract down onto the bleeding vessel,
and hold direct pressure for a minimum of three minutes. Packing is a
mechanical intervention; the haemostatic agent assists it but does not replace
it. If the first packing fails, repack rather than adding gauze on top. Apply
a pressure dressing over the packing once bleeding is controlled.
""")

P(TCCC, 'Massive haemorrhage', ['pelvic binder', 'pelvis', 'blunt trauma'], """
Suspect pelvic fracture in a casualty who has fallen from height, been
involved in a vehicle rollover, or been close to a blast, particularly if
there is pain on pelvic palpation, lower limb deformity or major lower limb
amputation. Apply a pelvic binder at the level of the greater trochanters.
Bleeding into the pelvis is not compressible from the outside and is a
frequent cause of death that produces no visible external blood loss at all.
""")

P(TCCC, 'Airway', ['airway', 'positioning', 'nasopharyngeal'], """
A conscious casualty who can speak needs no airway intervention and should be
allowed to assume whatever position best protects the airway, which is often
sitting up. For an unconscious casualty without airway obstruction, use a
chin-lift or jaw-thrust, insert a nasopharyngeal airway, and place the
casualty in the recovery position. Reassess after every move. Airway
management is a continuing task, not a single action.
""")

P(TCCC, 'Airway', ['cricothyroidotomy', 'surgical airway', 'obstruction'], """
If the airway remains obstructed after positioning and a nasopharyngeal
airway, and the casualty has maxillofacial trauma, burns to the airway or
direct neck injury, perform a surgical cricothyroidotomy. Use lidocaine if
the casualty is conscious. A supraglottic device is an alternative only in a
casualty who is deeply unconscious with no airway trauma. Do not spend
repeated attempts on an approach that has already failed once; the casualty
is hypoxic for the whole of that time.
""")

P(TCCC, 'Respiration', ['tension pneumothorax', 'needle decompression', 'chest'], """
Suspect tension pneumothorax in any casualty with torso trauma and
progressive respiratory distress, and treat it before it is confirmed.
Perform needle decompression with a long large-bore catheter at the fifth
intercostal space in the anterior axillary line, or at the second
intercostal space in the mid-clavicular line. Success is indicated by
improvement in respiratory distress or an audible rush of air. If the first
attempt fails, decompress on the opposite side.
""")

P(TCCC, 'Respiration', ['chest seal', 'open pneumothorax', 'sucking chest wound'], """
All open and suspected open chest wounds are sealed immediately with a vented
chest seal. If a vented seal is not available, an unvented seal may be used,
but the casualty must then be monitored for the development of tension
pneumothorax and the seal burped or removed if respiratory distress worsens.
Look for exit wounds; a single seal on an entry wound leaves the casualty
with an uncovered defect on the far side.
""")

P(TCCC, 'Circulation', ['shock', 'radial pulse', 'mental status', 'assessment'], """
Shock in the field is assessed by mental status and radial pulse character,
not by a blood pressure cuff. An altered mental status in a casualty with no
head injury, or a weak or absent radial pulse, is decompensated haemorrhagic
shock and is an indication for blood product resuscitation. A normal heart
rate does not exclude significant haemorrhage: a proportion of casualties do
not mount a tachycardia, and relying on pulse rate alone will miss them.
""")

P(TCCC, 'Circulation', ['intravenous access', 'intraosseous', 'access'], """
Establish intravenous access with an 18-gauge catheter or a saline lock if
the casualty needs fluid or medication. If intravenous access is not obtained
promptly, use the intraosseous route. Do not delay resuscitation attempting
repeated peripheral cannulation in a shut-down casualty; peripheral veins
collapse in exactly the casualty who most needs the line, and the
intraosseous route works in that casualty.
""")

P(TCCC, 'Circulation', ['fluid resuscitation', 'preference', 'whole blood', 'crystalloid'], """
The preferred resuscitation fluid for haemorrhagic shock, in order, is cold
stored low titer group O whole blood; then pre-screened low titer group O
fresh whole blood; then plasma, red blood cells and platelets in a one to one
to one ratio; then plasma and red blood cells in a one to one ratio; then
plasma or red blood cells alone. Crystalloid is the last resort and worsens
coagulopathy. Reassess after each unit.
""")

P(TCCC, 'Circulation', ['permissive hypotension', 'endpoint', 'radial pulse'], """
Resuscitate to a palpable radial pulse, improvement in mental status, or a
systolic pressure of about 100 millimetres of mercury. The aim is a pressure
adequate for perfusion but not high enough to disrupt clot that has formed at
the bleeding site. Over-resuscitation dilutes clotting factors, raises
pressure against fresh clot, and converts a controlled haemorrhage back into
an uncontrolled one.
""")

P(TCCC, 'Circulation', ['tranexamic acid', 'txa', 'indication'], """
Give tranexamic acid to any casualty who is expected to need significant
blood transfusion, who has haemorrhagic shock, who has one or more major
amputations, who has penetrating torso trauma, or who has evidence of severe
bleeding. The decision is made on mechanism and physiology at the point of
wounding; waiting for laboratory confirmation of coagulopathy defeats the
purpose of the drug.
""")

P(TCCC, 'Circulation', ['tranexamic acid', 'txa', 'three hours', 'timing', 'window'], """
Tranexamic acid must be administered as early as possible after wounding and
must not be given later than three hours after injury. The benefit is
greatest in the first hour and falls steadily thereafter; administration
beyond the three hour window has been associated with harm rather than
benefit. Record the time of injury and the time of administration on the
casualty card, because the receiving surgical team needs both.
""")

P(TCCC, 'Circulation', ['tranexamic acid', 'txa', 'dose', 'administration'], """
The current dose is two grams of tranexamic acid given as a slow intravenous
or intraosseous push. This replaced the earlier regimen of one gram followed
by a second gram, which was frequently never completed in the field because
the casualty moved before the second dose was due. Do not give tranexamic
acid in the same line as blood products without flushing.
""")

P(TCCC, 'Hypothermia prevention', ['hypothermia', 'prevention', 'warming'], """
Prevent hypothermia in every casualty, in every climate. A bleeding casualty
loses the ability to generate heat, and a cold casualty cannot clot. Minimise
exposure, remove wet clothing, and keep protective equipment on the casualty
where possible. Place the casualty on an insulated surface. Apply an active
warming device and a hypothermia prevention wrap. Hypothermia in trauma is
not a comfort issue; it is a coagulation issue and it is preventable.
""")

P(TCCC, 'Hypothermia prevention', ['hypothermia', 'lethal triad', 'coagulopathy'], """
Hypothermia, acidosis and coagulopathy reinforce one another. Cold impairs
platelet function and slows the enzymatic clotting cascade; continued
bleeding produces acidosis; acidosis further impairs clotting. Once
established this cycle is very difficult to reverse with transfusion alone,
which is why prevention on the ground outperforms correction in a surgical
facility. Add hypocalcaemia from citrated blood products and the picture is
usually described as a lethal diamond.
""")

P(TCCC, 'Hypothermia prevention', ['fluid warming', 'blood warming', 'temperature'], """
Where the capability exists, warm intravenous fluids and blood products
before administration. A unit of refrigerated blood delivered cold into a
casualty who is already cold makes the coagulopathy worse. Field fluid
warmers and warmed blood transport containers exist for this reason. If no
warmer is available, the requirement to prevent further heat loss from the
casualty's environment becomes correspondingly more important.
""")

P(TCCC, 'Head injury', ['traumatic brain injury', 'tbi', 'hypotension', 'hypoxia'], """
In a casualty with suspected traumatic brain injury, a single episode of
hypotension or hypoxia measurably worsens outcome. Maintain oxygenation and
avoid the permissive hypotension target used for other haemorrhage: aim for a
systolic pressure of at least 110 millimetres of mercury. Assess and record
level of consciousness with a simple, repeatable scale so that a trend is
visible to the receiving facility. Avoid hyperventilation unless there are
signs of impending herniation.
""")

P(TCCC, 'Analgesia', ['pain', 'analgesia', 'mild'], """
A casualty in mild to moderate pain who is still able to fight may be given
the combat wound medication pack, containing an oral analgesic and an
antibiotic. This casualty does not require an intravenous opioid and should
not receive one, because the sedation is a tactical liability and the
respiratory depression is a clinical one in a casualty who may deteriorate.
""")

P(TCCC, 'Analgesia', ['pain', 'ketamine', 'opioid', 'moderate to severe'], """
For moderate to severe pain in a casualty who is not in shock and not in
respiratory distress, oral transmucosal fentanyl citrate is appropriate. For
a casualty in haemorrhagic shock or respiratory distress, ketamine is
preferred because it does not drop blood pressure the way an opioid does.
Monitor the airway continuously after any analgesic. Have naloxone available
whenever an opioid is carried.
""")

P(TCCC, 'Antibiotics', ['antibiotics', 'infection', 'combat wound'], """
All open combat wounds should receive antibiotics as soon as possible after
wounding. A casualty who can take oral medication receives the oral agent in
the combat wound medication pack. A casualty who cannot take oral medication,
or who is in shock, receives an intravenous or intramuscular agent. Early
administration matters more than agent selection; the interval between
wounding and the first dose is the variable under the responder's control.
""")

P(TCCC, 'Eye injury', ['eye', 'ocular', 'shield'], """
For a penetrating eye injury, perform a rapid field test of visual acuity,
cover the eye with a rigid eye shield rather than a pressure patch, and
ensure the casualty receives antibiotics. Do not attempt to remove a
protruding foreign body and do not apply pressure to the globe. Note the
findings on the casualty card; visual acuity recorded at the point of
wounding is information the ophthalmologist cannot recover later.
""")

P(TCCC, 'Burns', ['burns', 'body surface area', 'resuscitation'], """
Estimate burn size using the rule of nines, covering only areas of full
thickness and partial thickness burn. Cover the burn with dry sterile
dressings and prioritise hypothermia prevention, which is a greater and more
immediate threat in a burned casualty than in any other. If the total body
surface area burned exceeds twenty per cent, begin fluid resuscitation as soon
as access is obtained. Burn casualties with associated trauma are resuscitated
for the trauma first.
""")

P(TCCC, 'Documentation', ['casualty card', 'documentation', 'dd form 1380'], """
Document every assessment and every intervention on the TCCC casualty card
and secure the card to the casualty. Times matter more than prose: time of
wounding, time of tourniquet application, time of tranexamic acid, time of
each blood product. The receiving facility makes different decisions
depending on how long ago the tourniquet went on and whether the three hour
tranexamic acid window is still open, and it cannot reconstruct either from
the casualty's appearance.
""")

P(TCCC, 'Tactical Evacuation Care', ['tacevac', 'evacuation care', 'en route'], """
Tactical Evacuation Care begins when the casualty is loaded onto an
evacuation platform. Additional personnel and equipment arrive with the
platform, so interventions deferred in Tactical Field Care become possible:
monitoring, oxygen, blood product administration and advanced airway
management. Reassess all tourniquets, dressings and chest seals after loading
and after every subsequent move, because the movement itself dislodges them.
""")

P(TCCC, 'Tactical Evacuation Care', ['monitoring', 'pulse oximetry', 'limitations'], """
Pulse oximetry is useful for trending oxygenation but is unreliable in a
casualty who is cold, hypotensive, in shock, or moving. A normal saturation
in a peripherally shut-down casualty says very little, and a failure to
obtain a reading is itself clinical information. Electronic monitoring
supplements the physical assessment of mental status and radial pulse; it
does not replace it.
""")

P(TCCC, 'Tactical Field Care', ['cardiopulmonary resuscitation', 'cpr', 'futility'], """
Cardiopulmonary resuscitation for casualties in blast or penetrating trauma
who have no pulse, no respiration and no other signs of life will not be
successful and should not be attempted. It occupies the responder, exposes
the team, and delays care of casualties who can be helped. The exception is
non-traumatic arrest such as hypothermia, near drowning or electrocution,
where resuscitation may be appropriate if it does not compromise the mission
or other casualties.
""")

P(TCCC, 'Triage', ['triage', 'categories', 'mass casualty'], """
Field triage sorts casualties into immediate, delayed, minimal and expectant.
Immediate casualties have a life-threatening injury that can be corrected
with a short procedure and a good chance of survival. Delayed casualties
require care but can tolerate a wait without significant risk. Minimal
casualties have injuries that can be managed with self-aid or buddy aid.
Expectant casualties have injuries so severe that survival is unlikely given
the resources available; they are not abandoned but they do not consume
resources needed by the immediate group.
""")


# ----------------------------------------------------------------- JTS CPGs
# Joint Trauma System Clinical Practice Guidelines. Cited by guideline title,
# which is stable, rather than by CPG identifier number, which is not.

JTS = 'JTS Clinical Practice Guidelines'

P(JTS, 'Damage Control Resuscitation', ['damage control resuscitation', 'dcr', 'principles'], """
Damage control resuscitation is the systematic approach to major haemorrhage
that minimises blood loss, restores oxygen delivery with blood products
rather than crystalloid, and corrects coagulopathy, hypothermia and acidosis
early rather than after they are established. It begins at the point of
wounding and continues through surgery. It is a resuscitation strategy, not a
transfusion protocol, and it fails if only the transfusion component is
implemented.
""")

P(JTS, 'Damage Control Resuscitation', ['lethal diamond', 'hypothermia', 'acidosis', 'hypocalcaemia'], """
The physiological targets of damage control resuscitation are the components
of the lethal diamond: hypothermia, acidosis, coagulopathy and hypocalcaemia.
Each accelerates the others. Correcting them concurrently, from the point of
injury forward, produces better outcomes than correcting them sequentially in
an operating theatre. This is the reason capability is pushed forward rather
than concentrated at the hospital.
""")

P(JTS, 'Damage Control Resuscitation', ['permissive hypotension', 'blood pressure target'], """
In a casualty with uncontrolled haemorrhage and no traumatic brain injury,
resuscitate to a systolic pressure of about 100 millimetres of mercury or to
a palpable radial pulse, and no higher, until haemorrhage is surgically
controlled. Raising the pressure further disrupts clot and increases blood
loss. Permissive hypotension is a bridge to surgical control, not a
destination, and is not appropriate once bleeding has been controlled.
""")

P(JTS, 'Damage Control Resuscitation', ['traumatic brain injury', 'exception', 'perfusion'], """
Permissive hypotension is contraindicated in traumatic brain injury. The
injured brain has lost autoregulation and depends on systemic pressure for
perfusion; a systolic pressure below about 110 millimetres of mercury is
associated with a marked increase in mortality. Where a casualty has both a
brain injury and uncontrolled truncal haemorrhage, the brain injury target
takes precedence and the requirement for rapid surgical control becomes more
urgent, not less.
""")

P(JTS, 'Whole Blood Transfusion', ['whole blood', 'preferred product', 'transfusion'], """
Whole blood is the preferred product for resuscitation of haemorrhagic
shock. It delivers red cells, plasma and platelets in physiological
proportions in a single unit, at a higher haematocrit and clotting factor
concentration than reconstituted components, with less anticoagulant and
additive volume per unit of oxygen carrying capacity. Component therapy in a
one to one to one ratio is the alternative when whole blood is not available,
not the preference.
""")

P(JTS, 'Whole Blood Transfusion', ['low titer o whole blood', 'ltowb', 'universal donor'], """
Cold stored low titer group O whole blood is group O whole blood screened to
confirm low titres of anti-A and anti-B antibodies, allowing transfusion into
recipients of any ABO group with an acceptable haemolysis risk. It is the
product of choice for prehospital and far-forward transfusion because it
requires no crossmatch and no thawing, and because a single unit provides
balanced resuscitation.
""")

P(JTS, 'Whole Blood Transfusion', ['fresh whole blood', 'walking blood bank', 'emergency donor'], """
Fresh whole blood collected from a pre-screened emergency donor panel, the
walking blood bank, is used when stored products are exhausted or
unavailable. Donors are identified and screened in advance, not at the moment
of need. Rapid transfusion-transmissible disease testing is performed at the
time of collection where available, and every unit and donor is documented so
that recipients can be followed up after the operation.
""")

P(JTS, 'Damage Control Resuscitation', ['ratio', 'one to one to one', 'component therapy'], """
When whole blood is unavailable, transfuse plasma, platelets and red blood
cells in a balanced one to one to one ratio. Resuscitation weighted towards
red cells alone produces a dilutional coagulopathy and does not restore
clotting; resuscitation with plasma alone does not restore oxygen carriage.
The ratio is a floor, not a ceiling, and plasma should not be withheld
waiting for the laboratory.
""")

P(JTS, 'Damage Control Resuscitation', ['product priority', 'ladder', 'preference order'], """
The order of preference for resuscitation products is cold stored low titer
group O whole blood, then fresh whole blood from a screened donor panel, then
red cells with plasma and platelets in balanced ratio, then red cells and
plasma in balanced ratio, then plasma alone or red cells alone, and only
then crystalloid. Each step down the ladder is a compromise that should be
recorded, because the receiving surgical team needs to know what the casualty
actually received.
""")

P(JTS, 'Damage Control Resuscitation', ['calcium', 'hypocalcaemia', 'citrate'], """
Give calcium with the first unit of blood and repeat as transfusion
continues. Citrate anticoagulant in stored blood binds ionised calcium, and
the resulting hypocalcaemia impairs both coagulation and myocardial
contractility. Ionised calcium falls fastest in exactly the casualty
receiving the most product. One gram of calcium chloride or three grams of
calcium gluconate intravenously is the usual dose; calcium is not given in
the same line as blood without flushing.
""")

P(JTS, 'Damage Control Resuscitation', ['crystalloid', 'avoid', 'dilution'], """
Crystalloid resuscitation of haemorrhagic shock dilutes clotting factors,
worsens acidosis, increases interstitial oedema and does not carry oxygen. It
is used only when no blood product is available, and then in the minimum
volume required to maintain perfusion to a palpable radial pulse. Large
volume crystalloid administration before blood product arrival is associated
with worse outcomes than accepting a lower pressure.
""")

P(JTS, 'Prehospital Blood Transfusion', ['prehospital transfusion', 'indication', 'point of injury'], """
Prehospital transfusion is indicated for a casualty in haemorrhagic shock,
identified by altered mental status without head injury, absent or weak
radial pulse, or a mechanism with ongoing uncontrolled bleeding. The
intervention moves oxygen carriage and clotting capability to the casualty
rather than waiting for the casualty to reach it. Time from wounding to first
unit is the metric that matters, and it is the metric a distribution system
can actually change.
""")

P(JTS, 'Prehospital Blood Transfusion', ['administration', 'training', 'en route'], """
Prehospital blood transfusion is delivered by trained medical personnel
operating under a unit protocol that specifies indications, product handling,
administration set requirements, monitoring and documentation. The casualty
is monitored for transfusion reaction throughout, and the unit identifiers,
times and volumes are recorded and travel with the casualty. Blood carried
forward that is not transfused must be returned to controlled storage or
discarded according to the cold chain record.
""")

P(JTS, 'Damage Control Resuscitation', ['tranexamic acid', 'txa', 'antifibrinolytic'], """
Tranexamic acid is given to casualties with, or at risk of, significant
haemorrhage as early as possible and within three hours of injury. It
inhibits fibrinolysis and reduces mortality from bleeding when given early.
Administration after three hours has not shown benefit and has been
associated with harm. It is an adjunct to blood product resuscitation, not a
substitute for it.
""")

P(JTS, 'Damage Control Surgery', ['damage control surgery', 'abbreviated laparotomy', 'staged'], """
Damage control surgery is an abbreviated operation to stop bleeding and
control contamination, followed by physiological restoration in intensive
care and definitive repair at a later operation. It is indicated in a
casualty who is hypothermic, acidotic and coagulopathic, in whom a prolonged
definitive procedure would be fatal. The decision is made early, on
physiology, rather than after several hours of unsuccessful definitive
repair.
""")

P(JTS, 'Damage Control Resuscitation', ['endpoints', 'resuscitation targets', 'lactate'], """
Endpoints of resuscitation are restoration of perfusion rather than
normalisation of a single number: improving mental status, a palpable radial
pulse, adequate urine output, falling lactate and correcting base deficit.
Blood pressure alone is a poor endpoint because a casualty can maintain
pressure by vasoconstriction while remaining profoundly under-perfused. Serial
measurement matters more than any single value.
""")

P(JTS, 'Damage Control Resuscitation', ['rewarming', 'temperature management', 'active warming'], """
Active rewarming begins on arrival and continues through surgery: warmed
fluids and blood, forced air warming, raised ambient theatre temperature and
minimised exposure. A core temperature below thirty-five degrees Celsius in a
bleeding trauma casualty is an independent predictor of mortality. Passive
measures alone are inadequate in a casualty receiving large volume
transfusion.
""")

P(JTS, 'Transfusion Reactions', ['transfusion reaction', 'monitoring', 'adverse'], """
Monitor every transfused casualty for acute reaction: fever, hypotension not
explained by bleeding, respiratory distress, or haemoglobinuria. Stop the
transfusion, maintain the line with saline, and treat supportively. In the
far-forward setting the differential between transfusion reaction and ongoing
haemorrhage is difficult and the default is to continue resuscitating the
haemorrhage while investigating. Record the unit identifiers involved.
""")

P(JTS, 'Prolonged Casualty Care', ['prolonged field care', 'prolonged casualty care', 'delayed evacuation'], """
Prolonged casualty care is the provision of care beyond the doctrinal
evacuation timeline, when evacuation is delayed by distance, weather, threat
or contested air. It shifts the emphasis from resuscitation alone to nursing
care: airway maintenance, fluid balance, temperature, analgesia and sedation,
wound care, pressure area management and documentation over hours to days.
Planning assumptions built on a one hour evacuation do not survive contact in
a theatre where that hour is not available.
""")

P(JTS, 'Burn Care', ['burn resuscitation', 'fluid', 'burn'], """
Burn resuscitation is calculated from body surface area burned and body
weight, begun early, and titrated to urine output rather than run at a fixed
rate to completion. Over-resuscitation causes compartment syndrome and
pulmonary oedema; under-resuscitation causes renal failure. A burn casualty
with associated trauma is resuscitated for the haemorrhage first, with the
burn formula adjusted afterwards.
""")

P(JTS, 'Traumatic Brain Injury', ['tbi', 'cerebral perfusion', 'secondary injury'], """
Management of severe traumatic brain injury in theatre is directed at
preventing secondary injury: avoid hypoxia, avoid hypotension, avoid
hyperthermia, and avoid both hypocapnia and hypercapnia. Maintain systolic
pressure above 110 millimetres of mercury. Hypertonic saline may be used for
signs of raised intracranial pressure. Evacuation priority for a casualty
with a deteriorating neurological examination and a potentially operable
lesion is a surgical emergency.
""")

P(JTS, 'Blood Product Administration', ['blood warming', 'rapid infuser', 'administration set'], """
Blood products are administered through an appropriate filtered
administration set and, wherever the capability exists, through a fluid
warmer. Rapid infusion of cold product into a hypothermic casualty
accelerates the coagulopathy the transfusion is intended to correct. In the
prehospital setting a compact in-line warmer or a warmed transport container
is the practical substitute for a theatre-grade rapid infuser.
""")

P(JTS, 'Documentation', ['transfusion record', 'traceability', 'documentation'], """
Every unit transfused is recorded with its unique identifier, the time of
administration and the recipient, and that record moves with the casualty.
Traceability is a regulatory requirement and a clinical one: donor follow-up
after emergency fresh whole blood collection, and investigation of any
subsequent transfusion-transmitted infection, both depend on a record made at
the time under difficult conditions.
""")

P(JTS, 'Damage Control Resuscitation', ['massive transfusion', 'activation', 'protocol'], """
Massive transfusion protocol activation should be triggered on clinical
grounds early rather than after a defined volume of blood loss has been
measured. Predictors include penetrating mechanism, a positive focused
ultrasound examination, systolic pressure below ninety millimetres of
mercury, and heart rate above one hundred and twenty. Activating early and
standing down costs product; activating late costs the casualty.
""")

P(JTS, 'Junctional Haemorrhage', ['junctional', 'pelvic', 'non-compressible'], """
Non-compressible torso haemorrhage and junctional haemorrhage account for a
large share of potentially survivable deaths. Junctional bleeding is managed
by packing with haemostatic dressing and direct pressure, junctional
tourniquet application where anatomy permits, and pelvic binding for
suspected pelvic fracture. Truly non-compressible intracavitary bleeding is
not controllable in the field and defines the requirement for rapid surgical
access.
""")


# --------------------------------------------------------------- ATP 4-02.2
# Medical Evacuation. Cited by chapter subject rather than paragraph.

ATP = 'ATP 4-02.2 Medical Evacuation'

P(ATP, 'Medical evacuation and casualty evacuation', ['medevac', 'casevac', 'distinction'], """
Medical evacuation is the movement of casualties on a dedicated, standardised
medical platform with en route medical care by trained medical personnel.
Casualty evacuation is the movement of casualties on a non-medical platform
of opportunity, without en route care and without protection under the law of
armed conflict. The distinction is not administrative: a casualty moved by
casualty evacuation receives no treatment during the move, and the interval
counts against the casualty's physiological deadline in full.
""")

P(ATP, 'Evacuation precedence', ['precedence', 'categories', 'overview'], """
Evacuation precedence is assigned by the senior medical person at the scene
on the basis of the casualty's condition, and it determines the order in
which casualties are moved and the response time expected of the evacuation
system. The categories are URGENT, URGENT-SURGICAL, PRIORITY, ROUTINE and
CONVENIENCE. Precedence is a clinical judgement about time, not a statement
of rank or unit priority, and it is reassessed whenever the casualty's
condition changes.
""")

P(ATP, 'Evacuation precedence', ['urgent', 'one hour', 'life limb eyesight'], """
URGENT is assigned to casualties who must be evacuated as soon as possible
and in any event within one hour, to save life, limb or eyesight, to prevent
serious complication, or to prevent permanent disability. The one hour
standard is measured from the time the evacuation request is received. An
URGENT casualty who is not moved within that period has, by the definition of
the category, an expected deterioration in outcome.
""")

P(ATP, 'Evacuation precedence', ['urgent surgical', 'surgical intervention', 'one hour'], """
URGENT-SURGICAL is assigned to casualties who must be evacuated within one
hour and who require far forward surgical intervention to save life and
stabilise for further evacuation. The category exists to route the casualty
to a facility with a surgical capability rather than to the nearest medical
treatment facility. Assigning URGENT where URGENT-SURGICAL was required can
deliver the casualty, on time, to a place that cannot operate.
""")

P(ATP, 'Evacuation precedence', ['priority', 'four hours', 'deterioration'], """
PRIORITY is assigned to casualties requiring prompt medical care who should
be evacuated within four hours. It is used where the casualty's condition
could deteriorate to URGENT if not treated, where the casualty is not
expected to deteriorate significantly within that period, or where the
casualty is suffering severe and undue pain. If the casualty cannot be moved
within four hours the precedence is upgraded.
""")

P(ATP, 'Evacuation precedence', ['routine', 'twenty four hours'], """
ROUTINE is assigned to casualties requiring evacuation whose condition is not
expected to deteriorate significantly, and who should be evacuated within
twenty-four hours. The category covers the majority of casualties in most
operations. Sick and injured personnel awaiting movement to a higher role of
care for evaluation are typically ROUTINE.
""")

P(ATP, 'Evacuation precedence', ['convenience', 'matter of convenience'], """
CONVENIENCE is assigned where evacuation by medical vehicle is a matter of
convenience rather than a medical necessity. The casualty could be moved by
other means without clinical consequence. Assigning CONVENIENCE keeps
evacuation assets available for casualties whose outcome depends on them, and
a system in which every casualty is nominated as URGENT has no precedence
system at all.
""")

P(ATP, 'Evacuation precedence', ['reassessment', 'upgrade', 'en route'], """
Precedence is reassessed continuously. A casualty whose condition
deteriorates while awaiting movement is upgraded and the evacuation control
element is informed immediately. A casualty who improves after treatment may
be downgraded, freeing the asset. Because the response clock runs from the
receipt of the request, a late upgrade does not recover the time already
spent.
""")

P(ATP, 'Nine-line medical evacuation request', ['nine line', 'request', 'format', 'overview'], """
The nine-line medical evacuation request is the standard format for
requesting medical evacuation. Lines one through five are transmitted first
and are the minimum required to launch an aircraft; lines six through nine
follow and refine the mission. The format exists so that a request passed by
a stressed junior soldier over a degraded radio net contains everything the
evacuation crew needs, in a fixed order, with no negotiation.
""")

P(ATP, 'Nine-line medical evacuation request', ['line 1', 'location', 'pickup site', 'grid'], """
Line one is the location of the pickup site, given as a grid reference of
sufficient precision for the aircraft to find it. This is the single most
important line: an aircraft cannot be launched to an unknown location. Where
the transmission is not encrypted, the location is passed using an approved
means of protecting the grid.
""")

P(ATP, 'Nine-line medical evacuation request', ['line 2', 'radio frequency', 'call sign'], """
Line two is the radio frequency, call sign and suffix at the pickup site, so
that the evacuation crew can contact the ground element directly during the
approach. Without it the aircraft arrives in the vicinity of a grid with no
means of confirming the site is secure or that the marking it can see belongs
to the requesting unit.
""")

P(ATP, 'Nine-line medical evacuation request', ['line 3', 'number of patients', 'precedence'], """
Line three is the number of patients by precedence, reported using the
brevity codes: A for URGENT, B for URGENT-SURGICAL, C for PRIORITY, D for
ROUTINE and E for CONVENIENCE. Only the categories actually present are
transmitted. This line drives the launch decision, the aircraft configuration
and the destination facility.
""")

P(ATP, 'Nine-line medical evacuation request', ['line 4', 'special equipment', 'hoist', 'ventilator'], """
Line four is the special equipment required, reported as A for none, B for
hoist, C for extraction equipment and D for ventilator. The line is
transmitted before the aircraft departs because the equipment must be fitted
on the ground. A hoist requirement discovered on arrival costs an entire
return trip.
""")

P(ATP, 'Nine-line medical evacuation request', ['line 5', 'litter', 'ambulatory', 'patient type'], """
Line five is the number of patients by type, reported as L followed by the
number of litter patients and A followed by the number of ambulatory
patients. Litter and ambulatory casualties consume different amounts of
aircraft capacity, and the configuration of the airframe is set on the ground
before departure on the basis of this line.
""")

P(ATP, 'Nine-line medical evacuation request', ['line 6', 'security', 'pickup site', 'enemy'], """
Line six in wartime is the security of the pickup site, reported as N for no
enemy troops in the area, P for possible enemy troops with approach
cautiously, E for enemy troops in the area with approach cautiously, and X
for enemy troops in the area requiring armed escort. In peacetime, line six
is instead the number and type of wound, injury or illness.
""")

P(ATP, 'Nine-line medical evacuation request', ['line 7', 'marking', 'smoke', 'panels'], """
Line seven is the method of marking the pickup site, reported as A for
panels, B for pyrotechnic signal, C for smoke signal, D for none and E for
other. The colour of smoke is not transmitted in the clear; the aircrew
identifies the colour they observe and the ground element confirms it, so
that an enemy monitoring the net cannot mark a false site.
""")

P(ATP, 'Nine-line medical evacuation request', ['line 8', 'nationality', 'status', 'detainee'], """
Line eight is the patient nationality and status, reported as A for United
States military, B for United States civilian, C for non-United States
military, D for non-United States civilian and E for enemy prisoner of war.
The line determines the destination facility and the escort and reporting
requirements, and it is required for every casualty on the aircraft.
""")

P(ATP, 'Nine-line medical evacuation request', ['line 9', 'cbrn', 'contamination', 'terrain'], """
Line nine in wartime is chemical, biological, radiological or nuclear
contamination, reported only when contamination exists, using the letter for
the type. In peacetime, line nine is a description of the terrain features at
the pickup site. A contaminated casualty requires decontamination before
loading, a different destination, and protective measures for the crew.
""")

P(ATP, 'Evacuation platforms', ['air ambulance', 'ground ambulance', 'platform selection'], """
Air ambulance evacuation provides speed and reach and is the platform of
choice for URGENT casualties at distance, but it is limited by weather,
threat, aircraft availability and landing site suitability. Ground ambulance
evacuation is slower and shorter-ranged but is less affected by weather and
threat and can move larger numbers along established routes. Planning
allocates both, and assumes neither will always be available.
""")

P(ATP, 'Ambulance exchange point', ['ambulance exchange point', 'axp', 'handover'], """
An ambulance exchange point is a location where a casualty is transferred
from one evacuation platform to another, typically from a forward ground
ambulance to a rearward ground or air platform. It shortens the turnaround of
the forward asset and keeps it within its supporting distance. Exchange
points are planned in advance, are physically marked, and require a clinical
handover with the casualty's documentation.
""")

P(ATP, 'En route care', ['en route care', 'critical care', 'transport'], """
En route care is the medical care provided during movement and is what
distinguishes medical evacuation from casualty evacuation. It requires
trained personnel, patient movement items appropriate to the casualty's
condition, and continuity of the treatment already begun. A casualty whose
resuscitation stops at the aircraft door is a casualty whose treatment stops
for the duration of the flight.
""")

P(ATP, 'Patient movement items', ['patient movement items', 'pmi', 'equipment'], """
Patient movement items are the durable medical equipment that accompanies a
casualty during evacuation, including litters, monitors, ventilators and
infusion devices. They are recycled through a managed system so that the
sending facility is not stripped of equipment by each evacuation. Failure to
recycle patient movement items degrades the sending facility's capability
mission by mission.
""")

P(ATP, 'Evacuation planning', ['planning factors', 'evacuation planning', 'distance'], """
Medical evacuation planning considers the anticipated casualty rate, the
distances between roles of care, the availability and vulnerability of
evacuation platforms, route and airspace conditions, weather, and the
evacuation policy in effect. The planning output is the number and positioning
of evacuation assets required to meet the precedence time standards, not
simply the number of platforms available.
""")

P(ATP, 'Protection of medical evacuation', ['geneva conventions', 'marking', 'protection'], """
Dedicated medical evacuation platforms are marked with the distinctive
emblem and are protected under the law of armed conflict, provided they are
used exclusively for medical purposes and are not used to commit acts harmful
to the enemy. Carrying combatant supplies or arming the platform beyond
authorised individual weapons for the defence of the wounded forfeits that
protection.
""")

P(ATP, 'Hoist operations', ['hoist', 'extraction', 'terrain'], """
Hoist extraction is used where the terrain, vegetation or obstacles prevent
the aircraft from landing. It is slow, exposes the aircraft in a hover, and
is limited by aircraft power margin, weather and the weight of the casualty
and attendant. It is requested on line four of the evacuation request so that
the equipment is fitted before departure, and it is planned for rather than
discovered on arrival.
""")

P(ATP, 'Evacuation control', ['evacuation control', 'request flow', 'medical regulating'], """
Evacuation requests pass from the requesting unit through the command net to
the medical evacuation control element, which matches the request to an
available platform and a receiving facility with the required capability and
capacity. The control element deconflicts competing requests by precedence.
Where multiple URGENT casualties exceed available lift, the decision made at
this node determines who is moved first.
""")


# --------------------------------------------------------------- FM 4-02.1
# Army Medical Logistics.

FM = 'FM 4-02.1 Army Medical Logistics'

P(FM, 'Class VIII medical materiel', ['class viii', 'medical materiel', 'definition'], """
Class VIII is medical materiel: the pharmaceuticals, medical and surgical
consumables, medical equipment, repair parts, medical gases and blood
products required to deliver health service support. It is managed separately
from other classes of supply because it has distinct storage, temperature,
regulatory, shelf life and accountability requirements, and because the
clinician requesting it cannot substitute an approximate item.
""")

P(FM, 'Class VIII medical materiel', ['class viiia', 'medical supplies', 'subclass'], """
Class VIIIa is medical materiel excluding blood and blood products:
pharmaceuticals, consumable supplies, sets, kits and outfits, medical devices
and their repair parts. It is the bulk of the medical supply chain by line
count and is generally amenable to conventional inventory management,
forecasting and unit resupply, with the exception of controlled substances
and temperature-sensitive items.
""")

P(FM, 'Class VIII medical materiel', ['class viiib', 'blood', 'blood products', 'subclass'], """
Class VIIIb is blood and blood products. It is managed through a separate
distribution system with its own temperature control, shelf life, traceability
and reporting requirements, because a unit of blood that has left its
temperature envelope is not a unit of blood any longer. Class VIIIb
requirements are computed from anticipated casualty numbers and transfusion
rates rather than from historical consumption.
""")

P(FM, 'Medical resupply', ['push', 'pull', 'resupply method'], """
Medical resupply operates on both push and pull. Pull resupply is
requisition-driven: the using unit identifies a shortage and requests
replenishment, which is accurate but slow and depends on communications. Push
resupply is anticipatory: preconfigured packages are sent forward on a
schedule or on a trigger without a specific request. Push is used at the
start of operations, during high-intensity periods, and whenever the
communications or requisition cycle cannot keep pace with consumption.
""")

P(FM, 'Medical resupply', ['push package', 'preconfigured', 'combat configured load'], """
Preconfigured push packages are standardised, palletised or bagged sets of
Class VIII assembled in advance against an expected pattern of casualties,
so that they can be dispatched without the delay of picking individual lines.
They trade precision for speed: a push package will contain items the
receiving unit does not need, and the waste is accepted because the
alternative is a delay in items the unit does need.
""")

P(FM, 'Medical resupply', ['early entry', 'initial issue', 'operations'], """
Early entry operations rely almost entirely on unit basic loads and push
packages, because the requisition system, the medical logistics company and
the theatre distribution network are not yet established. The quantity
carried in and pushed forward during this period is a planning decision made
before the operation begins, and it constrains what the medical force can do
until sustained resupply is running.
""")

P(FM, 'Medical resupply', ['emergency resupply', 'urgent requisition', 'priority'], """
An emergency medical resupply request is generated when a shortage will
prevent treatment of casualties before the routine resupply cycle can respond.
It is passed by the fastest available means, bypasses the normal requisition
queue, and is filled from the nearest available stock rather than from the
designated source of supply. Emergency resupply is expensive in transport and
is a symptom of a forecast that was wrong or a consumption rate that changed.
""")

P(FM, 'Medical resupply', ['aerial delivery', 'air resupply', 'unmanned'], """
Medical resupply by air, including aerial delivery and unmanned platforms,
is used where ground lines of communication are long, interdicted or
impassable, and where the item is low weight and high urgency. Blood
products, specific pharmaceuticals and single critical repair parts are
typical candidates. The planning constraints are payload, range, weather,
airspace clearance and, for temperature-controlled items, the ability to hold
the cold chain for the duration of the flight.
""")

P(FM, 'Medical logistics at Role 1', ['role 1', 'unit level', 'basic load'], """
Role 1 medical elements carry a unit basic load of Class VIIIa sized to the
supported population and the anticipated casualty rate, and are resupplied by
the supporting medical logistics element. Because Role 1 elements are
dispersed and mobile, their resupply is frequently the constraining link:
supply may exist in theatre and still not be where the casualty is.
""")

P(FM, 'Medical assemblages', ['medical equipment set', 'assemblage', 'sets kits outfits'], """
Medical equipment sets are standardised assemblages of supplies and equipment
that provide a defined clinical capability, such as a treatment squad's
trauma set or a surgical team's operating set. They are managed as a unit,
inventoried against a component list, and reconstituted after use. The set
concept means a capability can be moved, accounted for and replaced as one
item rather than as several hundred lines.
""")

P(FM, 'Medical maintenance', ['medical maintenance', 'repair', 'equipment'], """
Medical maintenance keeps medical devices calibrated, safe and serviceable,
and is performed by trained biomedical equipment specialists at the unit and
at supporting maintenance activities. Medical equipment that fails
calibration is a clinical hazard, not merely an availability problem. Repair
parts for medical devices are Class VIII, not Class IX, and flow through the
medical supply chain.
""")

P(FM, 'Blood support', ['blood support detachment', 'blood distribution', 'class viiib'], """
Blood support elements receive, store, and distribute blood products in
theatre and maintain the cold chain from the point of entry forward. They
hold the theatre's refrigerated and frozen storage, manage rotation against
expiry, and issue to medical treatment facilities and forward elements
against forecast and demand. Blood distribution is measured in hours of
remaining shelf life as well as in units.
""")

P(FM, 'Theatre medical materiel management', ['single integrated medical logistics manager', 'simlm', 'tlamm'], """
A single integrated medical logistics manager, or theatre lead agent for
medical materiel, is designated to provide common-user medical logistics
support across the joint force in a theatre. Consolidating the function
prevents four services from building four parallel medical supply chains for
the same items, and gives the joint force commander one accountable node for
medical materiel readiness.
""")

P(FM, 'Stockage levels', ['days of supply', 'stockage objective', 'inventory'], """
Class VIII stockage objectives are expressed in days of supply and are set
against the anticipated casualty rate, the resupply cycle time and the
reliability of the distribution system. A longer or less reliable resupply
cycle requires a larger forward stock, which increases the exposure of that
stock to loss and expiry. The stockage decision is therefore a judgement
about the distribution system as much as about clinical demand.
""")

P(FM, 'Asset visibility', ['asset visibility', 'inventory management', 'reporting'], """
Total asset visibility of Class VIII depends on units reporting on-hand
quantities accurately and promptly. Without it, the theatre manager cannot
see that the item a unit needs is sitting in a neighbouring unit's stock, and
requisitions the item from outside the theatre instead. Visibility is what
converts dispersed stock into a single theatre inventory.
""")

P(FM, 'Controlled substances', ['controlled substances', 'accountability', 'narcotics'], """
Controlled substances require separate accountability, secure storage, a
designated custodian, and documented transfer at every change of custody,
including during evacuation. The requirement persists under field conditions.
Losses are reported and investigated. The administrative burden is accepted
because the alternative is diversion of exactly the drugs a casualty in pain
needs to be available.
""")

P(FM, 'Retrograde and reconstitution', ['retrograde', 'reconstitution', 'medical equipment'], """
Medical materiel is retrograded for repair, for redistribution, or for
disposal, and units are reconstituted after heavy casualty loads by
replenishing assemblages to their component lists. Reconstitution is a
deliberate, resourced activity: a treatment element that has expended its set
is not a treatment element until the set is restored, regardless of how many
personnel it still has.
""")

P(FM, 'Medical gases', ['oxygen', 'medical gases', 'supply'], """
Medical oxygen is a Class VIII item with distinct handling, storage and
transport requirements, and is a common constraint on far-forward and en
route care. Oxygen generation capability reduces dependence on cylinder
resupply but requires power and maintenance. Planning for oxygen is done
separately from general Class VIII because its bulk and hazard properties
dominate its distribution.
""")

P(FM, 'Optical fabrication', ['optical', 'spectacles', 'fabrication'], """
Optical fabrication support produces and repairs spectacles and protective
eyewear in theatre. It is a small part of medical logistics by volume and a
disproportionate one by effect on individual readiness, because a soldier who
cannot see cannot fight and cannot be replaced quickly.
""")

P(FM, 'Cold chain logistics', ['cold chain', 'temperature sensitive', 'pharmaceuticals'], """
Temperature-sensitive medical materiel, including vaccines, certain
pharmaceuticals and all blood products, requires an unbroken cold chain from
the point of manufacture to the point of administration, with monitored
storage at every node and monitored transport between them. A break in the
chain is a materiel loss that is invisible on a stock report: the item is
still on the shelf and is no longer usable.
""")


# ------------------------------------------------------------------ JP 4-02
# Joint Health Services.

JP = 'JP 4-02 Joint Health Services'

P(JP, 'Health service support', ['health service support', 'force health protection', 'overview'], """
Joint health services comprise health service support, which is the care of
casualties and the medical logistics and evacuation that sustain it, and
force health protection, which is the prevention of casualties through
preventive medicine, health surveillance and occupational health. The two are
planned together. A force that treats casualties well and prevents none will
still lose its combat power.
""")

P(JP, 'Roles of care', ['roles of care', 'echelons', 'overview'], """
Medical capability in a theatre is organised into four roles. Each role has
the capabilities of the roles below it plus additional capability of its own,
so a casualty passing rearward is never moved to a facility that can do less.
The roles describe capability, not a specific unit or a fixed location, and a
casualty may bypass a role entirely if the clinical requirement and the
evacuation means allow.
""")

P(JP, 'Roles of care', ['role 1', 'first responder', 'battalion aid station'], """
Role 1 is immediate first aid, self and buddy aid, and the care provided by
the combat medic and the battalion aid station or equivalent. It includes
casualty collection, treatment of life-threatening conditions, preparation
for evacuation and return to duty of minor casualties. Role 1 has no
inpatient capability and no surgical capability. Most of what determines
survival from potentially survivable wounds happens here.
""")

P(JP, 'Roles of care', ['role 2', 'forward resuscitative care', 'holding'], """
Role 2 provides advanced trauma management and emergency medical treatment
beyond Role 1, with a limited holding capability, basic laboratory, limited
radiology, dental support, blood storage and patient movement. Role 2 units
are mobile and are positioned to receive casualties from a set of supported
Role 1 elements. Role 2 without a surgical augmentation cannot perform
surgery.
""")

P(JP, 'Roles of care', ['role 2 enhanced', 'forward surgical', 'damage control surgery'], """
Role 2 enhanced adds a forward resuscitative surgical capability: a small
surgical team able to perform damage control surgery close to the point of
wounding, with a small holding capacity for post-operative casualties
awaiting evacuation. It has very limited capacity and depends entirely on
onward evacuation. A forward surgical team that cannot clear its post-
operative casualties stops being able to operate.
""")

P(JP, 'Roles of care', ['role 3', 'theatre hospitalisation', 'combat support hospital'], """
Role 3 is theatre hospitalisation: resuscitation, surgery, intensive care,
inpatient wards, full laboratory, radiology including computed tomography,
blood banking, and specialist consultation. It is the highest level of care
available within the operational area and is the destination for most
casualties requiring surgery. Role 3 facilities are large, relatively
immobile and require substantial sustainment.
""")

P(JP, 'Roles of care', ['role 4', 'definitive care', 'outside theatre'], """
Role 4 is definitive and rehabilitative care provided outside the operational
area, in the supporting theatre or in the continental United States. It
includes the reconstructive surgery, specialist care and rehabilitation that
cannot be delivered in theatre and that would exceed the theatre evacuation
policy. Movement to Role 4 is by strategic aeromedical evacuation.
""")

P(JP, 'Theatre evacuation policy', ['evacuation policy', 'days', 'return to duty'], """
The theatre evacuation policy is the maximum number of days a casualty may be
held in theatre for treatment before being evacuated out of the operational
area. It is established by the Secretary of Defense on the recommendation of
the combatant commander. A casualty expected to be returned to duty within
that number of days is treated in theatre; a casualty who is not is evacuated,
regardless of whether the theatre could in principle treat them.
""")

P(JP, 'Theatre evacuation policy', ['bed requirement', 'planning', 'policy effect'], """
The evacuation policy drives the theatre's bed requirement and its strategic
lift requirement in opposite directions. A long policy holds more casualties
in theatre, requiring more beds, more staff and more sustainment, and reduces
strategic evacuation flights. A short policy reduces the theatre medical
footprint and increases the demand on strategic aeromedical evacuation. The
policy is therefore a force structure decision as much as a clinical one.
""")

P(JP, 'Medical regulating', ['medical regulating', 'patient movement', 'destination'], """
Medical regulating is the process of matching casualties to medical treatment
facilities with the required specialty capability, bed capacity and staff
available, and coordinating the movement to get them there. It prevents the
nearest facility from being saturated while a capable facility a short flight
away stands empty. Regulating requires current visibility of both casualty
condition and facility capacity.
""")

P(JP, 'Patient movement', ['patient movement requirements centre', 'tpmrc', 'gpmrc'], """
Patient movement requirements centres coordinate the movement of casualties.
A theatre centre manages movement within the theatre and the requirements for
movement out of it; a global centre coordinates inter-theatre movement and
allocates strategic aeromedical evacuation. A validating flight surgeon
confirms that each casualty is fit for the proposed movement and specifies the
level of en route care required.
""")

P(JP, 'Patient movement', ['aeromedical evacuation', 'strategic', 'en route care'], """
Aeromedical evacuation moves casualties on fixed-wing aircraft with an
aeromedical evacuation crew and, for critical casualties, a critical care air
transport capability. It is scheduled against validated requirements rather
than being launched on demand. Altitude physiology constrains what can be
moved and when: a casualty with an untreated pneumothorax or recent
intracranial injury has flight restrictions independent of clinical urgency.
""")

P(JP, 'Mass casualty', ['mass casualty', 'triage', 'overwhelm'], """
A mass casualty situation exists when the number and severity of casualties
exceeds the capability of the medical resources immediately available. The
governing principle changes from doing the most for each casualty to doing
the most for the greatest number. Triage is the mechanism, and it is
performed repeatedly as resources arrive and casualties' conditions change.
""")

P(JP, 'Mass casualty', ['triage categories', 'immediate', 'delayed', 'minimal', 'expectant'], """
Joint triage categories are immediate, delayed, minimal and expectant.
Immediate casualties require life-saving intervention that is quick to
perform and gives a high probability of survival. Delayed casualties need
treatment but can wait without significant deterioration. Minimal casualties
have injuries manageable with self or buddy aid. Expectant casualties have
injuries so severe that survival is unlikely with the resources available;
they receive comfort care and are reassessed if resources change.
""")

P(JP, 'Medical command and control', ['medical command and control', 'joint force surgeon', 'coordination'], """
The joint force surgeon advises the joint force commander on health service
support and force health protection and coordinates the health services of
the component commands. Medical command and control provides the visibility
of casualty flow, facility capacity, evacuation asset status and Class VIII
stocks that any allocation decision depends on. Without it, allocation
decisions are made locally with local information.
""")

P(JP, 'Medical rules of eligibility', ['rules of eligibility', 'eligibility', 'access'], """
Medical rules of eligibility define which categories of person may receive
care at United States medical facilities in an operational area, and at what
level. They are issued by the combatant commander and are a command decision
constrained by law, policy and available capacity. They exist so that
eligibility questions are resolved before a casualty arrives rather than at
the door.
""")

P(JP, 'Detainee health care', ['detainee', 'enemy prisoner of war', 'obligation'], """
Detainees and enemy prisoners of war receive medical care on the same
clinical basis as friendly forces, triaged by medical need without regard to
status. This is a legal obligation under the law of armed conflict and is not
subject to the tactical situation. Detainee casualties are evacuated through
the medical system with appropriate security, and their status is reported on
the evacuation request.
""")

P(JP, 'Multinational health services', ['multinational', 'interoperability', 'partner'], """
Health service support in a multinational operation depends on agreed
standards for triage categories, evacuation precedence, documentation, blood
product acceptance and clinical scope of practice. Where standards differ,
the differences are resolved in planning and captured in the operation order.
A casualty handed between partners with incompatible documentation loses the
treatment history that the receiving clinician needs.
""")

P(JP, 'Casualty estimation', ['casualty estimate', 'planning', 'rates'], """
Casualty estimation projects the number, type and timing of casualties from
the concept of operations, the force size, the threat and historical rates,
and it drives every subsequent medical planning figure: treatment capacity,
evacuation lift, blood requirement and Class VIII stockage. An estimate that
is wrong in timing rather than in total is still wrong in the way that
matters, because medical capability that arrives after the casualties is not
capability.
""")

P(JP, 'Continuity of care', ['continuity', 'documentation', 'handover'], """
Continuity of care across roles depends on the casualty's clinical record
moving with the casualty. Each transfer is a point at which information is
lost: interventions performed, times of administration, products transfused,
allergies and the mechanism of injury. The receiving clinician who cannot
establish when the tourniquet was applied or whether tranexamic acid was
given must make decisions with worse information than the sending clinician
had.
""")


# ------------------------------------------------------- blood cold chain
# Storage, shelf life and transport of blood products. Cited to the
# combination of AABB standards and JTS blood management guidance that these
# figures come from, at the level of the topic rather than a clause number.

BLD = 'Blood Product Handling (JTS / AABB derived)'

P(BLD, 'Red blood cell storage', ['red blood cells', 'storage temperature', 'shelf life'], """
Red blood cells are stored at one to six degrees Celsius in a monitored
refrigerator. Shelf life depends on the anticoagulant and additive solution:
about thirty-five days in citrate phosphate dextrose adenine, and about
forty-two days in units with an additive solution. Storage outside the one to
six degree range is a deviation that must be recorded and evaluated before
the unit is issued.
""")

P(BLD, 'Whole blood storage', ['whole blood', 'storage', 'shelf life', 'cold stored'], """
Cold stored whole blood is held at one to six degrees Celsius. Shelf life is
about twenty-one days in citrate phosphate dextrose, and about thirty-five
days in citrate phosphate dextrose adenine. Platelet function in cold stored
whole blood declines over storage but a substantial haemostatic effect
persists, which is one of the reasons the product is used far forward
despite the platelet loss.
""")

P(BLD, 'Low titer O whole blood', ['ltowb', 'low titer', 'shelf life', 'screening'], """
Low titer group O whole blood is screened for anti-A and anti-B antibody
titres below the accepted threshold, allowing transfusion to recipients of
any ABO group. It is stored at one to six degrees Celsius with the same shelf
life as other cold stored whole blood, and it is the preferred forward
product because it needs no crossmatch, no thawing and no reconstitution
before it is given.
""")

P(BLD, 'Fresh whole blood', ['fresh whole blood', 'warm', 'walking blood bank'], """
Fresh whole blood collected from an emergency donor panel is transfused
within hours of collection and is not stored as inventory. It retains full
platelet function. It is used when stored products are exhausted, and it
carries a higher infectious risk than fully tested inventory because the
testing performed at the point of collection is abbreviated. Donor and
recipient records are retained for post-operation follow-up.
""")

P(BLD, 'Plasma storage', ['fresh frozen plasma', 'frozen', 'storage', 'shelf life'], """
Fresh frozen plasma is stored at minus eighteen degrees Celsius or colder,
with a shelf life of about one year. It must be thawed before use, which
takes time and equipment that a forward element frequently does not have.
Once thawed, plasma is stored at one to six degrees Celsius and must be used
within five days. Refreezing thawed plasma is not permitted.
""")

P(BLD, 'Plasma alternatives', ['freeze dried plasma', 'lyophilised', 'reconstitution'], """
Freeze-dried plasma is stored at ambient temperature, reconstituted with
sterile water in a few minutes, and used within hours of reconstitution. It
removes the freezer, the thawing time and the cold chain from the plasma
supply problem, which is why it is attractive for prehospital and prolonged
care settings. Its clotting factor content is somewhat reduced relative to
fresh frozen plasma.
""")

P(BLD, 'Platelet storage', ['platelets', 'storage', 'agitation', 'shelf life'], """
Platelets are stored at twenty to twenty-four degrees Celsius with continuous
gentle agitation, with a shelf life of about five days, or seven days where
approved pathogen reduction or bacterial testing is in place. Room
temperature storage makes bacterial contamination the dominant safety risk.
The storage requirement is incompatible with forward distribution, which is a
significant part of the case for whole blood.
""")

P(BLD, 'Cold chain monitoring', ['temperature monitoring', 'data logger', 'cold chain'], """
Every blood storage device and every shipping container carries continuous
temperature monitoring with an alarm and a recoverable record. The record,
not the current reading, is what determines whether a unit is acceptable: a
container that is at four degrees on arrival may have spent two hours at
fifteen degrees in transit. Monitoring devices are checked and calibrated on
a defined schedule.
""")

P(BLD, 'Transport containers', ['shipping container', 'transport', 'validated', 'duration'], """
Blood is transported in validated insulated containers packed to a
qualified configuration, which hold one to six degrees Celsius for a
specified number of hours under a specified ambient profile. Containers used
in far-forward distribution are validated for extended duration, commonly in
the region of three days, so that a unit dispatched forward remains issuable
if the mission is delayed. Deviating from the qualified packing configuration
invalidates the hold time.
""")

P(BLD, 'Cold chain excursion', ['excursion', 'out of range', 'disposition'], """
A unit that has been outside its storage temperature range is quarantined
and evaluated before any further use. Red cells returned to storage after a
brief, documented period at room temperature may be acceptable under a
defined rule; units with an unknown or prolonged excursion are discarded. The
determination is made from the temperature record and the elapsed time, not
from the appearance of the unit.
""")

P(BLD, 'Cold chain excursion', ['thirty minute rule', 'return to stock', 'issue'], """
A unit of red cells issued and not transfused may be returned to inventory
only if it has been out of controlled storage for less than the permitted
period and its temperature has remained within the acceptable range. The
traditional rule allowed thirty minutes out of refrigeration; many
organisations now use a monitored rule permitting a longer interval provided
the unit temperature has not exceeded ten degrees Celsius. Either way, the
elapsed time must be documented at issue.
""")

P(BLD, 'Time out of refrigeration', ['whole blood', 'out of the fridge', 'excursion',
                                     'thirty minutes', 'unrefrigerated'], """
Cold stored whole blood out of controlled temperature is governed by the same
logic as red cells: a short, documented interval is recoverable and a long or
unrecorded one is not. The traditional working figure is thirty minutes out of
refrigeration before a unit must be transfused or discarded, with monitored
schemes allowing longer provided the unit has not exceeded ten degrees
Celsius. In a forward setting the practical consequence is that a unit is not
taken out of its container until there is a casualty to give it to, because
the clock starts when the container opens and the unit cannot be put back.
""")

P(BLD, 'Inventory rotation', ['rotation', 'expiry', 'first in first out', 'wastage'], """
Blood inventory is rotated so that the oldest acceptable unit is issued
first, and units approaching expiry are moved to higher-throughput facilities
where they will be used. Wastage is measured and reported. In a forward
distribution system, every unit pushed to a location that does not use it is
a unit that ages in transit, and the age at delivery is a system performance
measure as much as the delivery time is.
""")

P(BLD, 'Forward distribution', ['prehospital blood', 'forward distribution', 'delivery'], """
Delivering blood products to the point of injury requires the cold chain to
extend to a location that has no power, no refrigerator and no
predictability. The practical solution is a validated transport container
carried forward with the casualty response, with the temperature record
travelling with it and the remaining hold time treated as a hard constraint
on how long the product can be held before it must be used or returned.
""")

P(BLD, 'Blood documentation', ['traceability', 'unit identifier', 'records'], """
Each blood unit carries a unique identifier that links the donation, the
testing, the storage history and the recipient. The identifier is recorded at
issue and at transfusion, and the record moves with the casualty. This chain
is what allows a donor to be notified and other recipients traced if a
post-donation problem is discovered, and it cannot be reconstructed after the
fact from a delivery manifest.
""")

P(BLD, 'Blood requirement planning', ['forecast', 'requirement', 'usage rate'], """
Theatre blood requirements are computed from the casualty estimate, the
proportion of casualties expected to require transfusion, and the average
number of units per transfused casualty, with an allowance for wastage and
for the time the resupply pipeline takes. Because whole blood has a shelf
life measured in weeks and the pipeline is measured in days, forecast error
appears either as stockout at the point of need or as expiry in the
refrigerator, and both are visible in the same report.
""")

P(BLD, 'Massive transfusion supply', ['massive transfusion', 'units', 'supply impact'], """
A single casualty requiring massive transfusion can consume ten or more units
of blood product in the first hour. One such casualty therefore changes the
supply position of a forward holding facility immediately and without
warning. Forward stock levels sized against average consumption will not
survive a casualty at the tail of the distribution, which is the argument for
responsive resupply rather than larger forward stocks alone.
""")


# ------------------------------------------------------------- Golden Hour
# The sixty-minute evacuation standard is a policy decision with a documented
# history, and the history matters more than the number. It is cited here to
# the 2009 Secretary of Defense direction that established it as a mandate in
# Afghanistan, and to the peer-reviewed outcome analyses published afterwards
# by the Joint Trauma System and its collaborators. Where those analyses
# report magnitudes, this corpus states the DIRECTION of the finding and
# points at the publication rather than reciting figures from memory; a
# plausible-looking percentage that turns out to be wrong would discredit
# everything else on the page.

GH = 'Golden Hour policy (2009 Secretary of Defense directive; JTS outcome analyses)'

P(GH, 'The sixty-minute standard', ['golden hour', 'policy', 'sixty minutes', 'one hour'], """
The Golden Hour standard is the direction, issued by the Secretary of Defense
in 2009 for operations in Afghanistan, that a wounded service member be moved
to a surgical capability within sixty minutes of the call for evacuation. It
is a command standard imposed on a system, not a clinical finding about a
patient. Meeting it required forward basing of evacuation aircraft, crews held
at short notice to move, and a command willingness to accept the cost of both.
""")

P(GH, 'Origin of the phrase', ['golden hour', 'history', 'cowley', 'origin'], """
The phrase golden hour predates the policy by decades and is usually traced
to R Adams Cowley, who argued that the interval immediately after severe
injury determines survival. It entered practice as a clinical maxim rather
than as a result established by trial, and the specific figure of one hour has
never been demonstrated to be a physiological threshold. What the evidence
supports is monotonic: for haemorrhagic injury, shorter time to haemorrhage
control is better, without a cliff edge at any particular minute.
""")

P(GH, 'What the outcome analysis showed', ['golden hour', 'evidence', 'outcomes', 'case fatality'], """
Outcome analyses published after the mandate, principally the Joint Trauma
System work on casualties before and after 2009, reported that median
prehospital transport time fell substantially and that both case fatality rate
and the proportion killed in action declined over the same period. The
magnitude of those changes should be read from the published analysis rather
than quoted from memory, and the authors were explicit that a before-and-after
comparison across a changing war cannot by itself establish causation.
""")

P(GH, 'What the standard assumes', ['golden hour', 'assumptions', 'air superiority', 'basing'], """
The sixty-minute standard was achievable in Afghanistan because of conditions
that were specific to that theatre: uncontested airspace, forward operating
bases within rotary-wing range of almost every patrol, dedicated evacuation
airframes, and a mature network of surgical teams pushed well forward. Each of
those is an assumption, not a constant. A theatre that lacks any one of them
does not get a slower Golden Hour, it gets a different problem.
""")

P(GH, 'Why sixty minutes is not a deadline', ['golden hour', 'deadline', 'physiology', 'triage'], """
Sixty minutes is a planning standard applied uniformly across a casualty
population whose individual tolerances differ by an order of magnitude. An
uncontrolled junctional or truncal haemorrhage can kill in under ten minutes,
well inside the standard, while a casualty with a controlled extremity wound
may be stable for many hours. Planning to a single number therefore over-serves
some casualties and arrives after others have already died. The clinically
meaningful quantity is time to haemorrhage control for the individual
casualty, not average time to a facility.
""")

P(GH, 'The standard in a contested theatre', ['golden hour', 'contested', 'pacom', 'distance'], """
In a maritime or archipelagic theatre with contested air, the distances alone
can exceed rotary-wing range, and the airspace may be denied for periods far
longer than an hour. Planning that assumes the sixty-minute standard will hold
produces a medical plan that fails on the first day. The doctrinal response is
not to abandon urgency but to move capability forward, to extend holding
capacity through prolonged casualty care, and to plan explicitly for the hours
during which evacuation will not be available.
""")

P(GH, 'Measuring the right interval', ['golden hour', 'measurement', 'timeline', 'surgery'], """
Timelines are recorded at several points and they are not interchangeable:
time of wounding, time the evacuation request is received, time the aircraft
launches, time the casualty is on board, time of arrival at the receiving
facility, and time of surgical haemorrhage control. The sixty-minute standard
is measured from the request. Time from wounding to surgery, which is the
interval the casualty experiences, is longer and is the one that correlates
with outcome. A system reported as meeting the standard can still be slow by
the measure that matters.
""")


# ------------------------------------------------------- unmanned resupply
# Unmanned aerial resupply of medical materiel is an emerging capability
# rather than settled doctrine. It is cited here as concept material and
# aerial delivery doctrine, and the passages say so, because presenting a
# concept as an approved procedure in front of this audience would be a
# straightforward misrepresentation.

UR = ('Unmanned resupply concepts (ATP 4-48 Aerial Delivery; service UAS '
      'logistics concepts — emerging, not settled doctrine)')

P(UR, 'Role of unmanned aerial resupply', ['unmanned', 'uas', 'drone', 'resupply'], """
Unmanned aerial resupply addresses a narrow but important case: a low-weight,
high-urgency item needed at a location that ground transport cannot reach in
time and that a crewed aircraft cannot be risked to reach at all. Blood
products, specific pharmaceuticals, oxygen and single critical components are
the typical medical candidates. The capability is documented in aerial
delivery doctrine and service concept work; it is not yet a settled part of
Army medical logistics doctrine, and should be described as emerging.
""")

P(UR, 'Payload and range constraints', ['unmanned', 'payload', 'range', 'planning'], """
The planning constraints on an unmanned resupply sortie are payload mass,
usable range at that payload, endurance in the prevailing wind, and the
launch and recovery footprint. Range falls as payload rises, and the relation
is not linear, so a platform advertised at a maximum range and a maximum
payload will usually not deliver both at once. A medical planner should treat
the advertised figures as separate corners of an envelope and plan against the
combination actually required.
""")

P(UR, 'Cold chain in flight', ['unmanned', 'cold chain', 'blood', 'temperature'], """
Carrying blood on an unmanned platform makes the container, not the aircraft,
the limiting item. The payload must hold storage temperature for the whole
period from packing to transfusion, which includes time on the ground at both
ends, and it must be monitored so the receiving element knows the product is
still usable. An unmanned delivery that arrives inside the required time with
an unmonitored or breached container has delivered nothing that can lawfully
be transfused.
""")

P(UR, 'Airspace integration', ['unmanned', 'airspace', 'deconfliction', 'control'], """
Unmanned resupply flights occupy the same low-altitude airspace as rotary-wing
evacuation, fires and other unmanned systems. They require airspace
coordination measures, deconfliction with the airspace control authority, and
a plan for lost link that does not put the airframe into a flight path used by
crewed aircraft. In a permissive theatre this is administrative friction; in a
contested one, where routes are constrained by threat, it becomes a real
limit on sortie rate.
""")

P(UR, 'Delivery accuracy and recovery', ['unmanned', 'delivery', 'accuracy', 'recovery'], """
A delivery is only complete when the receiving element has the item in hand.
Precision of the drop, the visibility of the container on the ground, the
time and exposure required to recover it, and the signature that recovery
creates are all part of the planning problem. A container that lands two
hundred metres from a casualty collection point under observation may cost
more than it delivers.
""")

P(UR, 'Accountability and control', ['unmanned', 'accountability', 'controlled substances', 'custody'], """
Medical materiel moved by unmanned platform remains subject to the same
accountability as materiel moved by any other means. Controlled substances
require custody documentation and a receiving signature, blood products
require unit-level traceability from issue to transfusion, and both require a
record that survives the delivery. An autonomous delivery chain that cannot
produce that record is not a shortcut; it is an unaccountable one.
""")

P(UR, 'Attrition and dispersal', ['unmanned', 'attrition', 'contested', 'dispersal'], """
Unmanned platforms are attritable in a way crewed aircraft are not, which is
the argument for using them where the threat is high, and it changes the
planning arithmetic: sorties are planned with an expected loss rate, spare
airframes are held forward, and launch points are dispersed so that a single
strike does not remove the capability. Loss of an airframe carrying blood
costs the product as well as the platform, which is an argument for splitting
a large requirement across several sorties.
""")

P(UR, 'Resupply is not evacuation', ['unmanned', 'evacuation', 'limits', 'casevac'], """
Unmanned platforms currently deliver materiel forward; they do not carry
casualties rearward under approved doctrine. Casualty movement requires en
route care, monitoring and the ability to intervene, and the platforms fielded
for logistics provide none of these. Concept work and experimentation on
unmanned casualty movement exists, but a medical plan should not assume the
capability. The operational value of unmanned resupply is that it can push a
treatment capability forward to a casualty who cannot yet be moved.
""")


# --------------------------------------------- prolonged care, additional

P('JTS Clinical Practice Guidelines', 'Prolonged Casualty Care',
  ['prolonged field care', 'pfc', 'capabilities', 'nursing'], """
Prolonged casualty care rests on a small set of capabilities held forward:
monitoring that does not depend on a continuous power supply, the means to
maintain an airway for hours, fluid and blood product management with
documented balance, temperature control, analgesia and sedation with a plan
for the patient who deteriorates, and a written record that travels with the
casualty. Equipment is the smaller half of the problem; the larger half is
having a trained person able to stay with one casualty for hours.
""")

P('JTS Clinical Practice Guidelines', 'Prolonged Casualty Care',
  ['prolonged field care', 'telemedicine', 'consultation', 'reachback'], """
Telemedical consultation extends the reach of specialist judgement to a
provider working alone, and prolonged casualty care guidance assumes it will
be sought early rather than at the point of crisis. The consultation is only
as good as the data that reaches it, so vital signs trends, interventions and
their timings are recorded from the first contact. A consultation architecture
that depends on a link which the theatre cannot guarantee must have a
documented fallback: what the provider does when the link is down.
""")


# ===========================================================================
#  THE EVALUATION SET
# ===========================================================================
#
# Twenty questions written the way a medical officer or a judge would
# actually ask them, each paired with the passage that ought to come back.
# The expected passage is identified by a distinctive substring of its text
# rather than by an index, so that inserting a passage does not silently
# invalidate the eval. Questions were written BEFORE the retrieval was tuned
# and none were changed afterwards; two of them are deliberately awkward
# (Q14 uses only lay vocabulary, Q19 asks about a number that appears in two
# different passages) because an eval on which the system scores full marks
# tells you nothing.

EVAL = [
    ('How long after being wounded can we still give TXA?',
     'must not be given later than three hours after injury'),
    ('What is the time standard for an URGENT medevac?',
     'in any event within one hour, to save life, limb or eyesight'),
    ('How quickly does a PRIORITY casualty have to be moved?',
     'should be evacuated within four hours'),
    ('What goes on line 3 of the 9-line?',
     'number of patients by precedence, reported using the brevity codes'),
    ('What temperature does red blood cell storage need?',
     'stored at one to six degrees Celsius in a monitored refrigerator'),
    ('How long can whole blood be kept before it expires?',
     'about twenty-one days in citrate phosphate dextrose'),
    ('What does MARCH stand for?',
     'Massive haemorrhage is controlled first'),
    ('Should I use whole blood or components?',
     'Whole blood is the preferred product for resuscitation'),
    ('Difference between Class VIIIa and Class VIIIb?',
     'Class VIIIb is blood and blood products'),
    ('What is a Role 3 facility able to do?',
     'Role 3 is theatre hospitalisation'),
    ('Why do we give calcium during a big transfusion?',
     'Citrate anticoagulant in stored blood binds ionised calcium'),
    ('How do I stop bleeding from the groin where a tourniquet will not fit?',
     'Junctional haemorrhage is bleeding at the groin'),
    ('What blood pressure should I resuscitate a head injury to?',
     'Permissive hypotension is contraindicated in traumatic brain injury'),
    ('The casualty is freezing and will not stop bleeding, what do I do?',
     'Prevent hypothermia in every casualty, in every climate'),
    ('What is the difference between MEDEVAC and CASEVAC?',
     'movement of casualties on a dedicated, standardised medical platform'),
    ('When do we send push packages instead of waiting for a requisition?',
     'Preconfigured push packages are standardised'),
    ('Who decides how long a casualty stays in theatre before being flown out?',
     'maximum number of days a casualty may be held in theatre'),
    ('Can I take a tourniquet off after four hours?',
     'Consider converting a tourniquet to a haemostatic or pressure dressing'),
    ('How long does a blood transport container hold temperature?',
     'validated for extended duration, commonly in the region of three days'),
    ('What does expectant mean when we triage?',
     'they receive comfort care and are reassessed if resources change'),
    ('What is the Golden Hour policy?',
     'moved to a surgical capability within sixty minutes'),
    ('Where does the term golden hour actually come from?',
     'R Adams Cowley'),
    ('Can a drone carry a wounded soldier out?',
     'they do not carry casualties rearward under approved doctrine'),
]


# ===========================================================================
#  MODEL
# ===========================================================================

class SentenceEncoder(nn.Module):
    """all-MiniLM-L6-v2 with the pooling and the normalisation moved inside
    the graph.

    Sentence-transformers applies mean pooling over the token dimension,
    masked by the attention mask, and then L2-normalises. Both steps are
    ordinary tensor operations and both export cleanly, so there is no reason
    to reimplement them in JavaScript and every reason not to: a pooling bug
    is silent, it degrades retrieval by a few per cent, and it looks exactly
    like the model being mediocre. Exported this way the browser cannot get
    it wrong, because the browser does not do it."""

    def __init__(self, bert):
        super().__init__()
        self.bert = bert

    def forward(self, input_ids, attention_mask):
        tok = self.bert(
            input_ids=input_ids,
            attention_mask=attention_mask,
            token_type_ids=torch.zeros_like(input_ids),
        ).last_hidden_state                                  # [B, T, 384]
        m = attention_mask.unsqueeze(-1).to(tok.dtype)       # [B, T, 1]
        summed = (tok * m).sum(dim=1)
        counts = m.sum(dim=1).clamp(min=1e-9)
        return F.normalize(summed / counts, p=2.0, dim=1)


def build_model():
    from transformers import BertModel, BertConfig
    from safetensors.torch import load_file

    cfg = BertConfig.from_dict(json.load(open(SRC / 'config.json')))
    bert = BertModel(cfg, add_pooling_layer=False)

    # The checkpoint is fp16 and carries two tensors the pooling-free model
    # does not want: the registered position_ids buffer (regenerated by
    # construction) and the pooler, which sentence-transformers never uses.
    sd = load_file(str(SRC / 'model.fp16.safetensors'))
    sd = {k: v.float() for k, v in sd.items()
          if not k.endswith('position_ids') and not k.startswith('pooler.')}
    missing, unexpected = bert.load_state_dict(sd, strict=False)
    assert not missing and not unexpected, (missing, unexpected)

    model = SentenceEncoder(bert).eval()
    n = sum(p.numel() for p in model.parameters())
    print(f'  loaded {n:,} parameters')
    return model, n


def load_tokeniser():
    from tokenizers import Tokenizer
    tk = Tokenizer.from_file(str(SRC / 'tokenizer.json'))
    tk.no_padding()
    tk.enable_truncation(max_length=256)
    return tk


def encode_batch(tk, texts):
    encs = tk.encode_batch(texts)
    L = max(len(e.ids) for e in encs)
    ids = torch.zeros(len(encs), L, dtype=torch.long)
    am = torch.zeros(len(encs), L, dtype=torch.long)
    for i, e in enumerate(encs):
        ids[i, :len(e.ids)] = torch.tensor(e.ids, dtype=torch.long)
        am[i, :len(e.ids)] = 1
    return ids, am


def embed_torch(model, tk, texts, bs=32):
    out = []
    for i in range(0, len(texts), bs):
        ids, am = encode_batch(tk, texts[i:i + bs])
        with torch.no_grad():
            out.append(model(ids, am).numpy())
    return np.concatenate(out, 0).astype(np.float32)


def embed_onnx(sess, tk, texts, bs=32):
    out = []
    for i in range(0, len(texts), bs):
        ids, am = encode_batch(tk, texts[i:i + bs])
        out.append(sess.run(None, {'input_ids': ids.numpy(),
                                   'attention_mask': am.numpy()})[0])
    return np.concatenate(out, 0).astype(np.float32)


# ===========================================================================
#  SENTENCE SEGMENTATION
# ===========================================================================
#
# Sentence spans are computed here and shipped as character offsets, so the
# browser never splits anything. That is not laziness: a sentence splitter
# that disagrees between the two languages produces highlight ranges that sit
# one word off the quotation, which is the single most visible way this
# feature could embarrass itself in front of an audience that cares about
# exact quotation.

def split_sentences(text):
    """Return [(start, end)] character spans. The corpus is written in plain
    declarative prose with no abbreviations that end in a full stop, so a
    terminator followed by whitespace and a capital is sufficient and, more
    importantly, verifiable by reading the output."""
    spans = []
    start = 0
    i = 0
    n = len(text)
    while i < n:
        c = text[i]
        if c in '.?!':
            j = i + 1
            while j < n and text[j] in '"\')]':
                j += 1
            if j >= n:
                spans.append((start, n))
                start = n
                break
            if text[j] == ' ' and j + 1 < n and (text[j + 1].isupper() or text[j + 1].isdigit()):
                spans.append((start, j))
                start = j + 1
                i = j
        i += 1
    if start < n:
        spans.append((start, n))
    # Fold anything too short to stand as a quotation into its neighbour.
    merged = []
    for s, e in spans:
        if merged and len(text[s:e].split()) < 4:
            merged[-1] = (merged[-1][0], e)
        else:
            merged.append((s, e))
    return merged


# ===========================================================================
#  EMBEDDING QUANTISATION
# ===========================================================================

def quantise_vectors(V):
    """Symmetric int8 with one float32 scale per vector.

    The vectors are already unit length, so a single global scale would work,
    but a per-vector scale costs four bytes and removes the question. What
    matters is measured below: whether the ranking produced from the
    quantised vectors is the same ranking produced from the float32 ones."""
    scale = np.abs(V).max(axis=1) / 127.0
    scale = np.maximum(scale, 1e-12).astype(np.float32)
    Q = np.rint(V / scale[:, None]).clip(-127, 127).astype(np.int8)
    return Q, scale


def dequantise(Q, scale):
    V = Q.astype(np.float32) * scale[:, None]
    return V / np.maximum(np.linalg.norm(V, axis=1, keepdims=True), 1e-12)


def b64(arr):
    import base64
    return base64.b64encode(arr.tobytes()).decode('ascii')


# ===========================================================================
#  MAIN
# ===========================================================================

PAIRS = [
    ('apply a tourniquet to the thigh', 'a windlass tourniquet high on the leg'),
    ('give tranexamic acid within three hours', 'TXA must be administered early after wounding'),
    ('urgent evacuation within one hour', 'the casualty must be moved as soon as possible'),
    ('store red cells between one and six degrees', 'refrigerated blood storage temperature'),
    ('the aircraft returned to the forward arming point', 'refuelling and rearming operations'),
    ('whole blood is preferred to components', 'component therapy in balanced ratio'),
    ('prevent hypothermia in a bleeding casualty', 'keep the wounded soldier warm'),
    ('nine line medevac request format', 'how to call for a medical evacuation'),
    ('class VIII medical supply', 'ammunition resupply convoy'),
    ('needle decompression for tension pneumothorax', 'chest injury with respiratory distress'),
    ('the quartermaster signed for the vehicles', 'a tourniquet stops arterial bleeding'),
    ('role 3 combat support hospital', 'theatre hospitalisation with surgery and intensive care'),
]


def main():
    OUT_MODEL.mkdir(parents=True, exist_ok=True)
    OUT_DATA.mkdir(parents=True, exist_ok=True)
    report = {}

    print('[1/6] building the model from local safetensors')
    model, nparam = build_model()
    tk = load_tokeniser()

    # ---------------------------------------------------------------- export
    print('[2/6] exporting to ONNX')
    f32 = OUT_MODEL / '_minilm.fp32.onnx'
    ids, am = encode_batch(tk, ['a tourniquet controls extremity haemorrhage',
                                'evacuate within one hour'])
    torch.onnx.export(
        model, (ids, am), str(f32),
        input_names=['input_ids', 'attention_mask'],
        output_names=['embedding'],
        dynamic_axes={'input_ids': {0: 'batch', 1: 'seq'},
                      'attention_mask': {0: 'batch', 1: 'seq'},
                      'embedding': {0: 'batch'}},
        opset_version=14, do_constant_folding=True, dynamo=False)
    fp32_bytes = f32.stat().st_size
    print(f'  fp32 ONNX {fp32_bytes/1e6:.1f} MB')

    # ------------------------------------------------------------ quantise
    print('[3/6] dynamic int8 quantisation')
    from onnxruntime.quantization import quantize_dynamic, QuantType
    q8 = OUT_MODEL / 'minilm.onnx'
    quantize_dynamic(str(f32), str(q8), weight_type=QuantType.QUInt8,
                     extra_options={'MatMulConstBOnly': True})
    int8_bytes = q8.stat().st_size
    print(f'  int8 ONNX {int8_bytes/1e6:.1f} MB '
          f'({100*int8_bytes/fp32_bytes:.0f}% of fp32)')

    import onnxruntime as ort
    so = ort.SessionOptions()
    so.log_severity_level = 3
    s32 = ort.InferenceSession(str(f32), so, providers=['CPUExecutionProvider'])
    s8 = ort.InferenceSession(str(q8), so, providers=['CPUExecutionProvider'])

    # Does the JavaScript-side model still agree with the reference? Measured
    # three ways: torch vs fp32 ONNX (should be exact to float noise), fp32
    # vs int8 (the quantisation cost), and — the one that actually matters —
    # whether the SIMILARITY between sentence pairs survives quantisation.
    probe = [t for p in PAIRS for t in p] + [c['text'] for c in CORPUS[:40]]
    Vt = embed_torch(model, tk, probe)
    V32 = embed_onnx(s32, tk, probe)
    V8 = embed_onnx(s8, tk, probe)

    def cosrow(A, B):
        return (A * B).sum(1)

    report['torch_vs_onnx_fp32_min_cos'] = float(cosrow(Vt, V32).min())
    report['onnx_fp32_vs_int8_min_cos'] = float(cosrow(V32, V8).min())
    report['onnx_fp32_vs_int8_mean_cos'] = float(cosrow(V32, V8).mean())

    d32 = np.array([float(V32[2 * i] @ V32[2 * i + 1]) for i in range(len(PAIRS))])
    d8 = np.array([float(V8[2 * i] @ V8[2 * i + 1]) for i in range(len(PAIRS))])
    report['pair_similarity_max_abs_delta'] = float(np.abs(d32 - d8).max())
    report['pair_similarity_mean_abs_delta'] = float(np.abs(d32 - d8).mean())
    print(f'  torch vs fp32 ONNX   min cos {report["torch_vs_onnx_fp32_min_cos"]:.6f}')
    print(f'  fp32 vs int8 ONNX    min cos {report["onnx_fp32_vs_int8_min_cos"]:.6f}'
          f'  mean {report["onnx_fp32_vs_int8_mean_cos"]:.6f}')
    print(f'  pair similarity      max |delta| '
          f'{report["pair_similarity_max_abs_delta"]:.4f}')
    for (a, b), x, y in zip(PAIRS, d32, d8):
        print(f'    {x:+.4f} -> {y:+.4f}   {a[:38]:38s} | {b[:38]}')

    # ------------------------------------------------------------ tokeniser
    print('[4/6] writing the tokeniser')
    tokjson = json.load(open(SRC / 'tokenizer.json'))
    vocab = tokjson['model']['vocab']
    pieces = [None] * len(vocab)
    for tok, idx in vocab.items():
        pieces[idx] = tok
    assert all(p is not None for p in pieces)
    (OUT_MODEL / 'vocab.txt').write_text('\n'.join(pieces), encoding='utf-8')
    norm = tokjson['normalizer']
    tokcfg = {
        'lowercase': bool(norm.get('lowercase', True)),
        # BertNormalizer treats strip_accents=null as "follow lowercase".
        'stripAccents': bool(norm.get('strip_accents')
                             if norm.get('strip_accents') is not None
                             else norm.get('lowercase', True)),
        'handleChineseChars': bool(norm.get('handle_chinese_chars', True)),
        'continuingSubwordPrefix': tokjson['model'].get('continuing_subword_prefix', '##'),
        'maxInputCharsPerWord': tokjson['model'].get('max_input_chars_per_word', 100),
        'unkToken': tokjson['model'].get('unk_token', '[UNK]'),
        'clsToken': '[CLS]', 'sepToken': '[SEP]', 'padToken': '[PAD]',
        'maxLen': 256, 'vocabSize': len(pieces), 'hidden': 384,
    }
    (OUT_MODEL / 'tokenizer.json').write_text(json.dumps(tokcfg, indent=1))

    # ----------------------------------------------------------- the corpus
    print('[5/6] embedding the corpus')
    prefix = {}
    for c in CORPUS:
        p = ''.join(w[0] for w in c['pub'].split()[:2] if w[0].isalnum()).upper()[:3]
        prefix[c['pub']] = p
    seen = {}
    for c in CORPUS:
        p = prefix[c['pub']]
        seen[p] = seen.get(p, 0) + 1
        c['id'] = f'{p}-{seen[p]:03d}'
        c['sent'] = split_sentences(c['text'])
        c['words'] = len(c['text'].split())

    ptexts = [c['text'] for c in CORPUS]
    stexts, sowner = [], []
    for i, c in enumerate(CORPUS):
        for (a, b) in c['sent']:
            stexts.append(c['text'][a:b])
            sowner.append(i)

    t0 = time.time()
    PV = embed_onnx(s8, tk, ptexts)
    SV = embed_onnx(s8, tk, stexts)
    print(f'  {len(ptexts)} passages, {len(stexts)} sentences, '
          f'{time.time()-t0:.1f} s')

    PQ, Psc = quantise_vectors(PV)
    SQ, Ssc = quantise_vectors(SV)
    PVq, SVq = dequantise(PQ, Psc), dequantise(SQ, Ssc)
    report['passage_quant_min_cos'] = float((PV * PVq).sum(1).min())
    report['sentence_quant_min_cos'] = float((SV * SVq).sum(1).min())
    print(f'  int8 vector fidelity: passages min cos '
          f'{report["passage_quant_min_cos"]:.6f}, sentences min cos '
          f'{report["sentence_quant_min_cos"]:.6f}')

    # ------------------------------------------------------------ the eval
    print('[6/6] retrieval evaluation')
    want = []
    for q, sub in EVAL:
        hits = [i for i, c in enumerate(CORPUS) if sub in c['text']]
        assert len(hits) == 1, f'eval anchor matched {len(hits)}: {sub!r}'
        want.append(hits[0])
    QV8 = embed_onnx(s8, tk, [q for q, _ in EVAL])
    QV = QV8

    def score(V):
        s = QV @ V.T
        order = np.argsort(-s, axis=1)
        t1 = sum(int(order[i, 0] == want[i]) for i in range(len(EVAL)))
        t5 = sum(int(want[i] in order[i, :5]) for i in range(len(EVAL)))
        return t1, t5, order, s

    n = len(EVAL)

    # Three configurations, so that the cost of each compression step is
    # visible separately: the reference model at full precision, the shipped
    # int8 model with full-precision vectors, and what actually ships.
    PV32 = embed_onnx(s32, tk, ptexts)
    QV32 = embed_onnx(s32, tk, [q for q, _ in EVAL])
    QV = QV32
    t1a, t5a, _, _ = score(PV32)
    QV = QV8
    t1f, t5f, _, _ = score(PV)
    t1q, t5q, order, sim = score(PVq)
    report['eval_n'] = n
    report['eval_top1'] = t1q
    report['eval_top5'] = t5q
    report['eval_top1_fp32_model'] = t1a
    report['eval_top5_fp32_model'] = t5a
    report['eval_top1_int8_model_fp32_vectors'] = t1f
    report['eval_top5_int8_model_fp32_vectors'] = t5f
    print(f'  fp32 model, fp32 vectors: top-1 {t1a}/{n}  top-5 {t5a}/{n}')
    print(f'  int8 model, fp32 vectors: top-1 {t1f}/{n}  top-5 {t5f}/{n}')
    print(f'  int8 model, int8 vectors: top-1 {t1q}/{n}  top-5 {t5q}/{n}   <- shipped')
    misses = []
    for i, (q, _) in enumerate(EVAL):
        got, exp = order[i, 0], want[i]
        rank = int(np.where(order[i] == exp)[0][0]) + 1
        flag = 'ok  ' if got == exp else ('top5' if rank <= 5 else 'MISS')
        print(f'  {flag} r{rank:<3d} {sim[i, got]:.3f}  {q}')
        if got != exp:
            print(f'         wanted {CORPUS[exp]["id"]} {CORPUS[exp]["section"]}'
                  f' | got {CORPUS[got]["id"]} {CORPUS[got]["section"]}')
            misses.append({'q': q, 'rank': rank,
                           'wanted': CORPUS[exp]['id'], 'got': CORPUS[got]['id']})
    report['eval_misses'] = misses

    # ------------------------------------------------------------- write out
    f32.unlink()
    pubs = []
    for c in CORPUS:
        if c['pub'] not in pubs:
            pubs.append(c['pub'])

    doc = {
        'note': DISCLAIMER,
        'built': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'model': 'all-MiniLM-L6-v2 (Apache-2.0), int8 ONNX, mean-pooled and '
                 'L2-normalised in-graph',
        'dim': int(PV.shape[1]),
        'publications': pubs,
        'passages': [{'id': c['id'], 'pub': c['pub'], 'section': c['section'],
                      'tags': c['tags'], 'text': c['text'],
                      'sent': [[a, b] for a, b in c['sent']]} for c in CORPUS],
        'sentOwner': sowner,
        'pv': {'q': b64(PQ), 's': b64(Psc)},
        'sv': {'q': b64(SQ), 's': b64(Ssc)},
        'eval': {'n': n, 'top1': t1q, 'top5': t5q,
                 'questions': [{'q': q, 'want': CORPUS[want[i]]['id']}
                               for i, (q, _) in enumerate(EVAL)],
                 'misses': misses},
    }
    path = OUT_DATA / 'doctrine.json'
    path.write_text(json.dumps(doc, separators=(',', ':')))

    meta = {
        'model': 'all-MiniLM-L6-v2',
        'licence': 'Apache-2.0',
        'source': 'npm @lat.md/embed-minilm-fp16 (fp16 safetensors + tokenizer); '
                  'huggingface.co is unreachable from the build sandbox',
        'parameters': int(nparam),
        'opset': 14,
        'dim': 384,
        'onnx_fp32_bytes': int(fp32_bytes),
        'onnx_int8_bytes': int(int8_bytes),
        'vocab_bytes': (OUT_MODEL / 'vocab.txt').stat().st_size,
        'corpus_bytes': path.stat().st_size,
        'passages': len(CORPUS),
        'sentences': len(stexts),
        'quality': report,
        'disclaimer': DISCLAIMER,
    }
    (OUT_MODEL / 'meta.json').write_text(json.dumps(meta, indent=1))

    total = int8_bytes + meta['vocab_bytes'] + meta['corpus_bytes']
    print(f'\n  model {int8_bytes/1e6:.2f} MB + vocab '
          f'{meta["vocab_bytes"]/1e3:.0f} KB + corpus '
          f'{meta["corpus_bytes"]/1e6:.2f} MB  =  {total/1e6:.2f} MB shipped')


if __name__ == '__main__':
    main()
