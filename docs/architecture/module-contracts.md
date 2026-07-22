# Contrats intermodules GeeCole

> **Statut : décision consolidée**  
> Ce document complète `frontend.md` et formalise les échanges autorisés entre domaines métier.

## Principe

Chaque module est propriétaire de son modèle métier, de ses cas d’usage et de ses accès aux données. Un autre module ne dépend jamais de ses tables, repositories, entités internes ou composants privés.

Un échange intermodule doit passer par un contrat public stable et minimal.

## Point d’entrée public

Chaque module peut exposer :

```text
modules/<module>/public/
├── contracts.ts
├── services.ts
├── events.ts
└── index.ts
```

Les autres modules importent uniquement depuis `public/index.ts`.

Tout import profond dans un autre module est interdit.

## Types de contrats autorisés

### Service applicatif public

Utilisé lorsqu’un module a besoin d’une réponse immédiate d’un autre domaine.

Exemple : le module Notes demande au module Scolarité le résumé d’un élève ou la liste des élèves inscrits dans une classe.

Le service public :

- expose un DTO minimal ;
- masque les tables et RPC internes ;
- applique les permissions et le contexte établissement/année ;
- retourne des erreurs métier stables ;
- ne divulgue pas les erreurs Supabase brutes.

### Événement métier

Utilisé pour notifier un fait métier sans couplage direct avec les traitements consommateurs.

Exemples :

- `StudentEnrolled` ;
- `EmployeeSuspended` ;
- `ReportCardPublished` ;
- `PaymentRecorded`.

Un événement décrit un fait passé. Il ne doit pas servir de commande déguisée.

### Identifiant stable

Un module peut conserver l’identifiant public d’une entité appartenant à un autre module, sans recopier son modèle interne.

Les données affichées sont résolues via le contrat public du module propriétaire.

### Vue ou RPC publique

Une vue ou RPC Supabase peut constituer un contrat intermodule uniquement si elle est :

- explicitement documentée comme publique ;
- versionnée ou maintenue avec compatibilité ;
- protégée par les règles RLS et permissions appropriées ;
- indépendante de détails de stockage non nécessaires ;
- consommée par un adaptateur d’infrastructure, jamais directement par un composant React.

## DTO intermodules

Un DTO public doit :

- contenir uniquement les données nécessaires au consommateur ;
- utiliser un vocabulaire métier stable ;
- éviter les structures générées depuis le schéma Supabase ;
- ne pas exposer les colonnes techniques, UUID internes inutiles ou métadonnées sensibles ;
- être distinct des entités du domaine propriétaire.

Exemple :

```ts
export interface StudentSummary {
  studentId: string
  registrationNumber: string
  displayName: string
  status: 'active' | 'inactive'
}
```

## Interdictions

Sont interdits :

- `supabase.from('students')` depuis Notes, Frais ou Personnel ;
- l’import d’un repository interne d’un autre module ;
- l’import d’une entité de domaine comme type d’échange ;
- la duplication locale d’une règle appartenant au module propriétaire ;
- un composant de présentation qui orchestre directement plusieurs clients Supabase ;
- l’ajout d’un élément métier dans `shared` pour contourner un contrat public.

## Propriété des domaines

Les propriétaires fonctionnels principaux sont :

- Scolarité : élèves, parents, inscriptions, classes et parcours scolaire ;
- Notes et Bulletins : évaluations, résultats, moyennes, bulletins et publication ;
- Frais scolaires : frais, plans, échéances, paiements et avantages ;
- Personnel : employés, fonctions, contrats, présences, congés et paie ;
- Paramétrage : établissement, année scolaire, cycles et catalogues configurables ;
- Agenda : événements et planification.

Une donnée utilisée par plusieurs modules ne devient pas automatiquement une donnée `shared`. Elle conserve un propriétaire métier et est exposée par contrat.

## Évolution d’un contrat

Toute modification d’un contrat public doit préciser :

1. le module propriétaire ;
2. les consommateurs connus ;
3. la compatibilité avec les versions existantes ;
4. les changements de permissions ou RLS ;
5. les tests d’intégration nécessaires ;
6. l’impact sur la documentation des modules concernés.

Une rupture de contrat doit être traitée par migration coordonnée ou nouvelle version, jamais par modification silencieuse.

## Tests attendus

- tests unitaires des DTO et règles de mapping ;
- tests d’intégration du service, de la vue ou de la RPC publique ;
- tests de permissions positifs et négatifs ;
- tests interétablissements et interannées ;
- test garantissant qu’aucune donnée sensible supplémentaire n’est exposée.
