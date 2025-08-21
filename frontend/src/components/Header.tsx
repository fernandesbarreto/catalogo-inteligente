import React from "react";

interface HeaderProps {
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogout }) => {
  return (
    <header className="App-header">
      <div className="header-content">
        <div className="header-title">
          <h1>🎨 Assistente de Tintas</h1>
          <p>Chatbot inteligente para encontrar a tinta perfeita</p>
        </div>
        {onLogout && (
          <button onClick={onLogout} className="logout-button">
            Sair
          </button>
        )}
      </div>
    </header>
  );
};
