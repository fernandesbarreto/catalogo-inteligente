import React, { useState } from "react";

interface LoginProps {
  onLogin: (token: string) => void;
  loading?: boolean;
}

export const Login: React.FC<LoginProps> = ({ onLogin, loading = false }) => {
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
      localStorage.setItem("auth-token", data.token);
      onLogin(data.token);
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
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Login</h2>
          <p>Entre com suas credenciais para acessar o catálogo</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              disabled={loading || isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              required
              disabled={loading || isSubmitting}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            className="login-button"
            disabled={loading || isSubmitting}
          >
            {loading || isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="login-help">
          <h4>Usuários de teste:</h4>
          <div className="test-users">
            <div className="test-user">
              <strong>Admin:</strong> admin@example.com / admin123
            </div>
            <div className="test-user">
              <strong>Editor:</strong> editor@example.com / editor123
            </div>
            <div className="test-user">
              <strong>Viewer:</strong> viewer@example.com / viewer123
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
