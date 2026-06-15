# Stage 1: Core LexTALE Word Selection

## Description

Implement the first stage of vocabulary testing using the LexTALE method.

## Requirements

1. **Word list:** generate or load a bank of 60 words.
   - Some must be real English words of varying difficulty.
   - Some must be pseudowords that look English but do not exist.
2. **Selection interface:**
   - Display a grid or list of 60 words.
   - Let the user mark the words they know.
3. **Navigation:**
   - Provide a "Next" or "Finish selection" button that becomes active after the
     user interacts with the interface.

## Technical Details

- Store the dictionary with each word's reality flag.
- Store the user's selected words.
