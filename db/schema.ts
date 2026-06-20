import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const words = pgTable("words", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  value: text().notNull().unique(),
  isReal: boolean("is_real").notNull(),
  difficulty: integer().notNull(),
  reviewed: boolean().notNull().default(false),
  reviewedAt: timestamp("reviewed_at"),
});

export const synonyms = pgTable("synonyms", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  wordId: integer("word_id")
    .notNull()
    .references(() => words.id),
  targetId: integer("target_id")
    .notNull()
    .references(() => words.id),
  relationType: text("relation_type").notNull(),
  distractors: integer("distractors").array().notNull(),
});

export const spellingChallenges = pgTable("spelling_challenges", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  contextSentence: text("context_sentence").notNull(),
  correctWordId: integer("correct_word_id")
    .notNull()
    .references(() => words.id),
  distractors: integer("distractors").array().notNull(),
});

export const definitions = pgTable("definitions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  wordId: integer("word_id")
    .notNull()
    .references(() => words.id),
  definitionText: text("definition_text").notNull(),
  distractors: integer("distractors").array().notNull(),
});

export const testHistory = pgTable("test_history", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  sessionId: text("session_id").notNull(),
  score: integer().notNull(),
  truthfulness: integer().notNull(),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});
