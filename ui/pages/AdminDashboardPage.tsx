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
};

export function AdminDashboardPage({
  totalRuns,
  avgScore,
  avgTruthfulness,
  recentRuns,
}: AdminDashboardProps) {
  return (
    <AdminLayout title="Dashboard" activeTab="dashboard">
      <div class="dashboard-shell">
        <section
          class="metrics-grid"
          style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2.5rem;"
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
        </section>

        <section class="activity-section">
          <h3 style="margin-bottom: 1rem; font-size: 1.25rem;">
            Recent Test Activity
          </h3>
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
