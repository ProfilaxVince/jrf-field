import Image from "next/image";
import { t } from "@/lib/i18n/fr-BE";

/**
 * SEUL point d'entrée du logo. Pour passer au logo officiel :
 * déposer le fichier dans /public/brand/logo.png (ou .svg) — rien d'autre à changer.
 * TODO(charte): remplacer le wordmark par le SVG officiel JRF.
 */
const OFFICIAL_LOGO = "/brand/logo.png";
const HAS_OFFICIAL_LOGO = false; // passer à true quand le fichier est déposé

export function Logo({ inverted = false }: { inverted?: boolean }) {
  if (HAS_OFFICIAL_LOGO) {
    return (
      <Image
        src={OFFICIAL_LOGO}
        alt={t.app.company}
        width={180}
        height={48}
        priority
      />
    );
  }
  return (
    <span
      className="font-display text-xl font-bold uppercase tracking-[0.12em]"
      style={{ color: inverted ? "var(--jrf-white)" : "var(--jrf-green-800)" }}
    >
      Jacques&nbsp;Remy&nbsp;<span className="font-normal">&amp;&nbsp;Fils</span>
    </span>
  );
}
