# Scolarité — Architecture backend

> Statut : fondation Phase 2.

Ce document décrit les fonctions backend qui contrôlent le cycle de vie des inscriptions. La base de données reste l'autorité métier : le frontend demande une action, mais ne décide jamais seul si une inscription peut être confirmée.

## Principes

- Toute transition importante passe par une fonction RPC sécurisée.
- Les fonctions utilisent `security definer` avec un `search_path` vide.
- Les permissions sont vérifiées dans la fonction, même lorsque la RLS est active.
- Une année `closed` ou `archived` est en lecture seule.
- Une inscription confirmée n'est jamais supprimée physiquement.
- Les changements de statut sont historisés par trigger ; une RPC ne doit pas écrire une seconde entrée manuellement.
- Une confirmation exécute systématiquement le moteur de validation.

## Moteur de validation

### `evaluate_enrollment(enrollment_id)`

Cette fonction recalcule les contrôles d'une inscription et remplace les résultats précédents dans `enrollment_validation_results`.

Elle renvoie une liste JSON ordonnée par gravité :

1. `blocking` ;
2. `warning` ;
3. `information` ;
4. `success`.

Contrôles implémentés :

- présence d'un responsable principal actif ;
- classe obligatoire selon la politique de l'établissement ;
- dépassement de capacité selon le mode `information`, `warning` ou `blocking` ;
- documents obligatoires manquants ;
- décision pédagogique manquante pour une réinscription.

Le résultat contient :

- `code` : identifiant stable exploitable par le frontend ;
- `severity` : niveau de gravité ;
- `domain` : domaine métier ;
- `message_key` : clé de traduction ;
- `details` : contexte structuré ;
- `resolution_action` : action recommandée.

## Machine d'états

### `transition_enrollment(...)`

Signature logique :

```text
transition_enrollment(
  enrollment_id,
  target_status,
  reason?,
  transfer_destination?
)
```

Transitions autorisées :

```text
draft
├── pre_registered
├── pending
├── confirmed
└── cancelled

pre_registered
├── pending
├── confirmed
├── rejected
├── withdrawn
└── cancelled

pending
├── confirmed
├── rejected
├── withdrawn
└── cancelled

confirmed
├── cancelled
└── transferred
```

Les états `rejected`, `withdrawn`, `cancelled` et `transferred` sont terminaux dans cette fondation.

Un motif est obligatoire pour :

- rejet ;
- abandon ;
- annulation ;
- transfert.

Un transfert exige également une destination.

## RPC publiques

- `submit_enrollment(id)` : soumet le dossier et passe à `pending` ;
- `confirm_enrollment(id)` : évalue puis confirme si aucun blocage n'existe ;
- `reject_enrollment(id, reason)` ;
- `withdraw_enrollment(id, reason)` ;
- `cancel_enrollment(id, reason)` ;
- `transfer_enrollment(id, destination, reason)` ;
- `change_enrollment_status(...)` : façade de compatibilité pour le code existant ;
- `reenroll_student(...)` : prépare une inscription annuelle liée à l'inscription source.

## Réinscription

La fonction `reenroll_student` conserve sa signature historique pour ne pas casser les consommateurs existants.

Elle est néanmoins renforcée :

- elle accepte l'état `pending` ;
- elle copie la politique appliquée dans un snapshot ;
- elle alimente les nouvelles colonnes de décision pédagogique ;
- une demande de confirmation directe crée d'abord un état contrôlable puis appelle `confirm_enrollment` ;
- la confirmation ne contourne donc plus le moteur de validation.

## Historique

La table historique consolidée utilise les colonnes :

```text
from_status
to_status
reason
performed_by
performed_at
```

Une migration de compatibilité renomme les anciennes colonnes :

```text
previous_status → from_status
new_status      → to_status
changed_by      → performed_by
changed_at      → performed_at
```

Cette migration doit précéder la migration de fondation Phase 1.

## Permissions initiales

Les opérations d'inscription sont limitées aux rôles :

- `owner` ;
- `admin` ;
- `secretary`.

Cette matrice est provisoire et devra être remplacée par des permissions métier fines, par exemple :

```text
enrollment.create
enrollment.submit
enrollment.confirm
enrollment.reject
enrollment.cancel
enrollment.transfer
enrollment.override
```

## Limites de la Phase 2 actuelle

Ne sont pas encore branchés dans le moteur :

- génération automatique des frais ;
- blocage ou avertissement selon les dettes antérieures ;
- dérogation explicite sur un contrôle bloquant ;
- notifications aux responsables ;
- génération du certificat ou reçu d'inscription ;
- synchronisation automatique des cours depuis les affectations.

Ces opérations nécessitent un contrat explicite avec les modules Finances, Documents et Notes. Elles ne doivent pas être simulées ni couplées implicitement.

## Tests obligatoires avant fusion

- réinitialisation complète de la base ;
- transition valide et invalide pour chaque état ;
- confirmation avec et sans contrôle bloquant ;
- confirmation avec documents manquants en mode avertissement ;
- capacité en modes information, avertissement et blocage ;
- historique : une seule entrée par transition ;
- réinscription directe confirmée ;
- refus sur année clôturée ;
- refus pour un utilisateur sans rôle autorisé ;
- régénération des types TypeScript Supabase.
