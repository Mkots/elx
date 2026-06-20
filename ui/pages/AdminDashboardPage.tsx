import { AdminLayout } from "../components/AdminLayout.tsx";

export type TestRun = {
  id: number;
  sessionId: string;
  score: number;
  truthfulness: number;
  completedAt: Date;
  ticketId: number | null;
};

type AdminDashboardProps = {
  totalRuns: number;
  avgScore: number;
  avgTruthfulness: number;
  recentRuns: TestRun[];
  unreviewedCount: number;
};

export function AdminDashboardPage({
  totalRuns,
  avgScore,
  avgTruthfulness,
  recentRuns,
  unreviewedCount,
}: AdminDashboardProps) {
  return (
    <AdminLayout title="Dashboard" activeTab="dashboard">
      <div class="dashboard-shell">
        <section class="metrics-grid">
          <article class="metric-card admin-panel admin-panel-card">
            <span class="metric-label fs-0875 color-muted fw-700 uppercase">
              Total Runs
            </span>
            <span class="metric-value fs-25 fw-800">
              {totalRuns}
            </span>
          </article>
          <article class="metric-card admin-panel admin-panel-card">
            <span class="metric-label fs-0875 color-muted fw-700 uppercase">
              Average Score
            </span>
            <span class="metric-value fs-25 fw-800 color-primary">
              {avgScore}%
            </span>
          </article>
          <article class="metric-card admin-panel admin-panel-card">
            <span class="metric-label fs-0875 color-muted fw-700 uppercase">
              Avg Truthfulness
            </span>
            <span class="metric-value fs-25 fw-800 color-positive">
              {avgTruthfulness}%
            </span>
          </article>
          <article class="metric-card admin-panel admin-panel-card">
            <span class="metric-label fs-0875 color-muted fw-700 uppercase">
              Unreviewed Words
            </span>
            <div class="flex-baseline">
              <span class="metric-value fs-25 fw-800 color-orange">
                {unreviewedCount}
              </span>
              {unreviewedCount > 0 && (
                <a
                  href="/admin/words/review"
                  role="button"
                  class="btn-mini btn-orange"
                >
                  Review ➔
                </a>
              )}
            </div>
          </article>
        </section>

        <section class="activity-section">
          <div class="flex-between mb-1 flex-wrap-center gap-1">
            <h3 class="m-0 fs-125">
              Recent Test Activity
            </h3>
            <div class="d-inline-flex gap-05">
              <a
                href="/admin/history/export?format=csv"
                role="button"
                class="btn-mini admin-btn-primary"
              >
                📥 Export CSV
              </a>
              <a
                href="/admin/history/export?format=json"
                role="button"
                class="outline btn-mini btn-outline-muted"
              >
                📥 Export JSON
              </a>
            </div>
          </div>
          {recentRuns.length === 0
            ? (
              <article class="empty-state">
                No vocabulary tests have been completed yet.
              </article>
            )
            : (
              <div class="table-wrapper">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Session ID</th>
                      <th class="text-center">Score</th>
                      <th class="text-center">
                        Truthfulness
                      </th>
                      <th class="text-right">
                        Completed At
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRuns.map((run) => (
                      <tr
                        key={run.id}
                        class="border-bottom-row"
                      >
                        <td class="admin-monospace fs-0875">
                          {run.sessionId}
                        </td>
                        <td class="text-center fw-700 color-primary">
                          {run.score}%
                        </td>
                        <td class="text-center fw-700 color-positive">
                          {run.truthfulness}%
                        </td>
                        <td class="text-right fs-0875 color-muted">
                          {new Date(run.completedAt).toLocaleString("en-US", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </section>
      </div>
    </AdminLayout>
  );
}
