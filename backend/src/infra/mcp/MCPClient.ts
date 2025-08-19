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
  private stdoutBuffer = ""; // <- NOVO

  constructor(private command: string, private args: string[] = []) {
    super();
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.process = spawn(this.command, this.args, {
        stdio: ["pipe", "pipe", "pipe"],
      });

      // -------- STDOUT: só JSON-RPC por linha --------
      this.process.stdout?.on("data", (chunk) => {
        this.stdoutBuffer += chunk.toString();

        // consome linhas completas
        let nlIndex: number;
        while ((nlIndex = this.stdoutBuffer.indexOf("\n")) >= 0) {
          const rawLine = this.stdoutBuffer.slice(0, nlIndex);
          this.stdoutBuffer = this.stdoutBuffer.slice(nlIndex + 1);

          const line = rawLine.trim();
          if (!line) continue;

          // só aceite envelopes JSON-RPC
          if (!(line.startsWith("{") && line.includes('"jsonrpc"'))) {
            // jogue fora ruídos que vierem no stdout do servidor
            // console.debug("[MCPClient] stdout(non-jsonrpc):", line.slice(0, 120));
            continue;
          }

          try {
            const response = JSON.parse(line);
            this.handleResponse(response);
          } catch (err) {
            console.error(
              "[MCPClient] Erro ao parsear JSON-RPC:",
              (err as Error).message,
              "| line:",
              line.slice(0, 200)
            );
          }
        }
      });

      // -------- STDERR: logs livres --------
      this.process.stderr?.on("data", (data) => {
        // mantenha verboso aqui; não tente parsear
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
