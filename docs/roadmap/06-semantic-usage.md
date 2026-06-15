# Stage 6: Semantic Usage Challenge

> **Status: DEFERRED.** The mechanics are not yet defined because there is no
> reliable way to generate unambiguous semantic distractors automatically. This
> stage is frozen until a workable approach is found. ML tools such as word
> embeddings, Transformers.js, and `pgvector` have been removed from the stack
> and will be reconsidered only if work on this stage resumes.

## Description

An advanced stage for distinguishing subtle shades of meaning in context.

## Requirements

1. **Complex context:** provide a sentence that several words could fill
   grammatically, but only one fits best semantically.
2. **Option selection:**
   - Select options by semantic proximity rather than similarity in sound.
   - Example using animal body parts: `Whiskers`, `Vibrissae`, `Mustache`,
     `Eyes`.
3. **Selection logic:** automatically or semi-automatically generate pairs of a
   context and closely related synonyms.

## Technical Details

- Research methods for selecting semantically related words, such as word
  embeddings and thesauri.
- Validate that every sentence has one unambiguous correct answer.
