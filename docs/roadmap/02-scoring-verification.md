# Stage 2: Verification and Scoring

## Description

Verify the user's responses and calculate the final score.

## Requirements

1. **Verification cards:**
   - Show separate cards with similar words for words marked as known.
   - Offer "Know" and "Don't know" for each card.
2. **Truthfulness logic:**
   - Choosing "Know" for a pseudoword lowers the overall reliability of the
     result.
3. **Scoring algorithm:**
   - Final score = known real words minus the penalty for selected pseudowords.
   - Display the final score to the user.

## Technical Details

- Match selected words to their reality status.
- Apply a penalty-point system.
