import { eq, sql } from "drizzle-orm";
import { withDb } from "../../../db/client.ts";
import { ticketConfigs, words } from "../../../db/schema.ts";

export interface TicketConfigData {
  name: string;
  isActive: boolean;
  difficulty1Count: number;
  difficulty2Count: number;
  difficulty3Count: number;
  difficulty4Count: number;
  difficulty5Count: number;
  realCount: number;
  pseudoCount: number;
  synonymsCount: number;
  spellingCount: number;
  definitionCount: number;
  randomizeOrder: boolean;
}

export interface DatabaseWordStats {
  totalReal: number;
  totalPseudo: number;
  diffCounts: Record<number, number>; // difficulty -> count
  realSynonyms: number; // real words that have synonyms
  realDefinitions: number; // real words that have a definition
}

export interface AdminTicketConfigLoader {
  getActiveConfig(): Promise<typeof ticketConfigs.$inferSelect>;
  updateActiveConfig(data: TicketConfigData): Promise<void>;
  getDatabaseWordStats(): Promise<DatabaseWordStats>;
}

export const databaseAdminTicketConfigLoader: AdminTicketConfigLoader = {
  async getActiveConfig() {
    return await withDb(async (db) => {
      // Find the first active config
      const active = await db
        .select()
        .from(ticketConfigs)
        .where(eq(ticketConfigs.isActive, true))
        .limit(1);

      if (active.length > 0) {
        return active[0];
      }

      // If no active, find any config
      const anyConfig = await db
        .select()
        .from(ticketConfigs)
        .limit(1);

      if (anyConfig.length > 0) {
        // Mark it as active
        await db
          .update(ticketConfigs)
          .set({ isActive: true })
          .where(eq(ticketConfigs.id, anyConfig[0].id));
        return { ...anyConfig[0], isActive: true };
      }

      // If absolutely no configs, insert a default one
      const [newConfig] = await db
        .insert(ticketConfigs)
        .values({
          name: "Default Config",
          isActive: true,
          difficulty1Count: 8,
          difficulty2Count: 10,
          difficulty3Count: 10,
          difficulty4Count: 9,
          difficulty5Count: 8,
          realCount: 30,
          pseudoCount: 15,
          synonymsCount: 5,
          spellingCount: 5,
          definitionCount: 5,
          randomizeOrder: true,
        })
        .returning();

      return newConfig;
    });
  },

  async updateActiveConfig(data) {
    await withDb(async (db) => {
      const active = await this.getActiveConfig();
      await db
        .update(ticketConfigs)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(ticketConfigs.id, active.id));
    });
  },

  async getDatabaseWordStats() {
    return await withDb(async (db) => {
      // Query counts of real and pseudo words
      const counts = await db
        .select({
          isReal: words.isReal,
          count: sql<number>`count(${words.id})::integer`,
        })
        .from(words)
        .groupBy(words.isReal);

      let totalReal = 0;
      let totalPseudo = 0;
      for (const row of counts) {
        if (row.isReal) {
          totalReal = row.count;
        } else {
          totalPseudo = row.count;
        }
      }

      // Query counts per difficulty
      const diffRows = await db
        .select({
          difficulty: words.difficulty,
          count: sql<number>`count(${words.id})::integer`,
        })
        .from(words)
        .groupBy(words.difficulty);

      const diffCounts: Record<number, number> = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      };
      for (const row of diffRows) {
        if (row.difficulty >= 1 && row.difficulty <= 5) {
          diffCounts[row.difficulty] = row.count;
        }
      }

      // Query real words with synonyms
      const synonymsResult = await db
        .select({
          count: sql<number>`count(${words.id})::integer`,
        })
        .from(words)
        .where(
          sql`is_real = true AND (synonyms IS NOT NULL AND cardinality(synonyms) > 0)`,
        );
      const realSynonyms = synonymsResult[0]?.count ?? 0;

      // Query real words with definition
      const definitionResult = await db
        .select({
          count: sql<number>`count(${words.id})::integer`,
        })
        .from(words)
        .where(
          sql`is_real = true AND (definition IS NOT NULL AND definition <> '')`,
        );
      const realDefinitions = definitionResult[0]?.count ?? 0;

      return {
        totalReal,
        totalPseudo,
        diffCounts,
        realSynonyms,
        realDefinitions,
      };
    });
  },
};
