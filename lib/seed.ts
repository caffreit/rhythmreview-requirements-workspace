import {
  DiscoveryCandidateSchema,
  RequirementItemSchema,
  SourceDocumentSchema,
  type RequirementItem,
  type WorkspaceState,
} from "./domain";

const REPLAY_TIME = "2026-09-09T09:00:00.000Z";
const ALEX = "Alex Morgan · Product and systems author" as const;

export const sources = SourceDocumentSchema.array().parse([
  {
    id: "SRC-001",
    type: "transcript",
    title: "Clinical discovery call",
    author: "Dr Niamh Kelly, cardiology lead",
    date: "2026-04-08",
    summary:
      "How clinicians would use RhythmReview during an active patient review.",
    passages: [
      {
        id: "SRC-001-P1",
        label: "12:14",
        text: "The useful moment is while the patient is still with us. A result after the consultation has much less value, so thirty seconds after upload feels like the upper limit.",
      },
      {
        id: "SRC-001-P2",
        label: "14:02",
        text: "We receive a short single-lead ECG from the clinic recorder. Staff should not need to reformat the signal before submitting it.",
      },
      {
        id: "SRC-001-P3",
        label: "17:31",
        text: "If the trace is too noisy, say that clearly. Do not force a rhythm result from an unreadable recording.",
      },
      {
        id: "SRC-001-P4",
        label: "21:05",
        text: "Possible AF must mean review this ECG. It cannot look like a diagnosis, and the clinician remains responsible for the decision.",
      },
    ],
  },
  {
    id: "SRC-002",
    type: "email",
    title: "Sponsor follow-up",
    author: "Maya Doyle, account lead",
    date: "2026-04-09",
    summary: "Commercial follow-up after the discovery call.",
    passages: [
      {
        id: "SRC-002-P1",
        label: "Opening request",
        text: "The hospital wants RhythmReview to diagnose atrial fibrillation from any ECG file and return a clear answer.",
      },
      {
        id: "SRC-002-P2",
        label: "Workflow target",
        text: "They repeated that the answer needs to appear within 30 seconds so it can be used before the patient leaves.",
      },
      {
        id: "SRC-002-P3",
        label: "Result wording",
        text: "The preferred outcomes are Possible AF, No AF detected, and Unreadable recording.",
      },
    ],
  },
  {
    id: "SRC-003",
    type: "meeting_notes",
    title: "Product definition workshop",
    author: "Alex Morgan, product and systems",
    date: "2026-04-12",
    summary:
      "Working agreement on product role, users, outputs, and exclusions.",
    passages: [
      {
        id: "SRC-003-P1",
        label: "Decision 1",
        text: "RhythmReview assists a qualified clinician. It does not diagnose, replace clinical judgement, or provide emergency assessment.",
      },
      {
        id: "SRC-003-P2",
        label: "Decision 2",
        text: "Only three controlled outcomes may reach the clinician: Possible AF, No AF detected, or Unreadable recording. The clinician acknowledges the result before closing review.",
      },
      {
        id: "SRC-003-P3",
        label: "Open item 3",
        text: "The target population is adults. The lower age boundary still needs a clinical and regulatory decision.",
      },
      {
        id: "SRC-003-P4",
        label: "Warning copy",
        text: "The upload screen must state that the product is not for emergencies or standalone diagnosis.",
      },
    ],
  },
  {
    id: "SRC-004",
    type: "technical_note",
    title: "Engineering feasibility review",
    author: "Leon Wu, software lead",
    date: "2026-04-15",
    summary:
      "Supported inputs, timing, failure handling, and released-model controls.",
    passages: [
      {
        id: "SRC-004-P1",
        label: "Input envelope",
        text: "Feasible input is a 30-second single-lead ECG, tolerance plus or minus one second, sampled from 250 Hz through 500 Hz. Other inputs must be rejected.",
      },
      {
        id: "SRC-004-P2",
        label: "Analysis behavior",
        text: "A released signal-quality threshold can route insufficient traces to Unreadable recording.",
      },
      {
        id: "SRC-004-P3",
        label: "Timing and recovery",
        text: "Display a result by 30 seconds. Stop at 35 seconds with a controlled failure message. Preserve the upload reference so a transient failure can be retried.",
      },
      {
        id: "SRC-004-P4",
        label: "Model control",
        text: "Production must run only the algorithm version identified in the approved release baseline. Internal confidence values must not appear as diagnostic probabilities.",
      },
    ],
  },
  {
    id: "SRC-005",
    type: "email",
    title: "QA and security kickoff",
    author: "Jamie Chen, quality assurance",
    date: "2026-04-17",
    summary: "Initial controls for access, transport, records, and retention.",
    passages: [
      {
        id: "SRC-005-P1",
        label: "Access and transport",
        text: "Only the clinician role may initiate analysis or view patient-linked results. ECG and result data must use the organisation’s approved encrypted protocol in transit.",
      },
      {
        id: "SRC-005-P2",
        label: "Accountable history",
        text: "Record the user, time, model version, input identifier, result, and acknowledgement so Quality can reconstruct an event.",
      },
      {
        id: "SRC-005-P3",
        label: "Open retention item",
        text: "Uploaded ECG payloads must be deleted after the clinical retention period. The approved duration has not been set yet.",
      },
    ],
  },
]);

