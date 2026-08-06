# JRF Field

PWA de planification et suivi des visites terrain — Jacques Remy & Fils.
185 magasins, 6 utilisateurs, cœur du produit : la dette de visite.

## Démarrer

```bash
npm install
cp .env.example .env.local   # renseigner les clés Supabase (projet EU/Frankfurt)
npm run dev
```

## Base de données

```bash
supabase db push        # applique supabase/migrations/
supabase db seed        # charge supabase/seed.sql (185 magasins fictifs + équipe)
supabase gen types typescript --local > src/lib/data/database.types.ts
```

## Écrans

Portail responsable (`/admin`, réservé à `is_admin`)

| Route | Rôle |
|---|---|
| `/admin` | À voir en priorité + verdict de capacité |
| `/planning` | Semaine : ajout manuel, modèles de tournée, réordonnancement, undo 10 s |
| `/templates` | Modèles de tournée réutilisables |
| `/stores` | Parc : ajout, modification, import CSV |
| `/incidents` | Signalements à traiter + remontées à la centrale |
| `/stats` | Les chiffres (lecture des vues SQL) |
| `/settings` | Rythme, catégories, équipe, exports |
| `/users` | Codes d'accès et « fait des visites » |
| `/absences` | Congés et absences |

Portail commercial (`/field`, mobile, hors ligne)

| Route | Rôle |
|---|---|
| `/field` | Tournée du jour (cache avant réseau) |
| `/field/visite/[id]` | Check-in, compte rendu, photos |
| `/field/signaler/[storeId]` | Signalement d'incident |

## Hors ligne

- Lecture : la tournée du jour est servie depuis IndexedDB avant tout appel réseau.
- Écriture : toutes les mutations terrain passent par l'outbox (`src/lib/data/outbox.ts`),
  rejouée au retour du réseau, au retour au premier plan et au démarrage.
- Coquille : `public/sw.js` (navigations + `_next/static` uniquement, jamais de données).

## Gouvernance

- Règles permanentes : `CLAUDE.md`
- Journal des décisions : `docs/DECISIONS.md`
- Lots 0 à 7 livrés ; l'historique des choix est dans `docs/DECISIONS.md`.
