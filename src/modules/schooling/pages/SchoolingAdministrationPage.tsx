import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { SchoolingPanel } from "../components/SchoolingPanel";
import {
  batchAssignEnrollments,
  createImportBatch,
  issueCertificate,
  listAssignableEnrollments,
  listCertificates,
  listClassOccupancy,
  listDocumentRequirements,
  listGuardianLinks,
  listImportBatches,
  saveDocumentRequirement,
  unlinkGuardian,
  updateGuardianLink,
} from "../services/schooling-operations.service";

const clientModes = ["classes", "responsables", "documents", "imports", "attestations"] as const;
type Mode = (typeof clientModes)[number];

function modeFromPath(pathname: string): Mode {
  return clientModes.find((item) => pathname.endsWith(`/${item}`)) ?? "classes";
}

const titles: Record<Mode, [string, string]> = {
  classes: ["Classes et affectations", "Pilotez les capacités, les élèves sans classe et les transferts groupés."],
  responsables: ["Responsables", "Administrez les rôles de contact, de paiement, d’urgence et de récupération."],
  documents: ["Documents obligatoires", "Configurez les pièces requises à la préinscription et à la confirmation."],
  imports: ["Import des élèves", "Préparez et historisez les imports contrôlés avant création des dossiers."],
  attestations: ["Attestations", "Émettez et retrouvez les certificats administratifs historisés."],
};

