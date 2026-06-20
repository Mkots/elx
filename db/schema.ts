import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export type QuestionType =
  | "verification"
  | "synonym"
  | "spelling"
  | "definition";

export interface BaseSnapshotQuestion {
  type: QuestionType;
}

export interface VerificationSnapshotQuestion extends BaseSnapshotQuestion {
  type: "verification";
  wordText: string;
  isReal: boolean;
}

export interface SynonymSnapshotQuestion extends BaseSnapshotQuestion {
  type: "synonym";
  promptText: string;
  correctText: string;
  distractors: string[];
}

export interface SpellingSnapshotQuestion extends BaseSnapshotQuestion {
  type: "spelling";
  contextSentence: string;
  correctText: string;
  distractors: string[];
}

export interface DefinitionSnapshotQuestion extends BaseSnapshotQuestion {
  type: "definition";
  definitionText: string;
  correctText: string;
  distractors: string[];
}

export type SnapshotQuestion =
  | VerificationSnapshotQuestion
  | SynonymSnapshotQuestion
  | SpellingSnapshotQuestion
  | DefinitionSnapshotQuestion;

export const words = pgTable("words", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  value: text().notNull().unique(),
  isReal: boolean("is_real").notNull(),
  difficulty: integer().notNull(),
  reviewed: boolean().notNull().default(false),
  reviewedAt: timestamp("reviewed_at"),
  synonyms: text("synonyms").array().notNull().default(sql`'{}'::text[]`),
  antonyms: text("antonyms").array().notNull().default(sql`'{}'::text[]`),
  definition: text("definition"),
});

export const tickets = pgTable("tickets", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  code: text("code").notNull().unique(),
  status: text("status").notNull().default("draft"), // draft | base | complete | published
  title: text("title"),
  notes: text("notes"),
  questions: jsonb("questions").$type<SnapshotQuestion[]>().notNull().default(
    sql`'[]'::jsonb`,
  ),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const testHistory = pgTable("test_history", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  sessionId: text("session_id").notNull(),
  score: integer().notNull(),
  truthfulness: integer().notNull(),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
  ticketId: integer("ticket_id").references(() => tickets.id),
});

export const ticketConfigs = pgTable("ticket_configs", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  isActive: boolean("is_active").notNull().default(false),
  difficulty1Count: integer("difficulty_1_count").notNull().default(12),
  difficulty2Count: integer("difficulty_2_count").notNull().default(12),
  difficulty3Count: integer("difficulty_3_count").notNull().default(12),
  difficulty4Count: integer("difficulty_4_count").notNull().default(12),
  difficulty5Count: integer("difficulty_5_count").notNull().default(12),
  realCount: integer("real_count").notNull().default(40),
  pseudoCount: integer("pseudo_count").notNull().default(20),
  synonymsCount: integer("synonyms_count").notNull().default(10),
  spellingCount: integer("spelling_count").notNull().default(10),
  definitionCount: integer("definition_count").notNull().default(10),
  randomizeOrder: boolean("randomize_order").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
