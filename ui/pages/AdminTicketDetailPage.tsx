import { AdminLayout } from "../components/AdminLayout.tsx";
import type { SnapshotQuestion } from "../../db/schema.ts";

type AdminTicketDetailPageProps = {
  ticket: {
    id: number;
    code: string;
    status: string;
    title: string | null;
    notes: string | null;
    questions: SnapshotQuestion[];
    createdAt: Date;
  };
  spellingSuggestions: Record<number, string[]>; // index -> suggestions
  meaningSuggestions: string[]; // pool of random real words
  error?: string;
  success?: string;
};

export function AdminTicketDetailPage({
  ticket,
  spellingSuggestions,
  meaningSuggestions,
  error,
  success,
}: AdminTicketDetailPageProps) {
  const verificationQuestions = ticket.questions.filter((q) =>
    q.type === "verification"
  );

  // Keep original indices of challenge questions to map them correctly in forms
  const challengeQuestions = ticket.questions
    .map((q, idx) => ({ q, idx }))
    .filter(({ q }) => q.type !== "verification");

  const totalChallenges = challengeQuestions.length;
  const verifiedChallenges =
    challengeQuestions.filter(({ q }) => (q as { verified?: boolean }).verified)
      .length;
  const isEnrichmentComplete = verifiedChallenges === totalChallenges;

  return (
    <AdminLayout title={`Edit Ticket: ${ticket.code}`} activeTab="tickets">
      <div class="admin-container">
        <div class="mb-15">
          <a href="/admin/tickets" class="button outline small m-0">
            ← Back to Tickets
          </a>
        </div>

        {error && <div class="alert alert-error">⚠️ {error}</div>}
        {success && <div class="alert alert-success">✅ {success}</div>}

        {/* Ticket Header Card */}
        <article class="admin-panel admin-panel-card admin-panel-padding mb-20">
          <div class="grid align-items-center">
            <div>
              <h3 class="m-0 fs-15">
                {ticket.title || `Ticket ${ticket.code}`}
              </h3>
              <p class="m-0 fs-0875 color-muted">
                {ticket.notes || "No notes provided."}
              </p>
              <div class="mt-10 fs-0875">
                Status:{" "}
                <span
                  class={`badge badge-${
                    ticket.status === "published"
                      ? "success"
                      : ticket.status === "complete"
                      ? "primary"
                      : "warning"
                  } badge-compact`}
                >
                  {ticket.status}
                </span>
                <span class="ml-15 color-muted">
                  Enrichment: <strong>{verifiedChallenges}</strong> /{" "}
                  <strong>{totalChallenges}</strong> verified
                </span>
              </div>
            </div>
            <div class="text-right">
              {ticket.status !== "published" && (
                <form
                  action={`/admin/tickets/${ticket.id}/publish`}
                  method="post"
                  class="m-0"
                >
                  <button
                    type="submit"
                    disabled={!isEnrichmentComplete}
                    class={`button success m-0${
                      !isEnrichmentComplete ? " btn-disabled-muted" : ""
                    }`}
                  >
                    🚀 Publish Ticket
                  </button>
                  {!isEnrichmentComplete && (
                    <div class="fs-075 color-muted mt-05">
                      Verify all challenge questions to enable publishing.
                    </div>
                  )}
                </form>
              )}
              {ticket.status === "published" && (
                <span class="color-success fw-bold">
                  🟢 Published and Active
                </span>
              )}
            </div>
          </div>
        </article>

        <div class="grid">
          {/* Left Column: Verification Questions (Stage 1) */}
          <article class="admin-panel admin-panel-card admin-panel-padding flex-1 align-self-start max-h-800 overflow-y-auto">
            <header class="m-0 mb-15">
              <h4 class="m-0 fs-1125">
                Verification Word List ({verificationQuestions.length})
              </h4>
            </header>
            <div class="table-scroll">
              <table class="m-0 small">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Word</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {verificationQuestions.map((q, idx) => {
                    const vq = q as { wordText: string; isReal: boolean };
                    return (
                      <tr>
                        <td>{idx + 1}</td>
                        <td>
                          <strong>{vq.wordText}</strong>
                        </td>
                        <td>
                          <span
                            class={`badge ${
                              vq.isReal ? "badge-primary" : "badge-secondary"
                            }`}
                          >
                            {vq.isReal ? "real" : "pseudo"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>

          {/* Right Column: Challenge Questions Enrichment (Stage 2) */}
          <div class="flex-2 d-flex flex-column gap-15">
            <article class="admin-panel admin-panel-card admin-panel-padding">
              <header class="m-0 mb-15">
                <h4 class="m-0 fs-1125">
                  Challenge Questions Curation ({challengeQuestions.length})
                </h4>
              </header>
              <p class="fs-0875 color-muted">
                Edit options and select candidates to complete the spelling
                context sentences, synonyms, and definitions.
              </p>
            </article>

            {challengeQuestions.map(({ q, idx }) => {
              const cq = q as {
                verified?: boolean;
                distractors?: string[];
                correctText?: string;
                promptText?: string;
              };
              const isVerified = cq.verified === true;
              const distractors = cq.distractors || [];

              // Determine suggestions list based on question type
              const suggestions = q.type === "spelling"
                ? spellingSuggestions[idx] || []
                : meaningSuggestions;

              return (
                <article
                  class={`admin-panel admin-panel-card admin-panel-padding ticket-question-card ${
                    isVerified
                      ? "ticket-question-card-verified"
                      : "ticket-question-card-unverified"
                  }`}
                  id={`q-card-${idx}`}
                >
                  <header class="m-0 mb-15 flex-wrap-center justify-between">
                    <div>
                      <span
                        class={`badge badge-${
                          q.type === "synonym"
                            ? "primary"
                            : q.type === "antonym"
                            ? "info"
                            : q.type === "spelling"
                            ? "warning"
                            : "secondary"
                        } badge-compact badge-spaced`}
                      >
                        {q.type}
                      </span>
                      <span>
                        Target word:{" "}
                        <strong>
                          {q.type === "synonym" || q.type === "antonym"
                            ? q.promptText
                            : cq.correctText}
                        </strong>
                      </span>
                    </div>
                    <div>
                      <span
                        class={`badge badge-${
                          isVerified ? "success" : "danger"
                        } fs-075`}
                      >
                        {isVerified ? "🟢 Verified" : "🔴 Unverified"}
                      </span>
                    </div>
                  </header>

                  <form
                    action={`/admin/tickets/${ticket.id}/edit-question/${idx}`}
                    method="post"
                    class="m-0"
                  >
                    {q.type === "synonym" && (
                      <div class="grid mb-10">
                        <div class="form-group">
                          <label class="admin-label">Prompt Word</label>
                          <input
                            type="text"
                            value={q.promptText}
                            disabled
                            class="m-0"
                          />
                        </div>
                        <div class="form-group">
                          <label class="admin-label">Correct Synonym</label>
                          <input
                            type="text"
                            name="correctText"
                            value={q.correctText}
                            required
                            class="m-0"
                          />
                        </div>
                      </div>
                    )}

                    {q.type === "antonym" && (
                      <div class="grid mb-10">
                        <div class="form-group">
                          <label class="admin-label">Prompt Word</label>
                          <input
                            type="text"
                            value={q.promptText}
                            disabled
                            class="m-0"
                          />
                        </div>
                        <div class="form-group">
                          <label class="admin-label">Correct Antonym</label>
                          <input
                            type="text"
                            name="correctText"
                            value={q.correctText}
                            required
                            class="m-0"
                          />
                        </div>
                      </div>
                    )}

                    {q.type === "spelling" && (
                      <div class="mb-10">
                        <div class="grid mb-10">
                          <div class="form-group flex-2">
                            <label class="admin-label">
                              Context Sentence (must include '___')
                            </label>
                            <input
                              type="text"
                              name="contextSentence"
                              value={q.contextSentence}
                              placeholder="e.g. He is starting to take ___ now."
                              required
                              class="m-0"
                            />
                          </div>
                          <div class="form-group flex-1">
                            <label class="admin-label">Correct Word</label>
                            <input
                              type="text"
                              value={q.correctText}
                              disabled
                              class="m-0"
                            />
                            <input
                              type="hidden"
                              name="correctText"
                              value={q.correctText}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {q.type === "definition" && (
                      <div class="mb-10">
                        <div class="form-group mb-10">
                          <label class="admin-label">Definition Text</label>
                          <textarea
                            name="definitionText"
                            required
                            class="m-0"
                            rows={2}
                          >
                            {q.definitionText}
                          </textarea>
                        </div>
                        <div class="form-group">
                          <label class="admin-label">Correct Word</label>
                          <input
                            type="text"
                            value={q.correctText}
                            disabled
                            class="m-0"
                          />
                          <input
                            type="hidden"
                            name="correctText"
                            value={q.correctText}
                          />
                        </div>
                      </div>
                    )}

                    {/* Distractors Inputs */}
                    <label class="admin-label mb-05">
                      Distractors (exactly 3 required)
                    </label>
                    <div class="grid mb-10">
                      <div>
                        <input
                          type="text"
                          id={`distractor_${idx}_0`}
                          name="distractors[0]"
                          placeholder="Distractor 1"
                          value={distractors[0] || ""}
                          required
                          class="m-0"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          id={`distractor_${idx}_1`}
                          name="distractors[1]"
                          placeholder="Distractor 2"
                          value={distractors[1] || ""}
                          required
                          class="m-0"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          id={`distractor_${idx}_2`}
                          name="distractors[2]"
                          placeholder="Distractor 3"
                          value={distractors[2] || ""}
                          required
                          class="m-0"
                        />
                      </div>
                    </div>

                    {/* Candidate suggestions */}
                    {suggestions.length > 0 && (
                      <div class="mb-15">
                        <span class="fs-075 color-muted mr-10">
                          Proposals (click to fill):
                        </span>
                        <div class="flex-wrap-center gap-05 mt-05">
                          {suggestions.map((sug) => (
                            <button
                              type="button"
                              class="button outline small secondary m-0 btn-chip"
                              onclick={`fillDistractor(${idx}, '${
                                sug.replaceAll(/'/g, "\\'")
                              }')`}
                            >
                              {sug}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div class="text-right">
                      <button
                        type="submit"
                        class="button small m-0 btn-form-small"
                      >
                        {isVerified ? "🔄 Update & Verify" : "✅ Save & Verify"}
                      </button>
                    </div>
                  </form>
                </article>
              );
            })}
          </div>
        </div>
      </div>

      {/* Inline Vanilla JS helper for clicking suggestions */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            function fillDistractor(qIndex, text) {
              for (let i = 0; i < 3; i++) {
                const input = document.getElementById('distractor_' + qIndex + '_' + i);
                if (input) {
                  // If this input is empty or contains the same value, we can set/overwrite it
                  if (!input.value) {
                    input.value = text;
                    break;
                  }
                }
              }
            }
          `,
        }}
      />
    </AdminLayout>
  );
}
