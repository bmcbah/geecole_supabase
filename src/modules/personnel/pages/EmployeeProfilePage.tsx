import { useCallback, useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Message } from "primereact/message";
import { Skeleton } from "primereact/skeleton";
import { TabPanel, TabView } from "primereact/tabview";
import { Tag } from "primereact/tag";
import { useNavigate, useParams } from "react-router-dom";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { EmployeeAccessDialog } from "../components/EmployeeAccessDialog";
import { EmployeeContractDialog } from "../components/EmployeeContractDialog";
import { EmployeeDocumentDialog } from "../components/EmployeeDocumentDialog";
import { EmployeeEditDialog } from "../components/EmployeeEditDialog";
import { EmployeeFunctionDialog } from "../components/EmployeeFunctionDialog";
import type { EmployeeContract, EmployeeProfile } from "../domain/personnel";
import { employeeStatusLabels } from "../domain/personnel";
import {
  getEmployeeProfile,
  listPersonnelCatalog,
  openPersonnelDocument,
  type CatalogItem,
} from "../services/personnel.service";

const money = (value: number) =>
  new Intl.NumberFormat("fr-GN", {
    style: "currency",
    currency: "GNF",
    maximumFractionDigits: 0,
  }).format(value);
const date = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("fr-FR").format(new Date(`${value}T00:00:00`))
    : "—";
const label = (item?: { default_label: string; local_label: string | null }) =>
  item?.local_label || item?.default_label || "—";

