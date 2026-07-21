# Bulletins — Parcours et écrans

## Pages

1. Tableau de bord Bulletins
2. Liste des générations
3. Assistant de génération
4. Rapport de génération
5. Liste des bulletins
6. Prévisualisation
7. Validation
8. Publication
9. Historique des versions
10. Modèles et paramètres

## Liste des générations

Colonnes :

- période ;
- périmètre ;
- élèves ;
- statut ;
- généré par ;
- date ;
- résultat ;
- actions.

Action principale :

```text
[ Générer des bulletins ]
```

Filtres : année, période, cycle, niveau, classe, statut et date.

## Assistant dynamique

### Étape 1 — Périmètre

- cycle obligatoire ;
- niveau facultatif ;
- classe facultative après le niveau ;
- élève facultatif après la classe.

Le périmètre « Toute l'école » n'est pas proposé, car les périodes diffèrent selon les cycles.

### Étape 2 — Période

Après le choix du cycle, la période ouverte de ce cycle est présélectionnée. L'utilisateur peut la remplacer uniquement par une autre période du même cycle.

### Étape 3 — Contrôles

- résultats reportés ;
- notes manquantes ;
- cours sans coefficient ;
- formules absentes ;
- appréciations obligatoires ;
- inscriptions inactives ;
- bulletins déjà publiés.

Résumé :

```text
684 analysés
642 prêts
28 avertissements
14 bloqués
```

L’utilisateur peut générer uniquement les bulletins prêts.

### Étape 4 — Options

Selon configuration :

- rang ;
- moyenne de classe ;
- coefficients ;
- absences et retards ;
- appréciations ;
- signatures ;
- modèle ;
- langue ;
- PDF individuels ou ZIP.

### Étape 5 — Confirmation

Résumé complet avant lancement.

## Rapport de génération

Résumé global puis liste par élève :

| Élève      | Classe | Résultat | Détail                            | Action |
| ---------- | ------ | -------- | --------------------------------- | ------ |
| Awa Diallo | 7A     | Généré   | Aucun problème                    | Voir   |
| Fatou Sow  | 7B     | Bloqué   | Résultat reporté en mathématiques | Ouvrir |

Regroupement des problèmes :

- reportés ;
- notes manquantes ;
- appréciations ;
- coefficients ;
- formules ;
- configuration.

Actions :

- ouvrir le cahier ;
- ouvrir l’élève ;
- ouvrir l’affectation ;
- relancer les corrigés ;
- exporter le rapport ;
- télécharger les documents.

## Liste des bulletins

Filtres : année, période, cycle, niveau, classe, statut, version et élève.

Actions : prévisualiser, corriger à la source, valider, publier, télécharger et voir les versions.

## Validation

Une page regroupe les bulletins à valider.

Actions :

- ouvrir ;
- prévisualiser ;
- valider ;
- rejeter avec motif ;
- valider une sélection.

Une seule validation suffit.

## Publication

Canaux configurables :

- portail parent ;
- portail élève ;
- téléchargement ;
- impression ;
- courriel.

## Historique

```text
Bulletin Période 1
├── V1 — publiée le 15 décembre
└── V2 — publiée le 18 décembre après correction
```

## Navigation détaillée par profil

Voir [Navigation par profil](navigation.md).
