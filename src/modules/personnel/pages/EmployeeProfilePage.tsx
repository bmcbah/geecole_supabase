import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Skeleton } from "primereact/skeleton";
import { TabPanel, TabView } from "primereact/tabview";
import { Tag } from "primereact/tag";
import { useNavigate, useParams } from "react-router-dom";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import type { EmployeeProfile } from "../domain/personnel";
import { employeeStatusLabels } from "../domain/personnel";
import { getEmployeeProfile } from "../services/personnel.service";
import {
  listPersonnelCatalog,
  openPersonnelDocument,
  type CatalogItem,
} from "../services/personnel.service";
import { EmployeeEditDialog } from "../components/EmployeeEditDialog";
import { EmployeeFunctionDialog } from "../components/EmployeeFunctionDialog";
import { EmployeeContractDialog } from "../components/EmployeeContractDialog";
import { SalaryAdvanceDialog } from "../components/SalaryAdvanceDialog";
import { EmployeeSanctionDialog } from "../components/EmployeeSanctionDialog";
import { EmployeeDocumentDialog } from "../components/EmployeeDocumentDialog";
import { EmployeeRateDialog } from "../components/EmployeeRateDialog";
import { EmployeeAccessDialog } from "../components/EmployeeAccessDialog";

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
const catalogLabel = (item?: {
  default_label: string;
  local_label: string | null;
}) => item?.local_label || item?.default_label || "—";

