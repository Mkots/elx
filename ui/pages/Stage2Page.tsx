import { Layout } from "../components/Layout.tsx";

type Word = {
  id: number;
  value: string;
};

type Stage2CardProps = {
  currentIndex: number;
  totalWords: number;
  word: Word;
};

type Stage2PageProps = Stage2CardProps;

export function Stage2Card(
  { currentIndex, totalWords, word }: Stage2CardProps,
) {
  const progressValue = currentIndex + 1;

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
    </section>
  );
}

export function Stage2Page(props: Stage2PageProps) {
  return (
    <Layout title="ELX – Verification" htmx>
      <h1>Stage 2: Verification</h1>
      <p>Confirm which words you truly know.</p>
      <Stage2Card {...props} />
    </Layout>
  );
}
