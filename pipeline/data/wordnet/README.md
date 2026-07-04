# WordNet Lexical Index ("rabbits")

Princeton WordNet, pre-processed into a lookup-friendly shape for
`pipeline/enrich.ts`: one `entries-<letter>.json` per first letter (headword ->
POS -> pronunciation/senses), one `<lexname>.json` per lexicographer file
(synset id -> definition/examples/hypernyms/members), and `frames.json` for verb
subcategorization frames.

- **Source**: Princeton WordNet 3.1 — https://wordnet.princeton.edu/
- **License**: WordNet License (permissive, see the official site)

## Regenerating

There is no automated fetch script for this directory yet (it predates this
pipeline restructure). Not committed (see `.gitignore`) — it's ~70MB of derived
JSON. Ask the project owner for the current dataset, or rebuild it from a
WordNet database dump grouped by the lexicographer files listed in
`pipeline/enrich.ts`'s `LEXNAMES`.
