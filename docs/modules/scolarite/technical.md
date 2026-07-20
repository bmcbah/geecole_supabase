# Scolarité — Spécifications techniques

## Agrégats principaux

- `students` : identité scolaire stable et matricule ;
- `student_guardians` : liens responsables/élèves ;
- `enrollments` : parcours annuel ;
- `classes` : divisions annuelles d'un niveau ;
- `class_assignments` : affectations historisées ;
- `enrollment_charges` : frais instantanés générés ;
- `attendance_records` : absences et retards ;
- `student_documents` : métadonnées et stockage sécurisé ;
- notes et bulletins dans le module Évaluations.

## Contraintes

- unique `(institution_id, student_number)` ;
- unique inscription non annulée `(academic_year_id, student_id)` ;
- cohérence année/niveau/classe par clés composites ;
- RPC transactionnelle pour confirmer inscription et réinscription ;
- RLS par établissement et rôle ;
- Storage privé avec URLs signées ;
- journal d'audit pour statut, niveau, classe et frais.

## Architecture frontend

```text
src/modules/schooling/
  students/
  enrollment/
  reenrollment/
  classes/
  guardians/
  attendance/
  documents/
```

Chaque sous-module garde des composants petits, des schémas Zod, un service Supabase et ses tests.


## Consolidation affectations

Les affectations sont liées à une ou plusieurs périodes. Les dates effectives sont résolues depuis les périodes. Le cours a pour identité métier : année, classe/niveau, matière, période.
