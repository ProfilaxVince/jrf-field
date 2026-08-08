-- ============================================================
-- Diagnostic — l'écran « Les chiffres » ne charge plus (08/08/2026)
--
-- L'écran lit SEPT vues d'un coup. Une seule en défaut suffisait à vider les
-- sept blocs, et l'écran affichait « 0 magasin suivi » : un chiffre faux, pas
-- un chiffre manquant. Le message « Vérifie ta connexion » était une hypothèse
-- déguisée en diagnostic — il pouvait aussi bien s'agir d'une vue absente,
-- d'un droit manquant ou d'une requête trop lente.
--
-- Ce script interroge les sept vues une par une et dit, pour chacune :
--   · si elle répond ou avec quelle erreur,
--   · combien de lignes elle renvoie,
--   · en combien de millisecondes (au-delà de ~8 000, PostgREST abandonne).
--
-- Il ne modifie RIEN. À coller d'un bloc dans le SQL Editor.
-- ============================================================

do $$
declare
  v text;
  n bigint;
  t0 timestamptz;
  ms numeric;
begin
  -- ⚠️ Surtout PAS `on commit drop` : selon que l'éditeur enveloppe ou non le
  -- script dans une transaction, la table disparaîtrait avant le `select` qui
  -- l'affiche. Elle est donc conservée, et vidée à chaque exécution.
  create temp table if not exists diag_chiffres(
    vue text, lignes bigint, millisecondes numeric, erreur text
  );
  delete from diag_chiffres;

  foreach v in array array[
    'v_stats_parc',
    'v_couverture_mensuelle',
    'v_stats_effort_par_tier',
    'v_frequence_reelle_magasin',
    'v_suivi_montage_mois',
    'v_rotation_montage',
    'v_store_revenue_evolution'
  ] loop
    begin
      t0 := clock_timestamp();
      execute format('select count(*) from %I', v) into n;
      ms := round(extract(epoch from clock_timestamp() - t0) * 1000);
      insert into diag_chiffres values (v, n, ms, null);
    exception when others then
      insert into diag_chiffres values (v, null, null, sqlstate || ' — ' || sqlerrm);
    end;
  end loop;
end $$;

select * from diag_chiffres order by millisecondes desc nulls first;

-- ------------------------------------------------------------
-- Les droits de lecture. Une vue recréée qui aurait perdu `anon` /
-- `authenticated` répondrait « relation inconnue » côté application, alors
-- qu'elle marche parfaitement dans cet éditeur — qui, lui, est `postgres`.
-- ------------------------------------------------------------
select c.relname as vue,
       coalesce(string_agg(a.grantee, ', ' order by a.grantee), '(AUCUN)') as peut_lire
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join information_schema.role_table_grants a
       on a.table_name = c.relname
      and a.table_schema = 'public'
      and a.privilege_type = 'SELECT'
      and a.grantee in ('anon', 'authenticated')
where n.nspname = 'public'
  and c.relkind = 'v'
  and c.relname in (
    'v_stats_parc', 'v_couverture_mensuelle', 'v_stats_effort_par_tier',
    'v_frequence_reelle_magasin', 'v_suivi_montage_mois', 'v_rotation_montage',
    'v_store_revenue_evolution', 'v_store_dette', 'v_store_last_visit'
  )
group by c.relname
order by c.relname;

-- ------------------------------------------------------------
-- v_rotation_montage est lue avec `maybeSingle()` : elle DOIT renvoyer
-- 0 ou 1 ligne. À 2 lignes ou plus, l'application lève une erreur.
-- ------------------------------------------------------------
select count(*) as lignes_rotation_montage,
       case when count(*) > 1 then 'PROBLÈME — maybeSingle() va échouer'
            else 'OK' end as verdict
from v_rotation_montage;