export const replayCandidates = DiscoveryCandidateSchema.array().parse([
  {
    id: "DC-001",
    kind: "observed_fact",
    title: "Clinician remains the decision maker",
    originalText:
      "RhythmReview supports clinical review and does not make the diagnosis.",
    currentText:
      "RhythmReview supports clinical review and does not make the diagnosis.",
    sourcePassageIds: ["SRC-001-P4", "SRC-003-P1"],
    decision: { kind: "pending" },
  },
  {
    id: "DC-002",
    kind: "stakeholder_need",
    title: "Result during active review",
    originalText: "The clinician needs the result before the patient leaves.",
    currentText: "The clinician needs the result before the patient leaves.",
    sourcePassageIds: ["SRC-001-P1", "SRC-002-P2"],
    decision: { kind: "pending" },
  },
  {
    id: "DC-003",
    kind: "open_question",
    title: "Lower patient age",
    originalText: "What lower age defines the adult population?",
    currentText: "What lower age defines the adult population?",
    sourcePassageIds: ["SRC-003-P3"],
    decision: { kind: "pending" },
  },
  {
    id: "DC-004",
    kind: "contradiction",
    title: "Diagnostic claim conflicts with product role",
    originalText:
      "The sponsor asks the product to diagnose AF, while the workshop limits it to decision support.",
    currentText:
      "The sponsor asks the product to diagnose AF, while the workshop limits it to decision support.",
    sourcePassageIds: ["SRC-002-P1", "SRC-003-P1"],
    decision: { kind: "pending" },
  },
  {
    id: "DC-005",
    kind: "constraint",
    title: "Three controlled outcomes",
    originalText:
      "Only Possible AF, No AF detected, and Unreadable recording may be displayed.",
    currentText:
      "Only Possible AF, No AF detected, and Unreadable recording may be displayed.",
    sourcePassageIds: ["SRC-002-P3", "SRC-003-P2"],
    decision: { kind: "pending" },
  },
  {
    id: "DC-006",
    kind: "constraint",
    title: "Supported ECG input",
    originalText: "Support any single-lead ECG file.",
    currentText: "Support any single-lead ECG file.",
    sourcePassageIds: ["SRC-002-P1", "SRC-004-P1"],
    decision: { kind: "pending" },
  },
  {
    id: "DC-007",
    kind: "stakeholder_need",
    title: "Recognise unusable signals",
    originalText:
      "The clinician needs a clear unreadable result for insufficient signal quality.",
    currentText:
      "The clinician needs a clear unreadable result for insufficient signal quality.",
    sourcePassageIds: ["SRC-001-P3", "SRC-004-P2"],
    decision: { kind: "pending" },
  },
  {
    id: "DC-008",
    kind: "assumption",
    title: "Active-review connectivity",
    originalText:
      "The workflow assumes the upload and result can complete during the consultation.",
    currentText:
      "The workflow assumes the upload and result can complete during the consultation.",
    sourcePassageIds: ["SRC-001-P1"],
    decision: { kind: "pending" },
  },
  {
    id: "DC-009",
    kind: "stakeholder_need",
    title: "Visible limitations",
    originalText:
      "The clinician needs visible warnings for emergency and standalone diagnostic use.",
    currentText:
      "The clinician needs visible warnings for emergency and standalone diagnostic use.",
    sourcePassageIds: ["SRC-003-P1", "SRC-003-P4"],
    decision: { kind: "pending" },
  },
  {
    id: "DC-010",
    kind: "stakeholder_need",
    title: "Protect ECG data",
    originalText:
      "The organisation needs ECG and result data protected during transfer and storage.",
    currentText:
      "The organisation needs ECG and result data protected during transfer and storage.",
    sourcePassageIds: ["SRC-005-P1"],
    decision: { kind: "pending" },
  },
  {
    id: "DC-011",
    kind: "stakeholder_need",
    title: "Accountable history",
    originalText:
      "Quality staff need enough history to reconstruct an upload and result event.",
    currentText:
      "Quality staff need enough history to reconstruct an upload and result event.",
    sourcePassageIds: ["SRC-005-P2"],
    decision: { kind: "pending" },
  },
  {
    id: "DC-012",
    kind: "open_question",
    title: "Clinical retention period",
    originalText:
      "What approved duration controls deletion of uploaded ECG payloads?",
    currentText:
      "What approved duration controls deletion of uploaded ECG payloads?",
    sourcePassageIds: ["SRC-005-P3"],
    decision: { kind: "pending" },
  },
  {
    id: "DC-013",
    kind: "constraint",
    title: "Released algorithm only",
    originalText:
      "Production analysis uses only the algorithm version in the approved release baseline.",
    currentText:
      "Production analysis uses only the algorithm version in the approved release baseline.",
    sourcePassageIds: ["SRC-004-P4"],
    decision: { kind: "pending" },
  },
  {
    id: "DC-014",
    kind: "stakeholder_need",
    title: "Recover from transient failure",
    originalText:
      "The clinician needs a controlled retry without losing the upload reference.",
    currentText:
      "The clinician needs a controlled retry without losing the upload reference.",
    sourcePassageIds: ["SRC-004-P3"],
    decision: { kind: "pending" },
  },
  {
    id: "DC-015",
    kind: "constraint",
    title: "Delete ECG payload after the configured period",
    originalText:
      "Uploaded ECG payloads must be deleted after the organisation's configured clinical retention period.",
    currentText:
      "Uploaded ECG payloads must be deleted after the organisation's configured clinical retention period.",
    sourcePassageIds: ["SRC-005-P3"],
    decision: { kind: "pending" },
  },
]);