export function SchoolingAdministrationPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const mode = modeFromPath(pathname);
  const { institutionId, yearId, year } = useAcademicSession();
  const [items, setItems] = useState<any[]>([]);
  const [secondary, setSecondary] = useState<any[]>([]);
  const [selected, setSelected] = useState<any[]>([]);
  const [targetClass, setTargetClass] = useState("");
  const [failure, setFailure] = useState("");
  const [success, setSuccess] = useState("");
  const [dialog, setDialog] = useState(false);
  const [name, setName] = useState("");
  const [requiredFor, setRequiredFor] = useState("confirmation");

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setFailure("");
    try {
      if (mode === "classes") {
        const [classes, enrollments] = await Promise.all([listClassOccupancy(yearId), listAssignableEnrollments(institutionId, yearId)]);
        setItems(classes); setSecondary(enrollments);
      } else if (mode === "responsables") {
        setItems(await listGuardianLinks(institutionId)); setSecondary([]);
      } else if (mode === "documents") {
        setItems(await listDocumentRequirements(institutionId, yearId)); setSecondary([]);
      } else if (mode === "imports") {
        setItems(await listImportBatches(institutionId, yearId)); setSecondary([]);
      } else {
        const [certificates, enrollments] = await Promise.all([listCertificates(institutionId, yearId), listAssignableEnrollments(institutionId, yearId)]);
        setItems(certificates); setSecondary(enrollments);
      }
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Impossible de charger cet espace de travail.");
    }
  }, [institutionId, mode, yearId]);

  useEffect(() => { void load(); }, [load]);
  const [title, description] = titles[mode];
  const unassigned = useMemo(() => secondary.filter((item) => !item.currentAssignment), [secondary]);

  if (!yearId) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  const nav = <div className="flex flex-wrap gap-2">{clientModes.map((item) => <Button key={item} label={titles[item][0]} text={mode !== item} severity={mode === item ? undefined : "secondary"} onClick={() => navigate(`/scolarite/${item}`)} />)}</div>;

  return <SchoolingPanel path={`Scolarité · ${year?.name ?? "Année"}`} title={title} description={description} toolbar={nav} alert={failure ? <Message severity="error" text={failure} /> : success ? <Message severity="success" text={success} /> : undefined} actions={mode === "documents" ? <Button label="Ajouter une exigence" icon="pi pi-plus" onClick={() => setDialog(true)} /> : undefined}>
    {mode === "classes" ? <div className="space-y-5">
      <DataTable value={items} dataKey="id" emptyMessage="Aucune classe.">
        <Column field="name" header="Classe" />
        <Column field="code" header="Code" />
        <Column field="room" header="Salle" body={(row) => row.room || "—"} />
        <Column header="Effectif" body={(row) => <Tag severity={row.capacity && row.occupancy >= row.capacity ? "danger" : "success"} value={`${row.occupancy} / ${row.capacity ?? "∞"}`} />} />
      </DataTable>
      <section className="rounded-2xl border border-slate-200 p-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="m-0 text-base font-semibold">Élèves sans classe</h2><p className="m-0 text-sm text-slate-500">Sélectionnez plusieurs élèves puis affectez-les en une seule opération.</p></div>
          <div className="flex gap-2"><Dropdown value={targetClass} options={items.filter((item) => item.is_active)} optionLabel="name" optionValue="id" placeholder="Classe cible" onChange={(event) => setTargetClass(String(event.value))} /><Button label={`Affecter (${selected.length})`} disabled={!targetClass || !selected.length} onClick={() => void batchAssignEnrollments(selected.map((item) => item.id), targetClass, "Affectation groupée").then(() => { setSuccess("Affectation groupée terminée."); setSelected([]); return load(); }).catch((error) => setFailure(String(error)))} /></div>
        </div>
        <DataTable value={unassigned} selection={selected} onSelectionChange={(event) => setSelected(event.value)} dataKey="id"><Column selectionMode="multiple" /><Column header="Élève" body={(row) => `${row.student.first_name} ${row.student.last_name}`} /><Column header="Matricule" body={(row) => row.student.matricule} /><Column field="level_name_snapshot" header="Niveau" /></DataTable>
      </section>
    </div> : null}

    {mode === "responsables" ? <DataTable value={items} dataKey="student_id" paginator rows={15}>
      <Column header="Élève" body={(row) => `${row.student.first_name} ${row.student.last_name}`} />
      <Column header="Responsable" body={(row) => `${row.guardian.first_name} ${row.guardian.last_name}`} />
      <Column header="Téléphone" body={(row) => row.guardian.primary_phone} />
      {[["is_primary_contact","Principal"],["is_financial_responsible","Finance"],["is_emergency_contact","Urgence"],["can_pick_up","Récupération"],["receives_communications","Messages"]].map(([field, header]) => <Column key={field} header={header} body={(row) => <Checkbox checked={Boolean(row[field])} onChange={(event) => void updateGuardianLink(row.student_id,row.guardian_id,{[field]:Boolean(event.checked)}).then(load)} />} />)}
      <Column header="Actions" body={(row) => <Button icon="pi pi-unlink" severity="danger" text aria-label="Délier" onClick={() => void unlinkGuardian(row.student_id,row.guardian_id).then(load).catch(() => setFailure("Impossible de retirer le dernier responsable d’un élève."))} />} />
    </DataTable> : null}

    {mode === "documents" ? <><DataTable value={items} dataKey="id"><Column field="document_name" header="Document" /><Column field="required_for" header="Étape" /><Column field="cycle_id" header="Cycle" body={(row) => row.cycle_id ? "Ciblé" : "Tous"} /><Column field="level_id" header="Niveau" body={(row) => row.level_id ? "Ciblé" : "Tous"} /><Column field="is_active" header="Actif" body={(row) => <Tag severity={row.is_active ? "success" : "secondary"} value={row.is_active ? "Oui" : "Non"} />} /></DataTable>
      <Dialog header="Nouvelle exigence documentaire" visible={dialog} onHide={() => setDialog(false)}><div className="space-y-3"><InputText className="w-full" value={name} placeholder="Nom du document" onChange={(event) => setName(event.target.value)} /><Dropdown className="w-full" value={requiredFor} options={[{label:"Préinscription",value:"pre_registration"},{label:"Confirmation",value:"confirmation"},{label:"Les deux",value:"both"}]} onChange={(event) => setRequiredFor(String(event.value))} /><Button label="Enregistrer" disabled={!name.trim()} onClick={() => void saveDocumentRequirement({institution_id:institutionId,academic_year_id:yearId,document_name:name.trim(),required_for:requiredFor,is_active:true}).then(() => { setDialog(false); setName(""); return load(); })} /></div></Dialog></> : null}

    {mode === "imports" ? <div className="space-y-4"><Message severity="info" text="Format contrôlé : fichier CSV UTF-8 exporté depuis Excel. Colonnes attendues : prenom, nom, sexe, date_naissance, niveau, responsable, telephone." /><input type="file" accept=".csv,text/csv" onChange={(event) => { const file=event.target.files?.[0]; if(!file) return; const reader=new FileReader(); reader.onload=() => { const text=String(reader.result??""); const lines=text.split(/\r?\n/).filter(Boolean); const headers=(lines.shift()??"").split(";").map((value)=>value.trim()); const rows=lines.map((line)=>Object.fromEntries(line.split(";").map((value,index)=>[headers[index],value.trim()]))); void createImportBatch(institutionId,yearId,file.name,rows).then(() => { setSuccess(`${rows.length} ligne(s) préparée(s).`); return load(); }); }; reader.readAsText(file); }} /><DataTable value={items} dataKey="id"><Column field="file_name" header="Fichier" /><Column field="status" header="Statut" /><Column field="total_rows" header="Lignes" /><Column field="valid_rows" header="Valides" /><Column field="error_rows" header="Erreurs" /></DataTable></div> : null}

    {mode === "attestations" ? <div className="space-y-5"><section className="rounded-2xl border border-slate-200 p-4"><h2 className="mt-0 text-base font-semibold">Émettre une attestation</h2><DataTable value={secondary} dataKey="id" paginator rows={10}><Column header="Élève" body={(row) => `${row.student.first_name} ${row.student.last_name}`} /><Column field="level_name_snapshot" header="Niveau" /><Column header="Actions" body={(row) => <div className="flex gap-1"><Button label="Inscription" size="small" outlined onClick={() => void issueCertificate(row.id,"enrollment").then(load)} /><Button label="Scolarité" size="small" outlined onClick={() => void issueCertificate(row.id,"schooling").then(load)} /></div>} /></DataTable></section><DataTable value={items} dataKey="id"><Column field="reference" header="Référence" /><Column header="Élève" body={(row) => { const student=Array.isArray(row.student)?row.student[0]:row.student; return student ? `${student.first_name} ${student.last_name}` : "—"; }} /><Column field="certificate_type" header="Type" /><Column field="issued_at" header="Émise le" body={(row) => new Date(row.issued_at).toLocaleDateString("fr-FR")} /><Column header="Document" body={(row) => <Button label="Imprimer" icon="pi pi-print" text onClick={() => { const popup=window.open("","_blank"); if(!popup) return; popup.document.write(`<html><body style='font-family:Arial;padding:48px'><h1>Attestation</h1><p>Référence : ${row.reference}</p><p>Le présent document certifie la situation scolaire enregistrée dans GeeCole.</p><p>Émis le ${new Date(row.issued_at).toLocaleDateString("fr-FR")}</p><script>window.print()</script></body></html>`); popup.document.close(); }} />} /></DataTable></div> : null}
  </SchoolingPanel>;
}
