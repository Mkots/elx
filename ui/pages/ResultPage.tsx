import { Layout } from "../components/Layout.tsx";
import type { AnalyticsProps } from "../../analytics.ts";

type ResultPageProps = {
  analytics?: AnalyticsProps;
  score: number;
  truthfulness: number;
  vocabularySize?: number | null;
  cefrLevel?: string;
};

function confidenceLabel(truthfulness: number) {
  if (truthfulness >= 85) return "High confidence";
  if (truthfulness >= 60) return "Moderate confidence";
  return "Review recommended";
}

export function ResultPage(
  { analytics, score, truthfulness, vocabularySize, cefrLevel }:
    ResultPageProps,
) {
  return (
    <Layout analytics={analytics} title="ELX – Results">
      <section class="result-shell">
        <div class="result-header">
          <p class="result-kicker">Assessment complete</p>
          <h1>Your Results</h1>
          <p>
            Your score reflects known real words minus known pseudowords.
          </p>
        </div>

        {typeof vocabularySize === "number" && (
          <div class="result-vocab-card">
            <span class="result-vocab-label">Estimated Vocabulary Size</span>
            <span class="result-vocab-val" data-testid="vocabulary-size">
              {vocabularySize.toLocaleString()}
            </span>
            {cefrLevel && (
              <div class="result-cefr-badge">
                <span class="cefr-label">CEFR Level</span>
                <span class="cefr-val" data-testid="cefr-level">
                  {cefrLevel}
                </span>
              </div>
            )}
            <p class="result-vocab-desc">
              words based on your test performance
            </p>
          </div>
        )}

        <div class="result-card">
          <div class="result-score result-primary-metric">
            <span class="result-label">LexTALE Score</span>
            <span class="result-value" data-testid="score">{score}</span>
          </div>
          <div class="result-truthfulness">
            <span class="result-label">Truthfulness</span>
            <span class="result-value" data-testid="truthfulness">
              {truthfulness}%
            </span>
            <progress
              class="truthfulness-progress"
              value={truthfulness}
              max="100"
              aria-label="Truthfulness"
            />
            <span class="result-caption">
              {confidenceLabel(truthfulness)}
            </span>
          </div>
        </div>

        <a class="result-restart-btn" href="/stage/1" role="button">
          Start Over
        </a>
      </section>
    </Layout>
  );
}
