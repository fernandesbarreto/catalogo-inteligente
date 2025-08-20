import { useState, useEffect } from "react";
import { Message } from "../types";

export const useChat = (token?: string | null) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "bot",
      content:
        "Olá! Sou seu assistente de tintas. Como posso ajudá-lo a encontrar a tinta perfeita?",
      timestamp: new Date(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");

  // Generate a new session id on each page load to clear history
  useEffect(() => {
    try {
      // Always generate a new session ID on page load
      const id =
        window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      setSessionId(id);
    } catch {
      // Fallback non-persistent
      if (!sessionId) setSessionId(`${Date.now()}-${Math.random()}`);
    }
  }, [sessionId]);

  const sendMessage = async (userMessage: string) => {
    const newUserMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: userMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setLoading(true);

    try {
      // Build short history to send (last 10 messages)
      const lastMessages = [...messages, newUserMessage].slice(-10);
      const history = lastMessages.map((m) => ({
        role: m.type === "user" ? "user" : "assistant",
        content: m.content,
      }));

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-session-id": sessionId || "",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("http://localhost:3000/bff/ai/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          userMessage: newUserMessage.content,
          history,
        }),
      });

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

      const data: any = await response.json();

      // Prefer natural message generated in BFF when available
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
      const errorContent =
        err instanceof Error
          ? err.message
          : "Desculpe, tive um problema ao processar sua solicitação. Pode tentar novamente?";

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: errorContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return {
    messages,
    loading,
    sendMessage,
  };
};
