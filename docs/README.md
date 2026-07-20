# Documentation GeeCole

> **Statut : décision consolidée**  
> Cette documentation intègre les arbitrages validés le 20 juillet 2026.


GeeCole est une plateforme de gestion scolaire organisée autour du contexte :

`Workspace → Établissement → Année scolaire`

## Lire la documentation

1. [Vision produit](product/vision.md)
2. [Principes produit](product/principes.md)
3. [Glossaire](product/glossary.md)
4. [Architecture générale](architecture/overview.md)
5. [Modules métier](modules/README.md)
6. [Roadmap d’implémentation](implementation/roadmap.md)
7. [Décisions d’architecture](adr/README.md)

## Sources de vérité

- Les règles globales sont dans `product/` et `architecture/`.
- Les règles propres à un module sont dans `modules/<module>/business.md`.
- Les parcours et comportements d’interface sont dans `ux/` ou dans le fichier `ux.md` du module.
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
- Le stepper est réservé aux assistants comme l’inscription ; le drawer fournit l’aperçu et les actions rapides ; la page complète porte le profil.
- Un cours correspond à `année + classe/niveau + matière + période`. L’enseignant effectif est résolu par les affectations.
- Les politiques de paiement à l’inscription sont configurables côté front et back.
