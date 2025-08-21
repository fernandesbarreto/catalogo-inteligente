# 🎨 Catálogo Inteligente

Sistema inteligente de recomendação de tintas com IA, seguindo Clean Architecture.

## 📁 Estrutura do Projeto

```
catalogo-inteligente/
├── backend/                       # Backend - Clean Architecture
│   ├── src/                       # Código fonte
│   │   ├── domain/                # Entidades e regras de negócio
│   │   ├── use-cases/             # Casos de uso da aplicação
│   │   ├── interface/             # Controllers, DTOs, Middlewares
│   │   └── infra/                 # Implementações externas (DB, AI, etc.)
│   ├── tests/                     # Testes unitários
│   ├── scripts/                   # Scripts de seed e migração
│   ├── postman/                   # Coleções de teste da API
│   ├── prisma/                    # Schema e migrações do banco
│   ├── docker-compose.yml         # Orquestração dos serviços
│   ├── package.json               # Dependências do backend
│   └── .env                       # Variáveis de ambiente (criar)
├── frontend/                      # Frontend React
│   ├── src/                       # Componentes React
│   ├── public/                    # Assets estáticos
│   └── package.json               # Dependências do frontend
├── README.md                      # Documentação principal
└── start-dev.sh                   # Script para iniciar ambos os serviços
```

## 🏗️ Arquitetura

### **Backend** (Clean Architecture)

- **Domain Layer**: Entidades e regras de negócio
- **Use Cases**: Lógica de aplicação
- **Interface Layer**: Controllers, DTOs, Middlewares
- **Infrastructure Layer**: Database, AI, External APIs

### **Frontend** (React + TypeScript)

- **Modern UI** com glassmorphism
- **Responsive design** para mobile/desktop
- **TypeScript** para type safety
- **Fetch API** para comunicação com backend

## 🚀 Como executar

### Pré-requisitos

- **Docker** e **Docker Compose** instalados
- **Node.js** 18+ instalado
- **npm** ou **yarn** instalado

### Opção 1: Script automático (Recomendado)

```bash
# 1. Clone o repositório
git clone <repository-url>
cd catalogo-inteligente

# 2. Configure as variáveis de ambiente
cp backend/.env.example backend/.env
# Edite backend/.env com suas chaves de API

# 3. Inicia backend e frontend automaticamente
./start-dev.sh
```

### Opção 2: Manual

#### 1. Configuração Inicial

```bash
# Clone o repositório
git clone <repository-url>
cd catalogo-inteligente

# Configure as variáveis de ambiente
cp backend/.env.example backend/.env
# Edite backend/.env com suas chaves de API
```

#### 2. Backend (API + AI)

```bash
# Navegar para o backend
cd backend

# Instalar dependências
npm install

# Iniciar serviços
docker compose up -d db api-dev

# Ou executar em desenvolvimento
npm run dev
```

#### 3. Frontend (Interface)

```bash
# Navegar para o frontend
cd frontend

# Instalar dependências
npm install

# Executar em desenvolvimento
npm start
```

### 4. Acessar

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **API Docs**: http://localhost:3000/bff/docs

## 🔧 Configuração de Ambiente

Crie um arquivo `.env` no diretório `backend/` com as seguintes variáveis:

```env
# Development
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgres://app:app@localhost:5432/appdb

# JWT (OBRIGATÓRIO)
JWT_SECRET=your-super-secret-jwt-key

# OpenAI (OPCIONAL - para funcionalidades de IA)
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBED_MODEL=text-embedding-3-small

# AI Configuration
RAG_K=8
AI_TEMP=0.2
AI_MAX_TOKENS=800

# Image Generation (OPCIONAL)
STABILITY_API_KEY=your-stability-api-key
IMAGE_PROVIDER=stability
ASSETS_SCENES_DIR=/app/assetes/scenes
```

### Variáveis Obrigatórias

