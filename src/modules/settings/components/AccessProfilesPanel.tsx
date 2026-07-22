import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { MultiSelect } from "primereact/multiselect";
import { Tag } from "primereact/tag";
import { Toolbar } from "primereact/toolbar";
import { TableSearch } from "../../../shared/components/TableSearch";
import { useToast } from "../../../shared/components/toast-context";
import {
  createCustomAccessProfile,
  listAccessProfilePermissionCodes,
  listAssignablePermissions,
  updateCustomAccessProfile,
} from "../services/access-profiles.service";
import { listAccessProfiles } from "../services/annual-settings.service";

type AccessProfile = Awaited<ReturnType<typeof listAccessProfiles>>[number];
type Permission = Awaited<ReturnType<typeof listAssignablePermissions>>[number];

const emptyForm = {
  name: "",
  description: "",
  permissionCodes: [] as string[],
  active: true,
};

export function AccessProfilesPanel({
  institutionId,
  onChanged,
}: {
  institutionId: string;
  onChanged: () => Promise<void>;
}) {
  const notify = useToast();
  const [profiles, setProfiles] = useState<AccessProfile[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AccessProfile | null | undefined>(
    undefined,
  );
  const [sourceProfileId, setSourceProfileId] = useState<string>();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [accessProfiles, assignablePermissions] = await Promise.all([
      listAccessProfiles(institutionId),
      listAssignablePermissions(institutionId),
    ]);
    setProfiles(accessProfiles);
    setPermissions(assignablePermissions);
  }, [institutionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = async (profile?: AccessProfile) => {
    if (!profile) {
      setEditing(null);
      setSourceProfileId(undefined);
      setForm(emptyForm);
      return;
    }
    const permissionCodes = await listAccessProfilePermissionCodes(profile.id);
    if (profile.is_standard) {
      setEditing(null);
      setSourceProfileId(profile.id);
      setForm({
        name: `${profile.name} personnalisé`,
        description: profile.description,
        permissionCodes,
        active: true,
      });
      return;
    }
    setEditing(profile);
    setSourceProfileId(profile.source_template_id ?? undefined);
    setForm({
      name: profile.name,
      description: profile.description,
      permissionCodes,
      active: profile.is_active,
    });
  };

  const save = async () => {
    if (!form.name.trim() || !form.permissionCodes.length) return;
    setSaving(true);
    try {
      if (editing) {
        await updateCustomAccessProfile({ id: editing.id, ...form });
      } else {
        await createCustomAccessProfile({
          institutionId,
          name: form.name,
          description: form.description,
          permissionCodes: form.permissionCodes,
          sourceProfileId,
        });
      }
      setEditing(undefined);
      await Promise.all([load(), onChanged()]);
      notify({
        severity: "success",
        summary: editing ? "Profil mis à jour" : "Profil personnalisé créé",
      });
    } catch {
      notify({
        severity: "error",
        summary: "Enregistrement du profil impossible",
        detail:
          "Une permission sensible ou non délégable a peut-être été sélectionnée.",
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    if (!query) return profiles;
    return profiles.filter((profile) =>
      [profile.name, profile.code, profile.description].some((value) =>
        value.toLocaleLowerCase("fr").includes(query),
      ),
    );
  }, [profiles, search]);

  const permissionOptions = permissions.map((permission) => ({
    ...permission,
    displayLabel: `${permission.label} · ${permission.code}`,
  }));

  return (
    <>
      <Toolbar
        start={
          <TableSearch
            id="access-profile-search"
            value={search}
            onChange={setSearch}
            placeholder="Rechercher un profil"
          />
        }
        end={
          <Button
            label="Nouveau profil"
            icon="pi pi-plus"
            size="small"
            onClick={() => void open()}
          />
        }
        className="mb-3 min-h-0 rounded-none border-0 bg-transparent p-0"
      />
      <DataTable
        value={filteredProfiles}
        dataKey="id"
        emptyMessage="Aucun profil d’accès"
        stripedRows
        responsiveLayout="scroll"
        size="small"
      >
        <Column field="name" header="Profil" />
        <Column field="description" header="Responsabilité" />
        <Column
          header="Origine"
          body={(profile: AccessProfile) => (
            <Tag
              value={profile.is_standard ? "Standard GeEcole" : "Personnalisé"}
              severity={profile.is_standard ? "info" : "secondary"}
            />
          )}
        />
        <Column
          header="Statut"
          body={(profile: AccessProfile) => (
            <Tag
              value={profile.is_active ? "Actif" : "Inactif"}
              severity={profile.is_active ? "success" : "secondary"}
            />
          )}
        />
        <Column
          header="Actions"
          headerClassName="text-right"
          bodyClassName="text-right"
          body={(profile: AccessProfile) => (
            <Button
              label={profile.is_standard ? "Dupliquer" : "Modifier"}
              icon={profile.is_standard ? "pi pi-copy" : "pi pi-pencil"}
              text
              size="small"
              onClick={() => void open(profile)}
            />
          )}
        />
      </DataTable>

      <Dialog
        header={editing ? "Modifier le profil" : "Nouveau profil personnalisé"}
        visible={editing !== undefined}
        modal
        className="form-dialog w-[min(96vw,52rem)]"
        onHide={() => setEditing(undefined)}
      >
        <div className="form-stack">
          <div className="field">
            <label htmlFor="access-profile-name">Nom du profil</label>
            <InputText
              id="access-profile-name"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
          </div>
          <div className="field">
            <label htmlFor="access-profile-description">Description</label>
            <InputTextarea
              id="access-profile-description"
              value={form.description}
              rows={2}
              autoResize
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </div>
          <div className="field">
            <label htmlFor="access-profile-permissions">Permissions</label>
            <MultiSelect
              inputId="access-profile-permissions"
              value={form.permissionCodes}
              options={permissionOptions}
              optionLabel="displayLabel"
              optionValue="code"
              display="chip"
              filter
              className="w-full"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  permissionCodes: event.value as string[],
                }))
              }
            />
          </div>
          {editing && (
            <label className="flex items-center gap-2">
              <InputSwitch
                checked={form.active}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    active: event.value,
                  }))
                }
              />
              Profil actif
            </label>
          )}
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
              disabled={!form.name.trim() || !form.permissionCodes.length}
              onClick={() => void save()}
            />
          </div>
        </div>
      </Dialog>
    </>
  );
}
