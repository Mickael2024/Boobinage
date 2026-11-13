/** Anneau de focus clavier commun (fond clair) : 2 px orange foncé (5,77:1) décalé de 2 px. */
export const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-dark focus-visible:ring-offset-2 focus-visible:ring-offset-white";

/** Anneau de focus clavier sur fond anthracite (barre latérale, accueil) : orange vif (5,89:1). */
export const FOCUS_RING_DARK = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-anthracite";

/** Conteneur de tableau (bordure, ombre, défilement horizontal de secours). */
export const TABLE_WRAP = "overflow-x-auto rounded-xl border border-line bg-white shadow-xs";

/** Tableau de données : cellules stylées via sélecteurs descendants. */
export const TABLE =
  "w-full border-collapse text-left text-[0.92rem] [&_td]:border-b [&_td]:border-line-soft [&_td]:px-3.5 [&_td]:py-3 [&_td]:align-middle md:[&_td]:px-[18px] md:[&_td]:py-4 [&_td_small]:text-ink-2 [&_tbody_tr:hover_td]:bg-row-hover [&_tbody_tr:last-child_td]:border-b-0";

/** Cellule d'en-tête de tableau. */
export const TH = "sticky top-0 border-b-2 border-line-strong bg-paper px-3.5 py-3.5 text-[0.72rem] font-bold tracking-[0.06em] whitespace-nowrap text-ink-2 uppercase md:px-[18px]";
