# Modules GeeCole

GeeCole est organisé par **modules métier**. Le terme `feature` n'est plus utilisé dans la documentation fonctionnelle.

Chaque module possède quatre contrats :

- `business.md` : objectifs, acteurs et règles métier ;
- `ux.md` : parcours, écrans, états et messages ;
- `technical.md` : modèle de données, services, sécurité et intégrations ;
- `acceptance.md` : critères de recette et scénarios E2E.

## Convention de code

Le code applicatif cible progressivement cette structure :

```text
src/modules/<module>/
  components/
  pages/
  schemas/
  services/
  types/
  tests/
```

Un module ne lit pas directement les tables privées d'un autre module. Les échanges passent par un service public ou un identifiant métier stable.

## Modules

- Paramétrage
- Scolarité
- Évaluations et bulletins
- Assiduité
- Finances
- Personnel
- Agenda
- Portails parent et élève
