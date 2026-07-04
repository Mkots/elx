# Analytics Event Contract

ELX exposes a stable `window.dataLayer` stream for Google Tag Manager. The app
does not hardcode GA4 or research tags; researchers configure tags, triggers,
and destinations inside GTM.

GTM loads only when `GTM_CONTAINER_ID` is set. Consent Mode v2 defaults are
`denied` before consent and update to `granted` after the research consent gate
is accepted.

Every event carries:

| Field         | Type   | Description                                    |
| ------------- | ------ | ---------------------------------------------- |
| `event`       | string | Event name used by GTM triggers                |
| `session_id`  | string | Anonymous UUID test session                    |
| `ticket_code` | string | Published ticket code shown to the participant |

## Events

| Event              | Emitted                                     | Extra fields                                                |
| ------------------ | ------------------------------------------- | ----------------------------------------------------------- |
| `consent_granted`  | First Stage 1 page after consent acceptance | none                                                        |
| `test_started`     | First Stage 1 page after consent/start      | none                                                        |
| `stage1_submitted` | Stage 2 page after Stage 1 submit           | `selected_count`                                            |
| `stage2_answered`  | HTMX Stage 2 card response after an answer  | `question_index`, `question_type`, `answer`, `word_is_real` |
| `test_completed`   | Result page                                 | `score`, `truthfulness`                                     |

## Trigger Notes

- Use `event` as the GTM custom event trigger name.
- Treat `session_id` as anonymous research state, not a user identity.
- `question_index` is the index in the ticket snapshot, not a live `words.id`.
- `answer` is `know` or `dont_know`.
- Final legal wording for privacy and terms pages is owner-supplied.
