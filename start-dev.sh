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

echo "🚀 Iniciando Backend..."
cd backend
docker compose up -d db api-dev

echo "⏳ Aguardando backend inicializar..."
sleep 5

echo "🌐 Iniciando Frontend..."
cd ../frontend
PORT=3001 npm start &

echo ""
echo "✅ Serviços iniciados!"
echo "📱 Frontend: http://localhost:3001"
echo "🔧 Backend: http://localhost:3000"
echo "📚 API Docs: http://localhost:3000/bff/docs"
echo ""
echo "Pressione Ctrl+C para parar todos os serviços"
echo ""

# Wait for user to stop
wait
