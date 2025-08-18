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
│   └── .env                       # Variáveis de ambiente
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

### Opção 1: Script automático (Recomendado)

```bash
# Inicia backend e frontend automaticamente
./start-dev.sh
```

### Opção 2: Manual

#### 1. Backend (API + AI)

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

#### 2. Frontend (Interface)

```bash
# Navegar para o frontend
cd frontend

# Instalar dependências
npm install

# Executar em desenvolvimento
npm start
```

### 3. Acessar

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **API Docs**: http://localhost:3000/bff/docs

## 🎯 Funcionalidades

### **AI Features**

- **Recomendações inteligentes** de tintas
- **Busca semântica** com embeddings OpenAI
- **Agente orquestrador** que escolhe a melhor estratégia
- **Integração MCP** preparada para o futuro

### **API Endpoints**

- `POST /bff/ai/recommendations` - Recomendações inteligentes
- `POST /bff/ai/search` - Busca semântica
- `GET /bff/paints` - Listar tintas
- `POST /bff/paints` - Criar tinta com embedding

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
  "notes": "Encontradas 3 tintas usando busca semântica."
}
```

## 📚 Documentação

- **API Docs**: http://localhost:3000/bff/docs
- **Postman Collection**: `backend/postman/catalogo-inteligente.postman_collection.json`
- **AI Collection**: `backend/postman/ai-endpoints.postman_collection.json`
