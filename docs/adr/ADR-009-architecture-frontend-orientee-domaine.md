# ADR-009 — Architecture Front-End orientée domaine

## Statut

Accepté — juillet 2026.

## Contexte

GeeCole contient plusieurs domaines métier indépendants : Scolarité, Notes et Bulletins, Frais scolaires, Personnel, Agenda et Paramétrage. Une organisation centrée uniquement sur les pages React ou les appels Supabase rend les règles métier difficiles à identifier, à tester et à faire évoluer. Elle favorise également les dépendances directes entre modules et la duplication de composants.

## Décision

Le Front-End adopte une architecture modulaire orientée domaine, inspirée de l’architecture hexagonale, sans imposer un DDD académique lourd.

Chaque module métier sépare :

```text
modules/<module>/
├── domain/
├── application/
├── infrastructure/
├── presentation/
└── public/
```

### Domaine

`domain/` contient le métier pur : entités, value objects, règles, transitions, erreurs et événements métier. Il ne dépend ni de React, ni de PrimeReact, ni de Supabase, ni des tables physiques.

### Application

`application/` contient les cas d’usage, commandes, requêtes, DTO et services applicatifs. Cette couche orchestre le domaine et les ports sans connaître l’interface graphique.

### Infrastructure

`infrastructure/` contient les adaptateurs techniques : repositories Supabase, RPC, mappers, stockage, fonctions Edge, cache et clients externes.

### Présentation

`presentation/` contient les workspaces, pages, formulaires, composants propres au module, hooks et view models. Elle appelle la couche application et n’accède jamais directement à Supabase.

### API publique

`public/` est l’unique point d’entrée autorisé pour les autres modules. Il expose seulement les contrats, services et événements nécessaires.

## Règles de dépendance

```text
presentation → application → domain
infrastructure → application/domain
```

Le domaine ne dépend d’aucune couche externe. Les dépendances concrètes sont assemblées dans la composition de l’application.

## Isolation des modules

Un module ne peut pas :

- interroger directement les tables privées d’un autre module ;
- importer ses repositories internes ;
- réutiliser ses entités internes comme contrats intermodules ;
- utiliser des imports profonds dans son arborescence.

Les communications intermodules passent uniquement par :

- un contrat public ;
- un service applicatif public ;
- un événement métier ;
- un identifiant stable ;
- une vue ou RPC explicitement documentée comme publique.

## Dossier `shared`

`shared` contient uniquement les éléments réellement transversaux et sans vocabulaire métier propre : composants du Design System GeeCole, contexte établissement/année, primitives d’autorisation, erreurs communes et utilitaires techniques.

Un composant portant un vocabulaire ou une règle propre à un domaine reste dans ce domaine, même s’il paraît réutilisable à court terme.

Exemples :

- `SummaryList` peut être partagé ;
- `EmployeeContractTable` reste dans Personnel ;
- `GradeEntryGrid` reste dans Notes ;
- `PaymentAllocationForm` reste dans Frais scolaires.

## Conséquences

- Les règles métier deviennent testables sans React ni Supabase.
- Les changements de cycle de vie sont implémentés comme des cas d’usage dédiés.
- Le schéma Supabase ne remonte pas dans les composants d’interface.
- La migration du code existant peut être progressive, mais aucun nouveau couplage contraire à cette décision ne doit être introduit.
- Chaque proposition de modification doit préciser le domaine concerné, les couches touchées et l’impact documentaire.

Le détail opérationnel est défini dans `docs/architecture/frontend.md`.
