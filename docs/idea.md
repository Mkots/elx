The first part is implemented as LexTALE:

1. Let the user select words and mark them as "known." Present a page of 60
   words, including non-existent words.
2. After selecting all familiar words, the user can proceed to the next step:
   cards with similar words and "Know"/"Don't know" choices. If the user chooses
   "Know" for a non-existent word, reduce the result's truthfulness score.

Optional stages let the user challenge themselves after completing the first
part:

1. Synonyms and antonyms for words marked as "known": show a known word and ask
   the user to choose its antonym or synonym from four options.

2. Spelling: provide four spellings and ask the user to choose the correct one,
   for example: "I have a fluffy ___ with white fur and long tail."
3. Cut
4. Caught
5. Cat
6. Kit

7. Meaning: provide a short description of a word and ask which of four options
   fits best.

8. Usage: the implementation is still unclear. It could work like the spelling
   stage, but the options should be semantically rather than phonetically
   similar, while the sentence must require one specific word. For example, a
   sentence could say that a cat has long:
9. Whiskers
10. Vibrissae
11. Mustache
12. Eyes

It is still unclear how to generate suitable sentences and answer options.
