import { AdminLayout } from "../components/AdminLayout.tsx";

type WordItem = {
  id: number;
  value: string;
  isReal: boolean;
  difficulty: number;
  reviewed: boolean;
};

type AdminWordsPageProps = {
  words: WordItem[];
  totalCount: number;
  page: number;
  totalPages: number;
  search: string;
  difficulty?: number;
  isReal?: boolean;
  reviewed?: boolean;
  error?: string;
  success?: string;
};

export function AdminWordsPage({
  words,
  totalCount,
  page,
  totalPages,
  search,
  difficulty,
  isReal,
  reviewed,
  error,
  success,
}: AdminWordsPageProps) {
  const buildUrl = (targetPage: number) => {
    const params = new URLSearchParams();
    params.set("page", String(targetPage));
    if (search) params.set("q", search);
    if (difficulty !== undefined) params.set("difficulty", String(difficulty));
    if (isReal !== undefined) params.set("isReal", String(isReal));
    if (reviewed !== undefined) params.set("reviewed", String(reviewed));
    return `/admin/words?${params.toString()}`;
  };

  return (
    <AdminLayout title="Words Manager" activeTab="words">
      <div class="words-shell">
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

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <h3 style="margin: 0; font-size: 1.25rem;">
            Vocabulary Words ({totalCount})
          </h3>
          <div style="display: inline-flex; gap: 0.5rem;">
            <a
              href="/admin/words/review"
              role="button"
              class="outline"
              style="margin: 0; font-weight: 700; border-color: #ffb86c; color: #ffb86c;"
            >
              🔍 Review Queue
            </a>
            <a
              href="/admin/words/import"
              role="button"
              class="outline"
              style="margin: 0; font-weight: 700; border-color: var(--pico-muted-color); color: var(--pico-color);"
            >
              📥 Import Words
            </a>
            <a
              href="/admin/words/new"
              role="button"
              style="margin: 0; font-weight: 700; background: var(--pico-primary); color: #2d2839;"
            >
              ➕ Add Word
            </a>
          </div>
        </div>

        {/* Filter bar */}
        <article style="padding: 1.25rem; margin-bottom: 1.5rem; background: var(--color-panel-strong); border: 1px solid rgba(242, 239, 250, 0.08);">
          <form
            method="get"
            action="/admin/words"
            style="margin: 0; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 1rem; align-items: end;"
          >
            <div style="margin: 0;">
              <label
                for="q"
                style="font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem; display: block;"
              >
                Search
              </label>
              <input
                type="text"
                id="q"
                name="q"
                value={search}
                placeholder="Search word value..."
                style="margin: 0; font-size: 0.875rem;"
              />
            </div>
            <div style="margin: 0;">
              <label
                for="difficulty"
                style="font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem; display: block;"
              >
                Difficulty
              </label>
              <select
                id="difficulty"
                name="difficulty"
                style="margin: 0; font-size: 0.875rem;"
              >
                <option value="">All</option>
                {[1, 2, 3, 4, 5].map((d) => (
                  <option value={String(d)} selected={difficulty === d}>
                    Level {d}
                  </option>
                ))}
              </select>
            </div>
            <div style="margin: 0;">
              <label
                for="isReal"
                style="font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem; display: block;"
              >
                Type
              </label>
              <select
                id="isReal"
                name="isReal"
                style="margin: 0; font-size: 0.875rem;"
              >
                <option value="">All</option>
                <option value="true" selected={isReal === true}>
                  Real Words
                </option>
                <option value="false" selected={isReal === false}>
                  Pseudowords
                </option>
              </select>
            </div>
            <div style="margin: 0;">
              <label
                for="reviewed"
                style="font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem; display: block;"
              >
                Reviewed
              </label>
              <select
                id="reviewed"
                name="reviewed"
                style="margin: 0; font-size: 0.875rem;"
              >
                <option value="">All</option>
                <option value="true" selected={reviewed === true}>
                  Reviewed
                </option>
                <option value="false" selected={reviewed === false}>
                  Pending
                </option>
              </select>
            </div>
            <button
              type="submit"
              style="margin: 0; padding: 0 1.5rem; font-weight: 700; height: 100%;"
            >
              Filter
            </button>
          </form>
        </article>

        {/* Table list */}
        {words.length === 0
          ? (
            <article style="padding: 3rem; text-align: center; color: var(--pico-muted-color); background: rgba(242, 239, 250, 0.03); border: 1px dashed rgba(242, 239, 250, 0.16); border-radius: var(--pico-border-radius);">
              No words match the specified filters.
            </article>
          )
          : (
            <div>
              {
                /* Bulk actions form — checkboxes and buttons below associate
                  with this form via the `form="bulkForm"` attribute, so they
                  can live inside the table without nesting <form> elements. */
              }
              <form
                id="bulkForm"
                method="post"
                action="/admin/words/bulk"
                style="margin: 0 0 1rem;"
              >
                <input type="hidden" name="q" value={search} />
                {difficulty !== undefined && (
                  <input
                    type="hidden"
                    name="difficulty"
                    value={String(difficulty)}
                  />
                )}
                {isReal !== undefined && (
                  <input type="hidden" name="isReal" value={String(isReal)} />
                )}
                {reviewed !== undefined && (
                  <input
                    type="hidden"
                    name="reviewed"
                    value={String(reviewed)}
                  />
                )}

                <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; background: var(--color-panel-strong); border: 1px solid rgba(242, 239, 250, 0.08); border-radius: var(--pico-border-radius);">
                  <span style="font-size: 0.75rem; font-weight: 700; color: var(--pico-muted-color); text-transform: uppercase; letter-spacing: 0.05em;">
                    Bulk
                  </span>
                  <button
                    type="submit"
                    name="action"
                    value="mark_reviewed"
                    class="outline"
                    style="margin: 0; font-size: 0.75rem; padding: 0.35rem 0.75rem;"
                  >
                    ✓ Mark reviewed
                  </button>
                  <button
                    type="submit"
                    name="action"
                    value="mark_unreviewed"
                    class="outline"
                    style="margin: 0; font-size: 0.75rem; padding: 0.35rem 0.75rem;"
                  >
                    Mark pending
                  </button>
                  <button
                    type="submit"
                    name="action"
                    value="set_real"
                    class="outline"
                    style="margin: 0; font-size: 0.75rem; padding: 0.35rem 0.75rem; border-color: var(--color-positive); color: var(--color-positive);"
                  >
                    Set Real
                  </button>
                  <button
                    type="submit"
                    name="action"
                    value="set_pseudo"
                    class="outline"
                    style="margin: 0; font-size: 0.75rem; padding: 0.35rem 0.75rem; border-color: var(--color-caution); color: var(--color-caution);"
                  >
                    Set Pseudoword
                  </button>
                  <button
                    type="submit"
                    name="action"
                    value="delete"
                    class="outline contrast"
                    style="margin: 0; font-size: 0.75rem; padding: 0.35rem 0.75rem; border-color: #ff7675; color: #ff7675;"
                    onclick="return confirm('Delete the selected words? This cannot be undone.')"
                  >
                    Delete
                  </button>
                  <label style="margin: 0 0 0 auto; display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; color: var(--pico-muted-color);">
                    <input
                      type="checkbox"
                      name="selectAllMatching"
                      value="true"
                      style="margin: 0;"
                    />
                    Apply to all {totalCount} matching this filter
                  </label>
                </div>
              </form>

              <div
                class="overflow-auto"
                style="border: 1px solid rgba(242, 239, 250, 0.08); border-radius: var(--pico-border-radius); background: var(--color-panel-strong); margin-bottom: 1.5rem;"
              >
                <table style="margin: 0; width: 100%;">
                  <thead>
                    <tr>
                      <th style="padding: 1rem; width: 1%;">
                        <input
                          type="checkbox"
                          aria-label="Select all rows"
                          style="margin: 0;"
                          onclick="var on=this.checked;document.querySelectorAll('.row-check').forEach(function(c){c.checked=on});"
                        />
                      </th>
                      <th style="padding: 1rem;">ID</th>
                      <th style="padding: 1rem;">Word Value</th>
                      <th style="padding: 1rem; text-align: center;">Type</th>
                      <th style="padding: 1rem; text-align: center;">
                        Difficulty
                      </th>
                      <th style="padding: 1rem; text-align: center;">
                        Reviewed
                      </th>
                      <th style="padding: 1rem; text-align: right;">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {words.map((w) => (
                      <tr
                        key={w.id}
                        style="border-bottom: 1px solid rgba(242, 239, 250, 0.04);"
                      >
                        <td style="padding: 1rem;">
                          <input
                            type="checkbox"
                            class="row-check"
                            form="bulkForm"
                            name="ids"
                            value={String(w.id)}
                            aria-label={`Select word ${w.value}`}
                            style="margin: 0;"
                          />
                        </td>
                        <td style="padding: 1rem; font-size: 0.875rem; color: var(--pico-muted-color);">
                          {w.id}
                        </td>
                        <td style="padding: 1rem; font-family: var(--pico-font-family-monospace); font-weight: 700; font-size: 1.125rem;">
                          {w.value}
                        </td>
                        <td style="padding: 1rem; text-align: center;">
                          {w.isReal
                            ? (
                              <span style="display: inline-block; padding: 0.15rem 0.5rem; background: rgba(139, 213, 202, 0.15); color: var(--color-positive); font-size: 0.75rem; font-weight: 700; border-radius: 999px;">
                                Real
                              </span>
                            )
                            : (
                              <span style="display: inline-block; padding: 0.15rem 0.5rem; background: rgba(242, 193, 119, 0.15); color: var(--color-caution); font-size: 0.75rem; font-weight: 700; border-radius: 999px;">
                                Fake
                              </span>
                            )}
                        </td>
                        <td style="padding: 1rem; text-align: center; font-weight: 600; font-size: 0.875rem;">
                          Lvl {w.difficulty}
                        </td>
                        <td style="padding: 1rem; text-align: center;">
                          {w.reviewed
                            ? (
                              <span style="display: inline-block; padding: 0.15rem 0.5rem; background: rgba(139, 213, 202, 0.15); color: var(--color-positive); font-size: 0.75rem; font-weight: 700; border-radius: 999px;">
                                ✓ Reviewed
                              </span>
                            )
                            : (
                              <span style="display: inline-block; padding: 0.15rem 0.5rem; background: rgba(242, 239, 250, 0.06); color: var(--pico-muted-color); font-size: 0.75rem; font-weight: 700; border-radius: 999px;">
                                — Pending
                              </span>
                            )}
                        </td>
                        <td style="padding: 1rem; text-align: right;">
                          <div style="display: inline-flex; gap: 0.5rem; align-items: center;">
                            <a
                              href={`/admin/words/${w.id}/edit`}
                              role="button"
                              class="outline"
                              style="margin: 0; font-size: 0.75rem; padding: 0.35rem 0.75rem; border-color: var(--pico-muted-color); color: var(--pico-color);"
                            >
                              Edit
                            </a>
                            <form
                              method="post"
                              action={`/admin/words/${w.id}/delete`}
                              style="margin: 0;"
                              onsubmit="return confirm('Are you sure you want to delete this word?')"
                            >
                              <button
                                type="submit"
                                class="outline contrast"
                                style="margin: 0; font-size: 0.75rem; padding: 0.35rem 0.75rem; border-color: #ff7675; color: #ff7675;"
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

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <nav style="display: flex; justify-content: center; gap: 0.5rem; align-items: center; margin-top: 1.5rem;">
                  <a
                    href={buildUrl(1)}
                    role="button"
                    class={`outline secondary ${page === 1 ? "disabled" : ""}`}
                    style="margin: 0; padding: 0.35rem 0.75rem; font-size: 0.75rem;"
                  >
                    ⏮ First
                  </a>
                  <a
                    href={buildUrl(page - 1)}
                    role="button"
                    class={`outline secondary ${page === 1 ? "disabled" : ""}`}
                    style="margin: 0; padding: 0.35rem 0.75rem; font-size: 0.75rem;"
                  >
                    ◀ Prev
                  </a>
                  <span style="font-size: 0.875rem; color: var(--pico-muted-color); font-weight: 600;">
                    Page {page} of {totalPages}
                  </span>
                  <a
                    href={buildUrl(page + 1)}
                    role="button"
                    class={`outline secondary ${
                      page === totalPages ? "disabled" : ""
                    }`}
                    style="margin: 0; padding: 0.35rem 0.75rem; font-size: 0.75rem;"
                  >
                    Next ▶
                  </a>
                  <a
                    href={buildUrl(totalPages)}
                    role="button"
                    class={`outline secondary ${
                      page === totalPages ? "disabled" : ""
                    }`}
                    style="margin: 0; padding: 0.35rem 0.75rem; font-size: 0.75rem;"
                  >
                    Last ⏭
                  </a>
                </nav>
              )}
            </div>
          )}
      </div>
    </AdminLayout>
  );
}
