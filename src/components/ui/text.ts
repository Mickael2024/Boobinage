/** Coupe un texte à `max` caractères et n'ajoute « … » que s'il dépasse réellement. */
export function truncateText(text: string, max: number) {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max).trimEnd()}…` : t;
}

/** « TABLEAU DE BORD » → « Tableau de bord » ; un libellé déjà en casse mixte est conservé tel quel. */
export function displayLabel(label: string) {
  if (label !== label.toUpperCase() || !/\p{L}/u.test(label)) return label;
  const lower = label.toLocaleLowerCase("fr-FR");
  return lower.charAt(0).toLocaleUpperCase("fr-FR") + lower.slice(1);
}
