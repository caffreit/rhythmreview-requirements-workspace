import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const workspaceStates = sqliteTable(
  "workspace_states",
  {
    id: text("id").primaryKey(),
    stateJson: text("state_json").notNull(),
    revision: integer("revision").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("idx_workspace_states_updated_at").on(table.updatedAt)],
);
