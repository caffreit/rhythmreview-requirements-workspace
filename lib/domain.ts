import { z } from "zod";

export const SourceDocumentIdSchema = z
  .string()
  .regex(/^SRC-\d{3}$/)
  .brand<"SourceDocumentId">();
export const SourcePassageIdSchema = z
  .string()
  .regex(/^SRC-\d{3}-P\d+$/)
  .brand<"SourcePassageId">();
export const CandidateIdSchema = z
  .string()
  .regex(/^DC-\d{3}$/)
  .brand<"CandidateId">();
export const RequirementIdSchema = z
  .string()
  .regex(/^(UN|REQ)-\d{3}$|^TMP-\d{3}$/)
  .brand<"RequirementId">();
export const FindingIdSchema = z
  .string()
  .regex(/^QF-\d{3}$/)
  .brand<"FindingId">();
export const ExtractionRunIdSchema = z
  .string()
  .regex(/^EXR-\d{3}$/)
  .brand<"ExtractionRunId">();
export const DraftRunIdSchema = z
  .string()
  .regex(/^DRR-\d{3}$/)
  .brand<"DraftRunId">();

export const ActorSchema = z.enum([
  "Alex Morgan · Product and systems author",
  "Jamie Chen · QA reviewer",
]);
export const WorkflowStateSchema = z.enum([
  "source_review",
  "candidate_review",
  "ready_to_draft",
  "authoring",
  "qa_review",
  "returned_to_author",
  "approved",
]);
export const CandidateKindSchema = z.enum([
  "observed_fact",
  "stakeholder_need",
  "constraint",
  "assumption",
  "contradiction",
  "open_question",
]);

export const CandidateDecisionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("pending") }),
  z.object({
    kind: z.literal("accepted"),
    actor: ActorSchema,
    reason: z.string(),
    decidedAt: z.string(),
  }),
  z.object({
    kind: z.literal("edited"),
    actor: ActorSchema,
    reason: z.string(),
    decidedAt: z.string(),
    editedText: z.string().min(3),
  }),
  z.object({
    kind: z.literal("rejected"),
    actor: ActorSchema,
    reason: z.string().min(2),
    decidedAt: z.string(),
  }),
  z.object({
    kind: z.literal("deferred"),
    actor: ActorSchema,
    reason: z.string().min(2),
    owner: z.string().min(2),
    decidedAt: z.string(),
  }),
  z.object({
    kind: z.literal("merged"),
    actor: ActorSchema,
    reason: z.string().min(2),
    targetId: CandidateIdSchema,
    decidedAt: z.string(),
  }),
  z.object({
    kind: z.literal("split"),
    actor: ActorSchema,
    reason: z.string().min(2),
    parts: z.array(z.string().min(3)).min(2),
    decidedAt: z.string(),
  }),
]);

export const SourcePassageSchema = z.object({
  id: SourcePassageIdSchema,
  label: z.string(),
  text: z.string().min(1),
});
export const SourceDocumentSchema = z.object({
  id: SourceDocumentIdSchema,
  type: z.enum(["transcript", "email", "meeting_notes", "technical_note"]),
  title: z.string(),
  author: z.string(),
  date: z.string(),
  summary: z.string(),
  passages: z.array(SourcePassageSchema).min(1),
});
export const DiscoveryCandidateSchema = z.object({
  id: CandidateIdSchema,
  kind: CandidateKindSchema,
  title: z.string(),
  originalText: z.string(),
  currentText: z.string(),
  sourcePassageIds: z.array(SourcePassageIdSchema).min(1),
  decision: CandidateDecisionSchema,
});
export const HumanDecisionSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  rationale: z.string(),
  actor: ActorSchema,
  createdAt: z.string(),
});
export const ExtractionRunSchema = z.object({
  id: ExtractionRunIdSchema,
  mode: z.enum(["replay", "live"]),
  candidateIds: z.array(CandidateIdSchema),
  createdAt: z.string(),
});
export const DraftRunSchema = z.object({
  id: DraftRunIdSchema,
  mode: z.enum(["replay", "live"]),
  requirementIds: z.array(RequirementIdSchema),
  createdAt: z.string(),
});
export const SourceTraceSchema = z.object({
  requirementId: RequirementIdSchema,
  sourcePassageId: SourcePassageIdSchema,
});
export const DerivationLinkSchema = z.object({
  requirementId: RequirementIdSchema,
  candidateId: CandidateIdSchema,
});

