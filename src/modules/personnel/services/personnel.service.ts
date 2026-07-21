import { supabase } from "../../../shared/lib/supabase/client";
import type {
  CompensationMode,
  Employee,
  EmployeeStatus,
  EmployeeSanction,
  EmployeeProfile,
  LeaveRequest,
  PayrollEntry,
  PayrollEntryDetail,
  PayrollPeriod,
  PersonnelDashboard,
  SalaryAdvance,
  WorkEntry,
} from "../domain/personnel";
export type CatalogItem = {
  id: string;
  category: string;
  code: string;
  default_label: string;
  local_label: string | null;
  is_system: boolean;
  is_active: boolean;
  display_order: number;
};

const fail = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

export async function getPersonnelDashboard(
  institutionId: string,
): Promise<PersonnelDashboard> {
  const [employees, leaves, work, advances, payroll, alerts] =
    await Promise.all([
      supabase
        .from("employees" as never)
        .select("id", { count: "exact", head: true })
        .eq("institution_id", institutionId)
        .eq("status", "active"),
      supabase
        .from("leave_requests" as never)
        .select("id", { count: "exact", head: true })
        .eq("institution_id", institutionId)
        .eq("status", "submitted"),
      supabase
        .from("work_entries" as never)
        .select("id", { count: "exact", head: true })
        .eq("institution_id", institutionId)
        .eq("status", "completed"),
      supabase
        .from("salary_advances" as never)
        .select("id", { count: "exact", head: true })
        .eq("institution_id", institutionId)
        .in("status", ["approved", "paid"]),
      supabase
        .from("payroll_periods" as never)
        .select("id", { count: "exact", head: true })
        .eq("institution_id", institutionId)
        .neq("status", "closed")
        .neq("status", "cancelled"),
      supabase
        .from("personnel_operational_alerts" as never)
        .select("*")
        .eq("institution_id", institutionId)
        .order("due_on")
        .limit(20),
    ]);
  [employees, leaves, work, advances, payroll, alerts].forEach((result) =>
    fail(result.error),
  );
  return {
    activeEmployees: employees.count ?? 0,
    pendingLeaves: leaves.count ?? 0,
    workEntriesToValidate: work.count ?? 0,
    activeAdvances: advances.count ?? 0,
    openPayrollPeriods: payroll.count ?? 0,
    alerts: (alerts.data ?? []) as PersonnelDashboard["alerts"],
  };
}

export async function listEmployees(
  institutionId: string,
): Promise<Employee[]> {
  const { data, error } = await supabase
    .from("employees" as never)
    .select("*")
    .eq("institution_id", institutionId)
    .order("last_name");
  fail(error);
  return (data ?? []) as Employee[];
}
export async function transitionEmployeeStatus(input: {
  employeeId: string;
  status: EmployeeStatus;
  effectiveOn?: string;
  motive?: string;
}) {
  const { error } = await supabase.rpc(
    "transition_employee_status" as never,
    {
      target_employee_id: input.employeeId,
      target_status: input.status,
      effective_on: input.effectiveOn || new Date().toISOString().slice(0, 10),
      motive: input.motive || null,
    } as never,
  );
  fail(error);
}
export type CreateEmployeeInput = Partial<
  Omit<
    Employee,
    | "id"
    | "institution_id"
    | "employee_number"
    | "membership_id"
    | "status"
    | "exited_on"
    | "exit_reason"
  >
