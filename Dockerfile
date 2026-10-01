FROM node:24-alpine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .

ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/app/data/chessrank.db

EXPOSE 3000
VOLUME ["/app/data"]
CMD ["node", "server.js"]
