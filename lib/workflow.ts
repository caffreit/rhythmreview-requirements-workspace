import {
  QualityFindingSchema,
  ExtractionRunSchema,
  DraftRunSchema,
  SourceTraceSchema,
  DerivationLinkSchema,
  type Actor,
  type CandidateAction,
  type FindingAction,
  type RequirementAction,
  type WorkspaceState,
  type WorkflowAction,
} from "./domain";
import {
  canonicalStatements,
  createInitialState,
  draftRequirements,
  materializeTiming,
  replayCandidates,
} from "./seed";

const ALEX: Actor = "Alex Morgan · Product and systems author";
const JAMIE: Actor = "Jamie Chen · QA reviewer";

function clone(state: WorkspaceState): WorkspaceState {
  return structuredClone(state);
}
function stamp(): string {
  return new Date().toISOString();
}
function audit(
  state: WorkspaceState,
  action: string,
  actor: string,
  entityId: string,
  detail: string,
): void {
  state.audit.unshift({
    id: `AUD-${crypto.randomUUID()}`,
    action,
    actor,
    entityId,
    detail,
    createdAt: stamp(),
  });
}
function requireAuthor(actor: Actor): void {
  if (actor !== ALEX)
    throw new Error("Switch to Alex Morgan to perform this author action.");
}
function requireQa(actor: Actor): void {
  if (actor !== JAMIE)
    throw new Error("Switch to Jamie Chen to perform this QA action.");
}

function rebuildTraceLinks(state: WorkspaceState): void {
  state.sourceTraces = state.requirements.flatMap((requirement) =>
    requirement.sourcePassageIds.map((sourcePassageId) =>
      SourceTraceSchema.parse({
        requirementId: requirement.id,
        sourcePassageId,
      }),
    ),
  );
  const reviewedCandidates = state.candidates.filter(
    (candidate) =>
      candidate.decision.kind === "accepted" ||
      candidate.decision.kind === "edited",
  );
  state.derivationLinks = state.requirements.flatMap((requirement) =>
    reviewedCandidates
      .filter((candidate) =>
        candidate.sourcePassageIds.some((id) =>
          requirement.sourcePassageIds.includes(id),
        ),
      )
      .map((candidate) =>
        DerivationLinkSchema.parse({
          requirementId: requirement.id,
          candidateId: candidate.id,
        }),
      ),
  );
}

function refreshCandidateStage(state: WorkspaceState): void {
  const finished =
    state.candidates.length > 0 &&
    state.candidates.every(
      (candidate) => candidate.decision.kind !== "pending",
    );
  const ageResolved = state.decisions.some(
    (decision) => decision.id === "HD-AGE",
  );
  const retentionDeferred =
    state.candidates.find((candidate) => candidate.id === "DC-012")?.decision
      .kind === "deferred";
  if (finished && ageResolved && retentionDeferred)
    state.workflow = "ready_to_draft";
}

export function loadReplayExtraction(input: WorkspaceState): WorkspaceState {
  if (
    input.workflow !== "source_review" &&
    input.workflow !== "candidate_review"
  )
    throw new Error("Extraction can only start during source review.");
  const state = clone(input);
  state.candidates = structuredClone(replayCandidates);
  state.extractionMode = "replay";
  state.extractionRuns.push(
    ExtractionRunSchema.parse({
      id: `EXR-${String(state.extractionRuns.length + 1).padStart(3, "0")}`,
      mode: "replay",
      candidateIds: state.candidates.map((candidate) => candidate.id),
      createdAt: stamp(),
    }),
  );
  state.workflow = "candidate_review";
  state.revision += 1;
  audit(
    state,
    "extraction_loaded",
    "Saved AI replay",
    "PROJECT-RR",
    `Loaded ${state.candidates.length} source-linked discovery candidates. No OpenAI call was made.`,
  );
  return state;
}

