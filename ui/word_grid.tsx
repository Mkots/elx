import { Layout } from "./layout.tsx";

type Word = {
  id: number;
  value: string;
};

type WordGridProps = {
  words: Word[];
};

export function WordGrid({ words }: WordGridProps) {
  return (
    <Layout title="ELX – Word Selection">
      <main>
        <h1>Stage 1: Word Selection</h1>
        <p>Check the words you know.</p>
        <form method="post" action="/stage/1">
          <div class="word-grid">
            {words.map((word) => (
              <label key={word.id} class="word-item">
                <input type="checkbox" name="word" value={String(word.id)} />
                {word.value}
              </label>
            ))}
          </div>
          <button type="submit">Next</button>
        </form>
      </main>
    </Layout>
  );
}
