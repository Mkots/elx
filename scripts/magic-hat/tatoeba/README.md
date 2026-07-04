# Tatoeba English Sentences Subset

This directory contains a pre-filtered offline subset of English sentences from
the Tatoeba database.

## Data Source & License

- **Source**: Tatoeba (sentences and translations project)
- **Official URL**: https://tatoeba.org/
- **Export URL**:
  https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences_detailed.tsv.bz2
- **License**: Creative Commons Attribution 2.0 France (CC BY 2.0 FR)
- **Format**: Tab-separated values (TSV) in the format `ID \t text`

## Filtering Script & Instructions

The file `eng_sentences_filtered.tsv` was created using `download_tatoeba.ts`.
It downloads the raw archive, decompresses it, and filters the sentences to
include only those containing matching vocabulary words in `ALL.enriched.csv`
(keeping at most 10 sentences per word to save space).

To update the filtered subset, run the script:

```bash
deno run --allow-all scripts/magic-hat/tatoeba/download_tatoeba.ts
```
