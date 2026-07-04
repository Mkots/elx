# План: дополнительные обогатители данных

Контекст: проект — LexTALE-тест. Таблице `words` нужны `difficulty`, `isReal`,
`synonyms`, `antonyms`, `definition` (docs/data-model.md), а стадиям 3–5 —
дистракторы (REQ-SYNONYMS-ANTONYMS, REQ-SPELLING, REQ-MEANING). Текущий
`enrich.ts` закрывает definitions, synonyms, examples, pronunciation, hypernyms.
Все сетевые вызовы — только в сидерах (REQ-QUESTION-BANK), рантайм читает
готовое из PostgreSQL.

## 1. Антонимы (самый дешёвый win)

Данные уже есть в rabbits: `Sense.antonym` содержит sense-ключи вида
`lemma%...`, но enrich.ts их не извлекает.

- **Реализация:** в `enrich()` взять `sense.antonym`, отрезать всё после `%` —
  получится лемма. Добавить колонку `antonyms`.
- **Объём:** ~20 строк в существующем enrich.ts.

## 2. Difficulty (1–5) + частотность

Обязательное поле `words.difficulty`.

- **База:** CEFR уже в CSV — A1→1, A2→2, B1→3, B2→4; уровень 5 — редкие слова
  вне списка.
- **Калибровка/fallback:** частотный список (SUBTLEX или wordfreq zipf),
  скачивается один раз в локальную папку (как rabbits), джойн офлайн.
- **Выход:** колонки `difficulty`, `zipf`.

## 3. Генератор псевдослов

Для `isReal=false` — ядро LexTALE (Stage 1–2). Не обогатитель, а генератор.

- **Реализация:** биграммный/слоговый марков по реальным словам списка
  (Wuggy-подход), затем валидация «слова не существует» проверкой по
  `entries-*.json` — rabbits работает как словарь-фильтр.
- **Файл:** отдельный `scripts/pseudowords.ts`.

## 4. Фонетические дистракторы (Stage 4, spelling)

Pronunciation (IPA) уже извлекается enrich.ts.

- **Локально:** edit distance по IPA/орфографии среди самого словаря + double
  metaphone.
- **Datamuse `sl=`** (sounds-like) — источник, прямо названный в
  REQ-QUESTION-BANK.
- **Рекомендация:** гибрид — сначала локальный подбор, Datamuse как добор для
  слов, где нашлось < 3 кандидатов.

## 5. Gap-предложения (Stage 4)

`examples` из WordNet уже есть, но покрытие частичное и они не gap-ready.

- **Реализация:** фильтровать examples, содержащие headword, заменять его на
  `___`.
- **Добор:** корпус Tatoeba (офлайн-скачивание, CC-BY) для слов без пригодных
  примеров.

## 6. Дистракторы для definition/synonym вопросов (Stage 3, 5)

Чисто локальный подбор по уже обогащённым колонкам.

- **Критерии:** тот же `pos` + тот же CEFR; исключить `synonyms` / `antonyms` /
  `hypernyms` целевого слова.
- **Для definition-вопросов:** тот же `lexname` (семантическая категория уже
  есть) даёт правдоподобные, но неверные варианты.
- **Файл:** отдельный `scripts/distractors.ts`, работает по enriched CSV.

## Привязка к roadmap

| Обогатитель                 | Сидер                            | Стадия     |
| :-------------------------- | :------------------------------- | :--------- |
| 1. Антонимы                 | `seed:synonyms`                  | Stage 3    |
| 2. Difficulty + zipf        | `seed:words`                     | Stage 1–2  |
| 3. Псевдослова              | `seed:words`                     | Stage 1–2  |
| 4. Фонетические дистракторы | `seed:spelling`                  | Stage 4    |
| 5. Gap-предложения          | `seed:spelling`                  | Stage 4    |
| 6. Semantic-дистракторы     | `seed:synonyms`, `seed:meanings` | Stage 3, 5 |

Порядок работ: 1 → 2 → 3 (нужны раньше всех по roadmap), затем 6, затем 4–5.
