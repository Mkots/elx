import { AdminLayout } from "../components/AdminLayout.tsx";

type TicketListItem = {
  id: number;
  code: string;
  status: string;
  title: string | null;
  notes: string | null;
  questionsCount: number;
  createdAt: Date;
};

type AdminTicketsPageProps = {
  tickets: TicketListItem[];
  error?: string;
  success?: string;
};

export function AdminTicketsPage(
  { tickets, error, success }: AdminTicketsPageProps,
) {
  return (
    <AdminLayout title="Ticket Builder & Curation" activeTab="tickets">
      <div class="admin-container">
        {error && <div class="alert alert-error">⚠️ {error}</div>}
        {success && <div class="alert alert-success">✅ {success}</div>}

        <div class="grid">
          {/* List of Tickets */}
          <article class="admin-panel admin-panel-card admin-panel-padding flex-2">
            <header class="m-0 mb-15">
              <h3 class="m-0 fs-125">All Test Tickets</h3>
            </header>

            {tickets.length === 0
              ? (
                <p class="color-muted">
                  No tickets have been generated yet. Use the generator on the
                  right to create one.
                </p>
              )
              : (
                <div class="table-scroll">
                  <table class="m-0">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Questions</th>
                        <th>Created At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.map((t) => {
                        let statusBadgeClass = "secondary";
                        if (t.status === "published") {
                          statusBadgeClass = "success";
                        } else if (t.status === "complete") {
                          statusBadgeClass = "primary";
                        } else if (t.status === "base") {
                          statusBadgeClass = "warning";
                        }

                        return (
                          <tr>
                            <td>
                              <strong class="admin-monospace">
                                {t.code}
                              </strong>
                            </td>
                            <td>{t.title || "-"}</td>
                            <td>
                              <span
                                class={`badge badge-compact badge-${statusBadgeClass}`}
                              >
                                {t.status}
                              </span>
                            </td>
                            <td>{t.questionsCount}</td>
                            <td>
                              {new Date(t.createdAt).toLocaleDateString()}
                            </td>
                            <td>
                              <div class="flex-wrap-center gap-05">
                                <a
                                  href={`/admin/tickets/${t.id}`}
                                  class="button outline small m-0 btn-table-action"
                                >
                                  ✏️ Enrich
                                </a>
                                <form
                                  action={`/admin/tickets/${t.id}/delete`}
                                  method="post"
                                  class="m-0"
                                  onsubmit="return confirm('Are you sure you want to delete this ticket?');"
                                >
                                  <button
                                    type="submit"
                                    class="button outline small contrast m-0 btn-table-action btn-danger-border"
                                  >
                                    🗑️ Delete
                                  </button>
                                </form>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </article>

          {/* Generate Ticket Config Form */}
          <article class="admin-panel admin-panel-card admin-panel-padding flex-1 align-self-start">
            <header class="m-0 mb-15">
              <h3 class="m-0 fs-125">Generate Base Ticket</h3>
            </header>
            <p class="fs-0875 color-muted">
              Creates a new ticket under status <strong>base</strong>{" "}
              by selecting words and challenges based on the active config.
            </p>
            <form action="/admin/tickets/generate" method="post" class="m-0">
              <div class="form-group mb-15">
                <label for="title" class="admin-label">
                  Ticket Title (Optional)
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  placeholder="e.g. June 2026 Core Test"
                  class="m-0"
                />
              </div>
              <div class="form-group mb-15">
                <label for="notes" class="admin-label">
                  Curation Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  placeholder="Add any administrative details here..."
                  class="m-0"
                  rows={3}
                />
              </div>
              <button type="submit" class="m-0 w-100">
                ⚡ Generate Base Ticket
              </button>
            </form>
          </article>
        </div>
      </div>
    </AdminLayout>
  );
}
