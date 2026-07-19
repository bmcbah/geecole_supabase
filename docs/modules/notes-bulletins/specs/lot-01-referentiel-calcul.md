# Lot 1 — Référentiel pédagogique et formules de calcul

## Objectif

Permettre aux établissements de définir leurs propres règles de calcul sans imposer de pondérations ou de modèle pédagogique GeeCole.

## Contexte annuel

- L’année scolaire vient du contexte global de l’application.
- Elle n’est jamais redemandée dans les écrans du module.
- Une année clôturée ou archivée reste consultable en lecture seule.

## Types d’évaluation

- Un type d’évaluation est descriptif.
- Il contient un nom, un code, une description, une icône, une couleur, un barème par défaut, un ordre et un statut.
- Son code devient une variable de formule, par exemple `EVAL`, `COMP` ou `ORAL`.
- Il ne porte aucune pondération métier.
- L’ancienne colonne `weight` reste temporairement neutralisée à `1` pour compatibilité.

## Formules

Les formules appartiennent aux établissements. GeeCole les valide, les résout et les exécute sans choisir la règle pédagogique.

```text
(EVAL + COMP * 2) / 3
```

`grading_formulas.expression` est la source de vérité. `grading_formulas.definition` contient uniquement les métadonnées compilées : version du langage, variables utilisées et politique de valeurs manquantes.

### Langage V1

La V1 accepte :

- les codes des types d’évaluation actifs ;
- les nombres entiers ou décimaux ;
- `+`, `-`, `*`, `/` ;
- les parenthèses ;
- le signe moins unaire.

Les fonctions `AVG`, `SUM`, `MIN`, `MAX` et `IF` restent hors périmètre.

### Valeurs manquantes

- `block` : le calcul est bloqué lorsqu’une variable utilisée ne possède aucune note exploitable ;
- `ignore` : une variable absente est remplacée par `0`.

Les évaluations `absent`, `dispensé` ou `non noté` ne sont pas intégrées à la moyenne du type.

## Périmètre de la formule

La formule et son affectation sont un seul objet configuré dans un formulaire unique.

Une formule peut cibler :

- un cycle annuel ;
- un niveau annuel ;
- une matière annuelle ;
- toute l’année ;
- ou une période réelle de `academic_periods`.

Une formule de période stocke `period_id`. Une formule annuelle possède `period_id = null`.

Les contraintes SQL vérifient que le cycle, le niveau, la matière et la période appartiennent au même établissement et à la même année scolaire.

## Résolution

GeeCole sélectionne la formule active compatible la plus spécifique :

1. période + matière + niveau + cycle ;
2. matière + niveau + cycle ;
3. niveau + cycle ;
4. cycle ;
5. formule annuelle générale.

À spécificité égale, une formule marquée par défaut est prioritaire, puis la version la plus récente.

L’implémentation se trouve dans :

```text
src/modules/settings/domain/grading-formula-resolution.ts
```

## Agrégation des évaluations

Pour chaque variable utilisée par la formule :

1. GeeCole sélectionne les évaluations du type correspondant ;
2. seules les notes au statut `graded` sont retenues ;
3. chaque note est normalisée vers le barème cible ;
4. la moyenne arithmétique des notes normalisées devient la valeur de la variable ;
5. l’expression est ensuite exécutée.

Exemple :

```text
EVAL : 8/10 et 16/20
Valeurs normalisées sur 20 : 16 et 16
EVAL = 16
```

## Versionnement

La version augmente lorsque changent :

- l’expression ;
- la définition compilée ;
- le cycle ;
- le niveau ;
- la matière ;
- la portée annuelle/période ;
- la période.

Les futurs bulletins devront conserver l’identifiant et la version réellement utilisés.

## Parcours UI

```text
Paramétrage
  → Types d’évaluation
  → Formules de calcul
      → Formule et périmètre
      → Tester la formule
```

## Migration

La configuration est portée par :

```text
supabase/migrations/20260719193000_rebuild_grading_configuration.sql
```

Cette migration :

- transforme les anciennes définitions pondérées avant de poser les nouvelles contraintes ;
- utilise la table réelle `academic_periods` ;
- supprime l’ancien modèle d’affectation séparé ;
- installe les clés étrangères, contrôles de cohérence et index de résolution.

## Implémenté

- catalogue des types d’évaluation ;
- parseur d’expression sans `eval` JavaScript ;
- validation et simulation ;
- périmètre directement intégré à la formule ;
- résolution de la formule la plus spécifique ;
- normalisation des barèmes ;
- agrégation des notes par code de type ;
- calcul expliqué ;
- tests unitaires du parseur, de la résolution et de l’agrégation.

## Suite

- tables d’évaluations et de notes ;
- services de saisie ;
- cahier de notes enseignant ;
- coefficients des matières dans la moyenne générale ;
- snapshots et verrouillage des bulletins.
