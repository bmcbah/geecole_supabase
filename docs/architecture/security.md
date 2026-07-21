# GeEcole — Sécurité applicative et validation avant production

## Statut

- **Statut :** officiel
- **Décision validée :** 21 juillet 2026
- **Référentiel minimal :** OWASP ASVS niveau 2
- **Périmètre :** frontend, API Supabase/PostgREST, PostgreSQL, RPC, RLS, fonctions serveur, dépendances, déploiement et tests de sécurité

Ce document fixe le socle de sécurité transversal. Les exigences d’autorisation détaillées restent définies dans `docs/architecture/authorization.md`.

## 1. Principes obligatoires

1. La sécurité est appliquée côté base ou serveur ; le frontend ne constitue jamais une barrière de sécurité.
2. Toute donnée est isolée par établissement et, lorsque requis, par année et périmètre métier.
3. Le moindre privilège s’applique aux profils applicatifs, rôles PostgreSQL, fonctions, secrets et traitements techniques.
4. Les erreurs retournées au client ne divulguent aucune information technique sensible.
5. Les contrôles de sécurité sont automatisés dans la CI et complétés par des tests dynamiques et un pentest manuel.
6. Une validation de pentest repose sur des preuves, des critères de sortie et un contre-test.

## 2. Non-divulgation des erreurs

PostgreSQL et PostgREST peuvent produire des champs techniques tels que `message`, `details`, `hint` et `code`. En production, aucune réponse accessible au client ne doit révéler :

- requête SQL, schéma, table, colonne, contrainte ou fonction interne ;
- contenu de ligne ou donnée personnelle non nécessaire ;
- stack trace, chemin interne ou version technique exploitable ;
- secret, jeton, clé, chaîne de connexion ou variable d’environnement ;
- détail permettant de distinguer l’existence d’une ressource non autorisée.

Le masquage dans React est insuffisant : la réponse HTTP brute doit elle-même être sûre.

### 2.1 Contrat d’erreur public

Les opérations exposées retournent uniquement une erreur fonctionnelle contrôlée :

```json
{
  "code": "NOTE_VALIDATION_FAILED",
  "debugMessage": "La note ne respecte pas le barème applicable.",
  "correlationId": "identifiant-non-sensible"
}
```

Règles :

- catalogue stable de codes métier ;
- `debugMessage` diagnostique français, nettoyé et sans détail interne, y compris en production ;
- le frontend n’affiche jamais `debugMessage` : il traduit `code` via son catalogue i18n ;
- statut HTTP cohérent ;
- identifiant de corrélation généré côté serveur ;
- aucun contenu fourni par l’utilisateur recopié sans neutralisation ;
- même réponse pour les ressources inexistantes et non autorisées lorsque leur distinction créerait une fuite.

### 2.2 Journalisation interne

Les détails techniques restent dans les journaux serveur avec :

- accès restreint ;
- chiffrement et rétention définie ;
- corrélation avec la réponse publique ;
- filtrage des secrets et données personnelles ;
- intégrité et horodatage ;
- alertes sur les erreurs de sécurité répétées.

Les erreurs attendues ne doivent pas être journalisées avec des données sensibles. Les journaux ne sont jamais accessibles au frontend.

### 2.3 Mise en œuvre

- conserver les contraintes SQL comme dernière ligne de défense ;
- utiliser des RPC contrôlées pour les opérations sensibles ;
- traduire explicitement les erreurs attendues en codes métier ;
- capturer les erreurs inattendues à une frontière serveur qui renvoie un code et un message diagnostique génériques ;
- ne pas construire de message SQL dynamique contenant une donnée sensible ;
- tester la réponse HTTP brute et les en-têtes, pas seulement le rendu de l’interface.

L’architecture doit documenter la frontière chargée de normaliser les erreurs avant implémentation. Une exposition directe de tables PostgREST qui peut renvoyer des détails techniques doit être corrigée ou placée derrière une RPC ou une fonction serveur appropriée.

## 3. Contrôles CI obligatoires

À chaque pull request :

- SAST ;
- détection de secrets ;
- audit des dépendances et licences selon la politique du projet ;
- tests RLS positifs et négatifs ;
- tests d’isolation interétablissements ;
- tests d’élévation horizontale et verticale ;
- contrôle des fonctions `SECURITY DEFINER` ;
- tests de non-divulgation des erreurs ;
- tests des migrations Supabase sur une base éphémère.

