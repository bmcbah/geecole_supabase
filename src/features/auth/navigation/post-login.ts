export interface LoginLocationState {
  from?: string;
}

export function getPostLoginDestination(state: unknown) {
  if (!state || typeof state !== "object" || !("from" in state))
    return "/etablissement";
  const from = (state as LoginLocationState).from;
  return typeof from === "string" &&
    from.startsWith("/") &&
    !from.startsWith("//")
    ? from
    : "/etablissement";
}
