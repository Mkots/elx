ALTER TABLE "words" ADD COLUMN "reviewed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "words" ADD COLUMN "reviewed_at" timestamp;