type RequirementSeed = {
  id: string;
  type:
    | "user_need"
    | "system_requirement"
    | "software_requirement"
    | "compound_draft";
  title: string;
  originalAiText: string;
  rationale: string;
  owner: string;
  parentNeedId: string | null;
  sourcePassageIds: string[];
  decisionIds: string[];
  acceptanceCriterion: string;
};
const requirementSeeds: RequirementSeed[] = [
  {
    id: "UN-001",
    type: "user_need",
    title: "Upload a short ECG",
    originalAiText:
      "The clinician needs to submit a short single-lead ECG without reformatting.",
    rationale: "Preserves the clinical upload workflow.",
    owner: "Product",
    parentNeedId: null,
    sourcePassageIds: ["SRC-001-P2", "SRC-004-P1"],
    decisionIds: [],
    acceptanceCriterion:
      "Representative clinicians can submit a supported recording without changing its signal format.",
  },
  {
    id: "UN-002",
    type: "user_need",
    title: "Recognise unusable signals",
    originalAiText:
      "The clinician needs a clear indication when signal quality is insufficient for analysis.",
    rationale:
      "Prevents an unusable trace from appearing to have a rhythm result.",
    owner: "Product",
    parentNeedId: null,
    sourcePassageIds: ["SRC-001-P3", "SRC-004-P2"],
    decisionIds: [],
    acceptanceCriterion:
      "Representative clinicians distinguish an unreadable recording from a rhythm result.",
  },
  {
    id: "UN-003",
    type: "user_need",
    title: "Interpret the result correctly",
    originalAiText:
      "The clinician needs result wording that makes professional review clear.",
    rationale: "Keeps the product in its decision-support role.",
    owner: "Product",
    parentNeedId: null,
    sourcePassageIds: ["SRC-001-P4", "SRC-003-P1"],
    decisionIds: [],
    acceptanceCriterion:
      "Representative clinicians understand that Possible AF requires professional review.",
  },
  {
    id: "UN-004",
    type: "user_need",
    title: "Receive a timely result",
    originalAiText: "The clinician needs the result before the patient leaves.",
    rationale: "Connects timing to the active clinical workflow.",
    owner: "Product",
    parentNeedId: null,
    sourcePassageIds: ["SRC-001-P1", "SRC-002-P2"],
    decisionIds: [],
    acceptanceCriterion:
      "Representative clinicians can use the result during the active review workflow.",
  },
  {
    id: "UN-005",
    type: "user_need",
    title: "Know the use limitations",
    originalAiText:
      "The clinician needs visible warnings that RhythmReview is not for emergencies or standalone diagnosis.",
    rationale: "Makes use limitations visible at the point of use.",
    owner: "Product",
    parentNeedId: null,
    sourcePassageIds: ["SRC-003-P1", "SRC-003-P4"],
    decisionIds: [],
    acceptanceCriterion:
      "Representative clinicians can identify both excluded uses.",
  },
  {
    id: "UN-006",
    type: "user_need",
    title: "Trust the analysed version",
    originalAiText:
      "The clinician needs the application to use only the released and validated algorithm version.",
    rationale: "Connects the clinical result to a released algorithm.",
    owner: "Product",
    parentNeedId: null,
    sourcePassageIds: ["SRC-004-P4"],
    decisionIds: [],
    acceptanceCriterion:
      "A released build identifies and uses only its approved algorithm version.",
  },
  {
    id: "UN-007",
    type: "user_need",
    title: "Protect ECG data",
    originalAiText:
      "The organisation needs ECG recordings and results protected during transfer and storage.",
    rationale: "Captures the organisation’s data-protection need.",
    owner: "Product",
    parentNeedId: null,
    sourcePassageIds: ["SRC-005-P1"],
    decisionIds: [],
    acceptanceCriterion:
      "The organisation confirms approved protection controls cover transfer and storage.",
  },
  {
    id: "UN-008",
    type: "user_need",
    title: "Review an accountable history",
    originalAiText:
      "Quality staff need an audit history of uploads, results, acknowledgements, and released versions.",
    rationale:
      "Supports reconstruction of product use and released configuration.",
    owner: "Product",
    parentNeedId: null,
    sourcePassageIds: ["SRC-005-P2"],
    decisionIds: [],
    acceptanceCriterion:
      "Quality staff can reconstruct a representative event from stored records.",
  },
  {
    id: "REQ-001",
    type: "system_requirement",
    title: "Supported recording duration",
    originalAiText:
      "The system shall accept a single-lead ECG recording with a duration of 30 seconds ± 1 second.",
    rationale: "Defines the supported duration envelope.",
    owner: "Engineering",
    parentNeedId: "UN-001",
    sourcePassageIds: ["SRC-004-P1"],
    decisionIds: [],
    acceptanceCriterion:
      "Accept 29 to 31 seconds inclusive; reject values outside the range.",
  },
  {
    id: "REQ-002",
    type: "system_requirement",
    title: "Supported sampling rate",
    originalAiText:
      "The system shall accept sampling rates from 250 Hz through 500 Hz and reject unsupported rates.",
    rationale: "Defines the supported sampling envelope.",
    owner: "Engineering",
    parentNeedId: "UN-001",
    sourcePassageIds: ["SRC-004-P1"],
    decisionIds: [],
    acceptanceCriterion:
      "Accept 250 Hz and 500 Hz boundaries; reject 249 Hz and 501 Hz.",
  },
  {
    id: "REQ-003",
    type: "software_requirement",
    title: "Signal quality gate",
    originalAiText:
      "The system shall classify a recording as Unreadable when the released signal-quality threshold is not met.",
    rationale: "Implements the unusable-signal outcome.",
    owner: "Engineering",
    parentNeedId: "UN-002",
    sourcePassageIds: ["SRC-001-P3", "SRC-004-P2"],
    decisionIds: [],
    acceptanceCriterion:
      "A recording below the released threshold returns Unreadable and no rhythm outcome.",
  },
  {
    id: "TMP-001",
    type: "compound_draft",
    title: "Analysis timing and timeout",
    originalAiText:
      "The system shall analyse a valid upload within 30 seconds and stop after 35 seconds with a controlled failure message.",
    rationale: "AI combined two independently verifiable timing behaviors.",
    owner: "Engineering",
    parentNeedId: "UN-004",
    sourcePassageIds: ["SRC-001-P1", "SRC-002-P2", "SRC-004-P3"],
    decisionIds: [],
    acceptanceCriterion: "Verify the result deadline and timeout behavior.",
  },
  {
    id: "REQ-006",
    type: "system_requirement",
    title: "Permitted result classes",
    originalAiText:
      "The system shall produce only Possible AF, No AF detected, or Unreadable recording.",
    rationale: "Limits released outputs to the agreed controlled set.",
    owner: "Engineering",
    parentNeedId: "UN-003",
    sourcePassageIds: ["SRC-002-P3", "SRC-003-P2"],
    decisionIds: [],
    acceptanceCriterion:
      "All released output cases map to exactly one permitted result.",
  },
  {
    id: "REQ-007",
    type: "software_requirement",
    title: "Possible AF display copy",
    originalAiText:
      "For a positive triage result, the interface shall display “Possible AF” and a clinician-review prompt.",
    rationale: "Keeps positive wording within the agreed product role.",
    owner: "Engineering",
    parentNeedId: "UN-003",
    sourcePassageIds: ["SRC-001-P4", "SRC-003-P1"],
    decisionIds: [],
    acceptanceCriterion:
      "The positive outcome displays both the controlled label and review prompt.",
  },
  {
    id: "REQ-008",
    type: "software_requirement",
    title: "Result acknowledgement",
    originalAiText:
      "The system shall require the clinician to acknowledge the result before closing the review.",
    rationale: "Records the user’s completion of result review.",
    owner: "Engineering",
    parentNeedId: "UN-003",
    sourcePassageIds: ["SRC-003-P2"],
    decisionIds: [],
    acceptanceCriterion:
      "The review cannot close until an acknowledgement event exists.",
  },
  {
    id: "REQ-009",
    type: "software_requirement",
    title: "Emergency-use warning",
    originalAiText:
      "The upload screen shall state that RhythmReview is not intended for emergency assessment.",
    rationale: "Places the limitation before analysis begins.",
    owner: "Engineering",
    parentNeedId: "UN-005",
    sourcePassageIds: ["SRC-003-P4"],
    decisionIds: [],
    acceptanceCriterion:
      "The warning is visible on every supported upload entry path.",
  },
  {
    id: "REQ-010",
    type: "system_requirement",
    title: "Audit event capture",
    originalAiText:
      "The system shall record the user, timestamp, model version, input identifier, result, and acknowledgement event.",
    rationale: "Defines the minimum reconstructable event record.",
    owner: "Engineering",
    parentNeedId: "UN-008",
    sourcePassageIds: ["SRC-005-P2"],
    decisionIds: [],
    acceptanceCriterion:
      "A completed analysis record contains every named field.",
  },
  {
    id: "REQ-011",
    type: "system_requirement",
    title: "Transport encryption",
    originalAiText:
      "The system shall protect ECG and result data in transit using the organisation’s approved encrypted protocol.",
    rationale: "Implements the agreed transport protection.",
    owner: "Engineering",
    parentNeedId: "UN-007",
    sourcePassageIds: ["SRC-005-P1"],
    decisionIds: [],
    acceptanceCriterion:
      "Transport tests show only the approved encrypted protocol is accepted.",
  },
  {
    id: "REQ-012",
    type: "software_requirement",
    title: "Role restriction",
    originalAiText:
      "Only users assigned the clinician role shall initiate ECG analysis or view patient-linked results.",
    rationale: "Limits patient-linked operations to the intended user role.",
    owner: "Engineering",
    parentNeedId: "UN-007",
    sourcePassageIds: ["SRC-005-P1"],
    decisionIds: [],
    acceptanceCriterion:
      "Non-clinician roles cannot initiate analysis or view patient-linked results.",
  },
  {
    id: "REQ-013",
    type: "system_requirement",
    title: "Locked model version",
    originalAiText:
      "Production analysis shall execute only the algorithm version identified in the approved release baseline.",
    rationale: "Connects production execution to configuration control.",
    owner: "Engineering",
    parentNeedId: "UN-006",
    sourcePassageIds: ["SRC-004-P4"],
    decisionIds: [],
    acceptanceCriterion:
      "A build refuses an algorithm version that differs from the release baseline.",
  },
  {
    id: "REQ-014",
    type: "software_requirement",
    title: "Internal confidence handling",
    originalAiText:
      "Internal confidence values shall not be presented as diagnostic probabilities to the clinician.",
    rationale: "Prevents internal values from changing the product claim.",
    owner: "Engineering",
    parentNeedId: "UN-003",
    sourcePassageIds: ["SRC-004-P4"],
    decisionIds: [],
    acceptanceCriterion:
      "No clinician-facing result view exposes internal confidence as a diagnostic probability.",
  },
  {
    id: "REQ-015",
    type: "system_requirement",
    title: "Recording retention",
    originalAiText:
      "The service shall delete uploaded ECG payloads after the configured clinical retention period expires.",
    rationale:
      "Captures deletion behavior without inventing the unresolved duration.",
    owner: "Engineering",
    parentNeedId: "UN-007",
    sourcePassageIds: ["SRC-005-P3"],
    decisionIds: ["HD-RETENTION"],
    acceptanceCriterion:
      "A configured retention period triggers deletion when it expires.",
  },
  {
    id: "REQ-016",
    type: "software_requirement",
    title: "Recoverable service failure",
    originalAiText:
      "The interface shall preserve the upload reference and permit a controlled retry after a transient service failure.",
    rationale: "Lets a clinician retry without silently losing context.",
    owner: "Engineering",
    parentNeedId: "UN-004",
    sourcePassageIds: ["SRC-004-P3"],
    decisionIds: [],
    acceptanceCriterion:
      "A simulated transient failure retains the reference and enables one controlled retry path.",
  },
];

