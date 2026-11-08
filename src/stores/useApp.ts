import { create } from "zustand";
import { loadPreferences, write, type Preferences } from "../lib/storage";
type State = {
  prefs: Preferences;
  notice: string;
  update: (v: Partial<Preferences>) => void;
  notify: (text: string) => void;
};
export const useApp = create<State>((set, get) => ({
  prefs: loadPreferences(),
  notice: "",
  update(v) {
    const prefs = { ...get().prefs, ...v };
    const ok = write("preferences", prefs);
    set({
      prefs,
      notice: ok
        ? "Preferences saved"
        : "Storage unavailable. Preferences apply for this session.",
    });
  },
  notify(notice) {
    set({ notice });
  },
}));
