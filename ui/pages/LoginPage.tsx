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
        <link rel="stylesheet" href="/static/pico.min.css" />
        <link rel="stylesheet" href="/static/app.css" />
      </head>
      <body class="login-body">
        <main class="login-container">
          <article class="login-card">
            <header class="login-header">
              <h2 style="margin: 0; font-size: 1.5rem;">ELX Admin Portal</h2>
              <p style="margin: 0; font-size: 0.875rem; color: var(--pico-muted-color);">Please sign in to continue</p>
            </header>
            <form action="/admin/login" method="post">
              {error && (
                <div class="login-error" style="color: #ff7675; background: rgba(255, 118, 117, 0.1); border: 1px solid rgba(255, 118, 117, 0.2); padding: 0.75rem 1rem; border-radius: var(--pico-border-radius); margin-bottom: 1rem; font-size: 0.875rem;">
                  {error}
                </div>
              )}
              <div class="form-group" style="margin-bottom: 1rem;">
                <label for="username" style="font-size: 0.875rem; font-weight: 600;">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  placeholder="Enter username"
                  required
                  style="margin-bottom: 0;"
                />
              </div>
              <div class="form-group" style="margin-bottom: 1.5rem;">
                <label for="password" style="font-size: 0.875rem; font-weight: 600;">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Enter password"
                  required
                  style="margin-bottom: 0;"
                />
              </div>
              <button type="submit" style="width: 100%; margin: 0; background: var(--pico-primary); color: #2d2839; font-weight: 700;">
                Sign In
              </button>
            </form>
            <footer style="text-align: center; font-size: 0.75rem; color: var(--pico-muted-color); padding-top: 1rem; border-top: 1px solid rgba(242, 239, 250, 0.08); margin-top: 1rem;">
              <a href="/" style="color: var(--pico-muted-color); text-decoration: underline;">Back to home</a>
            </footer>
          </article>
        </main>
      </body>
    </html>
  );
}
