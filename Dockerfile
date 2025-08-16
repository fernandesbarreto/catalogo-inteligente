FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci || true
COPY . .
EXPOSE 3000
CMD ["node","dist/server.js"]
