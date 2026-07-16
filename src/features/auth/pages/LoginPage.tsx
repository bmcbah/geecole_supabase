import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Message } from "primereact/message";
import { loginSchema, type LoginInput } from "../schemas/login.schema";
import { signIn } from "../services/auth.service";
import { useAuth } from "../components/auth-context";
import { getPostLoginDestination } from "../navigation/post-login";

export function LoginPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const destination = useMemo(
    () => getPostLoginDestination(location.state),
    [location.state],
  );
  const [serverError, setServerError] = useState("");
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const submit = handleSubmit(async (values) => {
    setServerError("");
    try {
      await signIn(values.email, values.password);
    } catch {
      setServerError("Connexion impossible. Vérifiez vos identifiants.");
    }
  });
  useEffect(() => {
    if (user) void navigate(destination, { replace: true });
  }, [destination, navigate, user]);
  return (
    <main className="auth-page">
      <Card
        className="auth-card"
        title="Connexion à GeeCole"
        subTitle="Gestion scolaire simple et adaptée à votre établissement"
      >
        <form
          onSubmit={(event) => void submit(event)}
          className="form-stack"
          noValidate
        >
          <label htmlFor="email">Adresse e-mail</label>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <InputText
                {...field}
                id="email"
                autoComplete="email"
                invalid={Boolean(errors.email)}
              />
            )}
          />
          {errors.email && (
            <small className="p-error">{errors.email.message}</small>
          )}
          <label htmlFor="password">Mot de passe</label>
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <Password
                {...field}
                id="password"
                feedback={false}
                toggleMask
                autoComplete="current-password"
                invalid={Boolean(errors.password)}
              />
            )}
          />
          {errors.password && (
            <small className="p-error">{errors.password.message}</small>
          )}
          {serverError && <Message severity="error" text={serverError} />}
          <Button
            type="submit"
            label="Se connecter"
            icon="pi pi-sign-in"
            loading={isSubmitting}
          />
        </form>
      </Card>
    </main>
  );
}
