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
      <div class="admin-container max-w-44">
        <div class="mb-15">
          <a
            href="/admin/words"
            class="fs-0875 color-muted decoration-underline"
          >
            ◀ Back to Words Manager
          </a>
        </div>

        {error && (
          <div class="alert alert-error">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div class="alert alert-success">
            ✅ {success}
          </div>
        )}

        {result && (
          <article class="admin-panel admin-panel-strong p-15 mb-2">
            <h4 class="mt-0 mb-1 fs-1125">
              Import Results
            </h4>
            <div class="import-summary-grid mb-15">
              <div class="import-card-positive">
                <div class="fs-15 fw-700 color-positive">
                  {result.inserted}
                </div>
                <div class="fs-075 color-muted">
                  Inserted
                </div>
              </div>
              <div class="import-card-primary">
                <div class="fs-15 fw-700 color-primary">
                  {result.updated}
                </div>
                <div class="fs-075 color-muted">
                  Updated
                </div>
              </div>
              <div class="import-card-muted">
                <div class="fs-15 fw-700 color-muted">
                  {result.skipped}
                </div>
                <div class="fs-075 color-muted">
                  Skipped
                </div>
              </div>
              <div class="import-card-danger">
                <div class="fs-15 fw-700 color-danger">
                  {result.failed}
                </div>
                <div class="fs-075 color-muted">
                  Failed
                </div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div>
                <h5 class="fs-0875 fw-700 color-danger mb-05">
                  Errors & Warnings
                </h5>
                <div class="import-log-box">
                  {result.errors.map((err) => (
                    <div class="mb-025 color-danger">
                      Line {err.line}: {err.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>
        )}

        <article class="admin-panel admin-panel-card p-2">
          <form
            method="post"
            action="/admin/words/import"
            enctype="multipart/form-data"
          >
            <div class="form-group mb-15">
              <label for="file" class="admin-label">
                Source File (CSV or JSON)
              </label>
              <input
                type="file"
                id="file"
                name="file"
                required
                class="m-0"
              />
              <small class="color-muted fs-075 mt-025 d-block">
                Maximum file size: 5MB
              </small>
            </div>

            <div class="form-group mb-15">
              <label for="config" class="admin-label">
                Mapping Configuration (JSON)
              </label>
              <textarea
                id="config"
                name="config"
                placeholder='e.g., {"format":"csv","delimiter":",","hasHeader":true,"fields":{"value":{"from":"term"}}}'
                required
                class="m-0 min-h-12 admin-monospace fs-0875"
              >
                {configString}
              </textarea>
              <small class="color-muted fs-075 mt-025 d-block">
                JSON mapping config specifying format, fields, and target schema
                mappings.
              </small>
            </div>

            <div class="form-group mb-2">
              <fieldset class="border-none p-0 m-0">
                <label class="d-flex align-items-center gap-05 cursor-pointer">
                  <input
                    type="checkbox"
                    id="dryRun"
                    name="dryRun"
                    value="true"
                    checked
                    class="m-0 w-auto"
                  />
                  <span class="fs-0875 fw-600">
                    Dry run (preview changes only, do not write to database)
                  </span>
                </label>
              </fieldset>
            </div>

            <button
              type="submit"
              class="admin-btn-primary btn-full"
            >
              🚀 Run Import / Preview
            </button>
          </form>
        </article>
      </div>
    </AdminLayout>
  );
}
