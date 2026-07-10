import { Layout } from "../components/Layout.tsx";
import type { AnalyticsProps } from "../../analytics.ts";
import { safeJson } from "../../analytics.ts";

type Stage3CardProps = {
  analytics?: AnalyticsProps;
  currentIndex: number;
  totalQuestions: number;
  questionIndex: number;
  promptText: string;
  options: string[];
  ticketCode: string;
};

type Stage3PageProps = Stage3CardProps & {
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

export function Stage3Card(
  {
    analytics,
    currentIndex,
    totalQuestions,
    questionIndex,
    promptText,
    options,
  }: Stage3CardProps,
) {
  const progressValue = currentIndex + 1;
  const events = analytics?.events ?? [];

  return (
    <section
      id="stage3-card-shell"
      class="synonym-card-shell"
      aria-live="polite"
    >
      <div class="stage-progress-row">
        <p class="stage-progress">
          Question {progressValue} of {totalQuestions}
        </p>
        <span class="stage-progress-count">
          {Math.round((progressValue / totalQuestions) * 100)}%
        </span>
      </div>
      <progress
        class="verification-progress"
        value={progressValue}
        max={totalQuestions}
        aria-label="Synonym challenge progress"
      />
      <form
        class="verification-card"
        method="post"
        action="/stage/3"
        hx-post="/stage/3"
        hx-target="#stage3-card-shell"
        hx-swap="outerHTML"
      >
        <input
          type="hidden"
          name="questionIndex"
          value={String(questionIndex)}
        />
        <span class="word-value">{promptText}</span>
        <div class="card-choices synonym-choices">
          {options.map((option) => (
            <button
              class="answer-btn synonym-option-btn"
              type="submit"
              name="answer"
              value={option}
            >
              {option}
            </button>
          ))}
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

export function Stage3Page(props: Stage3PageProps) {
  return (
    <Layout
      analytics={props.pageAnalytics}
      title="ELX – Synonym Challenge"
      htmx
    >
      <h1>Stage 3: Synonym Challenge</h1>
      <p class="ticket-code-line">
        Test Version: <strong>{props.ticketCode}</strong>
      </p>
      <p>Choose the closest synonym for the word shown.</p>
      <Stage3Card {...props} analytics={undefined} />
    </Layout>
  );
}
