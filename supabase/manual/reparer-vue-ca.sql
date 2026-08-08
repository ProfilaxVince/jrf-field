-- ============================================================
-- Réparation — « Could not find the table 'public.v_store_revenue_evolution'
-- in the schema cache » (PGRST205), écran Les chiffres, 08/08/2026
--
-- PGRST205 a deux causes possibles, et ce script traite les deux :
--
--   1. La vue n'existe pas. `00018` est long, et le SQL Editor n'exécute que
--      le texte SÉLECTIONNÉ — c'est exactement ce qui avait fait échouer
--      `00015` avec « column first_name does not exist ». Une partie du script
--      a pu ne jamais partir.
--
--   2. La vue existe, mais PostgREST garde en mémoire une photo du schéma
--      prise avant sa création. Elle est alors parfaitement interrogeable
--      dans cet éditeur et introuvable depuis l'application.
--
-- Le script est idempotent : s'il n'y avait rien à réparer, il ne change rien.
-- À coller d'un bloc dans le SQL Editor.
-- ============================================================

-- ------------------------------------------------------------
-- 1. État des lieux AVANT. Si `store_revenues` manque, ce n'est pas la vue
--    qu'il faut recréer mais TOUTE la migration 00018 (00018-historique-ca.sql).
-- ------------------------------------------------------------
select
  to_regclass('public.store_revenues')            is not null as table_ca_existe,
  to_regclass('public.v_store_revenue_evolution') is not null as vue_existe,
  (select count(*) from supabase_migrations.schema_migrations
    where version = '00018')                                  as migration_00018_inscrite;

-- ------------------------------------------------------------
-- 2. La vue, recréée à l'identique de `00018`. Sans effet si elle est déjà là.
--    Bloc conditionnel : sans la table, `create view` échouerait et ferait
--    tomber tout le script — or on veut que le diagnostic du point 1 s'affiche.
-- ------------------------------------------------------------
do $$
begin
  if to_regclass('public.store_revenues') is null then
    raise notice 'store_revenues est ABSENTE : rejoue 00018-historique-ca.sql en entier.';
    return;
  end if;

  create or replace view v_store_revenue_evolution as
  select
    r.store_id,
    s.name                                   as magasin,
    s.city                                   as ville,
    s.enseigne,
    r.year                                   as exercice,
    r.amount_eur                             as montant,
    lag(r.year)       over w                 as exercice_precedent,
    lag(r.amount_eur) over w                 as montant_precedent,
    r.amount_eur - lag(r.amount_eur) over w  as ecart_eur,
    round(
      100.0 * (r.amount_eur - lag(r.amount_eur) over w)
      / nullif(lag(r.amount_eur) over w, 0), 1
    )                                        as ecart_pct
  from store_revenues r
  join stores s on s.id = r.store_id
  where s.active
  window w as (partition by r.store_id order by r.year);

  comment on view v_store_revenue_evolution is
    'Un exercice par ligne, avec l''écart au précédent exercice CONNU du magasin.';
end $$;

-- ------------------------------------------------------------
-- 3. Forcer PostgREST à relire le schéma.
--    C'est CE qui corrige le cas 2 — et rien d'autre ne le corrige.
-- ------------------------------------------------------------
notify pgrst, 'reload schema';

-- ------------------------------------------------------------
-- 4. Vérification : la vue répond-elle ? Zéro ligne est un résultat VALIDE
--    (aucun CA saisi sur deux exercices), pas un échec.
--
--    ⚠️ Les comptages sont DYNAMIQUES. Écrits en dur, `select count(*) from
--    store_revenues` échouerait à l'analyse quand la table est absente — et
--    ferait tomber la transaction entière, donc le diagnostic du point 1 avec
--    elle. Le script doit rester lisible même quand tout manque.
-- ------------------------------------------------------------
do $$
declare
  lignes bigint;
  exercices bigint;
  magasins bigint;
begin
  create temp table if not exists rapport_ca(mesure text, valeur text);
  delete from rapport_ca;

  if to_regclass('public.store_revenues') is null then
    insert into rapport_ca values
      ('etat', 'store_revenues ABSENTE — rejoue 00018-historique-ca.sql en entier');
    return;
  end if;

  execute 'select count(*) from v_store_revenue_evolution' into lignes;
  execute 'select count(*) from store_revenues' into exercices;
  execute 'select count(distinct store_id) from store_revenues' into magasins;

  insert into rapport_ca values
    ('vue_existe_maintenant',
      (to_regclass('public.v_store_revenue_evolution') is not null)::text),
    ('lignes_dans_la_vue', lignes::text),
    ('exercices_de_CA_saisis', exercices::text),
    ('magasins_avec_un_CA', magasins::text);
end $$;

select * from rapport_ca;
