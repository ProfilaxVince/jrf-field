"use client";
import { useEffect, useRef } from "react";
import { Button } from "./button";
import { t } from "@/lib/i18n/fr-BE";

const DELAI_MS = 10_000;

/**
 * Tout est réversible pendant 10 secondes, sans modale : l'action a déjà eu
 * lieu, elle s'annule d'un geste. Une modale de confirmation ferait porter
 * la charge de la décision AVANT l'action — l'inverse de ce qu'il faut ici.
 */
export function UndoBar({
  message,
  onUndo,
  onExpire,
}: {
  message: string;
  onUndo: () => void;
  onExpire: () => void;
}) {
  // Le compte à rebours est armé UNE fois par message. Passer `onExpire` en
  // dépendance le réarmerait à chaque rendu du parent (fonction recréée à
  // chaque fois) : la barre ne disparaîtrait jamais toute seule.
  const expirer = useRef(onExpire);
  expirer.current = onExpire;

  useEffect(() => {
    const timer = setTimeout(() => expirer.current(), DELAI_MS);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <div
      role="status"
      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
    >
      <span className="text-base">{message}</span>
      <Button variant="outline" onClick={onUndo}>
        {t.common.undo}
      </Button>
    </div>
  );
}
