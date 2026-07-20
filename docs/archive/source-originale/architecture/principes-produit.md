# Principes produit GeeCole

Ce document constitue la boussole de conception du produit.

## 1. L'établissement décide

GeeCole ne doit pas imposer une règle métier lorsqu'elle varie réellement d'un établissement à l'autre. Le produit fournit des choix guidés et exécute la politique retenue.

## 2. Adaptable, pas infiniment configurable

Chaque paramètre a un coût de compréhension, de test et de maintenance. Une option n'est ajoutée que si elle répond à un besoin fréquent ou structurant.

## 3. Très puissant à l'intérieur, simple à l'extérieur

L'architecture peut reposer sur des règles riches, mais l'utilisateur répond à des questions métier simples. Aucun moteur de règles technique n'est exposé dans la V1.

## 4. La simplicité est une fonctionnalité

Les parcours courants doivent être courts, lisibles et guidés. Les cas rares restent dans des paramètres avancés ou sont traités par des exceptions contrôlées.

## 5. Les automatismes restent contrôlables

GeeCole peut détecter, proposer, préremplir et recalculer. Les opérations sensibles ne sont pas appliquées silencieusement lorsqu'elles modifient une situation scolaire ou financière.

## 6. Tout est traçable

Les opérations sensibles sont historisées. En particulier, un paiement validé n'est pas supprimé : il est annulé ou corrigé par une contre-opération avec motif, auteur et date.

## 7. Le contexte de travail est explicite

GeeCole fonctionne toujours dans le contexte suivant :

- établissement actif ;
- année scolaire sélectionnée.

Les données historiques restent accessibles, mais ne sont jamais mélangées silencieusement avec les opérations courantes.

## 8. L'année scolaire renouvelle l'école

L'élève, la famille et les responsables sont durables. L'organisation, les paramétrages et l'activité sont principalement annuels et peuvent être préparés par duplication contrôlée.

## 9. Une fonctionnalité doit résoudre un vrai problème

Avant d'ajouter une option, vérifier :

- combien d'établissements en ont besoin ;
- si le besoin peut être couvert plus simplement ;
- si la fonctionnalité appartient au bon module ;
- si elle reste compréhensible sans formation lourde.
