import { useLiveQuery } from 'dexie-react-hooks';
import { getDashboard } from '../../db/dashboardRepo';
import { shapeById } from '../../domain/constellations';
import type { OutcomeSplit } from '../../domain/dashboard';

const STATE_LABEL = { avenir: 'à venir', encours: 'en cours', completee: 'complétée', maitrisee: 'maîtrisée' } as const;
const OUTCOME_LABEL: Record<string, string> = { success: 'réussi seule', success_hint: 'réussi avec aide', fail: 'pas encore' };

/** Tableau de bord parent : mesures réelles, séparées (spec 13). */
export function DashboardPanel() {
  const d = useLiveQuery(() => getDashboard(), []);
  if (!d) return null;
  const o = d.overview;
  const maxPoints = Math.max(1, ...d.activity.map((a) => a.points));
  const maxAgreement = Math.max(1, ...d.errors.agreementByNotion.map((a) => a.count));

  return (
    <div className="stack dashboard">
      <section className="tiles">
        <Tile n={o.words} label="mots saisis" />
        <Tile n={o.onTrack} label="en bonne voie" help="réussis lors d’une révision" />
        <Tile n={o.acquired} label="acquis" help="tiennent ~1 mois" />
        <Tile n={o.overdue} label="révisions en retard" warn={o.overdue > 0} />
        <Tile n={o.flameDays} label="jours de flamme" />
        <Tile n={`${o.activeDays7}/7`} label="jours actifs cette semaine" />
      </section>

      <section className="card">
        <h2>Activité des 7 derniers jours</h2>
        <div className="bars" role="table" aria-label="Points par jour">
          {d.activity.map((a) => (
            <div key={a.date} className="bar-col" role="row" title={`${a.label} : ${a.points} points, ${a.sessions} séance(s)`}>
              <span className="bar-value" role="cell">
                {a.points || ''}
              </span>
              <span className="bar-track">
                <span className="bar-fill" style={{ height: `${(100 * a.points) / maxPoints}%` }} />
              </span>
              <span className="bar-label" role="cell">
                {a.label}
              </span>
              <span className="muted small-text">{a.sessions ? `${a.sessions} séance${a.sessions > 1 ? 's' : ''}` : '—'}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Erreurs des 30 derniers jours</h2>
        <div className="tiles" style={{ marginBottom: '1rem' }}>
          <Tile n={d.errors.spelling} label="orthographe des mots" help="lettres, sons, lettres muettes" />
          <Tile n={d.errors.accent} label="accents seulement" help="mot juste sauf l’accent" />
          <Tile n={d.errors.agreementByNotion.reduce((s, a) => s + a.count, 0)} label="accords" help="phrases, par notion ci-dessous" />
        </div>
        {d.errors.agreementByNotion.length === 0 ? (
          <p className="muted small-text">Aucune erreur d’accord enregistrée (ou pas encore de phrases).</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Notion</th>
                <th>Phrases avec erreur d’accord</th>
              </tr>
            </thead>
            <tbody>
              {d.errors.agreementByNotion.map((a) => (
                <tr key={a.notionId}>
                  <td>{a.label}</td>
                  <td>
                    <span className="hbar">
                      <span style={{ width: `${(100 * a.count) / maxAgreement}%` }} />
                    </span>{' '}
                    {a.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>Réussites (30 derniers jours)</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th />
              <th>Seule, du premier coup</th>
              <th>Avec aide</th>
              <th>Pas encore</th>
            </tr>
          </thead>
          <tbody>
            <SplitRow label="Mots (1re présentation)" s={d.success.words} />
            <SplitRow label="Phrases (dictée et chasse)" s={d.success.sentences} />
          </tbody>
        </table>
        <p className="muted small-text">
          « Avec aide » : indice demandé, ou erreurs retrouvées seule après « il reste X erreurs ». Un mot raté revient le lendemain : ce n’est pas un échec définitif.
        </p>
      </section>

      <section className="card">
        <h2>Par semaine de liste</h2>
        {d.weeks.length === 0 ? (
          <p className="muted">Aucune liste saisie.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Semaine</th>
                <th>Mots</th>
                <th>En bonne voie</th>
                <th>Acquis</th>
                <th>Erreurs d’orthographe</th>
                <th>Erreurs d’accent</th>
                <th>État</th>
              </tr>
            </thead>
            <tbody>
              {d.weeks.map((w) => (
                <tr key={w.weekId}>
                  <td>{w.label}</td>
                  <td>{w.total}</td>
                  <td>{w.onTrack}</td>
                  <td>{w.acquired}</td>
                  <td>{w.spelling}</td>
                  <td>{w.accent}</td>
                  <td>{STATE_LABEL[w.state]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>Notions de grammaire</h2>
        {d.notions.length === 0 ? (
          <p className="muted">Aucune notion cochée « vue en classe ».</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Notion</th>
                <th>Guidage</th>
                <th>Dernier résultat</th>
                <th>Prochaine révision</th>
                <th>Phrases</th>
              </tr>
            </thead>
            <tbody>
              {d.notions.map((n) => (
                <tr key={n.id}>
                  <td>
                    {n.label}
                    {n.mastered && <span className="gold"> · maîtrisée ✦ {shapeById(n.constellation)?.name}</span>}
                  </td>
                  <td title="1 : questions guidées · 2 : simple rappel · 3 : seulement « il reste X erreurs »">
                    niveau {n.level} {'●'.repeat(n.level)}
                    {'○'.repeat(3 - n.level)}
                  </td>
                  <td>{n.lastOutcome ? OUTCOME_LABEL[n.lastOutcome] : '—'}</td>
                  <td>{n.nextReview ? n.nextReview.toLocaleDateString('fr-FR') : '—'}</td>
                  <td>{n.reviews}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="level-grid">
        <section className="card">
          <h2>Mots les plus difficiles</h2>
          {d.hardestWords.length === 0 ? (
            <p className="muted small-text">Rien à signaler.</p>
          ) : (
            <ul className="plain-list">
              {d.hardestWords.map((w) => (
                <li key={w.text}>
                  <strong>{w.text}</strong> — {w.fails} échec{w.fails > 1 ? 's' : ''}
                  <span className="muted small-text">
                    {w.accent ? ` · accent ×${w.accent}` : ''}
                    {w.spelling ? ` · orthographe ×${w.spelling}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card">
          <h2>Révisions en retard</h2>
          {d.overdueWords.length === 0 ? (
            <p className="muted small-text">Aucune : tout est à jour.</p>
          ) : (
            <ul className="plain-list">
              {d.overdueWords.map((w) => (
                <li key={w.text}>
                  <strong>{w.text}</strong> <span className="muted small-text">· {w.daysLate} jour{w.daysLate > 1 ? 's' : ''} de retard</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <p className="muted small-text">Le vocabulaire (Exploratrice des mots) a son propre suivi dans l’onglet Vocabulaire.</p>
    </div>
  );
}

function Tile({ n, label, help, warn }: { n: number | string; label: string; help?: string; warn?: boolean }) {
  return (
    <div className={`metric ${warn ? 'metric-warn' : ''}`}>
      <strong>{n}</strong>
      <span>{label}</span>
      {help && <span className="muted small-text">{help}</span>}
    </div>
  );
}

function SplitRow({ label, s }: { label: string; s: OutcomeSplit }) {
  const total = s.alone + s.withHint + s.fail;
  const pct = (x: number) => (total ? ` (${Math.round((100 * x) / total)} %)` : '');
  return (
    <tr>
      <td>{label}</td>
      <td>
        {s.alone}
        {pct(s.alone)}
      </td>
      <td>
        {s.withHint}
        {pct(s.withHint)}
      </td>
      <td>
        {s.fail}
        {pct(s.fail)}
      </td>
    </tr>
  );
}
