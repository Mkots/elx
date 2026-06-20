import { AdminLayout } from "../components/AdminLayout.tsx";

type ChallengeType = "synonyms" | "spelling" | "definitions";

type SynonymItem = {
  id: number;
  wordId: number;
  targetId: number;
  relationType: string;
  distractors: number[];
};

type SpellingItem = {
  id: number;
  contextSentence: string;
  correctWordId: number;
  correctWordValue?: string;
  distractors: number[];
};

type DefinitionItem = {
  id: number;
  wordId: number;
  wordValue?: string;
  definitionText: string;
  distractors: number[];
};

type AdminChallengesPageProps = {
  type: ChallengeType;
  synonyms: SynonymItem[];
  spelling: SpellingItem[];
  definitions: DefinitionItem[];
  wordsMap: Record<number, string>;
  error?: string;
  success?: string;
};

export function AdminChallengesPage({
  type,
  synonyms,
  spelling,
  definitions,
  wordsMap,
  error,
  success,
}: AdminChallengesPageProps) {
  // Helper to map distractor array to comma separated words
  const renderDistractors = (ids: number[]) => {
    return ids.map((id) => wordsMap[id] || `#${id}`).join(", ");
  };

  return (
    <AdminLayout title="Challenges Manager" activeTab="challenges">
      <div class="challenges-shell">
        {error && (
          <div class="alert alert-error">
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div class="alert alert-success">
            ✅ {success}
          </div>
        )}

        {/* Tab Navigation */}
        <nav class="challenges-tabs mb-2">
          <ul class="challenges-tabs-list">
            <li class="m-0 p-0">
              <a
                href="/admin/challenges?type=synonyms"
                role="button"
                class={type === "synonyms"
                  ? "challenges-tab-link"
                  : "outline secondary challenges-tab-link"}
              >
                🧩 Synonyms
              </a>
            </li>
            <li class="m-0 p-0">
              <a
                href="/admin/challenges?type=spelling"
                role="button"
                class={type === "spelling"
                  ? "challenges-tab-link"
                  : "outline secondary challenges-tab-link"}
              >
                📝 Spelling
              </a>
            </li>
            <li class="m-0 p-0">
              <a
                href="/admin/challenges?type=definitions"
                role="button"
                class={type === "definitions"
                  ? "challenges-tab-link"
                  : "outline secondary challenges-tab-link"}
              >
                📖 Definitions
              </a>
            </li>
          </ul>
        </nav>

        {/* Synonyms Panel */}
        {type === "synonyms" && (
          <div>
            <div class="flex-between mb-15">
              <h4 class="m-0 fs-115">
                Synonym Challenges ({synonyms.length})
              </h4>
              <a
                href="/admin/challenges/synonyms/new"
                role="button"
                class="admin-btn-primary btn-mini fs-0875"
              >
                Add Synonym Challenge
              </a>
            </div>

            {synonyms.length === 0
              ? (
                <article class="empty-state empty-state-large">
                  No synonym challenges configured.
                </article>
              )
              : (
                <div class="table-wrapper">
                  <table class="admin-table admin-table-compact">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Word</th>
                        <th>Target Synonym</th>
                        <th class="text-center">
                          Relation
                        </th>
                        <th>Distractors</th>
                        <th class="text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {synonyms.map((s) => (
                        <tr
                          key={s.id}
                          class="border-bottom-row"
                        >
                          <td class="fs-0875 color-muted">
                            {s.id}
                          </td>
                          <td class="admin-monospace fw-700">
                            {wordsMap[s.wordId] || `#${s.wordId}`}
                          </td>
                          <td class="admin-monospace fw-700 color-primary">
                            {wordsMap[s.targetId] || `#${s.targetId}`}
                          </td>
                          <td class="text-center fs-0875 color-muted">
                            {s.relationType}
                          </td>
                          <td class="fs-0875 ellipsis max-w-250">
                            {renderDistractors(s.distractors)}
                          </td>
                          <td class="text-right">
                            <div class="inline-flex-center gap-05">
                              <a
                                href={`/admin/challenges/synonyms/${s.id}/edit`}
                                role="button"
                                class="outline btn-micro btn-outline-muted"
                              >
                                Edit
                              </a>
                              <form
                                method="post"
                                action={`/admin/challenges/synonyms/${s.id}/delete`}
                                class="m-0"
                                onsubmit="return confirm('Are you sure you want to delete this synonym challenge?')"
                              >
                                <button
                                  type="submit"
                                  class="outline contrast btn-micro btn-outline-danger"
                                >
                                  Delete
                                </button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        )}

        {/* Spelling Panel */}
        {type === "spelling" && (
          <div>
            <div class="flex-between mb-15">
              <h4 class="m-0 fs-115">
                Spelling Challenges ({spelling.length})
              </h4>
              <a
                href="/admin/challenges/spelling/new"
                role="button"
                class="admin-btn-primary btn-mini fs-0875"
              >
                Add Spelling Challenge
              </a>
            </div>

            {spelling.length === 0
              ? (
                <article class="empty-state empty-state-large">
                  No spelling challenges configured.
                </article>
              )
              : (
                <div class="table-wrapper">
                  <table class="admin-table admin-table-compact">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Context Sentence</th>
                        <th>Correct Word</th>
                        <th>Distractors</th>
                        <th class="text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {spelling.map((s) => (
                        <tr
                          key={s.id}
                          class="border-bottom-row"
                        >
                          <td class="fs-0875 color-muted">
                            {s.id}
                          </td>
                          <td class="fs-095 font-style-italic ellipsis max-w-300">
                            {s.contextSentence}
                          </td>
                          <td class="admin-monospace fw-700 color-positive">
                            {s.correctWordValue || wordsMap[s.correctWordId] ||
                              `#${s.correctWordId}`}
                          </td>
                          <td class="fs-0875 ellipsis max-w-250">
                            {renderDistractors(s.distractors)}
                          </td>
                          <td class="text-right">
                            <div class="inline-flex-center gap-05">
                              <a
                                href={`/admin/challenges/spelling/${s.id}/edit`}
                                role="button"
                                class="outline btn-micro btn-outline-muted"
                              >
                                Edit
                              </a>
                              <form
                                method="post"
                                action={`/admin/challenges/spelling/${s.id}/delete`}
                                class="m-0"
                                onsubmit="return confirm('Are you sure you want to delete this spelling challenge?')"
                              >
                                <button
                                  type="submit"
                                  class="outline contrast btn-micro btn-outline-danger"
                                >
                                  Delete
                                </button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        )}

        {/* Definitions Panel */}
        {type === "definitions" && (
          <div>
            <div class="flex-between mb-15">
              <h4 class="m-0 fs-115">
                Definition Challenges ({definitions.length})
              </h4>
              <a
                href="/admin/challenges/definitions/new"
                role="button"
                class="admin-btn-primary btn-mini fs-0875"
              >
                Add Definition Challenge
              </a>
            </div>

            {definitions.length === 0
              ? (
                <article class="empty-state empty-state-large">
                  No definition challenges configured.
                </article>
              )
              : (
                <div class="table-wrapper">
                  <table class="admin-table admin-table-compact">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Word</th>
                        <th>Definition Text</th>
                        <th>Distractors</th>
                        <th class="text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {definitions.map((d) => (
                        <tr
                          key={d.id}
                          class="border-bottom-row"
                        >
                          <td class="fs-0875 color-muted">
                            {d.id}
                          </td>
                          <td class="admin-monospace fw-700 color-primary">
                            {d.wordValue || wordsMap[d.wordId] ||
                              `#${d.wordId}`}
                          </td>
                          <td class="fs-095 ellipsis max-w-300">
                            {d.definitionText}
                          </td>
                          <td class="fs-0875 ellipsis max-w-250">
                            {renderDistractors(d.distractors)}
                          </td>
                          <td class="text-right">
                            <div class="inline-flex-center gap-05">
                              <a
                                href={`/admin/challenges/definitions/${d.id}/edit`}
                                role="button"
                                class="outline btn-micro btn-outline-muted"
                              >
                                Edit
                              </a>
                              <form
                                method="post"
                                action={`/admin/challenges/definitions/${d.id}/delete`}
                                class="m-0"
                                onsubmit="return confirm('Are you sure you want to delete this definition challenge?')"
                              >
                                <button
                                  type="submit"
                                  class="outline contrast btn-micro btn-outline-danger"
                                >
                                  Delete
                                </button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
