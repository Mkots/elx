import { AdminLayout } from "../components/AdminLayout.tsx";

type ChallengeType = "synonyms" | "spelling" | "definitions";

type WordOption = {
  id: number;
  value: string;
};

type AdminChallengeEditPageProps = {
  challengeType: ChallengeType;
  // deno-lint-ignore no-explicit-any
  challenge?: any;
  words: WordOption[];
  distractorsString?: string; // Comma-separated list of word values
  error?: string;
};

export function AdminChallengeEditPage({
  challengeType,
  challenge,
  words,
  distractorsString = "",
  error,
}: AdminChallengeEditPageProps) {
  const isEdit = !!challenge?.id;
  const capitalizedType = challengeType.charAt(0).toUpperCase() +
    challengeType.slice(1);
  const title = isEdit
    ? `Edit ${capitalizedType} Challenge #${challenge.id}`
    : `Add New ${capitalizedType} Challenge`;

  const actionUrl = isEdit
    ? `/admin/challenges/${challengeType}/${challenge.id}/edit`
    : `/admin/challenges/${challengeType}/new`;

  // Sort words alphabetically for dropdown lists
  const sortedWords = [...words].sort((a, b) => a.value.localeCompare(b.value));

  return (
    <AdminLayout title={title} activeTab="challenges">
      <div style="max-width: 36rem; margin: 0 auto;">
        <div style="margin-bottom: 1.5rem;">
          <a
            href={`/admin/challenges?type=${challengeType}`}
            style="font-size: 0.875rem; color: var(--pico-muted-color); text-decoration: underline;"
          >
            ◀ Back to Challenges list
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

            {/* SYNONYMS FORM FIELDS */}
            {challengeType === "synonyms" && (
              <div>
                <div class="form-group" style="margin-bottom: 1.5rem;">
                  <label
                    for="wordId"
                    style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.25rem; display: block;"
                  >
                    Source Word
                  </label>
                  <select id="wordId" name="wordId" required style="margin: 0;">
                    <option value="">-- Select Word --</option>
                    {sortedWords.map((w) => (
                      <option
                        value={String(w.id)}
                        selected={challenge?.wordId === w.id}
                      >
                        {w.value}
                      </option>
                    ))}
                  </select>
                </div>

                <div class="form-group" style="margin-bottom: 1.5rem;">
                  <label
                    for="targetId"
                    style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.25rem; display: block;"
                  >
                    Target Synonym Word
                  </label>
                  <select
                    id="targetId"
                    name="targetId"
                    required
                    style="margin: 0;"
                  >
                    <option value="">-- Select Synonym --</option>
                    {sortedWords.map((w) => (
                      <option
                        value={String(w.id)}
                        selected={challenge?.targetId === w.id}
                      >
                        {w.value}
                      </option>
                    ))}
                  </select>
                </div>

                <div class="form-group" style="margin-bottom: 1.5rem;">
                  <label
                    for="relationType"
                    style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.25rem; display: block;"
                  >
                    Relation Type
                  </label>
                  <input
                    type="text"
                    id="relationType"
                    name="relationType"
                    value={challenge?.relationType ?? "synonym"}
                    placeholder="e.g., synonym"
                    required
                    style="margin: 0;"
                  />
                </div>
              </div>
            )}

            {/* SPELLING FORM FIELDS */}
            {challengeType === "spelling" && (
              <div>
                <div class="form-group" style="margin-bottom: 1.5rem;">
                  <label
                    for="contextSentence"
                    style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.25rem; display: block;"
                  >
                    Context Sentence (use `___` for the blank gap)
                  </label>
                  <input
                    type="text"
                    id="contextSentence"
                    name="contextSentence"
                    value={challenge?.contextSentence ?? ""}
                    placeholder="e.g., She planted a single red ___ in the garden."
                    required
                    style="margin: 0;"
                  />
                </div>

                <div class="form-group" style="margin-bottom: 1.5rem;">
                  <label
                    for="correctWordId"
                    style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.25rem; display: block;"
                  >
                    Correct Answer Word
                  </label>
                  <select
                    id="correctWordId"
                    name="correctWordId"
                    required
                    style="margin: 0;"
                  >
                    <option value="">-- Select Correct Word --</option>
                    {sortedWords.map((w) => (
                      <option
                        value={String(w.id)}
                        selected={challenge?.correctWordId === w.id}
                      >
                        {w.value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* DEFINITIONS FORM FIELDS */}
            {challengeType === "definitions" && (
              <div>
                <div class="form-group" style="margin-bottom: 1.5rem;">
                  <label
                    for="wordId"
                    style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.25rem; display: block;"
                  >
                    Target Word
                  </label>
                  <select id="wordId" name="wordId" required style="margin: 0;">
                    <option value="">-- Select Word --</option>
                    {sortedWords.map((w) => (
                      <option
                        value={String(w.id)}
                        selected={challenge?.wordId === w.id}
                      >
                        {w.value}
                      </option>
                    ))}
                  </select>
                </div>

                <div class="form-group" style="margin-bottom: 1.5rem;">
                  <label
                    for="definitionText"
                    style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.25rem; display: block;"
                  >
                    Definition Text
                  </label>
                  <textarea
                    id="definitionText"
                    name="definitionText"
                    placeholder="Enter the dictionary definition text..."
                    required
                    style="margin: 0; min-height: 5rem;"
                  >
                    {challenge?.definitionText ?? ""}
                  </textarea>
                </div>
              </div>
            )}

            {/* DISTRACTORS FIELD (SHARED BY ALL CHALLENGES) */}
            <div class="form-group" style="margin-bottom: 2rem;">
              <label
                for="distractors"
                style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.25rem; display: block;"
              >
                Distractor Words (comma-separated list of word values)
              </label>
              <input
                type="text"
                id="distractors"
                name="distractors"
                value={distractorsString}
                placeholder="e.g., orange, banana, cherry"
                required
                style="margin: 0;"
              />
              <small style="color: var(--pico-muted-color); font-size: 0.75rem; margin-top: 0.25rem; display: block;">
                Each word value must exist in the Words database.
              </small>
            </div>

            <button
              type="submit"
              style="width: 100%; margin: 0; font-weight: 700; background: var(--pico-primary); color: #2d2839;"
            >
              {isEdit ? "Update Challenge" : "Create Challenge"}
            </button>
          </form>
        </article>
      </div>
    </AdminLayout>
  );
}
