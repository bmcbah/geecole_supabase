import { supabase } from "../../../shared/lib/supabase/client";

export async function listAssignablePermissions(institutionId: string) {
  const { data, error } = await supabase.rpc("list_delegable_permissions", {
    target_institution_id: institutionId,
  });
  if (error) throw error;
  return data;
}

export async function listAccessProfilePermissionCodes(
  accessProfileId: string,
) {
  const { data: assignments, error } = await supabase
    .from("access_profile_permissions")
    .select("permission_id")
    .eq("access_profile_id", accessProfileId);
  if (error) throw error;
  if (!assignments.length) return [];
  const { data: permissions, error: permissionsError } = await supabase
    .from("permissions")
    .select("id,code")
    .in(
      "id",
      assignments.map((assignment) => assignment.permission_id),
    );
  if (permissionsError) throw permissionsError;
  return permissions.map((permission) => permission.code);
}

export async function createCustomAccessProfile(input: {
  institutionId: string;
  name: string;
  description: string;
  permissionCodes: string[];
  sourceProfileId?: string;
}) {
  const { data, error } = await supabase.rpc("create_custom_access_profile", {
    target_institution_id: input.institutionId,
    profile_name: input.name,
    profile_description: input.description,
    permission_codes: input.permissionCodes,
    source_profile_id: input.sourceProfileId ?? null,
  });
  if (error) throw error;
  return data;
}

export async function updateCustomAccessProfile(input: {
  id: string;
  name: string;
  description: string;
  permissionCodes: string[];
  active: boolean;
}) {
  const { error } = await supabase.rpc("update_custom_access_profile", {
    target_access_profile_id: input.id,
    profile_name: input.name,
    profile_description: input.description,
    permission_codes: input.permissionCodes,
    profile_active: input.active,
  });
  if (error) throw error;
}