> & {
  institution_id: string;
  first_name: string;
  last_name: string;
  hired_on: string;
  function_item_id?: string;
  responsibility?: string;
  contract_type_item_id?: string;
  compensation_mode?: CompensationMode;
  fixed_amount?: number;
  hourly_rate?: number;
  weekly_hours?: number;
  session_rate?: number;
};
export async function createEmployee(
  input: CreateEmployeeInput,
): Promise<Employee> {
  const {
    function_item_id,
    responsibility,
    contract_type_item_id,
    compensation_mode,
    fixed_amount,
    hourly_rate,
    weekly_hours,
    session_rate,
    ...employee
  } = input;
  const { data, error } = await supabase
    .from("employees" as never)
    .insert({ ...employee, status: "active" } as never)
    .select("*")
    .single();
  fail(error);
  if (!data) throw new Error("employee_creation_failed");
  const created = data as Employee;
  try {
    if (function_item_id) {
      const { error: functionError } = await supabase
        .from("employee_functions" as never)
        .insert({
          institution_id: input.institution_id,
          employee_id: created.id,
          function_item_id,
          is_primary: true,
          responsibility: responsibility || null,
          starts_on: input.hired_on,
          is_active: true,
        } as never);
      fail(functionError);
    }
    if (compensation_mode) {
      const { error: contractError } = await supabase
        .from("employee_contracts" as never)
        .insert({
          institution_id: input.institution_id,
          employee_id: created.id,
          contract_type_item_id: contract_type_item_id || null,
          starts_on: input.hired_on,
          status: "active",
          compensation_mode,
          fixed_amount: fixed_amount ?? 0,
          hourly_rate: hourly_rate ?? 0,
          session_rate: session_rate ?? 0,
          weekly_hours: weekly_hours || null,
        } as never);
      fail(contractError);
    }
    if ((hourly_rate ?? 0) > 0) {
      await setEmployeeHourlyRate({
        employeeId: created.id,
        hourlyRate: hourly_rate ?? 0,
        effectiveFrom: input.hired_on,
      });
    }
  } catch (setupError) {
    await supabase
      .from("employees" as never)
      .delete()
      .eq("id", created.id);
    throw setupError;
  }
  return created;
}
export async function getEmployeeProfile(
  institutionId: string,
  employeeId: string,
): Promise<EmployeeProfile | null> {
  const { data, error } = await supabase
    .from("employees" as never)
    .select(
      "*, functions:employee_functions(*,function_item:personnel_catalog_items(default_label,local_label)), contracts:employee_contracts(*,contract_type:personnel_catalog_items(default_label,local_label)), compensation_rates:employee_compensation_rates(*), leave_requests(*), work_entries(*), sanctions:employee_sanctions(*), advances:salary_advances(*), documents:employee_documents(*,document_type:personnel_catalog_items(default_label,local_label)), payroll_entries(*,period:payroll_periods(*))",
    )
    .eq("institution_id", institutionId)
    .eq("id", employeeId)
    .maybeSingle();
  fail(error);
  return data as EmployeeProfile | null;
}
export async function updateEmployee(
  employeeId: string,
  changes: Partial<Employee>,
) {
  const { error } = await supabase
    .from("employees" as never)
    .update(changes as never)
    .eq("id", employeeId);
  fail(error);
}
export async function createEmployeeFunction(input: {
  institution_id: string;
  employee_id: string;
  function_item_id: string;
  is_primary: boolean;
  responsibility?: string;
  starts_on: string;
}) {
  const { error } = await supabase.from("employee_functions" as never).insert({
    ...input,
    responsibility: input.responsibility || null,
    is_active: true,
  } as never);
  fail(error);
}
export async function createEmployeeContract(input: {
  institution_id: string;
  employee_id: string;
  contract_type_item_id?: string;
  reference?: string;
  starts_on: string;
  ends_on?: string;
  status: "draft" | "active";
  compensation_mode: CompensationMode;
  fixed_amount: number;
  hourly_rate: number;
  session_rate: number;
  weekly_hours?: number;
  payment_method?: string;
}) {
  const { error } = await supabase.from("employee_contracts" as never).insert({
    ...input,
    hourly_rate: input.hourly_rate,
    contract_type_item_id: input.contract_type_item_id || null,
    reference: input.reference || null,
    ends_on: input.ends_on || null,
    weekly_hours: input.weekly_hours || null,
    payment_method: input.payment_method || null,
  } as never);
  fail(error);
}

export async function setEmployeeHourlyRate(input: {
  employeeId: string;
  hourlyRate: number;
  effectiveFrom: string;
  notes?: string;
}) {
  const { error } = await supabase.rpc(
    "set_employee_hourly_rate" as never,
    {
      target_employee_id: input.employeeId,
      new_hourly_rate: input.hourlyRate,
      starts_on: input.effectiveFrom,
      rate_notes: input.notes || null,
    } as never,
  );
  fail(error);
}

export async function createEmployeeAccessInvitation(
  employeeId: string,
  role: "teacher" | "admin" | "secretary" | "finance",
) {
  const { data, error } = await supabase.rpc(
    "create_employee_access_invitation" as never,
    { target_employee_id: employeeId, assigned_role: role } as never,
  );
  fail(error);
  return String(data);
}

