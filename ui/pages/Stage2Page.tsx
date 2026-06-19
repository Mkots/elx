import { Layout } from "../components/Layout.tsx";

type Word = {
  id: number;
  value: string;
};

type Stage2PageProps = {
  words: Word[];
};

export function Stage2Page({ words }: Stage2PageProps) {
  return (
    <Layout title="ELX – Verification">
      <h1>Stage 2: Verification</h1>
      <p>Confirm which words you truly know.</p>
      <form method="post" action="/stage/2">
        <div class="verification-grid">
          {words.map((word) => (
            <div key={word.id} class="verification-card">
              <span class="word-value">{word.value}</span>
              <div class="card-choices">
                <label>
                  <input
                    type="radio"
                    name={`word_${word.id}`}
                    value="know"
                    checked
                  />
                  Know
                </label>
                <label>
                  <input
                    type="radio"
                    name={`word_${word.id}`}
                    value="dont_know"
                  />
                  {"Don't Know"}
                </label>
              </div>
            </div>
          ))}
        </div>
        <button class="next-stage-btn" type="submit">Submit →</button>
      </form>
    </Layout>
  );
}
