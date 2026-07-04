#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net --allow-run
/**
 * Tatoeba downloader & filter
 *
 * Downloads the English Tatoeba sentences archive (~33MB), extracts it,
 * filters it to keep only sentences matching words in the vocabulary,
 * and saves a small, pre-filtered subset in the repository.
 *
 * Usage:
 *   deno run --allow-all pipeline/data/tatoeba/download_tatoeba.ts
 */

import { parse as parseCsv } from "@std/csv";

async function main() {
  const scriptDir = import.meta.dirname ?? ".";
  const targetDir = `${scriptDir}`;
  const archivePath = `${targetDir}/eng_sentences_detailed.tsv.bz2`;
  const tsvPath = `${targetDir}/eng_sentences_detailed.tsv`;
  const filteredPath = `${targetDir}/eng_sentences_filtered.tsv`;
  const vocabularyPath = `${scriptDir}/../../out/ALL.enriched.csv`;

  // 1. Read the vocabulary words from ALL.enriched.csv
  console.log(`Reading vocabulary from ${vocabularyPath}...`);
  const csvText = await Deno.readTextFile(vocabularyPath);
  const records = parseCsv(csvText, { skipFirstRow: true }) as Record<
    string,
    string
  >[];

  const vocab = new Set<string>();
  for (const r of records) {
    const word = (r.headword ?? "").trim().toLowerCase();
    if (word) vocab.add(word);
  }
  console.log(`Loaded ${vocab.size} vocabulary words.`);

  // 2. Download the archive
  const url =
    "https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences_detailed.tsv.bz2";
  console.log(`Downloading ${url}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.statusText}`);
  }

  const file = await Deno.open(archivePath, { write: true, create: true });
  await response.body?.pipeTo(file.writable);
  console.log(`Downloaded archive to ${archivePath}`);

  // 3. Decompress the archive using bunzip2
  console.log(`Decompressing ${archivePath}...`);
  const cmd = new Deno.Command("bunzip2", {
    args: ["-k", "-f", archivePath],
  });
  const { code, stderr } = await cmd.output();
  if (code !== 0) {
    const errText = new TextDecoder().decode(stderr);
    throw new Error(`bunzip2 failed with code ${code}: ${errText}`);
  }
  console.log(`Decompressed to ${tsvPath}`);

  // 4. Parse and filter the sentences
  console.log("Filtering sentences...");
  const tsvContent = await Deno.readTextFile(tsvPath);
  const lines = tsvContent.split("\n");

  // Map of word -> array of sentences
  const wordSentences: Record<string, string[]> = {};
  const keepSentences = new Map<string, string>(); // id -> text

  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split("\t");
    if (parts.length < 3) continue;

    const id = parts[0].trim();
    const text = parts[2].trim();
    if (!id || !text) continue;

    // Tokenize text to check matching vocabulary words
    const tokens = text.toLowerCase().split(/[^a-z0-9]+/);
    for (const token of tokens) {
      if (vocab.has(token)) {
        if (!wordSentences[token]) {
          wordSentences[token] = [];
        }
        // Limit to at most 10 sentences per word to keep the subset small
        if (wordSentences[token].length < 10) {
          wordSentences[token].push(text);
          keepSentences.set(id, text);
        }
      }
    }
  }

  console.log(
    `Selected ${keepSentences.size} unique sentences for vocabulary words.`,
  );

  // 5. Write the filtered sentences to a TSV file
  let outText = "";
  for (const [id, text] of keepSentences.entries()) {
    outText += `${id}\t${text}\n`;
  }
  await Deno.writeTextFile(filteredPath, outText);
  console.log(`Filtered sentences written to ${filteredPath}`);

  // 6. Clean up temporary files
  console.log("Cleaning up temporary files...");
  try {
    await Deno.remove(archivePath);
    await Deno.remove(tsvPath);
  } catch (err) {
    console.warn("Failed to remove temporary files:", err);
  }

  console.log("Done successfully!");
}

if (import.meta.main) {
  await main();
}
