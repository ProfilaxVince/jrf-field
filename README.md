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

## Gouvernance

- Règles permanentes : `CLAUDE.md`
- Journal des décisions : `docs/DECISIONS.md`
- Plan d'exécution par lots : voir prompt initial (Lot 0 = ce dépôt)
