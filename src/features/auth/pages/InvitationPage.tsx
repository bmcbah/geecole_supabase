import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Password } from "primereact/password";
import { signUp } from "../services/auth.service";
export function InvitationPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [failure, setFailure] = useState("");
  useEffect(() => {
    const token = params.get("token");
    if (token) localStorage.setItem("geecole.invitation", token);
    else setFailure("Ce lien d’invitation est incomplet.");
  }, [params]);
  const submit = async () => {
    setLoading(true);
    setFailure("");
    try {
      const data = await signUp(email, password, fullName);
      if (data.session) void navigate("/", { replace: true });
      else setSuccess(true);
    } catch {
      setFailure(
        "Impossible de créer le compte. Vérifiez l’e-mail et le mot de passe.",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="auth-page">
      <Card
        title="Rejoindre GeeCole"
        subTitle="Créez votre compte pour accepter l’invitation de l’établissement"
        className="auth-card"
      >
        {success ? (
          <Message
            severity="success"
            text="Compte créé. Consultez votre e-mail pour confirmer votre adresse, puis connectez-vous : l’invitation sera rattachée automatiquement."
          />
        ) : (
          <div className="form-stack">
            {failure && <Message severity="error" text={failure} />}
            <div className="field">
              <label htmlFor="invite-name">Nom complet</label>
              <InputText
                id="invite-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="invite-email">E-mail</label>
              <InputText
                id="invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="invite-password">Mot de passe</label>
              <Password
                inputId="invite-password"
                value={password}
                feedback
                toggleMask
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <Button
              label="Créer mon compte"
              icon="pi pi-user-plus"
              loading={loading}
              disabled={!fullName || !email || password.length < 8}
              onClick={() => void submit()}
            />
            <Button
              label="J’ai déjà un compte"
              text
              onClick={() => void navigate("/connexion")}
            />
          </div>
        )}
      </Card>
    </main>
  );
}
