# CLAUDE.md — JRF Field

Application web installable (PWA) pour le responsable commercial de Jacques Remy & Fils :
planifier et suivre les visites de 5 commerciaux dans **185 magasins** de la grande
distribution (Intermarché, AD Delhaize, Proxy Delhaize, Delhaize, Spar), sans qu'aucun
magasin ne soit oublié. Le cœur du produit est la **dette de visite**.

## Glossaire (vocabulaire du code — pas forcément de l'UI)

| Terme | Sens |
|---|---|
| Magasin (`store`) | Point de vente visité |
| Tier | Importance A/B/C dérivée du CA (override admin possible) |
| Fréquence cible | Jours max théoriques entre deux visites |
| Dette de visite | `jours_depuis_derniere_visite / frequence_cible` — > 1 = en retard |
| Routing | Tournée d'un commercial pour une journée |
| Template de routing | Modèle de tournée réutilisable |
| Relais centrale | Remontée d'info terrain → centrale de distribution |
| Incident | Oubli de livraison, rupture, litige qualité |

**Dans l'UI : jamais de jargon.** « Dette de visite », « score », « KPI » n'apparaissent
jamais à l'écran. On écrit « Vu il y a 23 jours » et « En retard de 9 jours ».
Dans le code : tables/colonnes en anglais snake_case, libellés en français.

## Règles d'ingénierie

- TypeScript strict, pas de `any`. Types DB générés (`supabase gen types`), jamais manuels.
- Logique métier agrégée en SQL (vues/fonctions) : dette, couverture, priorisation.
  Le front n'invente aucun calcul.
- RLS activée sur chaque table dès sa création. Table sans policy = bug bloquant.
- Composants < 200 lignes, une responsabilité. Logique dans `hooks/` ou `lib/`.
- Zéro couleur/taille/espacement en dur : tokens uniquement (`src/styles/tokens.css`,
  mappés en `@theme` Tailwind 4 dans `globals.css` — pas de `tailwind.config.ts`).
- Zéro texte UI en dur : tout passe par `lib/i18n/fr-BE.ts` (règle de propreté ;
  interface FR uniquement, aucun NL à produire).
- Toute mutation passe par `lib/data/` (interception outbox offline).
  Jamais d'appel Supabase direct depuis un composant.
- Dates : stockage UTC, affichage `Europe/Brussels`, `date-fns` locale `fr`.
  JJ/MM/AAAA, 24 h, EUR, semaine ISO commençant lundi.
- Aucune suppression physique : `active = false` + `audit_log`.

## Arborescence

```
src/app/(admin)/     portail responsable      src/lib/data/    accès données + outbox
src/app/(field)/     portail commercial       src/lib/domain/  calculs purs + types
src/components/ui/   shadcn                   src/lib/i18n/    fr-BE.ts
src/components/brand/ identité JRF            src/styles/tokens.css  source unique
supabase/migrations/ numérotées, figées       docs/DECISIONS.md      1 ligne/décision
```

## Workflow à chaque tâche

1. Reformuler + plan en 3-6 points.
2. Signaler risques/incohérences avant de coder. Contredire l'utilisateur fait partie du travail.
3. Un lot à la fois. Ne pas commencer le lot N+1 sans validation du lot N.
4. Vérifier : `npm run build` + `npm run lint` + test manuel. Jamais « c'est fait » sans exécution.
5. Commit atomique, message conventionnel en anglais (`feat:`, `fix:`, `chore:`).
6. Décision structurante → une ligne dans `docs/DECISIONS.md`.

## Contraintes non négociables

- **Novice d'abord** : Gérardo (admin, 50+, non-informaticien) doit planifier une semaine
  seul en < 10 min à la première tentative, sans formation. App livrée pré-remplie, jamais
  d'écran vide, une action principale par écran, tout réversible (undo 10 s, pas de modale),
  enregistrement automatique, corps de texte ≥ 16 px (18 px mobile). Si un écran a besoin
  d'être expliqué, refaire l'écran — pas d'aide contextuelle.
- **Mobile d'abord** (portail commercial) : pouce, extérieur, réseau instable.
  Pas offline = pas terminé. Tournée du jour affichée depuis le cache avant tout réseau.
- **Performance** : premier rendu utile < 2 s en 3G simulée.
- **Sécurité** : aucun secret côté client, pas de service_role exposé, pas de code d'accès
  en clair (base/logs/URL). Auth = code 8 car. + PIN 6 chiffres → JWT longue durée lié à
  l'appareil, révocable, rate-limité.
- **RGPD/CCT n°81** : géoloc ponctuelle au check-in, optionnelle, annoncée.
  Jamais de suivi continu. Hébergement UE (Supabase Frankfurt).
- **Accessibilité** : contraste AA, cibles ≥ 44 px, focus visible, `prefers-reduced-motion`.

## Couleurs — règle de non-collision

