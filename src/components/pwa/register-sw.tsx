"use client";
import { useEffect } from "react";

/** Enregistre le service worker. Sans lui, « pas offline = pas terminé » n'est pas tenu. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return; // le dev server sert des chunks non versionnés
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Un enregistrement refusé (mode privé) ne doit jamais bloquer l'application.
    });
  }, []);
  return null;
}
