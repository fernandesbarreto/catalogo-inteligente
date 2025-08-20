#!/bin/bash

echo "🎨 Iniciando Catálogo Inteligente - Ambiente de Desenvolvimento"
echo "================================================================"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if Docker is running
if ! command_exists docker; then
    echo "❌ Docker não encontrado. Instale o Docker primeiro."
    exit 1
fi

# Check if Docker Compose is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker não está rodando. Inicie o Docker primeiro."
    exit 1
fi

# Check if Node.js is installed
if ! command_exists node; then
    echo "❌ Node.js não encontrado. Instale o Node.js 18+ primeiro."
    exit 1
fi

# Check if npm is installed
if ! command_exists npm; then
    echo "❌ npm não encontrado. Instale o npm primeiro."
    exit 1
fi

# Check if .env file exists in backend
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Arquivo .env não encontrado em backend/.env"
    echo "📝 Criando arquivo .env com configurações padrão..."
    
    cat > backend/.env << EOF
# Development
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgres://app:app@localhost:5432/appdb

# JWT (OBRIGATÓRIO - Mude em produção!)
JWT_SECRET=change-me

# OpenAI (OPCIONAL - para funcionalidades de IA)
OPENAI_API_KEY=secret
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBED_MODEL=text-embedding-3-small

# AI Configuration
RAG_K=8
AI_TEMP=0.2
AI_MAX_TOKENS=800

# Image Generation (OPCIONAL)
STABILITY_API_KEY=secret
IMAGE_PROVIDER=stability
ASSETS_SCENES_DIR=/app/assetes/scenes
EOF
    
    echo "✅ Arquivo .env criado! Edite backend/.env para adicionar suas chaves de API."
fi

echo "🚀 Iniciando Backend..."
cd backend

# Install backend dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências do backend..."
    npm install
fi

# Start backend services
docker compose up -d db api-dev

echo "⏳ Aguardando backend inicializar..."
sleep 10

# Check if backend is responding
echo "🔍 Verificando se o backend está respondendo..."
for i in {1..30}; do
    if curl -s http://localhost:3000/bff/docs > /dev/null 2>&1; then
        echo "✅ Backend está respondendo!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Backend não está respondendo após 30 tentativas"
        echo "📋 Verifique os logs: docker compose logs api-dev"
        exit 1
    fi
    echo "⏳ Tentativa $i/30..."
    sleep 2
done

# Install backend dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências do backend..."
    npm install
fi

# Run database seeds
echo "🌱 Executando seeds do banco de dados..."
echo "👥 Criando usuários de teste..."
npm run seed:users

echo "🎨 Criando tintas de exemplo..."
npm run seed

echo "✅ Seeds executados com sucesso!"

echo ""
echo "✅ Backend e banco de dados iniciados!"
echo "🔧 Backend: http://localhost:3000"
echo "📚 API Docs: http://localhost:3000/bff/docs"
echo ""
echo "🌐 Para iniciar o Frontend, execute em outro terminal:"
echo "   cd frontend"
echo "   npm install (se necessário)"
echo "   PORT=3001 npm start"
echo ""
echo "💡 Dicas:"
echo "   - Edite backend/.env para adicionar suas chaves de API"
echo "   - Use Ctrl+C para parar o backend"
echo "   - Ver logs: docker compose logs -f (no diretório backend)"
echo "   - Frontend estará disponível em: http://localhost:3001"
echo ""
echo "👥 Usuários de teste criados:"
echo "   - Admin: admin@example.com / admin123"
echo "   - Editor: editor@example.com / editor123"
echo "   - Viewer: viewer@example.com / viewer123"
echo ""
