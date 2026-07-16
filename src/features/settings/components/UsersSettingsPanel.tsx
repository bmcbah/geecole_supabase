import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { TabPanel, TabView } from "primereact/tabview";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { useToast } from "../../../shared/components/toast-context";
import type { Database } from "../../../shared/lib/supabase/database.types";
import {
  deleteYearAssignment,
  listInstitutionMembers,
  listYearAssignments,
  saveYearAssignment,
  updateMembership,
} from "../services/annual-settings.service";
import {
  SettingsEntityDialog,
  type EntityField,
  type EntityValue,
} from "./SettingsEntityDialog";
import { SettingsPanelShell } from "./SettingsPanelShell";
type Assignment =
  Database["public"]["Tables"]["academic_year_user_assignments"]["Row"];
type Member = Awaited<ReturnType<typeof listInstitutionMembers>>[number];
type DialogState =
  | { kind: "member"; item: Member }
  | { kind: "assignment"; item?: Assignment }
  | null;
const roleLabels: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  secretary: "Secrétariat",
  teacher: "Enseignant",
  finance: "Finance",
};
export function UsersSettingsPanel() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    if (!institutionId) return;
    const [m, a] = await Promise.all([
      listInstitutionMembers(institutionId),
      year ? listYearAssignments(year.id) : Promise.resolve([]),
    ]);
    setMembers(m);
    setAssignments(a);
  }, [institutionId, year]);
  useEffect(() => {
    void load();
  }, [load]);
  const fields: EntityField[] =
    dialog?.kind === "member"
      ? [
          {
            key: "role",
            label: "Rôle",
            type: "select",
            required: true,
            options: Object.entries(roleLabels).map(([value, label]) => ({
              value,
              label,
            })),
          },
          {
            key: "status",
            label: "Statut",
            type: "select",
            required: true,
            options: [
              { label: "Actif", value: "active" },
              { label: "Suspendu", value: "suspended" },
            ],
          },
        ]
      : [
          {
            key: "membership_id",
            label: "Utilisateur",
            type: "select",
            required: true,
            options: members.map((item) => ({
              value: item.id,
              label:
                item.profile?.full_name ??
                roleLabels[item.role] ??
                item.user_id,
            })),
          },
          {
            key: "responsibility",
            label: "Responsabilité cette année",
            type: "textarea",
          },
          { key: "is_active", label: "Affectation active", type: "boolean" },
        ];
  const initial = useMemo<Record<string, EntityValue>>(
    () =>
      dialog?.kind === "member"
        ? { role: dialog.item.role, status: dialog.item.status }
        : {
            membership_id: dialog?.item?.membership_id ?? "",
            responsibility: dialog?.item?.responsibility ?? "",
            is_active: dialog?.item?.is_active ?? true,
          },
    [dialog],
  );
  const submit = async (values: Record<string, EntityValue>) => {
    if (!dialog || !year) return;
    setSaving(true);
    try {
      if (dialog.kind === "member")
        await updateMembership(dialog.item.id, {
          role: String(values.role) as Member["role"],
          status: String(values.status) as Member["status"],
        });
      else
        await saveYearAssignment(
          institutionId,
          year.id,
          {
            membership_id: String(values.membership_id),
            responsibility: String(values.responsibility) || null,
            is_active: Boolean(values.is_active),
          },
          dialog.item?.id,
        );
      setDialog(null);
      await load();
      notify({ severity: "success", summary: "Utilisateur enregistré" });
    } catch {
      notify({ severity: "error", summary: "Enregistrement impossible" });
    } finally {
      setSaving(false);
    }
  };
  const remove = async (id: string) => {
    try {
      await deleteYearAssignment(id);
      await load();
    } catch {
      notify({ severity: "error", summary: "Suppression impossible" });
    }
  };
  const memberName = (membershipId: string) =>
    members.find((item) => item.id === membershipId)?.profile?.full_name ??
    "Utilisateur";
  return (
    <SettingsPanelShell
      title="Utilisateurs et rôles"
      description="Comptes permanents et responsabilités pour l’année sélectionnée"
      year={year}
    >
      <TabView>
        <TabPanel header="Comptes et rôles">
          <DataTable
            value={members}
            dataKey="id"
            emptyMessage="Aucun utilisateur"
            stripedRows
          >
            <Column
              header="Utilisateur"
              body={(row: Member) => row.profile?.full_name ?? row.user_id}
            />
            <Column
              header="Rôle"
              body={(row: Member) => roleLabels[row.role]}
            />
            <Column
              header="Statut"
              body={(row: Member) => (
                <Tag
                  value={row.status === "active" ? "Actif" : "Suspendu"}
                  severity={row.status === "active" ? "success" : "warning"}
                />
              )}
            />
            <Column
              header="Actions"
              body={(row: Member) => (
                <Button
                  icon="pi pi-pencil"
                  text
                  onClick={() => setDialog({ kind: "member", item: row })}
                />
              )}
            />
          </DataTable>
        </TabPanel>
        <TabPanel header={`Affectations ${year?.name ?? "annuelles"}`}>
          <div className="panel-toolbar panel-toolbar-end">
            <span />
            <Button
              label="Nouvelle affectation"
              icon="pi pi-plus"
              disabled={year?.status !== "preparation"}
              onClick={() => setDialog({ kind: "assignment" })}
            />
          </div>
          <DataTable
            value={assignments}
            dataKey="id"
            emptyMessage="Aucune affectation"
            stripedRows
          >
            <Column
              header="Utilisateur"
              body={(row: Assignment) => memberName(row.membership_id)}
            />
            <Column field="responsibility" header="Responsabilité" />
            <Column
              header="Statut"
              body={(row: Assignment) => (
                <Tag
                  value={row.is_active ? "Active" : "Inactive"}
                  severity={row.is_active ? "success" : "secondary"}
                />
              )}
            />
            <Column
              header="Actions"
              body={(row: Assignment) => (
                <div className="table-actions">
                  <Button
                    icon="pi pi-pencil"
                    text
                    disabled={year?.status !== "preparation"}
                    onClick={() => setDialog({ kind: "assignment", item: row })}
                  />
                  <Button
                    icon="pi pi-trash"
                    text
                    severity="danger"
                    disabled={year?.status !== "preparation"}
                    onClick={() => void remove(row.id)}
                  />
                </div>
              )}
            />
          </DataTable>
        </TabPanel>
      </TabView>
      <SettingsEntityDialog
        header={
          dialog?.kind === "member"
            ? "Rôle de l’utilisateur"
            : "Affectation annuelle"
        }
        visible={Boolean(dialog)}
        loading={saving}
        fields={fields}
        initial={initial}
        onHide={() => setDialog(null)}
        onSubmit={submit}
      />
    </SettingsPanelShell>
  );
}
