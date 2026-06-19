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
            Test Session History ({totalCount})
          </h3>
        </div>

        {/* Filter / Search bar */}
        <article style="padding: 1.25rem; margin-bottom: 1.5rem; background: var(--color-panel-strong); border: 1px solid rgba(242, 239, 250, 0.08);">
          <form
            method="get"
            action="/admin/history"
            style="margin: 0; display: grid; grid-template-columns: 3fr auto auto; gap: 1rem; align-items: end;"
          >
            <input type="hidden" name="orderBy" value={orderBy} />
            <input type="hidden" name="orderDir" value={orderDir} />
            <div style="margin: 0;">
              <label
                for="q"
                style="font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem; display: block;"
              >
                Search Session ID
              </label>
              <input
                type="text"
                id="q"
                name="q"
                value={search}
                placeholder="Search by Session ID..."
                style="margin: 0; font-size: 0.875rem;"
              />
            </div>
            <button
              type="submit"
              style="margin: 0; padding: 0 1.5rem; font-weight: 700; height: 100%;"
            >
              Search
            </button>
            {search && (
              <a
                href={`/admin/history?orderBy=${orderBy}&orderDir=${orderDir}`}
                role="button"
                class="outline secondary"
                style="margin: 0; padding: 0 1.5rem; font-weight: 700; height: 100%; display: flex; align-items: center; justify-content: center;"
              >
                Clear
              </a>
            )}
          </form>
        </article>

        {/* Table list */}
        {history.length === 0
          ? (
            <article style="padding: 3rem; text-align: center; color: var(--pico-muted-color); background: rgba(242, 239, 250, 0.03); border: 1px dashed rgba(242, 239, 250, 0.16); border-radius: var(--pico-border-radius);">
              No test sessions recorded yet.
            </article>
          )
          : (
            <div>
              <div
                class="overflow-auto"
                style="border: 1px solid rgba(242, 239, 250, 0.08); border-radius: var(--pico-border-radius); background: var(--color-panel-strong); margin-bottom: 1.5rem;"
              >
                <table style="margin: 0; width: 100%;">
                  <thead>
                    <tr>
                      <th style="padding: 1rem;">ID</th>
                      <th style="padding: 1rem;">Session ID</th>
                      <th style="padding: 1rem; text-align: center;">
                        <a
                          href={buildSortUrl("score")}
                          style="text-decoration: none; color: inherit; display: inline-flex; align-items: center; justify-content: center; gap: 0.25rem; width: 100%;"
                        >
                          Score {orderBy === "score"
                            ? (orderDir === "asc" ? "▲" : "▼")
                            : ""}
                        </a>
                      </th>
                      <th style="padding: 1rem; text-align: center;">
                        Truthfulness
                      </th>
                      <th style="padding: 1rem; text-align: right;">
                        <a
                          href={buildSortUrl("completedAt")}
                          style="text-decoration: none; color: inherit; display: inline-flex; align-items: center; justify-content: right; gap: 0.25rem; width: 100%;"
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
                        style="border-bottom: 1px solid rgba(242, 239, 250, 0.04);"
                      >
                        <td style="padding: 1rem; font-size: 0.875rem; color: var(--pico-muted-color);">
                          {run.id}
                        </td>
                        <td style="padding: 1rem; font-family: var(--pico-font-family-monospace); font-weight: 700;">
                          {run.sessionId}
                        </td>
                        <td style="padding: 1rem; text-align: center; font-weight: 600;">
                          {run.score}%
                        </td>
                        <td style="padding: 1rem; text-align: center; font-weight: 600;">
                          {run.truthfulness}%
                        </td>
                        <td style="padding: 1rem; text-align: right; color: var(--pico-muted-color); font-size: 0.875rem;">
                          {formatDate(run.completedAt)}
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
                    href={buildPageUrl(1)}
                    role="button"
                    class={`outline secondary ${page === 1 ? "disabled" : ""}`}
                    style="margin: 0; padding: 0.35rem 0.75rem; font-size: 0.75rem;"
                  >
                    ⏮ First
                  </a>
                  <a
                    href={buildPageUrl(page - 1)}
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
                    href={buildPageUrl(page + 1)}
                    role="button"
                    class={`outline secondary ${
                      page === totalPages ? "disabled" : ""
                    }`}
                    style="margin: 0; padding: 0.35rem 0.75rem; font-size: 0.75rem;"
                  >
                    Next ▶
                  </a>
                  <a
                    href={buildPageUrl(totalPages)}
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
