# План: очистка CSV перед enrichment

Пайплайн: `clean.ts` → `enrich.ts`. Очиститель — отдельный скрипт
`scripts/clean.ts` (CSV → CSV), в `enrich.ts` правки не нужны.

## Контекст

Вход: `scripts/magic-hat/magicians/ALL.csv` — 7800 строк, колонки
`headword,pos,CEFR,CoreInventory 1,CoreInventory 2,Threshold`.

Анализ показал: дублей headword+pos нет, пустых полей нет, CEFR консистентен
(A1–B2). Многословные entry (144 шт., например `alarm clock`) ищутся в rabbits
как есть — ключи там с пробелами. `resolveEntry` уже case-insensitive, поэтому
`CD player` и т.п. — не проблема.

Без очистки предсказуемо падают в `notFound` ~500 строк (~6%):

- 179 строк со слэш-вариантами: `adviser/advisor`, `a.m./A.M./am/AM`,
  `cafe/café`.
- ~315 строк со служебными POS, которых нет в `POS_CODES` enrich.ts: pronoun
  (83), preposition (76), determiner (46), conjunction (37), number (30), modal
  auxiliary (13), be-verb (11), interjection (9), do-verb (5), have-verb (4),
  infinitive-to (1).

## Что делает clean.ts

1. **Слэш-варианты** — headword обрезается до первого `/`: `adviser/advisor` →
   `adviser`. Покрывает и спецкейс `a.m./A.M./am/AM`.
2. **Служебные POS** — строки с pronoun, preposition, determiner, conjunction,
   number, modal auxiliary, be-verb, do-verb, have-verb, interjection,
   infinitive-to удаляются. Остаются noun, verb, adjective, adverb (~7486
   строк).
3. **Нормализация** — trim, схлопывание двойных пробелов, юникод в NFC (для
   `café`-подобных остатков).
4. **Отчёт** — в stderr: сколько строк изменено/удалено и почему. Флаг
   `--report <path>` пишет удалённые строки в отдельный CSV, чтобы ничего не
   терялось молча.
5. **Guard** — ошибка при пустом headword или неизвестном POS: ловим сюрпризы в
   будущих файлах.

## CLI

```
deno run --allow-read --allow-write scripts/clean.ts <input.csv> \
  -o ALL.clean.csv [--report removed.csv]
```

## Запуск пайплайна

```
deno run --allow-read --allow-write scripts/clean.ts \
  scripts/magic-hat/magicians/ALL.csv -o ALL.clean.csv

deno run --allow-read --allow-write scripts/enrich.ts \
  ALL.clean.csv -o ALL.enriched.csv
```

## Проверка

Прогнать на `A1.noun.csv` и `ALL.csv`, сравнить notFound-статистику enrich.ts до
и после очистки. Ожидание: доля notFound падает с ~6% почти до нуля (останутся
только слова, которых реально нет в WordNet).
