import { assertEquals } from "@std/assert";
import { sql } from "drizzle-orm";
import { db } from "../db/client.ts";

const MIGRATION_PATH = "db/migrations/0007_cool_manta.sql";

/**
 * Replays migration 0007 inside a throwaway schema against a hand-seeded
 * `test_history` table, so we can verify the copy-then-drop logic without
 * depending on the migration having already run against `public`. FK
 * constraint statements are skipped since drizzle-kit hardcodes them against
 * the `public` schema (they'd point at the wrong copy of the tables here);
 * this test only exercises the data-preserving CREATE/INSERT/DROP steps.
 */
Deno.test({
  name:
    "VER-MIGRATION-0007: legacy test_history rows migrate into test_sessions without losing count or scores",
  ignore: !Deno.env.get("DATABASE_URL"),
  async fn() {
    const schemaName = `migration_check_${Date.now()}`;

    try {
      await db.execute(sql.raw(`CREATE SCHEMA "${schemaName}"`));
      await db.execute(sql.raw(`SET search_path TO "${schemaName}"`));

      await db.execute(
        sql.raw(`
          CREATE TABLE test_history (
            id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            session_id text NOT NULL,
            score integer NOT NULL,
            truthfulness integer NOT NULL,
            completed_at timestamp NOT NULL DEFAULT now(),
            ticket_id integer
          )
        `),
      );

      const sessionA = crypto.randomUUID();
      const sessionB = crypto.randomUUID();
      await db.execute(
        sql.raw(`
          INSERT INTO test_history (session_id, score, truthfulness, completed_at)
          VALUES
            ('${sessionA}', 12, 90, '2026-01-01 10:00:00'),
            ('${sessionB}', -3, 40, '2026-01-02 11:00:00')
        `),
      );

      const migrationSql = await Deno.readTextFile(MIGRATION_PATH);
      const statements = migrationSql
        .split("--> statement-breakpoint")
        .map((statement) => statement.trim())
        .filter((statement) =>
          statement.length > 0 && !statement.startsWith("ALTER TABLE")
        );

      for (const statement of statements) {
        await db.execute(sql.raw(statement));
      }

      const sessions = await db.execute<
        { id: string; score: number; stage1_selection: number[] | null }
      >(
        sql.raw(
          `SELECT id, score, stage1_selection FROM test_sessions ORDER BY score`,
        ),
      );
      assertEquals(sessions.length, 2);
      assertEquals(sessions[0].id, sessionB);
      assertEquals(sessions[0].score, -3);
      assertEquals(sessions[0].stage1_selection, null);
      assertEquals(sessions[1].id, sessionA);
      assertEquals(sessions[1].score, 12);

      const totalScore = sessions.reduce((sum, row) => sum + row.score, 0);
      assertEquals(totalScore, 12 + -3);

      const historyGone = await db.execute<{ t: string | null }>(
        sql.raw(`SELECT to_regclass('test_history') as t`),
      );
      assertEquals(historyGone[0].t, null);
    } finally {
      await db.execute(sql.raw(`SET search_path TO public`));
      await db.execute(
        sql.raw(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`),
      );
    }
  },
});
