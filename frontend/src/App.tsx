import React, { useState, useRef, useEffect } from "react";
import "./App.css";

interface Message {
  id: string;
  type: "user" | "bot";
  content: string;
  timestamp: Date;
  imageBase64?: string;
  imageProvider?: string;
}

interface Paint {
  id: string;
  name: string;
  color: string;
  colorHex: string;
  surfaceType: string;
  roomType: string;
  finish: string;
  features?: string;
  line?: string;
  createdAt: string;
  updatedAt: string;
}

type ViewMode = "chat" | "paints";

// Constants
const PAINTS_PER_PAGE = 15;

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "bot",
      content:
        "Olá! Sou seu assistente de tintas. Como posso ajudá-lo a encontrar a tinta perfeita?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string>("");

  // Paints state
  const [paints, setPaints] = useState<Paint[]>([]);
  const [paintsLoading, setPaintsLoading] = useState(false);
  const [paintsError, setPaintsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPaints, setTotalPaints] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("chat");

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Ensure a persistent session id for chat memory
  useEffect(() => {
    try {
      const stored = localStorage.getItem("paint-chat-session");
      if (stored) {
        setSessionId(stored);
      } else {
        const id =
          window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
        localStorage.setItem("paint-chat-session", id);
        setSessionId(id);
      }
    } catch {
      // Fallback non-persistent
      if (!sessionId) setSessionId(`${Date.now()}-${Math.random()}`);
    }
  }, [sessionId]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset pagination when search query changes
  useEffect(() => {
    if (viewMode === "paints") {
      setCurrentPage(1);
    }
  }, [debouncedSearchQuery, viewMode]);

  // Fetch paints when view mode changes, search query changes, or page changes
  useEffect(() => {
    if (viewMode === "paints") {
      fetchPaints();
    }
  }, [viewMode, currentPage, debouncedSearchQuery]);

  const fetchPaints = async () => {
    setPaintsLoading(true);
    setPaintsError(null);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: PAINTS_PER_PAGE.toString(),
        ...(debouncedSearchQuery && { q: debouncedSearchQuery }),
      });

      const response = await fetch(
        `http://localhost:3000/bff/paints/public?${params}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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
      setPaintsError("Erro ao carregar as tintas. Tente novamente.");
    } finally {
      setPaintsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setLoading(true);

    try {
      // Build short history to send (last 10 messages)
      const lastMessages = [...messages, userMessage].slice(-10);
      const history = lastMessages.map((m) => ({
        role: m.type === "user" ? "user" : "assistant",
        content: m.content,
      }));

      // Substituir as 2 chamadas por:
      const response = await fetch("http://localhost:3000/bff/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId || "",
        },
        body: JSON.stringify({
          userMessage: userMessage.content,
          history,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: any = await response.json();

      // Preferir mensagem natural gerada no BFF quando disponível
      let botContent = data.message as string;

      if (!botContent) {
        if (data.picks && data.picks.length > 0) {
          const top = data.picks.slice(0, Math.min(3, data.picks.length));
          const bullets = top
            .map(
              (p: any) =>
                `• ${p.reason
                  .replace(/^Filtro:\\s*/i, "")
                  .replace(/^Semântico:\\s*/i, "")
                  .replace(/\\.\\.\\.$/, "")}`
            )
            .join("\n");
          const tail =
            data.picks.length > top.length
              ? `\n\nPosso mostrar mais opções se quiser (tenho mais ${
                  data.picks.length - top.length
                }).`
              : "";
          botContent = `Aqui estão algumas opções que se encaixam bem:\n\n${bullets}${tail}`;
        } else {
          botContent =
            "Desculpe, não encontrei tintas que correspondam exatamente ao que você procura. Pode tentar reformular sua busca ou me dar mais detalhes sobre o que precisa?";
        }
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: botContent,
        imageBase64: data?.imageIntent
          ? data?.paletteImage?.imageBase64
          : undefined,
        imageProvider: data?.imageIntent
          ? data?.paletteImage?.provider
          : undefined,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content:
          "Desculpe, tive um problema ao processar sua solicitação. Pode tentar novamente?",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const exampleQueries = [
    "Preciso de uma tinta azul para quarto infantil",
    "Quero uma tinta branca para sala moderna",
    "Busco tinta resistente para cozinha",
    "Preciso de tinta antimofo para banheiro",
    "Quero uma tinta elegante para área externa",
  ];

  const renderChatSection = () => (
    <div className="chat-container">
      <div className="messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.type === "user" ? "user" : "bot"}`}
          >
            <div className="message-content">
              {message.type === "bot" ? (
                <div className="bot-message">
                  <div className="bot-avatar">🤖</div>
                  <div className="message-text">
                    {message.content}
                    {message.imageBase64 && (
                      <div
                        className="palette-preview"
                        style={{ marginTop: 12 }}
                      >
                        <img src={message.imageBase64} alt="Prévia gerada" />
                        {message.imageProvider && (
                          <div className="palette-meta">
                            provider: {message.imageProvider}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="user-message">
                  <div className="message-text">{message.content}</div>
                  <div className="user-avatar">👤</div>
                </div>
              )}
            </div>
            <div className="message-time">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
        {loading && (
          <div className="message bot">
            <div className="message-content">
              <div className="bot-message">
                <div className="bot-avatar">🤖</div>
                <div className="message-text">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        <div className="input-group">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Descreva que tipo de tinta você procura..."
            className="chat-input"
            disabled={loading}
          />
          <button
            type="submit"
            className="send-button"
            disabled={loading || !inputValue.trim()}
          >
            {loading ? "⏳" : "📤"}
          </button>
        </div>
      </form>
    </div>
  );

  const renderPaintsSection = () => (
    <div className="paints-container">
      <div className="paints-header">
        <div className="search-container">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Buscar tintas por nome, cor, tipo de superfície..."
            className="search-input"
          />
          <button
            onClick={() => setSearchQuery("")}
            className="clear-search-btn"
            disabled={!searchQuery}
          >
            ✕
          </button>
        </div>
      </div>

      {paintsLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>
            {searchQuery !== debouncedSearchQuery
              ? "Buscando..."
              : "Carregando tintas..."}
          </p>
        </div>
      ) : paintsError ? (
        <div className="error-container">
          <p>{paintsError}</p>
          <button onClick={fetchPaints} className="retry-btn">
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          {debouncedSearchQuery && (
            <div className="search-results-info">
              <p>
                Resultados para: <strong>"{debouncedSearchQuery}"</strong>
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

          {paints.length === 0 && !paintsLoading && (
            <div className="no-paints">
              <p>Nenhuma tinta encontrada.</p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
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
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
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
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
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

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎨 Assistente de Tintas</h1>
        <p>Chatbot inteligente para encontrar a tinta perfeita</p>
      </header>

      <main className="App-main">
        <div className="segmented-control">
          <button
            className={`segment ${viewMode === "chat" ? "active" : ""}`}
            onClick={() => setViewMode("chat")}
          >
            💬 Chat
          </button>
          <button
            className={`segment ${viewMode === "paints" ? "active" : ""}`}
            onClick={() => setViewMode("paints")}
          >
            🎨 Catálogo
          </button>
        </div>

        {viewMode === "chat" ? (
          <>
            {renderChatSection()}
            <div className="examples">
              <h3>💡 Exemplos de perguntas:</h3>
              <div className="example-tags">
                {exampleQueries.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setInputValue(example)}
                    className="example-tag"
                    disabled={loading}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          renderPaintsSection()
        )}
      </main>

      <footer className="App-footer">
        <p>Powered by MCP • Assistente Inteligente de Tintas</p>
      </footer>
    </div>
  );
}

export default App;
