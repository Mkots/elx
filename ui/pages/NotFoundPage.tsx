import { Layout } from "../components/Layout.tsx";

export function NotFoundPage() {
  return (
    <Layout title="Not Found | ELX">
      <div style="max-width: 600px; margin: 60px auto; padding: 20px; text-align: center;">
        <h1 style="margin-bottom: 10px;">404 — Page not found</h1>
        <p style="color: var(--pico-muted-color); margin-bottom: 20px;">
          The page you're looking for doesn't exist.
        </p>
        <a href="/">Back to home</a>
      </div>
    </Layout>
  );
}