export const timingRequirements: RequirementSeed[] = [
  {
    id: "REQ-004",
    type: "system_requirement",
    title: "Maximum analysis time",
    originalAiText: "The system shall return a result within 30 seconds.",
    rationale:
      "Turns the clinical timing need into a measurable system boundary.",
    owner: "Engineering",
    parentNeedId: "UN-004",
    sourcePassageIds: ["SRC-001-P1", "SRC-002-P2", "SRC-004-P3"],
    decisionIds: [],
    acceptanceCriterion:
      "A valid upload displays a controlled result at or before 30 seconds.",
  },
  {
    id: "REQ-005",
    type: "software_requirement",
    title: "Controlled timeout",
    originalAiText:
      "The system shall stop analysis and display a controlled failure message if no result is available after 35 seconds.",
    rationale:
      "Defines failure behavior separately from the target result time.",
    owner: "Engineering",
    parentNeedId: "UN-004",
    sourcePassageIds: ["SRC-004-P3"],
    decisionIds: [],
    acceptanceCriterion:
      "At 35 seconds without a result, analysis stops and the controlled failure message appears.",
  },
];

function materialize(
  seed: RequirementSeed,
  mode: "replay_fixture" | "live_ai" = "replay_fixture",
): RequirementItem {
  return RequirementItemSchema.parse({
    ...seed,
    status: "proposed",
    versions: [
      {
        id: `${seed.id}-v0.1`,
        text: seed.originalAiText,
        acceptanceCriterion: seed.acceptanceCriterion,
        actor: "Saved AI replay",
        origin: mode,
        reason: "Initial structured draft from accepted discovery evidence.",
        createdAt: REPLAY_TIME,
      },
    ],
  });
}

