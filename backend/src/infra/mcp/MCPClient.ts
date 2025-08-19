import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  content: Array<{
    type: string;
    text: string;
  }>;
}

export class MCPClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<
    number,
    { resolve: Function; reject: Function }
  >();

  constructor(private command: string, private args: string[] = []) {
    super();
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.process = spawn(this.command, this.args, {
        stdio: ["pipe", "pipe", "pipe"],
      });

      this.process.stdout?.on("data", (data) => {
        const lines = data
          .toString()
          .split("\n")
          .filter((line: string) => line.trim());

        for (const line of lines) {
          // Ignorar linhas que começam com [ (logs de console)
          if (line.startsWith("[")) {
            continue;
          }

          try {
            const response = JSON.parse(line);
            this.handleResponse(response);
          } catch (error) {
            // Silenciar erros de parse para logs de console
            if (!line.startsWith("[")) {
              console.error("[MCPClient] Erro ao parsear resposta:", error);
            }
          }
        }
      });

      this.process.stderr?.on("data", (data) => {
        console.error("[MCPClient] stderr:", data.toString());
      });

      this.process.on("error", (error) => {
        console.error("[MCPClient] Erro no processo:", error);
        reject(error);
      });

      this.process.on("close", (code) => {
        console.error(`[MCPClient] Processo encerrado com código: ${code}`);
        this.emit("close", code);
      });

      // Inicializar o servidor
      this.initialize().then(resolve).catch(reject);
    });
  }

  private async initialize(): Promise<void> {
    const response = await this.sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "catalogo-inteligente-client",
        version: "1.0.0",
      },
    });

    console.log("[MCPClient] Servidor inicializado:", response);
  }

  async listTools(): Promise<any> {
    return this.sendRequest("tools/list", {});
  }

  async callTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    // sendRequest já resolve com o campo "result" do envelope JSON-RPC
    const result = await this.sendRequest("tools/call", toolCall);
    return result;
  }

  private async sendRequest(method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;

      this.pendingRequests.set(id, { resolve, reject });

      const request = {
        jsonrpc: "2.0",
        id,
        method,
        params,
      };

      if (this.process?.stdin) {
        this.process.stdin.write(JSON.stringify(request) + "\n");
      } else {
        reject(new Error("Processo não está conectado"));
      }
    });
  }

  private handleResponse(response: any): void {
    const { id, result, error } = response;

    const pending = this.pendingRequests.get(id);
    if (!pending) {
      console.warn("[MCPClient] Resposta sem request pendente:", response);
      return;
    }

    this.pendingRequests.delete(id);

    if (error) {
      pending.reject(new Error(`MCP Error: ${error.message}`));
    } else {
      pending.resolve(result);
    }
  }

  disconnect(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}
