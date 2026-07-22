# Scolarité — Couverture d’implémentation

Ce document est additif et ne remplace pas `business.md`.

## Espaces de travail ajoutés

- Admissions et inscriptions
- Assiduité
- Classes et affectations
- Responsables
- Documents obligatoires
- Imports contrôlés
- Attestations

## Règles techniques couvertes

- transitions d’inscription historisées ;
- capacités de classes en mode information, avertissement ou blocage ;
- affectation groupée sans modification de l’historique source ;
- rôles des responsables modifiables par liaison élève-responsable ;
- protection contre la suppression du dernier responsable ;
- détection de doublons probables ;
- conservation des lignes brutes d’import ;
- certificats avec instantané immuable et séquence dédiée ;
- notifications internes créées lors d’une absence ou d’un retard ;
- données médicales dans une table à accès administratif restreint ;
- lecture paginée serveur disponible via `list_students_page`.

## Compatibilité

Les migrations sont additives. Aucune inscription confirmée, dette, affectation historique ou pièce existante n’est supprimée ou réécrite en masse.
