import { createContext, useContext } from "react";
import type { ToastMessage } from "primereact/toast";

export type Notify = (message: ToastMessage) => void;
export const ToastContext = createContext<Notify | null>(null);
export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast doit être utilisé dans ToastProvider");
  return value;
}
