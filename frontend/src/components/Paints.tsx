import React, { useState, useRef } from "react";
import { Paint } from "../types";

// Constants
const PAINTS_PER_PAGE = 15;

interface PaintsProps {
  onFetchPaints: (page: number, searchQuery: string) => Promise<void>;
  paints: Paint[];
  loading: boolean;
  error: string | null;
  totalPaints: number;
  totalPages: number;
  currentPage: number;
}

export const Paints: React.FC<PaintsProps> = ({
  onFetchPaints,
  paints,
  loading,
  error,
  totalPaints,
  totalPages,
  currentPage,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const handlePageChange = (newPage: number) => {
    onFetchPaints(newPage, searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    onFetchPaints(1, "");
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    // Clear previous timer
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    // Set new timer for debounced search
    searchTimerRef.current = setTimeout(() => {
      onFetchPaints(1, value);
    }, 500);
  };

  return (
    <div className="paints-container">
      <div className="paints-header">
        <div className="search-container">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar tintas por nome, cor, tipo de superfície..."
            className="search-input"
          />
          <button
            onClick={handleClearSearch}
            className="clear-search-btn"
            disabled={!searchQuery}
          >
            ✕
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Carregando tintas...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <p>{error}</p>
          <button
            onClick={() => onFetchPaints(currentPage, searchQuery)}
            className="retry-btn"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          {searchQuery && (
            <div className="search-results-info">
              <p>
                Resultados para: <strong>"{searchQuery}"</strong>
              </p>
            </div>
          )}
          <div className="paints-grid">
            {paints.map((paint) => (
              <div key={paint.id} className="paint-card">
                <div
                  className="paint-color-preview"
                  style={{ backgroundColor: paint.colorHex }}
                >
                  <div className="paint-name">{paint.name}</div>
                </div>
                <div className="paint-details">
                  <h3>{paint.name}</h3>
                  <p className="paint-color">Cor: {paint.color}</p>
                  <p className="paint-surface">
                    Superfície: {paint.surfaceType}
                  </p>
                  <p className="paint-room">Ambiente: {paint.roomType}</p>
                  <p className="paint-finish">Acabamento: {paint.finish}</p>
                  {paint.line && (
                    <p className="paint-line">Linha: {paint.line}</p>
                  )}
                  {paint.features && (
                    <p className="paint-features">
                      Características: {paint.features}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {paints.length === 0 && !loading && (
            <div className="no-paints">
              <p>Nenhuma tinta encontrada.</p>
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="clear-search-btn"
                >
                  Limpar busca
                </button>
              )}
            </div>
          )}

          {totalPaints > 0 && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                ← Anterior
              </button>
              <span className="page-info">
                Página {currentPage} de {totalPages}
                {totalPaints > 0 && (
                  <span className="total-info">
                    {" "}
                    ({totalPaints} tintas no total)
                  </span>
                )}
              </span>
              <button
                onClick={() =>
                  handlePageChange(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Próxima →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
