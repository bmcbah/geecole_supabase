# Personnel — UX

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

`Paramètres > Personnel` présente une navigation latérale compacte par catalogue. Chaque catalogue
permet de rechercher, activer ou désactiver une valeur GeEcole, définir un libellé local sans modifier
la valeur source et ajouter une valeur propre à l'établissement. Les catégories couvertes sont les
fonctions, contrats, activités, primes, retenues, avances, congés et sanctions.
