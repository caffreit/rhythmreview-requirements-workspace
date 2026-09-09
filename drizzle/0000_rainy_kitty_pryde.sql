CREATE TABLE `workspace_states` (
	`id` text PRIMARY KEY NOT NULL,
	`state_json` text NOT NULL,
	`revision` integer NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_workspace_states_updated_at` ON `workspace_states` (`updated_at`);