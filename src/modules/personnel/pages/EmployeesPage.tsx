import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Menu } from "primereact/menu";
import { Tag } from "primereact/tag";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { useToast } from "../../../shared/components/toast-context";
import { EmployeeCreateWizard } from "../components/EmployeeCreateWizard";
import type { Employee, EmployeeStatus } from "../domain/personnel";
import { employeeStatusLabels } from "../domain/personnel";
import type { CatalogItem } from "../services/personnel.service";
import {
  listEmployees,
  listPersonnelCatalog,
} from "../services/personnel.service";

export function EmployeesPage() {
  const { institutionId } = useAcademicSession();
  const notify = useToast();
  const navigate = useNavigate();
  const menu = useRef<Menu>(null);
  const [items, setItems] = useState<Employee[]>([]);
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<EmployeeStatus>();
  const [access, setAccess] = useState<boolean>();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [employees, catalogItems] = await Promise.all([
        listEmployees(institutionId),
        listPersonnelCatalog(institutionId),
      ]);
      setItems(employees);
      setCatalogs(catalogItems);
    } catch (error) {
      notify({
        severity: "error",
        summary: "Chargement impossible",
        detail: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [institutionId, notify]);
  useEffect(() => {
    void load();
  }, [load]);
  const filtered = useMemo(
    () =>
      items.filter(
        (x) =>
          (!status || x.status === status) &&
          (access === undefined || Boolean(x.membership_id) === access) &&
          `${x.first_name} ${x.last_name} ${x.employee_number} ${x.phone || ""}`
            .toLowerCase()
            .includes(search.trim().toLowerCase()),
      ),
    [items, search, status, access],
  );
  const counts = useMemo(
    () => ({
      active: items.filter((x) => x.status === "active").length,
      withoutAccess: items.filter((x) => !x.membership_id).length,
    }),
    [items],
  );
  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        title="Personnel"
        description="Recherchez une personne, consultez son dossier ou réalisez une action administrative."
        meta={
          <span className="text-sm text-slate-500">
            {filtered.length} sur {items.length} personne
            {items.length > 1 ? "s" : ""}
          </span>
        }
        actions={
          <div className="flex gap-2">
            <Menu
              ref={menu}
              popup
              model={[
                {
                  label: "Importer un fichier",
                  icon: "pi pi-upload",
                  disabled: true,
                },
                {
                  label: "Exporter la liste",
                  icon: "pi pi-download",
                  disabled: true,
                },
              ]}
            />
            <Button
              icon="pi pi-ellipsis-v"
              severity="secondary"
              outlined
              aria-label="Autres actions"
              onClick={(event) => menu.current?.toggle(event)}
            />
            <Button
              label="Ajouter un membre"
              icon="pi pi-user-plus"
              onClick={() => setOpen(true)}
            />
          </div>
        }
      />
      <section className="grid gap-3 sm:grid-cols-3" aria-label="Synthèse de la liste">
        <Kpi label="Personnel actif" value={counts.active} icon="pi-users" />
        <Kpi
          label="Sans accès GeEcole"
          value={counts.withoutAccess}
          icon="pi-lock"
        />
        <Kpi
          label="Dossiers affichés"
          value={filtered.length}
          icon="pi-filter"
        />
      </section>
      <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 lg:flex-row" aria-label="Filtres du personnel">
        <span className="p-input-icon-left min-w-0 flex-1">
          <i className="pi pi-search" />
          <InputText
            className="w-full"
            value={search}
            placeholder="Nom, matricule ou téléphone"
            onChange={(e) => setSearch(e.target.value)}
          />
        </span>
        <Dropdown
          className="w-full lg:w-52"
          value={status}
          showClear
          placeholder="Tous les états"
          options={Object.entries(employeeStatusLabels).map(
            ([value, label]) => ({ value, label }),
          )}
          onChange={(e) => setStatus(e.value)}
        />
        <Dropdown
          className="w-full lg:w-52"
          value={access}
          showClear
          placeholder="Tous les accès"
          options={[
            { value: true, label: "Avec accès" },
            { value: false, label: "Sans accès" },
          ]}
          onChange={(e) => setAccess(e.value)}
        />
        {(search || status || access !== undefined) && (
          <Button
            label="Réinitialiser"
            icon="pi pi-filter-slash"
            severity="secondary"
            text
            onClick={() => {
              setSearch("");
              setStatus(undefined);
              setAccess(undefined);
            }}
          />
        )}
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <DataTable
          value={filtered}
          dataKey="id"
          loading={loading}
          paginator
          rows={10}
          rowsPerPageOptions={[10, 20, 50]}
          stripedRows
          emptyMessage="Aucun membre du personnel ne correspond aux filtres."
          selectionMode="single"
          onRowClick={(event) =>
            void navigate(`/personnel/employes/${(event.data as Employee).id}`)
          }
          rowClassName={() => "cursor-pointer"}
        >
          <Column
            header="Personnel"
            body={(x: Employee) => (
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                  {x.first_name[0]}
                  {x.last_name[0]}
                </span>
                <div>
                  <strong className="block text-sm text-slate-900">
                    {x.first_name} {x.last_name}
                  </strong>
                  <small className="text-slate-500">{x.employee_number}</small>
                </div>
              </div>
            )}
          />
          <Column
            header="Contact"
            body={(x: Employee) => (
              <div className="text-sm">
                <span className="block">{x.phone || "—"}</span>
                <small className="text-slate-500">
                  {x.email || "E-mail non renseigné"}
                </small>
              </div>
            )}
          />
          <Column
            header="Entrée"
            body={(x: Employee) =>
              new Intl.DateTimeFormat("fr-FR").format(
                new Date(`${x.hired_on}T00:00:00`),
              )
            }
          />
          <Column
            header="État"
            body={(x: Employee) => (
              <Tag
                value={employeeStatusLabels[x.status]}
                severity={
                  x.status === "active"
                    ? "success"
                    : x.status === "suspended"
                      ? "warning"
                      : "secondary"
                }
              />
            )}
          />
          <Column
            header="Accès"
            body={(x: Employee) => (
              <Tag
                value={x.membership_id ? "Compte lié" : "Sans accès"}
                severity={x.membership_id ? "info" : "secondary"}
              />
            )}
          />
          <Column
            header=""
            className="w-16"
            body={(x: Employee) => (
              <Button
                icon="pi pi-chevron-right"
                text
                rounded
                aria-label={`Ouvrir la fiche de ${x.first_name} ${x.last_name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  void navigate(`/personnel/employes/${x.id}`);
                }}
              />
            )}
          />
        </DataTable>
      </section>
      <EmployeeCreateWizard
        visible={open}
        institutionId={institutionId}
        catalogs={catalogs}
        onHide={() => setOpen(false)}
        notify={notify}
        onCreated={(employee) => {
          setItems((current) =>
            [...current, employee].sort((a, b) =>
              a.last_name.localeCompare(b.last_name),
            ),
          );
          void navigate(`/personnel/employes/${employee.id}`);
        }}
      />
    </div>
  );
}
function Kpi({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <article className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <i className={`pi ${icon} rounded-xl bg-slate-100 p-3 text-slate-600`} />
      <div>
        <strong className="block text-lg text-slate-900">{value}</strong>
        <span className="text-xs text-slate-500">{label}</span>
      </div>
    </article>
  );
}
