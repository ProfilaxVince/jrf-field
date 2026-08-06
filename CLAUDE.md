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
  en clair (base/logs/URL). Auth = **nom d'utilisateur (le surnom) + code 4 chiffres**
  (changement demandé le 06/08/2026, remplace « code 8 car. + PIN 6 chiffres ») → JWT
  longue durée lié à l'appareil, révocable, rate-limité.
  ⚠️ Le nom d'utilisateur n'est pas un secret : il ne reste que 10 000 combinaisons.
  **Le verrouillage après 5 échecs (15 min) est la seule protection réelle du compte** —
  ne jamais l'assouplir, ne jamais le contourner « pour tester ».
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

## Session snapshot — reprise Claude Code (état au 2026-08-06)

### Infrastructure

- **Projet Supabase** : `jrf-field` (ref `qvjknxswntewkswspmgx`, org `zvlvfwkxwddlplmtwnjk`),
  région Frankfurt.
- **Migrations** : toutes celles de [supabase/migrations](supabase/migrations/) sont
  appliquées, jusqu'à `00014_terrain_autonome.sql`.
- **Types générés** : `src/lib/data/database.types.ts`.
- **Déploiement** : Netlify, `jrfcom.netlify.app`, branche **`main`**.
  ⚠️ Netlify ne déploie que `main` : tout travail resté sur une branche de session
  est invisible pour Vincent. Fusionner dans `main` à chaque lot.
  L'écran Réglages affiche la référence du build pour lever le doute.
- **Auth** : nom d'utilisateur (surnom) + code 4 chiffres. Admin : **Gerardo**.
  Le code n'est écrit dans aucun fichier du dépôt — il se pose avec
  `scripts/set-pin.mjs` (non committé, nécessite la clé service_role).
- **`.env.local`** (non committé) :
  - `NEXT_PUBLIC_SUPABASE_URL=https://qvjknxswntewkswspmgx.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_K5QulJDusUdXyp55odhnXw_NxiyxoUf`

### Vincent n'a pas de terminal

Il travaille depuis le PC de son employeur, sans ligne de commande. **Tout ce qui doit
être exécuté doit l'être depuis le navigateur** : SQL Editor de Supabase, écran
« Importer un CSV » de l'app. Les scripts prêts à coller vivent dans
[supabase/manual/](supabase/manual/), chacun idempotent et s'inscrivant lui-même dans
`supabase_migrations.schema_migrations` pour ne pas être rejoué par un futur `db push`.

### Modèle métier — deux corrections déjà faites, à ne pas réintroduire

1. **Aucun magasin n'appartient à un commercial.** Tous peuvent traverser tous les
   magasins. Il n'y a pas de périmètre, pas de secteur, pas d'affectation. (Confirmé
   par Vincent le 06/08/2026 ; l'écran `/perimetres` et `lib/data/team.ts` ont été
   supprimés.)
2. **Pas de remplissage automatique de la semaine.** Gérardo compose lui-même :
   modèles de tournée (`/templates`), ajout manuel de magasins, « vider la semaine »
   par commercial. `repartirSemaine` a été supprimé de `lib/domain/planning.ts`,
   qui ne garde que `distanceKm()` et `ordonnerParProximite()`.

### Import des magasins réels — état exact

Le fichier source est l'Excel de Gérardo `Visites_Inter_Delhaize_31.xlsx`
(**185 lignes** : 95 Intermarché, 78 AD Delhaize, 6 Delhaize, 5 Proxy, 1 Spar).
Il ne contient **ni adresse ni GPS** — seulement un libellé par magasin.

**Livré :** [supabase/manual/magasins-reels.csv](supabase/manual/magasins-reels.csv),
importable tel quel via Magasins → Importer un CSV.

| | |
|---|---|
| Commune + code postal | **185/185** |
| Adresse | **146/185**, retrouvées une par une, chacune avec sa source |
| dont vérifiées sans ambiguïté | 116 |
| dont `aVerifier` (deux adresses circulent, ou deux magasins portent le nom) | 31 |
| Coordonnées GPS | **0/185** — voir ci-dessous |

**Chaîne de production :**

