-- ============================================================
-- METTRE À JOUR LES MAGASINS DÉJÀ EN BASE
--
-- Généré par scripts/generer-maj-magasins.mjs — ne pas éditer à la main.
-- À coller dans le SQL Editor de Supabase, d'un seul bloc.
--
-- Pourquoi ceci et pas un import : les 185 lignes ont été importées le
-- 06/08/2026. `stores.external_ref` est UNIQUE, donc réimporter est
-- impossible. Ce script écrit les adresses retrouvées depuis, les communes
-- corrigées et les enseignes rétablies, sur les lignes existantes.
--
-- Il est idempotent : le relancer ne change rien de plus.
-- Aucune suppression physique : les doublons passent en `active = false`.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Les 182 magasins réels : adresse, commune, enseigne, réseau, nom.
--    La jointure se fait sur external_ref, figée dans
--    scripts/references-magasins.json.
-- ------------------------------------------------------------
update stores as s
   set name         = v.nom,
       address      = v.adresse,
       postal_code  = v.code_postal,
       city         = v.ville,
       region       = v.region,
       enseigne     = v.enseigne,
       network      = v.network,
       updated_at   = now()
  from (values
    ('ITM-001', 'Intermarché Anderlecht', 'Boulevard Industriel 41', '1070', 'Anderlecht', 'bruxelles'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-002', 'Intermarché Ans', 'Rue des Français 155', '4430', 'Ans', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-003', 'Intermarché Braine-Le-Comte', 'Rue des Digues 60', '7090', 'Braine-le-Comte', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-004', 'Intermarché Cerfontaine', 'Rue de la Gare 22', '5630', 'Cerfontaine', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-005', 'Intermarché Chapelle-Lez-Herlaimont', 'Rue de la Hestre 93', '7160', 'Chapelle-lez-Herlaimont', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-006', 'Intermarché Andenne', 'Avenue de Belle Mine 7', '5300', 'Andenne', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-007', 'Intermarché Chatelet', 'Rue de la Station 55', '6200', 'Châtelet', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-008', 'Intermarché Chatelineau', 'Rue Jules des Essarts 2', '6200', 'Châtelineau', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-009', 'Intermarché Chaumont', 'Chaussée de Huy 175', '1325', 'Chaumont-Gistoux', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-010', 'Intermarché Chievres', 'Rue du Septième Wing 2', '7950', 'Chièvres', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-011', 'Intermarché Corbais', 'Rue Haute 1', '1435', 'Corbais', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-012', 'Intermarché Couillet', 'Route de Philippeville 319', '6010', 'Couillet', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-013', 'Intermarché Floriffoux', 'Rue Emerée 4', '5150', 'Floriffoux', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-014', 'Intermarché Fontaine L''Eveque', 'Rue de Mons 54', '6140', 'Fontaine-l''Évêque', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-015', 'Intermarché Forest', 'Chaussée d''Alsemberg 303', '1190', 'Forest', 'bruxelles'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-016', 'Intermarché Genappe', 'Rue Louis Lalieux 22', '1470', 'Genappe', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-017', 'Intermarché Gerpinnes', 'Chaussée de Philippeville 196', '6280', 'Gerpinnes', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-018', 'Intermarché Ghislenghien', 'Chaussée de Bruxelles 458', '7822', 'Ghislenghien', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-019', 'Intermarché Gilly Velodrome', 'Rue des Vallées 7A', '6060', 'Gilly', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-020', 'Intermarché Gosselies', 'Rue Pont-à-Migneloux 13', '6041', 'Gosselies', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-021', 'Intermarché Gozee', 'Rue de Marchienne 204', '6534', 'Gozée', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-022', 'Intermarché Hamme-Mille', 'Rue des Épinoches 5', '1320', 'Hamme-Mille', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-023', 'Intermarché Jambes', 'Rue du Major Mascaux 20', '5100', 'Jambes', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-024', 'Intermarché Jodoigne', 'Avenue des Commandants Borlée 16', '1370', 'Jodoigne', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-025', 'Intermarché Jumet', 'Rue Louis Biernaux 98', '6040', 'Jumet', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-026', 'Intermarché St Lambert', 'Place Saint-Lambert 9', '4000', 'Liège', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-027', 'Intermarché -Humblet', 'Rue de la Cathédrale 63-67', '4000', 'Liège', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-028', 'Intermarché Luttre', 'Rue du Pont Neuf 6a', '6238', 'Luttre', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-029', 'Intermarché Marcinelle', 'Avenue Eugène Mascaux 869', '6001', 'Marcinelle', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-030', 'Intermarché Monceau', 'Rue du Calvaire 141', '6031', 'Monceau-sur-Sambre', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-031', 'Intermarché Montignies -Sur-Sambre', 'Avenue du Centenaire 56', '6061', 'Montignies-sur-Sambre', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-032', 'Intermarché Naninne', 'Chaussée de Marche 860', '5100', 'Naninne', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-033', 'Intermarché Nivelles', 'Rue Tienne-à-Deux-Vallées 6', '1400', 'Nivelles', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-034', 'Intermarché Ottignies', 'Avenue Provinciale 127', '1340', 'Ottignies', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-035', 'Intermarché Philippeville', 'Rue de France 39', '5600', 'Philippeville', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-036', 'Intermarché Rixensart', 'Avenue John Fitzgerald Kennedy 2', '1330', 'Rixensart', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-037', 'Intermarché Roux', 'Rue Edmond Foulon 21', '6044', 'Roux', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-038', 'Intermarché Schaerbeek', 'Rue de Jérusalem 60', '1030', 'Schaerbeek', 'bruxelles'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-039', 'Intermarché Soignies', 'Rue du Nouveau Monde 17', '7060', 'Soignies', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-040', 'Intermarché Tilff', 'Avenue des Ardennes 8', '4130', 'Tilff', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-041', 'Intermarché Trazegnies', 'Rue de Gosselies 76', '6183', 'Trazegnies', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-042', 'Intermarché Trooz', 'Grand''Rue 40', '4870', 'Trooz', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-043', 'Intermarché Wavre', 'Avenue des Princes 9', '1300', 'Wavre', 'wallonie'::region_type, 'intermarche'::enseigne, 'by_mestdagh'::network_type),
    ('ITM-044', 'Intermarché Anderlues', 'Rue Émile Vandervelde 16', '6150', 'Anderlues', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-045', 'Intermarché Anderlues 2 Capandere Sa', 'Chaussée de Mons 225', '6150', 'Anderlues', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-046', 'Intermarché Anhee/holebo Sa', 'Chaussée de Dinant 127', '5537', 'Anhée', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-047', 'Intermarché Anthee', 'Rue du Maréchal Franchet d''Esperey 2', '5520', 'Anthée', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-048', 'Intermarché Assesse', 'Rue Melville Wilson 3', '5330', 'Assesse', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-049', 'Intermarché Binche', 'Rue Zéphirin Fontaine 140', '7130', 'Binche', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-050', 'Intermarché Bois De Villers', 'Rue Biname Bajart 1', '5170', 'Bois-de-Villers', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-051', 'Intermarché Boussu', 'Rue des Chaufours 19', '7300', 'Boussu', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-052', 'Intermarché Court-Saint-Etienne', 'Place Baudouin 1er 12', '1490', 'Court-Saint-Étienne', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-053', 'Intermarché Fleurus', 'Chaussée de Charleroi 787', '6220', 'Fleurus', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-054', 'Intermarché Forchies', 'Rue Chaussée 229', '6141', 'Forchies-la-Marche', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-055', 'Intermarché Frameries', 'Route Nationale 29', '7080', 'Frameries', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-056', 'Intermarché Frasnes Lez Anvaing', 'Route dHacquegnies 53', '7910', 'Frasnes-lez-Anvaing', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-057', 'Intermarché Gedinne', 'Rue de Charleville 48', '5575', 'Gedinne', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-058', 'Intermarché Gilly', 'Rue du Moulin 2', '6060', 'Gilly', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-059', 'Intermarché Givry', 'Chaussée de Beaumont 71', '7041', 'Givry', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-060', 'Intermarché Gosselies', 'Chaussée de Courcelles 95', '6041', 'Gosselies', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-061', 'Intermarché Gozee', 'Rue de Bomerée 1', '6534', 'Gozée', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-062', 'Intermarché Helecine', 'Chaussée de Hannut 116', '1357', 'Hélécine', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-063', 'Intermarché Hermalle Sous Argenteau', 'Rue dArgenteau 13', '4681', 'Hermalle-sous-Argenteau', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-064', 'Intermarché Herstal', 'Rue Ernest Solvay 90', '4040', 'Herstal', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-065', 'Intermarché Lambusart', 'Rue du Wainage 236', '6220', 'Lambusart', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-066', 'Intermarché Hollain', 'Rue du Marais 5', '7620', 'Hollain', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-067', 'Intermarché Jurbise', 'Route dAth 177', '7050', 'Jurbise', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-068', 'Intermarché Leuze', 'Rue de lArtisanat 4', '7900', 'Leuze-en-Hainaut', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-069', 'Intermarché Liege Burenville', 'Avenue Olympe Gilbart 1c', '4000', 'Liège', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-070', 'Intermarché Limelette', 'Avenue Albert Ier 59', '1342', 'Limelette', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-071', 'Intermarché Mons', 'Chemin de la Procession 399', '7000', 'Mons', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-072', 'Intermarché Morlanwelz', 'Rue des Ateliers 122', '7140', 'Morlanwelz', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-073', 'Intermarché Mouscron', 'Avenue Wolfgang Amadeus Mozart 22', '7700', 'Mouscron', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-074', 'Intermarché Nessonvaux', 'Rue Franklin Roosevelt 249A', '4870', 'Nessonvaux', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-075', 'Intermarché Ohey', 'Rue de Ciney 14b', '5350', 'Ohey', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-076', 'Intermarché Orcq', 'Chaussée de Lille 433', '7501', 'Orcq', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-077', 'Intermarché Peruwelz Hainaut', 'Neuve Chaussée 86c', '7600', 'Péruwelz', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-078', 'Intermarché Perwez B-W', 'Chaussée de Charleroi 24a', '1360', 'Perwez', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-079', 'Intermarché Pont De Loup', 'Rue du Campinaire 66', '6250', 'Pont-de-Loup', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-080', 'Intermarché Quevaucamps -Quevim', 'Rue du Brugnon 88', '7972', 'Quevaucamps', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-081', 'Intermarché Ransart', 'Rue Charbonnel 100', '6043', 'Ransart', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-082', 'Intermarché Rebecq', 'Chaussée dEnghien 79', '1430', 'Rebecq', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-083', 'Intermarché Rhisnes', 'Rue aux Cailloux 34', '5080', 'Rhisnes', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-084', 'Intermarché Rumes', 'Chaussée de Douai 1bis', '7610', 'Rumes', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-085', 'Intermarché Sart Dames Aveline', 'Chaussée de Namur 113', '1495', 'Sart-Dames-Avelines', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-086', 'Intermarché Templeuve', 'Rue de Formanoir 89', '7520', 'Templeuve', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-087', 'Intermarché Tubize', 'Rue du Bailli 26', '1480', 'Tubize', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-088', 'Intermarché Estaimpuis', 'Rue Jules Vantieghem 3', '7730', 'Estaimpuis', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-089', 'Intermarché Eghezee', 'Chaussée de Louvain 64', '5310', 'Éghezée', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-090', 'Intermarché Mont Sur Marchienne', 'Avenue Paul Pastur 179', '6032', 'Mont-sur-Marchienne', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-091', 'Intermarché Hannut', 'Rue de Hesbaye 1', '4280', 'Hannut', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-092', 'Intermarché Saint-Georges-Sur-Meuse', 'Rue Albert Ier 20', '4470', 'Saint-Georges-sur-Meuse', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('SPR-001', 'Spar Grez-Doiceau', 'Chaussée de la Libération 47', '1390', 'Grez-Doiceau', 'wallonie'::region_type, 'spar'::enseigne, 'independant'::network_type),
    ('ITM-093', 'Intermarché Lessines', 'Chemin des Croix 99', '7860', 'Lessines', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-094', 'Intermarché Jette', 'Rue Léopold I 513', '1090', 'Jette', 'bruxelles'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ITM-095', 'Intermarché Ciney', 'Rue du Commerce 79', '5590', 'Ciney', 'wallonie'::region_type, 'intermarche'::enseigne, 'independant'::network_type),
    ('ADD-001', 'AD Delhaize Antoing', 'Rue du Burg', '7640', 'Antoing', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-002', 'AD Delhaize Arbre Ballon', 'Avenue de lArbre Ballon 24', '1090', 'Jette', 'bruxelles'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-003', 'AD Delhaize Ath', 'Rue de lAbbaye 6', '7800', 'Ath', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-004', 'AD Delhaize Aunoi -', 'Rue de Houdeng 212', '7070', 'Le Rœulx', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-005', 'AD Delhaize Aywaille', 'Dieupart 39', '4920', 'Aywaille', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-006', 'AD Delhaize Barvaux', 'Petit Barvaux 6', '6940', 'Barvaux', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-007', 'AD Delhaize Bertrix', 'Route des Gohineaux 2', '6880', 'Bertrix', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-008', 'AD Delhaize Bouffioulx', 'Avenue Émile Vandervelde 260', '6200', 'Bouffioulx', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-009', 'AD Delhaize Bouge', 'Chaussée de Louvain 336', '5004', 'Bouge', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-010', 'AD Delhaize Braine L''Alleud', 'Avenue Victor Hugo 3', '1420', 'Braine-l''Alleud', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-011', 'AD Delhaize Burenville', 'Rue Saint-Nicolas 410', '4000', 'Liège', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-012', 'AD Delhaize Chastre', 'Route Provinciale 98', '1450', 'Chastre', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-013', 'AD Delhaize Chatelineau', 'Rue des Mottards 130 bte 12', '6200', 'Châtelineau', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-014', 'AD Delhaize Chazal', 'Avenue Léon Mahillon 22', '1030', 'Schaerbeek', 'bruxelles'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-015', 'AD Delhaize Diksmuide Ii', 'Kaaskerkestraat 82', '8600', 'Diksmuide', 'flandre'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-016', 'AD Delhaize Dinant', 'Place du Cardinal Mercier 12', '5500', 'Dinant', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-017', 'AD Delhaize Eeklo -', 'Stationsstraat 19', '9900', 'Eeklo', 'flandre'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-018', 'AD Delhaize Enghien', 'Square de la Dodane 1', '7850', 'Enghien', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-019', 'AD Delhaize Epinois', 'Rue Saint-Fiacre 2', '7134', 'Épinois', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-020', 'AD Delhaize Fernelmont', 'Rue dEghezée 16', '5380', 'Fernelmont', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-021', 'AD Delhaize Flagey', 'Rue de Hennin 18', '1050', 'Ixelles', 'bruxelles'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-022', 'AD Delhaize Florenville', 'Rue dArlon 46', '6820', 'Florenville', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-023', 'AD Delhaize Forest', 'Chaussée de Neerstalle 8-12', '1190', 'Forest', 'bruxelles'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-024', 'AD Delhaize Frasnes Lez Gosselies', 'Chaussée de Bruxelles 527', '6210', 'Frasnes-lez-Gosselies', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-025', 'AD Delhaize Gembloux', 'Chaussée de Wavre 42a', '5030', 'Gembloux', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-026', 'AD Delhaize Genappe', 'Chaussée de Bruxelles 4b', '1470', 'Genappe', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-027', 'AD Delhaize Gent Ster', 'Kortrijksesteenweg 906', '9000', 'Gand', 'flandre'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-028', 'AD Delhaize Gosselies', 'Avenue des États-Unis 40', '6041', 'Gosselies', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-029', 'AD Delhaize Haacht', 'Markt 1', '3150', 'Haacht', 'flandre'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-030', 'AD Delhaize Hankar', 'Clos Lucien Outers 1', '1160', 'Auderghem', 'bruxelles'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-031', 'AD Delhaize Hornu', 'Rue de Mons 208', '7301', 'Hornu', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-032', 'AD Delhaize Hotton', 'Rue de la Scierie 9', '6990', 'Hotton', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-033', 'AD Delhaize Incourt -', 'Chaussée de Namur 89', '1315', 'Incourt', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-034', 'AD Delhaize Jurbise', 'Route dAth 420', '7050', 'Jurbise', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-035', 'AD Delhaize Keerbergen', 'Lindenstraat 1', '3140', 'Keerbergen', 'flandre'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-036', 'AD Delhaize Lede', 'Wichelsesteenweg 192C', '9340', 'Lede', 'flandre'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-037', 'AD Delhaize Ledeberg -', 'Driesstraat 96', '9050', 'Ledeberg', 'flandre'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-038', 'AD Delhaize Leopold Iii Evere', 'Rue de Genève 2', '1140', 'Evere', 'bruxelles'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-039', 'AD Delhaize Lessines', 'Rue du Pont de Pierre 11', '7860', 'Lessines', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-040', 'AD Delhaize Louvain La Neuve', 'Place de l''Accueil 10', '1348', 'Louvain-la-Neuve', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-041', 'AD Delhaize Marcinelle', 'Chaussée de Philippeville 236', '6001', 'Marcinelle', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-042', 'AD Delhaize Melsbroek', 'Vliegveld 770 (Brucargo)', '1820', 'Melsbroek', 'flandre'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-043', 'AD Delhaize Mettet', 'Rue Hennevauche 72', '5640', 'Mettet', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-045', 'AD Delhaize Montigny Le Tilleul', 'Rue de Gozée 400', '6110', 'Montigny-le-Tilleul', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-046', 'AD Delhaize Morlanwelz', 'Chaussée Brunehault 500', '7140', 'Morlanwelz', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-047', 'AD Delhaize Nimy - Vamodis', 'Rue de Nimy 117-121', '7020', 'Nimy', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-048', 'AD Delhaize Oostkamp', 'Kortrijksestraat 103-105', '8020', 'Oostkamp', 'flandre'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
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
    ('ADD-060', 'AD Delhaize Waterloo', null, '1410', 'Waterloo', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('ADD-061', 'AD Delhaize Wavre', null, '1300', 'Wavre', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
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
    ('DEL-001', 'Delhaize Reet', '''s Herenbaan 178', '2840', 'Rumst', 'flandre'::region_type, 'delhaize'::enseigne, 'integre'::network_type),
    ('DEL-002', 'AD Delhaize Vise', 'Rue de Dalhem 15', '4600', 'Visé', 'wallonie'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('DEL-003', 'AD Delhaize Ardooie', 'Watervalstraat 22A', '8850', 'Ardooie', 'flandre'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('DEL-004', 'AD Delhaize Zele', 'Lokerenbaan 20', '9240', 'Zele', 'flandre'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('DEL-005', 'AD Delhaize Torhout', 'Karel de Goedelaan 8', '8820', 'Torhout', 'flandre'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type),
    ('DEL-006', 'AD Delhaize Aartselaar', 'Baron van Ertbornstraat 30', '2630', 'Aartselaar', 'flandre'::region_type, 'ad_delhaize'::enseigne, 'affilie'::network_type)
  ) as v (reference, nom, adresse, code_postal, ville, region, enseigne, network)
 where s.external_ref = v.reference
   and (s.name          is distinct from v.nom
     or s.address       is distinct from v.adresse
     or s.postal_code   is distinct from v.code_postal
     or s.city          is distinct from v.ville
     or s.region        is distinct from v.region
     or s.enseigne      is distinct from v.enseigne
     or s.network       is distinct from v.network);

-- ------------------------------------------------------------
-- 2. Les trois doublons du fichier de Gérardo.
--    Deux lignes pour un seul point de vente : le second exemplaire n'est
--    jamais visité, donc sa dette de visite monte indéfiniment et il finit en
--    tête des priorités. C'est exactement ce que le produit doit empêcher.
--
  -- ADD-044  AD DELHAIZE MONS — même magasin que « AD DELHAIZE NIMY - VAMODIS »
  -- ADD-070  AD WAREGEM — ligne répétée à l'identique dans le fichier source
  -- ADD-078  AD HANKAR — même magasin que « AD DELHAIZE HANKAR »
-- ------------------------------------------------------------

-- 2a. Les visites planifiées sur ces lignes n'ont plus d'objet.
update visits
   set active = false,
       motif_annulation = 'doublon du fichier source retiré'
 where active
   and store_id in (select id from stores where external_ref in ('ADD-044', 'ADD-070', 'ADD-078'));

-- 2b. Les modèles de tournée qui les contiennent.
delete from routing_template_stops
 where store_id in (select id from stores where external_ref in ('ADD-044', 'ADD-070', 'ADD-078'));

-- 2c. Les magasins eux-mêmes. La référence est libérée pour qu'elle ne bloque
--     plus un futur import, et le libellé part dans le nom pour rester lisible.
update stores
   set active       = false,
       name         = name || ' (doublon retiré)',
       external_ref = null,
       updated_at   = now()
 where active
   and external_ref in ('ADD-044', 'ADD-070', 'ADD-078');

commit;

-- ============================================================
-- VÉRIFICATION — à lancer après le commit.
--
-- Attendu : sans_adresse = 2 (AD DELHAIZE WATERLOO et AD DELHAIZE WAVRE,
-- en attente de la réponse de Gérardo), ad_delhaize = 80, proxy = 5,
-- delhaize_integres = 1, intermarche = 95.
--
-- `magasins_actifs` doit valoir 182 MOINS les magasins que tu aurais
-- désactivés toi-même : `desactives_hors_doublons` les compte. Si ce nombre
-- n'est pas 0, regarde la deuxième requête pour savoir lesquels.
-- ============================================================
select
  count(*) filter (where active)                                 as magasins_actifs,
  count(*) filter (where active and address is null)             as sans_adresse,
  count(*) filter (where not active and external_ref is not null) as desactives_hors_doublons,
  count(*) filter (where active and enseigne = 'ad_delhaize')    as ad_delhaize,
  count(*) filter (where active and enseigne = 'delhaize')       as delhaize_integres,
  count(*) filter (where active and enseigne = 'proxy_delhaize') as proxy,
  count(*) filter (where active and enseigne = 'intermarche')    as intermarche
from stores;

-- Lesquels sont désactivés sans être des doublons ? (0 ligne = tout va bien)
select external_ref, name, city
from stores
where not active
  and external_ref is not null
order by external_ref;
