"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n/fr-BE";
import type { AppUserRow, FicheCommercial } from "@/lib/data/users";

/**
 * Fiche d'un commercial : prénom, nom, surnom, e-mail, téléphone, couleur.
 *
 * Le surnom est le seul champ vraiment obligatoire : c'est le nom d'utilisateur
 * (login) ET ce que tous les écrans affichent. Le reste est du carnet d'adresses,
 * et une fiche à moitié remplie vaut mieux qu'une fiche jamais créée.
 *
 * L'e-mail ne sert PAS à se connecter — l'authentification reste surnom + code
 * à 4 chiffres. Le libellé le dit à l'écran, pour qu'on ne le découvre pas en
 * essayant.
 */

/** Les six couleurs de l'Excel de Gérardo. Liseré + pastille, jamais un fond. */
export const COULEURS = [
  { valeur: "#ffff00", nom: "Jaune" },
  { valeur: "#92d050", nom: "Vert" },
  { valeur: "#00b0f0", nom: "Bleu" },
  { valeur: "#ff0000", nom: "Rouge" },
  { valeur: "#ffc000", nom: "Orange" },
  { valeur: "#7030a0", nom: "Violet" },
] as const;

export const FICHE_VIDE: FicheCommercial = {
  first_name: "",
  last_name: "",
  nickname: "",
  email: "",
  phone: "",
  color_hex: COULEURS[0].valeur,
  is_admin: false,
  porte_visites: true,
};

export function ficheDepuis(u: AppUserRow): FicheCommercial {
  return {
    first_name: u.first_name ?? "",
    last_name: u.last_name ?? "",
    nickname: u.nickname,
    email: u.email ?? "",
    phone: u.phone ?? "",
    color_hex: u.color_hex,
    is_admin: u.is_admin,
    porte_visites: u.porte_visites,
  };
}

const champ =
  "min-h-[44px] w-full rounded border border-border px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jrf-600";

function Champ(props: {
  libelle: string;
  valeur: string;
  onChange: (v: string) => void;
  type?: string;
  aide?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-base text-neutral-700">{props.libelle}</span>
      <input
        className={champ}
        type={props.type ?? "text"}
        value={props.valeur}
        onChange={(e) => props.onChange(e.target.value)}
      />
      {props.aide && <span className="block text-sm text-neutral-600">{props.aide}</span>}
    </label>
  );
}

export function FormulaireCommercial({
  fiche,
  onChange,
  onValider,
  onAnnuler,
  enCours,
}: {
  fiche: FicheCommercial;
  onChange: (f: FicheCommercial) => void;
  onValider: () => void;
  onAnnuler: () => void;
  enCours: boolean;
}) {
  const [touche, setTouche] = useState(false);
  const set = <K extends keyof FicheCommercial>(cle: K, v: FicheCommercial[K]) =>
    onChange({ ...fiche, [cle]: v });
  const surnomManquant = touche && !fiche.nickname.trim();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ
          libelle={t.adminUsers.firstName}
          valeur={fiche.first_name}
          onChange={(v) => set("first_name", v)}
        />
        <Champ
          libelle={t.adminUsers.lastName}
          valeur={fiche.last_name}
          onChange={(v) => set("last_name", v)}
        />
        <div>
          <Champ
            libelle={t.adminUsers.nickname}
            valeur={fiche.nickname}
            onChange={(v) => set("nickname", v)}
            aide={t.adminUsers.nicknameHint}
          />
          {surnomManquant && (
            <p className="mt-1 text-base text-[color:var(--state-critical)]">
              {t.adminUsers.nicknameRequired}
            </p>
          )}
        </div>
        <Champ
          libelle={t.adminUsers.phone}
          valeur={fiche.phone}
          onChange={(v) => set("phone", v)}
          type="tel"
        />
        <div className="sm:col-span-2">
          <Champ
            libelle={t.adminUsers.email}
            valeur={fiche.email}
            onChange={(v) => set("email", v)}
            type="email"
            aide={t.adminUsers.emailHint}
          />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-base text-neutral-700">{t.adminUsers.color}</legend>
        <div className="flex flex-wrap gap-2">
          {COULEURS.map((c) => (
            <button
              key={c.valeur}
              type="button"
              aria-pressed={fiche.color_hex === c.valeur}
              aria-label={c.nom}
              onClick={() => set("color_hex", c.valeur)}
              className={`flex min-h-[44px] min-w-[44px] items-center gap-2 rounded border px-3 text-base ${
                fiche.color_hex === c.valeur
                  ? "border-jrf-700 border-2 font-semibold"
                  : "border-border"
              }`}
            >
              <span aria-hidden className="size-4 rounded-full" style={{ backgroundColor: c.valeur }} />
              {c.nom}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex min-h-[44px] items-center gap-2 text-base">
        <input
          type="checkbox"
          className="size-5"
          checked={fiche.porte_visites}
          onChange={(e) => set("porte_visites", e.target.checked)}
        />
        {t.adminUsers.carriesVisits}
      </label>

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={enCours}
          onClick={() => {
            setTouche(true);
            if (fiche.nickname.trim()) onValider();
          }}
        >
          {enCours ? t.common.saving : t.adminUsers.save}
        </Button>
        <Button variant="secondary" onClick={onAnnuler}>
          {t.common.cancel}
        </Button>
      </div>
    </div>
  );
}
