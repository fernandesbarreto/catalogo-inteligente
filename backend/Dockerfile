FROM node:20-slim
WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl

COPY package*.json ./
RUN npm ci || true
COPY . .
EXPOSE 3000
CMD ["node","dist/server.js"]
