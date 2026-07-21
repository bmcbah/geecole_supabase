# Personnel — Technique

Une personne peut exister comme membre du personnel avant d’avoir un compte utilisateur. Les rôles applicatifs et les fonctions RH sont distincts.

Les données sont isolées par `institution_id` et protégées par RLS. Les fonctions métier sont issues
d'un catalogue activable et ne sont jamais déduites du rôle applicatif. Les montants sont stockés en
`numeric(14,2)` et les durées en minutes.

Le calcul d'une paie utilise uniquement les contrats actifs et les heures `validated` non encore
rattachées à une paie. La période suit `draft -> calculated -> validated -> paid -> closed`.
La clôture interdit toute mutation des lignes. Les paiements peuvent être partiels.

La création d'un utilisateur passe par une fonction backend privilégiée ; aucune clé `service_role`
ne doit être exposée dans le client React.

Le matricule est attribué par un trigger PostgreSQL avant insertion. Une transaction verrouille la
séquence logique propre à l'établissement afin d'éviter que deux créations concurrentes reçoivent
le même numéro. Le format initial est `PER-AAAA-NNNN`; sa personnalisation par établissement reste
un lot distinct prévu par `PER-008`.

La route `/personnel/employes/:employeeId` charge la fiche et ses relations sous RLS. La création
initiale peut enregistrer la fonction principale et un contrat actif ; l'accès GeEcole n'est jamais
créé implicitement.

Les écritures des pages Présences, Congés, Paie et Catalogues passent exclusivement par
`personnel.service.ts` et restent limitées par `institution_id` et les politiques RLS. Les valeurs
locales des catalogues sont créées avec `is_system = false`; le renommage d'une valeur système
alimente uniquement `local_label`.
