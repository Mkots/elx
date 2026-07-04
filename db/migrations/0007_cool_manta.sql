CREATE TABLE "test_answers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "test_answers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"session_id" uuid NOT NULL,
	"question_index" integer NOT NULL,
	"question_type" text NOT NULL,
	"stage" integer NOT NULL,
	"answer" text,
	"is_correct" boolean,
	"answered_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ticket_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"score" integer,
	"truthfulness" integer,
	"stage1_selection" jsonb
);
--> statement-breakpoint
ALTER TABLE "test_answers" ADD CONSTRAINT "test_answers_session_id_test_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."test_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_sessions" ADD CONSTRAINT "test_sessions_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
INSERT INTO "test_sessions" ("id", "ticket_id", "created_at", "completed_at", "score", "truthfulness")
SELECT DISTINCT ON ("session_id") "session_id"::uuid, "ticket_id", "completed_at", "completed_at", "score", "truthfulness"
FROM "test_history"
ORDER BY "session_id", "completed_at" DESC;--> statement-breakpoint
DROP TABLE "test_history";