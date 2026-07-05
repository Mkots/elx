import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
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
  verified?: boolean;
}

export interface SpellingSnapshotQuestion extends BaseSnapshotQuestion {
  type: "spelling";
  contextSentence: string;
  correctText: string;
  distractors: string[];
  verified?: boolean;
}

export interface DefinitionSnapshotQuestion extends BaseSnapshotQuestion {
  type: "definition";
  definitionText: string;
  correctText: string;
  distractors: string[];
  verified?: boolean;
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
  bankVersion: text("bank_version").notNull().default("pre-manifest"),
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

export const testSessions = pgTable("test_sessions", {
  id: uuid("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => tickets.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  consentedAt: timestamp("consented_at"),
  completedAt: timestamp("completed_at"),
  score: integer("score"),
  truthfulness: integer("truthfulness"),
  stage1Selection: jsonb("stage1_selection").$type<number[]>(),
  vocabularySize: integer("vocabulary_size"),
});

export const testAnswers = pgTable(
  "test_answers",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    sessionId: uuid("session_id").notNull().references(() => testSessions.id, {
      onDelete: "cascade",
    }),
    questionIndex: integer("question_index").notNull(),
    questionType: text("question_type").notNull(),
    stage: integer("stage").notNull(),
    answer: text("answer"),
    isCorrect: boolean("is_correct"),
    answeredAt: timestamp("answered_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("test_answers_session_stage_question_idx").on(
      table.sessionId,
      table.stage,
      table.questionIndex,
    ),
  ],
);

export const adminSessions = pgTable("admin_sessions", {
  id: uuid("id").primaryKey(),
  username: text("username").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
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
