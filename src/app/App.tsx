import { PrimeReactProvider } from "primereact/api";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "../shared/components/ToastProvider";
import { AuthProvider } from "../features/auth/components/AuthProvider";
import { AppRouter } from "./router/AppRouter";

export function App() {
  return (
    <PrimeReactProvider value={{ ripple: true, inputStyle: "outlined" }}>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </PrimeReactProvider>
  );
}
