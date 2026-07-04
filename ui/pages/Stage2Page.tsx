import { Layout } from "../components/Layout.tsx";
import type { AnalyticsProps } from "../../analytics.ts";
import { safeJson } from "../../analytics.ts";

type Word = {
  id: number;
  value: string;
};

type Stage2CardProps = {
  analytics?: AnalyticsProps;
  currentIndex: number;
  totalWords: number;
  word: Word;
  ticketCode: string;
};

type Stage2PageProps = Stage2CardProps & {
  pageAnalytics?: AnalyticsProps;
};

function dataLayerPushScript(events: AnalyticsProps["events"] = []) {
  if (events.length === 0) return "";
  return `
    window.dataLayer = window.dataLayer || [];
    for (const event of ${safeJson(events)}) {
      window.dataLayer.push(event);
    }
  `;
}

export function Stage2Card(
  { analytics, currentIndex, totalWords, word }: Stage2CardProps,
) {
  const progressValue = currentIndex + 1;
  const events = analytics?.events ?? [];

  return (
    <section
      id="stage2-card-shell"
      class="verification-card-shell"
      aria-live="polite"
    >
      <div class="stage-progress-row">
        <p class="stage-progress">
          Word {progressValue} of {totalWords}
        </p>
        <span class="stage-progress-count">
          {Math.round((progressValue / totalWords) * 100)}%
        </span>
      </div>
      <progress
        class="verification-progress"
        value={progressValue}
        max={totalWords}
        aria-label="Verification progress"
      />
      <form
        class="verification-card"
        method="post"
        action="/stage/2"
        hx-post="/stage/2"
        hx-target="#stage2-card-shell"
        hx-swap="outerHTML"
      >
        <input type="hidden" name="wordId" value={String(word.id)} />
        <span class="word-value">{word.value}</span>
        <div class="card-choices">
          <button
            class="answer-btn answer-btn-know"
            type="submit"
            name="answer"
            value="know"
          >
            Know
          </button>
          <button
            class="answer-btn answer-btn-dont-know"
            type="submit"
            name="answer"
            value="dont_know"
          >
            {"Don't know"}
          </button>
        </div>
      </form>
      {events.length > 0 && (
        <script
          nonce={analytics?.nonce}
          dangerouslySetInnerHTML={{ __html: dataLayerPushScript(events) }}
        />
      )}
    </section>
  );
}

export function Stage2Page(props: Stage2PageProps) {
  return (
    <Layout analytics={props.pageAnalytics} title="ELX – Verification" htmx>
      <h1>Stage 2: Verification</h1>
      <p style="margin-top: -10px; font-size: 0.875rem; color: var(--pico-muted-color); margin-bottom: 20px;">
        Test Version: <strong>{props.ticketCode}</strong>
      </p>
      <p>Confirm which words you truly know.</p>
      <Stage2Card {...props} analytics={undefined} />
    </Layout>
  );
}
