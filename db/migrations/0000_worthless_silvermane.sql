CREATE TABLE "words" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "words_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"value" text NOT NULL,
	"is_real" boolean NOT NULL,
	"difficulty" integer NOT NULL,
	CONSTRAINT "words_value_unique" UNIQUE("value")
);
