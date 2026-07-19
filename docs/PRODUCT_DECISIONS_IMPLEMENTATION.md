# Application des décisions produit V1

Branche : `agent/apply-product-decisions-v1`

Ce document suit l'écart entre `PRODUCT_DECISIONS.md` et la base de code. Une décision n'est considérée comme terminée que lorsque le schéma, les services, l'interface et les tests nécessaires sont alignés.

## État de couverture

| Décision | État | Couverture actuelle | Reste à faire |
|---|---|---|---|
| V1-001 Catalogue scolaire guinéen | Partiel | `cycle_catalog` et le catalogue des niveaux existent déjà. | Vérifier les données de référence guinéennes et retirer des écrans toute création libre de cycle ou niveau. |
| V1-002 Activation annuelle | Partiel | Les cycles et niveaux annuels existent déjà. | Finaliser l'écran d'activation par année et les tests d'isolation historique. |
| V1-003 Catalogue / activation / configuration | Partiel | Le modèle distingue déjà catalogue et structures annuelles. | Rendre explicites les actions Activer et Configurer dans les paramètres. |
| V1-004 Organisation des classes | Socle ajouté | Ajout de `class_organization_mode`, `section` et `code_is_generated`; salle et capacité restent facultatives. | Adapter les formulaires pour ne saisir qu'une section et composer automatiquement le nom complet/code. |
| V1-005 Affectation des élèves | Socle ajouté | L'affectation reste portée par `class_assignments`; une classe inactive est refusée. | Retirer toute affectation depuis le formulaire de création de classe et ajouter les actions depuis fiche/liste/inscription. |
| V1-006 Années scolaires | Socle ajouté | Une seconde année ouverte est refusée; la structure d'une année clôturée/archivée est verrouillée. | Ajouter les messages et états désactivés correspondants dans l'interface. |
| V1-007 Documents exigés | Socle ajouté | Ajout de l'obligation, de l'utilisation à l'inscription et de la politique en cas d'absence. | Reprendre l'écran de configuration et le calcul de complétude du dossier. |
| V1-008 Terminologie Parent | Partiel | La relation plusieurs-à-plusieurs existe déjà avec ses propriétés métier. | Remplacer « responsable/guardian » par « parent » dans tous les libellés visibles sans renommer inutilement les tables internes. |
| V1-009 Recherche et réutilisation parent | Socle ajouté | Email facultatif, index de recherche et RPC `find_parent_by_contact`. | Brancher le formulaire d'ajout de parent sur la recherche avant création et traiter les doublons historiques. |
| V1-010 Fratrie calculée | Socle ajouté | Vue `student_siblings` calculée depuis les parents partagés. | Afficher la fratrie dans la fiche élève et ajouter les tests de droits RLS. |
| V1-011 Préinscription | Partiel | Le modèle d'inscription possède déjà origine et inscription source. | Créer le parcours de confirmation d'une préinscription future sans altérer l'inscription actuelle. |
| V1-012 Réinscription | Partiel | Les politiques et liens source existent déjà. | Imposer dans le service l'année active comme cible et l'année précédente comme source; retirer les sélecteurs libres. |
| V1-013 Réinscription groupée | Partiel | Le mode batch et les décisions académiques existent déjà. | Refaire le parcours par classe/niveau source avec cases à cocher, proposition du niveau suivant et exceptions individuelles. |
| V1-014 Espace documentaire élève | Socle ajouté | Catégories administratives, bulletins, relevés, certificats et autres documents scolaires. | Recomposer l'onglet Documents de la fiche élève et brancher l'archivage des documents générés. |

## Migration ajoutée

`supabase/migrations/20260719190000_apply_product_decisions_v1_foundation.sql`

Elle est additive et couvre les garanties de données qui peuvent être introduites sans réécrire les migrations partagées :

- contrôle d'une seule année scolaire ouverte ;
- verrouillage de la structure des années clôturées ou archivées ;
- extension du modèle documentaire ;
- recherche d'un parent par téléphone ou email ;
- fratrie calculée ;
- configuration du mode de classes ;
- contrôle des affectations vers une classe active ;
- vocabulaire métier des origines d'inscription.

## Validation requise

Avant fusion :

```bash
npm install
npm run supabase:reset
npx supabase gen types typescript --local > src/shared/lib/supabase/database.types.ts
npm run format:check
npm run lint
npm test
npm run build
npm run supabase:test
```

La génération des types doit être committée après validation de la migration locale.
