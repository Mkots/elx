import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  executeImport,
  type ImportConfig,
  mapRow,
  validateConfig,
} from "../scripts/importer_core.ts";

class MockDb {
  data: Record<string, unknown>[];
  calls: { type: string; data?: Record<string, unknown> }[] = [];

  constructor(initialData: Record<string, unknown>[]) {
    this.data = initialData;
  }

  select() {
    return {
      from: () => {
        return this.data;
      },
    };
  }

  insert() {
    return {
      values: (val: Record<string, unknown>) => {
        return {
          returning: () => {
            const nextId = this.data.length + 1;
            const newObj = { id: nextId, ...val };
            this.data.push(newObj);
            this.calls.push({ type: "insert", data: val });
            return [{ id: nextId }];
          },
        };
      },
    };
  }

  update() {
    return {
      set: (val: Record<string, unknown>) => {
        return {
          where: () => {
            this.calls.push({ type: "update", data: val });
          },
        };
      },
    };
  }
}

Deno.test("IMPORTER-CONFIG: validates format and essential mappings", () => {
  const validCsv: ImportConfig = {
    format: "csv",
    fields: {
      value: { from: "word" },
    },
  };
  assertEquals(validateConfig(validCsv), validCsv);

  // Invalid format
  assertThrows(() =>
    validateConfig({ format: "xml", fields: { value: { from: "word" } } })
  );

  // Missing fields
  assertThrows(() => validateConfig({ format: "csv" }));

  // Missing value mapping
  assertThrows(() =>
    validateConfig({ format: "csv", fields: { difficulty: { from: "diff" } } })
  );
});

Deno.test("IMPORTER-MAP-ROW: mappings, defaults, and type coercion", () => {
  const config: ImportConfig = {
    format: "csv",
    fields: {
      value: { from: "word" },
      isReal: {
        from: "real_flag",
        map: { "y": true, "n": false },
        default: true,
      },
      difficulty: { from: "level", default: 3 },
    },
  };

  // Full row
  const row1 = { word: " Apple ", real_flag: "y", level: 5 };
  assertEquals(mapRow(row1, config), {
    value: "apple",
    isReal: true,
    difficulty: 5,
    synonyms: [],
    antonyms: [],
    definition: null,
  });

  // Use defaults
  const row2 = { word: "banana" };
  assertEquals(mapRow(row2, config), {
    value: "banana",
    isReal: true,
    difficulty: 3,
    synonyms: [],
    antonyms: [],
    definition: null,
  });

  // Mapping fallback and coercion
  const config2: ImportConfig = {
    format: "csv",
    fields: {
      value: { from: 0 },
      isReal: { from: 1 },
      difficulty: { from: 2 },
    },
  };
  const row3 = ["cherry", "0", "4"];
  assertEquals(mapRow(row3, config2), {
    value: "cherry",
    isReal: false,
    difficulty: 4,
    synonyms: [],
    antonyms: [],
    definition: null,
  });
});

Deno.test("IMPORTER-MAP-ROW: validates difficulty bounds and invalid types", () => {
  const config: ImportConfig = {
    format: "csv",
    fields: {
      value: { from: "word" },
      difficulty: { from: "diff" },
    },
  };

  assertThrows(() => mapRow({ word: "apple", diff: 6 }, config));
  assertThrows(() => mapRow({ word: "apple", diff: 0 }, config));
  assertThrows(() => mapRow({ word: "apple", diff: "easy" }, config));
});

Deno.test("IMPORTER-EXECUTE: dry-run mode writes nothing to DB", async () => {
  const initialWords = [{ id: 1, value: "apple", isReal: true, difficulty: 2 }];
  const mockDb = new MockDb(initialWords);

  const fileContent = `word,real_flag,level\nbanana,yes,3\ncherry,no,1`;
  const config: ImportConfig = {
    format: "csv",
    fields: {
      value: { from: "word" },
      isReal: { from: "real_flag" },
      difficulty: { from: "level" },
    },
  };

  const result = await executeImport(mockDb, fileContent, config, true);
  assertEquals(result.inserted, 2);
  assertEquals(result.failed, 0);
  assertEquals(mockDb.calls.length, 0, "Dry run should not perform DB writes");
});

