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
      <div class="admin-container admin-container-sm">
        <div class="mb-15">
          <a
            href="/admin/words"
            class="fs-0875 color-muted decoration-underline"
          >
            ◀ Back to Words list
          </a>
        </div>

        <article class="admin-panel admin-panel-card admin-panel-padding">
          <form method="post" action={actionUrl}>
            {error && (
              <div class="alert alert-error">
                ⚠️ {error}
              </div>
            )}

            <div class="form-group mb-15">
              <label for="value" class="admin-label">
                Word Value
              </label>
              <input
                type="text"
                id="value"
                name="value"
                value={word?.value ?? ""}
                placeholder="Enter word value (e.g., apple)"
                required
                class="m-0 admin-monospace"
              />
            </div>

            <div class="form-group mb-15">
              <label for="difficulty" class="admin-label">
                Difficulty Level
              </label>
              <select
                id="difficulty"
                name="difficulty"
                required
                class="m-0"
              >
                {[1, 2, 3, 4, 5].map((d) => (
                  <option value={String(d)} selected={word?.difficulty === d}>
                    Level {d}
                  </option>
                ))}
              </select>
            </div>

            <div class="form-group mb-2">
              <label class="flex-wrap-center gap-05 m-0 cursor-pointer user-select-none">
                <input
                  type="checkbox"
                  id="isReal"
                  name="isReal"
                  value="true"
                  checked={word?.isReal ?? true}
                  class="checkbox-large"
                />
                <span class="fs-0875 fw-600">
                  This is a real word (deselect for pseudoword)
                </span>
              </label>
            </div>

            <button
              type="submit"
              class="admin-btn-primary btn-full"
            >
              {isEdit ? "Update Word" : "Create Word"}
            </button>
          </form>
        </article>
      </div>
    </AdminLayout>
  );
}
