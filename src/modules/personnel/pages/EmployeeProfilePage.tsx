import { useCallback, useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Skeleton } from "primereact/skeleton";
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
import { getEmployeeProfile, listPersonnelCatalog, openPersonnelDocument, type CatalogItem } from "../services/personnel.service";

const money = (value: number) => new Intl.NumberFormat("fr-GN", { style: "currency", currency: "GNF", maximumFractionDigits: 0 }).format(value);
const date = (value?: string | null) => value ? new Intl.DateTimeFormat("fr-FR").format(new Date(`${value}T00:00:00`)) : "—";
const label = (item?: { default_label: string; local_label: string | null }) => item?.local_label || item?.default_label || "—";

export function EmployeeProfilePage() {
  const { institutionId } = useAcademicSession();
  const { employeeId = "" } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<EmployeeProfile | null>();
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [dialog, setDialog] = useState<"edit" | "function" | "contract" | "document" | "access" | null>(null);
  const load = useCallback(async () => setProfile(await getEmployeeProfile(institutionId, employeeId)), [employeeId, institutionId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void listPersonnelCatalog(institutionId).then(setCatalogs); }, [institutionId]);
  if (profile === undefined) return <div className="space-y-4"><Skeleton height="8rem" /><Skeleton height="28rem" /></div>;
  if (profile === null) return <Message severity="warn" text="Cette fiche Personnel est introuvable ou inaccessible." />;
  const activeFunction = profile.functions.find((x) => x.is_primary && x.is_active);
  const activeContract = profile.contracts.find((x) => x.status === "active");
  const incomplete = [!activeContract && "contrat actif", !profile.identity_number && "pièce d’identité", !profile.phone && "téléphone"].filter(Boolean);
  return <div className="mx-auto max-w-[1280px] space-y-4 pb-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><Button label="Retour aux employés" icon="pi pi-arrow-left" text severity="secondary" onClick={() => void navigate("/personnel/employes")} /><div className="flex gap-2"><Button label="Modifier la fiche" icon="pi pi-pencil" outlined severity="secondary" onClick={() => setDialog("edit")} /><Button label={profile.membership_id ? "Gérer l’accès" : "Créer un accès"} icon="pi pi-key" disabled={!profile.email} onClick={() => setDialog("access")} /></div></div>
    <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div className="flex items-center gap-4"><span className="grid size-16 place-items-center rounded-2xl bg-emerald-50 text-xl font-bold text-emerald-700">{profile.first_name[0]}{profile.last_name[0]}</span><div><div className="flex flex-wrap items-center gap-2"><h1 className="m-0 text-2xl font-bold text-slate-950">{profile.first_name} {profile.last_name}</h1><Tag value={employeeStatusLabels[profile.status]} severity={profile.status === "active" ? "success" : "warning"} /></div><p className="m-0 mt-1 text-sm text-slate-500">{profile.employee_number} · {label(activeFunction?.function_item)} · entré le {date(profile.hired_on)}</p></div></div><div className="flex flex-wrap gap-2"><Button label="Assiduité" icon="pi pi-clock" text onClick={() => void navigate(`/personnel/heures?employee=${profile.id}`)} /><Button label="Congés" icon="pi pi-calendar" text onClick={() => void navigate(`/personnel/conges?employee=${profile.id}`)} /><Button label="Avances" icon="pi pi-wallet" text onClick={() => void navigate(`/personnel/avances?employee=${profile.id}`)} /><Button label="Sanctions" icon="pi pi-exclamation-triangle" text severity="danger" onClick={() => void navigate(`/personnel/sanctions?employee=${profile.id}`)} /></div></div></header>
    {incomplete.length > 0 && <Message severity="warn" text={`Dossier incomplet : ${incomplete.join(" · ")}.`} className="w-full" />}
    <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><SectionTitle title="Informations personnelles" action="Modifier" onAction={() => setDialog("edit")} /><div className="grid gap-x-6 gap-y-5 sm:grid-cols-2"><Info label="Nom complet" value={`${profile.first_name} ${profile.last_name}`} /><Info label="Naissance" value={`${date(profile.birth_date)}${profile.birth_place ? ` · ${profile.birth_place}` : ""}`} /><Info label="Nationalité" value={profile.nationality} /><Info label="Pièce d’identité" value={profile.identity_type && profile.identity_number ? `${profile.identity_type} · ${profile.identity_number}` : null} /><Info label="Téléphone" value={profile.phone} /><Info label="Téléphone secondaire" value={profile.secondary_phone} /><Info label="E-mail" value={profile.email} /><Info label="Adresse" value={profile.address} /><Info label="Contact d’urgence" value={profile.emergency_contact_name} /><Info label="Téléphone d’urgence" value={profile.emergency_contact_phone} /></div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><SectionTitle title="Situation professionnelle" action="Ajouter une fonction" onAction={() => setDialog("function")} /><div className="grid gap-3 sm:grid-cols-2"><Info label="Date d’entrée" value={date(profile.hired_on)} /><Info label="Accès GeEcole" value={profile.membership_id ? "Compte lié" : "Aucun compte"} /></div><div className="mt-5 divide-y divide-slate-100 border-t border-slate-100">{profile.functions.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-3"><div><strong className="text-sm text-slate-900">{label(item.function_item)}</strong><small className="block text-slate-500">{item.responsibility || "Sans responsabilité complémentaire"} · depuis le {date(item.starts_on)}</small></div><div className="flex gap-2">{item.is_primary && <Tag value="Principale" severity="info" />}<Tag value={item.is_active ? "Active" : "Terminée"} severity={item.is_active ? "success" : "secondary"} /></div></div>)}</div></section>
    </div>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><SectionTitle title="Contrats" action="Ajouter un contrat" onAction={() => setDialog("contract")} />{profile.contracts.length ? <div className="divide-y divide-slate-100">{profile.contracts.map((item) => <article key={item.id} className="grid gap-4 py-4 md:grid-cols-[1.2fr_1fr_1.4fr_auto] md:items-center"><Info label="Contrat" value={`${label(item.contract_type)}${item.reference ? ` · ${item.reference}` : ""}`} /><Info label="Période" value={`${date(item.starts_on)} → ${date(item.ends_on)}`} /><Info label="Rémunération prévue" value={compensation(item)} /><Tag value={item.status === "active" ? "Actif" : item.status} severity={item.status === "active" ? "success" : "secondary"} /></article>)}</div> : <Empty text="Aucun contrat enregistré." />}</section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><SectionTitle title="Documents administratifs" action="Ajouter un document" onAction={() => setDialog("document")} />{profile.documents.length ? <div className="divide-y divide-slate-100">{profile.documents.map((item) => <div key={item.id} className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center"><div><strong className="block text-sm text-slate-900">{item.name}</strong><small className="text-slate-500">{label(item.document_type)} · expiration {date(item.expires_on)}</small></div><Button label="Ouvrir" icon="pi pi-external-link" text size="small" onClick={() => void openPersonnelDocument(item.file_path)} /></div>)}</div> : <Empty text="Aucun document administratif déposé." />}</section>
    <EmployeeEditDialog employee={profile} visible={dialog === "edit"} onHide={() => setDialog(null)} onSaved={load} />
    <EmployeeFunctionDialog institutionId={institutionId} employeeId={profile.id} catalogs={catalogs} visible={dialog === "function"} onHide={() => setDialog(null)} onSaved={load} />
    <EmployeeContractDialog institutionId={institutionId} employeeId={profile.id} catalogs={catalogs} visible={dialog === "contract"} onHide={() => setDialog(null)} onSaved={load} />
    <EmployeeDocumentDialog institutionId={institutionId} employeeId={profile.id} catalogs={catalogs} visible={dialog === "document"} onHide={() => setDialog(null)} onSaved={load} />
    <EmployeeAccessDialog employeeId={profile.id} email={profile.email} visible={dialog === "access"} onHide={() => setDialog(null)} />
  </div>;
}

function SectionTitle({ title, action, onAction }: { title: string; action: string; onAction: () => void }) { return <div className="mb-5 flex items-center justify-between gap-3"><h2 className="m-0 text-base font-semibold text-slate-950">{title}</h2><Button label={action} icon="pi pi-plus" size="small" outlined onClick={onAction} /></div>; }
function Info({ label: name, value }: { label: string; value?: string | null }) { return <div><span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">{name}</span><span className="mt-1 block text-sm text-slate-900">{value || "—"}</span></div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-7 text-center text-sm text-slate-500">{text}</div>; }
function compensation(contract: EmployeeContract) { if (contract.compensation_mode === "hourly") return `${money(contract.hourly_rate)} / h · ${contract.weekly_hours || 0} h prévues/semaine`; if (contract.compensation_mode === "mixed") return `${money(contract.fixed_amount)} + ${money(contract.hourly_rate)} / h · ${contract.weekly_hours || 0} h prévues/semaine`; if (contract.compensation_mode === "session") return `${money(contract.session_rate)} / séance`; if (contract.compensation_mode === "unpaid") return "Non rémunéré"; return money(contract.fixed_amount); }