```
scripts/adresses-magasins.json      table cumulative : libellé Excel → adresse + source
scripts/extraire-magasins-excel.mjs table des communes + conversion Excel → CSV
supabase/manual/magasins-reels.csv  le résultat, à importer
```

Pour régénérer après avoir complété le JSON :

```bash
node scripts/extraire-magasins-excel.mjs <fichier.xlsx> supabase/manual/magasins-reels.csv
```

**Pourquoi pas de GPS** : Overpass, Nominatim, `stores.delhaize.be` et `intermarche.be`
renvoient tous 403 depuis cet environnement. La recherche web ne donne que les
coordonnées de la **commune**, qui enverraient le commercial sur la grand-place au lieu
du magasin et fausseraient « Ranger par trajet ». La colonne est donc laissée vide
délibérément. Ce n'est pas bloquant : `lienItineraire` bascule sur l'adresse postale,
donc le bouton Google Maps fonctionne sans coordonnées.

**39 adresses restent à trouver** (toutes AD Delhaize, Proxy ou Delhaize — le bloc
Intermarché est terminé). Reprendre la boucle : une recherche web par magasin,
écriture dans `scripts/adresses-magasins.json`, régénération du CSV.

```
AD DELHAIZE OTTIGNIES · OUDENAARDE · PRINCE DE LIEGE · ROODEBEEK · SCHOTEN · SERAING
AD DELHAIZE TOURNAI · TUBIZE · UCCLE DEFRE · VIRTON · WAASLAND · WATERLOO · WAVRE
AD DELHAIZE WILRIJK · WONDELGEM · ZEDELGEM · EVERE · FERRIERES
AD WAREGEM (×2) · ZWIJNAARDE · JODOIGNE · BELGRADE · RECOGNE · WANZE · FORT JACO
AD GENVAL · CROIX DE GUERRE · LA LOUVIERE
PROXY BEERZEL · HOEILLART · WOLUWE ST LAMBERT · SCHAERBEEK · RHISNES
DELHAIZE VISE · AARDOIE · ZELE · TORHOUT · AARTSELAAR
```

### Questions ouvertes pour Gérardo — à poser avant l'import définitif

- **Doublons dans son propre fichier** : `AD DELHAIZE HANKAR` / `AD HANKAR` désignent
  le même magasin (Clos Lucien Outers 1, Auderghem). Idem `AD DELHAIZE MONS` /
  `AD DELHAIZE NIMY - VAMODIS` (Rue de Nimy 117-121 — Vamodis SA est la société
  exploitante, pas un autre point de vente). `AD WAREGEM` apparaît deux fois à
  l'identique. Lesquels supprimer ?
- **`INTERMARCHE GOSSELIES` vs `INTERMARCHE GOSSELIES BY`** : deux magasins réels
  (Chaussée de Courcelles 95 et Rue Pont-à-Migneloux 13). L'attribution entre les deux
  lignes est déduite, pas vérifiée.
- **`INTERMARCHE LEUZE`** : rattaché à Leuze-en-Hainaut (7900), mais un Intermarché
  nommé « Leuze » existe aussi à Éghezée. À confirmer.
- **`AD DELHAIZE ANTOING`** : rue connue (Rue du Burg), numéro introuvable.
- Corrections de code postal appliquées, à valider : `INTERMARCHE ORCQ` → 7501 (et non
  7503, qui est Froyennes) ; `AD DELHAIZE FRASNES LEZ GOSSELIES` → 6210 (et non 6250).
- Correction déjà faite : `INTERMARCHE ST LAMBERT BY` est aux **Galeries
  Saint-Lambert à Liège** (4000), pas à Woluwe-Saint-Lambert.

### Avant l'import

Exécuter [supabase/manual/remplacer-magasins-fictifs.sql](supabase/manual/remplacer-magasins-fictifs.sql)
dans le SQL Editor : il désactive les 185 magasins fictifs du seed (`active = false`,
aucune suppression physique) et les visites qui les référencent. Puis importer
`magasins-reels.csv` via Magasins → Importer un CSV.

### Vérifications avant de dire « c'est fait »

```bash
npm run build && npm run lint
```

Et un test réel dans le navigateur. Un build qui passe ne prouve pas qu'une mise en
page tient : la barre de navigation a été livrée cassée sur téléphone parce qu'un
`flex` sans direction avait été relu trop vite.
