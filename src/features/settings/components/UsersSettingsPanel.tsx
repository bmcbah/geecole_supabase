import { useCallback, useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { MultiSelect } from "primereact/multiselect";
import { TabPanel, TabView } from "primereact/tabview";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { useToast } from "../../../shared/components/toast-context";
import type { AppRole } from "../../../shared/lib/supabase/database.types";
import {
  deletePerson,
  invitePerson,
  listPeople,
  listPersonInvitations,
  savePerson,
} from "../services/annual-settings.service";
import { SettingsPanelShell } from "./SettingsPanelShell";

type Person = Awaited<ReturnType<typeof listPeople>>[number];
type Invitation = Awaited<ReturnType<typeof listPersonInvitations>>[number];
const roleOptions: { label: string; value: AppRole }[] = [
  { label: "Élève", value: "student" },
  { label: "Parent", value: "parent" },
  { label: "Enseignant", value: "teacher" },
  { label: "Secrétariat", value: "secretary" },
  { label: "Finance", value: "finance" },
  { label: "Administrateur", value: "admin" },
];
const roleLabel = (role: AppRole) =>
  roleOptions.find((item) => item.value === role)?.label ?? role;
const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  status: "active",
  roles: ["student"] as AppRole[],
};

export function UsersSettingsPanel() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [people, setPeople] = useState<Person[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [editing, setEditing] = useState<Person | null | undefined>(undefined);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [invitationLink, setInvitationLink] = useState("");
  const load = useCallback(async () => {
    if (!institutionId) return;
    const [persons, invites] = await Promise.all([
      listPeople(institutionId),
      listPersonInvitations(institutionId),
    ]);
    setPeople(persons);
    setInvitations(invites);
  }, [institutionId]);
  useEffect(() => {
    void load();
  }, [load]);
  const open = (person?: Person) => {
    setEditing(person ?? null);
    setForm(
      person
        ? {
            firstName: person.first_name,
            lastName: person.last_name,
            email: person.email ?? "",
            phone: person.phone ?? "",
            status: person.status,
            roles: person.roles,
          }
        : emptyForm,
    );
  };
  const submit = async () => {
    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      form.roles.length === 0
    )
      return;
    setSaving(true);
    try {
      await savePerson(institutionId, { id: editing?.id, ...form });
      setEditing(undefined);
      await load();
      notify({ severity: "success", summary: "Personne enregistrée" });
    } catch {
      notify({
        severity: "error",
        summary: "Enregistrement impossible",
        detail: "Vérifiez les informations et l’unicité de l’e-mail.",
      });
    } finally {
      setSaving(false);
    }
  };
  const remove = async (id: string) => {
    try {
      await deletePerson(id);
      await load();
    } catch {
      notify({
        severity: "error",
        summary: "Suppression impossible",
        detail: "Cette personne possède peut-être déjà des données scolaires.",
      });
    }
  };
  const invite = async (person: Person) => {
    try {
      const token = await invitePerson(person.id);
      const link = `${window.location.origin}/invitation?token=${token}`;
      setInvitationLink(link);
      await load();
    } catch {
      notify({
        severity: "error",
        summary: "Invitation impossible",
        detail: "Une adresse e-mail est obligatoire.",
      });
    }
  };
  return (
    <SettingsPanelShell
      title="Personnes et accès"
      description="Élèves, parents et personnel ; le compte de connexion reste facultatif"
      year={year}
    >
      <TabView>
        <TabPanel header="Personnes">
          <div className="panel-toolbar panel-toolbar-end">
            <span />
            <Button
              label="Nouvelle personne"
              icon="pi pi-plus"
              onClick={() => open()}
            />
          </div>
          <DataTable
            value={people}
            dataKey="id"
            emptyMessage="Aucune personne"
            stripedRows
          >
            <Column
              header="Nom"
              body={(row: Person) => `${row.first_name} ${row.last_name}`}
            />
            <Column field="phone" header="Téléphone" />
            <Column field="email" header="E-mail" />
            <Column
              header="Rôles"
              body={(row: Person) => (
                <div className="role-tags">
                  {row.roles.map((role) => (
                    <Tag
                      key={role}
                      value={roleLabel(role)}
                      severity={
                        role === "student"
                          ? "info"
                          : role === "parent"
                            ? "warning"
                            : "secondary"
                      }
                    />
                  ))}
                </div>
              )}
            />
            <Column
              header="Accès"
              body={(row: Person) =>
                row.auth_user_id ? (
                  <Tag value="Compte lié" severity="success" />
                ) : (
                  <Button
                    label="Inviter"
                    icon="pi pi-send"
                    size="small"
                    text
                    disabled={!row.email}
                    onClick={() => void invite(row)}
                  />
                )
              }
            />
            <Column
              header="Actions"
              body={(row: Person) => (
                <div className="table-actions">
                  <Button icon="pi pi-pencil" text onClick={() => open(row)} />
                  <Button
                    icon="pi pi-trash"
                    text
                    severity="danger"
                    onClick={() => void remove(row.id)}
                  />
                </div>
              )}
            />
          </DataTable>
        </TabPanel>
        <TabPanel header="Invitations">
          <DataTable
            value={invitations}
            dataKey="id"
            emptyMessage="Aucune invitation"
            stripedRows
          >
            <Column field="email" header="E-mail" />
            <Column
              header="Personne"
              body={(row: Invitation) => {
                const person = people.find((item) => item.id === row.person_id);
                return person
                  ? `${person.first_name} ${person.last_name}`
                  : "Personne supprimée";
              }}
            />
            <Column
              header="Statut"
              body={(row: Invitation) => (
                <Tag
                  value={row.status}
                  severity={
                    row.status === "accepted"
                      ? "success"
                      : row.status === "pending"
                        ? "info"
                        : "secondary"
                  }
                />
              )}
            />
            <Column
              header="Expiration"
              body={(row: Invitation) =>
                new Date(row.expires_at).toLocaleDateString("fr-GN")
              }
            />
          </DataTable>
        </TabPanel>
      </TabView>
      <Dialog
        header={editing ? "Modifier la personne" : "Nouvelle personne"}
        visible={editing !== undefined}
        modal
        className="form-dialog"
        onHide={() => setEditing(undefined)}
      >
        <div className="form-stack">
          <div className="settings-grid">
            <div className="field">
              <label htmlFor="first-name">Prénom</label>
              <InputText
                id="first-name"
                value={form.firstName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    firstName: event.target.value,
                  }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="last-name">Nom</label>
              <InputText
                id="last-name"
                value={form.lastName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    lastName: event.target.value,
                  }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="person-phone">Téléphone</label>
              <InputText
                id="person-phone"
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="person-email">E-mail facultatif</label>
              <InputText
                id="person-email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="person-roles">Rôles</label>
              <MultiSelect
                inputId="person-roles"
                value={form.roles}
                options={roleOptions}
                optionLabel="label"
                optionValue="value"
                display="chip"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    roles: event.value as AppRole[],
                  }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="person-status">Statut</label>
              <Dropdown
                inputId="person-status"
                value={form.status}
                options={[
                  { label: "Actif", value: "active" },
                  { label: "Inactif", value: "inactive" },
                ]}
                onChange={(event) => {
                  const value = event.value as unknown;
                  if (value === "active" || value === "inactive")
                    setForm((current) => ({ ...current, status: value }));
                }}
              />
            </div>
          </div>
          <Message
            severity="info"
            text="L’e-mail n’est requis que pour envoyer une invitation de connexion."
          />
          <div className="dialog-actions">
            <Button
              label="Annuler"
              severity="secondary"
              outlined
              onClick={() => setEditing(undefined)}
            />
            <Button
              label="Enregistrer"
              icon="pi pi-check"
              loading={saving}
              onClick={() => void submit()}
            />
          </div>
        </div>
      </Dialog>
      <Dialog
        header="Invitation créée"
        visible={Boolean(invitationLink)}
        modal
        className="form-dialog"
        onHide={() => setInvitationLink("")}
      >
        <div className="form-stack">
          <Message
            severity="success"
            text="Le lien est valable 7 jours. Transmettez-le à la personne concernée."
          />
          <div className="field">
            <label htmlFor="invite-link">Lien d’invitation</label>
            <InputText id="invite-link" value={invitationLink} readOnly />
          </div>
          <div className="dialog-actions">
            <Button
              label="Copier le lien"
              icon="pi pi-copy"
              onClick={() => void navigator.clipboard.writeText(invitationLink)}
            />
            <Button
              label="Fermer"
              severity="secondary"
              outlined
              onClick={() => setInvitationLink("")}
            />
          </div>
        </div>
      </Dialog>
    </SettingsPanelShell>
  );
}