export async function createProposedWorkEntries(input: {
  institutionId: string;
  employeeId: string;
  contractId: string;
  startsOn: string;
  endsOn: string;
  weeklyHours: number;
  workTypeItemId?: string;
}) {
  const start = new Date(`${input.startsOn}T12:00:00`);
  const end = new Date(`${input.endsOn}T12:00:00`);
  const rows: Record<string, unknown>[] = [];
  for (
    const cursor = new Date(start);
    cursor <= end;
    cursor.setDate(cursor.getDate() + 7)
  ) {
    rows.push({
      institution_id: input.institutionId,
      employee_id: input.employeeId,
      contract_id: input.contractId,
      work_type_item_id: input.workTypeItemId || null,
      work_date: cursor.toISOString().slice(0, 10),
      minutes: Math.round(input.weeklyHours * 60),
      quantity: 1,
      source: "weekly_load_proposal",
      status: "planned",
      notes:
        "Proposition automatique à confirmer selon les heures réellement effectuées",
    });
  }
  if (!rows.length) return 0;
  const { error: cleanupError } = await supabase
    .from("work_entries" as never)
    .delete()
    .eq("institution_id", input.institutionId)
    .eq("employee_id", input.employeeId)
    .eq("contract_id", input.contractId)
    .eq("source", "weekly_load_proposal")
    .eq("status", "planned")
    .gte("work_date", input.startsOn)
    .lte("work_date", input.endsOn);
  fail(cleanupError);
  const { error } = await supabase
    .from("work_entries" as never)
    .insert(rows as never);
  fail(error);
  return rows.length;
}
export async function createSalaryAdvance(input: {
  institution_id: string;
  employee_id: string;
  advance_type_item_id?: string;
  amount_requested: number;
  requested_on: string;
  reason?: string;
}) {
  const { error } = await supabase.from("salary_advances" as never).insert({
    ...input,
    advance_type_item_id: input.advance_type_item_id || null,
    reason: input.reason || null,
    status: "requested",
  } as never);
  fail(error);
}
export async function listSalaryAdvances(institutionId: string) {
  const { data, error } = await supabase
    .from("salary_advances" as never)
    .select("*,employee:employees(first_name,last_name,employee_number)")
    .eq("institution_id", institutionId)
    .order("requested_on", { ascending: false });
  fail(error);
  return (data ?? []) as SalaryAdvance[];
}
export async function transitionSalaryAdvance(input: {
  advanceId: string;
  status: "approved" | "rejected" | "paid" | "settled" | "cancelled";
  approvedAmount?: number;
  comment?: string;
}) {
  const { error } = await supabase.rpc(
    "transition_salary_advance" as never,
    {
      target_advance_id: input.advanceId,
      target_status: input.status,
      approved_amount: input.approvedAmount ?? null,
      comment: input.comment || null,
    } as never,
  );
  fail(error);
}
export async function createEmployeeSanction(input: {
  institution_id: string;
  employee_id: string;
  sanction_type_item_id?: string;
  incident_on: string;
  reason: string;
  description?: string;
  decision?: string;
  status: "draft" | "notified";
}) {
  const { error } = await supabase.from("employee_sanctions" as never).insert({
    ...input,
    sanction_type_item_id: input.sanction_type_item_id || null,
    description: input.description || null,
    decision: input.decision || null,
  } as never);
  fail(error);
}
export async function listEmployeeSanctions(institutionId: string) {
  const { data, error } = await supabase
    .from("employee_sanctions" as never)
    .select("*,employee:employees(first_name,last_name,employee_number)")
    .eq("institution_id", institutionId)
    .order("incident_on", { ascending: false });
  fail(error);
  return (data ?? []) as EmployeeSanction[];
}
export async function transitionEmployeeSanction(input: {
  sanctionId: string;
  status: "notified" | "contested" | "closed" | "cancelled";
  decision?: string;
}) {
  const { error } = await supabase.rpc(
    "transition_employee_sanction" as never,
    {
      target_sanction_id: input.sanctionId,
      target_status: input.status,
      decision_text: input.decision || null,
    } as never,
  );
  fail(error);
}
export async function createPayrollAdjustment(input: {
  institution_id: string;
  payroll_entry_id: string;
  kind: "gain" | "deduction" | "regularization";
  catalog_item_id?: string;
  label: string;
  amount: number;
  notes?: string;
}) {
  const { error } = await supabase.rpc(
    "add_payroll_adjustment" as never,
    {
      target_entry_id: input.payroll_entry_id,
      adjustment_kind: input.kind,
      adjustment_label: input.label,
      adjustment_amount: input.amount,
      target_catalog_item_id: input.catalog_item_id || null,
      adjustment_notes: input.notes || null,
    } as never,
  );
  fail(error);
}
export async function createPayrollPayment(input: {
  institution_id: string;
  payroll_entry_id: string;
  amount: number;
  paid_on: string;
  method: string;
  reference?: string;
}) {
  const { error } = await supabase.rpc(
    "record_payroll_payment" as never,
    {
      target_entry_id: input.payroll_entry_id,
      payment_amount: input.amount,
      payment_date: input.paid_on,
      payment_method: input.method,
      payment_reference: input.reference || null,
    } as never,
  );
  fail(error);
}
export async function createEmployeeDocument(input: {
  institution_id: string;
  employee_id: string;
  document_type_item_id?: string;
  name: string;
  file_path: string;
  issued_on?: string;
  expires_on?: string;
  notes?: string;
}) {
  const { error } = await supabase.from("employee_documents" as never).insert({
    ...input,
    document_type_item_id: input.document_type_item_id || null,
    issued_on: input.issued_on || null,
    expires_on: input.expires_on || null,
    notes: input.notes || null,
  } as never);
  fail(error);
}
export async function uploadPersonnelDocument(path: string, file: File) {
  const { data, error } = await supabase.storage
    .from("school-admin")
    .upload(path, file, { upsert: true });
  fail(error);
  return data!.path;
}
export async function openPersonnelDocument(path: string) {
  const { data, error } = await supabase.storage
    .from("school-admin")
    .createSignedUrl(path, 3600);
  fail(error);
  window.open(data!.signedUrl, "_blank", "noopener,noreferrer");
}
export async function listWorkEntries(
  institutionId: string,
): Promise<WorkEntry[]> {
  const { data, error } = await supabase
    .from("work_entries" as never)
    .select("*, employee:employees(first_name,last_name,employee_number)")
    .eq("institution_id", institutionId)
    .order("work_date", { ascending: false });
  fail(error);
  return (data ?? []) as WorkEntry[];
}
export async function setWorkEntryStatus(
  id: string,
  status: WorkEntry["status"],
) {
  const payload =
    status === "validated"
      ? { status, validated_at: new Date().toISOString() }
      : { status };
  const { error } = await supabase
    .from("work_entries" as never)
    .update(payload as never)
    .eq("id", id);
  fail(error);
}
export async function createWorkEntry(input: {
  institution_id: string;
  employee_id: string;
  work_type_item_id?: string;
  work_date: string;
  minutes: number;
  quantity?: number;
  rate?: number;
  status: WorkEntry["status"];
  notes?: string;
}) {
  const { error } = await supabase.from("work_entries" as never).insert({
    ...input,
    work_type_item_id: input.work_type_item_id || null,
    quantity: input.quantity ?? 1,
    rate: input.rate ?? null,
    notes: input.notes || null,
  } as never);
  fail(error);
}
export async function listLeaveRequests(
  institutionId: string,
): Promise<LeaveRequest[]> {
  const { data, error } = await supabase
    .from("leave_requests" as never)
    .select("*, employee:employees(first_name,last_name,employee_number)")
    .eq("institution_id", institutionId)
    .order("starts_on", { ascending: false });
  fail(error);
  return (data ?? []) as LeaveRequest[];
}
export async function setLeaveStatus(
  id: string,
  status: LeaveRequest["status"],
) {
  const { error } = await supabase
    .from("leave_requests" as never)
    .update({ status } as never)
    .eq("id", id);
  fail(error);
}
export async function createLeaveRequest(input: {
  institution_id: string;
  employee_id: string;
  leave_type_item_id?: string;
  starts_on: string;
  ends_on: string;
  reason?: string;
  status: LeaveRequest["status"];
}) {
  const { error } = await supabase.from("leave_requests" as never).insert({
    ...input,
    leave_type_item_id: input.leave_type_item_id || null,
    reason: input.reason || null,
  } as never);
  fail(error);
}
export async function listPayrollPeriods(
  institutionId: string,
): Promise<PayrollPeriod[]> {
  const { data, error } = await supabase
    .from("payroll_periods" as never)
    .select("*")
    .eq("institution_id", institutionId)
    .order("starts_on", { ascending: false });
  fail(error);
  return (data ?? []) as PayrollPeriod[];
}
export async function listPayrollEntries(
  periodId: string,
): Promise<PayrollEntry[]> {
  const { data, error } = await supabase
    .from("payroll_entries" as never)
    .select("*, employee:employees(first_name,last_name,employee_number)")
    .eq("period_id", periodId)
    .order("created_at");
  fail(error);
  return (data ?? []) as PayrollEntry[];
}
export async function getPayrollEntryDetail(
  institutionId: string,
  periodId: string,
  entryId: string,
): Promise<PayrollEntryDetail | null> {
  const { data: entry, error: entryError } = await supabase
    .from("payroll_entries" as never)
    .select(
      "*, employee:employees(id,first_name,last_name,employee_number,phone,email), period:payroll_periods(id,name,starts_on,ends_on,status), contract:employee_contracts(*)",
    )
    .eq("institution_id", institutionId)
    .eq("period_id", periodId)
    .eq("id", entryId)
    .maybeSingle();
  fail(entryError);
  if (!entry) return null;

  const [adjustmentsResult, paymentsResult, workEntriesResult] =
    await Promise.all([
      supabase
        .from("payroll_adjustments" as never)
        .select("*")
        .eq("institution_id", institutionId)
        .eq("payroll_entry_id", entryId)
        .order("created_at"),
      supabase
        .from("payroll_payments" as never)
        .select("*")
        .eq("institution_id", institutionId)
        .eq("payroll_entry_id", entryId)
        .order("paid_on", { ascending: false }),
      supabase
        .from("work_entries" as never)
        .select("*")
        .eq("institution_id", institutionId)
        .eq("payroll_entry_id", entryId)
        .order("work_date"),
    ]);
  fail(adjustmentsResult.error);
  fail(paymentsResult.error);
  fail(workEntriesResult.error);

  return {
    ...(entry as Omit<
      PayrollEntryDetail,
      "adjustments" | "payments" | "work_entries"
    >),
    adjustments: adjustmentsResult.data ?? [],
    payments: paymentsResult.data ?? [],
    work_entries: workEntriesResult.data ?? [],
  } as PayrollEntryDetail;
}
export async function createPayrollPeriod(input: {
  institution_id: string;
  name: string;
  starts_on: string;
  ends_on: string;
}) {
  const { data, error } = await supabase
    .from("payroll_periods" as never)
    .insert({ ...input, status: "draft" } as never)
    .select("*")
    .single();
  fail(error);
  if (!data) throw new Error("payroll_period_creation_failed");
  return data as unknown as PayrollPeriod;
}
export async function calculatePayroll(periodId: string) {
  const { error } = await supabase.rpc(
    "calculate_payroll_period" as never,
    { target_period_id: periodId } as never,
  );
  fail(error);
}
export async function transitionPayroll(
  periodId: string,
  status: "validated" | "closed",
) {
  const { error } = await supabase.rpc(
    "transition_payroll_period" as never,
    { target_period_id: periodId, new_status: status } as never,
  );
  fail(error);
}
export async function transitionPayrollEntries(
  entryIds: string[],
  status: "calculated" | "validated",
) {
  const { error } = await supabase.rpc(
    "transition_payroll_entries" as never,
    { target_entry_ids: entryIds, new_status: status } as never,
  );
  fail(error);
}
export async function listPersonnelCatalog(
  institutionId: string,
): Promise<CatalogItem[]> {
  const { data, error } = await supabase
    .from("personnel_catalog_items" as never)
    .select("*")
    .eq("institution_id", institutionId)
    .order("category")
    .order("display_order");
  fail(error);
  return (data ?? []) as CatalogItem[];
}
export async function updatePersonnelCatalogItem(
  id: string,
  changes: Pick<CatalogItem, "is_active" | "local_label">,
) {
  const { error } = await supabase
    .from("personnel_catalog_items" as never)
    .update(changes as never)
    .eq("id", id);
  fail(error);
}
export async function createPersonnelCatalogItem(input: {
  institution_id: string;
  category: string;
  code: string;
  default_label: string;
}) {
  const { error } = await supabase
    .from("personnel_catalog_items" as never)
    .insert({
      ...input,
      code: input.code
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_"),
      is_system: false,
      is_active: true,
    } as never);
  fail(error);
}
