import { Layout } from "./layout.tsx";

export function HomePage() {
  return (
    <Layout title="ELX">
      <main>
        <h1>Hello, ELX.</h1>
        <p>Deno + Hono server-side rendering is running.</p>
        <p>
          <a href="/health">Check health</a>
        </p>
      </main>
    </Layout>
  );
}
