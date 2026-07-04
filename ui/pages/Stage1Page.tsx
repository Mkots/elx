import { Layout } from "../components/Layout.tsx";
import { WordGrid } from "../components/WordGrid.tsx";
import type { AnalyticsProps } from "../../analytics.ts";

type Word = {
  id: number;
  value: string;
};

type Stage1PageProps = {
  analytics?: AnalyticsProps;
  words: Word[];
  ticketCode: string;
};

export function Stage1Page({ analytics, words, ticketCode }: Stage1PageProps) {
  return (
    <Layout analytics={analytics} title="ELX – Word Selection">
      <h1>Stage 1: Word Selection</h1>
      <p style="margin-top: -10px; font-size: 0.875rem; color: var(--pico-muted-color); margin-bottom: 20px;">
        Test Version: <strong>{ticketCode}</strong>
      </p>
      <p>Check every word you know.</p>
      <WordGrid words={words} action="/stage/1" />
    </Layout>
  );
}
