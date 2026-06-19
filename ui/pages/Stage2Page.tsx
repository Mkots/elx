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
  return (
    <section
      id="stage2-card-shell"
      class="verification-card-shell"
      aria-live="polite"
    >
      <p class="stage-progress">
        Word {currentIndex + 1} of {totalWords}
      </p>
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
          <button type="submit" name="answer" value="know">
            Know
          </button>
          <button
            class="secondary"
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