Les couleurs de personne (Excel : jaune, vert, bleu, rouge, orange, violet) sont réservées
au **liseré gauche + pastille d'avatar**, jamais en fond. L'état de dette est porté par
**forme + icône + texte** (« En retard de N j »), couleur redondante foncée/désaturée
(`--state-warning` ocre, `--state-critical` bordeaux), fond max teinte 8 %.
Couleurs d'état ≠ couleurs de marque ≠ couleurs de personne.

## Identité visuelle

Indiscernable d'un outil officiel JRF. Marque monochrome (vert + blanc), dégradé
green-800 → sage-400 en diagonale. Valeur de marque inconnue → token `TODO(charte)` +
signalement, jamais d'invention. Logo remplaçable via un seul fichier
(`src/components/brand/logo.tsx` + `/public/brand/`).
Titrage : display géométrique capitales (jamais en corps). Corps : Inter.

## Interdits

- ❌ Inventer couleurs, logo ou données de magasins réels sans le signaler.
- ❌ Solveur VRP : heuristique plus proche voisin + réordonnancement manuel, point.
- ❌ Dépendance lourde ou ORM supplémentaire sans justification.
- ❌ Coder plus d'un lot d'avance.
- ❌ Annoncer une fonctionnalité terminée sans l'avoir exécutée.

## Style de collaboration

Direct, dense, sans flatterie. Signaler les mauvaises idées immédiatement avec
l'alternative. Question plutôt qu'hypothèse quand l'enjeu est structurant.
Ne jamais élargir le périmètre sans demander.

## Session snapshot — reprise Claude Code

Résumé rapide (état au 2026-08-05)
- **Supabase project**: `jrf-field` (ref: `qvjknxswntewkswspmgx`, org: `zvlvfwkxwddlplmtwnjk`).
- **Migrations appliquées**: toutes les migrations dans [supabase/migrations](supabase/migrations/) ont été poussées sur le projet.
- **Seed exécuté**: `supabase/seed.sql` a été exécuté et a inséré les données de test (185 magasins + users).
- **Types générés**: `src/lib/data/database.types.ts` (généré via `supabase gen types`).
- **Client Supabase**: implémenté dans [src/lib/data/supabase.ts](src/lib/data/supabase.ts) et utilisé par le `SessionProvider`.
- **Auth**: le `dev-auth` a été remplacé par une authentification Supabase (magic link). Provider et page:
  - [src/lib/session.tsx](src/lib/session.tsx)
  - [src/app/auth/page.tsx](src/app/auth/page.tsx)
- **.env.local**: créé localement avec les variables suivantes (frontend only):
  - `NEXT_PUBLIC_SUPABASE_URL=https://qvjknxswntewkswspmgx.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_K5QulJDusUdXyp55odhnXw_NxiyxoUf`

Commandes utiles pour reprendre (exécuter dans la racine du repo)
- Login CLI (si déconnecté):

```bash
supabase login
```

- Lier le repo à un projet (si besoin):

```bash
supabase link --project-ref qvjknxswntewkswspmgx
```

- Re-pousser les migrations (optionnel — déjà appliquées):

```bash
supabase db push --linked
```

- Exécuter le seed SQL (optionnel — déjà exécuté):

```bash
supabase db query --linked --file supabase/seed.sql
```

- Générer les types TS (si besoin de régénérer):

```bash
supabase gen types --linked --schema public > src/lib/data/database.types.ts
```

- Builder l'app localement:

```bash
npm install
npm run build
```

Points d'attention pour la reprise sur Claude Code
- Les **secrets** (service_role key) ne sont pas dans ce dépôt. Ne jamais les mettre dans `.env.local` committé.
- Le `publishable` key est safe pour le frontend; il est présent dans `.env.local` local.
- Si tu veux que la première connexion Auth crée automatiquement une ligne `app_users`, il faut ajouter une logique serveur ou client pour créer/mapper `app_users.auth_user_id` au premier signin — je peux l'implémenter (option `auto-create`).
- Pour lier les comptes seed existants (dans `app_users`) aux comptes Auth, tu peux
  - soit créer manuellement les users Auth via le Dashboard et copier `auth_user_id` dans la table `app_users`,
  - soit exécuter un petit script qui recherche par email et met à jour `app_users.auth_user_id`.

Checklist rapide (pour la reprise)
- **[ ]** Ouvrir le repo et `npm run build` (vérifier que `.env.local` est présent).
- **[ ]** `supabase login` si la CLI demande une authentification.
- **[ ]** Lancer `supabase link` si le lien a été perdu.
- **[ ]** Tester l'auth magic-link depuis `/auth` et vérifier que `app_users` est lié.

Si tu veux, je peux générer un script utilitaire `scripts/link-seed-users.mjs` qui automatise le mapping `app_users.auth_user_id` depuis les emails présents dans `app_users` vers les utilisateurs Supabase Auth (exécutable via CLI). Dis "génère le script" et je l'ajoute.

*** Fin de la snapshot — reprise possible depuis Claude Code ***
