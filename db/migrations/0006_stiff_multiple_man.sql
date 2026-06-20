CREATE TABLE "ticket_configs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ticket_configs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"difficulty_1_count" integer DEFAULT 12 NOT NULL,
	"difficulty_2_count" integer DEFAULT 12 NOT NULL,
	"difficulty_3_count" integer DEFAULT 12 NOT NULL,
	"difficulty_4_count" integer DEFAULT 12 NOT NULL,
	"difficulty_5_count" integer DEFAULT 12 NOT NULL,
	"real_count" integer DEFAULT 40 NOT NULL,
	"pseudo_count" integer DEFAULT 20 NOT NULL,
	"synonyms_count" integer DEFAULT 10 NOT NULL,
	"spelling_count" integer DEFAULT 10 NOT NULL,
	"definition_count" integer DEFAULT 10 NOT NULL,
	"randomize_order" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_configs_name_unique" UNIQUE("name")
);
