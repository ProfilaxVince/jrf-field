# CLAUDE.md — JRF Field

Application web installable (PWA) pour le responsable commercial de Jacques Remy & Fils :
planifier et suivre les visites de 5 commerciaux dans **182 magasins** de la grande
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
supabase/manual/     scripts à coller dans le SQL Editor (Vincent n'a pas de terminal)
scripts/             production des données magasins — voir « chaîne de production »
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

## Session snapshot — reprise Claude Code (état au 2026-08-07)

### Infrastructure

- **Projet Supabase** : `jrf-field` (ref `qvjknxswntewkswspmgx`, org `zvlvfwkxwddlplmtwnjk`),
  région Frankfurt.
- **Migrations** : base à jour jusqu'à **`00019_import_passages`**.
  ⚠️ **`00020_visite_importee_compte` reste à passer** — sans elle, un passage
  importé ne remet PAS la dette à zéro et le magasin reste en tête des priorités
  alors que le commercial y est passé.
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

### Ce qui a été livré depuis (lots A → D)

| Lot | Contenu | Migration |
|---|---|---|
| A | Fiche commercial : ajout / modification / retrait, prénom, nom, e-mail, téléphone | `00015` |
| B | Deux contacts par magasin : adhérent et responsable F&L, lus par le terrain | `00016` |
| C | Feuilles de semaine imprimables (PDF) et tableur, 1 ou 2 semaines, par commercial | — |
| D | Dépannage samedi/dimanche, motif obligatoire, posé par Gérardo ou le commercial | `00017` |
| E | Historique du CA par exercice + bloc « qui progresse, qui décroche » | `00018` |
| F | Rapport de visites par magasin, imprimable, version client / version interne | — |
| G | Import des passages transmis par l'informatique (écran « Passages ») | `00019` |

- **Le rapport magasin sépare les FAITS des APPRÉCIATIONS.** La case « inclure les
  remarques internes » est DÉCOCHÉE par défaut : le mode prudent est celui qu'on obtient
  sans rien faire, parce que ce document part chez l'adhérent.
- **`store_revenues` est la source du CA**, `stores.jrf_revenue_eur` n'en est que le
  reflet de l'exercice le plus récent, entretenu par trigger. Ne jamais écrire ces deux
  colonnes en direct depuis l'application.
- **L'import des passages n'écrit rien avant l'aperçu.** Quatre verdicts par ligne, et
  les visites prévues absentes du fichier sont listées mais JAMAIS annulées d'office.
- **Chantier en attente** : l'informatique de Jacques Remy doit répondre au questionnaire
  ([docs/questions-it.pdf](docs/questions-it.pdf), source HTML à côté). Deux questions
  restent aussi pour Vincent : leur Excel sort-il d'un export Odoo ou est-il tapé à la
  main, et peut-on en obtenir un exemplaire pour caler les correspondances par défaut ?

- **L'e-mail d'un commercial ne sert PAS à se connecter.** L'auth reste surnom + code
  4 chiffres. Ne pas le confondre avec `internal_auth_email` (adresse synthétique
  fabriquée pour Supabase Auth, unique, que personne ne lit).
- **`full_name` est DÉRIVÉ** de prénom + nom par trigger, avec repli sur le surnom.
  Ne plus le saisir nulle part.
- **`contact_name` / `contact_phone` n'existent plus** : renommés `fl_manager_*`
  (responsable fruits & légumes) en `00016`, et `adherent_*` les accompagne.
- **Un arrêt posé samedi ou dimanche EST un dépannage** — c'est la seule raison de
  travailler ce jour-là, le type se déduit du jour. Motif exigé par la base
  (contrainte `visits_depannage_motif_requis`), pas seulement par l'écran.
- **Un dépannage remet la dette à zéro**, comme l'urgence : `v_store_last_visit`
  n'exclut que le montage. Question posée à Vincent, sans réponse à ce jour.

### Modèle métier — deux corrections déjà faites, à ne pas réintroduire

1. **Aucun magasin n'appartient à un commercial.** Tous peuvent traverser tous les
   magasins. Il n'y a pas de périmètre, pas de secteur, pas d'affectation. (Confirmé
   par Vincent le 06/08/2026 ; l'écran `/perimetres` et `lib/data/team.ts` ont été
   supprimés.)
2. **Pas de remplissage automatique de la semaine.** Gérardo compose lui-même :
   modèles de tournée (`/templates`), ajout manuel de magasins, « vider la semaine »
   par commercial. `repartirSemaine` a été supprimé de `lib/domain/planning.ts`,
   qui ne garde que `distanceKm()` et `ordonnerParProximite()`.

### Le parc réel — chaîne de production des données

Le fichier source est l'Excel de Gérardo `Visites_Inter_Delhaize_31.xlsx`
(**185 lignes**). Il ne contient **ni adresse ni GPS** — seulement un libellé par
magasin. Trois lignes sont des doublons (voir plus bas), donc **182 points de
vente réels** : 95 Intermarché, 80 AD Delhaize, 5 Proxy, 1 Delhaize, 1 Spar.

**Livré :** [supabase/manual/magasins-reels.csv](supabase/manual/magasins-reels.csv),
importable tel quel via Magasins → Importer un CSV.

| | |
|---|---|
| Lignes Excel → magasins | 185 → **182** (3 doublons écartés) |
| Commune + code postal | **182/182** |
| Adresse | **180/182**, retrouvées une par une, chacune avec sa source |
| dont vérifiées sans ambiguïté | 142 |
| dont `aVerifier` (deux adresses circulent, ou deux magasins portent le nom) | 38 |
| Coordonnées GPS | **0/182** — voir ci-dessous |

**Chaîne de production :**

```
scripts/magasins-source.mjs         TOUTE l'interprétation du fichier source :
                                    commune, enseigne, nom, doublons, référence
scripts/adresses-magasins.json      table cumulative : libellé Excel → adresse + source
scripts/magasins-csv.mjs            lecture/écriture du CSV + rapport de fin
scripts/extraire-magasins-excel.mjs conversion Excel → CSV (exige le .xlsx)
scripts/completer-magasins-csv.mjs  remet le CSV à jour SANS le .xlsx
supabase/manual/magasins-reels.csv  le résultat, à importer
```

Les deux scripts appellent la même `construireMagasins()` : ils produisent le même
fichier. Corriger une commune ou une enseigne dans `magasins-source.mjs` la corrige
dans les deux chemins.

**L'Excel n'est pas dans le dépôt.** Après avoir complété le JSON ou corrigé une
table, la commande à lancer est donc celle-ci — elle relit le CSV existant, réécrit
les colonnes dérivées (nom, enseigne, réseau, adresse, commune, référence) et
conserve tout ce qui a pu être saisi à la main (téléphone, contact, CA, GPS) :

```bash
node scripts/completer-magasins-csv.mjs
```

L'autre chemin sert uniquement quand on repart du fichier source :

```bash
node scripts/extraire-magasins-excel.mjs <fichier.xlsx> supabase/manual/magasins-reels.csv
```

**Pourquoi pas de GPS** : Overpass, Nominatim, `stores.delhaize.be` et `intermarche.be`
renvoient tous 403 depuis cet environnement. La recherche web ne donne que les
coordonnées de la **commune**, qui enverraient le commercial sur la grand-place au lieu
du magasin et fausseraient « Ranger par trajet ». La colonne est donc laissée vide
délibérément. Ce n'est pas bloquant : `lienItineraire` bascule sur l'adresse postale,
donc le bouton Google Maps fonctionne sans coordonnées.

**2 adresses restent introuvables**, toutes deux parce que la commune compte
plusieurs magasins et que le libellé Excel ne dit pas lequel. Ce n'est plus un
travail de recherche : il faut la réponse de Gérardo (voir plus bas).

```
AD DELHAIZE WATERLOO   Bd Henri Rolin 7  OU  « AD Delhaize World Be », Drève de l'Infante
AD DELHAIZE WAVRE      « AD Delhaize Copies », Rue de Bruxelles 19  OU  AD Limal, Av. de la Gare 13-14
```

### Corrections appliquées au fichier de Gérardo — à lui annoncer, pas à lui demander

Chacune est déclarée dans une table nommée de `magasins-source.mjs` et rapportée à
l'écran par les deux scripts. Aucune n'est silencieuse, toutes se défont en retirant
une ligne de la table.

**A. Trois doublons écartés — 185 lignes → 182 magasins.** (`DOUBLONS`)
L'écran d'import ne déduplique pas : chaque ligne devient un magasin. Un magasin
fantôme n'est jamais visité, donc sa dette monte indéfiniment et il trône en tête
des priorités — exactement ce que le produit est censé empêcher.

| Ligne écartée | Ligne conservée | Pourquoi |
|---|---|---|
| `AD HANKAR` | `AD DELHAIZE HANKAR` | Même magasin, Clos Lucien Outers 1 à Auderghem |
| `AD DELHAIZE MONS` | `AD DELHAIZE NIMY - VAMODIS` | Même magasin, Rue de Nimy 117-121. On garde « NIMY » : sa commune est la bonne (Nimy 7020), celle de « MONS » ne l'est pas |
| `AD WAREGEM` (2ᵉ) | `AD WAREGEM` (1ʳᵉ) | Ligne répétée à l'identique |

**B. Sept enseignes corrigées.** (`ENSEIGNES_CORRIGEES`)
L'adresse était sûre ; c'est l'étiquette qui clochait, et elle décide de `reseau`
(`affilie` / `integre`) donc du filtre à l'écran.

| Libellé Excel | Enseigne annoncée | Enseigne réelle | Adresse |
|---|---|---|---|
| `AD DELHAIZE FERRIERES` | AD | **Proxy** Delhaize | Rue du Pré du Fa 6A |
| `PROXY HOEILLART` | Proxy | **AD** Delhaize | Albert Biesmanslaan 1a |
| `DELHAIZE VISE` | Delhaize | **AD** Delhaize | Rue de Dalhem 15 |
| `DELHAIZE AARDOIE` | Delhaize | **AD** Delhaize | Watervalstraat 22A |
| `DELHAIZE ZELE` | Delhaize | **AD** Delhaize | Lokerenbaan 20 |
| `DELHAIZE TORHOUT` | Delhaize | **AD** Delhaize | Karel de Goedelaan 8 |
| `DELHAIZE AARTSELAAR` | Delhaize | **AD** Delhaize | Baron van Ertbornstraat 30 |

⚠️ Conséquence à annoncer : il ne reste **qu'un seul « Delhaize » intégré** dans le
parc. Si Gérardo cherche ses six Delhaize à l'écran, il les trouvera en AD Delhaize.

### Questions ouvertes pour Gérardo

⏸️ **Mises de côté par Vincent le 07/08/2026.** Ne pas les relancer sans qu'il le
demande ; les magasins concernés vivent très bien avec une case vide.

**1. Quel magasin, quand la commune en compte plusieurs ?** (bloquant : case laissée vide)

- `AD DELHAIZE WATERLOO` et `AD DELHAIZE WAVRE` — les deux candidats sont listés ci-dessus.

**2. Attributions déduites, pas vérifiées — à confirmer une par une.**

- `INTERMARCHE GOSSELIES` vs `INTERMARCHE GOSSELIES BY` : deux magasins réels
  (Chaussée de Courcelles 95 et Rue Pont-à-Migneloux 13). Lequel est lequel ?
- `INTERMARCHE LEUZE` : rattaché à Leuze-en-Hainaut (7900), mais un Intermarché
  nommé « Leuze » existe aussi à Éghezée.
- `AD DELHAIZE OTTIGNIES` → Centre Commercial du Douaire 1. Quatre Delhaize dans la
  commune (Douaire, Esplanade LLN, Shop & Go Bd Baudouin 1er).
- `AD DELHAIZE TOURNAI` → Bd Walter de Marvis 22 (« Delhaize Les Bastions »), seul
  supermarché Delhaize de la ville hors Shop & Go.
- `AD DELHAIZE WAASLAND` → Kapelstraat 100 (Waasland Shopping Center). Autre candidat :
  « AD Ten Bos », Nieuwkerkenstraat 24A à Nieuwkerken-Waas.
- `AD DELHAIZE SCHOTEN` → Theofiel Van Cauwenberghslei 90 : seul Delhaize de Schoten,
  mais aucune source ne l'écrit « AD ».
- `PROXY WOLUWE ST LAMBERT` → Clos des Peupliers 72. **Cinq** Proxy dans la commune
  (Marcel Thiry 194, Roi Chevalier 53, Georges Henri 481, Chaussée de Stockel 306).
- `PROXY SCHAERBEEK` → Chaussée d'Haecht 224. Deux autres Proxy à Schaerbeek
  (Henri Jacobs 34, Émile Verhaeren 84).
- `AD WANZE` → Chaussée de Wavre : pubeco écrit le n° 57, mappy le n° 55.
- `AD DELHAIZE ANTOING` : rue connue (Rue du Burg), numéro introuvable.

**3. Corrections de commune appliquées, à valider.**

- `INTERMARCHE ORCQ` → **7501** (et non 7503, qui est Froyennes).
- `AD DELHAIZE FRASNES LEZ GOSSELIES` → **6210** (et non 6250, qui est Aiseau-Presles).
  ⚠️ Ces deux-là étaient annoncées faites dans une session précédente mais ne
  l'étaient pas dans le code. Elles le sont maintenant.
- `AD DELHAIZE PRINCE DE LIEGE` → **Molenbeek-Saint-Jean 1080**, Chaussée de Ninove 1024.
  Le boulevard Prince de Liège est bien à Anderlecht, mais le magasin qui en porte le
  nom n'y est pas.
- `AD CROIX DE GUERRE` → **Neder-Over-Heembeek 1120** (et non Laeken 1020).
- `AD WAREGEM` → **Sint-Eloois-Vijve 8793** (et non 8790) : le magasin est Gentseweg 602.
- `INTERMARCHE ST LAMBERT BY` est aux **Galeries Saint-Lambert à Liège** (4000), pas à
  Woluwe-Saint-Lambert.
- `AD DELHAIZE AARTSELAAR` a **déménagé** de la Kapellestraat vers Baron van
  Ertbornstraat 30. Si Gérardo a l'ancienne adresse en tête, c'est normal.

### L'import est FAIT — ne plus jamais réimporter

Le fichier de 185 lignes a été importé le 06/08/2026, et les magasins fictifs du seed
ont été désactivés ([remplacer-magasins-fictifs.sql](supabase/manual/remplacer-magasins-fictifs.sql)).

**`stores.external_ref` est UNIQUE : réimporter est donc impossible**, et le forcer
créerait 182 doublons. Le parc se met à jour par SQL, jamais par l'écran d'import :

```bash
node scripts/generer-maj-magasins.mjs   # → supabase/manual/mettre-a-jour-magasins.sql
```

Ce script ne produit que les lignes qui CHANGENT (il compare le CSV courant au CSV tel
qu'importé, relu depuis git au commit `011b7e1`). Il joint sur la référence figée, il
est transactionnel et idempotent.

⚠️ **Piège à connaître** : désactiver un magasin (`active = false`) **ne libère pas sa
référence**. L'écran paraît vide, l'index unique non — c'est ce qui a fait échouer un
import avec un « Import impossible. » sans cause. Le diagnostic est dans
[diagnostic-import.sql](supabase/manual/diagnostic-import.sql).

**État en base au 07/08/2026** : 185 références, **183 magasins actifs**. Les 2 inactifs
n'ont pas été identifiés — la seconde requête de `mettre-a-jour-magasins.sql` les nomme,
Vincent n'a pas encore renvoyé le résultat.

### Pièges déjà payés — ne pas les repayer

- **Ne jamais remplacer une classe Tailwind par un style inline sans reprendre sa
  définition exacte.** `grid-cols-5` vaut `repeat(5, minmax(0, 1fr))` ; écrire
  `repeat(5, 1fr)` vaut `minmax(auto, 1fr)`, les colonnes ne rétrécissent plus et la
  page part en défilement latéral sur téléphone.
- **`@media print` : cibler la navigation par un attribut (`[data-chrome]`), jamais
  par `header, nav`.** Le sélecteur d'élément emportait aussi le `<header>` interne de
  la feuille de route — imprimée sans nom dessus, donc inutilisable.
- **`capitalize` de Tailwind met une majuscule à CHAQUE mot** (« Absent Ou Jour
  Férié »). Pour une seule initiale : `::first-letter`.
- **Postgres interdit d'utiliser une valeur d'enum dans la transaction qui la crée.**
  Comparer en `::text` (`visit_type::text = 'depannage'`), sinon le script collé d'un
  bloc échoue — et c'est la seule façon dont Vincent exécute du SQL.
- **Une erreur Supabase porte `code`, `details` et `hint`, pas seulement `message`** ;
  c'est souvent `hint` qui contient la correction. `lib/data/erreurs.ts` les remet à
  l'écran.
- **Un défaut d'affichage se MESURE** : `document.documentElement.scrollWidth` contre
  `clientWidth` à 360 / 390 / 412 px. Un build vert ne prouve rien sur une mise en page.

### Comment vérifier une migration sans base de test

Vincent n'a pas de terminal : une migration fausse se découvrirait dans le SQL Editor,
en production. Les 17 migrations sont rejouables sur un Postgres nu — il suffit d'un
préambule créant les rôles (`anon`, `authenticated`, `service_role`) et les schémas
`auth`, `storage`, `supabase_migrations`, plus `auth.uid()`. C'est ce qui a permis
d'attraper, avant livraison, un trigger qui laissait un `full_name` périmé et une
reprise de données qui ressuscitait un prénom volontairement effacé.

⚠️ `supabase gen types` **exige Docker**, absent de cet environnement, même avec
`--db-url`. Les types de `00015`, `00016` et `00017` ont donc été écrits à la main,
contre la règle du projet. À régénérer à la première occasion.

### Pistes analysées, non engagées (07/08/2026)

Analyse demandée par Vincent sur la collecte de chiffres. Constat : **aucun chiffre ne
remonte du terrain** — le seul nombre du modèle est le CA annuel saisi par Vincent. Les
~20 vues existantes mesurent l'activité des commerciaux, jamais l'état des linéaires.

Par ordre de rapport valeur/effort :

1. **Durée réelle des visites** — `checkin_at` et `checkout_at` sont déjà écrits mais
   ne servent qu'à dater la dernière visite. La capacité repose sur un `duration_min`
   figé à 45 min théoriques, jamais confronté au réel. Une vue suffit.
2. **Historique du CA** — `jrf_revenue_eur` + `jrf_revenue_year` ne stockent QU'UN
   exercice : saisir 2026 écrase 2025. Or le tier A/B/C en dérive. Une table
   `store_revenues (magasin, année, montant)` corrige la faille.
3. **Linéaire par visite** (facings ou mètres) — le chiffre du métier, absent.
4. **Catalogue produits** — il n'existe AUCUNE table produit. C'est le verrou : les
   ruptures sont en texte libre, donc incomptables.
5. Fiabilité livraison (les incidents sont déjà typés et datés), relevé de prix,
   objectifs par commercial.

❌ **Écarté délibérément** : exploiter la géolocalisation du check-in pour vérifier
qu'une visite a bien eu lieu sur place. Techniquement faisable, juridiquement une
surveillance de travailleur (CCT n°81), et la géoloc a été annoncée comme ponctuelle et
facultative. La détourner détruirait la confiance de l'équipe pour un gain nul.

### Vérifications avant de dire « c'est fait »

```bash
npm run build && npm run lint     # nécessaire, jamais suffisant
```

Un build qui passe ne prouve pas qu'une mise en page tient. La barre de navigation a
été livrée cassée sur téléphone parce qu'un `flex` sans direction avait été relu trop
vite ; le planning a été livré en débordement latéral parce qu'un `1fr` avait remplacé
un `minmax(0,1fr)`. Les deux fois, le build était vert.

Selon ce qui est touché :

| Ce qui change | Ce qui le prouve |
|---|---|
| Une mise en page | Capture Playwright à 360 px + `scrollWidth` vs `clientWidth` |
| Une impression | Capture en média `print`, et compter les pages du PDF |
| Une migration | La rejouer sur un Postgres local, données en place, puis DEUX fois |
| Une policy RLS | Se faire passer pour un non-admin et vérifier que l'écriture touche 0 ligne |
| Un script SQL pour Vincent | Le rejouer **en une seule transaction** (le SQL Editor colle tout d'un bloc) |

Chromium est préinstallé (`/opt/pw-browsers/chromium`). Le serveur de test doit être
démarré et mesuré **dans le même appel** : un serveur lancé en tâche de fond ne survit
pas à la fin de la commande, et un ancien serveur resté sur le port 3000 sert
l'ancien build — ça a déjà invalidé une vérification.
