CREATE TABLE "admin_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "test_answers_session_stage_question_idx" ON "test_answers" USING btree ("session_id","stage","question_index");