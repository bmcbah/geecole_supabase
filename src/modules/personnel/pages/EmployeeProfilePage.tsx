import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Skeleton } from "primereact/skeleton";
import { TabPanel, TabView } from "primereact/tabview";
import { Tag } from "primereact/tag";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import type { EmployeeProfile } from "../domain/personnel";
import { employeeStatusLabels } from "../domain/personnel";
import { getEmployeeProfile } from "../services/personnel.service";

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
  const load = useCallback(
    async () => setProfile(await getEmployeeProfile(institutionId, employeeId)),
    [employeeId, institutionId],
  );
  useEffect(() => {
    void load();
  }, [load]);
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
    <div className="space-y-4 pb-8">
      <PageHeader
        title={`${profile.first_name} ${profile.last_name}`}
        description={`${profile.employee_number} · ${catalogLabel(activeFunction?.function_item)}`}
        meta={
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
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              label="Retour"
              icon="pi pi-arrow-left"
              severity="secondary"
              text
              onClick={() => void navigate("/personnel/employes")}
            />
            <Button label="Modifier" icon="pi pi-pencil" outlined disabled />
            <Button
              label={profile.membership_id ? "Gérer l’accès" : "Créer un accès"}
              icon="pi pi-key"
              disabled={!profile.email}
              onClick={() => void navigate("/parametrage/utilisateurs-roles")}
            />
          </div>
        }
      />
      <section className="grid gap-3 md:grid-cols-4">
        <Metric
          icon="pi-briefcase"
          label="Contrat"
          value={
            activeContract
              ? catalogLabel(activeContract.contract_type)
              : "À compléter"
          }
        />
        <Metric
          icon="pi-wallet"
          label="Rémunération"
          value={
            activeContract
              ? compensation(activeContract.compensation_mode, activeContract)
              : "Non définie"
          }
        />
        <Metric
          icon="pi-clock"
          label="Heures validées"
          value={`${Math.floor(validatedMinutes / 60)} h ${validatedMinutes % 60} min`}
        />
        <Metric
          icon="pi-file"
          label="Dossier"
          value={
            profile.identity_number
              ? "Identité renseignée"
              : "Pièce à compléter"
          }
        />
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <TabView className="[&_.p-tabview-panels]:p-5">
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
            <PanelHeader title="Fonctions" action="Ajouter une fonction" />
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
          </TabPanel>
          <TabPanel header="Documents">
            <PanelHeader
              title="Documents administratifs"
              action="Ajouter un document"
            />
            <Empty text="Le dépôt documentaire sera disponible après configuration des types de documents obligatoires." />
          </TabPanel>
          <TabPanel header={`Avances (${profile.advances.length})`}>
            <PanelHeader title="Avances sur salaire" action="Nouvelle avance" />
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
function PanelHeader({ title, action }: { title: string; action?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      {action && (
        <Button
          label={action}
          icon="pi pi-plus"
          size="small"
          outlined
          disabled
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