export const RequirementVersionSchema = z.object({
  id: z.string(),
  text: z.string(),
  acceptanceCriterion: z.string(),
  actor: z.string(),
  origin: z.enum(["replay_fixture", "live_ai", "human_edit"]),
  reason: z.string(),
  createdAt: z.string(),
});
export const RequirementStatusSchema = z.enum([
  "proposed",
  "discarded",
  "submitted",
  "approved",
]);
export const RequirementItemSchema = z.object({
  id: RequirementIdSchema,
  type: z.enum([
    "user_need",
    "system_requirement",
    "software_requirement",
    "compound_draft",
  ]),
  title: z.string(),
  rationale: z.string(),
  owner: z.string(),
  parentNeedId: RequirementIdSchema.nullable(),
  sourcePassageIds: z.array(SourcePassageIdSchema),
  decisionIds: z.array(z.string()),
  originalAiText: z.string(),
  status: RequirementStatusSchema,
  versions: z.array(RequirementVersionSchema).min(1),
});
export const QualityFindingSchema = z.object({
  id: FindingIdSchema,
  basis: z.enum(["deterministic_check", "ai_assisted_review"]),
  severity: z.enum(["high", "medium"]),
  title: z.string(),
  detail: z.string(),
  itemIds: z.array(RequirementIdSchema),
  disposition: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("pending") }),
    z.object({
      kind: z.literal("resolved"),
      actor: ActorSchema,
      reason: z.string(),
      resolvedAt: z.string(),
    }),
    z.object({
      kind: z.literal("accepted_risk"),
      actor: ActorSchema,
      reason: z.string(),
      resolvedAt: z.string(),
    }),
    z.object({
      kind: z.literal("not_applicable"),
      actor: ActorSchema,
      reason: z.string(),
      resolvedAt: z.string(),
    }),
  ]),
});
export const AuditEventSchema = z.object({
  id: z.string(),
  action: z.string(),
  actor: z.string(),
  detail: z.string(),
  entityId: z.string(),
  createdAt: z.string(),
});
export const RequirementBaselineSchema = z.object({
  id: z.string(),
  label: z.string(),
  approvedBy: ActorSchema,
  approvedAt: z.string(),
  items: z.array(RequirementItemSchema),
});

export const WorkspaceStateSchema = z.object({
  workflow: WorkflowStateSchema,
  revision: z.number().int().positive(),
  extractionMode: z.enum(["replay", "live"]).nullable(),
  draftMode: z.enum(["replay", "live"]).nullable(),
  sources: z.array(SourceDocumentSchema),
  candidates: z.array(DiscoveryCandidateSchema),
  decisions: z.array(HumanDecisionSchema),
  requirements: z.array(RequirementItemSchema),
  extractionRuns: z.array(ExtractionRunSchema).default([]),
  draftRuns: z.array(DraftRunSchema).default([]),
  sourceTraces: z.array(SourceTraceSchema).default([]),
  derivationLinks: z.array(DerivationLinkSchema).default([]),
  findings: z.array(QualityFindingSchema),
  baseline: RequirementBaselineSchema.nullable(),
  audit: z.array(AuditEventSchema),
});

export const CandidateActionSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("accept"),
    actor: ActorSchema,
    reason: z.string().default("Confirmed against the cited source."),
  }),
  z.object({
    operation: z.literal("edit"),
    actor: ActorSchema,
    text: z.string().min(3),
    reason: z.string().min(2),
  }),
  z.object({
    operation: z.literal("reject"),
    actor: ActorSchema,
    reason: z.string().min(2),
  }),
  z.object({
    operation: z.literal("defer"),
    actor: ActorSchema,
    reason: z.string().min(2),
    owner: z.string().min(2),
  }),
  z.object({
    operation: z.literal("merge"),
    actor: ActorSchema,
    targetId: CandidateIdSchema,
    reason: z.string().min(2),
  }),
  z.object({
    operation: z.literal("split"),
    actor: ActorSchema,
    parts: z.array(z.string().min(3)).min(2),
    reason: z.string().min(2),
  }),
]);
export const RequirementActionSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("save"),
    actor: ActorSchema,
    text: z.string().min(8),
    acceptanceCriterion: z.string().min(3),
    reason: z.string().min(2),
  }),
  z.object({
    operation: z.literal("discard"),
    actor: ActorSchema,
    reason: z.string().min(2),
  }),
  z.object({
    operation: z.literal("restore"),
    actor: ActorSchema,
    reason: z.string().min(2),
  }),
  z.object({
    operation: z.literal("split_timing"),
    actor: ActorSchema,
    reason: z.string().min(2),
  }),
]);
export const FindingActionSchema = z.object({
  action: z.enum(["resolved", "accepted_risk", "not_applicable"]),
  actor: ActorSchema,
  reason: z.string().min(2),
});
export const WorkflowActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("submit"), actor: ActorSchema }),
  z.object({
    action: z.literal("return"),
    actor: ActorSchema,
    reason: z.string().min(2),
  }),
  z.object({ action: z.literal("approve"), actor: ActorSchema }),
]);

export type Actor = z.infer<typeof ActorSchema>;
export type WorkspaceState = z.infer<typeof WorkspaceStateSchema>;
export type DiscoveryCandidate = z.infer<typeof DiscoveryCandidateSchema>;
export type RequirementItem = z.infer<typeof RequirementItemSchema>;
export type QualityFinding = z.infer<typeof QualityFindingSchema>;
export type CandidateAction = z.infer<typeof CandidateActionSchema>;
export type RequirementAction = z.infer<typeof RequirementActionSchema>;
export type FindingAction = z.infer<typeof FindingActionSchema>;
export type WorkflowAction = z.infer<typeof WorkflowActionSchema>;
