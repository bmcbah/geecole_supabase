# Personnel — Critères d’acceptation

Un enseignant peut être affecté sans compte. Un compte désactivé ne supprime pas la personne ni l’historique.

- Une fiche reçoit un matricule unique par établissement et reste permanente.
- Un employé peut cumuler plusieurs fonctions, avec une seule fonction principale active.
- Les catalogues GeEcole peuvent être activés, désactivés, renommés localement et complétés.
- Un contrat choisit un mode fixe, horaire, séance, forfaitaire, mixte ou non rémunéré.
- Une heure prévue n'entre jamais dans la paie ; seule une heure validée est calculée.
- Le brut additionne fixe, heures et gains ; le net retranche retenues et remboursements d'avances.
- Un paiement partiel conserve un reste à payer.
- Une période clôturée est immuable et toute correction ultérieure est historisée.
- Les sanctions sont limitées aux profils explicitement autorisés.
- Le parcours d'ajout comporte les étapes Identité, Contacts, Emploi et Vérification.
- Le matricule est généré sans saisie manuelle et deux créations concurrentes ne peuvent pas recevoir le même numéro.
- La création d'une fiche peut inclure une fonction principale et un contrat initial facultatif.
- Le clic sur un employé ouvre une fiche structurée sans créer automatiquement de compte d'accès.
- Un administrateur peut saisir une activité réalisée ou prévue, puis valider uniquement une activité effectuée.
- Un administrateur peut créer une demande de congé en brouillon ou soumise puis prendre une décision.
- Une période de paie peut être ouverte, calculée, validée et clôturée uniquement selon le workflow autorisé.
- Chaque catalogue Personnel permet l'activation, le renommage local et l'ajout d'une valeur d'établissement.
- Chaque catalogue possède sa propre route, sa page et un bouton d'ajout nommé selon son domaine.
- L'ajout depuis une page crée toujours la valeur dans le catalogue affiché, sans sélection globale du type.
- Les listes Personnel utilisent les mêmes conventions de toolbar, DataTable, filtres et états vides que les modules Élèves et Frais.

- [ ] La fiche peut être modifiée sans modifier le matricule automatique.
- [ ] Une fonction principale supplémentaire respecte l'unicité en base et affiche l'erreur utile.
- [ ] Un contrat actif supplémentaire est refusé tant que le contrat actif courant n'est pas clos.
- [ ] Un document PDF ou image de 10 Mo maximum peut être déposé depuis la fiche.
- [ ] Une prime ou retenue modifie immédiatement la composition et le net du bulletin calculé.
- [ ] Un paiement partiel met à jour le payé, le reste et le statut sans pouvoir dépasser le net.
