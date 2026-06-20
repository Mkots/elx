ALTER TABLE "words" ADD COLUMN "synonyms" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "words" ADD COLUMN "antonyms" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "words" ADD COLUMN "definition" text;--> statement-breakpoint

-- Backfill synonyms
WITH aggregated_synonyms AS (
  SELECT s.word_id, array_agg(w_target.value) AS syn_list
  FROM synonyms s
  JOIN words w_target ON s.target_id = w_target.id
  WHERE s.relation_type = 'synonym'
  GROUP BY s.word_id
)
UPDATE words w
SET synonyms = a.syn_list
FROM aggregated_synonyms a
WHERE w.id = a.word_id;
--> statement-breakpoint

-- Backfill antonyms
WITH aggregated_antonyms AS (
  SELECT s.word_id, array_agg(w_target.value) AS ant_list
  FROM synonyms s
  JOIN words w_target ON s.target_id = w_target.id
  WHERE s.relation_type = 'antonym'
  GROUP BY s.word_id
)
UPDATE words w
SET antonyms = a.ant_list
FROM aggregated_antonyms a
WHERE w.id = a.word_id;
--> statement-breakpoint

-- Backfill definitions
WITH word_definitions AS (
  SELECT DISTINCT ON (word_id) word_id, definition_text
  FROM definitions
  ORDER BY word_id, id
)
UPDATE words w
SET definition = d.definition_text
FROM word_definitions d
WHERE w.id = d.word_id;