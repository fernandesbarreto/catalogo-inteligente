import React, { useState, useRef, useEffect } from "react";
import "./App.css";

interface Message {
  id: string;
  type: "user" | "bot";
  content: string;
  timestamp: Date;
}

interface RecommendationPick {
  id: string;
  reason: string;
}

interface RecommendationResponse {
  picks: RecommendationPick[];
  notes?: string;
  mcpEnabled?: boolean;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "bot",
      content: "Olá! Sou seu assistente de tintas. Como posso ajudá-lo a encontrar a tinta perfeita?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:3000/bff/ai/recommendations/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: inputValue.trim() }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: RecommendationResponse = await response.json();
      
      // Create bot response
      let botContent = "";
      
      if (data.picks && data.picks.length > 0) {
        botContent = `Encontrei ${data.picks.length} tinta(s) que podem atender sua necessidade:\n\n`;
        data.picks.forEach((pick, index) => {
          botContent += `${index + 1}. **${pick.id}** - ${pick.reason}\n`;
        });
        
        if (data.notes) {
          botContent += `\n${data.notes}`;
        }
      } else {
        botContent = "Desculpe, não encontrei tintas que correspondam exatamente ao que você procura. Pode tentar reformular sua busca ou me dar mais detalhes sobre o que precisa?";
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: botContent,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: "Desculpe, tive um problema ao processar sua solicitação. Pode tentar novamente?",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
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

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎨 Assistente de Tintas</h1>
        <p>Chatbot inteligente para encontrar a tinta perfeita</p>
      </header>

      <main className="App-main">
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
                      <div className="message-text">{message.content}</div>
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
      </main>

      <footer className="App-footer">
        <p>Powered by MCP • Assistente Inteligente de Tintas</p>
      </footer>
    </div>
  );
}

export default App;
