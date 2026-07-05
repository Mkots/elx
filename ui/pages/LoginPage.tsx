type LoginPageProps = {
  error?: string;
};

export function LoginPage({ error }: LoginPageProps = {}) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="ELX Admin Login" />
        <title>Admin Login | ELX</title>
        <link rel="stylesheet" href="/static/admin.css" />
      </head>
      <body class="login-body">
        <main class="login-container">
          <article class="login-card">
            <header class="login-header">
              <h2 class="m-0 fs-15">ELX Admin Portal</h2>
              <p class="m-0 fs-0875 color-muted">
                Please sign in to continue
              </p>
            </header>
            <form action="/admin/login" method="post">
              {error && (
                <div class="login-error alert alert-error mb-1">
                  {error}
                </div>
              )}
              <div class="form-group mb-1">
                <label for="username" class="fs-0875 fw-600">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  placeholder="Enter username"
                  required
                  class="mb-0"
                />
              </div>
              <div class="form-group mb-15">
                <label for="password" class="fs-0875 fw-600">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Enter password"
                  required
                  class="mb-0"
                />
              </div>
              <button
                type="submit"
                class="admin-btn-primary btn-full"
              >
                Sign In
              </button>
            </form>
            <footer class="login-footer">
              <a href="/" class="color-muted decoration-underline">
                Back to home
              </a>
            </footer>
          </article>
        </main>
      </body>
    </html>
  );
}
