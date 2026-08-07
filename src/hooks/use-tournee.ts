"use client";
import { useCallback, useEffect, useState } from "react";
import {
  ajouterArretTerrain,
  ajouterPhoto,
  chargerTourneeReseau,
  declarerUrgenceLivraison,
  demarrerVisite,
  deplacerArretTerrain,
  lireCatalogue,
  lireTourneeCache,
  rafraichirCatalogue,
  reporterVisite,
  retirerArretTerrain,
  terminerVisite,
  type Position,
  type TourneeCache,
  type TypeArret,
} from "@/lib/data/tournee";
import type { StoreRow } from "@/lib/data/stores";
import { surChangementOutbox, tailleOutbox, viderOutbox } from "@/lib/data/outbox";
import { useSession } from "@/lib/session";
import type { SaisieCompteRendu } from "@/lib/domain/compte-rendu";
import { aujourdhuiISO } from "@/lib/dates";

export function useTournee(date: string = aujourdhuiISO()) {
  const { userId } = useSession();
  const [tournee, setTournee] = useState<TourneeCache | null>(null);
  const [chargement, setChargement] = useState(true);
  const [depuisCache, setDepuisCache] = useState(false);
  const [enAttente, setEnAttente] = useState(0);
  const [catalogue, setCatalogue] = useState<StoreRow[]>([]);

  useEffect(() => {
    if (!userId) return;
    let monte = true;
    (async () => {
      // 1. Cache d'abord : premier rendu utile sans réseau.
      const cache = await lireTourneeCache(userId, date);
      if (monte && cache) {
        setTournee(cache);
        setDepuisCache(true);
        setChargement(false);
      }
      // 2. Réseau ensuite, en silence.
      try {
        const frais = await chargerTourneeReseau(userId, date);
        if (monte) {
          setTournee(frais);
          setDepuisCache(false);
        }
      } catch {
        if (monte && !cache) setTournee(null);
      } finally {
        if (monte) setChargement(false);
      }
    })();
    return () => {
      monte = false;
    };
  }, [date, userId]);

  useEffect(() => {
    tailleOutbox().then(setEnAttente);
    return surChangementOutbox(setEnAttente);
  }, []);

  // Catalogue des magasins : cache d'abord pour pouvoir ajouter un arrêt
  // ou déclarer une urgence sans réseau, réseau ensuite pour le tenir à jour.
  useEffect(() => {
    let monte = true;
    (async () => {
      const enCache = await lireCatalogue();
      if (monte && enCache.length > 0) setCatalogue(enCache);
      try {
        const frais = await rafraichirCatalogue();
        if (monte) setCatalogue(frais);
      } catch {
        // Hors ligne : le cache suffit.
      }
    })();
    return () => {
      monte = false;
    };
  }, []);

  const appliquer = useCallback((maj: TourneeCache | null) => {
    if (maj) setTournee(maj);
  }, []);

  return {
    tournee,
    catalogue,
    chargement: chargement && userId !== null,
    depuisCache,
    enAttente,
    ajouterArret: useCallback(
      async (store: StoreRow, type: TypeArret, motifDepannage?: string) => {
        if (!userId) return;
        appliquer(await ajouterArretTerrain(userId, date, store, type, motifDepannage));
      },
      [date, userId, appliquer]
    ),
    declarerUrgence: useCallback(
      async (store: StoreRow, description: string) => {
        if (!userId) return;
        appliquer(await declarerUrgenceLivraison(userId, date, store, description));
      },
      [date, userId, appliquer]
    ),
    retirerArret: useCallback(
      async (visitId: string, motif: string) => {
        if (!userId) return;
        appliquer(await retirerArretTerrain(userId, date, visitId, motif));
      },
      [date, userId, appliquer]
    ),
    deplacerArret: useCallback(
      async (visitId: string, sens: -1 | 1) => {
        if (!userId) return;
        appliquer(await deplacerArretTerrain(userId, date, visitId, sens));
      },
      [date, userId, appliquer]
    ),
    demarrer: useCallback(
      async (visitId: string, position: Position) => {
        if (!userId) return;
        appliquer(await demarrerVisite(userId, date, visitId, position));
      },
      [date, userId, appliquer]
    ),
    terminer: useCallback(
      async (visitId: string, saisie: SaisieCompteRendu, nbPhotos: number) => {
        if (!userId) return;
        appliquer(await terminerVisite(userId, date, visitId, saisie, nbPhotos));
      },
      [date, userId, appliquer]
    ),
    reporter: useCallback(
      async (visitId: string, motif: string) => {
        if (!userId) return;
        appliquer(await reporterVisite(userId, date, visitId, motif));
      },
      [date, userId, appliquer]
    ),
    photographier: useCallback(
      async (visitId: string, position: number, fichier: File) => {
        if (!userId) return;
        appliquer(await ajouterPhoto(userId, date, visitId, position, fichier));
      },
      [date, userId, appliquer]
    ),
    synchroniser: useCallback(async () => {
      if (!userId) return;
      await viderOutbox();
      try {
        setTournee(await chargerTourneeReseau(userId, date));
        setDepuisCache(false);
      } catch {
        setDepuisCache(true);
      }
    }, [date, userId]),
  };
}

/** Géolocalisation ponctuelle : une seule mesure, jamais de suivi (CCT n°81). */
export function demanderPositionUneFois(): Promise<Position> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
    );
  });
}
