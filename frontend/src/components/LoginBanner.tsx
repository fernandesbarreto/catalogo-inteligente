import React, { useState } from "react";

interface LoginBannerProps {
  onLogin: (token: string) => void;
  loading?: boolean;
}

export const LoginBanner: React.FC<LoginBannerProps> = ({
  onLogin,
  loading = false,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("http://localhost:3000/bff/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || errorData.error || "Erro no login"
        );
      }

      const data = await response.json();
      console.log("Login response:", data); // Debug
      localStorage.setItem("auth-token", data.accessToken);
      onLogin(data.accessToken);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === "string") {
        setError(err);
      } else {
        setError("Erro inesperado. Tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-banner-container">
      <div className="login-banner">
        <div className="login-banner-content">
          <div className="login-banner-text">
            <h3>🔐 Faça login para acessar o catálogo</h3>
            <p>Use suas credenciais para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="login-banner-form">
            <div className="form-row">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                disabled={loading || isSubmitting}
                className="login-input"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                required
                disabled={loading || isSubmitting}
                className="login-input"
              />
              <button
                type="submit"
                className="login-banner-button"
                disabled={loading || isSubmitting}
              >
                {loading || isSubmitting ? "Entrando..." : "Entrar"}
              </button>
            </div>

            {error && <div className="login-banner-error">{error}</div>}
          </form>

          <div className="login-banner-help">
            <details>
              <summary>👥 Usuários de teste</summary>
              <div className="test-users-compact">
                <div>Admin: admin@example.com / admin123</div>
                <div>Editor: editor@example.com / editor123</div>
                <div>Viewer: viewer@example.com / viewer123</div>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
};
