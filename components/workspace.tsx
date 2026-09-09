"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ActorSchema,
  WorkspaceStateSchema,
  type Actor,
  type DiscoveryCandidate,
  type QualityFinding,
  type RequirementItem,
  type WorkspaceState,
} from "@/lib/domain";

type View =
  | "overview"
  | "sources"
  | "discovery"
  | "requirements"
  | "quality"
  | "baseline";
type Dialog =
  | {
      kind: "candidate";
      candidate: DiscoveryCandidate;
      operation: "edit" | "reject" | "defer" | "merge" | "split";
    }
  | { kind: "finding"; finding: QualityFinding }
  | { kind: "return" }
  | null;
const ALEX: Actor = "Alex Morgan · Product and systems author";
const JAMIE: Actor = "Jamie Chen · QA reviewer";
const NAV: Array<{ id: View; number: string; label: string }> = [
  { id: "overview", number: "01", label: "Overview" },
  { id: "sources", number: "02", label: "Sources" },
  { id: "discovery", number: "03", label: "Discovery review" },
  { id: "requirements", number: "04", label: "Requirements" },
  { id: "quality", number: "05", label: "Quality review" },
  { id: "baseline", number: "06", label: "Baseline and audit" },
];
const GUIDE: Array<{ view: View; title: string; body: string }> = [
  {
    view: "overview",
    title: "Start before design controls",
    body: "Five fictional records capture what the team heard, agreed, and still needs to decide.",
  },
  {
    view: "sources",
    title: "Inspect the clinical source",
    body: "Open the discovery call. Timestamped passages become stable citations, not copied prose in a chat.",
  },
  {
    view: "discovery",
    title: "Load the saved extraction",
    body: "Replay creates structured candidates without an API call. Reject the diagnostic claim, edit the timing need, and resolve the age question.",
  },
  {
    view: "discovery",
    title: "Keep missing facts visible",
    body: "Defer the retention duration. The tool records an owner instead of inventing a number.",
  },
  {
    view: "requirements",
    title: "Draft from reviewed evidence",
    body: "Create the replay drafts, split the combined timing behavior, and use precise wording for UN-004 and REQ-004.",
  },
  {
    view: "quality",
    title: "Separate rules from AI review",
    body: "Run quality review. Deterministic checks and AI-assisted conflict suggestions remain visibly different.",
  },
  {
    view: "quality",
    title: "Record human dispositions",
    body: "Resolve each finding with a reason, then submit the clean candidate to QA.",
  },
  {
    view: "quality",
    title: "Make the separate QA decision",
    body: "Switch to Jamie Chen. QA can return the candidate or approve the immutable baseline.",
  },
  {
    view: "baseline",
    title: "Trace the approved evidence",
    body: "Open any approved item to see its source passages, parent need, original AI text, edits, and approval.",
  },
  {
    view: "baseline",
    title: "Return to the known start",
    body: "Reset removes workflow activity and restores the five original source records.",
  },
];

async function requestState(
  url: string,
  init?: RequestInit,
): Promise<WorkspaceState> {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return WorkspaceStateSchema.parse(body);
}
function latest(item: RequirementItem) {
  return item.versions[item.versions.length - 1];
}
function pretty(value: string) {
  return value.replaceAll("_", " ");
}

