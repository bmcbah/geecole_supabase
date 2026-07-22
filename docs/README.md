# Documentation GeeCole

> **Statut : décision consolidée**  
> Cette documentation intègre les arbitrages validés jusqu’au 22 juillet 2026.

GeeCole est une plateforme de gestion scolaire organisée autour du contexte :

`Workspace → Établissement → Année scolaire`

## Lire la documentation

1. [Vision produit](product/vision.md)
2. [Principes produit](product/principes.md)
3. [Glossaire](product/glossary.md)
4. [Architecture générale](architecture/overview.md)
5. [Architecture Front-End orientée domaine](architecture/frontend.md)
6. [Design System GeeCole](design-system/README.md)
7. [Modules métier](modules/README.md)
8. [Roadmap d’implémentation](implementation/roadmap.md)
9. [Décisions d’architecture](adr/README.md)

## Sources de vérité

- Les règles globales sont dans `product/` et `architecture/`.
- Les règles propres à un module sont dans `modules/<module>/business.md`.
- Les règles UX transverses et les composants métier partagés sont dans `design-system/`.
- Les parcours spécifiques à un module sont dans `ux/` ou dans le fichier `ux.md` du module.
- Les détails techniques sont dans `technical.md`.
- Les décisions structurantes sont enregistrées dans `adr/`.
- Les documents d’origine sont conservés dans `archive/source-originale/` uniquement à titre historique.

## Décisions consolidées principales

- Les affectations pédagogiques utilisent les **périodes scolaires**, pas des dates libres.
- Une famille est une **vue métier implicite**, calculée à partir des élèves partageant au moins un parent.
- Le terme officiel est **Parent**.
- Les catalogues GeeCole sont activables et **surchargeables localement**, sans modification du catalogue source.
- L’option « niveau utilisé comme classe » évite de créer des classes lorsque l’établissement n’en a qu’une par niveau.
- Les états d’une année scolaire sont : `draft`, `active`, `closed`, `archived`.
- Le type documentaire métier commun est **Document administratif** ; les bulletins, relevés et attestations restent des documents scolaires générés.
- Le stepper est réservé aux assistants ordonnés comme l’inscription, l’import ou la clôture annuelle.
- Les drawers ne sont pas utilisés. Une modal en lecture seule fournit la prévisualisation rapide ; la page complète porte la fiche, les onglets et les actions métier.
- Les statuts sont modifiés par des actions métier explicites, jamais par une liste déroulante dans un formulaire.
- Les synthèses de fiches utilisent une liste attribut-valeur (`SummaryList`), pas une accumulation de cards.
- Le Front-End sépare domaine, application, infrastructure et présentation ; la présentation n’accède jamais directement à Supabase.
- Les modules communiquent uniquement par leurs contrats publics, événements métier ou identifiants stables.
- Un cours correspond à `année + classe/niveau + matière + période`. L’enseignant effectif est résolu par les affectations.
- Les politiques de paiement à l’inscription sont configurables côté front et back.
