type Word = {
  id: number;
  value: string;
};

type WordGridProps = {
  words: Word[];
  action: string;
};

export function WordGrid({ words, action }: WordGridProps) {
  return (
    <form method="post" action={action}>
      <div class="word-grid">
        {words.map((word) => (
          <label key={word.id} class="word-item">
            <input type="checkbox" name="word" value={String(word.id)} />
            {word.value}
          </label>
        ))}
      </div>
      <button class="next-stage-btn" type="submit">Next →</button>
    </form>
  );
}
