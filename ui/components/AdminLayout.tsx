import type { Child } from "hono/jsx";

type AdminLayoutProps = {
  children: Child;
  title: string;
  activeTab?: string;
};

export function AdminLayout({ children, title, activeTab }: AdminLayoutProps) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="ELX Admin Panel" />
        <title>{title} | ELX Admin</title>
        <link rel="stylesheet" href="/static/pico.min.css" />
        <link rel="stylesheet" href="/static/app.css" />
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
                    href="/admin/challenges"
                    class={activeTab === "challenges" ? "active" : ""}
                  >
                    🧩 Challenges
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
              <form action="/admin/logout" method="post" style="margin: 0;">
                <button type="submit" class="outline contrast logout-btn" style="margin: 0; width: 100%;">
                  Logout
                </button>
              </form>
            </div>
          </aside>
          <div class="admin-main-wrapper">
            <header class="admin-header">
              <h2 style="margin: 0; font-size: 1.5rem;">{title}</h2>
              <div class="admin-user-info" style="font-size: 0.875rem; color: var(--pico-muted-color);">
                Logged in as <strong style="color: var(--pico-color);">Admin</strong>
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
