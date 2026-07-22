import { supabase } from "../../../shared/lib/supabase/client";

export async function listInstitutionModules(institutionId: string) {
  const [catalogResult, activationResult] = await Promise.all([
    supabase
      .from("module_catalog")
      .select("*")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("institution_modules")
      .select("*")
      .eq("institution_id", institutionId),
  ]);
  if (catalogResult.error) throw catalogResult.error;
  if (activationResult.error) throw activationResult.error;
  return catalogResult.data.map((module) => ({
    ...module,
    is_enabled:
      activationResult.data.find((item) => item.module_code === module.code)
        ?.is_enabled ?? false,
  }));
}

export async function setInstitutionModuleEnabled(input: {
  institutionId: string;
  moduleCode: string;
  enabled: boolean;
  reason?: string;
}) {
  const { error } = await supabase.rpc("set_institution_module_enabled", {
    target_institution_id: input.institutionId,
    target_module_code: input.moduleCode,
    target_enabled: input.enabled,
    change_reason: input.reason ?? null,
  });
  if (error) throw error;
}
