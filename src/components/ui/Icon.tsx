/** Icône Font Awesome : <Icon name="bolt" /> ; préfixe "far " / "fab " pour les autres styles. */
export function Icon({ name, className = "" }: { name: string; className?: string }) {
  const [style, glyph] = name.includes(" ") ? name.split(" ") : ["fas", name];
  return <i aria-hidden className={`${style} fa-${glyph} ${className}`} />;
}
