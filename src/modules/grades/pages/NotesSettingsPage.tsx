import { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useNavigate } from "react-router-dom";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { supabase } from "../../../shared/lib/supabase/client";

interface ConfigurationCardProps {
  title: string;
  description: string;
  icon: string;
  count: number;
  action: string;
  path: string;
  ready: boolean;
}

function ConfigurationCard({ title, description, icon, count, action, path, ready }: ConfigurationCardProps) {
  const navigate = useNavigate();
  return <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div className="flex gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-lg ${ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}><i className={icon} /></span>
        <div><h2 className="font-semibold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div>
      </div>
      <Tag value={ready ? `${count} configuré(s)` : "À configurer"} severity={ready ? "success" : "warning"} />
    </div>
    <div className="mt-4 flex justify-end"><Button label={action} icon="pi pi-arrow-right" iconPos="right" outlined size="small" onClick={() => navigate(path)} /></div>
  </section>;
}

export function NotesSettingsPage() {
  const { year } = useAcademicSession();
  const [counts, setCounts] = useState({ teachers: 0, assignments: 0, types: 0, formulas: 0 });

  useEffect(() => {
    if (!year) return;
    void Promise.all([
      supabase.from("teacher_profiles").select("id", { count: "exact", head: true }).eq("academic_year_id", year.id).eq("is_active", true),
      supabase.from("teaching_assignments").select("id", { count: "exact", head: true }).eq("academic_year_id", year.id).eq("is_active", true),
      supabase.from("assessment_types").select("id", { count: "exact", head: true }).eq("academic_year_id", year.id).eq("is_active", true),
      supabase.from("grading_formulas").select("id", { count: "exact", head: true }).eq("academic_year_id", year.id).eq("is_active", true),
    ]).then(([teachers, assignments, types, formulas]) => setCounts({
      teachers: teachers.count ?? 0,
      assignments: assignments.count ?? 0,
      types: types.count ?? 0,
      formulas: formulas.count ?? 0,
    }));
  }, [year]);

  if (!year) return <Message severity="warn" text="Sélectionnez une année scolaire pour configurer le module Notes." />;

  const complete = counts.teachers > 0 && counts.assignments > 0 && counts.types > 0 && counts.formulas > 0;
  return <div className="space-y-4">
    <PageHeader title="Paramétrage du module Notes" description="Préparez les enseignants, les affectations, les types d’évaluation et les règles de calcul avant la saisie." meta={<Tag value={complete ? "Module prêt" : "Configuration incomplète"} severity={complete ? "success" : "warning"} />} />
    {!complete ? <Message severity="warn" text="Le cahier de notes ne sera pleinement opérationnel qu’après configuration des quatre référentiels ci-dessous." /> : null}
    <div className="grid gap-4 lg:grid-cols-2">
      <ConfigurationCard title="Enseignants" description="Profils professionnels actifs pour l’année scolaire." icon="pi pi-id-card" count={counts.teachers} ready={counts.teachers > 0} action="Gérer les enseignants" path="/notes/enseignants" />
      <ConfigurationCard title="Affectations pédagogiques" description="Couples enseignant, classe et matière autorisés." icon="pi pi-sitemap" count={counts.assignments} ready={counts.assignments > 0} action="Gérer les affectations" path="/notes/affectations" />
      <ConfigurationCard title="Types d’évaluation" description="Codes utilisables dans les formules : EVAL, COMP, ORAL…" icon="pi pi-tags" count={counts.types} ready={counts.types > 0} action="Configurer les types" path="/parametrage/types-notes" />
      <ConfigurationCard title="Formules de calcul" description="Règles de calcul par cycle, niveau, matière et période." icon="pi pi-percentage" count={counts.formulas} ready={counts.formulas > 0} action="Configurer les formules" path="/parametrage/formules-calcul" />
    </div>
  </div>;
}
