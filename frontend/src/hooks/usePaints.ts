import { useState, useCallback } from "react";
import { Paint } from "../types";

// Constants
const PAINTS_PER_PAGE = 15;

export const usePaints = (token?: string | null) => {
  const [paints, setPaints] = useState<Paint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPaints, setTotalPaints] = useState(0);

  const fetchPaints = useCallback(async (page: number, searchQuery: string) => {
    setLoading(true);
    setError(null);
    setCurrentPage(page);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: PAINTS_PER_PAGE.toString(),
        ...(searchQuery && { q: searchQuery }),
      });

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        `http://localhost:3000/bff/paints/public?${params}`,
        { headers }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Sessão expirada. Por favor, faça login novamente.");
        }
        if (response.status === 403) {
          throw new Error("Acesso negado. Verifique suas permissões.");
        }
        throw new Error(
          `Erro no servidor (${response.status}). Tente novamente.`
        );
      }

      const data = await response.json();

      // Handle both old format (array) and new format (paginated object)
      if (Array.isArray(data)) {
        // Fallback for old format
        setPaints(data);
        setTotalPaints(data.length);
        setTotalPages(Math.ceil(data.length / PAINTS_PER_PAGE));
      } else {
        // New paginated format
        setPaints(data.data || []);
        setTotalPaints(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error("Error fetching paints:", error);
      setError("Erro ao carregar as tintas. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    paints,
    loading,
    error,
    currentPage,
    totalPages,
    totalPaints,
    fetchPaints,
  };
};
