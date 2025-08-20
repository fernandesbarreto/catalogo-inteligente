import React, { useState, useEffect } from "react";
import "./App.css";
import {
  Header,
  Footer,
  SegmentedControl,
  Chat,
  Paints,
  LoginBanner,
} from "./components";
import { useChat, usePaints, useAuth } from "./hooks";
import { ViewMode } from "./types";

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>("chat");
  const {
    token,
    isAuthenticated,
    loading: authLoading,
    login,
    logout,
  } = useAuth();

  // Debug authentication state
  console.log("Auth state:", { token: !!token, isAuthenticated, authLoading });

  const { messages, loading: chatLoading, sendMessage } = useChat(token);
  const {
    paints,
    loading: paintsLoading,
    error: paintsError,
    currentPage,
    totalPages,
    totalPaints,
    fetchPaints,
  } = usePaints(token);

  useEffect(() => {
    if (viewMode === "paints") {
      fetchPaints(1, "");
    }
  }, [viewMode, fetchPaints]);

  return (
    <div className="App">
      <Header onLogout={isAuthenticated ? logout : undefined} />

      <main className="App-main">
        {/* Show login form if not authenticated */}
        {!isAuthenticated && (
          <LoginBanner onLogin={login} loading={authLoading} />
        )}

        {/* Show main content only if authenticated */}
        {isAuthenticated && (
          <>
            <SegmentedControl value={viewMode} onChange={setViewMode} />

            {viewMode === "chat" ? (
              <Chat
                messages={messages}
                loading={chatLoading}
                onSendMessage={sendMessage}
              />
            ) : (
              <Paints
                onFetchPaints={fetchPaints}
                paints={paints}
                loading={paintsLoading}
                error={paintsError}
                totalPaints={totalPaints}
                totalPages={totalPages}
                currentPage={currentPage}
              />
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;
