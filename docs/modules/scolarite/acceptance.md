# Scolarité — Recette MVP

## Priorité P0

- créer un élève sans doublon ;
- reprendre un élève existant pendant une inscription ;
- empêcher deux inscriptions actives dans la même année ;
- confirmer une inscription et générer les frais attendus ;
- conserver les montants après modification du paramétrage ;
- réinscrire vers le niveau suivant ;
- gérer un redoublement avec motif ;
- filtrer la liste des élèves ;
- protéger les données par établissement et rôle ;
- conserver l'historique après annulation ou transfert.

## Ordre de livraison

1. Modèle Personne/Élève et recherche de doublons
2. Inscription et génération des frais
3. Liste et fiche élève
4. Réinscription
5. Classes et affectations
6. Documents
7. Assiduité
8. Notes et bulletins

Chaque lot doit avoir migrations pgTAP, tests unitaires, scénarios Playwright documentés et validation utilisateur avant le suivant.


## Critères supplémentaires

- Une affectation n’accepte que des périodes du cycle actif.
- Un changement d’enseignant à partir d’une période conserve l’historique.
- Deux élèves partageant un parent apparaissent dans la même fratrie calculée.
- Le terme Responsable n’apparaît pas dans les parcours utilisateurs.
