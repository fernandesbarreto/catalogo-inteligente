import React, { useState, useEffect } from "react";
import "./App.css";
import { Header, Footer, SegmentedControl, Chat, Paints } from "./components";
import { useChat, usePaints } from "./hooks";
import { ViewMode } from "./types";

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>("chat");

  const { messages, loading: chatLoading, sendMessage } = useChat();
  const {
    paints,
    loading: paintsLoading,
    error: paintsError,
    currentPage,
    totalPages,
    totalPaints,
    fetchPaints,
  } = usePaints();

  useEffect(() => {
    if (viewMode === "paints") {
      fetchPaints(1, "");
    }
  }, [viewMode, fetchPaints]);

  return (
    <div className="App">
      <Header />

      <main className="App-main">
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
      </main>

      <Footer />
    </div>
  );
}

export default App;
