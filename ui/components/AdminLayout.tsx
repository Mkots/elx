import type { Child } from "hono/jsx";

type AdminLayoutProps = {
  children: Child;
  title: string;
  activeTab?: string;
  htmx?: boolean;
};

export function AdminLayout(
  { children, title, activeTab, htmx = false }: AdminLayoutProps,
) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="ELX Admin Panel" />
        <title>{title} | ELX Admin</title>
        <link rel="stylesheet" href="/static/admin.css" />
        {htmx && <script src="/static/htmx.min.js" defer></script>}
      </head>
      <body class="admin-body">
        <div class="admin-layout">
          <aside class="admin-sidebar">
            <div class="admin-logo">
              <strong>ELX Admin</strong>
            </div>
            <nav class="admin-nav">
              <ul>
                <li>
                  <a
                    href="/admin"
                    class={activeTab === "dashboard" ? "active" : ""}
                  >
                    📊 Dashboard
                  </a>
                </li>
                <li>
                  <a
                    href="/admin/words"
                    class={activeTab === "words" ? "active" : ""}
                  >
                    📝 Words Manager
                  </a>
                </li>
                <li>
                  <a
                    href="/admin/ticket-config"
                    class={activeTab === "ticket-config" ? "active" : ""}
                  >
                    ⚙️ Ticket Config
                  </a>
                </li>
                <li>
                  <a
                    href="/admin/tickets"
                    class={activeTab === "tickets" ? "active" : ""}
                  >
                    🎟️ Ticket Builder
                  </a>
                </li>
                <li>
                  <a
                    href="/admin/history"
                    class={activeTab === "history" ? "active" : ""}
                  >
                    🕒 Test History
                  </a>
                </li>
              </ul>
            </nav>
            <div class="admin-sidebar-footer">
              <form action="/admin/logout" method="post" class="m-0">
                <button
                  type="submit"
                  class="outline contrast logout-btn m-0 w-100"
                >
                  Logout
                </button>
              </form>
            </div>
          </aside>
          <div class="admin-main-wrapper">
            <header class="admin-header">
              <h2 class="m-0 fs-15">{title}</h2>
              <div class="admin-user-info fs-0875 color-muted">
                Logged in as <strong class="color-pico-color">Admin</strong>
              </div>
            </header>
            <main class="admin-content">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
