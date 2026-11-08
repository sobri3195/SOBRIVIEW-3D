import { useState } from "react";
import { read, write } from "../../lib/storage";
import { exportJSON } from "../../lib/export";
import { useApp } from "../../stores/useApp";
type Case = {
  id: string;
  title: string;
  topic: string;
  notes: string;
  tags: string;
  favorite: boolean;
  modality: string;
};
function validate(value: unknown): Case[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is Case =>
      v &&
      typeof v.id === "string" &&
      typeof v.title === "string" &&
      typeof v.notes === "string" &&
      typeof v.tags === "string" &&
      typeof v.favorite === "boolean" &&
      typeof v.topic === "string" &&
      typeof v.modality === "string",
  );
}
export default function Cases() {
  const [cases, setCases] = useState<Case[]>(() => read("cases", validate, []));
  const [active, setActive] = useState<Case | null>(null);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  function save(next: Case[]) {
    setCases(next);
    if (!write("cases", next))
      setError(
        "Local storage unavailable or quota exceeded. Export your workspace to retain it.",
      );
    else useApp.getState().notify("Educational workspace saved.");
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SOBRI CASELAB</div>
          <h1>Your research workspace.</h1>
          <p>
            Keep educational notes and synthetic case bookmarks on this device.
          </p>
        </div>
        <button
          className="primary"
          onClick={() => {
            setActive({
              id: crypto.randomUUID(),
              title: "",
              topic: "Abdominal anatomy",
              notes: "",
              tags: "",
              favorite: false,
              modality: "Synthetic",
            });
            setConsent(false);
          }}
        >
          New educational case
        </button>
      </div>
      <div className="notice">
        Do not enter patient names, identifiers, dates of birth, or identifiable
        clinical notes. CaseLab stores educational text only in localStorage; no
        patient data import is supported here.
      </div>
      <div className="case-grid">
        {[
          "Abdominal anatomy",
          "Liver segments",
          "Renal anatomy",
          "Thoracic anatomy",
          "Cerebral anatomy",
        ].map((topic, i) => (
          <button
            className="case-card"
            key={topic}
            onClick={() => {
              setActive({
                id: crypto.randomUUID(),
                title: topic + " study",
                topic,
                notes:
                  "Educational topic workspace. No patient history or clinical findings are included.",
                tags: "educational, synthetic",
                favorite: false,
                modality: "Synthetic",
              });
              setConsent(false);
            }}
          >
            <span className="eyebrow">EDUCATIONAL TEMPLATE / 0{i + 1}</span>
            <h2>{topic}</h2>
            <p>Create a study notebook →</p>
          </button>
        ))}
      </div>
      <h2>
        Saved workspaces <span className="muted">{cases.length}</span>
      </h2>
      <div className="case-grid">
        {cases.map((c) => (
          <article className="panel" key={c.id}>
            <span className="eyebrow">
              {c.modality} · {c.topic}
            </span>
            <h3>{c.title}</h3>
            <p>{c.tags}</p>
            <div className="button-row">
              <button
                onClick={() => {
                  setActive({ ...c });
                  setConsent(false);
                }}
              >
                Restore
              </button>
              <button
                onClick={() =>
                  save(
                    cases.map((x) =>
                      x.id === c.id ? { ...x, favorite: !x.favorite } : x,
                    ),
                  )
                }
              >
                {c.favorite ? "★" : "☆"}
              </button>
              <button
                onClick={() =>
                  exportJSON("sobriview-workspace.json", {
                    version: 1,
                    case: c,
                  })
                }
              >
                Export
              </button>
              <button
                onClick={() => {
                  if (confirm("Delete this educational workspace?"))
                    save(cases.filter((x) => x.id !== c.id));
                }}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      {active && (
        <div className="modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="case-title"
            className="panel modal"
          >
            <h2 id="case-title">Educational case notebook</h2>
            <label>
              Title
              <input
                autoFocus
                value={active.title}
                onChange={(e) =>
                  setActive({ ...active, title: e.target.value })
                }
              />
            </label>
            <label>
              Organ system
              <input
                value={active.topic}
                onChange={(e) =>
                  setActive({ ...active, topic: e.target.value })
                }
              />
            </label>
            <label>
              Modality
              <select
                value={active.modality}
                onChange={(e) =>
                  setActive({ ...active, modality: e.target.value })
                }
              >
                <option>Synthetic</option>
                <option>Educational atlas</option>
              </select>
            </label>
            <label>
              Study notes
              <textarea
                rows={5}
                value={active.notes}
                onChange={(e) =>
                  setActive({ ...active, notes: e.target.value })
                }
              />
            </label>
            <label>
              Tags
              <input
                value={active.tags}
                onChange={(e) => setActive({ ...active, tags: e.target.value })}
              />
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />{" "}
              I confirm this contains no patient information and consent to
              local storage on this device.
            </label>
            <div className="button-row">
              <button onClick={() => setActive(null)}>Cancel</button>
              <button
                className="primary"
                disabled={!active.title.trim() || !consent}
                onClick={() => {
                  save([...cases.filter((c) => c.id !== active.id), active]);
                  setActive(null);
                }}
              >
                Save workspace
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
