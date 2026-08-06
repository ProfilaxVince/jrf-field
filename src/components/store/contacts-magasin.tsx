"use client";
import { Phone } from "lucide-react";
import { t } from "@/lib/i18n/fr-BE";
import type { StoreRow } from "@/lib/data/stores";

/**
 * Les deux contacts d'un magasin : l'adhérent et le responsable fruits &
 * légumes. Affiché tel quel côté terrain — en LECTURE SEULE. Le commercial
 * consulte et appelle ; seul le responsable modifie (décision du 06/08).
 *
 * Le numéro est un lien `tel:` et occupe toute la largeur d'une cible de 44 px :
 * le commercial est dehors, au pouce, souvent avec des gants. Recopier un
 * numéro à la main dans ces conditions, personne ne le fait — il appelle le
 * magasin par un autre moyen et l'information saisie ici n'aura servi à rien.
 *
 * Un contact sans téléphone reste affiché : savoir à qui demander vaut déjà
 * quelque chose une fois sur place.
 */
function Contact({ role, nom, tel }: { role: string; nom: string | null; tel: string | null }) {
  if (!nom && !tel) return null;
  return (
    <div className="space-y-1">
      <div className="text-sm text-neutral-600">{role}</div>
      {nom && <div className="text-base font-semibold break-words">{nom}</div>}
      {tel && (
        <a
          className="flex min-h-[44px] items-center gap-2 text-base underline"
          href={`tel:${tel.replace(/\s/g, "")}`}
        >
          <Phone aria-hidden className="size-4 shrink-0" />
          {tel}
        </a>
      )}
    </div>
  );
}

export function ContactsMagasin({ magasin }: { magasin: StoreRow | null }) {
  if (!magasin) return null;
  const vide =
    !magasin.adherent_name &&
    !magasin.adherent_phone &&
    !magasin.fl_manager_name &&
    !magasin.fl_manager_phone;

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card px-4 py-3">
      {vide ? (
        <p className="text-base text-neutral-600">{t.stores.noContact}</p>
      ) : (
        <>
          <Contact
            role={t.stores.adherent}
            nom={magasin.adherent_name}
            tel={magasin.adherent_phone}
          />
          <Contact
            role={t.stores.flManager}
            nom={magasin.fl_manager_name}
            tel={magasin.fl_manager_phone}
          />
        </>
      )}
    </section>
  );
}
