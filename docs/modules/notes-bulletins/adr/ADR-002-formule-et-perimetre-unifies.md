# ADR-002 — Formule et périmètre unifiés

## Statut

Accepté le 19 juillet 2026.

## Décision

Une formule de calcul et son affectation constituent un seul objet métier et sont configurées dans un seul formulaire.

Chaque formule doit obligatoirement préciser son périmètre temporel :

- `year` : formule applicable à toute l’année scolaire ;
- `period` : formule applicable à une période identifiée par son numéro dans le calendrier du cycle.

Le numéro de période est utilisé à la place d’un code libre saisi manuellement. La période devra être sélectionnée depuis la configuration annuelle du cycle dès que le référentiel de périodes sera matérialisé par une table dédiée.

Le même formulaire contient également les cibles pédagogiques facultatives : cycle annuel, niveau annuel et matière annuelle.

La formule métier reste une expression écrite avec les codes des types d’évaluation, par exemple `(EVAL + COMP * 2) / 3`.

## Conséquences

- suppression de la table et du formulaire séparés `grading_formula_assignments` ;
- stockage du périmètre directement dans `grading_formulas` ;
- contrôle SQL garantissant qu’une formule vise soit l’année, soit une période valide ;
- unicité de la formule active par défaut pour un même périmètre ;
- résolution future fondée directement sur les colonnes de `grading_formulas`.

## Migration

Les trois migrations précédentes du sprint ont été retirées et remplacées par `20260719193000_rebuild_grading_configuration.sql`.

La migration supprime les vestiges éventuels du modèle d’affectation séparé afin de supporter une base ayant subi une application partielle des anciennes migrations.
