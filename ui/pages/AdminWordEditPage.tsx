import { AdminLayout } from "../components/AdminLayout.tsx";

type WordData = {
  id?: number;
  value: string;
  isReal: boolean;
  difficulty: number;
};

type AdminWordEditPageProps = {
  word?: WordData;
  error?: string;
};

export function AdminWordEditPage({ word, error }: AdminWordEditPageProps) {
  const isEdit = !!word?.id;
  const title = isEdit ? `Edit Word: ${word?.value}` : "Add New Word";
  const actionUrl = isEdit
    ? `/admin/words/${word?.id}/edit`
    : "/admin/words/new";

  return (
    <AdminLayout title={title} activeTab="words">
      <div style="max-width: 32rem; margin: 0 auto;">
        <div style="margin-bottom: 1.5rem;">
          <a
            href="/admin/words"
            style="font-size: 0.875rem; color: var(--pico-muted-color); text-decoration: underline;"
          >
            ◀ Back to Words list
          </a>
        </div>

        <article style="padding: 2rem; background: var(--pico-card-background-color); border: 1px solid rgba(242, 239, 250, 0.08);">
          <form method="post" action={actionUrl}>
            {error && (
              <div
                class="alert alert-error"
                style="color: #ff7675; background: rgba(255, 118, 117, 0.1); border: 1px solid rgba(255, 118, 117, 0.2); padding: 0.75rem 1rem; border-radius: var(--pico-border-radius); margin-bottom: 1.5rem; font-size: 0.875rem;"
              >
                ⚠️ {error}
              </div>
            )}

            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label
                for="value"
                style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.25rem;"
              >
                Word Value
              </label>
              <input
                type="text"
                id="value"
                name="value"
                value={word?.value ?? ""}
                placeholder="Enter word value (e.g., apple)"
                required
                style="margin: 0; font-family: var(--pico-font-family-monospace);"
              />
            </div>

            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label
                for="difficulty"
                style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.25rem;"
              >
                Difficulty Level
              </label>
              <select
                id="difficulty"
                name="difficulty"
                required
                style="margin: 0;"
              >
                {[1, 2, 3, 4, 5].map((d) => (
                  <option value={String(d)} selected={word?.difficulty === d}>
                    Level {d}
                  </option>
                ))}
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 2rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; user-select: none; margin: 0;">
                <input
                  type="checkbox"
                  id="isReal"
                  name="isReal"
                  value="true"
                  checked={word?.isReal ?? true}
                  style="margin: 0; width: 1.25rem; height: 1.25rem;"
                />
                <span style="font-size: 0.875rem; font-weight: 600;">
                  This is a real word (deselect for pseudoword)
                </span>
              </label>
            </div>

            <button
              type="submit"
              style="width: 100%; margin: 0; font-weight: 700; background: var(--pico-primary); color: #2d2839;"
            >
              {isEdit ? "Update Word" : "Create Word"}
            </button>
          </form>
        </article>
      </div>
    </AdminLayout>
  );
}
