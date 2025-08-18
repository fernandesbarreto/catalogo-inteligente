# MCP (Model Context Protocol) - Catálogo Inteligente

Este servidor MCP padroniza e centraliza as ferramentas do catálogo inteligente, permitindo reuso entre diferentes clientes e isolamento de credenciais. A integração completa inclui frontend, BFF e servidor MCP.

## Ferramentas Disponíveis

### 1. `semantic_search`

Busca semântica em tintas usando embeddings e pgvector (RAG).

**Parâmetros:**

- `query` (string, obrigatório): Consulta de busca semântica
- `filters` (object, opcional): Filtros aplicados aos resultados
  - `surfaceType` (string): Tipo de superfície
  - `roomType` (string): Tipo de ambiente
  - `finish` (string): Acabamento
  - `line` (string): Linha de produto

**Exemplo:**

```json
{
  "name": "semantic_search",
  "arguments": {
    "query": "tinta azul para quarto infantil",
    "filters": {
      "roomType": "quarto",
      "surfaceType": "parede"
    }
  }
}
```

### 2. `filter_search`

Busca por filtros usando Prisma/SQL.

**Parâmetros:**

- `query` (string, obrigatório): Consulta de texto para busca por filtros
- `filters` (object, opcional): Filtros específicos
  - `surfaceType` (string): Tipo de superfície
  - `roomType` (string): Tipo de ambiente
  - `finish` (string): Acabamento
  - `line` (string): Linha de produto

**Exemplo:**

```json
{
  "name": "filter_search",
  "arguments": {
    "query": "azul",
    "filters": {
      "finish": "fosco"
    }
  }
}
```

## Como Usar

### 1. Executar o Servidor MCP

```bash
# Desenvolvimento (com reload automático)
npm run mcp:dev

# Produção
npm run mcp
```

### 2. Testar o Servidor

```bash
npm run mcp:test
```

### 3. Integração Frontend-BFF-MCP

O frontend está integrado com o MCP através do BFF:

```typescript
// Frontend permite escolher usar MCP ou não
const [useMCP, setUseMCP] = useState(false);

// Endpoint dinâmico
const endpoint = useMCP
  ? "http://localhost:3000/bff/ai/recommendations/mcp"
  : "http://localhost:3000/bff/ai/recommendations";
```

**Endpoints disponíveis:**

- `POST /bff/ai/recommendations` - Abordagem tradicional
- `POST /bff/ai/recommendations/mcp` - Usa MCP

### 4. Integração com Clientes MCP

O servidor pode ser integrado com qualquer cliente MCP compatível:

- **Claude Desktop**: Adicionar ao arquivo de configuração
- **LangChain**: Usar o MCPClient
- **CLI personalizado**: Usar o protocolo JSON-RPC

### 5. Configuração de Ambiente

Crie um arquivo `.env` com as variáveis necessárias:

```env
DATABASE_URL=postgres://app:app@localhost:5432/appdb
OPENAI_API_KEY=sua_chave_aqui
NODE_ENV=development
```

## Benefícios do MCP

### 1. Padronização e Centralização

- Todas as ferramentas seguem o mesmo contrato JSON
- Um único ponto de entrada para todas as operações

### 2. Isolamento de Credenciais

- DB, chaves de LLM ficam atrás do servidor MCP
- O agente não precisa saber "como" cada tool é implementada

### 3. Reuso entre Clientes

- Mesmo conjunto de tools pode ser usado por:
  - Seu agente
  - CLI personalizado
  - Plugin de editor
  - Outro front-end

### 4. Observabilidade e Versionamento

- Logs centralizados de todas as chamadas
- Métricas de latência
- Versionamento de tools

### 5. Portabilidade

- Contrato JSON padronizado
- Transporte via stdio/WebSocket
- Agnóstico de LangChain/Framework

## Protocolo MCP

O servidor implementa o protocolo MCP v2024-11-05:

### Mensagens Suportadas

1. **initialize**: Inicialização do servidor
2. **tools/list**: Lista todas as ferramentas disponíveis
3. **tools/call**: Executa uma ferramenta específica
4. **notifications/cancel**: Cancela operações em andamento

### Formato de Mensagem

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "semantic_search",
    "arguments": {
      "query": "tinta azul"
    }
  }
}
```

## Desenvolvimento

### Estrutura de Arquivos

```
src/infra/mcp/
├── MCPServer.ts              # Servidor MCP principal
├── MCPClient.ts              # Cliente para comunicação
├── MCPAdapter.ts             # Adaptador para sistema existente
└── providers/                # Provedores de serviços (futuro)

src/use-cases/ai/
└── RecommendationAgentWithMCP.ts  # Agente que usa MCP

src/interface/http/bff/
├── controllers/
│   └── ai.controller.ts      # Controller com endpoints MCP
└── routes/
    └── ai.routes.ts          # Rotas incluindo /recommendations/mcp

src/
├── mcp-server.ts             # Script de entrada do servidor
└── test-mcp-basic.ts         # Script de teste básico

MCP_README.md                 # Documentação completa
```

### Adicionando Novas Ferramentas

1. Implemente a lógica da ferramenta
2. Adicione ao `handleListTools()` no `MCPServer.ts`
3. Adicione o case correspondente no `handleToolCall()`
4. Atualize a documentação

### Logs e Observabilidade

O servidor registra:

- Todas as chamadas de ferramentas
- Latência de cada operação
- Erros e exceções
- Métricas de uso

## Próximos Passos

- [ ] Implementar geração de imagens (DALL-E/SDXL)
- [ ] Adicionar cache para melhorar performance
- [ ] Implementar rate limiting
- [ ] Adicionar autenticação
- [ ] Criar dashboard de métricas
