import Image from "next/image";
import { t } from "@/lib/i18n/fr-BE";

/**
 * SEUL point d'entrée du logo. Pour passer au logo officiel :
 * déposer le fichier dans /public/brand/logo.png (ou .svg) — rien d'autre à changer.
 * TODO(charte): remplacer le wordmark par le SVG officiel JRF.
 */
const OFFICIAL_LOGO = "/brand/logo.png";
const HAS_OFFICIAL_LOGO = false; // passer à true quand le fichier est déposé

export function Logo({
  inverted = false,
  compact = false,
  className,
}: {
  inverted?: boolean;
  /** Barre de navigation : initiales seules, le wordmark complet ne tient pas. */
  compact?: boolean;
  className?: string;
}) {
  if (HAS_OFFICIAL_LOGO) {
    return (
      <Image
        src={OFFICIAL_LOGO}
        alt={t.app.company}
        width={compact ? 48 : 180}
        height={48}
        className={className}
        priority
      />
    );
  }
  return (
    <span
      className={`font-display font-bold uppercase tracking-[0.12em] ${compact ? "text-lg" : "text-xl"} ${className ?? ""}`}
      style={{ color: inverted ? "var(--jrf-white)" : "var(--jrf-green-800)" }}
      title={t.app.company}
    >
      {compact ? (
        "JRF"
      ) : (
        <>
          Jacques&nbsp;Remy&nbsp;<span className="font-normal">&amp;&nbsp;Fils</span>
        </>
      )}
    </span>
  );
}
