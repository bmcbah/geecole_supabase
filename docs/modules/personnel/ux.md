# Personnel — UX

## Tableau de bord opérationnel

L'entrée du module est un tableau de bord orienté actions. Il présente l'effectif actif, les congés à décider, les heures à valider, les avances en cours et les périodes de paie ouvertes. La liste « À traiter » ouvre directement la fiche ou la page de travail concernée pour les contrats et documents expirants et les congés soumis.

## Parcours validés à finaliser

- La fiche Personnel guide la sortie et les transitions de contrats sans modification destructive de l'historique.
- Les avances présentent leur décision, leur décaissement, leur échéancier et leur solde.
- La préparation de paie affiche une checklist d'anomalies avant calcul et validation.
- La liste des bulletins permet les actions collectives, l'export du registre et la génération PDF/ZIP.
- Les réglages Personnel sont séparés des catalogues et regroupent matricule, paie, arrondis et alertes.

Les écrans de sécurité, profils et autorisations ne font pas partie de ce parcours tant que leur cadrage n'est pas validé.

## Navigation

- Employés
- Présences et heures
- Congés et absences
- Paie

Les contrats, fonctions, documents, avances, sanctions et accès sont gérés depuis la fiche de
l'employé ou par des actions de la page de travail. Il n'y a pas de sous-navigation métier imbriquée.

## Employés

La liste propose recherche, état, fonction, mode de rémunération et présence d'un accès. Un clic
ouvre la fiche complète : informations, emploi, contrats, rémunérations, assiduité, documents,
sanctions et accès. La création d'un accès reste une action explicite et séparée.

La création utilise un parcours guidé en quatre étapes : identité, coordonnées, emploi et
rémunération, puis vérification. Le matricule n'est pas demandé à l'utilisateur : il est généré à
l'enregistrement. Le contrat initial reste facultatif afin de permettre la création d'un dossier
administratif incomplet, clairement signalé dans la fiche.

La fiche présente d'abord une synthèse utile (fonction principale, contrat actif, mode de
rémunération et état du dossier), puis les onglets Informations, Emploi, Contrats, Assiduité,
Documents, Avances, Sanctions et Accès. Les actions non disponibles ne doivent pas être présentées
comme opérationnelles.

La liste fournit également des indicateurs simples, des filtres réinitialisables, une pagination et
des états explicites de chargement ou d'absence de résultat. Le clic sur une ligne ouvre la fiche.

## Présences et heures

La page reprend le standard visuel des listes Élèves et Frais : header d'action, indicateurs,
toolbar de filtres, DataTable dense et états vides explicites. Elle permet la saisie d'une activité
réalisée ou prévue avec employé, type d'activité, date, durée, taux spécifique facultatif et note.
Une heure planifiée n'est jamais payable directement : elle doit être marquée effectuée puis validée.
Les corrections conservent leur auteur et leur motif.

## Congés et absences

La page propose les demandes à traiter, les demandes approuvées et le volume total. Une nouvelle
demande choisit l'employé, le type, la période, le motif et peut être enregistrée en brouillon ou
soumise. Les demandes soumises peuvent être approuvées ou refusées depuis le tableau.

## Paie

La page présente la période, les anomalies et le registre. Les actions sont : ouvrir, calculer,
contrôler, valider, enregistrer un paiement, générer les bulletins et clôturer. Une période clôturée
est immuable ; les corrections passent par une régularisation ultérieure.

L'ouverture d'une période demande un libellé et des bornes. Le registre distingue fixe, variable,
gains, retenues, net, payé et reste. Le bouton disponible dépend strictement de l'état de la période.

## Paramétrage Personnel

`Paramètres > Personnel` donne accès à une page dédiée par catalogue. L'UX n'est pas pilotée par une
page générique avec un sélecteur de type : chaque catalogue possède son titre, son texte d'aide, sa
recherche et son bouton d'ajout explicite (`Ajouter une fonction`, `Ajouter un type de contrat`, etc.).
Les composants techniques communs restent partagés afin d'éviter la duplication du chargement, de
l'activation et du renommage.

Chaque page permet d'activer ou désactiver une valeur GeEcole, de définir un libellé local sans
modifier la valeur source et d'ajouter une valeur propre à l'établissement. Les pages couvertes sont
les fonctions, contrats, activités, primes, retenues, avances, congés et sanctions.

## Formulaires de la fiche

La modification de l'identité et des coordonnées, l'ajout d'une fonction, d'un contrat, d'une
avance, d'une sanction ou d'un document utilisent chacun un formulaire dédié. Les actions sont
placées dans l'onglet concerné et rechargent la fiche après succès. Un formulaire ne doit pas
fermer ni perdre les données saisies lorsqu'une validation échoue.

Le dépôt documentaire accepte les images et PDF jusqu'à 10 Mo. Les types de documents possèdent
leur propre page de paramétrage et leur propre bouton d'ajout.

Depuis un bulletin calculé, l'utilisateur peut ajouter une prime ou une retenue. Depuis un bulletin
validé, il peut enregistrer un paiement partiel ou total sans dépasser le reste à payer.
