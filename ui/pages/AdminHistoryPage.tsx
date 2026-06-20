import { AdminLayout } from "../components/AdminLayout.tsx";

type TestRunItem = {
  id: number;
  sessionId: string;
  score: number;
  truthfulness: number;
  completedAt: Date;
};

type AdminHistoryPageProps = {
  history: TestRunItem[];
  totalCount: number;
  page: number;
  totalPages: number;
  search: string;
  orderBy: string;
  orderDir: "asc" | "desc";
  error?: string;
  success?: string;
};

export function AdminHistoryPage({
  history,
  totalCount,
  page,
  totalPages,
  search,
  orderBy,
  orderDir,
  error,
  success,
}: AdminHistoryPageProps) {
  const buildSortUrl = (column: string) => {
    const params = new URLSearchParams();
    params.set("page", "1");
    if (search) params.set("q", search);
    params.set("orderBy", column);
    if (orderBy === column) {
      params.set("orderDir", orderDir === "asc" ? "desc" : "asc");
    } else {
      params.set("orderDir", "desc");
    }
    return `/admin/history?${params.toString()}`;
  };

  const buildPageUrl = (targetPage: number) => {
    const params = new URLSearchParams();
    params.set("page", String(targetPage));
    if (search) params.set("q", search);
    if (orderBy) params.set("orderBy", orderBy);
    if (orderDir) params.set("orderDir", orderDir);
    return `/admin/history?${params.toString()}`;
  };

  const formatDate = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <AdminLayout title="Test History" activeTab="history">
      <div class="history-shell">
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
            Test Session History ({totalCount})
          </h3>
          <div class="d-inline-flex gap-05">
            <a
              href="/admin/history/export?format=csv"
              role="button"
              class="admin-btn-primary btn-mini fs-0875"
            >
              📥 Export CSV
            </a>
            <a
              href="/admin/history/export?format=json"
              role="button"
              class="outline btn-mini btn-outline-muted fw-700 fs-0875"
            >
              📥 Export JSON
            </a>
          </div>
        </div>

        {/* Filter / Search bar */}
        <article class="admin-panel admin-panel-strong p-125 mb-15">
          <form
            method="get"
            action="/admin/history"
            class="filter-form filter-form-history"
          >
            <input type="hidden" name="orderBy" value={orderBy} />
            <input type="hidden" name="orderDir" value={orderDir} />
            <div class="m-0">
              <label for="q" class="admin-label fs-075">
                Search Session ID
              </label>
              <input
                type="text"
                id="q"
                name="q"
                value={search}
                placeholder="Search by Session ID..."
                class="m-0 fs-0875"
              />
            </div>
            <button
              type="submit"
              class="m-0 px-15 fw-700 h-100"
            >
              Search
            </button>
            {search && (
              <a
                href={`/admin/history?orderBy=${orderBy}&orderDir=${orderDir}`}
                role="button"
                class="outline secondary m-0 px-15 fw-700 h-100 flex-center"
              >
                Clear
              </a>
            )}
          </form>
        </article>

        {/* Table list */}
        {history.length === 0
          ? (
            <article class="empty-state empty-state-large">
              No test sessions recorded yet.
            </article>
          )
          : (
            <div>
              <div class="table-wrapper">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Session ID</th>
                      <th class="text-center">
                        <a
                          href={buildSortUrl("score")}
                          class="sort-anchor sort-anchor-center"
                        >
                          Score {orderBy === "score"
                            ? (orderDir === "asc" ? "▲" : "▼")
                            : ""}
                        </a>
                      </th>
                      <th class="text-center">
                        Truthfulness
                      </th>
                      <th class="text-right">
                        <a
                          href={buildSortUrl("completedAt")}
                          class="sort-anchor sort-anchor-right"
                        >
                          Completed At {orderBy === "completedAt"
                            ? (orderDir === "asc" ? "▲" : "▼")
                            : ""}
                        </a>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((run) => (
                      <tr
                        key={run.id}
                        class="border-bottom-row"
                      >
                        <td class="fs-0875 color-muted">
                          {run.id}
                        </td>
                        <td class="admin-monospace fw-700">
                          {run.sessionId}
                        </td>
                        <td class="text-center fw-600">
                          {run.score}%
                        </td>
                        <td class="text-center fw-600">
                          {run.truthfulness}%
                        </td>
                        <td class="text-right color-muted fs-0875">
                          {formatDate(run.completedAt)}
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
                    href={buildPageUrl(1)}
                    role="button"
                    class={`outline secondary btn-mini ${
                      page === 1 ? "disabled" : ""
                    }`}
                  >
                    ⏮ First
                  </a>
                  <a
                    href={buildPageUrl(page - 1)}
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
                    href={buildPageUrl(page + 1)}
                    role="button"
                    class={`outline secondary btn-mini ${
                      page === totalPages ? "disabled" : ""
                    }`}
                  >
                    Next ▶
                  </a>
                  <a
                    href={buildPageUrl(totalPages)}
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
