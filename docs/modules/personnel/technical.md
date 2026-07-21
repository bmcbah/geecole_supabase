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
