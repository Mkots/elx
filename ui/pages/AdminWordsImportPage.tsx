import { AdminLayout } from "../components/AdminLayout.tsx";

type ImportResult = {
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: { line: number; reason: string }[];
};

type AdminWordsImportPageProps = {
  result?: ImportResult;
  error?: string;
  success?: string;
  configString?: string;
};

export function AdminWordsImportPage({
  result,
  error,
  success,
  configString = "",
}: AdminWordsImportPageProps) {
  return (
    <AdminLayout title="Import Words" activeTab="words">
      <div style="max-width: 44rem; margin: 0 auto;">
        <div style="margin-bottom: 1.5rem;">
          <a
            href="/admin/words"
            style="font-size: 0.875rem; color: var(--pico-muted-color); text-decoration: underline;"
          >
            ◀ Back to Words Manager
          </a>
        </div>

        {error && (
          <div
            class="alert alert-error"
            style="color: #ff7675; background: rgba(255, 118, 117, 0.1); border: 1px solid rgba(255, 118, 117, 0.2); padding: 0.75rem 1rem; border-radius: var(--pico-border-radius); margin-bottom: 1.5rem; font-size: 0.875rem;"
          >
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div
            class="alert alert-success"
            style="color: var(--color-positive); background: rgba(139, 213, 202, 0.1); border: 1px solid rgba(139, 213, 202, 0.2); padding: 0.75rem 1rem; border-radius: var(--pico-border-radius); margin-bottom: 1.5rem; font-size: 0.875rem;"
          >
            ✅ {success}
          </div>
        )}

        {result && (
          <article style="padding: 1.5rem; background: var(--color-panel-strong); border: 1px solid rgba(242, 239, 250, 0.08); margin-bottom: 2rem;">
            <h4 style="margin-top: 0; margin-bottom: 1rem; font-size: 1.125rem;">
              Import Results
            </h4>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; text-align: center; margin-bottom: 1.5rem;">
              <div style="padding: 0.75rem; background: rgba(139, 213, 202, 0.08); border-radius: var(--pico-border-radius);">
                <div style="font-size: 1.5rem; font-weight: 700; color: var(--color-positive);">
                  {result.inserted}
                </div>
                <div style="font-size: 0.75rem; color: var(--pico-muted-color);">
                  Inserted
                </div>
              </div>
              <div style="padding: 0.75rem; background: rgba(242, 239, 250, 0.04); border-radius: var(--pico-border-radius);">
                <div style="font-size: 1.5rem; font-weight: 700; color: var(--color-primary);">
                  {result.updated}
                </div>
                <div style="font-size: 0.75rem; color: var(--pico-muted-color);">
                  Updated
                </div>
              </div>
              <div style="padding: 0.75rem; background: rgba(242, 239, 250, 0.02); border-radius: var(--pico-border-radius);">
                <div style="font-size: 1.5rem; font-weight: 700; color: var(--pico-muted-color);">
                  {result.skipped}
                </div>
                <div style="font-size: 0.75rem; color: var(--pico-muted-color);">
                  Skipped
                </div>
              </div>
              <div style="padding: 0.75rem; background: rgba(255, 118, 117, 0.08); border-radius: var(--pico-border-radius);">
                <div style="font-size: 1.5rem; font-weight: 700; color: #ff7675;">
                  {result.failed}
                </div>
                <div style="font-size: 0.75rem; color: var(--pico-muted-color);">
                  Failed
                </div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div>
                <h5 style="font-size: 0.875rem; font-weight: 700; color: #ff7675; margin-bottom: 0.5rem;">
                  Errors & Warnings
                </h5>
                <div style="max-height: 12rem; overflow-y: auto; font-family: var(--pico-font-family-monospace); font-size: 0.75rem; background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: var(--pico-border-radius); border: 1px solid rgba(242, 239, 250, 0.04);">
                  {result.errors.map((err) => (
                    <div style="margin-bottom: 0.25rem; color: #ff7675;">
                      Line {err.line}: {err.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>
        )}

        <article style="padding: 2rem; background: var(--pico-card-background-color); border: 1px solid rgba(242, 239, 250, 0.08);">
          <form
            method="post"
            action="/admin/words/import"
            enctype="multipart/form-data"
          >
            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label
                for="file"
                style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.25rem; display: block;"
              >
                Source File (CSV or JSON)
              </label>
              <input
                type="file"
                id="file"
                name="file"
                required
                style="margin: 0;"
              />
              <small style="color: var(--pico-muted-color); font-size: 0.75rem; margin-top: 0.25rem; display: block;">
                Maximum file size: 5MB
              </small>
            </div>

            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label
                for="config"
                style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.25rem; display: block;"
              >
                Mapping Configuration (JSON)
              </label>
              <textarea
                id="config"
                name="config"
                placeholder='e.g., {"format":"csv","delimiter":",","hasHeader":true,"fields":{"value":{"from":"term"}}}'
                required
                style="margin: 0; min-height: 12rem; font-family: var(--pico-font-family-monospace); font-size: 0.875rem;"
              >
                {configString}
              </textarea>
              <small style="color: var(--pico-muted-color); font-size: 0.75rem; margin-top: 0.25rem; display: block;">
                JSON mapping config specifying format, fields, and target schema
                mappings.
              </small>
            </div>

            <div class="form-group" style="margin-bottom: 2rem;">
              <fieldset style="border: none; padding: 0; margin: 0;">
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                  <input
                    type="checkbox"
                    id="dryRun"
                    name="dryRun"
                    value="true"
                    checked
                    style="margin: 0; width: auto;"
                  />
                  <span style="font-size: 0.875rem; font-weight: 600;">
                    Dry run (preview changes only, do not write to database)
                  </span>
                </label>
              </fieldset>
            </div>

            <button
              type="submit"
              style="width: 100%; margin: 0; font-weight: 700; background: var(--pico-primary); color: #2d2839;"
            >
              🚀 Run Import / Preview
            </button>
          </form>
        </article>
      </div>
    </AdminLayout>
  );
}
