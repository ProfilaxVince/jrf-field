# DECISIONS.md — une ligne par décision

- 2026-08-02 — Périmètre = v2 : 185 magasins multi-enseignes ; la v1 (« 97 Intermarché ») est abandonnée.
- 2026-08-02 — Tailwind 4 CSS-first : tokens mappés via `@theme` dans `globals.css`, pas de `tailwind.config.ts` (le fichier n'existe plus en v4).
- 2026-08-02 — shadcn/ui installé manuellement (CLI bloquant hors TTY) ; `components.json` conservé pour le CLI futur.
- 2026-08-02 — Polices : stacks système en attendant l'auto-hébergement (Google Fonts inaccessible au build ici) ; display = Montserrat-like géométrique, corps = Inter. TODO(charte).
- 2026-08-02 — Couleurs d'état repensées de zéro : ocre foncé #8A5300 (retard) / bordeaux #9E1B3C (critique), redondance forme+icône+texte, fond max teinte 8 % — non-collision avec les 6 couleurs de personne (validé utilisateur : « repartir de 0 »).
- 2026-08-02 — Couleurs de personne Excel conservées à l'identique (condition d'adoption), usage restreint liseré + pastille.
- 2026-08-02 — Auth = code 8 car. + PIN 6 chiffres (choix utilisateur, alternative Supabase Auth standard écartée) ; schéma : hashes only + `device_sessions` révocables.
- 2026-08-02 — Rôle non exclusif : `app_users.is_admin boolean`, l'admin porte aussi un portefeuille.
- 2026-08-02 — Dette « jamais visité » = 3.0 conventionnel (priorité max) plutôt que NULL, pour un tri stable par `score_priorite`.
- 2026-08-02 — Seed : 185 magasins fictifs générés (script déterministe), distribution enseignes/régions exacte ; à remplacer par `magasins_seed.csv` réel au Lot 1.
- 2026-08-02 — `store_assignments` : exception au « pas de DELETE » (table de liaison sans historique métier, tracée par audit_log).
- 2026-08-02 — Correction patronyme : « Carton » (brief) → **Carion** Page (réponse utilisateur du 02/08).
