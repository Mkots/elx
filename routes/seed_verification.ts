import { Hono } from "@hono/hono";
import type { Services } from "../db/services.ts";

export function createSeedVerificationRoute(services: Services) {
  const route = new Hono();

  route.get("/words", async (context) => {
    const items = await services.words.loadWords();
    return context.json({ category: "words", count: items.length, items });
  });

  route.get("/synonyms", async (context) => {
    const items = await services.words.loadSynonyms();
    return context.json({ category: "synonyms", count: items.length, items });
  });

  route.get("/spelling", async (context) => {
    const items = await services.words.loadSpelling();
    return context.json({ category: "spelling", count: items.length, items });
  });

  route.get("/meanings", async (context) => {
    const items = await services.words.loadMeanings();
    return context.json({ category: "meanings", count: items.length, items });
  });

  return route;
}
