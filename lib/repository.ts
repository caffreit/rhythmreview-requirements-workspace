import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { workspaceStates } from "@/db/schema";
import { WorkspaceStateSchema, type WorkspaceState } from "./domain";
import { createInitialState } from "./seed";

const WORKSPACE_ID = "rhythmreview-requirements";
let schemaReady: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  schemaReady ??= (async () => {
    await env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS workspace_states (id text PRIMARY KEY NOT NULL, state_json text NOT NULL, revision integer NOT NULL, updated_at text NOT NULL)",
    ).run();
    await env.DB.prepare(
      "CREATE INDEX IF NOT EXISTS idx_workspace_states_updated_at ON workspace_states(updated_at)",
    ).run();
  })();
  return schemaReady;
}

export async function readWorkspace(): Promise<WorkspaceState> {
  await ensureSchema();
  const db = getDb();
  const row = await db
    .select()
    .from(workspaceStates)
    .where(eq(workspaceStates.id, WORKSPACE_ID))
    .get();
  if (row) return WorkspaceStateSchema.parse(JSON.parse(row.stateJson));
  const initial = createInitialState();
  await saveWorkspace(initial);
  return initial;
}

export async function saveWorkspace(state: WorkspaceState): Promise<void> {
  await ensureSchema();
  const db = getDb();
  const now = new Date().toISOString();
  await db
    .insert(workspaceStates)
    .values({
      id: WORKSPACE_ID,
      stateJson: JSON.stringify(state),
      revision: state.revision,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: workspaceStates.id,
      set: {
        stateJson: JSON.stringify(state),
        revision: state.revision,
        updatedAt: now,
      },
    });
}

export async function changeWorkspace(
  update: (state: WorkspaceState) => WorkspaceState | Promise<WorkspaceState>,
): Promise<WorkspaceState> {
  const current = await readWorkspace();
  const next = await update(current);
  await saveWorkspace(next);
  return next;
}
