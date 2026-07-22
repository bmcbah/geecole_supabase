# Architecture Front-End GeeCole

> **Statut : décision consolidée**  
> Architecture orientée domaine, modulaire et inspirée de l’architecture hexagonale.

## Objectifs

L’architecture Front-End doit :

- séparer clairement l’interface, le métier et l’accès aux données ;
- isoler les modules métier ;
- rendre les règles métier testables sans React ni Supabase ;
- empêcher les accès directs aux données privées d’un autre module ;
- favoriser la lisibilité et la maintenance ;
- mutualiser uniquement les composants réellement transversaux.

## Structure générale

```text
src/
├── app/
├── modules/
│   ├── schooling/
│   ├── grades/
│   ├── finance/
│   ├── personnel/
│   ├── agenda/
│   └── settings/
├── shared/
└── infrastructure/
```

## Structure d’un module

```text
modules/<module>/
├── domain/
├── application/
├── infrastructure/
└── presentation/
```

### `domain/`

Contient le métier pur :

- entités ;
- value objects ;
- règles métier ;
- transitions de statut ;
- erreurs métier ;
- interfaces de repositories ;
- événements métier.

Contraintes :

- aucune dépendance à React ;
- aucune dépendance à PrimeReact ;
- aucune dépendance au client Supabase ;
- aucune connaissance des tables physiques.

### `application/`

Contient les cas d’usage et l’orchestration :

- commandes ;
- requêtes ;
- services applicatifs ;
- DTO applicatifs ;
- politiques d’autorisation applicatives ;
- coordination des repositories et événements.

Exemples :

- `CreateEmployee` ;
- `SuspendEmployee` ;
- `ApproveAdvance` ;
- `CalculatePayroll` ;
- `AssignTeacher` ;
- `ValidateReportCard`.

Cette couche ne dépend pas de l’interface graphique.

### `infrastructure/`

Contient les adaptateurs techniques :

- repositories Supabase ;
- appels RPC ;
- mappers base de données vers domaine ;
- stockage documentaire ;
- fonctions Edge ;
- cache technique ;
- clients externes.

Le schéma Supabase ne doit pas remonter directement dans la présentation.

### `presentation/`

Contient :

- workspaces ;
- pages ;
- composants propres au module ;
- formulaires ;
- hooks de présentation ;
- view models ;
- adaptation des erreurs métier en messages utilisateur ;
- déclaration des actions visibles selon les permissions.

La présentation appelle les cas d’usage de `application/`. Elle ne doit pas interroger directement Supabase.

## Dépendances autorisées

```text
presentation → application → domain
infrastructure → application/domain
```

Le domaine ne dépend d’aucune couche externe.

La présentation ne dépend pas directement de l’infrastructure concrète. Les dépendances sont injectées au niveau de la composition de l’application.

## Isolation des modules

Un module ne lit ni n’écrit directement les tables privées d’un autre module.

Communication autorisée :

- service public applicatif ;
- interface publique du module ;
- événement métier ;
- identifiant stable ;
- vue ou RPC explicitement documentée comme contrat public.

Communication interdite :

- import d’un repository interne d’un autre module ;
- appel direct à une table privée d’un autre module ;
- réutilisation d’une entité interne comme DTO intermodule ;
- import profond dans l’arborescence d’un autre module.

Exemple interdit :

```ts
supabase.from('students')
```

depuis le module Notes.

Exemple attendu :

```ts
studentDirectory.getStudentSummary(studentId)
```

via le contrat public du module Scolarité.

## API publique d’un module

Chaque module expose un point d’entrée limité :

```text
modules/<module>/public/
├── services.ts
├── contracts.ts
├── events.ts
└── index.ts
```

Les autres modules importent uniquement depuis ce point d’entrée public.

## Dossier `shared`

`shared` contient uniquement ce qui est transverse et indépendant d’un vocabulaire métier spécifique.

Exemples autorisés :

- composants UI GeeCole ;
- permissions génériques ;
- contexte établissement/année ;
- erreurs techniques communes ;
- primitives documentaires communes ;
- utilitaires sans règle métier ;
- formatage de dates, montants et identifiants.

Exemples interdits :

- `EmployeeContractTable` ;
- `GradeEntryGrid` ;
- `PaymentAllocationForm` ;
- règles de calcul de moyenne ;
- règles de paie ;
- règles d’inscription.

Règle :

> Un élément rejoint `shared` seulement s’il est utilisé par plusieurs domaines et ne porte pas de vocabulaire métier propre.

## Composants UI

Les écrans métier utilisent en priorité les composants GeeCole définis dans `docs/design-system/README.md`.

PrimeReact reste une bibliothèque technique sous-jacente. Les règles de densité, permissions, actions, erreurs et accessibilité sont encapsulées dans les composants GeeCole.

## Gestion des statuts

Les changements de statut sont implémentés comme des cas d’usage dédiés, jamais comme une simple mise à jour de formulaire.

Chaque transition doit pouvoir :

- vérifier les préconditions ;
- contrôler les permissions ;
- demander un motif si nécessaire ;
- produire un événement métier ;
- alimenter l’historique ;
- retourner une erreur métier compréhensible.

## Erreurs

Les erreurs sont classées :

- erreurs de validation de champ ;
- erreurs métier ;
- erreurs d’autorisation ;
- erreurs techniques.

Les messages Supabase bruts ne sont jamais affichés à l’utilisateur. La couche présentation transforme les erreurs en retours compréhensibles.

## Tests

- `domain/` : tests unitaires purs ;
- `application/` : tests de cas d’usage avec doubles de repositories ;
- `infrastructure/` : tests d’intégration Supabase ;
- `presentation/` : tests de composants et parcours ;
- parcours critiques : E2E Playwright.

## Règle de création d’un nouvel écran

Un nouvel écran doit :

1. appartenir à un module métier identifié ;
2. utiliser un type de Workspace officiel ;
3. appeler un cas d’usage applicatif ;
4. ne jamais accéder directement à Supabase depuis la présentation ;
5. déclarer ses actions et permissions ;
6. utiliser les composants shared GeeCole lorsqu’ils existent ;
7. conserver les règles métier dans le domaine ou l’application, jamais dans le JSX.
