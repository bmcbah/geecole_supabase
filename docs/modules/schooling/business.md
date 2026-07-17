# Scolarité — Spécifications métier

## Mission

Gérer le parcours administratif d'un élève, de sa préinscription à sa sortie, sans perdre l'historique annuel.

## Sous-modules MVP

1. Dossier élève
2. Inscription
3. Réinscription
4. Classes et affectations
5. Liste et recherche des élèves
6. Responsables légaux et contacts
7. Documents administratifs
8. Frais générés par l'inscription
9. Assiduité
10. Évaluations, notes et bulletins

## Règles communes

- Un élève est une personne et peut posséder un compte utilisateur.
- Le matricule est unique dans l'établissement et ne change pas entre les années.
- Une inscription appartient à une seule année scolaire et un seul niveau.
- Un élève ne possède qu'une inscription active par année.
- Une inscription conserve les instantanés du niveau, du cycle et des frais appliqués.
- Changer une règle future ne modifie pas une dette ou un document déjà généré.
- Une réinscription crée une nouvelle inscription annuelle ; elle ne modifie pas l'ancienne.
- Les doublons probables sont signalés avant création.
- Une suppression administrative devient une annulation historisée.
- Toute modification sensible conserve auteur, date et motif.

## États d'une inscription

`draft → pending → confirmed → cancelled`

- draft : dossier incomplet ;
- pending : dossier soumis, pièces ou paiement à contrôler ;
- confirmed : inscription validée ;
- cancelled : inscription annulée avec motif.

## Inscription

Données minimales : identité, date et lieu de naissance, sexe, photo facultative, adresse, téléphone, responsable légal, année, cycle, niveau et provenance.

La confirmation :

- attribue ou conserve le matricule ;
- crée l'inscription annuelle ;
- génère les frais applicables avec leur montant instantané ;
- affecte l'élève à une classe si elle est choisie ;
- produit un reçu ou certificat d'inscription.

## Réinscription

- Propose automatiquement le niveau suivant configuré.
- Autorise redoublement ou changement de niveau avec motif et droit adapté.
- Reprend les contacts sans dupliquer les personnes.
- Affiche les dettes antérieures sans les mélanger aux frais de la nouvelle année.
- Conserve l'historique complet des inscriptions.

## Classes

Une classe est une division annuelle d'un niveau : par exemple 7e A. Sa capacité peut bloquer ou avertir selon le paramétrage. Un transfert entre classes est historisé.

## Assiduité

Absence ou retard par date, créneau et motif. États : non justifié, justifié, en attente. Les justificatifs et notifications sont historisés.

## Évaluations et bulletins

Les notes utilisent les types, périodes, barèmes et formules du Paramétrage. Une période verrouillée empêche la modification sans réouverture autorisée. Le bulletin publié devient une version immuable.

## Compléments recommandés

- préinscriptions ;
- import Excel contrôlé ;
- détection des doublons ;
- transferts d'établissement ;
- radiation et abandon ;
- archivage de pièces ;
- historique des changements de classe ;
- attestations et certificats ;
- contacts d'urgence ;
- besoins médicaux essentiels avec accès restreint.
