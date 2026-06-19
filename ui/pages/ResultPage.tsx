import { Layout } from "../components/Layout.tsx";

type ResultPageProps = {
  score: number;
  truthfulness: number;
};

export function ResultPage({ score, truthfulness }: ResultPageProps) {
  return (
    <Layout title="ELX – Results">
      <h1>Your Results</h1>
      <div class="result-card">
        <div class="result-score">
          <span class="result-label">LexTALE Score</span>
          <span class="result-value" data-testid="score">{score}</span>
        </div>
        <div class="result-truthfulness">
          <span class="result-label">Truthfulness</span>
          <span class="result-value" data-testid="truthfulness">
            {truthfulness}%
          </span>
        </div>
      </div>
      <a href="/stage/1" role="button">Start Over</a>
    </Layout>
  );
}
