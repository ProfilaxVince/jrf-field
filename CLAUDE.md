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
