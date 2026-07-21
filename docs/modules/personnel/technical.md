# Personnel — Technique

## Extension workflows RH et paie

La migration `20260721220000_complete_personnel_workflows.sql` ajoute un paramétrage par établissement, les relations d'avenant/renouvellement, les échéanciers d'avances, l'audit fonctionnel et la vue d'alertes opérationnelles. Les transitions de sortie, contrat et avance passent par des fonctions transactionnelles. Un trigger interdit toute mutation d'une ligne de paie appartenant à une période clôturée.

Les régularisations portent un effet explicite `gain` ou `deduction` et peuvent référencer la période d'origine. Les paramètres actuels imposent la devise GNF et permettent le préfixe/année/longueur du matricule, l'arrondi, les seuils d'alerte et le mode de paiement par défaut.

La vue `personnel_operational_alerts` est `security_invoker` afin de conserver les politiques RLS des tables sources. Ce lot ne définit pas la future matrice de capacités et ne remplace pas le cadrage sécurité.

Une personne peut exister comme membre du personnel avant d’avoir un compte utilisateur. Les rôles applicatifs et les fonctions RH sont distincts.

Les données sont isolées par `institution_id` et protégées par RLS. Les fonctions métier sont issues
d'un catalogue activable et ne sont jamais déduites du rôle applicatif. Les montants sont stockés en
`numeric(14,2)` et les durées en minutes.

Le contrat stocke directement `hourly_rate` et `weekly_hours` pour les modes `hourly` et `mixed`.
La contrainte `employee_contracts_complete_compensation_check` bloque les nouvelles écritures
incomplètes. Elle est créée `NOT VALID` pour préserver les contrats historiques à corriger.

Le calcul d'une paie utilise uniquement les contrats actifs et les heures `validated` non encore
rattachées à une paie. La période suit `draft -> calculated -> validated -> paid -> closed`.
La clôture interdit toute mutation des lignes. Les paiements peuvent être partiels.

La création d'un utilisateur passe par une fonction backend privilégiée ; aucune clé `service_role`
ne doit être exposée dans le client React.

Le matricule est attribué par un trigger PostgreSQL avant insertion. Une transaction verrouille la
séquence logique propre à l'établissement afin d'éviter que deux créations concurrentes reçoivent
le même numéro. Le format initial est `PER-AAAA-NNNN`; sa personnalisation par établissement reste
un lot distinct prévu par `PER-008`.

La route `/personnel/employes/:employeeId` charge la fiche et ses relations sous RLS. Les routes
`/personnel/avances` et `/personnel/sanctions` portent les traitements collectifs et acceptent un
filtre `employee` dans l'URL. La création
initiale peut enregistrer la fonction principale et un contrat actif ; l'accès GeEcole n'est jamais
créé implicitement.

Les écritures des pages Présences, Congés, Paie et Catalogues passent exclusivement par
`personnel.service.ts` et restent limitées par `institution_id` et les politiques RLS. Les valeurs
locales des catalogues sont créées avec `is_system = false`; le renommage d'une valeur système
alimente uniquement `local_label`.

Chaque route métier et chaque catalogue de paramétrage possède son propre fichier de page. Les
éléments strictement techniques et identiques (chargement, tableau, activation et renommage) sont
partagés dans `PersonnelCatalogSettings`, tandis que le titre, l'aide et l'action d'ajout restent
définis dans chaque page.

## Écritures issues des formulaires

Les formulaires de fiche écrivent dans `employees`, `employee_functions`, `employee_contracts`,
`salary_advances`, `employee_sanctions` et `employee_documents`. Les fichiers sont déposés dans le
bucket privé `school-admin`, sous le préfixe de l'établissement et du salarié.

Les ajustements et paiements de paie passent respectivement par `add_payroll_adjustment` et
`record_payroll_payment`. Ces RPC verrouillent la ligne du bulletin, contrôlent son état et mettent
à jour les agrégats dans la même transaction. Un ajustement n'est possible qu'à l'état `calculated`
et un paiement uniquement après validation.