export function EmployeeProfilePage() {
  const { institutionId } = useAcademicSession();
  const { employeeId = "" } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<EmployeeProfile | null>();
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [dialog, setDialog] = useState<
    | "edit"
    | "function"
    | "contract"
    | "document"
    | "advance"
    | "sanction"
    | "rate"
    | "access"
    | null
  >(null);
  const load = useCallback(
    async () => setProfile(await getEmployeeProfile(institutionId, employeeId)),
    [employeeId, institutionId],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    void listPersonnelCatalog(institutionId).then(setCatalogs);
  }, [institutionId]);
  const activeFunction = profile?.functions.find(
    (x) => x.is_primary && x.is_active,
  );
  const activeContract = profile?.contracts.find((x) => x.status === "active");
  const validatedMinutes = useMemo(
    () =>
      profile?.work_entries
        .filter((x) => x.status === "validated" || x.status === "paid")
        .reduce((sum, x) => sum + x.minutes, 0) ?? 0,
    [profile],
  );
  const approvedLeaveCount = useMemo(
    () =>
      profile?.leave_requests.filter((item) => item.status === "approved")
        .length ?? 0,
    [profile],
  );
  const outstandingAdvances = useMemo(
    () =>
      profile?.advances.reduce(
        (total, item) =>
          total +
          Math.max(
            0,
            (item.amount_approved ?? item.amount_requested) -
              item.repaid_amount,
          ),
        0,
      ) ?? 0,
    [profile],
  );
  if (profile === undefined)
    return (
      <div className="space-y-4">
        <Skeleton height="7rem" borderRadius="1rem" />
        <Skeleton height="24rem" borderRadius="1rem" />
      </div>
    );
  if (profile === null)
    return (
      <Message
        severity="warn"
        text="Cette fiche Personnel est introuvable ou inaccessible."
      />
    );
  return (
    <div className="mx-auto max-w-[1480px] space-y-4 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          label="Retour au personnel"
          icon="pi pi-arrow-left"
          severity="secondary"
          text
          onClick={() => void navigate("/personnel/employes")}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            label="Modifier"
            icon="pi pi-pencil"
            severity="secondary"
            outlined
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
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(to_right,#10b981_1px,transparent_1px),linear-gradient(to_bottom,#10b981_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="relative grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-7">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-xl font-bold text-emerald-700 ring-1 ring-emerald-100">
              {profile.first_name[0]}
              {profile.last_name[0]}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700 ring-1 ring-inset ring-emerald-100">
                  Dossier personnel
                </span>
                <Tag
                  value={employeeStatusLabels[profile.status]}
                  severity={
                    profile.status === "active"
                      ? "success"
                      : profile.status === "suspended"
                        ? "warning"
                        : "secondary"
                  }
                />
              </div>
              <h1 className="mt-2 truncate text-2xl font-bold tracking-tight text-slate-950">
                {profile.first_name} {profile.last_name}
              </h1>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                <span>
                  <i className="pi pi-id-card mr-2 text-emerald-500" />
                  {profile.employee_number}
                </span>
                <span>
                  <i className="pi pi-briefcase mr-2 text-emerald-500" />
                  {catalogLabel(activeFunction?.function_item)}
                </span>
                <span>
                  <i className="pi pi-calendar mr-2 text-emerald-500" />
                  Entrée le {date(profile.hired_on)}
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[520px]">
            <HeroMetric
              label="Contrat"
              value={
                activeContract
                  ? catalogLabel(activeContract.contract_type)
                  : "À compléter"
              }
              icon="pi-file-edit"
            />
            <HeroMetric
              label="Heures validées"
              value={`${Math.floor(validatedMinutes / 60)} h ${validatedMinutes % 60} min`}
              icon="pi-clock"
            />
            <HeroMetric
              label="Congés validés"
              value={String(approvedLeaveCount)}
              icon="pi-calendar-minus"
            />
            <HeroMetric
              label="Avances dues"
              value={money(outstandingAdvances)}
              icon="pi-wallet"
            />
          </div>
        </div>
      </section>
      {(!activeContract || !profile.identity_number || !profile.email) && (
        <section className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-amber-700 ring-1 ring-amber-200">
            <i className="pi pi-exclamation-circle" />
          </span>
          <div className="min-w-0 flex-1">
            <strong className="text-sm text-amber-950">Dossier à compléter</strong>
            <p className="m-0 mt-0.5 text-sm text-amber-800">
              {[!activeContract && "contrat", !profile.identity_number && "pièce d’identité", !profile.email && "adresse e-mail"]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <Button label="Compléter la fiche" icon="pi pi-pencil" size="small" severity="warning" outlined onClick={() => setDialog("edit")} />
        </section>
      )}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <TabView className="personnel-profile-tabs [&_.p-tabview-panels]:p-5">
          <TabPanel header="Informations">
            <div className="grid gap-x-8 gap-y-5 md:grid-cols-3">
              <Info
                label="Nom complet"
                value={`${profile.first_name} ${profile.last_name}`}
              />
              <Info
                label="Naissance"
                value={`${date(profile.birth_date)}${profile.birth_place ? ` · ${profile.birth_place}` : ""}`}
              />
              <Info label="Nationalité" value={profile.nationality} />
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
              <Info
                label="Pièce d’identité"
                value={
                  profile.identity_type && profile.identity_number
                    ? `${profile.identity_type} · ${profile.identity_number}`
                    : null
                }
              />
              <Info label="Date d’entrée" value={date(profile.hired_on)} />
              <Info
                label="Compte GeEcole"
                value={profile.membership_id ? "Accès lié" : "Aucun accès"}
              />
            </div>
          </TabPanel>
          <TabPanel header={`Emploi (${profile.functions.length})`}>
            <PanelHeader
              title="Fonctions"
              action="Ajouter une fonction"
              onAction={() => setDialog("function")}
            />
            <div className="divide-y divide-slate-100">
              {profile.functions.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <strong>{catalogLabel(item.function_item)}</strong>
                    <small className="block text-slate-500">
                      {item.responsibility ||
                        "Aucune responsabilité complémentaire"}{" "}
                      · depuis le {date(item.starts_on)}
                    </small>
                  </div>
                  <div className="flex gap-2">
                    {item.is_primary && (
                      <Tag value="Principale" severity="info" />
                    )}
                    <Tag
                      value={item.is_active ? "Active" : "Terminée"}
                      severity={item.is_active ? "success" : "secondary"}
                    />
                  </div>
                </div>
              ))}
            </div>
          </TabPanel>
          <TabPanel header={`Contrats (${profile.contracts.length})`}>
            <PanelHeader
              title="Contrats et rémunération"
              action="Ajouter un contrat"
              onAction={() => setDialog("contract")}
            />
            <div className="divide-y divide-slate-100">
              {profile.contracts.map((item) => (
                <div key={item.id} className="grid gap-2 py-3 md:grid-cols-4">
                  <Info label="Type" value={catalogLabel(item.contract_type)} />
                  <Info
                    label="Période"
                    value={`${date(item.starts_on)} → ${date(item.ends_on)}`}
                  />
                  <Info
                    label="Mode"
                    value={compensation(item.compensation_mode, item)}
                  />
                  <div className="md:text-right">
                    <Tag
                      value={item.status === "active" ? "Actif" : item.status}
                      severity={
                        item.status === "active" ? "success" : "secondary"
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
            {!profile.contracts.length && (
              <Empty text="Aucun contrat enregistré." />
            )}
            <div className="mt-6 border-t border-slate-200 pt-5">
              <PanelHeader
                title="Taux horaire de l’employé"
                action="Définir un nouveau taux"
                onAction={() => setDialog("rate")}
              />
              {profile.compensation_rates.length ? (
                <div className="divide-y divide-slate-100">
                  {profile.compensation_rates.map((item) => (
                    <div
                      key={item.id}
                      className="grid gap-2 py-3 sm:grid-cols-3"
                    >
                      <Info label="Taux" value={money(item.hourly_rate)} />
                      <Info
                        label="Applicable depuis"
                        value={date(item.effective_from)}
                      />
                      <Info label="Fin" value={date(item.effective_to)} />
                    </div>
                  ))}
                </div>
              ) : (
                <Empty text="Aucun taux horaire défini pour cet employé." />
              )}
            </div>
          </TabPanel>
          <TabPanel header={`Paie (${profile.payroll_entries.length})`}>
            <PanelHeader title="Bulletins de paie" />
            {profile.payroll_entries.length ? (
              <div className="divide-y divide-slate-100">
                {profile.payroll_entries.map((item) => (
                  <article
                    key={item.id}
                    className="grid gap-3 py-4 md:grid-cols-[1.3fr_repeat(4,1fr)] md:items-center"
                  >
                    <div>
                      <strong className="block text-slate-900">
                        {item.period.name}
                      </strong>
                      <small className="text-slate-500">
                        {date(item.period.starts_on)} →{" "}
                        {date(item.period.ends_on)}
                      </small>
                    </div>
                    <Info label="Fixe" value={money(item.fixed_amount)} />
                    <Info
                      label="Variable"
                      value={money(item.variable_amount)}
                    />
                    <Info label="Net" value={money(item.net_amount)} />
                    <div className="md:text-right">
                      <Tag
                        value={item.status}
                        severity={
                          item.status === "paid" || item.status === "closed"
                            ? "success"
                            : "info"
                        }
                      />
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <Empty text="Aucun bulletin de paie généré pour cette personne." />
            )}
          </TabPanel>
          <TabPanel header="Assiduité">
            <PanelHeader title="Présences, heures et congés" />
            <div className="grid gap-3 md:grid-cols-3">
              <Metric
                icon="pi-clock"
                label="Heures enregistrées"
                value={String(profile.work_entries.length)}
              />
              <Metric
                icon="pi-check-circle"
                label="Heures validées"
                value={`${Math.floor(validatedMinutes / 60)} h`}
              />
              <Metric
                icon="pi-calendar-minus"
                label="Demandes de congé"
                value={String(profile.leave_requests.length)}
              />
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <ActivityList
                title="Dernières activités"
                empty="Aucune activité enregistrée."
                items={profile.work_entries.slice(0, 5).map((item) => ({
                  id: item.id,
                  title: `${date(item.work_date)} · ${Math.floor(item.minutes / 60)} h ${item.minutes % 60} min`,
                  detail: item.notes || "Activité sans commentaire",
                  status: item.status,
                }))}
              />
              <ActivityList
                title="Congés et absences"
                empty="Aucune demande enregistrée."
                items={profile.leave_requests.slice(0, 5).map((item) => ({
                  id: item.id,
                  title: `${date(item.starts_on)} → ${date(item.ends_on)}`,
                  detail: item.reason || "Sans motif",
                  status: item.status,
                }))}
              />
            </div>
          </TabPanel>
          <TabPanel header="Documents">
            <PanelHeader
              title="Documents administratifs"
              action="Ajouter un document"
              onAction={() => setDialog("document")}
            />
            {profile.documents.length ? (
              <div className="divide-y divide-slate-100">
                {profile.documents.map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-2 py-3 md:grid-cols-[1fr_auto_auto_auto] md:items-center"
                  >
                    <div>
                      <strong className="block text-sm text-slate-900">
                        {item.name}
                      </strong>
                      <small className="text-slate-500">
                        {catalogLabel(item.document_type)}
                      </small>
                    </div>
                    <span className="text-sm text-slate-600">
                      Émis le {date(item.issued_on)}
                    </span>
                    <Tag
                      value={
                        item.expires_on
                          ? `Expire le ${date(item.expires_on)}`
                          : "Sans expiration"
                      }
                      severity={item.expires_on ? "warning" : "success"}
                    />
                    <Button
                      label="Ouvrir"
                      icon="pi pi-external-link"
                      text
                      size="small"
                      onClick={() => void openPersonnelDocument(item.file_path)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <Empty text="Aucun document administratif déposé." />
            )}
          </TabPanel>
          <TabPanel header={`Avances (${profile.advances.length})`}>
            <PanelHeader
              title="Avances sur salaire"
              action="Nouvelle avance"
              onAction={() => setDialog("advance")}
            />
            {profile.advances.length ? (
              profile.advances.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between border-b border-slate-100 py-3"
                >
                  <span>
                    {date(item.requested_on)} · {item.reason || "Sans motif"}
                  </span>
                  <strong>
                    {money(item.amount_approved ?? item.amount_requested)}
                  </strong>
                </div>
              ))
            ) : (
              <Empty text="Aucune avance enregistrée." />
            )}
          </TabPanel>
          <TabPanel header={`Sanctions (${profile.sanctions.length})`}>
            <PanelHeader
              title="Dossier disciplinaire confidentiel"
              action="Nouvelle sanction"
              onAction={() => setDialog("sanction")}
            />
            {profile.sanctions.length ? (
              profile.sanctions.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between border-b border-slate-100 py-3"
                >
                  <span>
                    {date(item.incident_on)} · {item.reason}
                  </span>
                  <Tag value={item.status} />
                </div>
              ))
            ) : (
              <Empty text="Aucune sanction enregistrée." />
            )}
          </TabPanel>
          <TabPanel header="Accès">
            <PanelHeader
              title="Compte et permissions"
              action={
                profile.membership_id ? "Gérer l’accès" : "Créer un accès"
              }
            />
            <Message
              severity={profile.membership_id ? "success" : "info"}
              text={
                profile.membership_id
                  ? "Un compte GeEcole est lié à cette fiche."
                  : profile.email
                    ? "Aucun accès n’a été créé. L’invitation reste une action volontaire."
                    : "Ajoutez une adresse e-mail avant de créer un accès."
              }
            />
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
      <SalaryAdvanceDialog
        institutionId={institutionId}
        employeeId={profile.id}
        catalogs={catalogs}
        visible={dialog === "advance"}
        onHide={() => setDialog(null)}
        onSaved={load}
      />
      <EmployeeSanctionDialog
        institutionId={institutionId}
        employeeId={profile.id}
        catalogs={catalogs}
        visible={dialog === "sanction"}
        onHide={() => setDialog(null)}
        onSaved={load}
      />
      <EmployeeRateDialog
        employeeId={profile.id}
        visible={dialog === "rate"}
        onHide={() => setDialog(null)}
        onSaved={load}
      />
      <EmployeeAccessDialog
        employeeId={profile.id}
        email={profile.email}
        visible={dialog === "access"}
        onHide={() => setDialog(null)}
      />
    </div>
  );
}
function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className="mt-1 block text-sm text-slate-900">{value || "—"}</span>
    </div>
  );
}
function Metric({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <article className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <i className={`pi ${icon} rounded-xl bg-slate-100 p-3 text-slate-600`} />
      <div>
        <span className="block text-xs text-slate-500">{label}</span>
        <strong className="text-sm text-slate-900">{value}</strong>
      </div>
    </article>
  );
}
function HeroMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="flex min-h-[62px] flex-col justify-center rounded-xl border border-slate-200 bg-white/90 px-3 py-2 shadow-sm">
      <div className="flex items-center justify-between gap-2 text-slate-400">
        <span className="text-[10px] font-bold uppercase tracking-[0.1em]">
          {label}
        </span>
        <i className={`pi ${icon} text-[11px] text-emerald-500`} />
      </div>
      <strong className="mt-1 block truncate text-sm font-semibold text-slate-900">
        {value}
      </strong>
    </div>
  );
}
function ActivityList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{ id: string; title: string; detail: string; status: string }>;
}) {
  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      {items.length ? (
        <div className="mt-3 divide-y divide-slate-100">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 py-3"
            >
              <div>
                <strong className="block text-sm text-slate-800">
                  {item.title}
                </strong>
                <span className="mt-1 block text-xs text-slate-500">
                  {item.detail}
                </span>
              </div>
              <Tag value={item.status} severity="secondary" />
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">{empty}</p>
      )}
    </section>
  );
}
function PanelHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      {action && (
        <Button
          label={action}
          icon="pi pi-plus"
          size="small"
          outlined
          onClick={onAction}
        />
      )}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
function compensation(
  mode: string,
  contract: { fixed_amount: number; hourly_rate: number; session_rate: number },
) {
  if (mode === "hourly") return `${money(contract.hourly_rate)} / h`;
  if (mode === "session") return `${money(contract.session_rate)} / séance`;
  if (mode === "mixed") return `${money(contract.fixed_amount)} + heures`;
  if (mode === "unpaid") return "Non rémunéré";
  return money(contract.fixed_amount);
}