export function loadLiveExtraction(
  input: WorkspaceState,
  candidates: WorkspaceState["candidates"],
): WorkspaceState {
  if (
    input.workflow !== "source_review" &&
    input.workflow !== "candidate_review"
  )
    throw new Error("Extraction can only start during source review.");
  const state = clone(input);
  state.candidates = candidates;
  state.extractionMode = "live";
  state.extractionRuns.push(
    ExtractionRunSchema.parse({
      id: `EXR-${String(state.extractionRuns.length + 1).padStart(3, "0")}`,
      mode: "live",
      candidateIds: state.candidates.map((candidate) => candidate.id),
      createdAt: stamp(),
    }),
  );
  state.workflow = "candidate_review";
  state.revision += 1;
  audit(
    state,
    "extraction_completed",
    "OpenAI",
    "PROJECT-RR",
    `Created ${candidates.length} live source-linked discovery candidates for human review.`,
  );
  return state;
}

export function decideCandidate(
  input: WorkspaceState,
  id: string,
  action: CandidateAction,
): WorkspaceState {
  requireAuthor(action.actor);
  if (input.workflow !== "candidate_review")
    throw new Error(
      "Discovery decisions are closed in the current workflow state.",
    );
  const state = clone(input);
  const candidate = state.candidates.find((entry) => entry.id === id);
  if (!candidate) throw new Error("Discovery candidate not found.");
  const decidedAt = stamp();
  if (action.operation === "accept")
    candidate.decision = {
      kind: "accepted",
      actor: action.actor,
      reason: action.reason,
      decidedAt,
    };
  if (action.operation === "edit") {
    candidate.currentText = action.text;
    candidate.decision = {
      kind: "edited",
      actor: action.actor,
      reason: action.reason,
      editedText: action.text,
      decidedAt,
    };
  }
  if (action.operation === "reject")
    candidate.decision = {
      kind: "rejected",
      actor: action.actor,
      reason: action.reason,
      decidedAt,
    };
  if (action.operation === "defer")
    candidate.decision = {
      kind: "deferred",
      actor: action.actor,
      reason: action.reason,
      owner: action.owner,
      decidedAt,
    };
  if (action.operation === "merge")
    candidate.decision = {
      kind: "merged",
      actor: action.actor,
      reason: action.reason,
      targetId: action.targetId,
      decidedAt,
    };
  if (action.operation === "split")
    candidate.decision = {
      kind: "split",
      actor: action.actor,
      reason: action.reason,
      parts: action.parts,
      decidedAt,
    };
  state.revision += 1;
  audit(
    state,
    `candidate_${action.operation}`,
    action.actor,
    candidate.id,
    action.reason,
  );
  refreshCandidateStage(state);
  return state;
}

export function resolveProjectDecision(
  input: WorkspaceState,
  kind: "age" | "retention",
  actor: Actor,
): WorkspaceState {
  requireAuthor(actor);
  if (input.workflow !== "candidate_review")
    throw new Error(
      "Project questions can only be resolved during discovery review.",
    );
  const state = clone(input);
  const createdAt = stamp();
  if (kind === "age") {
    state.decisions = state.decisions.filter(
      (decision) => decision.id !== "HD-AGE",
    );
    state.decisions.push({
      id: "HD-AGE",
      question: "What lower age defines the intended adult population?",
      answer: "Patients aged 22 and over.",
      rationale:
        "Human project decision for the fictional demonstration. The AI did not select this threshold.",
      actor,
      createdAt,
    });
    const candidate = state.candidates.find((entry) => entry.id === "DC-003");
    if (candidate)
      candidate.decision = {
        kind: "accepted",
        actor,
        reason: "Resolved by human project decision HD-AGE.",
        decidedAt: createdAt,
      };
    audit(
      state,
      "decision_recorded",
      actor,
      "HD-AGE",
      "Set the fictional lower age boundary to 22 years.",
    );
  } else {
    state.decisions = state.decisions.filter(
      (decision) => decision.id !== "HD-RETENTION",
    );
    state.decisions.push({
      id: "HD-RETENTION",
      question: "What clinical retention period controls deletion?",
      answer: "Deferred to the organisation’s approved configuration.",
      rationale:
        "The source does not supply an approved duration, so the demo records the gap instead of inventing a number.",
      actor,
      createdAt,
    });
    const candidate = state.candidates.find((entry) => entry.id === "DC-012");
    if (candidate)
      candidate.decision = {
        kind: "deferred",
        actor,
        reason: "No approved duration appears in the supplied evidence.",
        owner: "Privacy and clinical governance",
        decidedAt: createdAt,
      };
    audit(
      state,
      "question_deferred",
      actor,
      "HD-RETENTION",
      "Deferred the retention duration to privacy and clinical governance.",
    );
  }
  state.revision += 1;
  refreshCandidateStage(state);
  return state;
}