export function draftRequirements(
  mode: "replay_fixture" | "live_ai" = "replay_fixture",
): RequirementItem[] {
  return requirementSeeds.map((seed) => materialize(seed, mode));
}
export function materializeTiming(): RequirementItem[] {
  return timingRequirements.map((seed) => materialize(seed));
}

export function createInitialState(): WorkspaceState {
  return {
    workflow: "source_review",
    revision: 1,
    extractionMode: null,
    draftMode: null,
    sources,
    candidates: [],
    decisions: [],
    requirements: [],
    extractionRuns: [],
    draftRuns: [],
    sourceTraces: [],
    derivationLinks: [],
    findings: [],
    baseline: null,
    audit: [
      {
        id: "AUD-001",
        action: "workspace_seeded",
        actor: "System",
        detail: "Loaded five immutable fictional source records.",
        entityId: "PROJECT-RR",
        createdAt: REPLAY_TIME,
      },
    ],
  };
}

export const canonicalStatements: Record<string, string> = {
  "UN-001":
    "The clinician needs to submit a 30-second single-lead ECG without reformatting the signal.",
  "UN-002":
    "The clinician needs a clear indication when signal quality is insufficient for analysis.",
  "UN-003":
    "The clinician needs result wording that makes the need for professional review unambiguous.",
  "UN-004":
    "The clinician needs a result quickly enough to use during the active review workflow.",
  "UN-005":
    "The clinician needs visible warnings that RhythmReview is not for emergencies or standalone diagnosis.",
  "UN-006":
    "The clinician needs the application to use only the released and validated algorithm version.",
  "UN-007":
    "The organisation needs ECG recordings and results protected during transfer and storage.",
  "UN-008":
    "Quality staff need an audit history of uploads, results, acknowledgements, and released versions.",
  "REQ-001":
    "The system shall accept a single-lead ECG recording with a duration of 30 seconds ± 1 second.",
  "REQ-002":
    "The system shall accept sampling rates from 250 Hz through 500 Hz and reject unsupported rates.",
  "REQ-003":
    "The system shall classify a recording as Unreadable when the released signal-quality threshold is not met.",
  "REQ-004":
    "The system shall display a controlled result no later than 30 seconds after a valid upload completes.",
  "REQ-005":
    "The system shall stop analysis and display a controlled failure message if no result is available after 35 seconds.",
  "REQ-006":
    "The system shall produce only Possible AF, No AF detected, or Unreadable recording.",
  "REQ-007":
    "For a positive triage result, the interface shall display “Possible AF” and a clinician-review prompt.",
  "REQ-008":
    "The system shall require the clinician to acknowledge the result before closing the review.",
  "REQ-009":
    "The upload screen shall state that RhythmReview is not intended for emergency assessment.",
  "REQ-010":
    "The system shall record the user, timestamp, model version, input identifier, result, and acknowledgement event.",
  "REQ-011":
    "The system shall protect ECG and result data in transit using the organisation’s approved encrypted protocol.",
  "REQ-012":
    "Only users assigned the clinician role shall initiate ECG analysis or view patient-linked results.",
  "REQ-013":
    "Production analysis shall execute only the algorithm version identified in the approved release baseline.",
  "REQ-014":
    "Internal confidence values shall not be presented as diagnostic probabilities to the clinician.",
  "REQ-015":
    "The service shall delete uploaded ECG payloads after the configured clinical retention period expires.",
  "REQ-016":
    "The interface shall preserve the upload reference and permit a controlled retry after a transient service failure.",
};

export const AUTHOR = ALEX;
