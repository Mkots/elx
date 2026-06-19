import { Layout } from "../components/Layout.tsx";

export function HomePage() {
  return (
    <Layout title="ELX">
      <h1>ELX Vocabulary Assessment</h1>
      <p>A short test to measure your English vocabulary size.</p>
      <a href="/stage/1" role="button">Start test →</a>
    </Layout>
  );
}