export function completeReplayReview(
  input: WorkspaceState,
  actor: Actor,
): WorkspaceState {
  requireAuthor(actor);
  if (input.workflow !== "candidate_review")
    throw new Error("The saved review helper is unavailable now.");
  const state = clone(input);
  const decidedAt = stamp();
  for (const candidate of state.candidates) {
    if (candidate.decision.kind !== "pending") continue;
    if (candidate.id === "DC-004")
      candidate.decision = {
        kind: "rejected",
        actor,
        reason: "Conflicts with the approved decision-support role.",
        decidedAt,
      };
    else if (candidate.id === "DC-012")
      candidate.decision = {
        kind: "deferred",
        actor,
        reason: "No approved duration appears in the supplied evidence.",
        owner: "Privacy and clinical governance",
        decidedAt,
      };
    else if (candidate.id === "DC-006") {
      candidate.currentText =
        "Support a 30-second single-lead ECG, tolerance plus or minus one second, sampled from 250 Hz through 500 Hz.";
      candidate.decision = {
        kind: "edited",
        actor,
        reason:
          "Replaced the unsupported any-file claim with the engineering input envelope.",
        editedText: candidate.currentText,
        decidedAt,
      };
    } else
      candidate.decision = {
        kind: "accepted",
        actor,
        reason: "Confirmed against the cited fictional source.",
        decidedAt,
      };
  }
  if (!state.decisions.some((decision) => decision.id === "HD-AGE"))
    state.decisions.push({
      id: "HD-AGE",
      question: "What lower age defines the intended adult population?",
      answer: "Patients aged 22 and over.",
      rationale:
        "Human project decision for the fictional demonstration. The AI did not select this threshold.",
      actor,
      createdAt: decidedAt,
    });
  if (!state.decisions.some((decision) => decision.id === "HD-RETENTION"))
    state.decisions.push({
      id: "HD-RETENTION",
      question: "What clinical retention period controls deletion?",
      answer: "Deferred to the organisation’s approved configuration.",
      rationale: "The source does not supply an approved duration.",
      actor,
      createdAt: decidedAt,
    });
  state.revision += 1;
  audit(
    state,
    "guided_review_completed",
    actor,
    "PROJECT-RR",
    "Applied saved human decisions only to pending replay candidates.",
  );
  refreshCandidateStage(state);
  return state;
}

