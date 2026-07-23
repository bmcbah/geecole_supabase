export type WorkspaceAlert = {
  id: string;
  title: string;
  description: string;
  count: number;
  severity: "blocking" | "warning" | "information";
  domain: string;
  route: string;
};
