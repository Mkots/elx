import { Layout } from "../components/Layout.tsx";

export function NotFoundPage() {
  return (
    <Layout title="Not Found | ELX">
      <div class="page-container page-container-sm page-container-tall page-container-centered">
        <h1 class="mb-10">404 — Page not found</h1>
        <p class="color-muted mb-20">
          The page you're looking for doesn't exist.
        </p>
        <a href="/">Back to home</a>
      </div>
    </Layout>
  );
}