export function createDrafts(
  input: WorkspaceState,
  mode: "replay" | "live",
): WorkspaceState {
  if (input.workflow !== "ready_to_draft")
    throw new Error(
      "Finish the discovery review before drafting requirements.",
    );
  const state = clone(input);
  state.requirements = draftRequirements(
    mode === "live" ? "live_ai" : "replay_fixture",
  );
  const timingNeed = state.candidates.find(
    (candidate) => candidate.id === "DC-002",
  );
  if (timingNeed?.decision.kind === "edited") {
    const need = state.requirements.find((item) => item.id === "UN-004");
    if (need)
      need.versions.push({
        id: `UN-004-v0.2`,
        text: timingNeed.currentText,
        acceptanceCriterion: need.versions[0]?.acceptanceCriterion ?? "",
        actor: ALEX,
        origin: "human_edit",
        reason: "Carry the reviewed discovery wording into the user need.",
        createdAt: stamp(),
      });
  }
  state.draftMode = mode;
  state.draftRuns.push(
    DraftRunSchema.parse({
      id: `DRR-${String(state.draftRuns.length + 1).padStart(3, "0")}`,
      mode,
      requirementIds: state.requirements.map((requirement) => requirement.id),
      createdAt: stamp(),
    }),
  );
  rebuildTraceLinks(state);
  state.workflow = "authoring";
  state.revision += 1;
  audit(
    state,
    "requirements_drafted",
    mode === "live" ? "OpenAI" : "Saved AI replay",
    "PROJECT-RR",
    `Created ${state.requirements.length} structured drafts. The combined timing draft still requires a human split.`,
  );
  return state;
}

export function createLiveDrafts(
  input: WorkspaceState,
  drafts: Array<{
    id: string;
    text: string;
    acceptanceCriterion: string;
    rationale: string;
  }>,
): WorkspaceState {
  const state = createDrafts(input, "live");
  for (const draft of drafts) {
    const item = state.requirements.find((entry) => entry.id === draft.id);
    if (!item) continue;
    item.originalAiText = draft.text;
    item.rationale = draft.rationale;
    item.versions = [
      {
        id: `${item.id}-live-v0.1`,
        text: draft.text,
        acceptanceCriterion: draft.acceptanceCriterion,
        actor: "OpenAI",
        origin: "live_ai",
        reason: "Live structured draft from accepted discovery evidence.",
        createdAt: stamp(),
      },
    ];
  }
  return state;
}

export function updateRequirement(
  input: WorkspaceState,
  id: string,
  action: RequirementAction,
): WorkspaceState {
  requireAuthor(action.actor);
  if (input.workflow !== "authoring" && input.workflow !== "returned_to_author")
    throw new Error(
      "Requirement editing is closed in the current workflow state.",
    );
  const state = clone(input);
  const item = state.requirements.find((entry) => entry.id === id);
  if (!item) throw new Error("Requirement draft not found.");
  if (action.operation === "split_timing") {
    if (item.id !== "TMP-001")
      throw new Error(
        "Only the combined timing proposal uses this split action.",
      );
    item.status = "discarded";
    state.requirements.push(...materializeTiming());
    rebuildTraceLinks(state);
    audit(state, "requirement_split", action.actor, item.id, action.reason);
  } else if (action.operation === "save") {
    item.versions.push({
      id: `${item.id}-v0.${item.versions.length + 1}`,
      text: action.text,
      acceptanceCriterion: action.acceptanceCriterion,
      actor: action.actor,
      origin: "human_edit",
      reason: action.reason,
      createdAt: stamp(),
    });
    item.status = "proposed";
    audit(state, "requirement_edited", action.actor, item.id, action.reason);
  } else if (action.operation === "discard") {
    item.status = "discarded";
    audit(state, "requirement_discarded", action.actor, item.id, action.reason);
  } else {
    item.status = "proposed";
    audit(state, "requirement_restored", action.actor, item.id, action.reason);
  }
  state.findings = [];
  state.workflow = "authoring";
  state.revision += 1;
  return state;
}

export function applyCanonicalWording(
  input: WorkspaceState,
  id: string,
  actor: Actor,
): WorkspaceState {
  requireAuthor(actor);
  const item = input.requirements.find((entry) => entry.id === id);
  const text = canonicalStatements[id];
  if (!item || !text)
    throw new Error("No canonical wording exists for this item.");
  const acceptanceCriterion =
    item.versions[item.versions.length - 1]?.acceptanceCriterion ??
    "Confirm the stated behavior.";
  return updateRequirement(input, id, {
    operation: "save",
    actor,
    text,
    acceptanceCriterion,
    reason:
      "Human edit to make the requirement precise and align the handoff contract.",
  });
}

