import { Layout } from "../components/Layout.tsx";
import { WordGrid } from "../components/WordGrid.tsx";

type Word = {
  id: number;
  value: string;
};

type Stage1PageProps = {
  words: Word[];
};

export function Stage1Page({ words }: Stage1PageProps) {
  return (
    <Layout title="ELX – Word Selection">
      <main>
        <h1>Stage 1: Word Selection</h1>
        <p>Check every word you know.</p>
        <WordGrid words={words} action="/stage/1" />
      </main>
    </Layout>
  );
}