- `DATABASE_URL`: URL do banco PostgreSQL (configurada automaticamente pelo Docker)

### Variáveis Opcionais

- `OPENAI_API_KEY`: Para funcionalidades de IA avançadas
- `STABILITY_API_KEY`: Para geração de imagens de paleta
- Outras variáveis têm valores padrão adequados

## 🎯 Funcionalidades

### **AI Features**

- **Recomendações inteligentes** de tintas
- **Busca semântica** com embeddings OpenAI
- **Agente orquestrador** que escolhe a melhor estratégia
- **Integração MCP** (Model Context Protocol)
- **Geração de imagens de paleta** com IA

### **API Endpoints**

#### **AI Endpoints**

- `POST /bff/ai/chat` - Chat unificado com IA
- `POST /bff/ai/search` - Busca semântica
- `POST /bff/ai/palette-image` - Geração de imagens de paleta

#### **Paint Endpoints**

- `GET /bff/paints/public` - Listar tintas (público)
- `GET /bff/paints/public/{id}` - Obter tinta por ID (público)

#### **Auth Endpoints**

- `POST /bff/auth/login` - Login de usuário

#### **User Management**

- `GET /bff/users` - Listar usuários (Admin)
- `POST /bff/users` - Criar usuário (Admin)
- `GET /bff/users/{id}/roles` - Obter roles do usuário (Admin)
- `POST /bff/users/{id}/roles` - Adicionar role (Admin)

### **Interface**

- **Busca intuitiva** com exemplos prontos
- **Resultados organizados** em cards
- **Feedback visual** em tempo real
- **Design responsivo** para todos os dispositivos

## 🧪 Testes

```bash
# Navegar para o backend
cd backend

# Testes unitários
npm test

# Testes com coverage
npm run test:coverage

# Testes específicos
npm run test:golden
npm run test:retriever
npm run test:routing
npm run test:e2e
```

## 📦 Deploy

### **Backend** (Docker)

```bash
cd backend
docker compose up -d
```

### **Frontend** (Static)

```bash
cd frontend
npm run build
# Deploy build/ folder to CDN/static hosting
```

## 🔧 Tecnologias

### **Backend**

- Node.js + TypeScript
- Express + Prisma
- PostgreSQL + pgvector
- LangChain + OpenAI
- Jest + Docker
- MCP (Model Context Protocol)

### **Frontend**

- React 18 + TypeScript
- CSS moderno (flexbox/grid)
- Fetch API
- Responsive design

## 🎨 Exemplos de Uso

### **Queries de Exemplo**

- "tinta para quarto infantil lavável"
- "tinta branca para sala moderna"
- "tinta resistente para cozinha"
- "tinta antimofo para banheiro"
- "tinta elegante para área externa"

### **API Response**

```json
{
  "picks": [
    {
      "id": "paint-123",
      "reason": "Semântico: Tinta ideal para quarto infantil..."
    }
  ],
  "notes": "Encontradas 3 tintas usando busca semântica.",
  "message": "Aqui estão algumas opções perfeitas para o quarto do seu filho..."
}
```

## 📚 Documentação

- **API Docs**: http://localhost:3000/bff/docs
- **Postman Collection**: `backend/postman/catalogo-inteligente.postman_collection.json`
- **AI Collection**: `backend/postman/ai-endpoints.postman_collection.json`
- **MCP Documentation**: `backend/MCP_README.md`

## 🚨 Troubleshooting

### Problemas Comuns

1. **Erro de conexão com banco**: Verifique se o Docker está rodando
2. **Erro de JWT_SECRET**: Configure a variável no arquivo .env
3. **Erro de OpenAI**: Configure OPENAI_API_KEY ou use sem IA
4. **Porta 3000 ocupada**: Mude a porta no .env ou pare outros serviços

### Logs

```bash
# Ver logs do backend
cd backend
docker compose logs -f api-dev

# Ver logs do banco
docker compose logs -f db
```
