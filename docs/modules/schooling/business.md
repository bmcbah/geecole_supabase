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


## Préinscription et inscription — atelier validé

### Définitions

- La préinscription enregistre un candidat sans en faire automatiquement un élève comptabilisé.
- L'inscription confirme sa présence dans l'établissement pour une année scolaire.
- La réinscription crée l'inscription d'une nouvelle année pour un élève déjà connu.
- La préinscription reste facultative : selon sa politique, l'établissement peut autoriser l'inscription directe.

### Parcours

1. Rechercher un élève existant et afficher les doublons probables.
2. Saisir l'identité, avec date de naissance exacte ou approximative.
3. Rechercher ou créer les responsables et désigner le contact principal, le responsable financier et les personnes autorisées.
4. Choisir l'année, le cycle, le niveau et éventuellement la classe.
5. Contrôler les documents configurés par l'établissement.
6. Calculer et présenter les frais applicables.
7. Afficher un récapitulatif avant enregistrement ou confirmation.

### États détaillés

- `draft` : brouillon sans effet financier ;
- `pre_registered` : candidat enregistré ;
- `confirmed` : inscription officielle ;
- `rejected` : admission refusée avec motif ;
- `withdrawn` : démarche abandonnée par la famille ;
- `cancelled` : inscription annulée et conservée dans l'historique ;
- `transferred` : départ vers un autre établissement.

Une inscription confirmée n'est jamais supprimée physiquement.

### Politiques configurables par établissement

Les décisions suivantes ne sont pas codées en dur :

- autoriser ou non la préinscription ;
- autoriser ou non l'inscription directe ;
- exiger ou non un paiement avant confirmation ;
- exiger ou non une classe précise à la confirmation ;
- faire compter ou non une préinscription dans les capacités ;
- mode de capacité : information, avertissement ou blocage ;
- documents obligatoires pour préinscrire et pour confirmer ;
- autoriser une confirmation avec pièces manquantes ;
- format de génération du matricule.

Valeurs par défaut recommandées pour un nouvel établissement :

- préinscription autorisée ;
- inscription directe autorisée ;
- paiement non bloquant ;
- niveau obligatoire et classe facultative ;
- préinscription hors effectif confirmé, mais capacité prévisionnelle affichée ;
- dépassement de capacité avec avertissement ;
- confirmation possible avec pièces manquantes et suivi visible.

Ces politiques sont définies au niveau de l'établissement. Une surcharge annuelle peut être préparée pour une année ouverte. Après clôture, la valeur appliquée reste historisée et ne change pas rétroactivement les inscriptions.

### Règles complémentaires validées

- Au moins un contact principal est normalement requis ; une dérogation motivée nécessite un droit adapté.
- Un responsable peut être lié à plusieurs élèves et doit être recherché avant création.
- La classe est distincte du niveau et peut être affectée ultérieurement si la politique l'autorise.
- La confirmation génère la dette, indépendamment de son paiement.
- Une remise exige un motif et une autorisation.
- L'annulation n'efface ni dette ni paiement ; avoirs et remboursements sont des opérations séparées.
- Un compte utilisateur n'est pas nécessaire pour créer le dossier élève.
