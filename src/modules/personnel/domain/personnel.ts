export type EmployeeStatus = "active" | "suspended" | "exited";
export type CompensationMode =
  "fixed" | "hourly" | "session" | "flat_rate" | "mixed" | "unpaid";
export type Employee = {
  id: string;
  institution_id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  gender: string | null;
  birth_date: string | null;
  birth_place: string | null;
  nationality: string | null;
  phone: string | null;
  secondary_phone: string | null;
  email: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  identity_type: string | null;
  identity_number: string | null;
  identity_expires_on: string | null;
  status: EmployeeStatus;
  hired_on: string;
  exited_on: string | null;
  exit_reason: string | null;
  notes: string | null;
  membership_id: string | null;
};
export type EmployeeFunction = {
  id: string;
  employee_id: string;
  function_item_id: string;
  is_primary: boolean;
  responsibility: string | null;
  starts_on: string;
  ends_on: string | null;
  is_active: boolean;
  function_item?: { default_label: string; local_label: string | null };
};
export type EmployeeContract = {
  id: string;
  employee_id: string;
  reference: string | null;
  starts_on: string;
  ends_on: string | null;
  status: "draft" | "active" | "ended" | "terminated";
  compensation_mode: CompensationMode;
  fixed_amount: number;
  hourly_rate: number;
  session_rate: number;
  payment_frequency: string;
  weekly_hours: number | null;
  payment_method: string | null;
  contract_type?: { default_label: string; local_label: string | null };
};
export type EmployeeCompensationRate = {
  id: string;
  hourly_rate: number;
  effective_from: string;
  effective_to: string | null;
  notes: string | null;
};
export type EmployeeProfile = Employee & {
  functions: EmployeeFunction[];
  contracts: EmployeeContract[];
  leave_requests: LeaveRequest[];
  work_entries: WorkEntry[];
  sanctions: EmployeeSanction[];
  advances: SalaryAdvance[];
  documents: EmployeeDocument[];
  compensation_rates: EmployeeCompensationRate[];
  payroll_entries: (PayrollEntry & { period: PayrollPeriod })[];
};
export type EmployeeDocument = {
  id: string;
  name: string;
  file_path: string;
  issued_on: string | null;
  expires_on: string | null;
  notes: string | null;
  document_type?: { default_label: string; local_label: string | null };
};
export type EmployeeSanction = {
  id: string;
  incident_on: string;
  decided_on: string | null;
  reason: string;
  description: string | null;
  decision: string | null;
  status: "draft" | "notified" | "contested" | "closed" | "cancelled";
};
export type SalaryAdvance = {
  id: string;
  amount_requested: number;
  amount_approved: number | null;
  repaid_amount: number;
  requested_on: string;
  granted_on: string | null;
  reason: string | null;
  status:
    "requested" | "approved" | "rejected" | "paid" | "settled" | "cancelled";
};
export type WorkEntry = {
  id: string;
  employee_id: string;
  work_date: string;
  minutes: number;
  quantity: number;
  rate: number | null;
  status: "planned" | "completed" | "validated" | "rejected" | "paid";
  notes: string | null;
  employee?: Pick<Employee, "first_name" | "last_name" | "employee_number">;
};
export type LeaveRequest = {
  id: string;
  employee_id: string;
  starts_on: string;
  ends_on: string;
  reason: string | null;
  status: "draft" | "submitted" | "approved" | "rejected" | "cancelled";
  employee?: Pick<Employee, "first_name" | "last_name" | "employee_number">;
};
export type PayrollPeriod = {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  status:
    | "draft"
    | "calculated"
    | "validated"
    | "partially_paid"
    | "paid"
    | "closed"
    | "cancelled";
};
export type PayrollEntry = {
  id: string;
  period_id: string;
  employee_id: string;
  fixed_amount: number;
  variable_amount: number;
  gains: number;
  deductions: number;
  advance_repayments: number;
  gross_amount: number;
  net_amount: number;
  paid_amount: number;
  status: PayrollPeriod["status"];
  employee?: Pick<Employee, "first_name" | "last_name" | "employee_number">;
};
export type PayrollAdjustment = {
  id: string;
  kind: "gain" | "deduction" | "regularization";
  label: string;
  amount: number;
  notes: string | null;
  created_at: string;
};
export type PayrollPayment = {
  id: string;
  amount: number;
  paid_on: string;
  method: string;
  reference: string | null;
  created_at: string;
};
export type PayrollEntryDetail = PayrollEntry & {
  institution_id: string;
  contract_id: string | null;
  created_at: string;
  employee: Pick<
    Employee,
    "id" | "first_name" | "last_name" | "employee_number" | "phone" | "email"
  >;
  period: PayrollPeriod;
  contract: EmployeeContract | null;
  adjustments: PayrollAdjustment[];
  payments: PayrollPayment[];
  work_entries: WorkEntry[];
};
export const employeeStatusLabels: Record<EmployeeStatus, string> = {
  active: "Actif",
  suspended: "Suspendu",
  exited: "Sorti",
};
export const payrollStatusLabels: Record<PayrollPeriod["status"], string> = {
  draft: "Brouillon",
  calculated: "Calculée",
  validated: "Validée",
  partially_paid: "Partiellement payée",
  paid: "Payée",
  closed: "Clôturée",
  cancelled: "Annulée",
};
