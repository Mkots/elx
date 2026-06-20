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
          <div class="alert alert-error">
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div class="alert alert-success">
            ✅ {success}
          </div>
        )}

        <div class="flex-between mb-15 flex-wrap gap-1">
          <h3 class="m-0 fs-125">
            Vocabulary Words ({totalCount})
          </h3>
          <div class="d-inline-flex gap-05">
            <a
              href="/admin/words/review"
              role="button"
              class="outline btn-outline-orange fw-700 m-0"
            >
              🔍 Review Queue
            </a>
            <a
              href="/admin/words/import"
              role="button"
              class="outline btn-outline-muted fw-700 m-0"
            >
              📥 Import Words
            </a>
            <a
              href="/admin/words/new"
              role="button"
              class="admin-btn-primary m-0"
            >
              ➕ Add Word
            </a>
          </div>
        </div>

        {/* Filter bar */}
        <article class="admin-panel admin-panel-strong p-125 mb-15">
          <form
            method="get"
            action="/admin/words"
            class="filter-form filter-form-words"
          >
            <div class="m-0">
              <label for="q" class="admin-label fs-075">
                Search
              </label>
              <input
                type="text"
                id="q"
                name="q"
                value={search}
                placeholder="Search word value..."
                class="m-0 fs-0875"
              />
            </div>
            <div class="m-0">
              <label for="difficulty" class="admin-label fs-075">
                Difficulty
              </label>
              <select
                id="difficulty"
                name="difficulty"
                class="m-0 fs-0875"
              >
                <option value="">All</option>
                {[1, 2, 3, 4, 5].map((d) => (
                  <option value={String(d)} selected={difficulty === d}>
                    Level {d}
                  </option>
                ))}
              </select>
            </div>
            <div class="m-0">
              <label for="isReal" class="admin-label fs-075">
                Type
              </label>
              <select
                id="isReal"
                name="isReal"
                class="m-0 fs-0875"
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
            <div class="m-0">
              <label for="reviewed" class="admin-label fs-075">
                Reviewed
              </label>
              <select
                id="reviewed"
                name="reviewed"
                class="m-0 fs-0875"
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
              class="m-0 px-15 fw-700 h-100"
            >
              Filter
            </button>
          </form>
        </article>

        {/* Table list */}
        {words.length === 0
          ? (
            <article class="empty-state empty-state-large">
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
                class="m-0 mb-1"
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

                <div class="bulk-bar flex-wrap-center gap-05 admin-panel admin-panel-strong">
                  <span class="fs-075 fw-700 color-muted uppercase letter-spacing-05">
                    Bulk
                  </span>
                  <button
                    type="submit"
                    name="action"
                    value="mark_reviewed"
                    class="outline btn-mini"
                  >
                    ✓ Mark reviewed
                  </button>
                  <button
                    type="submit"
                    name="action"
                    value="mark_unreviewed"
                    class="outline btn-mini"
                  >
                    Mark pending
                  </button>
                  <button
                    type="submit"
                    name="action"
                    value="set_real"
                    class="outline btn-mini btn-outline-positive"
                  >
                    Set Real
                  </button>
                  <button
                    type="submit"
                    name="action"
                    value="set_pseudo"
                    class="outline btn-mini btn-outline-caution"
                  >
                    Set Pseudoword
                  </button>
                  <button
                    type="submit"
                    name="action"
                    value="delete"
                    class="outline contrast btn-mini btn-outline-danger"
                    onclick="return confirm('Delete the selected words? This cannot be undone.')"
                  >
                    Delete
                  </button>
                  <label class="m-0 ms-auto inline-flex-center gap-04 fs-075 color-muted">
                    <input
                      type="checkbox"
                      name="selectAllMatching"
                      value="true"
                      class="m-0"
                    />
                    Apply to all {totalCount} matching this filter
                  </label>
                </div>
              </form>

              <div class="table-wrapper">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th class="w-1">
                        <input
                          type="checkbox"
                          aria-label="Select all rows"
                          class="m-0"
                          onclick="var on=this.checked;document.querySelectorAll('.row-check').forEach(function(c){c.checked=on});"
                        />
                      </th>
                      <th>ID</th>
                      <th>Word Value</th>
                      <th class="text-center">Type</th>
                      <th class="text-center">
                        Difficulty
                      </th>
                      <th class="text-center">
                        Reviewed
                      </th>
                      <th class="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {words.map((w) => (
                      <tr key={w.id} class="border-bottom-row">
                        <td>
                          <input
                            type="checkbox"
                            class="row-check m-0"
                            form="bulkForm"
                            name="ids"
                            value={String(w.id)}
                            aria-label={`Select word ${w.value}`}
                          />
                        </td>
                        <td class="fs-0875 color-muted">
                          {w.id}
                        </td>
                        <td class="admin-monospace fw-700 fs-1125">
                          {w.value}
                        </td>
                        <td class="text-center">
                          {w.isReal
                            ? (
                              <span class="badge badge-positive">
                                Real
                              </span>
                            )
                            : (
                              <span class="badge badge-caution">
                                Fake
                              </span>
                            )}
                        </td>
                        <td class="text-center fw-600 fs-0875">
                          Lvl {w.difficulty}
                        </td>
                        <td class="text-center">
                          {w.reviewed
                            ? (
                              <span class="badge badge-positive">
                                ✓ Reviewed
                              </span>
                            )
                            : (
                              <span class="badge badge-pending">
                                — Pending
                              </span>
                            )}
                        </td>
                        <td class="text-right">
                          <div class="inline-flex-center gap-05">
                            <a
                              href={`/admin/words/${w.id}/edit`}
                              role="button"
                              class="outline btn-mini btn-outline-muted"
                            >
                              Edit
                            </a>
                            <form
                              method="post"
                              action={`/admin/words/${w.id}/delete`}
                              class="m-0"
                              onsubmit="return confirm('Are you sure you want to delete this word?')"
                            >
                              <button
                                type="submit"
                                class="outline contrast btn-mini btn-outline-danger"
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
                <nav class="flex-center gap-05 mt-15">
                  <a
                    href={buildUrl(1)}
                    role="button"
                    class={`outline secondary btn-mini ${
                      page === 1 ? "disabled" : ""
                    }`}
                  >
                    ⏮ First
                  </a>
                  <a
                    href={buildUrl(page - 1)}
                    role="button"
                    class={`outline secondary btn-mini ${
                      page === 1 ? "disabled" : ""
                    }`}
                  >
                    ◀ Prev
                  </a>
                  <span class="fs-0875 color-muted fw-600">
                    Page {page} of {totalPages}
                  </span>
                  <a
                    href={buildUrl(page + 1)}
                    role="button"
                    class={`outline secondary btn-mini ${
                      page === totalPages ? "disabled" : ""
                    }`}
                  >
                    Next ▶
                  </a>
                  <a
                    href={buildUrl(totalPages)}
                    role="button"
                    class={`outline secondary btn-mini ${
                      page === totalPages ? "disabled" : ""
                    }`}
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