export function runQualityReview(
  input: WorkspaceState,
  actor: Actor,
): WorkspaceState {
  requireAuthor(actor);
  if (input.workflow !== "authoring" && input.workflow !== "returned_to_author")
    throw new Error("Quality review requires an editable candidate set.");
  const state = clone(input);
  const findings: WorkspaceState["findings"] = [];
  const active = state.requirements.filter(
    (item) => item.status !== "discarded",
  );
  const compound = active.find((item) => item.id === "TMP-001");
  if (compound)
    findings.push(
      QualityFindingSchema.parse({
        id: "QF-001",
        basis: "deterministic_check",
        severity: "high",
        title: "Compound timing requirement",
        detail:
          "Result timing and timeout behavior need separate identifiers and acceptance criteria.",
        itemIds: ["TMP-001"],
        disposition: { kind: "pending" },
      }),
    );
  for (const target of ["UN-004", "REQ-004"]) {
    const item = active.find((entry) => entry.id === target);
    const latest = item?.versions[item.versions.length - 1]?.text;
    if (item && latest !== canonicalStatements[target])
      findings.push(
        QualityFindingSchema.parse({
          id: target === "UN-004" ? "QF-002" : "QF-003",
          basis: "deterministic_check",
          severity: "high",
          title:
            target === "UN-004"
              ? "Workflow need remains imprecise"
              : "Timing boundary lacks its event",
          detail:
            target === "UN-004"
              ? "“Before the patient leaves” depends on local workflow and should describe the active review need."
              : "“Within 30 seconds” needs a defined start event and controlled result.",
          itemIds: [item.id],
          disposition: { kind: "pending" },
        }),
      );
  }
  findings.push(
    QualityFindingSchema.parse({
      id: "QF-004",
      basis: "deterministic_check",
      severity: "medium",
      title: "Retention duration remains a controlled configuration",
      detail:
        "The sources require deletion but do not supply an approved duration. REQ-015 correctly avoids inventing one. A reviewer must confirm the deferred owner.",
      itemIds: ["REQ-015"],
      disposition: { kind: "pending" },
    }),
  );
  findings.push(
    QualityFindingSchema.parse({
      id: "QF-006",
      basis: "ai_assisted_review",
      severity: "medium",
      title: "Timing evidence appears in multiple sources",
      detail:
        "The 30-second target appears in the clinical call, sponsor email, and engineering note. Confirm that these passages support one requirement rather than three duplicates.",
      itemIds: ["REQ-004"],
      disposition: { kind: "pending" },
    }),
  );
  findings.push(
    QualityFindingSchema.parse({
      id: "QF-005",
      basis: "ai_assisted_review",
      severity: "medium",
      title: "Diagnostic wording conflicts with the product role",
      detail:
        "SRC-002 asks for diagnosis while SRC-003 limits RhythmReview to clinician decision support. Confirm that rejecting DC-004 resolves the conflict.",
      itemIds: ["UN-003", "REQ-007", "REQ-014"],
      disposition: { kind: "pending" },
    }),
  );
  state.findings = findings;
  state.revision += 1;
  audit(
    state,
    "quality_review_run",
    actor,
    "PROJECT-RR",
    `Ran deterministic rules and loaded one labelled AI-assisted conflict suggestion. ${findings.length} findings require review.`,
  );
  return state;
}

export function disposeFinding(
  input: WorkspaceState,
  id: string,
  action: FindingAction,
): WorkspaceState {
  requireAuthor(action.actor);
  if (input.workflow !== "authoring" && input.workflow !== "returned_to_author")
    throw new Error("Finding review is closed now.");
  const state = clone(input);
  const finding = state.findings.find((entry) => entry.id === id);
  if (!finding) throw new Error("Quality finding not found.");
  finding.disposition = {
    kind: action.action,
    actor: action.actor,
    reason: action.reason,
    resolvedAt: stamp(),
  };
  state.revision += 1;
  audit(state, "finding_disposed", action.actor, id, action.reason);
  return state;
}

