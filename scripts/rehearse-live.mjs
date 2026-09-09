const baseUrl = process.env.DEMO_BASE_URL ?? "http://localhost:3001";
const ALEX = "Alex Morgan · Product and systems author";
const JAMIE = "Jamie Chen · QA reviewer";
const ids = [
  ...Array.from(
    { length: 8 },
    (_, index) => `UN-${String(index + 1).padStart(3, "0")}`,
  ),
  ...Array.from(
    { length: 16 },
    (_, index) => `REQ-${String(index + 1).padStart(3, "0")}`,
  ),
];

async function call(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(`${path}: ${result.error ?? response.status}`);
  return result;
}

async function rehearse() {
  await call("/api/reset", {});
  await call("/api/extraction", { mode: "replay" });
  await call("/api/discovery/DC-004", {
    operation: "reject",
    actor: ALEX,
    reason: "Diagnosis conflicts with the agreed decision-support role.",
  });
  await call("/api/discovery/DC-002", {
    operation: "edit",
    actor: ALEX,
    text: "The clinician needs a result quickly enough to use during the active review workflow.",
    reason: "Express the underlying need without a locally variable phrase.",
  });
  await call("/api/decisions", { action: "resolve", kind: "age", actor: ALEX });
  await call("/api/decisions", {
    action: "resolve",
    kind: "retention",
    actor: ALEX,
  });
  await call("/api/decisions", { action: "complete_replay", actor: ALEX });
  await call("/api/requirements/draft", { mode: "replay" });
  await call("/api/requirements/TMP-001", {
    operation: "split_timing",
    actor: ALEX,
    reason: "Separate the result deadline from timeout behavior.",
  });
  for (const id of ids)
    await call(`/api/requirements/${id}`, {
      operation: "canonical",
      actor: ALEX,
    });
  let state = await call("/api/quality", { actor: ALEX });
  for (const finding of state.findings) {
    state = await call(`/api/findings/${finding.id}`, {
      action: "resolved",
      actor: ALEX,
      reason: "Reviewed against the cited evidence and controlled wording.",
    });
  }
  await call("/api/workflow", { action: "submit", actor: ALEX });
  state = await call("/api/workflow", { action: "approve", actor: JAMIE });
  if (state.workflow !== "approved" || state.baseline?.items.length !== 24) {
    throw new Error("The approved baseline did not contain 24 items.");
  }
  const active = state.baseline.items;
  if (
    active.some(
      (item) =>
        item.sourcePassageIds.length === 0 && item.decisionIds.length === 0,
    )
  ) {
    throw new Error("An approved item lacks provenance.");
  }
  if (!state.derivationLinks.some((link) => link.requirementId === "REQ-004")) {
    throw new Error("REQ-004 has no accepted discovery derivation.");
  }
  console.log(
    `Live rehearsal passed at ${baseUrl}: 5 sources → ${state.candidates.length} discovery candidates → 24 immutable approved items.`,
  );
}

try {
  await rehearse();
} finally {
  if (process.env.DEMO_KEEP_STATE !== "1") await call("/api/reset", {});
}
