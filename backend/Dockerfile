FROM node:20-slim
WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl

# Install sharp dependencies
RUN apt-get install -y libc6 libvips libvips-dev make g++ python3

COPY package*.json ./
RUN npm ci || true
COPY . .
EXPOSE 3000
CMD ["node","dist/server.js"]
