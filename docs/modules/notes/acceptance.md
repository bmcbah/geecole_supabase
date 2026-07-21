# Notes — Critères d’acceptation

- « Évaluation » n’est pas une entité principale.
- Une note exige un cours accessible.
- Le barème vient du cycle annuel et n’est pas modifiable dans la note.
- Une note et un bulletin conservent le barème figé utilisé lors de leur création.
- La saisie existe par classe et par élève.
- La classe charge automatiquement ses élèves.
- Absent, dispensé et reporté sont distincts.
- Reporté bloque moyennes et bulletin.
- Une affectation couvre toute l’année ou certaines périodes.
- Le coefficient est saisi lors de l’affectation.
- Le TreeView est filtré par permissions.
- Les modifications sont auditées.
- L’ouverture, la clôture et la réouverture sont possibles uniquement depuis
  Gestion des périodes.
- La page Appréciations affiche également les appréciations manquantes.
- Le contrôle des moyennes est contextualisé par période et explique chaque
  blocage.
- Un rejet de bulletin exige un motif et reste tracé sur sa version.
- Le modèle de bulletin enregistré est appliqué à l’aperçu et à l’impression.

# Formules versionnées

- une formule peut être affectée à un cycle ou à un niveau, jamais à une période ;
- une formule de niveau remplace celle du cycle pour toutes les périodes du niveau ;
- une seule version est active sur un même périmètre ;
- modifier une formule crée une nouvelle version sans altérer l'ancienne ;
- un bulletin sans formule applicable est bloqué avec un motif explicite ;
- le bulletin conserve le snapshot de la version utilisée ;
- la moyenne matière respecte l'expression versionnée et les types de note utilisés comme variables ;
- la moyenne générale respecte les coefficients des cours.