export function EmployeeProfilePage() {
  const { institutionId } = useAcademicSession();
  const { employeeId = "" } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<EmployeeProfile | null>();
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [dialog, setDialog] = useState<
    "edit" | "function" | "contract" | "document" | "access" | null
  >(null);
  const load = useCallback(
    async () => setProfile(await getEmployeeProfile(institutionId, employeeId)),
    [employeeId, institutionId],
  );
  useEffect(() => void load(), [load]);
  useEffect(() => {
    void listPersonnelCatalog(institutionId).then(setCatalogs);
  }, [institutionId]);

  if (profile === undefined)
    return (
      <div className="space-y-4">
        <Skeleton height="8rem" />
        <Skeleton height="28rem" />
      </div>
    );
  if (profile === null)
    return (
      <Message
        severity="warn"
        text="Cette fiche Personnel est introuvable ou inaccessible."
      />
    );

  const activeFunction = profile.functions.find(
    (item) => item.is_primary && item.is_active,
  );
  const activeContract = profile.contracts.find(
    (item) => item.status === "active",
  );
  const incomplete = [
    !activeContract && "contrat actif",
    !profile.identity_number && "pièce d’identité",
    !profile.phone && "téléphone",
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-[1280px] space-y-4 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          label="Retour aux employés"
          icon="pi pi-arrow-left"
          text
          severity="secondary"
          onClick={() => navigate("/personnel/employes")}
        />
        <div className="flex gap-2">
          <Button
            label="Modifier"
            icon="pi pi-pencil"
            outlined
            severity="secondary"
            onClick={() => setDialog("edit")}
          />
          <Button
            label={profile.membership_id ? "Gérer l’accès" : "Créer un accès"}
            icon="pi pi-key"
            disabled={!profile.email}
            onClick={() => setDialog("access")}
          />
        </div>
      </div>

      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            <span className="grid size-16 place-items-center rounded-2xl bg-teal-50 text-xl font-bold text-teal-700">
              {profile.first_name[0]}
              {profile.last_name[0]}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="m-0 text-2xl font-bold text-slate-950">
                  {profile.first_name} {profile.last_name}
                </h1>
                <Tag
                  value={employeeStatusLabels[profile.status]}
                  severity={profile.status === "active" ? "success" : "warning"}
                />
              </div>
              <p className="m-0 mt-1 text-sm text-slate-500">
                {profile.employee_number} ·{" "}
                {label(activeFunction?.function_item)} · entrée le{" "}
                {date(profile.hired_on)}
              </p>
            </div>
          </div>
          <nav
            className="flex flex-wrap gap-2"
            aria-label="Activités RH de l’employé"
          >
            <Quick
              label="Assiduité"
              icon="pi-clock"
              onClick={() =>
                navigate(`/personnel/heures?employee=${profile.id}`)
              }
            />
            <Quick
              label="Congés"
              icon="pi-calendar"
              onClick={() =>
                navigate(`/personnel/conges?employee=${profile.id}`)
              }
            />
            <Quick
              label="Avances"
              icon="pi-wallet"
              onClick={() =>
                navigate(`/personnel/avances?employee=${profile.id}`)
              }
            />
            <Quick
              label="Sanctions"
              icon="pi-exclamation-triangle"
              onClick={() =>
                navigate(`/personnel/sanctions?employee=${profile.id}`)
              }
            />
          </nav>
        </div>
      </header>

      {incomplete.length > 0 && (
        <Message
          severity="warn"
          text={`Dossier incomplet : ${incomplete.join(" · ")}.`}
          className="w-full"
        />
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <TabView className="personnel-profile-tabs">
          <TabPanel header="Informations" leftIcon="pi pi-user mr-2">
            <div className="grid gap-6 p-1 lg:grid-cols-2">
              <InfoGroup title="Identité" action={() => setDialog("edit")}>
                <Info
                  label="Nom complet"
                  value={`${profile.first_name} ${profile.last_name}`}
                />
                <Info
                  label="Naissance"
                  value={`${date(profile.birth_date)}${profile.birth_place ? ` · ${profile.birth_place}` : ""}`}
                />
                <Info label="Nationalité" value={profile.nationality} />
                <Info
                  label="Pièce d’identité"
                  value={
                    profile.identity_type && profile.identity_number
                      ? `${profile.identity_type} · ${profile.identity_number}`
                      : null
                  }
                />
              </InfoGroup>
              <InfoGroup title="Coordonnées" action={() => setDialog("edit")}>
                <Info label="Téléphone" value={profile.phone} />
                <Info
                  label="Téléphone secondaire"
                  value={profile.secondary_phone}
                />
                <Info label="E-mail" value={profile.email} />
                <Info label="Adresse" value={profile.address} />
                <Info
                  label="Contact d’urgence"
                  value={profile.emergency_contact_name}
                />
                <Info
                  label="Téléphone d’urgence"
                  value={profile.emergency_contact_phone}
                />
              </InfoGroup>
            </div>
          </TabPanel>

          <TabPanel
            header={`Fonctions (${profile.functions.length})`}
            leftIcon="pi pi-briefcase mr-2"
          >
            <TableHeader
              title="Affectations et responsabilités"
              button="Ajouter une fonction"
              onClick={() => setDialog("function")}
            />
            <DataTable
              value={profile.functions}
              dataKey="id"
              size="small"
              stripedRows
              emptyMessage="Aucune fonction enregistrée"
            >
              <Column
                header="Fonction"
                body={(item) => <strong>{label(item.function_item)}</strong>}
              />
              <Column
                field="responsibility"
                header="Responsabilité"
                body={(item) => item.responsibility || "—"}
              />
              <Column
                header="Période"
                body={(item) =>
                  `${date(item.starts_on)} → ${date(item.ends_on)}`
                }
              />
              <Column
                header="Type"
                body={(item) =>
                  item.is_primary ? (
                    <Tag value="Principale" severity="info" />
                  ) : (
                    "Secondaire"
                  )
                }
              />
              <Column
                header="État"
                body={(item) => (
                  <Tag
                    value={item.is_active ? "Active" : "Terminée"}
                    severity={item.is_active ? "success" : "secondary"}
                  />
                )}
              />
            </DataTable>
          </TabPanel>

          <TabPanel
            header={`Contrats (${profile.contracts.length})`}
            leftIcon="pi pi-file-edit mr-2"
          >
            <TableHeader
              title="Contrat actuel et historique"
              button="Ajouter un contrat"
              onClick={() => setDialog("contract")}
            />
            <DataTable
              value={profile.contracts}
              dataKey="id"
              size="small"
              stripedRows
              emptyMessage="Aucun contrat enregistré"
              tableStyle={{ minWidth: "780px" }}
            >
              <Column
                header="Contrat"
                body={(item: EmployeeContract) => (
                  <div>
                    <strong>{label(item.contract_type)}</strong>
                    <small className="block text-slate-500">
                      {item.reference || "Sans référence"}
                    </small>
                  </div>
                )}
              />
              <Column
                header="Période"
                body={(item: EmployeeContract) =>
                  `${date(item.starts_on)} → ${date(item.ends_on)}`
                }
              />
              <Column
                header="Rémunération prévue"
                body={(item: EmployeeContract) => compensation(item)}
              />
              <Column
                header="État"
                body={(item: EmployeeContract) => (
                  <Tag
                    value={item.status === "active" ? "Actif" : item.status}
                    severity={
                      item.status === "active" ? "success" : "secondary"
                    }
                  />
                )}
              />
            </DataTable>
          </TabPanel>

          <TabPanel
            header={`Documents (${profile.documents.length})`}
            leftIcon="pi pi-folder mr-2"
          >
            <TableHeader
              title="Documents administratifs"
              button="Ajouter un document"
              onClick={() => setDialog("document")}
            />
            <DataTable
              value={profile.documents}
              dataKey="id"
              size="small"
              stripedRows
              emptyMessage="Aucun document administratif déposé"
            >
              <Column
                field="name"
                header="Document"
                body={(item) => <strong>{item.name}</strong>}
              />
              <Column
                header="Type"
                body={(item) => label(item.document_type)}
              />
              <Column header="Émis le" body={(item) => date(item.issued_on)} />
              <Column
                header="Expiration"
                body={(item) => date(item.expires_on)}
              />
              <Column
                header=""
                body={(item) => (
                  <Button
                    label="Ouvrir"
                    icon="pi pi-external-link"
                    text
                    size="small"
                    onClick={() => void openPersonnelDocument(item.file_path)}
                  />
                )}
              />
            </DataTable>
          </TabPanel>
        </TabView>
      </section>

      <EmployeeEditDialog
        employee={profile}
        visible={dialog === "edit"}
        onHide={() => setDialog(null)}
        onSaved={load}
      />
      <EmployeeFunctionDialog
        institutionId={institutionId}
        employeeId={profile.id}
        catalogs={catalogs}
        visible={dialog === "function"}
        onHide={() => setDialog(null)}
        onSaved={load}
      />
      <EmployeeContractDialog
        institutionId={institutionId}
        employeeId={profile.id}
        catalogs={catalogs}
        visible={dialog === "contract"}
        onHide={() => setDialog(null)}
        onSaved={load}
      />
      <EmployeeDocumentDialog
        institutionId={institutionId}
        employeeId={profile.id}
        catalogs={catalogs}
        visible={dialog === "document"}
        onHide={() => setDialog(null)}
        onSaved={load}
      />
      <EmployeeAccessDialog
        employeeId={profile.id}
        institutionId={institutionId}
        email={profile.email}
        visible={dialog === "access"}
        onHide={() => setDialog(null)}
      />
    </div>
  );
}

function Quick({
  label: text,
  icon,
  onClick,
}: {
  label: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <Button
      label={text}
      icon={`pi ${icon}`}
      size="small"
      outlined
      severity="secondary"
      onClick={onClick}
    />
  );
}
function InfoGroup({
  title,
  action,
  children,
}: {
  title: string;
  action: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 p-5">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="m-0 text-base font-semibold text-slate-950">{title}</h2>
        <Button
          label="Modifier"
          icon="pi pi-pencil"
          text
          size="small"
          onClick={action}
        />
      </div>
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}
function TableHeader({
  title,
  button,
  onClick,
}: {
  title: string;
  button: string;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
      <div>
        <h2 className="m-0 text-base font-semibold text-slate-950">{title}</h2>
        <p className="m-0 mt-1 text-sm text-slate-500">
          Les anciennes lignes sont conservées dans l’historique.
        </p>
      </div>
      <Button label={button} icon="pi pi-plus" size="small" onClick={onClick} />
    </div>
  );
}
function Info({
  label: name,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {name}
      </span>
      <span className="mt-1 block text-sm text-slate-900">{value || "—"}</span>
    </div>
  );
}
function compensation(contract: EmployeeContract) {
  if (contract.compensation_mode === "hourly")
    return `${money(contract.hourly_rate)} / h · ${contract.weekly_hours || 0} h/semaine`;
  if (contract.compensation_mode === "mixed")
    return `${money(contract.fixed_amount)} + ${money(contract.hourly_rate)} / h · ${contract.weekly_hours || 0} h/semaine`;
  if (contract.compensation_mode === "session")
    return `${money(contract.session_rate)} / séance`;
  if (contract.compensation_mode === "unpaid") return "Non rémunéré";
  return money(contract.fixed_amount);
}
