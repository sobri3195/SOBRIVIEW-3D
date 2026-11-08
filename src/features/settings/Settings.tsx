import { useEffect, useState } from "react";
import { useApp } from "../../stores/useApp";
import { parsePreferences, resetStorage } from "../../lib/storage";
import { clearAssets } from "../../lib/indexeddb";
import { exportJSON } from "../../lib/export";
export default function Settings() {
  const { prefs, update, notify } = useApp();
  const [usage, setUsage] = useState("Calculating…");
  useEffect(() => {
    void navigator.storage
      ?.estimate()
      .then((s) =>
        setUsage(
          `${((s.usage || 0) / 1024 / 1024).toFixed(2)} MB used / ${((s.quota || 0) / 1024 / 1024).toFixed(0)} MB estimated quota`,
        ),
      )
      .catch(() => setUsage("Storage estimate unavailable"));
  }, []);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">PREFERENCES & PRIVACY</div>
          <h1>Make the workspace yours.</h1>
          <p>Settings are local to this browser.</p>
        </div>
      </div>
      <div className="settings-grid">
        <section className="panel">
          <h2>Interface</h2>
          <label>
            Theme
            <select
              aria-label="Theme"
              value={prefs.theme}
              onChange={(e) =>
                update({ theme: e.target.value as "dark" | "light" })
              }
            >
              <option value="dark">Medical dark</option>
              <option value="light">Light</option>
            </select>
          </label>
          <label>
            Anatomy label language
            <select
              aria-label="Anatomy label language"
              value={prefs.language}
              onChange={(e) =>
                update({ language: e.target.value as "en" | "id" })
              }
            >
              <option value="en">English</option>
              <option value="id">Bahasa Indonesia</option>
            </select>
          </label>
          <label>
            Rendering quality
            <select
              aria-label="Rendering quality"
              value={prefs.quality}
              onChange={(e) =>
                update({ quality: e.target.value as "normal" | "low" })
              }
            >
              <option value="normal">Normal</option>
              <option value="low">Low memory / low pixel ratio</option>
            </select>
          </label>
          <p>Motion follows your system’s reduced-motion preference.</p>
          <div className="button-row">
            <button
              onClick={() => exportJSON("sobriview-settings.json", prefs)}
            >
              Export settings
            </button>
            <label className="file-button">
              Import settings
              <input
                type="file"
                accept="application/json,.json"
                hidden
                onChange={async (e) => {
                  try {
                    const file = e.target.files?.[0];
                    if (file) {
                      const parsed: unknown = JSON.parse(await file.text());
                      if (
                        !parsed ||
                        typeof parsed !== "object" ||
                        !("version" in parsed) ||
                        parsed.version !== 1
                      )
                        throw Error();
                      update(parsePreferences(parsed));
                    }
                  } catch {
                    notify("Invalid settings file. Expected schema version 1.");
                  }
                }}
              />
            </label>
          </div>
        </section>
        <section className="panel">
          <h2>Storage manager</h2>
          <p>{usage}</p>
          <p>
            Preferences, quiz results and educational notes use namespaced
            localStorage. Opt-in anonymized DICOM caches use IndexedDB. Files
            are never uploaded by this app.
          </p>
          <button
            onClick={async () => {
              try {
                await clearAssets();
                notify("IndexedDB asset cache cleared.");
              } catch {
                notify("Unable to clear asset cache.");
              }
            }}
          >
            Clear asset cache
          </button>
          <h3>Reset application</h3>
          <p>
            Deletes this app’s settings and learning data from this browser.
          </p>
          <button
            className="danger"
            onClick={async () => {
              if (
                confirm(
                  "Delete all SOBRIVIEW local preferences, workspaces and cached files?",
                )
              ) {
                try {
                  await clearAssets();
                  resetStorage();
                  location.reload();
                } catch {
                  notify(
                    "Reset could not complete. Check browser storage permissions.",
                  );
                }
              }
            }}
          >
            Reset local application
          </button>
        </section>
        <section className="panel">
          <h2>About SOBRIVIEW 3D</h2>
          <p>Interactive Radiology, Anatomy & Medical Imaging Explorer</p>
          <p>Developed by Muhammad Sobri Maulana</p>
          <p>
            Educational and research software. Not validated for clinical
            diagnosis or treatment decisions.
          </p>
          <p>Version 0.1.0 · © 2026</p>
        </section>
      </div>
    </>
  );
}
