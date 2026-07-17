# Scolarité — Spécifications UX

## Navigation

- Tableau de bord
- Élèves
- Inscriptions
- Réinscriptions
- Classes
- Assiduité
- Notes et bulletins

## Liste des élèves

Barre de recherche globale et filtres : année, cycle, niveau, classe, sexe, statut d'inscription et situation financière. Les filtres actifs sont visibles sous forme de chips et peuvent être réinitialisés.

Actions rapides : ouvrir la fiche, réinscrire, imprimer une attestation, enregistrer un paiement ou une absence.

## Assistant d'inscription

Un Stepper court :

1. Rechercher un élève existant
2. Identité
3. Responsables
4. Scolarité
5. Frais
6. Récapitulatif et confirmation

Une sauvegarde brouillon est possible à chaque étape. Le récapitulatif montre clairement ce qui sera créé avant confirmation.

## Fiche élève

En-tête compact : photo, identité, matricule, niveau, classe et statut.

Onglets :

- Vue d'ensemble
- Identité et contacts
- Responsables
- Parcours scolaire
- Assiduité
- Notes et bulletins
- Finances
- Documents
- Historique

Les actions dangereuses demandent un motif, pas seulement une confirmation oui/non.

## Réinscription

Écran comparatif : année précédente à gauche, proposition pour la nouvelle année à droite. Les changements et nouveaux frais sont surlignés avant validation.


## Préinscription et inscription — parcours validé

L'assistant utilise sept étapes courtes :

1. Recherche et doublons probables
2. Identité de l'élève
3. Responsables
4. Scolarité
5. Documents
6. Frais
7. Récapitulatif

### Principes d'interaction

- sauvegarde du brouillon sans perdre l'étape courante ;
- indicateur de progression et retour aux étapes précédentes ;
- recherche d'un responsable existant, notamment par téléphone ;
- champs conditionnels selon les politiques de l'établissement ;
- séparation visuelle entre erreur bloquante, avertissement et information ;
- documents marqués fourni, à fournir, non applicable ou illisible/refusé ;
- affichage des frais avant toute confirmation ;
- bouton final libellé selon l'action réelle : « Enregistrer la préinscription » ou « Confirmer l'inscription ».

Le récapitulatif présente l'identité, les responsables, la scolarité, les documents manquants, les frais et les dérogations. La confirmation peut ensuite proposer l'impression de la fiche d'inscription ou l'enregistrement d'un paiement, sans rendre le paiement obligatoire si la politique de l'établissement ne l'impose pas.

### Restitution des politiques

L'interface explique le comportement configuré au lieu de le laisser implicite : paiement requis ou non, classe obligatoire ou facultative, impact de la préinscription sur les places et gestion du dépassement de capacité.
