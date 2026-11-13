// Identité de la marque « Jeff Elec » (site vitrine, accueil, en-têtes).
// ⚠️ Les coordonnées marquées « À COMPLÉTER » sont des valeurs provisoires à remplacer par les vraies
// (ou à surcharger avec le document Firestore `settings/company` via `brandFromSettings`).

export interface BrandSocials {
  facebook?: string;
  linkedin?: string;
  whatsapp?: string;
}

export interface Brand {
  name: string;
  /** Initiales du logo. */
  initials: string;
  tagline: string;
  /** Phrase courte de présentation (pied de page). */
  description: string;
  /** Année de création (affichée « depuis … »). */
  since: number;
  phone: string;
  email: string;
  address: string;
  openingHours: string;
  /** URL « embed » Google Maps (https://www.google.com/maps/embed?pb=…) ; vide = carte masquée. */
  mapEmbedUrl?: string;
  /** Liens vers les réseaux sociaux ; un lien vide n'est pas affiché. */
  socials: BrandSocials;
}

const BRAND: Brand = {
  name: "Jeff Elec",
  initials: "JE",
  tagline: "Rebobinage et réparation de moteurs électriques",
  description: "Atelier de rebobinage et de réparation de moteurs électriques à Madagascar.",
  since: 2009,
  phone: "+261 34 00 000 00", // À COMPLÉTER
  email: "contact@jeffelec.mg", // À COMPLÉTER
  address: "Antananarivo, Madagascar", // À COMPLÉTER (adresse complète de l'atelier)
  openingHours: "Lun-Ven : 8h-18h · Sam : 8h-12h", // À COMPLÉTER
  mapEmbedUrl: "", // À COMPLÉTER (laisser vide pour masquer la carte)
  socials: {
    facebook: "", // optionnel
    linkedin: "", // optionnel
    whatsapp: "", // optionnel (ex. https://wa.me/261340000000)
  },
};

export default BRAND;

/** Lien tel: à partir d'un numéro affiché (« +261 34 00 000 00 » → « tel:+261340000000 »). */
export const phoneHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/** Fusionne les coordonnées saisies dans les paramètres entreprise (champs non vides) avec la marque par défaut. */
export function brandFromSettings(s?: Partial<{ name: string; phone: string; email: string; address: string; openingHours: string; mapUrl: string; facebook: string }> | null): Brand {
  if (!s) return BRAND;
  const pick = (v: string | undefined, fallback: string) => (v && v.trim() ? v.trim() : fallback);
  return {
    ...BRAND,
    name: pick(s.name, BRAND.name),
    phone: pick(s.phone, BRAND.phone),
    email: pick(s.email, BRAND.email),
    address: pick(s.address, BRAND.address),
    openingHours: pick(s.openingHours, BRAND.openingHours),
    mapEmbedUrl: pick(s.mapUrl, BRAND.mapEmbedUrl ?? ""),
    socials: { ...BRAND.socials, facebook: pick(s.facebook, BRAND.socials.facebook ?? "") },
  };
}
