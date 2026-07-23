import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { SchoolingPanel } from "../components/SchoolingPanel";
import {
  listAttendance,
  listEnrollmentDocuments,
  listEnrollmentWorkflows,
  type AttendanceRow,
  type EnrollmentDocumentRow,
  type EnrollmentWorkflowRow,
} from "../services/schooling-workflows.service";

type WorkItem = {
  id: string;
  priority: "Urgent" | "Aujourd’hui" | "À traiter" | "Préparation";
  label: string;
  description: string;
  count: number;
  route: string;
};

type RecentItem = {
  id: string;
  label: string;
  detail: string;
  date: string;
  route: string;
};

type Kpi = {
  id: string;
  label: string;
  value: number | string;
  description: string;
  icon: string;
  route?: string;
};

const profileLabels: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Direction",
  secretary: "Secrétariat",
  teacher: "Enseignant",
  finance: "Finance",
  parent: "Parent",
  student: "Élève",
};

const prioritySeverity = {
  Urgent: "danger",
  "Aujourd’hui": "warning",
  "À traiter": "info",
  Préparation: "secondary",
} as const;

const buttonReset =
  "appearance-none border-0 bg-transparent p-0 text-left font-inherit text-inherit shadow-none outline-none";

function adaptiveSpan(index: number, total: number) {
  if (total <= 1) return "md:col-span-6";
  if (total === 2) return "md:col-span-3";

  const remainder = total % 3;
  if (remainder === 1 && index === total - 1) return "md:col-span-6";
  if (remainder === 2 && index >= total - 2) return "md:col-span-3";
  return "md:col-span-2";
}

const formatActivityDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-GN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export function SchoolingCockpitPage() {
  const navigate = useNavigate();
  const { institutionId, yearId, year, functionalProfile } =
    useAcademicSession();
  const [enrollments, setEnrollments] = useState<EnrollmentWorkflowRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [documents, setDocuments] = useState<EnrollmentDocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState("");

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true);
    setFailure("");

    const [enrollmentResult, attendanceResult, documentResult] =
      await Promise.allSettled([
        listEnrollmentWorkflows(institutionId, yearId),
        listAttendance(institutionId, yearId),
        listEnrollmentDocuments(institutionId, yearId),
      ]);

    const errors: string[] = [];
    if (enrollmentResult.status === "fulfilled")
      setEnrollments(enrollmentResult.value);
    else errors.push("les inscriptions");

    if (attendanceResult.status === "fulfilled")
      setAttendance(attendanceResult.value);
    else errors.push("l’assiduité");

    if (documentResult.status === "fulfilled")
      setDocuments(documentResult.value);
    else errors.push("les documents");

    if (errors.length) {
      setFailure(
        `Certaines données n’ont pas pu être chargées : ${errors.join(", ")}.`,
      );
    }
    setLoading(false);
  }, [institutionId, yearId]);

  useEffect(() => void load(), [load]);

  const metrics = useMemo(() => {
    const confirmed = enrollments.filter(
      (item) => item.status === "confirmed",
    ).length;
    const drafts = enrollments.filter((item) => item.status === "draft").length;
    const preRegistered = enrollments.filter(
      (item) => item.status === "pre_registered",
    ).length;
    const withoutClass = enrollments.filter(
      (item) => item.status === "confirmed" && !item.assignment[0]?.class_name,
    ).length;
    const unjustified = attendance.filter(
      (item) => item.justification_status !== "justified",
    ).length;
    const today = new Date().toISOString().slice(0, 10);
    const attendanceToday = attendance.filter(
      (item) => item.attendance_date === today,
    ).length;
    const documentsToReview = documents.filter((item) =>
      ["received", "rejected", "expired"].includes(item.status),
    ).length;
    const pending = drafts + preRegistered;
    const decisionBase = confirmed + pending;
    const confirmationRate = decisionBase
      ? Math.round((confirmed / decisionBase) * 100)
      : 0;

    return {
      confirmed,
      drafts,
      preRegistered,
      withoutClass,
      unjustified,
      attendanceToday,
      documentsToReview,
      pending,
      confirmationRate,
    };
  }, [attendance, documents, enrollments]);

  const profile = functionalProfile ?? "secretary";

  const kpis = useMemo<Kpi[]>(() => {
    if (["owner", "admin"].includes(profile)) {
      return [
        {
          id: "confirmed",
          label: "Effectif inscrit",
          value: metrics.confirmed,
          description: "Élèves confirmés dans l’année active",
          icon: "pi-users",
          route: "/scolarite/eleves",
        },
        {
          id: "pending",
          label: "Dossiers à décider",
          value: metrics.pending,
          description: "Brouillons et préinscriptions en attente",
          icon: "pi-inbox",
          route: "/scolarite/inscriptions",
        },
        {
          id: "rate",
          label: "Taux de confirmation",
          value: `${metrics.confirmationRate}%`,
          description: "Part des dossiers devenus inscriptions",
          icon: "pi-chart-line",
          route: "/scolarite/inscriptions",
        },
        {
          id: "without-class",
          label: "Élèves sans classe",
          value: metrics.withoutClass,
          description: "Inscriptions confirmées à répartir",
          icon: "pi-sitemap",
          route: "/scolarite/eleves",
        },
        {
          id: "attendance",
          label: "Assiduité à traiter",
          value: metrics.unjustified,
          description: `${metrics.attendanceToday} événement(s) enregistré(s) aujourd’hui`,
          icon: "pi-calendar-minus",
          route: "/scolarite/assiduite",
        },
        {
          id: "documents",
          label: "Documents à contrôler",
          value: metrics.documentsToReview,
          description: "Pièces reçues, rejetées ou expirées",
          icon: "pi-folder-open",
          route: "/scolarite/documents",
        },
      ];
    }

    if (profile === "teacher") {
      return [
        {
          id: "confirmed",
          label: "Élèves inscrits",
          value: metrics.confirmed,
          description: "Effectif visible dans votre périmètre",
          icon: "pi-users",
          route: "/scolarite/eleves",
        },
        {
          id: "today",
          label: "Assiduité du jour",
          value: metrics.attendanceToday,
          description: "Absences et retards saisis aujourd’hui",
          icon: "pi-calendar",
          route: "/scolarite/assiduite",
        },
        {
          id: "unjustified",
          label: "À justifier",
          value: metrics.unjustified,
          description: "Événements encore non justifiés",
          icon: "pi-exclamation-circle",
          route: "/scolarite/assiduite",
        },
      ];
    }

    if (profile === "finance") {
      return [
        {
          id: "confirmed",
          label: "Élèves inscrits",
          value: metrics.confirmed,
          description: "Dossiers pouvant porter une situation financière",
          icon: "pi-users",
          route: "/scolarite/eleves",
        },
        {
          id: "pending",
          label: "Dossiers non confirmés",
          value: metrics.pending,
          description: "Dossiers sans inscription définitive",
          icon: "pi-file-edit",
          route: "/scolarite/inscriptions",
        },
        {
          id: "pre",
          label: "Préinscriptions",
          value: metrics.preRegistered,
          description: "Candidats hors effectif confirmé",
          icon: "pi-calendar-plus",
          route: "/scolarite/preinscriptions",
        },
      ];
    }

    return [
      {
        id: "confirmed",
        label: "Inscriptions confirmées",
        value: metrics.confirmed,
        description: "Élèves présents dans la liste officielle",
        icon: "pi-user-plus",
        route: "/scolarite/eleves",
      },
      {
        id: "drafts",
        label: "Brouillons",
        value: metrics.drafts,
        description: "Dossiers incomplets à reprendre",
        icon: "pi-file-edit",
        route: "/scolarite/inscriptions",
      },
      {
        id: "pre",
        label: "Préinscriptions",
        value: metrics.preRegistered,
        description: "Candidats à contrôler avant confirmation",
        icon: "pi-calendar-plus",
        route: "/scolarite/preinscriptions",
      },
      {
        id: "without-class",
        label: "Sans classe",
        value: metrics.withoutClass,
        description: "Élèves confirmés sans affectation",
        icon: "pi-sitemap",
        route: "/scolarite/eleves",
      },
      {
        id: "documents",
        label: "Documents à contrôler",
        value: metrics.documentsToReview,
        description: "Pièces qui nécessitent une décision",
        icon: "pi-folder-open",
        route: "/scolarite/documents",
      },
    ];
  }, [metrics, profile]);

  const workItems = useMemo<WorkItem[]>(() => {
    const common: WorkItem[] = [
      {
        id: "without-class",
        priority: "Urgent",
        label: "Affecter les élèves sans classe",
        description:
          "Ouvrir la liste des élèves confirmés et compléter leur parcours scolaire.",
        count: metrics.withoutClass,
        route: "/scolarite/eleves",
      },
      {
        id: "documents",
        priority: "Aujourd’hui",
        label: "Contrôler les documents reçus",
        description:
          "Valider ou rejeter les pièces qui attendent une décision.",
        count: metrics.documentsToReview,
        route: "/scolarite/documents",
      },
      {
        id: "attendance",
        priority: "À traiter",
        label: "Traiter les absences et retards",
        description: "Mettre à jour les justificatifs encore ouverts.",
        count: metrics.unjustified,
        route: "/scolarite/assiduite",
      },
    ];

    if (profile === "teacher")
      return common.filter((item) => item.id === "attendance");
    if (profile === "finance") {
      return [
        {
          id: "pending",
          priority: "À traiter",
          label: "Suivre les dossiers non confirmés",
          description:
            "Les dossiers non confirmés ne sont pas encore dans l’effectif officiel.",
          count: metrics.pending,
          route: "/scolarite/inscriptions",
        },
      ];
    }

    return [
      ...common,
      {
        id: "drafts",
        priority: "À traiter",
        label: "Reprendre les brouillons d’inscription",
        description: "Compléter puis soumettre les dossiers interrompus.",
        count: metrics.drafts,
        route: "/scolarite/inscriptions",
      },
      {
        id: "pre",
        priority: "Préparation",
        label: "Examiner les préinscriptions",
        description: "Contrôler les candidats avant leur confirmation.",
        count: metrics.preRegistered,
        route: "/scolarite/preinscriptions",
      },
    ];
  }, [metrics, profile]);

  const alerts = workItems.filter(
    (item) =>
      item.count > 0 && ["Urgent", "Aujourd’hui"].includes(item.priority),
  );

  const recentItems = useMemo<RecentItem[]>(
    () =>
      enrollments.slice(0, 8).map((item) => ({
        id: item.id,
        label: `${item.student.first_name} ${item.student.last_name}`,
        detail:
          item.status === "confirmed"
            ? "Inscription confirmée"
            : item.status === "pre_registered"
              ? "Préinscription enregistrée"
              : item.status === "draft"
                ? "Brouillon mis à jour"
                : "Dossier mis à jour",
        date: item.updated_at || item.created_at,
        route:
          item.status === "confirmed"
            ? `/scolarite/eleves/${item.student.id}`
            : "/scolarite/inscriptions",
      })),
    [enrollments],
  );

  if (!yearId)
    return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  const overviewCards = [
    {
      id: "recent",
      title: "Actions récentes",
      description: "Les dernières opérations du module.",
      content: recentItems.length ? (
        <div className="divide-y divide-slate-100">
          {recentItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${buttonReset} flex w-full items-center gap-3 px-4 py-3 transition hover:bg-slate-50`}
              onClick={() => void navigate(item.route)}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-emerald-50 text-emerald-700">
                <i className="pi pi-history text-sm" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm font-semibold text-slate-900">
                  {item.label}
                </strong>
                <small className="mt-0.5 block truncate text-xs text-slate-500">
                  {item.detail}
                </small>
              </span>
              <time className="shrink-0 text-xs text-slate-400">
                {formatActivityDate(item.date)}
              </time>
              <i className="pi pi-chevron-right text-[10px] text-slate-400" />
            </button>
          ))}
        </div>
      ) : (
        <div className="grid min-h-44 place-items-center px-6 text-center text-sm text-slate-500">
          Aucune activité récente dans cette année scolaire.
        </div>
      ),
    },
    {
      id: "alerts",
      title: "Alertes du module",
      description: "Les situations qui nécessitent une action.",
      content: alerts.length ? (
        <div className="divide-y divide-slate-100">
          {alerts.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${buttonReset} flex w-full items-center gap-3 px-4 py-3 transition hover:bg-slate-50`}
              onClick={() => void navigate(item.route)}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-amber-50 text-amber-700">
                <i className="pi pi-exclamation-triangle text-sm" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block text-sm font-semibold text-slate-900">
                  {item.label}
                </strong>
                <small className="mt-0.5 block text-xs text-slate-500">
                  {item.description}
                </small>
              </span>
              <Tag value={String(item.count)} severity="warning" />
            </button>
          ))}
        </div>
      ) : (
        <div className="grid min-h-44 place-items-center px-6 text-center">
          <div>
            <span className="mx-auto grid size-10 place-items-center rounded-full bg-emerald-50 text-emerald-700">
              <i className="pi pi-check" />
            </span>
            <p className="mt-3 text-sm font-semibold text-slate-900">
              Aucune alerte prioritaire
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Les contrôles principaux sont à jour.
            </p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <SchoolingPanel
      path={`Scolarité · ${year?.name ?? "Année scolaire"}`}
      title="Vue d’ensemble"
      description={`Pilotage de la scolarité adapté au profil ${profileLabels[profile] ?? profile}.`}
      actions={
        <div className="flex items-center gap-2">
          <Tag value={profileLabels[profile] ?? profile} severity="info" />
          <Button
            label="Actualiser"
            icon="pi pi-refresh"
            severity="secondary"
            outlined
            loading={loading}
            onClick={() => void load()}
          />
        </div>
      }
      alert={failure ? <Message severity="warn" text={failure} /> : undefined}
    >
      <div className="space-y-6">
        <section>
          <div className="mb-3">
            <h2 className="m-0 text-base font-semibold text-slate-950">
              À retenir maintenant
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Activité récente et alertes du périmètre courant.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
            {overviewCards.map((card, index) => (
              <article
                key={card.id}
                className={`${adaptiveSpan(index, overviewCards.length)} flex min-h-[292px] min-w-0 flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm`}
              >
                <header className="border-b border-slate-200 px-4 py-3">
                  <h3 className="m-0 text-sm font-semibold text-slate-950">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {card.description}
                  </p>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {card.content}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="m-0 text-base font-semibold text-slate-950">
                Indicateurs de pilotage
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Les chiffres utiles à votre fonction, sans dupliquer les
                workflows.
              </p>
            </div>
            <span className="text-xs font-medium text-slate-400">
              Année {year?.name ?? "active"}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
            {kpis.map((kpi, index) => (
              <button
                key={kpi.id}
                type="button"
                className={`${buttonReset} ${adaptiveSpan(index, kpis.length)} group flex min-h-36 w-full flex-col justify-between rounded-md border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm`}
                onClick={() => kpi.route && void navigate(kpi.route)}
              >
                <span className="flex w-full items-start justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {kpi.label}
                  </span>
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-slate-50 text-slate-500 transition group-hover:bg-emerald-50 group-hover:text-emerald-700">
                    <i className={`pi ${kpi.icon} text-sm`} />
                  </span>
                </span>
                <strong className="mt-3 block text-3xl font-semibold tracking-tight text-slate-950">
                  {kpi.value}
                </strong>
                <span className="mt-2 block text-xs leading-5 text-slate-500">
                  {kpi.description}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="m-0 text-base font-semibold text-slate-950">
                Travail à traiter
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Les missions prioritaires correspondant à votre profil.
              </p>
            </div>
            <span className="text-sm font-semibold text-slate-700">
              {workItems.filter((item) => item.count > 0).length} file(s)
              active(s)
            </span>
          </header>
          <div className="divide-y divide-slate-100">
            {workItems
              .filter((item) => item.count > 0)
              .map((item) => (
                <div
                  key={item.id}
                  className="grid gap-3 px-4 py-4 md:grid-cols-[130px_minmax(0,1fr)_80px_auto] md:items-center"
                >
                  <Tag
                    value={item.priority}
                    severity={prioritySeverity[item.priority]}
                  />
                  <div className="min-w-0">
                    <strong className="block text-sm font-semibold text-slate-900">
                      {item.label}
                    </strong>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      {item.description}
                    </span>
                  </div>
                  <strong className="text-2xl font-semibold text-slate-950">
                    {item.count}
                  </strong>
                  <Button
                    label="Ouvrir"
                    icon="pi pi-arrow-right"
                    iconPos="right"
                    severity="secondary"
                    text
                    onClick={() => void navigate(item.route)}
                  />
                </div>
              ))}
            {!workItems.some((item) => item.count > 0) ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                Aucune tâche prioritaire dans votre périmètre.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </SchoolingPanel>
  );
}
