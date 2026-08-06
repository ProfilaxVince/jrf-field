-- ============================================================
-- METTRE À JOUR LES MAGASINS DÉJÀ EN BASE
-- Généré par scripts/generer-maj-magasins.mjs — ne pas éditer à la main.
--
-- À coller d'un seul bloc dans le SQL Editor de Supabase.
-- Transactionnel et idempotent : le relancer ne change rien de plus.
-- Aucune suppression physique — les doublons passent en active = false.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Les 39 magasins dont une information a changé depuis l'import
--    (adresse retrouvée, commune corrigée, enseigne rétablie).
--    Les 143 autres sont déjà justes en base : rien à écrire.
-- ------------------------------------------------------------
update stores as s
   set name = v.nom, address = v.adresse, postal_code = v.code_postal,
       city = v.ville, region = v.region, enseigne = v.enseigne,
       network = v.network, updated_at = now()
  from (values
    ('ITM-076', 'Intermarché Orcq', 'Chaussée de Lille 433', '7501', 'Orcq', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ADD-024', 'AD Delhaize Frasnes Lez Gosselies', 'Chaussée de Bruxelles 527', '6210', 'Frasnes-lez-Gosselies', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-040', 'AD Delhaize Louvain La Neuve', 'Place de l''Accueil 10', '1348', 'Louvain-la-Neuve', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-049', 'AD Delhaize Ottignies', 'Centre Commercial du Douaire 1', '1340', 'Ottignies', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-050', 'AD Delhaize Oudenaarde', 'Nederenamestraat 122', '9700', 'Audenarde', 'flandre'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-051', 'AD Delhaize Prince De Liege', 'Chaussée de Ninove 1024', '1080', 'Molenbeek-Saint-Jean', 'bruxelles'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-052', 'AD Delhaize Roodebeek', 'Chaussée de Roodebeek 199', '1200', 'Woluwe-Saint-Lambert', 'bruxelles'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-053', 'AD Delhaize Schoten', 'Theofiel Van Cauwenberghslei 90', '2900', 'Schoten', 'flandre'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-054', 'AD Delhaize Seraing', 'Rue des Bas-Sarts 212', '4100', 'Seraing', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-055', 'AD Delhaize Tournai', 'Boulevard Walter de Marvis 22', '7500', 'Tournai', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-056', 'AD Delhaize Tubize', 'Rue de la Déportation 61', '1480', 'Tubize', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-057', 'AD Delhaize Uccle Defre', 'Avenue De Fré 94', '1180', 'Uccle', 'bruxelles'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-058', 'AD Delhaize Virton', 'Rue d''Arlon 59', '6760', 'Virton', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-059', 'AD Delhaize Waasland', 'Kapelstraat 100', '9100', 'Sint-Niklaas', 'flandre'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-062', 'AD Delhaize Wilrijk', 'Boomsesteenweg 176', '2610', 'Wilrijk', 'flandre'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-063', 'AD Delhaize Wondelgem -', 'Botestraat 14', '9032', 'Wondelgem', 'flandre'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-064', 'AD Delhaize Zedelgem', 'Torhoutsesteenweg 136', '8210', 'Zedelgem', 'flandre'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-065', 'AD Delhaize Evere', 'Rue du Bon Pasteur 59', '1140', 'Evere', 'bruxelles'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-066', 'Proxy Delhaize Ferrieres', 'Rue du Pré du Fa 6A', '4190', 'Ferrières', 'wallonie'::region_type, 'proxy_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-067', 'AD Delhaize Waregem', 'Gentseweg 602', '8793', 'Sint-Eloois-Vijve', 'flandre'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-068', 'AD Delhaize Zwijnaarde', 'Oudenaardsesteenweg 80', '9052', 'Zwijnaarde', 'flandre'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-069', 'AD Delhaize Jodoigne', 'Chaussée de Wavre 90c', '1370', 'Jodoigne', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-071', 'AD Delhaize Belgrade', 'Chemin de la Plaine 6', '5001', 'Namur', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('PXY-001', 'Proxy Delhaize Beerzel', 'Koningsbaan 37', '2580', 'Beerzel', 'flandre'::region_type, 'proxy_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-072', 'AD Delhaize Recogne', 'Rue du Flosse 6', '6800', 'Recogne', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-073', 'AD Delhaize Wanze', 'Chaussée de Wavre 57', '4520', 'Wanze', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-074', 'AD Delhaize Fort Jaco', 'Chaussée de Waterloo 1363', '1180', 'Uccle', 'bruxelles'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-075', 'AD Delhaize Genval', 'Avenue Albert Ier 13', '1332', 'Genval', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-076', 'AD Delhaize Croix De Guerre', 'Rue de Heembeek 125', '1120', 'Neder-Over-Heembeek', 'bruxelles'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-077', 'AD Delhaize La Louviere', 'Rue Kéramis 28', '7100', 'La Louvière', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('PXY-002', 'AD Delhaize Hoeilaart', 'Albert Biesmanslaan 1a', '1560', 'Hoeilaart', 'flandre'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('PXY-003', 'Proxy Delhaize Woluwe St Lambert', 'Clos des Peupliers 72', '1200', 'Woluwe-Saint-Lambert', 'bruxelles'::region_type, 'proxy_delhaize'::enseigne, 'affilie'::network_type),
    ('PXY-004', 'Proxy Delhaize Schaerbeek', 'Chaussée d''Haecht 224', '1030', 'Schaerbeek', 'bruxelles'::region_type, 'proxy_delhaize'::enseigne, 'affilie'::network_type),
    ('PXY-005', 'Proxy Delhaize Rhisnes', 'Rue de Gembloux 670', '5080', 'Rhisnes', 'wallonie'::region_type, 'proxy_delhaize'::enseigne, 'affilie'::network_type),
    ('DEL-002', 'AD Delhaize Vise', 'Rue de Dalhem 15', '4600', 'Visé', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('DEL-003', 'AD Delhaize Ardooie', 'Watervalstraat 22A', '8850', 'Ardooie', 'flandre'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('DEL-004', 'AD Delhaize Zele', 'Lokerenbaan 20', '9240', 'Zele', 'flandre'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('DEL-005', 'AD Delhaize Torhout', 'Karel de Goedelaan 8', '8820', 'Torhout', 'flandre'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('DEL-006', 'AD Delhaize Aartselaar', 'Baron van Ertbornstraat 30', '2630', 'Aartselaar', 'flandre'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type)
  ) as v (reference, nom, adresse, code_postal, ville, region, enseigne, network)
 where s.external_ref = v.reference
   and (s.name is distinct from v.nom or s.address is distinct from v.adresse
     or s.postal_code is distinct from v.code_postal or s.city is distinct from v.ville
     or s.region is distinct from v.region or s.enseigne is distinct from v.enseigne
     or s.network is distinct from v.network);

-- ------------------------------------------------------------
-- 2. Les trois doublons du fichier source : deux lignes, un seul magasin.
--    Le second exemplaire n'est jamais visité, donc sa dette monte
--    indéfiniment et il finit en tête des priorités — ce que le produit
--    est précisément censé empêcher.
--   ADD-044  AD DELHAIZE MONS — même magasin que « AD DELHAIZE NIMY - VAMODIS »
--   ADD-070  AD WAREGEM — ligne répétée à l'identique dans le fichier source
--   ADD-078  AD HANKAR — même magasin que « AD DELHAIZE HANKAR »
-- ------------------------------------------------------------
update visits
   set active = false, motif_annulation = 'doublon du fichier source retiré'
 where active
   and store_id in (select id from stores where external_ref in ('ADD-044', 'ADD-070', 'ADD-078'));

delete from routing_template_stops
 where store_id in (select id from stores where external_ref in ('ADD-044', 'ADD-070', 'ADD-078'));

-- La référence est libérée pour ne pas bloquer un futur import.
update stores
   set active = false, name = name || ' (doublon retiré)',
       external_ref = null, updated_at = now()
 where active and external_ref in ('ADD-044', 'ADD-070', 'ADD-078');

commit;

-- ============================================================
-- VÉRIFICATION — attendu : sans_adresse = 2 (Waterloo et Wavre, en attente
-- de Gérardo), intermarche = 95, ad_delhaize = 80, proxy = 5,
-- delhaize_integres = 1, spar = 1.
-- ============================================================
select
  count(*) filter (where active)                                  as magasins_actifs,
  count(*) filter (where active and address is null)              as sans_adresse,
  count(*) filter (where not active and external_ref is not null) as desactives_hors_doublons,
  count(*) filter (where active and enseigne = 'intermarche')     as intermarche,
  count(*) filter (where active and enseigne = 'ad_delhaize')     as ad_delhaize,
  count(*) filter (where active and enseigne = 'proxy_delhaize')  as proxy,
  count(*) filter (where active and enseigne = 'delhaize')        as delhaize_integres,
  count(*) filter (where active and enseigne = 'spar')            as spar
from stores;

-- Désactivés sans être des doublons ? (0 ligne = tout va bien)
select external_ref, name, city from stores
where not active and external_ref is not null order by external_ref;