function validateSubmission(state: WorkspaceState): void {
  const active = state.requirements.filter(
    (item) => item.status !== "discarded",
  );
  if (active.length === 0)
    throw new Error("The candidate baseline has no requirements.");
  if (
    active.some(
      (item) =>
        item.sourcePassageIds.length === 0 && item.decisionIds.length === 0,
    )
  )
    throw new Error(
      "Every included item needs source or human-decision provenance.",
    );
  if (active.some((item) => item.type !== "user_need" && !item.parentNeedId))
    throw new Error(
      "Every system or software requirement needs a parent user need.",
    );
  if (active.some((item) => item.id === "TMP-001"))
    throw new Error("Split the compound timing draft before submission.");
  if (state.findings.length === 0)
    throw new Error("Run quality review before submission.");
  if (state.findings.some((finding) => finding.disposition.kind === "pending"))
    throw new Error("Record a human disposition for every quality finding.");
  if (
    state.findings.some(
      (finding) =>
        finding.severity === "high" && finding.disposition.kind !== "resolved",
    )
  )
    throw new Error("Resolve every high-severity deterministic finding.");
  const requiredIds = Object.keys(canonicalStatements);
  if (requiredIds.some((id) => !active.some((item) => item.id === id)))
    throw new Error(
      "The handoff baseline is missing a required RhythmReview item.",
    );
  for (const item of active) {
    const latest = item.versions[item.versions.length - 1]?.text;
    if (latest !== canonicalStatements[item.id])
      throw new Error(
        `${item.id} does not match the reviewed handoff wording.`,
      );
  }
}

export function advanceWorkflow(
  input: WorkspaceState,
  action: WorkflowAction,
): WorkspaceState {
  const state = clone(input);
  if (action.action === "submit") {
    requireAuthor(action.actor);
    if (
      state.workflow !== "authoring" &&
      state.workflow !== "returned_to_author"
    )
      throw new Error("Only an editable candidate can be submitted.");
    validateSubmission(state);
    state.requirements.forEach((item) => {
      if (item.status === "proposed") item.status = "submitted";
    });
    state.workflow = "qa_review";
    audit(
      state,
      "candidate_submitted",
      action.actor,
      "PROJECT-RR",
      "Submitted 24 source-linked items for separate QA approval.",
    );
  } else if (action.action === "return") {
    requireQa(action.actor);
    if (state.workflow !== "qa_review")
      throw new Error("Only a submitted candidate can be returned.");
    state.requirements.forEach((item) => {
      if (item.status === "submitted") item.status = "proposed";
    });
    state.workflow = "returned_to_author";
    audit(
      state,
      "candidate_returned",
      action.actor,
      "PROJECT-RR",
      action.reason,
    );
  } else {
    requireQa(action.actor);
    if (state.workflow !== "qa_review")
      throw new Error("Only a submitted candidate can be approved.");
    validateSubmission(state);
    const approvedAt = stamp();
    const approved = state.requirements
      .filter((item) => item.status === "submitted")
      .map((item) => ({ ...item, status: "approved" as const }))
      .sort(
        (left, right) =>
          Object.keys(canonicalStatements).indexOf(left.id) -
          Object.keys(canonicalStatements).indexOf(right.id),
      );
    state.requirements = state.requirements.map((item) =>
      item.status === "submitted"
        ? { ...item, status: "approved" as const }
        : item,
    );
    state.baseline = {
      id: "BL-RR-REQ-1.0",
      label: "RhythmReview requirements 1.0",
      approvedBy: action.actor,
      approvedAt,
      items: structuredClone(approved),
    };
    state.workflow = "approved";
    audit(
      state,
      "baseline_approved",
      action.actor,
      "BL-RR-REQ-1.0",
      "Approved the immutable 8-user-need and 16-requirement baseline.",
    );
  }
  state.revision += 1;
  return state;
}

export function resetWorkspace(): WorkspaceState {
  return createInitialState();
}
