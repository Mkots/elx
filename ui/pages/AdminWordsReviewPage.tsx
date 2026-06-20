import type { Child } from "hono/jsx";
import { AdminLayout } from "../components/AdminLayout.tsx";

type WordReviewItem = {
  id: number;
  value: string;
  isReal: boolean;
  difficulty: number;
};

type ReviewCardProps = {
  word: WordReviewItem;
  reviewed: number;
  total: number;
  remaining: number;
  error?: string;
};

export function AdminWordsReviewEmpty() {
  return (
    <section id="review-card-shell" style="text-align: center; padding: 2rem;">
      <article style="background: var(--color-panel-strong); border: 1px solid rgba(242, 239, 250, 0.08); padding: 2.5rem;">
        <h4 style="margin-bottom: 1rem;">All words reviewed 🎉</h4>
        <p style="color: var(--pico-muted-color); margin-bottom: 2rem;">
          There are no more unreviewed words in the queue.
        </p>
        <div style="display: flex; justify-content: center; gap: 1rem;">
          <a
            href="/admin/words"
            role="button"
            class="outline"
            style="margin: 0; font-weight: 700;"
          >
            Back to Words Manager
          </a>
          <a
            href="/admin"
            role="button"
            style="margin: 0; font-weight: 700; background: var(--pico-primary); color: #2d2839; border: none;"
          >
            Go to Dashboard
          </a>
        </div>
      </article>
      <script
        dangerouslySetInnerHTML={{
          __html: `
          if (window.reviewKeydownHandler) {
            document.removeEventListener('keydown', window.reviewKeydownHandler);
            window.reviewKeydownHandler = null;
          }
        `,
        }}
      />
    </section>
  );
}

