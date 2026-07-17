import { useCallback, useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputTextarea } from "primereact/inputtextarea";
import { Tag } from "primereact/tag";
import { useToast } from "../../../shared/components/toast-context";
import {
  assignEnrollment,
  getEnrollmentAssignment,
  listClasses,
  type SchoolClass,
} from "../services/classes.service";
export function StudentClassAssignment({
  enrollmentId,
  yearId,
  annualLevelId,
}: {
  enrollmentId: string;
  yearId: string;
  annualLevelId: string;
}) {
  const notify = useToast();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [currentId, setCurrentId] = useState("");
  const [dialog, setDialog] = useState(false);
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const load = useCallback(async () => {
    const [items, assignment] = await Promise.all([
      listClasses(yearId),
      getEnrollmentAssignment(enrollmentId),
    ]);
    setClasses(
      items.filter(
        (item) =>
          item.is_active && item.academic_year_level_id === annualLevelId,
      ),
    );
    setCurrentId(assignment?.class_id ?? "");
  }, [annualLevelId, enrollmentId, yearId]);
  useEffect(() => void load(), [load]);
  const current = classes.find((item) => item.id === currentId);
  return (
    <div className="class-assignment-control">
      <div>
        <span className="eyebrow">Classe actuelle</span>
        <strong>{current?.name ?? "Non affecté"}</strong>
      </div>
      {current && (
        <Tag
          value={`${current.capacity ?? "∞"} places max.`}
          severity="secondary"
        />
      )}
      <Button
        label={current ? "Changer de classe" : "Affecter une classe"}
        icon="pi pi-users"
        outlined
        onClick={() => {
          setTarget(currentId);
          setDialog(true);
        }}
      />
      <Dialog
        header="Affecter une classe"
        visible={dialog}
        onHide={() => setDialog(false)}
        className="form-dialog"
      >
        <label className="field">
          <span>Classe</span>
          <Dropdown
            value={target}
            options={classes}
            optionLabel="name"
            optionValue="id"
            placeholder="Choisir une classe"
            onChange={(event) => setTarget(String(event.value))}
          />
        </label>
        {currentId && target !== currentId && (
          <label className="field">
            <span>Motif du changement</span>
            <InputTextarea
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
        )}
        <div className="dialog-actions">
          <Button
            label="Enregistrer"
            disabled={
              !target ||
              (Boolean(currentId) && target !== currentId && !reason.trim())
            }
            onClick={() =>
              void assignEnrollment(enrollmentId, target, reason)
                .then(load)
                .then(() => {
                  setDialog(false);
                  notify({
                    severity: "success",
                    summary: "Classe enregistrée",
                  });
                })
            }
          />
        </div>
      </Dialog>
    </div>
  );
}