export default function Workspace() {
  const [state, setState] = useState<WorkspaceState | null>(null);
  const [view, setView] = useState<View>("overview");
  const [actor, setActor] = useState<Actor>(ALEX);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedSource, setSelectedSource] = useState("SRC-001");
  const [selectedPassage, setSelectedPassage] = useState<string | null>(
    "SRC-001-P1",
  );
  const [selectedRequirement, setSelectedRequirement] =
    useState<string>("UN-004");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [guideStep, setGuideStep] = useState<number | null>(null);
  const load = useCallback(async () => {
    try {
      setState(await requestState("/api/workspace"));
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load the workspace.",
      );
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const mutate = async (url: string, body?: unknown) => {
    setBusy(true);
    setError(null);
    try {
      const next = await requestState(url, {
        method: "POST",
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      setState(next);
      return next;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The action could not be completed.",
      );
      return null;
    } finally {
      setBusy(false);
    }
  };
  if (!state)
    return (
      <div className="loading">
        <span>BB</span>
        <p>{error ?? "Preparing the requirements workspace…"}</p>
        <button onClick={() => void load()}>Try again</button>
      </div>
    );
  const pending = state.candidates.filter(
    (item) => item.decision.kind === "pending",
  ).length;
  const activeRequirements = state.requirements.filter(
    (item) => item.status !== "discarded",
  );
  const needs = activeRequirements.filter((item) => item.type === "user_need");
  const systemRequirements = activeRequirements.filter(
    (item) => item.type !== "user_need" && item.type !== "compound_draft",
  );
  const openFindings = state.findings.filter(
    (item) => item.disposition.kind === "pending",
  );
  const source =
    state.sources.find((item) => item.id === selectedSource) ??
    state.sources[0];
  const navigate = (next: View) => setView(next);
  const jumpToPassage = (id: string) => {
    const owner = state.sources.find((document) =>
      document.passages.some((passage) => passage.id === id),
    );
    if (owner) {
      setSelectedSource(owner.id);
      setSelectedPassage(id);
      setView("sources");
    }
  };
  const activeGuideStep = guideStep ?? 0;
  const guide = guideStep === null ? null : GUIDE[activeGuideStep];
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span>BB</span>
          <div>
            <b>Blue Bridge</b>
            <small>Requirements workspace</small>
          </div>
        </div>
        <nav aria-label="Workspace">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              onClick={() => navigate(item.id)}
            >
              {item.number}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <b>Fictional project</b>
          <p>No patient, client, or submission data.</p>
          <button onClick={() => setGuideStep(0)}>
            Start guided walkthrough
          </button>
        </div>
      </aside>
      <section className="workspace">
        <header className="topbar">
          <div>
            <span className={`status-dot ${state.workflow}`} />
            {pretty(state.workflow)}
          </div>
          <label className="actor">
            <span>Acting as</span>
            <select
              value={actor}
              onChange={(event) =>
                setActor(ActorSchema.parse(event.target.value))
              }
            >
              <option value={ALEX}>Alex Morgan · Author</option>
              <option value={JAMIE}>Jamie Chen · QA</option>
            </select>
          </label>
        </header>
        {error && (
          <div className="error-banner" role="alert">
            {error}
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}
        {view === "overview" && (
          <Overview
            state={state}
            metrics={{
              pending,
              needs: needs.length,
              requirements: systemRequirements.length,
              findings: openFindings.length,
            }}
            onNavigate={navigate}
            onGuide={() => setGuideStep(0)}
          />
        )}{" "}
        {view === "sources" && source && (
          <Sources
            state={state}
            source={source}
            selectedPassage={selectedPassage}
            onSelectSource={(id) => {
              setSelectedSource(id);
              setSelectedPassage(null);
            }}
            onSelectPassage={setSelectedPassage}
            onNavigate={navigate}
          />
        )}{" "}
        {view === "discovery" && (
          <Discovery
            state={state}
            actor={actor}
            busy={busy}
            onMutate={mutate}
            onDialog={setDialog}
            onPassage={jumpToPassage}
            onNavigate={navigate}
          />
        )}{" "}
        {view === "requirements" && (
          <Requirements
            state={state}
            actor={actor}
            busy={busy}
            selectedId={selectedRequirement}
            onSelect={setSelectedRequirement}
            onMutate={mutate}
            onPassage={jumpToPassage}
          />
        )}{" "}
        {view === "quality" && (
          <Quality
            state={state}
            actor={actor}
            busy={busy}
            onMutate={mutate}
            onDialog={setDialog}
          />
        )}{" "}
        {view === "baseline" && (
          <Baseline
            state={state}
            busy={busy}
            selectedId={selectedRequirement}
            onSelect={setSelectedRequirement}
            onPassage={jumpToPassage}
            onMutate={mutate}
          />
        )}
      </section>
      {dialog && (
        <ActionDialog
          dialog={dialog}
          actor={actor}
          busy={busy}
          onClose={() => setDialog(null)}
          onSubmit={async (url, body) => {
            const next = await mutate(url, body);
            if (next) setDialog(null);
          }}
        />
      )}
      {guide && (
        <aside className="guide">
          <div className="guide-progress">
            Walkthrough {activeGuideStep + 1} of {GUIDE.length}
          </div>
          <p className="eyebrow">Guided demonstration</p>
          <h2>{guide.title}</h2>
          <p>{guide.body}</p>
          <div>
            <button onClick={() => setGuideStep(null)}>Close</button>
            {activeGuideStep > 0 && (
              <button
                onClick={() => {
                  const next = activeGuideStep - 1;
                  setGuideStep(next);
                  setView(GUIDE[next].view);
                }}
              >
                Back
              </button>
            )}
            <button
              className="primary"
              onClick={() => {
                if (activeGuideStep === GUIDE.length - 1) {
                  setGuideStep(null);
                  return;
                }
                const next = activeGuideStep + 1;
                setGuideStep(next);
                setView(GUIDE[next].view);
              }}
            >
              {activeGuideStep === GUIDE.length - 1 ? "Finish" : "Next"}
            </button>
          </div>
        </aside>
      )}
    </main>
  );
}

function PageHeading({
  eyebrow,
  title,
  body,
  action,
}: {
  eyebrow: string;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{body}</p>
      </div>
      {action}
    </div>
  );
}
function Chip({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`chip ${tone}`}>{children}</span>;
}
function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <span>BB</span>
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}

function Overview({
  state,
  metrics,
  onNavigate,
  onGuide,
}: {
  state: WorkspaceState;
  metrics: {
    pending: number;
    needs: number;
    requirements: number;
    findings: number;
  };
  onNavigate: (view: View) => void;
  onGuide: () => void;
}) {
  return (
    <div className="content">
      <PageHeading
        eyebrow="RhythmReview · project start"
        title="Turn discovery evidence into reviewable requirements"
        body="AI proposes structured content. The project team checks the sources, edits the wording, and decides what enters the controlled baseline."
        action={
          <button className="primary" onClick={onGuide}>
            Start guided walkthrough
          </button>
        }
      />
      <div className="boundary">
        <b>Before design controls</b>
        <span>
          These records capture what people said and what the team still needs
          to decide. Nothing becomes approved evidence without a human decision.
        </span>
      </div>
      <div className="metric-grid">
        <article>
          <span>Source records</span>
          <strong>{state.sources.length}</strong>
          <small>Transcript, notes and emails</small>
        </article>
        <article>
          <span>Pending discovery decisions</span>
          <strong>{metrics.pending}</strong>
          <small>
            {state.candidates.length
              ? `${state.candidates.length} extracted candidates`
              : "Run extraction to begin"}
          </small>
        </article>
        <article>
          <span>Candidate baseline</span>
          <strong>{metrics.needs + metrics.requirements}</strong>
          <small>
            {metrics.needs} needs and {metrics.requirements} requirements
          </small>
        </article>
        <article className={metrics.findings ? "attention" : ""}>
          <span>Open quality findings</span>
          <strong>{metrics.findings}</strong>
          <small>No composite score</small>
        </article>
      </div>
      <div className="two-column">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Immutable input</p>
              <h2>Discovery source pack</h2>
            </div>
            <button onClick={() => onNavigate("sources")}>Open sources</button>
          </div>
          <div className="source-list">
            {state.sources.map((item) => (
              <div key={item.id}>
                <code>{item.id}</code>
                <span>
                  <b>{item.title}</b>
                  <small>
                    {pretty(item.type)} · {item.passages.length} passages
                  </small>
                </span>
                <i>Ready</i>
              </div>
            ))}
          </div>
        </section>
        <section className="panel next-step">
          <p className="eyebrow">Current workflow</p>
          <h2>{pretty(state.workflow)}</h2>
          <p>
            {state.workflow === "source_review"
              ? "Inspect the source pack, then load the saved extraction. Every proposal will point back to an exact passage."
              : state.workflow === "approved"
                ? "The requirements baseline is immutable and ready for handoff to the separate change-impact demo."
                : "Continue the structured review. The application keeps proposals separate from approved evidence."}
          </p>
          <button
            className="primary"
            onClick={() =>
              onNavigate(
                state.workflow === "source_review"
                  ? "sources"
                  : state.workflow === "candidate_review" ||
                      state.workflow === "ready_to_draft"
                    ? "discovery"
                    : state.workflow === "approved"
                      ? "baseline"
                      : "requirements",
              )
            }
          >
            Continue workflow
          </button>
          <div className="handoff">
            <span>Project path</span>
            <b>Sources → Discovery review → Requirements → QA baseline</b>
          </div>
        </section>
      </div>
    </div>
  );
}

function Sources({
  state,
  source,
  selectedPassage,
  onSelectSource,
  onSelectPassage,
  onNavigate,
}: {
  state: WorkspaceState;
  source: WorkspaceState["sources"][number];
  selectedPassage: string | null;
  onSelectSource: (id: string) => void;
  onSelectPassage: (id: string) => void;
  onNavigate: (view: View) => void;
}) {
  const linked = (
    passageId: WorkspaceState["sources"][number]["passages"][number]["id"],
  ) =>
    state.candidates.filter((candidate) =>
      candidate.sourcePassageIds.includes(passageId),
    );
  return (
    <div className="content">
      <PageHeading
        eyebrow="Immutable discovery evidence"
        title="Source pack"
        body="The original fictional records stay unchanged. Stable passage IDs keep every proposal traceable."
        action={
          <button className="primary" onClick={() => onNavigate("discovery")}>
            Open discovery review
          </button>
        }
      />
      <div className="source-browser">
        <aside>
          {state.sources.map((item) => (
            <button
              key={item.id}
              className={source.id === item.id ? "selected" : ""}
              onClick={() => onSelectSource(item.id)}
            >
              <span>
                <code>{item.id}</code>
                <Chip>{pretty(item.type)}</Chip>
              </span>
              <b>{item.title}</b>
              <small>
                {item.author} · {item.date}
              </small>
            </button>
          ))}
        </aside>
        <article className="source-document">
          <header>
            <div>
              <p className="eyebrow">{source.id} · read only</p>
              <h2>{source.title}</h2>
              <p>{source.summary}</p>
            </div>
            <Chip tone="approved">Immutable</Chip>
          </header>
          <dl>
            <div>
              <dt>Author</dt>
              <dd>{source.author}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{source.date}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{pretty(source.type)}</dd>
            </div>
          </dl>
          <div className="passages">
            {source.passages.map((passage) => {
              const refs = linked(passage.id);
              return (
                <button
                  key={passage.id}
                  className={selectedPassage === passage.id ? "selected" : ""}
                  onClick={() => onSelectPassage(passage.id)}
                >
                  <span>
                    <code>{passage.id}</code>
                    <small>{passage.label}</small>
                  </span>
                  <p>{passage.text}</p>
                  <i>
                    {refs.length} candidate{refs.length === 1 ? "" : "s"}
                  </i>
                  {selectedPassage === passage.id && refs.length > 0 && (
                    <div className="passage-links">
                      {refs.map((candidate) => (
                        <Chip key={candidate.id}>
                          {candidate.id} · {candidate.title}
                        </Chip>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </article>
      </div>
    </div>
  );
}

function Discovery({
  state,
  actor,
  busy,
  onMutate,
  onDialog,
  onPassage,
  onNavigate,
}: {
  state: WorkspaceState;
  actor: Actor;
  busy: boolean;
  onMutate: (url: string, body?: unknown) => Promise<WorkspaceState | null>;
  onDialog: (dialog: Dialog) => void;
  onPassage: (id: string) => void;
  onNavigate: (view: View) => void;
}) {
  const editable = actor === ALEX && state.workflow === "candidate_review";
  const complete =
    state.candidates.length > 0 &&
    state.candidates.every((item) => item.decision.kind !== "pending");
  return (
    <div className="content">
      <PageHeading
        eyebrow="AI proposals · human decisions"
        title="Discovery review"
        body="Candidates are structured by meaning and tied to exact source passages. The saved replay makes no OpenAI call."
        action={
          state.candidates.length === 0 ? (
            <div className="action-row">
              <button
                className="secondary"
                disabled={busy}
                onClick={() =>
                  void onMutate("/api/extraction", { mode: "live" })
                }
              >
                Run live AI
              </button>
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  void onMutate("/api/extraction", { mode: "replay" })
                }
              >
                Load replay extraction
              </button>
            </div>
          ) : (
            <div className="count-pill">
              {state.candidates.length -
                state.candidates.filter(
                  (item) => item.decision.kind === "pending",
                ).length}{" "}
              of {state.candidates.length} reviewed
            </div>
          )
        }
      />
      {state.candidates.length === 0 ? (
        <Empty
          title="No extraction has run"
          body="Start with the deterministic replay for the workshop. Live mode uses only these fictional sources."
        />
      ) : (
        <>
          <div className="review-toolbar">
            <div>
              <Chip tone={state.extractionMode === "live" ? "live" : "fixture"}>
                {state.extractionMode === "live"
                  ? "Live OpenAI"
                  : "Saved replay fixture"}
              </Chip>
              <span>
                {
                  state.candidates.filter(
                    (item) => item.kind === "open_question",
                  ).length
                }{" "}
                open questions ·{" "}
                {
                  state.candidates.filter(
                    (item) => item.kind === "contradiction",
                  ).length
                }{" "}
                contradiction
              </span>
            </div>
            {!complete && (
              <button
                disabled={!editable || busy}
                onClick={() =>
                  void onMutate("/api/decisions", {
                    action: "complete_replay",
                    actor,
                  })
                }
              >
                Apply remaining fixture decisions
              </button>
            )}
            {complete && <Chip tone="approved">Discovery review complete</Chip>}
          </div>
          <div className="candidate-grid">
            {state.candidates.map((candidate) => (
              <article
                key={candidate.id}
                className={`candidate-card ${candidate.decision.kind}`}
              >
                <div className="card-top">
                  <Chip
                    tone={
                      candidate.kind === "contradiction"
                        ? "warning"
                        : candidate.kind === "open_question"
                          ? "question"
                          : "neutral"
                    }
                  >
                    {pretty(candidate.kind)}
                  </Chip>
                  <code>{candidate.id}</code>
                </div>
                <h3>{candidate.title}</h3>
                <p>{candidate.currentText}</p>
                {candidate.currentText !== candidate.originalText && (
                  <details>
                    <summary>Original AI wording</summary>
                    <p>{candidate.originalText}</p>
                  </details>
                )}
                <div className="citations">
                  {candidate.sourcePassageIds.map((id) => (
                    <button key={id} onClick={() => onPassage(id)}>
                      {id}
                    </button>
                  ))}
                </div>
                <div className="decision-state">
                  <b>{pretty(candidate.decision.kind)}</b>
                  {candidate.decision.kind !== "pending" &&
                    "reason" in candidate.decision && (
                      <small>{candidate.decision.reason}</small>
                    )}
                </div>
                <div className="card-actions">
                  <button
                    disabled={!editable || busy}
                    onClick={() =>
                      void onMutate(`/api/discovery/${candidate.id}`, {
                        operation: "accept",
                        actor,
                        reason: "Confirmed against the cited source.",
                      })
                    }
                  >
                    Accept
                  </button>
                  <button
                    disabled={!editable || busy}
                    onClick={() =>
                      onDialog({
                        kind: "candidate",
                        candidate,
                        operation: "edit",
                      })
                    }
                  >
                    Edit
                  </button>
                  <button
                    disabled={!editable || busy}
                    onClick={() =>
                      onDialog({
                        kind: "candidate",
                        candidate,
                        operation: "reject",
                      })
                    }
                  >
                    Reject
                  </button>
                  <button
                    disabled={!editable || busy}
                    onClick={() =>
                      onDialog({
                        kind: "candidate",
                        candidate,
                        operation: "defer",
                      })
                    }
                  >
                    Defer
                  </button>
                  {candidate.id === "DC-003" && (
                    <button
                      className="accent"
                      disabled={!editable || busy}
                      onClick={() =>
                        void onMutate("/api/decisions", {
                          action: "resolve",
                          kind: "age",
                          actor,
                        })
                      }
                    >
                      Set age to 22+
                    </button>
                  )}
                  {candidate.id === "DC-012" && (
                    <button
                      className="accent"
                      disabled={!editable || busy}
                      onClick={() =>
                        void onMutate("/api/decisions", {
                          action: "resolve",
                          kind: "retention",
                          actor,
                        })
                      }
                    >
                      Defer with owner
                    </button>
                  )}
                  <details className="more-actions">
                    <summary>More</summary>
                    <button
                      disabled={!editable || busy}
                      onClick={() =>
                        onDialog({
                          kind: "candidate",
                          candidate,
                          operation: "merge",
                        })
                      }
                    >
                      Merge
                    </button>
                    <button
                      disabled={!editable || busy}
                      onClick={() =>
                        onDialog({
                          kind: "candidate",
                          candidate,
                          operation: "split",
                        })
                      }
                    >
                      Split
                    </button>
                  </details>
                </div>
              </article>
            ))}
          </div>
          {state.workflow === "ready_to_draft" && (
            <div className="completion-bar">
              <div>
                <b>Discovery review is complete</b>
                <span>
                  All candidates have a human decision. Missing values remain
                  recorded as decisions or deferrals.
                </span>
              </div>
              <button
                className="primary"
                onClick={() => onNavigate("requirements")}
              >
                Continue to requirements
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Requirements({
  state,
  actor,
  busy,
  selectedId,
  onSelect,
  onMutate,
  onPassage,
}: {
  state: WorkspaceState;
  actor: Actor;
  busy: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
  onMutate: (url: string, body?: unknown) => Promise<WorkspaceState | null>;
  onPassage: (id: string) => void;
}) {
  const editable =
    actor === ALEX &&
    (state.workflow === "authoring" || state.workflow === "returned_to_author");
  const active = state.requirements.filter(
    (item) => item.status !== "discarded",
  );
  const selected =
    state.requirements.find((item) => item.id === selectedId) ?? active[0];
  const needs = active.filter((item) => item.type === "user_need");
  const [text, setText] = useState("");
  const [criterion, setCriterion] = useState("");
  const [reason, setReason] = useState(
    "Clarified the draft against the source evidence.",
  );
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (selected) {
        setText(latest(selected)?.text ?? "");
        setCriterion(latest(selected)?.acceptanceCriterion ?? "");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selected]);
  if (
    state.workflow === "source_review" ||
    state.workflow === "candidate_review"
  )
    return (
      <div className="content">
        <PageHeading
          eyebrow="Requirements"
          title="Drafting waits for human review"
          body="Finish the discovery decisions first. The model cannot use rejected or unresolved material as an approved input."
        />
        <Empty
          title="No candidate baseline yet"
          body="Return to Discovery review and complete the source-linked decisions."
        />
      </div>
    );
  if (state.workflow === "ready_to_draft")
    return (
      <div className="content">
        <PageHeading
          eyebrow="Reviewed discovery inputs"
          title="Draft candidate requirements"
          body="The next run uses accepted discovery records and recorded human decisions. It cannot silently use rejected source claims."
        />
        <div className="choice-panel">
          <div>
            <p className="eyebrow">Recommended for the workshop</p>
            <h2>Saved replay draft</h2>
            <p>
              Creates eight user needs, fourteen atomic requirements, and one
              deliberately compound timing proposal for human review.
            </p>
            <button
              data-draft-replay
              className="primary"
              disabled={busy}
              onClick={() =>
                void onMutate("/api/requirements/draft", { mode: "replay" })
              }
            >
              Create replay drafts
            </button>
          </div>
          <div>
            <p className="eyebrow">Optional</p>
            <h2>Live structured draft</h2>
            <p>
              Sends only accepted fictional discovery material and human
              decisions to the configured OpenAI model.
            </p>
            <button
              className="secondary"
              disabled={busy}
              onClick={() =>
                void onMutate("/api/requirements/draft", { mode: "live" })
              }
            >
              Run live drafting
            </button>
          </div>
        </div>
      </div>
    );
  return (
    <div className="content">
      <PageHeading
        eyebrow={`${active.length} included records · ${state.draftMode ?? "candidate"} mode`}
        title="Requirements workspace"
        body="The hierarchy and editor preserve original AI wording and every human version."
        action={
          <button
            className="secondary"
            disabled={!editable || busy}
            onClick={() => void onMutate("/api/quality", { actor })}
          >
            Run quality review
          </button>
        }
      />
      <div className="requirements-layout">
        <aside className="requirement-tree">
          {needs.map((need) => (
            <div key={need.id}>
              <button
                className={selected?.id === need.id ? "selected" : ""}
                onClick={() => onSelect(need.id)}
              >
                <span>
                  <code>{need.id}</code>
                  <Chip>User need</Chip>
                </span>
                <b>{need.title}</b>
                <small>
                  {
                    active.filter((item) => item.parentNeedId === need.id)
                      .length
                  }{" "}
                  derived requirements
                </small>
              </button>
              {active
                .filter((item) => item.parentNeedId === need.id)
                .map((item) => (
                  <button
                    key={item.id}
                    className={`child ${selected?.id === item.id ? "selected" : ""}`}
                    onClick={() => onSelect(item.id)}
                  >
                    <span>
                      <code>{item.id}</code>
                      <Chip
                        tone={
                          item.type === "compound_draft" ? "warning" : "neutral"
                        }
                      >
                        {pretty(item.type)}
                      </Chip>
                    </span>
                    <b>{item.title}</b>
                  </button>
                ))}
            </div>
          ))}
        </aside>
        {selected && (
          <article className="requirement-editor">
            <header>
              <div>
                <p className="eyebrow">
                  {selected.id} · {pretty(selected.type)}
                </p>
                <h2>{selected.title}</h2>
              </div>
              <Chip
                tone={
                  selected.status === "approved"
                    ? "approved"
                    : selected.status === "discarded"
                      ? "warning"
                      : "neutral"
                }
              >
                {selected.status}
              </Chip>
            </header>
            <section className="provenance-strip">
              <div>
                <span>Owner</span>
                <b>{selected.owner}</b>
              </div>
              <div>
                <span>Parent need</span>
                <b>{selected.parentNeedId ?? "Not applicable"}</b>
              </div>
              <div>
                <span>Versions</span>
                <b>{selected.versions.length}</b>
              </div>
            </section>
            <label>
              <span>Current statement</span>
              <textarea
                value={text}
                disabled={!editable}
                onChange={(event) => setText(event.target.value)}
              />
            </label>
            <label>
              <span>Acceptance criterion</span>
              <textarea
                value={criterion}
                disabled={!editable}
                onChange={(event) => setCriterion(event.target.value)}
              />
            </label>
            <label>
              <span>Edit reason</span>
              <input
                value={reason}
                disabled={!editable}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            <div className="editor-actions">
              {selected.id === "TMP-001" ? (
                <button
                  className="primary"
                  disabled={!editable || busy}
                  onClick={() =>
                    void onMutate(`/api/requirements/${selected.id}`, {
                      operation: "split_timing",
                      actor,
                      reason:
                        "Separate result timing from timeout behavior so each can be verified independently.",
                    })
                  }
                >
                  Split into REQ-004 and REQ-005
                </button>
              ) : (
                <>
                  <button
                    className="secondary"
                    disabled={
                      !editable || busy || selected.status === "discarded"
                    }
                    onClick={() =>
                      void onMutate(`/api/requirements/${selected.id}`, {
                        operation: "discard",
                        actor,
                        reason:
                          "Removed from the candidate baseline after source review.",
                      })
                    }
                  >
                    Discard
                  </button>
                  {selected.status === "discarded" && (
                    <button
                      className="secondary"
                      disabled={!editable || busy}
                      onClick={() =>
                        void onMutate(`/api/requirements/${selected.id}`, {
                          operation: "restore",
                          actor,
                          reason: "Restored for further human review.",
                        })
                      }
                    >
                      Restore
                    </button>
                  )}
                  <button
                    className="secondary"
                    disabled={!editable || busy}
                    onClick={() =>
                      void onMutate(`/api/requirements/${selected.id}`, {
                        operation: "canonical",
                        actor,
                      })
                    }
                  >
                    Use precise handoff wording
                  </button>
                  <button
                    className="primary"
                    disabled={!editable || busy}
                    onClick={() =>
                      void onMutate(`/api/requirements/${selected.id}`, {
                        operation: "save",
                        actor,
                        text,
                        acceptanceCriterion: criterion,
                        reason,
                      })
                    }
                  >
                    Save human version
                  </button>
                </>
              )}
            </div>
            <section className="evidence-block">
              <p className="eyebrow">Source trace</p>
              <div className="citations">
                {selected.sourcePassageIds.map((id) => (
                  <button key={id} onClick={() => onPassage(id)}>
                    {id}
                  </button>
                ))}
                {selected.decisionIds.map((id) => (
                  <Chip tone="approved" key={id}>
                    {id}
                  </Chip>
                ))}
              </div>
            </section>
            <details className="version-history" open>
              <summary>Version history</summary>
              {[...selected.versions].reverse().map((version) => (
                <div key={version.id}>
                  <span>
                    <code>{version.id}</code>
                    <Chip
                      tone={
                        version.origin === "human_edit"
                          ? "approved"
                          : version.origin === "live_ai"
                            ? "live"
                            : "fixture"
                      }
                    >
                      {pretty(version.origin)}
                    </Chip>
                  </span>
                  <p>{version.text}</p>
                  <small>
                    {version.actor} · {version.reason}
                  </small>
                </div>
              ))}
            </details>
          </article>
        )}
      </div>
    </div>
  );
}

function Quality({
  state,
  actor,
  busy,
  onMutate,
  onDialog,
}: {
  state: WorkspaceState;
  actor: Actor;
  busy: boolean;
  onMutate: (url: string, body?: unknown) => Promise<WorkspaceState | null>;
  onDialog: (dialog: Dialog) => void;
}) {
  const canEdit =
    actor === ALEX &&
    (state.workflow === "authoring" || state.workflow === "returned_to_author");
  const canQa = actor === JAMIE && state.workflow === "qa_review";
  const highOpen = state.findings.some(
    (item) => item.severity === "high" && item.disposition.kind === "pending",
  );
  return (
    <div className="content">
      <PageHeading
        eyebrow="Rules and review suggestions"
        title="Quality review and approval"
        body="Objective structure checks stay separate from AI-assisted duplicate and conflict review."
        action={
          <div className="action-row">
            <button
              className="secondary"
              disabled={!canEdit || busy}
              onClick={() => void onMutate("/api/quality", { actor })}
            >
              {state.findings.length ? "Rerun checks" : "Run quality review"}
            </button>
            {state.workflow === "authoring" ||
            state.workflow === "returned_to_author" ? (
              <button
                className="primary"
                disabled={
                  !canEdit ||
                  busy ||
                  state.findings.length === 0 ||
                  state.findings.some(
                    (item) => item.disposition.kind === "pending",
                  ) ||
                  highOpen
                }
                onClick={() =>
                  void onMutate("/api/workflow", { action: "submit", actor })
                }
              >
                Submit to QA
              </button>
            ) : state.workflow === "qa_review" ? (
              <>
                <button
                  className="secondary"
                  disabled={!canQa || busy}
                  onClick={() => onDialog({ kind: "return" })}
                >
                  Return to author
                </button>
                <button
                  className="primary"
                  disabled={!canQa || busy}
                  onClick={() =>
                    void onMutate("/api/workflow", { action: "approve", actor })
                  }
                >
                  Approve baseline
                </button>
              </>
            ) : null}
          </div>
        }
      />
      {state.workflow === "qa_review" && (
        <div className="boundary">
          <b>Candidate baseline submitted</b>
          <span>
            The author can no longer edit it. Switch to Jamie Chen to make the
            separate QA decision.
          </span>
        </div>
      )}
      {state.findings.length === 0 ? (
        <Empty
          title="No current quality run"
          body="Run checks after the author has split and edited the timing drafts."
        />
      ) : (
        <div className="finding-list">
          {state.findings.map((finding) => (
            <article
              key={finding.id}
              className={`${finding.severity} ${finding.disposition.kind}`}
            >
              <div>
                <Chip
                  tone={
                    finding.basis === "deterministic_check" ? "neutral" : "live"
                  }
                >
                  {finding.basis === "deterministic_check"
                    ? "Deterministic rule"
                    : "AI-assisted review"}
                </Chip>
                <Chip
                  tone={finding.severity === "high" ? "warning" : "question"}
                >
                  {finding.severity}
                </Chip>
                <code>{finding.id}</code>
              </div>
              <h3>{finding.title}</h3>
              <p>{finding.detail}</p>
              <div className="citations">
                {finding.itemIds.map((id) => (
                  <Chip key={id}>{id}</Chip>
                ))}
              </div>
              <footer>
                <span>
                  {finding.disposition.kind === "pending"
                    ? "Awaiting human disposition"
                    : pretty(finding.disposition.kind)}
                </span>
                {finding.disposition.kind !== "pending" && (
                  <small>
                    {finding.disposition.actor}: {finding.disposition.reason}
                  </small>
                )}
                <button
                  disabled={!canEdit || busy}
                  onClick={() => onDialog({ kind: "finding", finding })}
                >
                  Record disposition
                </button>
              </footer>
            </article>
          ))}
        </div>
      )}
      <section className="gate-panel">
        <p className="eyebrow">Submission gate</p>
        <div>
          <Gate
            ok={
              state.requirements.filter((item) => item.status !== "discarded")
                .length === 24
            }
            label="8 needs and 16 requirements included"
          />
          <Gate
            ok={
              !state.requirements.some(
                (item) => item.id === "TMP-001" && item.status !== "discarded",
              )
            }
            label="Compound timing draft split"
          />
          <Gate
            ok={
              state.findings.length > 0 &&
              !state.findings.some(
                (item) => item.disposition.kind === "pending",
              )
            }
            label="Every finding has a human disposition"
          />
          <Gate
            ok={!highOpen}
            label="No open high-severity deterministic finding"
          />
        </div>
      </section>
    </div>
  );
}

function Baseline({
  state,
  busy,
  selectedId,
  onSelect,
  onPassage,
  onMutate,
}: {
  state: WorkspaceState;
  busy: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
  onPassage: (id: string) => void;
  onMutate: (url: string, body?: unknown) => Promise<WorkspaceState | null>;
}) {
  const items = state.baseline?.items ?? [];
  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  return (
    <div className="content">
      <PageHeading
        eyebrow="Immutable evidence handoff"
        title="Baseline and audit"
        body="The approved snapshot uses the same RhythmReview identifiers and wording as the separate change-impact demonstration."
        action={
          <button
            className="secondary danger"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  "Reset the fictional workspace to its five original source records?",
                )
              )
                void onMutate("/api/reset");
            }}
          >
            Reset workspace
          </button>
        }
      />
      {!state.baseline ? (
        <Empty
          title="No approved baseline yet"
          body="Complete author review, resolve the quality findings, submit the candidate, and approve it as Jamie Chen."
        />
      ) : (
        <>
          <div className="baseline-banner">
            <div>
              <p className="eyebrow">{state.baseline.id}</p>
              <h2>{state.baseline.label}</h2>
              <p>
                Approved by {state.baseline.approvedBy} ·{" "}
                {new Date(state.baseline.approvedAt).toLocaleString()}
              </p>
            </div>
            <div>
              <strong>{state.baseline.items.length}</strong>
              <span>approved items</span>
            </div>
          </div>
          <div className="baseline-layout">
            <aside>
              <div className="baseline-filter">
                <b>Approved evidence</b>
                <span>8 user needs · 16 requirements</span>
              </div>
              {items.map((item) => (
                <button
                  className={selected?.id === item.id ? "selected" : ""}
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                >
                  <code>{item.id}</code>
                  <span>
                    <b>{item.title}</b>
                    <small>{pretty(item.type)}</small>
                  </span>
                </button>
              ))}
            </aside>
            {selected && (
              <article className="baseline-detail">
                <div className="card-top">
                  <Chip tone="approved">Approved</Chip>
                  <code>{selected.id}</code>
                </div>
                <h2>{selected.title}</h2>
                <blockquote>{latest(selected)?.text}</blockquote>
                <p>{selected.rationale}</p>
                <dl>
                  <div>
                    <dt>Owner</dt>
                    <dd>{selected.owner}</dd>
                  </div>
                  <div>
                    <dt>Parent need</dt>
                    <dd>{selected.parentNeedId ?? "Not applicable"}</dd>
                  </div>
                  <div>
                    <dt>Versions retained</dt>
                    <dd>{selected.versions.length}</dd>
                  </div>
                </dl>
                <section>
                  <p className="eyebrow">Exact source passages</p>
                  <div className="citations">
                    {selected.sourcePassageIds.map((id) => (
                      <button key={id} onClick={() => onPassage(id)}>
                        {id}
                      </button>
                    ))}
                  </div>
                </section>
                <section>
                  <p className="eyebrow">Accepted discovery derivation</p>
                  <div className="citations">
                    {state.derivationLinks
                      .filter((link) => link.requirementId === selected.id)
                      .map((link) => (
                        <Chip
                          tone="approved"
                          key={`${link.requirementId}-${link.candidateId}`}
                        >
                          {link.candidateId}
                        </Chip>
                      ))}
                    {selected.decisionIds.map((id) => (
                      <Chip tone="approved" key={id}>
                        {id}
                      </Chip>
                    ))}
                  </div>
                </section>
                <section>
                  <p className="eyebrow">Original AI proposal</p>
                  <p>{selected.originalAiText}</p>
                </section>
                <div className="handoff-note">
                  <b>Compatible handoff</b>
                  <p>
                    This frozen contract matches the user-need and requirement
                    records in the independent RhythmReview change-impact demo.
                    No data moves between the applications.
                  </p>
                </div>
              </article>
            )}
          </div>
        </>
      )}
      <section className="audit-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Retained history</p>
            <h2>Audit events</h2>
          </div>
          <Chip>{state.audit.length} events</Chip>
        </div>
        {state.audit.map((event) => (
          <details key={event.id}>
            <summary>
              <span>
                <code>{event.action}</code>
                <b>{event.entityId}</b>
              </span>
              <small>
                {event.actor} · {new Date(event.createdAt).toLocaleString()}
              </small>
            </summary>
            <p>{event.detail}</p>
          </details>
        ))}
      </section>
    </div>
  );
}

function Gate({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={ok ? "ok" : "blocked"}>
      <span>{ok ? "✓" : "!"}</span>
      <b>{label}</b>
    </div>
  );
}
function ActionDialog({
  dialog,
  actor,
  busy,
  onClose,
  onSubmit,
}: {
  dialog: Exclude<Dialog, null>;
  actor: Actor;
  busy: boolean;
  onClose: () => void;
  onSubmit: (url: string, body: unknown) => Promise<void>;
}) {
  const [text, setText] = useState(
    dialog.kind === "candidate" ? dialog.candidate.currentText : "",
  );
  const [reason, setReason] = useState("");
  const [owner, setOwner] = useState("Product and clinical team");
  const [targetId, setTargetId] = useState("DC-001");
  const submit = async () => {
    if (dialog.kind === "candidate") {
      const base = { operation: dialog.operation, actor, reason };
      let body: unknown = base;
      if (dialog.operation === "edit") body = { ...base, text };
      if (dialog.operation === "defer") body = { ...base, owner };
      if (dialog.operation === "merge") body = { ...base, targetId };
      if (dialog.operation === "split")
        body = {
          ...base,
          parts: text
            .split("\n")
            .map((part) => part.trim())
            .filter(Boolean),
        };
      await onSubmit(`/api/discovery/${dialog.candidate.id}`, body);
      return;
    }
    if (dialog.kind === "finding") {
      await onSubmit(`/api/findings/${dialog.finding.id}`, {
        action: "resolved",
        actor,
        reason,
      });
      return;
    }
    await onSubmit("/api/workflow", { action: "return", actor, reason });
  };
  const title =
    dialog.kind === "candidate"
      ? `${pretty(dialog.operation)} ${dialog.candidate.id}`
      : dialog.kind === "finding"
        ? `Disposition for ${dialog.finding.id}`
        : "Return candidate to author";
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <p className="eyebrow">Human decision</p>
        <h2>{title}</h2>
        {dialog.kind === "candidate" &&
          (dialog.operation === "edit" || dialog.operation === "split") && (
            <label>
              <span>
                {dialog.operation === "split"
                  ? "One part per line"
                  : "Reviewed wording"}
              </span>
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
            </label>
          )}
        {dialog.kind === "candidate" && dialog.operation === "defer" && (
          <label>
            <span>Responsible owner</span>
            <input
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
            />
          </label>
        )}
        {dialog.kind === "candidate" && dialog.operation === "merge" && (
          <label>
            <span>Merge into candidate ID</span>
            <input
              value={targetId}
              onChange={(event) => setTargetId(event.target.value)}
            />
          </label>
        )}
        <label>
          <span>Reason</span>
          <textarea
            value={reason}
            placeholder="Record the evidence-based reason"
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button
            className="primary"
            disabled={busy || reason.trim().length < 2}
            onClick={() => void submit()}
          >
            Record decision
          </button>
        </div>
      </section>
    </div>
  );
}