export function AdminWordsReviewCard({
  word,
  reviewed,
  total,
  remaining,
  error,
}: ReviewCardProps) {
  const percent = total > 0 ? Math.round((reviewed / total) * 100) : 0;

  return (
    <section id="review-card-shell">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
        <span style="font-size: 0.875rem; font-weight: 600; color: var(--pico-muted-color);">
          Progress: {reviewed} of {total} reviewed ({remaining} remaining)
        </span>
        <span style="font-size: 0.875rem; font-weight: 600; color: var(--pico-muted-color);">
          {percent}%
        </span>
      </div>
      <progress value={reviewed} max={total} style="margin-bottom: 1.5rem;" />

      {error && (
        <div
          class="alert alert-error"
          style="color: #ff7675; background: rgba(255, 118, 117, 0.1); border: 1px solid rgba(255, 118, 117, 0.2); padding: 0.75rem 1rem; border-radius: var(--pico-border-radius); margin-bottom: 1.5rem; font-size: 0.875rem;"
        >
          ⚠️ {error}
        </div>
      )}

      <article style="background: var(--color-panel-strong); border: 1px solid rgba(242, 239, 250, 0.08); padding: 2rem; position: relative;">
        <form
          id="review-form"
          method="post"
          action={`/admin/words/review/${word.id}`}
          hx-post={`/admin/words/review/${word.id}`}
          hx-target="#review-card-shell"
          hx-swap="outerHTML"
          style="margin: 0;"
        >
          <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 1.5rem; align-items: end; margin-bottom: 1.5rem;">
            {/* Word Value Field */}
            <div style="margin: 0;">
              <label
                for="review-word-value"
                style="font-weight: 600; font-size: 0.875rem; margin-bottom: 0.5rem; display: block;"
              >
                Word Value
              </label>
              <input
                type="text"
                id="review-word-value"
                name="value"
                value={word.value}
                required
                style="margin: 0;"
                autofocus
              />
            </div>

            {/* Is Real (Switch toggle) */}
            <div style="margin: 0; display: flex; flex-direction: column; justify-content: center; height: 100%;">
              <label
                for="is-real-switch"
                style="font-weight: 600; font-size: 0.875rem; margin-bottom: 0.5rem; display: block;"
              >
                Word Status
              </label>
              <label style="margin: 0; display: flex; align-items: center; cursor: pointer; user-select: none;">
                <input
                  type="checkbox"
                  id="is-real-switch"
                  name="isReal"
                  role="switch"
                  checked={word.isReal}
                  style="margin: 0 0.5rem 0 0;"
                />
                <span style="font-size: 0.875rem;">Real Word</span>
              </label>
            </div>

            {/* Difficulty Select */}
            <div style="margin: 0;">
              <label
                for="difficulty-select"
                style="font-weight: 600; font-size: 0.875rem; margin-bottom: 0.5rem; display: block;"
              >
                Difficulty
              </label>
              <select
                id="difficulty-select"
                name="difficulty"
                style="margin: 0;"
              >
                <option value="1" selected={word.difficulty === 1}>
                  1 (Very Easy)
                </option>
                <option value="2" selected={word.difficulty === 2}>
                  2 (Easy)
                </option>
                <option value="3" selected={word.difficulty === 3}>
                  3 (Medium)
                </option>
                <option value="4" selected={word.difficulty === 4}>
                  4 (Hard)
                </option>
                <option value="5" selected={word.difficulty === 5}>
                  5 (Very Hard)
                </option>
              </select>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div style="display: flex; gap: 0.75rem;">
              <button
                type="submit"
                id="confirm-btn"
                style="margin: 0; font-weight: 700; background: var(--pico-primary); color: #2d2839; border: none; padding: 0.5rem 1.5rem;"
              >
                Confirm & Next ⏎
              </button>
              <button
                type="button"
                id="skip-btn"
                hx-post={`/admin/words/review/${word.id}/skip`}
                hx-target="#review-card-shell"
                hx-swap="outerHTML"
                class="outline contrast"
                style="margin: 0; font-weight: 700; padding: 0.5rem 1.5rem;"
              >
                Skip ➔
              </button>
            </div>

            <div style="font-size: 0.75rem; color: var(--pico-muted-color); text-align: right; line-height: 1.4;">
              <strong>Keyboard shortcuts:</strong>
              <br />
              <kbd>⏎ Enter</kbd> Confirm & Next (outside text box) &nbsp;|&nbsp;
              <kbd>➔ Right Arrow</kbd> / <kbd>S</kbd> Skip &nbsp;|&nbsp;
              <kbd>← Left Arrow</kbd> / <kbd>R</kbd> Toggle Real &nbsp;|&nbsp;
              <kbd>1-5</kbd> Set Difficulty
            </div>
          </div>
        </form>
      </article>

      <script
        dangerouslySetInnerHTML={{
          __html: `
          (function() {
            if (window.reviewKeydownHandler) {
              document.removeEventListener('keydown', window.reviewKeydownHandler);
            }
            window.reviewKeydownHandler = function(e) {
              const isTextFocused = e.target.tagName === 'INPUT' && e.target.type === 'text';
              
              if (isTextFocused) {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  document.getElementById('confirm-btn')?.click();
                }
                return;
              }

              if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('confirm-btn')?.click();
              } else if (e.key === 'ArrowRight' || e.key === 's' || e.key === 'S') {
                e.preventDefault();
                document.getElementById('skip-btn')?.click();
              } else if (e.key === 'ArrowLeft' || e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                const toggle = document.getElementById('is-real-switch');
                if (toggle) {
                  toggle.checked = !toggle.checked;
                }
              } else if (e.key >= '1' && e.key <= '5') {
                e.preventDefault();
                const select = document.getElementById('difficulty-select');
                if (select) {
                  select.value = e.key;
                }
              }
            };
            document.addEventListener('keydown', window.reviewKeydownHandler);
          })();
        `,
        }}
      />
    </section>
  );
}

type AdminWordsReviewPageProps = {
  cardHtml: Child;
};

export function AdminWordsReviewPage({ cardHtml }: AdminWordsReviewPageProps) {
  return (
    <AdminLayout title="Word Review & Refinement" activeTab="words" htmx>
      <div style="max-width: 800px; margin: 0 auto; padding-top: 1rem;">
        <div style="margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center;">
          <p style="margin: 0; color: var(--pico-muted-color); font-size: 0.95rem;">
            Refine attributes and confirm imported/unreviewed vocabulary words.
          </p>
          <a href="/admin/words" style="font-size: 0.875rem; font-weight: 600;">
            ← Back to Words List
          </a>
        </div>
        {cardHtml}
      </div>
    </AdminLayout>
  );
}
