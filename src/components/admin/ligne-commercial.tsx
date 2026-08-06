"use client";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n/fr-BE";
import type { AppUserRow } from "@/lib/data/users";

/**
 * Une personne dans la liste de l'équipe : identité, coordonnées, et les trois
 * actions qui la concernent.
 *
 * Les coordonnées sont affichées en clair et cliquables : le but de la fiche
 * est qu'on puisse appeler quelqu'un depuis son téléphone sans recopier un
 * numéro. Un `tel:` fait gagner ce geste-là.
 */
export function LigneCommercial({
  u,
  busy,
  onModifier,
  onRetirer,
  onGenerer,
}: {
  u: AppUserRow;
  busy: boolean;
  onModifier: () => void;
  onRetirer: () => void;
  onGenerer: () => void;
}) {
  const nomComplet = [u.first_name, u.last_name].filter(Boolean).join(" ");

  return (
    <div
      className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
      style={{ borderLeft: `4px solid ${u.color_hex}` }}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden
          className="mt-1 size-3 shrink-0 rounded-full"
          style={{ backgroundColor: u.color_hex }}
        />
        <div className="min-w-0 space-y-0.5">
          <div className="text-lg font-semibold break-words">{u.nickname}</div>
          {nomComplet && nomComplet !== u.nickname && (
            <div className="text-base text-neutral-700 break-words">{nomComplet}</div>
          )}
          {u.phone && (
            <div className="text-base">
              <a className="underline" href={`tel:${u.phone.replace(/\s/g, "")}`}>
                {u.phone}
              </a>
            </div>
          )}
          {u.email && (
            <div className="text-base break-words">
              <a className="underline" href={`mailto:${u.email}`}>
                {u.email}
              </a>
            </div>
          )}
          <div className="text-sm text-neutral-600">
            {u.pin_hash ? t.adminUsers.hasCode : t.adminUsers.noCode}
            {u.is_admin ? " · admin" : ""}
            {u.porte_visites ? "" : ` · ${t.adminUsers.doesNotCarryVisits}`}
          </div>
          {!u.pin_hash && (
            <p className="text-base text-[color:var(--state-warning)]">{t.adminUsers.noCodeYet}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={onModifier}>
          {t.adminUsers.edit}
        </Button>
        <Button variant={u.pin_hash ? "outline" : "default"} disabled={busy} onClick={onGenerer}>
          {busy
            ? t.adminUsers.generating
            : u.pin_hash
              ? t.adminUsers.regenerateCode
              : t.adminUsers.generateCode}
        </Button>
        <Button variant="outline" onClick={onRetirer}>
          {t.adminUsers.remove}
        </Button>
      </div>
    </div>
  );
}
