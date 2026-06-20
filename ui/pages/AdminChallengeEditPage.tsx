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
      <div class="admin-container admin-container-md">
        <div class="mb-15">
          <a
            href={`/admin/challenges?type=${challengeType}`}
            class="fs-0875 color-muted decoration-underline"
          >
            ◀ Back to Challenges list
          </a>
        </div>

        <article class="admin-panel admin-panel-card admin-panel-padding">
          <form method="post" action={actionUrl}>
            {error && (
              <div class="alert alert-error">
                ⚠️ {error}
              </div>
            )}

            {/* SYNONYMS FORM FIELDS */}
            {challengeType === "synonyms" && (
              <div>
                <div class="form-group mb-15">
                  <label for="wordId" class="admin-label">
                    Source Word
                  </label>
                  <select id="wordId" name="wordId" required class="m-0">
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

                <div class="form-group mb-15">
                  <label for="targetId" class="admin-label">
                    Target Synonym Word
                  </label>
                  <select
                    id="targetId"
                    name="targetId"
                    required
                    class="m-0"
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

                <div class="form-group mb-15">
                  <label for="relationType" class="admin-label">
                    Relation Type
                  </label>
                  <input
                    type="text"
                    id="relationType"
                    name="relationType"
                    value={challenge?.relationType ?? "synonym"}
                    placeholder="e.g., synonym"
                    required
                    class="m-0"
                  />
                </div>
              </div>
            )}

            {/* SPELLING FORM FIELDS */}
            {challengeType === "spelling" && (
              <div>
                <div class="form-group mb-15">
                  <label for="contextSentence" class="admin-label">
                    Context Sentence (use `___` for the blank gap)
                  </label>
                  <input
                    type="text"
                    id="contextSentence"
                    name="contextSentence"
                    value={challenge?.contextSentence ?? ""}
                    placeholder="e.g., She planted a single red ___ in the garden."
                    required
                    class="m-0"
                  />
                </div>

                <div class="form-group mb-15">
                  <label for="correctWordId" class="admin-label">
                    Correct Answer Word
                  </label>
                  <select
                    id="correctWordId"
                    name="correctWordId"
                    required
                    class="m-0"
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
                <div class="form-group mb-15">
                  <label for="wordId" class="admin-label">
                    Target Word
                  </label>
                  <select id="wordId" name="wordId" required class="m-0">
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

                <div class="form-group mb-15">
                  <label for="definitionText" class="admin-label">
                    Definition Text
                  </label>
                  <textarea
                    id="definitionText"
                    name="definitionText"
                    placeholder="Enter the dictionary definition text..."
                    required
                    class="m-0 min-h-5"
                  >
                    {challenge?.definitionText ?? ""}
                  </textarea>
                </div>
              </div>
            )}

            {/* DISTRACTORS FIELD (SHARED BY ALL CHALLENGES) */}
            <div class="form-group mb-2">
              <label for="distractors" class="admin-label">
                Distractor Words (comma-separated list of word values)
              </label>
              <input
                type="text"
                id="distractors"
                name="distractors"
                value={distractorsString}
                placeholder="e.g., orange, banana, cherry"
                required
                class="m-0"
              />
              <small class="color-muted fs-075 mt-025 d-block">
                Each word value must exist in the Words database.
              </small>
            </div>

            <button
              type="submit"
              class="admin-btn-primary btn-full"
            >
              {isEdit ? "Update Challenge" : "Create Challenge"}
            </button>
          </form>
        </article>
      </div>
    </AdminLayout>
  );
}
