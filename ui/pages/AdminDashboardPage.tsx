import { AdminLayout } from "../components/AdminLayout.tsx";

export type TestRun = {
  id: number;
  sessionId: string;
  score: number;
  truthfulness: number;
  completedAt: Date;
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
        <section
          class="metrics-grid"
          style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1.5rem; margin-bottom: 2.5rem;"
        >
          <article
            class="metric-card"
            style="margin: 0; padding: 1.5rem; border-radius: var(--pico-border-radius); background: var(--pico-card-background-color); border: 1px solid rgba(242, 239, 250, 0.08); display: flex; flex-direction: column; gap: 0.5rem;"
          >
            <span
              class="metric-label"
              style="font-size: 0.875rem; color: var(--pico-muted-color); font-weight: 700; text-transform: uppercase;"
            >
              Total Runs
            </span>
            <span
              class="metric-value"
              style="font-size: 2.5rem; font-weight: 800; color: var(--pico-color);"
            >
              {totalRuns}
            </span>
          </article>
          <article
            class="metric-card"
            style="margin: 0; padding: 1.5rem; border-radius: var(--pico-border-radius); background: var(--pico-card-background-color); border: 1px solid rgba(242, 239, 250, 0.08); display: flex; flex-direction: column; gap: 0.5rem;"
          >
            <span
              class="metric-label"
              style="font-size: 0.875rem; color: var(--pico-muted-color); font-weight: 700; text-transform: uppercase;"
            >
              Average Score
            </span>
            <span
              class="metric-value"
              style="font-size: 2.5rem; font-weight: 800; color: var(--pico-primary);"
            >
              {avgScore}%
            </span>
          </article>
          <article
            class="metric-card"
            style="margin: 0; padding: 1.5rem; border-radius: var(--pico-border-radius); background: var(--pico-card-background-color); border: 1px solid rgba(242, 239, 250, 0.08); display: flex; flex-direction: column; gap: 0.5rem;"
          >
            <span
              class="metric-label"
              style="font-size: 0.875rem; color: var(--pico-muted-color); font-weight: 700; text-transform: uppercase;"
            >
              Avg Truthfulness
            </span>
            <span
              class="metric-value"
              style="font-size: 2.5rem; font-weight: 800; color: var(--color-positive);"
            >
              {avgTruthfulness}%
            </span>
          </article>
          <article
            class="metric-card"
            style="margin: 0; padding: 1.5rem; border-radius: var(--pico-border-radius); background: var(--pico-card-background-color); border: 1px solid rgba(242, 239, 250, 0.08); display: flex; flex-direction: column; gap: 0.5rem;"
          >
            <span
              class="metric-label"
              style="font-size: 0.875rem; color: var(--pico-muted-color); font-weight: 700; text-transform: uppercase;"
            >
              Unreviewed Words
            </span>
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <span
                class="metric-value"
                style="font-size: 2.5rem; font-weight: 800; color: #ffb86c;"
              >
                {unreviewedCount}
              </span>
              {unreviewedCount > 0 && (
                <a
                  href="/admin/words/review"
                  role="button"
                  style="margin: 0; font-size: 0.75rem; padding: 0.25rem 0.5rem; background: #ffb86c; color: #2d2839; font-weight: 700; border: none;"
                >
                  Review ➔
                </a>
              )}
            </div>
          </article>
        </section>

        <section class="activity-section">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
            <h3 style="margin: 0; font-size: 1.25rem;">
              Recent Test Activity
            </h3>
            <div style="display: inline-flex; gap: 0.5rem;">
              <a
                href="/admin/history/export?format=csv"
                role="button"
                style="margin: 0; font-size: 0.875rem; padding: 0.35rem 0.75rem; background: var(--pico-primary); color: #2d2839; font-weight: 700;"
              >
                📥 Export CSV
              </a>
              <a
                href="/admin/history/export?format=json"
                role="button"
                class="outline"
                style="margin: 0; font-size: 0.875rem; padding: 0.35rem 0.75rem; font-weight: 700; border-color: var(--pico-muted-color); color: var(--pico-color);"
              >
                📥 Export JSON
              </a>
            </div>
          </div>
          {recentRuns.length === 0
            ? (
              <article style="padding: 2rem; text-align: center; color: var(--pico-muted-color); background: rgba(242, 239, 250, 0.03); border: 1px dashed rgba(242, 239, 250, 0.16); border-radius: var(--pico-border-radius);">
                No vocabulary tests have been completed yet.
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
                      <th style="padding: 1rem;">Session ID</th>
                      <th style="padding: 1rem; text-align: center;">Score</th>
                      <th style="padding: 1rem; text-align: center;">
                        Truthfulness
                      </th>
                      <th style="padding: 1rem; text-align: right;">
                        Completed At
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRuns.map((run) => (
                      <tr
                        key={run.id}
                        style="border-bottom: 1px solid rgba(242, 239, 250, 0.04);"
                      >
                        <td style="padding: 1rem; font-family: var(--pico-font-family-monospace); font-size: 0.875rem;">
                          {run.sessionId}
                        </td>
                        <td style="padding: 1rem; text-align: center; font-weight: 700; color: var(--pico-primary);">
                          {run.score}%
                        </td>
                        <td style="padding: 1rem; text-align: center; font-weight: 700; color: var(--color-positive);">
                          {run.truthfulness}%
                        </td>
                        <td style="padding: 1rem; text-align: right; font-size: 0.875rem; color: var(--pico-muted-color);">
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
