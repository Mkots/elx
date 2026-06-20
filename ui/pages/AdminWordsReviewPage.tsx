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
    <section id="review-card-shell" class="text-center p-2">
      <article class="admin-panel admin-panel-strong p-25">
        <h4 class="mb-1">All words reviewed 🎉</h4>
        <p class="color-muted mb-2">
          There are no more unreviewed words in the queue.
        </p>
        <div class="flex-center gap-1">
          <a
            href="/admin/words"
            role="button"
            class="outline m-0 fw-700"
          >
            Back to Words Manager
          </a>
          <a
            href="/admin"
            role="button"
            class="admin-btn-primary m-0"
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
      <div class="flex-between mb-05">
        <span class="fs-0875 fw-600 color-muted">
          Progress: {reviewed} of {total} reviewed ({remaining} remaining)
        </span>
        <span class="fs-0875 fw-600 color-muted">
          {percent}%
        </span>
      </div>
      <progress value={reviewed} max={total} class="mb-15" />

      {error && (
        <div class="alert alert-error">
          ⚠️ {error}
        </div>
      )}

      <article class="admin-panel admin-panel-strong p-2 position-relative">
        <form
          id="review-form"
          method="post"
          action={`/admin/words/review/${word.id}`}
          hx-post={`/admin/words/review/${word.id}`}
          hx-target="#review-card-shell"
          hx-swap="outerHTML"
          class="m-0"
        >
          <div class="review-form-grid">
            {/* Word Value Field */}
            <div class="m-0">
              <label for="review-word-value" class="admin-label mb-05">
                Word Value
              </label>
              <input
                type="text"
                id="review-word-value"
                name="value"
                value={word.value}
                required
                class="m-0"
              />
            </div>

            {/* Is Real (Switch toggle) */}
            <div class="m-0 d-flex flex-column justify-center h-100">
              <label for="is-real-switch" class="admin-label mb-05">
                Word Status
              </label>
              <label class="m-0 d-flex align-items-center cursor-pointer user-select-none">
                <input
                  type="checkbox"
                  id="is-real-switch"
                  name="isReal"
                  role="switch"
                  checked={word.isReal}
                  class="me-05"
                />
                <span class="fs-0875">Real Word</span>
              </label>
            </div>

            {/* Difficulty Select */}
            <div class="m-0">
              <label for="difficulty-select" class="admin-label mb-05">
                Difficulty
              </label>
              <select
                id="difficulty-select"
                name="difficulty"
                class="m-0"
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

          <div class="flex-between flex-wrap gap-1">
            <div class="d-flex gap-075">
              <button
                type="submit"
                id="confirm-btn"
                class="admin-btn-primary py-05 px-15"
              >
                Confirm & Next ⏎
              </button>
              <button
                type="button"
                id="skip-btn"
                hx-post={`/admin/words/review/${word.id}/skip`}
                hx-target="#review-card-shell"
                hx-swap="outerHTML"
                class="outline contrast fw-700 py-05 px-15 m-0"
              >
                Skip ➔
              </button>
            </div>

            <div class="fs-075 color-muted text-right lh-14">
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
      <div class="admin-container admin-container-lg pt-1">
        <div class="mb-2 flex-between">
          <p class="m-0 color-muted fs-095">
            Refine attributes and confirm imported/unreviewed vocabulary words.
          </p>
          <a href="/admin/words" class="fs-0875 fw-600">
            ← Back to Words List
          </a>
        </div>
        {cardHtml}
      </div>
    </AdminLayout>
  );
}
