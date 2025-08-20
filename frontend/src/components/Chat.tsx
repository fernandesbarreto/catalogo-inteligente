import React, { useState, useRef, useEffect } from "react";
import { Message } from "../types";
import { parseMarkdown } from "../utils/markdown";

interface ChatProps {
  messages: Message[];
  loading: boolean;
  onSendMessage: (message: string) => void;
}

const exampleQueries = [
  "Preciso de uma tinta azul para quarto infantil",
  "Quero uma tinta branca para sala moderna",
  "Busco tinta resistente para cozinha",
  "Preciso de tinta antimofo para banheiro",
  "Quero uma tinta elegante para área externa",
];

export const Chat: React.FC<ChatProps> = ({
  messages,
  loading,
  onSendMessage,
}) => {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    onSendMessage(inputValue.trim());
    setInputValue("");
  };

  return (
    <>
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
                      <div 
                        dangerouslySetInnerHTML={{ 
                          __html: parseMarkdown(message.content) 
                        }} 
                      />
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
                    <div className="message-text">
                      <div 
                        dangerouslySetInnerHTML={{ 
                          __html: parseMarkdown(message.content) 
                        }} 
                      />
                    </div>
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
    </>
  );
};
