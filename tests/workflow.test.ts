import { describe, expect, it } from "vitest";
import { CandidateActionSchema, WorkspaceStateSchema } from "../lib/domain";
import { canonicalStatements, createInitialState } from "../lib/seed";
import {
  advanceWorkflow,
  completeReplayReview,
  createDrafts,
  decideCandidate,
  disposeFinding,
  loadReplayExtraction,
  resolveProjectDecision,
  runQualityReview,
  updateRequirement,
  applyCanonicalWording,
} from "../lib/workflow";

const ALEX = "Alex Morgan · Product and systems author" as const;
const JAMIE = "Jamie Chen · QA reviewer" as const;

function reviewedDiscovery() {
  let state = loadReplayExtraction(createInitialState());
  state = decideCandidate(
    state,
    "DC-002",
    CandidateActionSchema.parse({
      operation: "edit",
      actor: ALEX,
      text: canonicalStatements["UN-004"],
      reason: "Replace a local workflow phrase with the underlying user need.",
    }),
  );
  state = decideCandidate(
    state,
    "DC-004",
    CandidateActionSchema.parse({
      operation: "reject",
      actor: ALEX,
      reason: "Diagnosis conflicts with the agreed decision-support role.",
    }),
  );
  state = resolveProjectDecision(state, "age", ALEX);
  state = resolveProjectDecision(state, "retention", ALEX);
  return completeReplayReview(state, ALEX);
}

function cleanCandidate() {
  let state = createDrafts(reviewedDiscovery(), "replay");
  state = updateRequirement(state, "TMP-001", {
    operation: "split_timing",
    actor: ALEX,
    reason: "Separate result timing from timeout handling.",
  });
  for (const id of Object.keys(canonicalStatements)) {
    state = applyCanonicalWording(state, id, ALEX);
  }
  state = runQualityReview(state, ALEX);
  for (const finding of state.findings) {
    state = disposeFinding(state, finding.id, {
      action: "resolved",
      actor: ALEX,
      reason: "Reviewed against the source evidence and controlled wording.",
    });
  }
  return state;
}

describe("RhythmReview requirements workflow", () => {
  it("starts with five immutable, addressable source records", () => {
    const state = WorkspaceStateSchema.parse(createInitialState());
    expect(state.workflow).toBe("source_review");
    expect(state.sources).toHaveLength(5);
    expect(state.sources.flatMap((source) => source.passages)).toHaveLength(18);
  });

  it("preserves the original proposal when a human edits it", () => {
    let state = loadReplayExtraction(createInitialState());
    const original = state.candidates.find(
      (item) => item.id === "DC-002",
    )?.originalText;
    state = decideCandidate(
      state,
      "DC-002",
      CandidateActionSchema.parse({
        operation: "edit",
        actor: ALEX,
        text: "The clinician needs a result during the active review workflow.",
        reason: "Clarified the need.",
      }),
    );
    const edited = state.candidates.find((item) => item.id === "DC-002");
    expect(edited?.originalText).toBe(original);
    expect(edited?.currentText).not.toBe(original);
    expect(edited?.decision.kind).toBe("edited");
  });

  it("requires reasons at the transport boundary", () => {
    expect(() =>
      CandidateActionSchema.parse({
        operation: "reject",
        actor: ALEX,
        reason: "",
      }),
    ).toThrow();
    expect(() =>
      CandidateActionSchema.parse({
        operation: "defer",
        actor: ALEX,
        reason: "Missing",
        owner: "",
      }),
    ).toThrow();
  });

  it("blocks the wrong role and invalid workflow operations", () => {
    const state = loadReplayExtraction(createInitialState());
    expect(() =>
      decideCandidate(state, "DC-001", {
        operation: "accept",
        actor: JAMIE,
        reason: "Reviewed.",
      }),
    ).toThrow(/Alex Morgan/);
    expect(() => createDrafts(state, "replay")).toThrow(
      /Finish the discovery review/,
    );
  });

  it("keeps rejected and deferred discovery material out of accepted derivations", () => {
    const state = createDrafts(reviewedDiscovery(), "replay");
    const linked = new Set(
      state.derivationLinks.map((link) => link.candidateId),
    );
    expect(linked.has("DC-004" as never)).toBe(false);
    expect(linked.has("DC-012" as never)).toBe(false);
  });

  it("splits the compound proposal into atomic timing requirements", () => {
    let state = createDrafts(reviewedDiscovery(), "replay");
    state = updateRequirement(state, "TMP-001", {
      operation: "split_timing",
      actor: ALEX,
      reason: "Make each behavior independently verifiable.",
    });
    expect(
      state.requirements.find((item) => item.id === "TMP-001")?.status,
    ).toBe("discarded");
    expect(state.requirements.some((item) => item.id === "REQ-004")).toBe(true);
    expect(state.requirements.some((item) => item.id === "REQ-005")).toBe(true);
  });

  it("preserves every requirement version and the AI original", () => {
    let state = createDrafts(reviewedDiscovery(), "replay");
    const before = state.requirements.find((item) => item.id === "UN-001")!;
    state = applyCanonicalWording(state, "UN-001", ALEX);
    const after = state.requirements.find((item) => item.id === "UN-001")!;
    expect(after.originalAiText).toBe(before.originalAiText);
    expect(after.versions).toHaveLength(2);
    expect(after.versions[1]?.origin).toBe("human_edit");
  });

  it("enforces submission gates", () => {
    let state = createDrafts(reviewedDiscovery(), "replay");
    state = runQualityReview(state, ALEX);
    expect(() =>
      advanceWorkflow(state, { action: "submit", actor: ALEX }),
    ).toThrow();
  });

  it("supports return to author without losing the candidate history", () => {
    let state = advanceWorkflow(cleanCandidate(), {
      action: "submit",
      actor: ALEX,
    });
    const auditCount = state.audit.length;
    state = advanceWorkflow(state, {
      action: "return",
      actor: JAMIE,
      reason: "Clarify the verification language.",
    });
    expect(state.workflow).toBe("returned_to_author");
    expect(state.audit.length).toBe(auditCount + 1);
  });

  it("approves an immutable 8-need and 16-requirement baseline", () => {
    let state = advanceWorkflow(cleanCandidate(), {
      action: "submit",
      actor: ALEX,
    });
    expect(() =>
      advanceWorkflow(state, { action: "approve", actor: ALEX }),
    ).toThrow(/Jamie Chen/);
    state = advanceWorkflow(state, { action: "approve", actor: JAMIE });
    expect(state.workflow).toBe("approved");
    expect(state.baseline?.items).toHaveLength(24);
    expect(state.baseline?.items.map((item) => item.id)).toEqual([
      ...Array.from(
        { length: 8 },
        (_, index) => `UN-${String(index + 1).padStart(3, "0")}`,
      ),
      ...Array.from(
        { length: 16 },
        (_, index) => `REQ-${String(index + 1).padStart(3, "0")}`,
      ),
    ]);
    const snapshot = JSON.stringify(state.baseline);
    expect(() => applyCanonicalWording(state, "UN-001", ALEX)).toThrow(
      /editing is closed/,
    );
    expect(JSON.stringify(state.baseline)).toBe(snapshot);
  });
});
