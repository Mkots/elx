import { assertEquals } from "@std/assert";
import { runPipeline } from "./run.ts";

const scriptDir = import.meta.dirname ?? ".";
const dataDir = `${scriptDir}/testdata`;

const ARTIFACTS = [
  "ALL.clean.csv",
  "ALL.enriched.csv",
  "pseudowords.csv",
  "distractors.csv",
  "phonetic_distractors.csv",
  "gap_sentences.csv",
];

Deno.test("VER-PIPELINE: two runs against the same inputs and seed produce byte-identical artifacts", async () => {
  const outDirA = await Deno.makeTempDir();
  const outDirB = await Deno.makeTempDir();
  try {
    await runPipeline({
      dataDir,
      outDir: outDirA,
      seed: 42,
      pseudowordCount: 3,
    });
    await runPipeline({
      dataDir,
      outDir: outDirB,
      seed: 42,
      pseudowordCount: 3,
    });

    for (const artifact of ARTIFACTS) {
      const a = await Deno.readTextFile(`${outDirA}/${artifact}`);
      const b = await Deno.readTextFile(`${outDirB}/${artifact}`);
      assertEquals(
        a,
        b,
        `${artifact} differed between two runs with the same seed`,
      );
    }
  } finally {
    await Deno.remove(outDirA, { recursive: true });
    await Deno.remove(outDirB, { recursive: true });
  }
});

Deno.test("VER-PIPELINE: a different seed changes the RNG-dependent artifacts", async () => {
  const outDirA = await Deno.makeTempDir();
  const outDirB = await Deno.makeTempDir();
  try {
    await runPipeline({
      dataDir,
      outDir: outDirA,
      seed: 42,
      pseudowordCount: 3,
    });
    await runPipeline({
      dataDir,
      outDir: outDirB,
      seed: 99,
      pseudowordCount: 3,
    });

    const pseudowordsA = await Deno.readTextFile(`${outDirA}/pseudowords.csv`);
    const pseudowordsB = await Deno.readTextFile(`${outDirB}/pseudowords.csv`);
    assertEquals(pseudowordsA === pseudowordsB, false);
  } finally {
    await Deno.remove(outDirA, { recursive: true });
    await Deno.remove(outDirB, { recursive: true });
  }
});

Deno.test("VER-PIPELINE: manifest records a stage entry per stage with row counts and input hashes", async () => {
  const outDir = await Deno.makeTempDir();
  try {
    const manifest = await runPipeline({
      dataDir,
      outDir,
      seed: 42,
      pseudowordCount: 3,
    });

    assertEquals(manifest.stages.length, 6);
    for (const stage of manifest.stages) {
      assertEquals(typeof stage.inputHash, "string");
      assertEquals(stage.inputHash.length, 64); // sha256 hex digest
      assertEquals(stage.rowCount > 0, true);
    }
  } finally {
    await Deno.remove(outDir, { recursive: true });
  }
});
