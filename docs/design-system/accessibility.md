# Accessibilité GeeCole

> **Statut : décision consolidée**

GeeCole vise les principes du niveau **WCAG 2.2 AA** sans exiger une certification formelle pour la première version.

## Navigation clavier

Tout élément interactif doit être utilisable au clavier :

- `Tab` et `Maj + Tab` ;
- `Entrée` et `Espace` ;
- `Échap` ;
- touches fléchées lorsque le composant le nécessite.

Le focus doit toujours être visible.

## Modales

À l’ouverture d’une modal :

- le focus est déplacé dans la modal ;
- le focus reste contenu dans la modal ;
- `Échap` ferme la modal lorsque l’action le permet ;
- à la fermeture, le focus revient sur l’élément déclencheur.

## Couleurs et statuts

La couleur seule ne transmet jamais une information. Un statut combine toujours du texte et, si utile, une couleur ou une icône.

Exemple correct : `Suspendu`, accompagné d’un badge visuel.

## Formulaires

Chaque champ possède :

- un label réel ;
- une indication des champs obligatoires ;
- une erreur associée au champ ;
- un texte d’aide lorsque nécessaire.

Un placeholder ne remplace jamais un label.

## Icônes

Une icône seule possède un nom accessible. Une infobulle est ajoutée lorsque sa signification n’est pas évidente. Les actions importantes conservent un texte visible.

## Contraste et dimensions

- contraste suffisant entre le texte et le fond ;
- texte métier courant de 14 à 16 px ;
- zones interactives d’environ 40 px minimum ;
- les informations importantes ne sont pas rendues dans un gris trop clair.

## Animations

Les animations restent courtes et fonctionnelles. L’application respecte la préférence système de réduction des animations.

## Messages

Les messages d’erreur, de succès et d’avertissement doivent être compréhensibles sans dépendre uniquement d’une couleur ou d’une icône.
