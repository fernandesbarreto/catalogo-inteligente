import React, { useState } from "react";
import "./App.css";

interface RecommendationPick {
  id: string;
  reason: string;
}

interface RecommendationResponse {
  picks: RecommendationPick[];
  notes?: string;
}

function App() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [useMCP, setUseMCP] = useState(false);
  const [recommendations, setRecommendations] =
    useState<RecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setRecommendations(null);

    try {
      const endpoint = useMCP
        ? "http://localhost:3000/bff/ai/recommendations/mcp"
        : "http://localhost:3000/bff/ai/recommendations";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setRecommendations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const exampleQueries = [
    "tinta para quarto infantil lavável",
    "tinta branca para sala moderna",
    "tinta resistente para cozinha",
    "tinta antimofo para banheiro",
    "tinta elegante para área externa",
  ];

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎨 Catálogo Inteligente</h1>
        <p>Descubra a tinta perfeita com IA</p>
      </header>

      <main className="App-main">
        <form onSubmit={handleSubmit} className="search-form">
          <div className="input-group">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Descreva o que você procura..."
              className="search-input"
              disabled={loading}
            />
            <button
              type="submit"
              className="search-button"
              disabled={loading || !query.trim()}
            >
              {loading ? "🔍 Buscando..." : "🔍 Buscar"}
            </button>
          </div>

          <div className="mcp-toggle">
            <label className="mcp-label">
              <input
                type="checkbox"
                checked={useMCP}
                onChange={(e) => setUseMCP(e.target.checked)}
                disabled={loading}
              />
              <span className="mcp-text">
                🚀 Usar MCP (Model Context Protocol)
              </span>
            </label>
            {useMCP && (
              <div className="mcp-info">
                <small>
                  MCP oferece ferramentas padronizadas e isolamento de
                  credenciais
                </small>
              </div>
            )}
          </div>
        </form>

        <div className="examples">
          <h3>Exemplos de busca:</h3>
          <div className="example-tags">
            {exampleQueries.map((example, index) => (
              <button
                key={index}
                onClick={() => setQuery(example)}
                className="example-tag"
                disabled={loading}
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="error-message">
            <h3>❌ Erro</h3>
            <p>{error}</p>
            <p className="error-hint">
              Certifique-se de que o backend está rodando em
              http://localhost:3000
            </p>
          </div>
        )}

        {recommendations && (
          <div className="results">
            <h2>🎯 Recomendações</h2>

            {recommendations.notes && (
              <div className="notes">
                <p>{recommendations.notes}</p>
              </div>
            )}

            {recommendations.picks.length === 0 ? (
              <div className="no-results">
                <p>Nenhuma tinta encontrada. Tente ajustar sua busca.</p>
              </div>
            ) : (
              <div className="picks-grid">
                {recommendations.picks.map((pick, index) => (
                  <div key={pick.id} className="pick-card">
                    <div className="pick-header">
                      <span className="pick-number">#{index + 1}</span>
                      <span className="pick-id">ID: {pick.id}</span>
                    </div>
                    <div className="pick-reason">{pick.reason}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="App-footer">
        <p>Powered by AI • Catálogo Inteligente</p>
      </footer>
    </div>
  );
}

export default App;
