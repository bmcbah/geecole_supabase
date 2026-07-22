# Scolarité — Statuts canoniques d'inscription

Ce document tranche la contradiction historique présente dans `business.md` et constitue la référence détaillée pour les statuts d'une inscription.

## Modèle retenu

```text
draft
→ pre_registered
→ confirmed
```

Les sorties possibles sont :

```text
rejected
withdrawn
cancelled
transferred
```

## Signification

- `draft` : dossier en préparation, sans effet administratif ou financier définitif ;
- `pre_registered` : candidat enregistré, dossier soumis au contrôle ;
- `confirmed` : inscription officielle pour l'année scolaire ;
- `rejected` : admission refusée avec motif ;
- `withdrawn` : démarche abandonnée par la famille avant confirmation ;
- `cancelled` : inscription confirmée annulée administrativement et conservée dans l'historique ;
- `transferred` : élève sorti vers un autre établissement.

## Décision sur `pending`

`pending` n'est pas un statut d'inscription GeeCole. La notion d'attente est portée par `pre_registered`, complétée par l'état des pièces, des contrôles et des paiements.

Cette décision ne concerne pas les statuts `pending` propres à d'autres domaines, notamment les validations de notes, les bulletins, la paie ou les demandes du personnel.

## Règles d'intégrité

- une inscription confirmée n'est jamais supprimée physiquement ;
- les transitions terminales exigent un motif et une trace d'audit ;
- une réinscription crée une nouvelle inscription pour l'année cible ;
- les frais et instantanés déjà générés ne sont jamais recalculés rétroactivement ;
- un élève ne possède qu'une inscription courante par année, hors dossiers rejetés, retirés ou annulés.