Un échec critique de ces contrôles bloque la fusion.

## 4. Contrôles de préproduction

Sur un environnement représentatif et sans données réelles non nécessaires :

- DAST authentifié et non authentifié ;
- appels directs à l’API Supabase en contournant React ;
- tests IDOR/BOLA ;
- injections SQL, XSS et falsification de paramètres ;
- contrôle des téléversements ;
- sessions, expiration, révocation et réauthentification ;
- limitation de débit et protection contre l’abus ;
- en-têtes HTTP, CORS, CSP et configuration de déploiement ;
- vérification des réponses d’erreur brutes ;
- tests RLS avec plusieurs établissements, profils et années.

## 5. Pentest et autorisation de mise en production

Un pentest manuel indépendant est obligatoire avant la première mise en production contenant des données réelles, puis :

- après une modification majeure de l’authentification, des RLS ou de l’architecture exposée ;
- après une vulnérabilité critique affectant le modèle de sécurité ;
- périodiquement selon l’analyse de risque, au minimum une fois par an pour la cible de production.

Le pentest couvre au minimum le périmètre OWASP ASVS niveau 2 applicable, les API Supabase, les RLS, les RPC, l’isolation interétablissements, l’élévation de privilèges et la non-divulgation des erreurs.

### 5.1 Critères de validation

Le pentest est déclaré validé uniquement si :

- le périmètre, la version et l’environnement testés sont identifiés ;
- le rapport et les preuves sont conservés avec accès restreint ;
- aucune vulnérabilité critique ou haute n’est ouverte ;
- chaque vulnérabilité moyenne acceptée possède un responsable, une justification, une échéance et une validation formelle du risque ;
- les corrections font l’objet d’un contre-test ;
- les écarts ASVS non applicables ou non satisfaits sont justifiés ;
- la décision de mise en production est tracée.

Une simple exécution de scanner ou une attestation sans rapport ne constitue pas un pentest validé.

## 6. Gestion des vulnérabilités

- criticité évaluée avec contexte métier et technique ;
- correction immédiate ou blocage de mise en production pour les vulnérabilités critiques et hautes ;
- absence d’acceptation permanente par défaut ;
- ticket, responsable et échéance pour chaque écart accepté ;
- contre-test et preuve de clôture ;
- notification et analyse d’impact lorsqu’une vulnérabilité peut concerner des données personnelles ou plusieurs établissements.

## 7. Scénarios de sécurité minimaux

- accès horizontal à un autre élève, cours, classe ou employé ;
- accès vertical par attribution ou cumul abusif de profils ;
- accès à un autre établissement ;
- contournement d’un module désactivé ou d’une année verrouillée ;
- lecture inter-cours non autorisée ou écriture malgré le mode lecture seule ;
- manipulation d’identifiants dans une RPC ;
- appel direct d’une fonction non prévue pour `authenticated` ;
- fuite PostgreSQL/PostgREST dans `message`, `details`, `hint` ou les en-têtes ;
- exposition de secrets dans le bundle frontend ou les journaux ;
- modification ou suppression d’un événement d’audit ;
- utilisation abusive du `service_role`.

## 8. Preuves et gouvernance

Les livrables suivants sont conservés :

- version du référentiel ASVS utilisée et matrice de conformité ;
- rapports SAST, dépendances, secrets et DAST ;
- résultats des tests RLS et de non-divulgation ;
- rapport de pentest et contre-test ;
- décisions d’acceptation du risque ;
- historique des corrections et date de revalidation.

Le détail des vulnérabilités ne doit pas être publié dans un dépôt public. La documentation publique décrit les exigences ; les rapports et preuves sensibles sont stockés dans un espace à accès restreint.

## 9. Écarts connus

Au 21 juillet 2026 :

- la normalisation des erreurs techniques n’est pas encore garantie sur toutes les routes ;
- des réponses PostgreSQL/PostgREST peuvent exposer des détails internes ;
- les contrôles CI et préproduction décrits ici ne sont pas tous implémentés ;
- aucun élément du dépôt ne permet encore d’attester un pentest validé au sens de ce document.

Ces écarts doivent être suivis comme travaux de sécurité. Ce document ne prétend pas que l’application est actuellement certifiée ou pentestée.