Deno.test("IMPORTER-EXECUTE: conflict strategies: update, skip, error", async () => {
  const config: ImportConfig = {
    format: "csv",
    fields: {
      value: { from: "word" },
      isReal: { from: "real_flag" },
      difficulty: { from: "level" },
    },
    onConflict: "update",
  };

  // Test: update
  {
    const db = new MockDb([{
      id: 1,
      value: "apple",
      isReal: true,
      difficulty: 2,
    }]);
    const file = `word,real_flag,level\napple,true,5`;
    const res = await executeImport(db, file, config);
    assertEquals(res.updated, 1);
    assertEquals(db.data.find((w) => w.value === "apple")?.difficulty, 5);
  }

  // Test: skip
  {
    config.onConflict = "skip";
    const db = new MockDb([{
      id: 1,
      value: "apple",
      isReal: true,
      difficulty: 2,
    }]);
    const file = `word,real_flag,level\napple,true,5`;
    const res = await executeImport(db, file, config);
    assertEquals(res.skipped, 1);
    assertEquals(res.updated, 0);
    assertEquals(db.data.find((w) => w.value === "apple")?.difficulty, 2);
  }

  // Test: error
  {
    config.onConflict = "error";
    const db = new MockDb([{
      id: 1,
      value: "apple",
      isReal: true,
      difficulty: 2,
    }]);
    const file = `word,real_flag,level\napple,true,5`;
    const res = await executeImport(db, file, config);
    assertEquals(res.failed, 1);
    assertEquals(res.errors.length, 1);
    assert(res.errors[0].reason.includes("already exists"));
  }
});

Deno.test("IMPORTER-EXECUTE: stamps bankVersion on both inserted and updated rows", async () => {
  const config: ImportConfig = {
    format: "csv",
    fields: {
      value: { from: "word" },
      isReal: { from: "real_flag" },
      difficulty: { from: "level" },
    },
    onConflict: "update",
  };

  const db = new MockDb([{
    id: 1,
    value: "apple",
    isReal: true,
    difficulty: 2,
    bankVersion: "pre-manifest",
  }]);
  const file = `word,real_flag,level\napple,true,5\nbanana,true,3`;

  const res = await executeImport(db, file, config, false, "sha256:abc");
  assertEquals(res.updated, 1);
  assertEquals(res.inserted, 1);
  assertEquals(
    db.data.find((w) => w.value === "apple")?.bankVersion,
    "sha256:abc",
  );
  assertEquals(
    db.data.find((w) => w.value === "banana")?.bankVersion,
    "sha256:abc",
  );
});

Deno.test("IMPORTER-MAP-ROW: array splitting and definition loading", () => {
  const config: ImportConfig = {
    format: "csv",
    fields: {
      value: { from: "word" },
      synonyms: { from: "syns", splitBy: ";" },
      antonyms: { from: "ants", splitBy: ";" },
      definition: { from: "def" },
    },
  };

  const row = {
    word: "morning",
    syns: "sunrise;dawn",
    ants: "night;dusk",
    def: "The period of time between midnight and noon",
  };

  assertEquals(mapRow(row, config), {
    value: "morning",
    isReal: true,
    difficulty: 1,
    synonyms: ["sunrise", "dawn"],
    antonyms: ["night", "dusk"],
    definition: "The period of time between midnight and noon",
  });
});

Deno.test("IMPORTER-EXECUTE: updates wide fields on conflict", async () => {
  const config: ImportConfig = {
    format: "json",
    fields: {
      value: { from: "word" },
      synonyms: { from: "syns" },
      antonyms: { from: "ants" },
      definition: { from: "def" },
    },
    onConflict: "update",
  };

  const db = new MockDb([{
    id: 1,
    value: "morning",
    isReal: true,
    difficulty: 1,
    synonyms: ["sunrise"],
    antonyms: [],
    definition: "old definition",
  }]);

  const file = JSON.stringify([
    {
      word: "morning",
      syns: ["sunrise", "dawn"],
      ants: ["night"],
      def: "new definition",
    },
  ]);

  const res = await executeImport(db, file, config);
  assertEquals(res.updated, 1);
  const updatedWord = db.data.find((w) => w.value === "morning");
  assertEquals(updatedWord?.synonyms, ["sunrise", "dawn"]);
  assertEquals(updatedWord?.antonyms, ["night"]);
  assertEquals(updatedWord?.definition, "new definition");
});
