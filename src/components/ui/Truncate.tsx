import { truncateText } from "./text";

/** Texte tronqué à `max` caractères (« … » seulement s'il dépasse), texte complet en infobulle. */
export function Truncate({ text, max }: { text: string; max: number }) {
  const short = truncateText(text, max);
  return <span title={short === text.trim() ? undefined : text}>{short}</span>;
}
