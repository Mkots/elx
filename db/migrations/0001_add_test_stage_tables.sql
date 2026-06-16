CREATE TABLE "synonyms" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "synonyms_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"word_id" integer NOT NULL,
	"target_id" integer NOT NULL,
	"relation_type" text NOT NULL,
	"distractors" integer[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spelling_challenges" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "spelling_challenges_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"context_sentence" text NOT NULL,
	"correct_word_id" integer NOT NULL,
	"distractors" integer[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "definitions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "definitions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"word_id" integer NOT NULL,
	"definition_text" text NOT NULL,
	"distractors" integer[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_history" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "test_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"session_id" text NOT NULL,
	"score" integer NOT NULL,
	"truthfulness" integer NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "synonyms" ADD CONSTRAINT "synonyms_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "synonyms" ADD CONSTRAINT "synonyms_target_id_words_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."words"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "spelling_challenges" ADD CONSTRAINT "spelling_challenges_correct_word_id_words_id_fk" FOREIGN KEY ("correct_word_id") REFERENCES "public"."words"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "definitions" ADD CONSTRAINT "definitions_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE no action ON UPDATE no action;
