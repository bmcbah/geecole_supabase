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

### Politiques configurables de réinscription

Les règles suivantes sont définies par l'établissement et ne sont jamais codées en dur :

- autoriser la préparation des réinscriptions avant la clôture de l'année courante ;
- autoriser une confirmation directe ou imposer un brouillon ;
- anciennes dettes : information, avertissement ou blocage ;
- exiger ou non une décision scolaire ;
- reprendre la décision du bulletin final lorsqu'elle existe ;
- autoriser sa correction uniquement aux rôles habilités et avec un motif ;
- redoublement : autorisé, soumis à dérogation ou interdit ;
- classe obligatoire ou facultative à la confirmation ;
- générer automatiquement ou manuellement les frais de réinscription ;
- autoriser ou non la préparation groupée ;
- résultat d'une préparation groupée : brouillon, préinscription ou inscription confirmée ;
- proposer le cycle suivant uniquement s'il est actif dans l'établissement pour l'année cible.

Valeurs par défaut recommandées : préparation anticipée autorisée, confirmation directe autorisée, anciennes dettes avec avertissement, décision scolaire obligatoire, décision du bulletin proposée mais corrigeable avec motif, redoublement soumis à la règle du niveau, classe facultative, frais automatiques, préparation groupée en brouillon et passage vers un cycle suivant uniquement s'il est actif.

Une surcharge peut être définie pour une année en préparation. La valeur effectivement appliquée est conservée sur la réinscription afin qu'un changement futur ne modifie pas l'historique.

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


# GeeCole — Gestion des affectations pédagogiques

Ce document complète `docs/PRODUCT_DECISIONS.md` et décrit l'organisation fonctionnelle validée des affectations, des cours générés et de leur exposition dans le module Scolarité.

## Décision — Un espace explicite « Affectations »

L'administration doit disposer d'un endroit clairement identifiable pour préparer et gérer les affectations pédagogiques.

L'affectation est la donnée de configuration qui indique :

- qui enseigne ;
- quelle matière ;
- à quelle classe ou à quel niveau utilisé comme classe ;
- pendant quelle période scolaire ;
- pour quelle année scolaire.

Une affectation n'est pas un cours saisi manuellement. Elle constitue la source à partir de laquelle GeeCole génère les éléments pédagogiques nécessaires.

## Positionnement dans le module Scolarité

La navigation cible distingue au minimum :

- **Affectations** : espace administratif de configuration ;
- **Cours** : espace généré et opérationnel ;
- **Évaluations et notes** : travail pédagogique ;
- **Assiduité** : déclaration des absences et retards ;
- **Bulletins** : calcul, contrôle et publication.

L'espace **Affectations** est visible pour les profils autorisés à organiser l'année scolaire. L'enseignant ne modifie pas lui-même ses affectations ordinaires.

## Affectation fondée sur les périodes

L'utilisateur ne saisit pas de dates de début et de fin lorsque l'affectation suit les périodes scolaires configurées dans le cycle.

Exemple :

- classe : 7e A ;
- matière : Mathématiques ;
- enseignant : M. Bah ;
- période : Semestre 1.

Les dates sont déjà connues grâce à la configuration du cycle. GeeCole les résout en interne sans les demander à l'utilisateur.

Les choix disponibles sont :

- toute l'année ;
- une ou plusieurs périodes du cycle.

Une affectation « toute l'année » est équivalente à une affectation couvrant toutes les périodes actives du cycle.

## Grille d'affectation

L'écran principal s'organise par classe.

| Matière | Toute l'année | Période 1 | Période 2 | Période 3 |
| --- | --- | --- | --- | --- |
| Mathématiques | M. Diallo | — | — | — |
| Français | — | Mme Bah | Mme Bah | M. Camara |
| Physique | M. Sylla | — | — | — |

Le mode « toute l'année » évite de répéter le même enseignant sur chaque période. Lorsqu'une matière change d'enseignant, la ligne bascule vers une affectation par période.

## Primaire

Une classe peut recevoir un enseignant principal.

L'action **Appliquer à toutes les matières** génère les affectations de cet enseignant pour toutes les matières héritées du cycle et pour les périodes choisies.

Les matières confiées à un spécialiste deviennent des exceptions, par exemple :

- anglais : M. Bah ;
- informatique : Mme Camara ;
- sport : M. Sylla.

L'affectation spécifique d'une matière est prioritaire sur l'affectation principale de la classe.

## Collège et lycée

L'organisation normale est une affectation par matière et par classe.

L'établissement peut néanmoins utiliser les opérations groupées suivantes :

- sélectionner plusieurs matières et leur affecter le même enseignant ;
- recopier les affectations d'une classe vers une autre ;
- reprendre les affectations de l'année précédente ;
- appliquer un enseignant à toutes les périodes ;
- remplacer un enseignant à partir d'une période donnée.

Toute recopie crée des affectations propres à l'année cible et ne modifie jamais l'historique source.

## Génération des cours

Après validation d'une affectation, GeeCole rend automatiquement disponible le cours correspondant.

Le cours est résolu à partir de :

`année scolaire + classe + matière + période + enseignant affecté`

Le cours apparaît ensuite au bon endroit :

- dans l'espace de travail de l'enseignant ;
- dans la fiche de la classe ;
- dans les listes de création d'évaluation ;
- dans la saisie des notes ;
- dans l'assiduité lorsqu'une absence est rattachée à un cours ;
- dans l'emploi du temps lorsqu'il sera développé.

L'administration ne crée pas une seconde fois le cours après l'affectation.

## Changement d'enseignant

Un changement s'effectue à partir d'une période scolaire.

Exemple :

- Mathématiques, 7e A, Semestre 1 : M. Diallo ;
- Mathématiques, 7e A, Semestre 2 : Mme Camara.

Les évaluations et notes du premier semestre restent rattachées à M. Diallo. Les nouvelles opérations du second semestre utilisent Mme Camara.

L'historique n'est jamais réécrit rétroactivement.

## Moteur de résolution

Pour une classe, une matière et une période données, GeeCole détermine l'enseignant effectif selon cet ordre :

1. affectation spécifique de la matière pour la période ;
2. affectation de la matière pour toute l'année ;
3. affectation principale de la classe pour la période ;
4. affectation principale de la classe pour toute l'année ;
5. aucun enseignant affecté.

Ce même moteur doit être utilisé dans tous les écrans afin d'éviter des résultats contradictoires.

## Contrôles

GeeCole empêche :

- deux enseignants spécifiques pour la même classe, la même matière et la même période ;
- une affectation vers une matière inactive ;
- une affectation vers une classe d'une autre année scolaire ;
- une affectation vers un enseignant inactif ;
- la suppression rétroactive d'une affectation déjà utilisée par une évaluation, une note ou un bulletin publié.

Une affectation manquante reste autorisée pendant la préparation de l'année, mais elle est signalée comme configuration incomplète et bloque seulement les actions qui en dépendent.

## Principe final

Le gestionnaire configure les affectations une seule fois. GeeCole génère ensuite les cours et les affiche automatiquement aux personnes concernées, dans les écrans appropriés.
