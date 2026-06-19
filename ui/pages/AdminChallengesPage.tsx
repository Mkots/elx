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
          <div
            class="alert alert-error"
            style="color: #ff7675; background: rgba(255, 118, 117, 0.1); border: 1px solid rgba(255, 118, 117, 0.2); padding: 0.75rem 1rem; border-radius: var(--pico-border-radius); margin-bottom: 1.5rem; font-size: 0.875rem;"
          >
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div
            class="alert alert-success"
            style="color: var(--color-positive); background: rgba(139, 213, 202, 0.1); border: 1px solid rgba(139, 213, 202, 0.2); padding: 0.75rem 1rem; border-radius: var(--pico-border-radius); margin-bottom: 1.5rem; font-size: 0.875rem;"
          >
            ✅ {success}
          </div>
        )}

        {/* Tab Navigation */}
        <nav class="challenges-tabs" style="margin-bottom: 2rem;">
          <ul style="display: flex; gap: 0.5rem; list-style: none; padding: 0; margin: 0; border-bottom: 1px solid rgba(242, 239, 250, 0.08);">
            <li style="margin: 0; padding: 0;">
              <a
                href="/admin/challenges?type=synonyms"
                role="button"
                class={type === "synonyms" ? "" : "outline secondary"}
                style="margin: 0; padding: 0.5rem 1rem; font-size: 0.875rem; border-bottom-left-radius: 0; border-bottom-right-radius: 0; border-bottom: none;"
              >
                🧩 Synonyms
              </a>
            </li>
            <li style="margin: 0; padding: 0;">
              <a
                href="/admin/challenges?type=spelling"
                role="button"
                class={type === "spelling" ? "" : "outline secondary"}
                style="margin: 0; padding: 0.5rem 1rem; font-size: 0.875rem; border-bottom-left-radius: 0; border-bottom-right-radius: 0; border-bottom: none;"
              >
                📝 Spelling
              </a>
            </li>
            <li style="margin: 0; padding: 0;">
              <a
                href="/admin/challenges?type=definitions"
                role="button"
                class={type === "definitions" ? "" : "outline secondary"}
                style="margin: 0; padding: 0.5rem 1rem; font-size: 0.875rem; border-bottom-left-radius: 0; border-bottom-right-radius: 0; border-bottom: none;"
              >
                📖 Definitions
              </a>
            </li>
          </ul>
        </nav>

        {/* Synonyms Panel */}
        {type === "synonyms" && (
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
              <h4 style="margin: 0; font-size: 1.15rem;">
                Synonym Challenges ({synonyms.length})
              </h4>
              <a
                href="/admin/challenges/synonyms/new"
                role="button"
                style="margin: 0; font-size: 0.875rem; font-weight: 700; background: var(--pico-primary); color: #2d2839;"
              >
                Add Synonym Challenge
              </a>
            </div>

            {synonyms.length === 0
              ? (
                <article style="padding: 2.5rem; text-align: center; color: var(--pico-muted-color); background: rgba(242, 239, 250, 0.02); border: 1px dashed rgba(242, 239, 250, 0.16); border-radius: var(--pico-border-radius);">
                  No synonym challenges configured.
                </article>
              )
              : (
                <div
                  class="overflow-auto"
                  style="border: 1px solid rgba(242, 239, 250, 0.08); border-radius: var(--pico-border-radius); background: var(--color-panel-strong);"
                >
                  <table style="margin: 0; width: 100%;">
                    <thead>
                      <tr>
                        <th style="padding: 0.75rem 1rem;">ID</th>
                        <th style="padding: 0.75rem 1rem;">Word</th>
                        <th style="padding: 0.75rem 1rem;">Target Synonym</th>
                        <th style="padding: 0.75rem 1rem; text-align: center;">
                          Relation
                        </th>
                        <th style="padding: 0.75rem 1rem;">Distractors</th>
                        <th style="padding: 0.75rem 1rem; text-align: right;">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {synonyms.map((s) => (
                        <tr
                          key={s.id}
                          style="border-bottom: 1px solid rgba(242, 239, 250, 0.04);"
                        >
                          <td style="padding: 0.75rem 1rem; font-size: 0.875rem; color: var(--pico-muted-color);">
                            {s.id}
                          </td>
                          <td style="padding: 0.75rem 1rem; font-family: var(--pico-font-family-monospace); font-weight: 700;">
                            {wordsMap[s.wordId] || `#${s.wordId}`}
                          </td>
                          <td style="padding: 0.75rem 1rem; font-family: var(--pico-font-family-monospace); font-weight: 700; color: var(--pico-primary);">
                            {wordsMap[s.targetId] || `#${s.targetId}`}
                          </td>
                          <td style="padding: 0.75rem 1rem; text-align: center; font-size: 0.875rem; color: var(--pico-muted-color);">
                            {s.relationType}
                          </td>
                          <td style="padding: 0.75rem 1rem; font-size: 0.875rem; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            {renderDistractors(s.distractors)}
                          </td>
                          <td style="padding: 0.75rem 1rem; text-align: right;">
                            <div style="display: inline-flex; gap: 0.5rem; align-items: center;">
                              <a
                                href={`/admin/challenges/synonyms/${s.id}/edit`}
                                role="button"
                                class="outline"
                                style="margin: 0; font-size: 0.75rem; padding: 0.25rem 0.5rem; border-color: var(--pico-muted-color); color: var(--pico-color);"
                              >
                                Edit
                              </a>
                              <form
                                method="post"
                                action={`/admin/challenges/synonyms/${s.id}/delete`}
                                style="margin: 0;"
                                onsubmit="return confirm('Are you sure you want to delete this synonym challenge?')"
                              >
                                <button
                                  type="submit"
                                  class="outline contrast"
                                  style="margin: 0; font-size: 0.75rem; padding: 0.25rem 0.5rem; border-color: #ff7675; color: #ff7675;"
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
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
              <h4 style="margin: 0; font-size: 1.15rem;">
                Spelling Challenges ({spelling.length})
              </h4>
              <a
                href="/admin/challenges/spelling/new"
                role="button"
                style="margin: 0; font-size: 0.875rem; font-weight: 700; background: var(--pico-primary); color: #2d2839;"
              >
                Add Spelling Challenge
              </a>
            </div>

            {spelling.length === 0
              ? (
                <article style="padding: 2.5rem; text-align: center; color: var(--pico-muted-color); background: rgba(242, 239, 250, 0.02); border: 1px dashed rgba(242, 239, 250, 0.16); border-radius: var(--pico-border-radius);">
                  No spelling challenges configured.
                </article>
              )
              : (
                <div
                  class="overflow-auto"
                  style="border: 1px solid rgba(242, 239, 250, 0.08); border-radius: var(--pico-border-radius); background: var(--color-panel-strong);"
                >
                  <table style="margin: 0; width: 100%;">
                    <thead>
                      <tr>
                        <th style="padding: 0.75rem 1rem;">ID</th>
                        <th style="padding: 0.75rem 1rem;">Context Sentence</th>
                        <th style="padding: 0.75rem 1rem;">Correct Word</th>
                        <th style="padding: 0.75rem 1rem;">Distractors</th>
                        <th style="padding: 0.75rem 1rem; text-align: right;">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {spelling.map((s) => (
                        <tr
                          key={s.id}
                          style="border-bottom: 1px solid rgba(242, 239, 250, 0.04);"
                        >
                          <td style="padding: 0.75rem 1rem; font-size: 0.875rem; color: var(--pico-muted-color);">
                            {s.id}
                          </td>
                          <td style="padding: 0.75rem 1rem; font-size: 0.95rem; font-style: italic; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            {s.contextSentence}
                          </td>
                          <td style="padding: 0.75rem 1rem; font-family: var(--pico-font-family-monospace); font-weight: 700; color: var(--color-positive);">
                            {s.correctWordValue || wordsMap[s.correctWordId] ||
                              `#${s.correctWordId}`}
                          </td>
                          <td style="padding: 0.75rem 1rem; font-size: 0.875rem; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            {renderDistractors(s.distractors)}
                          </td>
                          <td style="padding: 0.75rem 1rem; text-align: right;">
                            <div style="display: inline-flex; gap: 0.5rem; align-items: center;">
                              <a
                                href={`/admin/challenges/spelling/${s.id}/edit`}
                                role="button"
                                class="outline"
                                style="margin: 0; font-size: 0.75rem; padding: 0.25rem 0.5rem; border-color: var(--pico-muted-color); color: var(--pico-color);"
                              >
                                Edit
                              </a>
                              <form
                                method="post"
                                action={`/admin/challenges/spelling/${s.id}/delete`}
                                style="margin: 0;"
                                onsubmit="return confirm('Are you sure you want to delete this spelling challenge?')"
                              >
                                <button
                                  type="submit"
                                  class="outline contrast"
                                  style="margin: 0; font-size: 0.75rem; padding: 0.25rem 0.5rem; border-color: #ff7675; color: #ff7675;"
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
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
              <h4 style="margin: 0; font-size: 1.15rem;">
                Definition Challenges ({definitions.length})
              </h4>
              <a
                href="/admin/challenges/definitions/new"
                role="button"
                style="margin: 0; font-size: 0.875rem; font-weight: 700; background: var(--pico-primary); color: #2d2839;"
              >
                Add Definition Challenge
              </a>
            </div>

            {definitions.length === 0
              ? (
                <article style="padding: 2.5rem; text-align: center; color: var(--pico-muted-color); background: rgba(242, 239, 250, 0.02); border: 1px dashed rgba(242, 239, 250, 0.16); border-radius: var(--pico-border-radius);">
                  No definition challenges configured.
                </article>
              )
              : (
                <div
                  class="overflow-auto"
                  style="border: 1px solid rgba(242, 239, 250, 0.08); border-radius: var(--pico-border-radius); background: var(--color-panel-strong);"
                >
                  <table style="margin: 0; width: 100%;">
                    <thead>
                      <tr>
                        <th style="padding: 0.75rem 1rem;">ID</th>
                        <th style="padding: 0.75rem 1rem;">Word</th>
                        <th style="padding: 0.75rem 1rem;">Definition Text</th>
                        <th style="padding: 0.75rem 1rem;">Distractors</th>
                        <th style="padding: 0.75rem 1rem; text-align: right;">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {definitions.map((d) => (
                        <tr
                          key={d.id}
                          style="border-bottom: 1px solid rgba(242, 239, 250, 0.04);"
                        >
                          <td style="padding: 0.75rem 1rem; font-size: 0.875rem; color: var(--pico-muted-color);">
                            {d.id}
                          </td>
                          <td style="padding: 0.75rem 1rem; font-family: var(--pico-font-family-monospace); font-weight: 700; color: var(--pico-primary);">
                            {d.wordValue || wordsMap[d.wordId] ||
                              `#${d.wordId}`}
                          </td>
                          <td style="padding: 0.75rem 1rem; font-size: 0.95rem; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            {d.definitionText}
                          </td>
                          <td style="padding: 0.75rem 1rem; font-size: 0.875rem; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            {renderDistractors(d.distractors)}
                          </td>
                          <td style="padding: 0.75rem 1rem; text-align: right;">
                            <div style="display: inline-flex; gap: 0.5rem; align-items: center;">
                              <a
                                href={`/admin/challenges/definitions/${d.id}/edit`}
                                role="button"
                                class="outline"
                                style="margin: 0; font-size: 0.75rem; padding: 0.25rem 0.5rem; border-color: var(--pico-muted-color); color: var(--pico-color);"
                              >
                                Edit
                              </a>
                              <form
                                method="post"
                                action={`/admin/challenges/definitions/${d.id}/delete`}
                                style="margin: 0;"
                                onsubmit="return confirm('Are you sure you want to delete this definition challenge?')"
                              >
                                <button
                                  type="submit"
                                  class="outline contrast"
                                  style="margin: 0; font-size: 0.75rem; padding: 0.25rem 0.5rem; border-color: #ff7675; color: #ff7675;"
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
