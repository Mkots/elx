# ELX Project Context

## Что это

ELX — веб-приложение для оценки словарного запаса на базе методики LexTALE.
Стек: Deno + Hono + JSX (SSR) + Deno KV (сессии) + PostgreSQL (данные) + Drizzle
ORM.

## Архитектурные принципы

- **SSR-only**: HTML рендерится сервером через Hono JSX. Минимум клиентского JS.
- **GET/POST/302**: каждый стейдж — GET рендерит страницу, POST обрабатывает
  форму и делает 302 redirect на следующий стейдж.
- **Dependency injection**: роуты принимают интерфейсы `Loader` и `Store` — DB и
  KV не вызываются напрямую в unit-тестах.
- **Scoring на сервере**: клиент не участвует в подсчёте очков.

## Стейдж-флоу (Ticket-driven)

```
GET  /             → главная страница, выбор опубликованного билета (или авто-билет)
POST /stage/1/start → инициализирует сессию в KV с ticketId, redirect → /stage/1
GET  /stage/1      → форма выбора слов (загружается из snapshot вопросов билета)
POST /stage/1      → сохраняет wordIds (индексы) в KV, redirect → /stage/2
GET  /stage/2      → карточки верификации по очереди через HTMX (загружаются из snapshot билета)
POST /stage/2      → сохраняет ответ или финальный score в KV, пишет в test_history с ticket_id, redirect → /result
GET  /result       → показывает score + truthfulness
```

Гарды:

- `GET /stage/1` без sessionId или ticketId → redirect `/`
- `GET /stage/2` без sessionId или с пустым wordIds → redirect `/stage/1`
- `GET /result` без sessionId → redirect `/stage/1`
- `GET /result` с sessionId но без stage2Result → redirect `/stage/2`

## Структура файлов

```
app.ts                        — createApp() c DI-опциями для всех роутов
main.ts                       — точка входа, запуск сервера
session.ts                    — Deno KV: parseSessionId, sessionCookie,
                                saveWordSelection, loadWordSelection,
                                saveStage2Result, loadStage2Result, Stage2Result
routes/
  stage1.ts                   — GET/POST /stage/1, интерфейсы Stage1WordLoader, Stage1SessionStore
  stage2.ts                   — GET/POST /stage/2, интерфейсы Stage2WordLoader, Stage2SessionStore
  result.ts                   — GET /result, интерфейс ResultSessionStore
  home.ts, health.ts, logger.ts, seed_verification.ts
scoring/
  lextale.ts                  — computeScore(WordAnswer[]) → { score, truthfulness }
                                score = knownReal − knownPseudo
                                truthfulness = knownReal/totalKnown * 100
ui/
  components/Layout.tsx, WordGrid.tsx
  pages/HomePage.tsx, Stage1Page.tsx, Stage2Page.tsx, ResultPage.tsx
db/
  schema.ts                   — words(id,value,isReal,difficulty), synonyms, spellingChallenges, definitions, testHistory
  client.ts                   — createDatabase() → { client, db }
tests/
  app_test.ts, session_test.ts
  stage1_route_test.ts, stage2_route_test.ts, result_route_test.ts
  lextale_scoring_test.ts
  seed_*.ts, wiki_build_test.ts
  e2e/home.spec.ts, stage1.spec.ts, stage2.spec.ts
```

## Сессии (Deno KV)

| Ключ                                   | Значение                  | Описание                                               |
| -------------------------------------- | ------------------------- | ------------------------------------------------------ |
| `["session", id, "ticket_id"]`         | `number`                  | ID активного билета (`tickets.id`)                     |
| `["session", id, "stage1_selections"]` | `number[]`                | Индексы слов, выбранных в стейдже 1                    |
| `["session", id, "stage2_answers"]`    | `Record<string, boolean>` | Промежуточные ответы в стейдже 2 (map: index -> known) |
| `["session", id, "stage2_result"]`     | `{score,truthfulness}`    | Результат верификации                                  |

KV-путь задаётся через `DENO_KV_PATH` (в prod: `/data/kv`).

## Алгоритм скоринга (lextale.ts)

- **score** = (слова с isReal=true, отмеченные Know) − (слова с isReal=false,
  отмеченные Know)
- **truthfulness** = round(knownReal / totalKnown * 100), или 100 если никто не
  отмечен

## CI-задачи

```bash
deno task ci          # fmt:check + lint + check + test:coverage
deno task e2e         # Playwright e2e (нужен запущенный сервер + БД + seed)
deno task seed:e2e    # db:migrate + seed:words (для e2e в CI)
deno task start:e2e   # сервер для e2e с KV в .data/
```

e2e CI запускается в Docker-контейнере
`mcr.microsoft.com/playwright:v1.61.0-noble` с сервисом PostgreSQL 17.
Переменные окружения задаются в GitHub Secrets.


## Известные нюансы

- `GET /stage/2` с пустым wordIds → redirect `/stage/1` (не `/stage/2`). E2e
  тест должен выбрать хотя бы одно слово перед сабмитом Stage 1.
- `deno.json check` includes `scoring/*.ts` — было добавлено при работе над
  issue #15.
- `Stage2Page` использует radio-кнопки (не чекбоксы) с default `checked` на
  "Know". Form-поля: `name="word_<id>" value="know|dont_know"`.
- `data-testid="score"` и `data-testid="truthfulness"` в ResultPage.tsx для e2e.
