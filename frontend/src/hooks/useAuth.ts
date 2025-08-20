import { useState, useEffect } from "react";

export const useAuth = () => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on mount
    const storedToken = localStorage.getItem("auth-token");
    if (storedToken) {
      setToken(storedToken);
    }
    setLoading(false);
  }, []);

  const login = (newToken: string) => {
    console.log("useAuth login called with token:", newToken); // Debug
    setToken(newToken);
    localStorage.setItem("auth-token", newToken);
  };

  // Debug token changes
  useEffect(() => {
    console.log("Token changed:", token);
  }, [token]);

  const logout = () => {
    setToken(null);
    localStorage.removeItem("auth-token");
  };

  const isAuthenticated = !!token;

  return {
    token,
    isAuthenticated,
    loading,
    login,
    logout,
  };
};
