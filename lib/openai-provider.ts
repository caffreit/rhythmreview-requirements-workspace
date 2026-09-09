import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { DiscoveryCandidateSchema, type WorkspaceState } from "./domain";

const LiveCandidateSchema = z.object({
  kind: z.enum([
    "observed_fact",
    "stakeholder_need",
    "constraint",
    "assumption",
    "contradiction",
    "open_question",
  ]),
  title: z.string(),
  text: z.string(),
  sourcePassageIds: z.array(z.string().regex(/^SRC-\d{3}-P\d+$/)).min(1),
});
const LiveExtractionSchema = z.object({
  candidates: z.array(LiveCandidateSchema).min(1).max(40),
});
const LiveDraftSchema = z.object({
  id: z.string().regex(/^(UN|REQ)-\d{3}$/),
  text: z.string(),
  acceptanceCriterion: z.string(),
  rationale: z.string(),
});
const LiveDraftOutputSchema = z.object({
  drafts: z.array(LiveDraftSchema).min(1).max(24),
});

function client(): { client: OpenAI; model: string } {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey)
    throw new Error(
      "OPENAI_API_KEY is not configured. Choose replay mode or add the key to the local environment.",
    );
  return {
    client: new OpenAI({ apiKey }),
    model: process.env.OPENAI_MODEL ?? "gpt-5.5",
  };
}

export async function extractWithOpenAI(
  sources: WorkspaceState["sources"],
): Promise<WorkspaceState["candidates"]> {
  const configured = client();
  const allowedPassages = new Set<string>(
    sources.flatMap((source) => source.passages.map((passage) => passage.id)),
  );
  const response = await configured.client.responses.parse({
    model: configured.model,
    store: false,
    instructions:
      "Extract candidate discovery records for a regulated medical-software team. Use only supplied facts. Classify each record. Cite exact supplied passage IDs. Surface conflicts and open questions. Do not approve content or invent thresholds.",
    input: JSON.stringify(sources),
    text: {
      format: zodTextFormat(LiveExtractionSchema, "discovery_extraction"),
    },
  });
  if (!response.output_parsed)
    throw new Error("The model returned no structured discovery extraction.");
  return response.output_parsed.candidates
    .filter((candidate) =>
      candidate.sourcePassageIds.every((id) => allowedPassages.has(id)),
    )
    .map((candidate, index) =>
      DiscoveryCandidateSchema.parse({
        id: `DC-${String(index + 1).padStart(3, "0")}`,
        kind: candidate.kind,
        title: candidate.title,
        originalText: candidate.text,
        currentText: candidate.text,
        sourcePassageIds: candidate.sourcePassageIds,
        decision: { kind: "pending" },
      }),
    );
}

export async function draftWithOpenAI(
  state: WorkspaceState,
): Promise<z.infer<typeof LiveDraftSchema>[]> {
  const configured = client();
  const accepted = state.candidates.filter(
    (candidate) =>
      candidate.decision.kind === "accepted" ||
      candidate.decision.kind === "edited",
  );
  const response = await configured.client.responses.parse({
    model: configured.model,
    store: false,
    instructions:
      "Draft atomic user needs and system or software requirements for RhythmReview. Use only accepted discovery records and human decisions. Preserve the provided identifiers when used. Every requirement must be measurable and have an acceptance criterion. Do not invent unresolved thresholds.",
    input: JSON.stringify({
      accepted,
      decisions: state.decisions,
      allowedIds: Object.keys((await import("./seed")).canonicalStatements),
    }),
    text: {
      format: zodTextFormat(LiveDraftOutputSchema, "requirement_drafts"),
    },
  });
  if (!response.output_parsed)
    throw new Error("The model returned no structured requirement draft.");
  return response.output_parsed.drafts;
}
