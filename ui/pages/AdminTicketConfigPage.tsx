import { AdminLayout } from "../components/AdminLayout.tsx";

type TicketConfigData = {
  name: string;
  isActive: boolean;
  difficulty1Count: number;
  difficulty2Count: number;
  difficulty3Count: number;
  difficulty4Count: number;
  difficulty5Count: number;
  realCount: number;
  pseudoCount: number;
  synonymsCount: number;
  antonymsCount: number;
  spellingCount: number;
  definitionCount: number;
  randomizeOrder: boolean;
};

type DatabaseWordStats = {
  totalReal: number;
  totalPseudo: number;
  diffCounts: Record<number, number>;
  realSynonyms: number;
  realAntonyms: number;
  realDefinitions: number;
};

type AdminTicketConfigPageProps = {
  config: TicketConfigData;
  stats: DatabaseWordStats;
  error?: string;
  success?: string;
};

export function AdminTicketConfigPage({
  config,
  stats,
  error,
  success,
}: AdminTicketConfigPageProps) {
  return (
    <AdminLayout title="Ticket Composition Config" activeTab="ticket-config">
      <div class="admin-container">
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

        <div class="grid">
          {/* Edit Form */}
          <article class="admin-panel admin-panel-card admin-panel-padding">
            <header class="m-0 mb-15">
              <h3 class="m-0 fs-125">Edit Composition Rules</h3>
            </header>
            <form method="post" action="/admin/ticket-config/edit">
              <div class="form-group mb-15">
                <label for="name" class="admin-label">Configuration Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={config.name}
                  required
                  class="m-0"
                />
              </div>

              <div class="grid mb-15">
                <div class="form-group">
                  <label for="realCount" class="admin-label">
                    Real Words Count
                  </label>
                  <input
                    type="number"
                    id="realCount"
                    name="realCount"
                    min="0"
                    value={String(config.realCount)}
                    required
                    class="m-0"
                  />
                </div>
                <div class="form-group">
                  <label for="pseudoCount" class="admin-label">
                    Pseudowords Count
                  </label>
                  <input
                    type="number"
                    id="pseudoCount"
                    name="pseudoCount"
                    min="0"
                    value={String(config.pseudoCount)}
                    required
                    class="m-0"
                  />
                </div>
              </div>

              <h4 class="fs-1 m-0 mb-10 fw-700">Words per Difficulty Level</h4>
              <div class="grid mb-15">
                <div class="form-group">
                  <label for="difficulty1Count" class="admin-label">
                    Lvl 1
                  </label>
                  <input
                    type="number"
                    id="difficulty1Count"
                    name="difficulty1Count"
                    min="0"
                    value={String(config.difficulty1Count)}
                    required
                    class="m-0"
                  />
                </div>
                <div class="form-group">
                  <label for="difficulty2Count" class="admin-label">
                    Lvl 2
                  </label>
                  <input
                    type="number"
                    id="difficulty2Count"
                    name="difficulty2Count"
                    min="0"
                    value={String(config.difficulty2Count)}
                    required
                    class="m-0"
                  />
                </div>
                <div class="form-group">
                  <label for="difficulty3Count" class="admin-label">
                    Lvl 3
                  </label>
                  <input
                    type="number"
                    id="difficulty3Count"
                    name="difficulty3Count"
                    min="0"
                    value={String(config.difficulty3Count)}
                    required
                    class="m-0"
                  />
                </div>
                <div class="form-group">
                  <label for="difficulty4Count" class="admin-label">
                    Lvl 4
                  </label>
                  <input
                    type="number"
                    id="difficulty4Count"
                    name="difficulty4Count"
                    min="0"
                    value={String(config.difficulty4Count)}
                    required
                    class="m-0"
                  />
                </div>
                <div class="form-group">
                  <label for="difficulty5Count" class="admin-label">
                    Lvl 5
                  </label>
                  <input
                    type="number"
                    id="difficulty5Count"
                    name="difficulty5Count"
                    min="0"
                    value={String(config.difficulty5Count)}
                    required
                    class="m-0"
                  />
                </div>
              </div>

              <h4 class="fs-1 m-0 mb-10 fw-700">Stage 2 Challenge Counts</h4>
              <div class="grid mb-15">
                <div class="form-group">
                  <label for="synonymsCount" class="admin-label">
                    Synonyms
                  </label>
                  <input
                    type="number"
                    id="synonymsCount"
                    name="synonymsCount"
                    min="0"
                    value={String(config.synonymsCount)}
                    required
                    class="m-0"
                  />
                </div>
                <div class="form-group">
                  <label for="antonymsCount" class="admin-label">
                    Antonyms
                  </label>
                  <input
                    type="number"
                    id="antonymsCount"
                    name="antonymsCount"
                    min="0"
                    value={String(config.antonymsCount)}
                    required
                    class="m-0"
                  />
                </div>
                <div class="form-group">
                  <label for="spellingCount" class="admin-label">
                    Spelling
                  </label>
                  <input
                    type="number"
                    id="spellingCount"
                    name="spellingCount"
                    min="0"
                    value={String(config.spellingCount)}
                    required
                    class="m-0"
                  />
                </div>
                <div class="form-group">
                  <label for="definitionCount" class="admin-label">
                    Definitions
                  </label>
                  <input
                    type="number"
                    id="definitionCount"
                    name="definitionCount"
                    min="0"
                    value={String(config.definitionCount)}
                    required
                    class="m-0"
                  />
                </div>
              </div>

              <div class="form-group mb-15">
                <label class="flex-wrap-center gap-05 m-0 cursor-pointer user-select-none">
                  <input
                    type="checkbox"
                    id="randomizeOrder"
                    name="randomizeOrder"
                    checked={config.randomizeOrder}
                    class="m-0"
                  />
                  <span>Randomize question order in ticket</span>
                </label>
              </div>

              <button type="submit" class="m-0">
                Save Configuration
              </button>
            </form>
          </article>

          {/* Reference Statistics */}
          <article class="admin-panel admin-panel-card admin-panel-padding">
            <header class="m-0 mb-15">
              <h3 class="m-0 fs-125">Available Words Pool</h3>
            </header>
            <p class="fs-0875 color-muted">
              Use these database counts as reference limits. Your configurations
              cannot exceed the available words.
            </p>

            <table class="m-0">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Database Pool</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Total Real Words</td>
                  <td>
                    <strong>{stats.totalReal}</strong>
                  </td>
                </tr>
                <tr>
                  <td>Total Pseudowords</td>
                  <td>
                    <strong>{stats.totalPseudo}</strong>
                  </td>
                </tr>
                <tr>
                  <td>Difficulty Level 1</td>
                  <td>{stats.diffCounts[1]}</td>
                </tr>
                <tr>
                  <td>Difficulty Level 2</td>
                  <td>{stats.diffCounts[2]}</td>
                </tr>
                <tr>
                  <td>Difficulty Level 3</td>
                  <td>{stats.diffCounts[3]}</td>
                </tr>
                <tr>
                  <td>Difficulty Level 4</td>
                  <td>{stats.diffCounts[4]}</td>
                </tr>
                <tr>
                  <td>Difficulty Level 5</td>
                  <td>{stats.diffCounts[5]}</td>
                </tr>
                <tr>
                  <td>Real Words w/ Synonyms</td>
                  <td>{stats.realSynonyms}</td>
                </tr>
                <tr>
                  <td>Real Words w/ Antonyms</td>
                  <td>{stats.realAntonyms}</td>
                </tr>
                <tr>
                  <td>Real Words w/ Definitions</td>
                  <td>{stats.realDefinitions}</td>
                </tr>
              </tbody>
            </table>
          </article>
        </div>
      </div>
    </AdminLayout>
  );
}
