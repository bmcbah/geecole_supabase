import { useCallback, useMemo, useRef, type PropsWithChildren } from "react";
import { Toast } from "primereact/toast";
import { ToastContext, type Notify } from "./toast-context";
export function ToastProvider({ children }: PropsWithChildren) {
  const ref = useRef<Toast>(null);
  const notify = useCallback<Notify>(
    (message) => ref.current?.show(message),
    [],
  );
  const value = useMemo(() => notify, [notify]);
  return (
    <ToastContext.Provider value={value}>
      <Toast ref={ref} />
      {children}
    </ToastContext.Provider>
  );
}
