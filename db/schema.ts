import { sql } from "drizzle-orm";
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
  synonyms: text("synonyms").array().notNull().default(sql`'{}'::text[]`),
  antonyms: text("antonyms").array().notNull().default(sql`'{}'::text[]`),
  definition: text("definition"),
});

export const testHistory = pgTable("test_history", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  sessionId: text("session_id").notNull(),
  score: integer().notNull(),
  truthfulness: integer().notNull(),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});
