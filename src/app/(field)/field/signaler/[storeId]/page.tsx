"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTournee } from "@/hooks/use-tournee";
import { useSession } from "@/lib/session";
import { TYPES_INCIDENT, signalerIncident, type TypeIncident } from "@/lib/data/incidents";
import { t } from "@/lib/i18n/fr-BE";

const CRITICITES: (1 | 2 | 3)[] = [1, 2, 3];

export default function SignalerPage() {
  const params = useParams<{ storeId: string }>();
  const router = useRouter();
  const tournee = useTournee();
  const { userId } = useSession();
  const [type, setType] = useState<TypeIncident>("oubli_livraison");
  const [criticite, setCriticite] = useState<1 | 2 | 3>(2);
  const [description, setDescription] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const magasin = useMemo(
    () => tournee.tournee?.magasins.find((m) => m.id === params.storeId) ?? null,
    [tournee.tournee, params.storeId]
  );

  const urgenceLivraison = type === "oubli_livraison" && criticite === 3;

  async function envoyer() {
    if (!userId) return;
    setEnvoi(true);
    await signalerIncident({
      storeId: params.storeId,
      reportedBy: userId,
      type,
      criticite,
      description,
    });
    setEnvoi(false);
    router.push("/field");
  }

  return (
    <main className="min-h-dvh bg-background px-4 py-6">
      <div className="mx-auto flex w-full max-w-md flex-col gap-5">
        <Button variant="ghost" className="self-start px-2" asChild>
          <Link href="/field">
            <ChevronLeft aria-hidden />
            {t.saisieVisite.back}
          </Link>
        </Button>

        <h1 className="font-display text-xl font-bold uppercase tracking-[0.1em] text-jrf-800">
          {magasin ? t.incidents.reportFor(magasin.name) : t.incidents.report}
        </h1>

        <fieldset>
          <legend className="text-lg font-semibold">{t.incidents.typeLabel}</legend>
          <div className="mt-2 grid gap-2">
            {TYPES_INCIDENT.map((valeur) => (
              <Button
                key={valeur}
                type="button"
                size="lg"
                variant={type === valeur ? "default" : "outline"}
                aria-pressed={type === valeur}
                onClick={() => setType(valeur)}
              >
                {t.incidents.types[valeur]}
              </Button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-lg font-semibold">{t.incidents.criticiteLabel}</legend>
          <div className="mt-2 grid gap-2">
            {CRITICITES.map((valeur) => (
              <Button
                key={valeur}
                type="button"
                size="lg"
                variant={criticite === valeur ? "default" : "outline"}
                aria-pressed={criticite === valeur}
                onClick={() => setCriticite(valeur)}
              >
                {t.incidents.criticites[valeur]}
              </Button>
            ))}
          </div>
        </fieldset>

        <label className="block space-y-1">
          <span className="text-base font-medium">{t.incidents.descriptionLabel}</span>
          <textarea
            className="min-h-24 w-full rounded-md border border-border bg-card px-3 py-2 text-base leading-7"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        {urgenceLivraison && (
          <p className="rounded-lg border border-state-warning/30 bg-state-warning-tint px-3 py-2 text-base text-state-warning">
            {t.incidents.urgenceCreated}
          </p>
        )}

        <Button size="lg" onClick={envoyer} disabled={envoi || !userId}>
          {t.incidents.send}
        </Button>
      </div>
    </main>
  );
}
