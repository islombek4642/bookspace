// Reads the same /locales/uz.json file the backend reads from, so there
// is a single source of truth for every user-facing string.
import messages from "../../../locales/uz.json";

type LocaleKey = keyof typeof messages;

export function t(key: LocaleKey): string {
  return messages[key];
}
