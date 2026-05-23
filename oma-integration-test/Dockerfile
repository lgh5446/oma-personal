FROM node:22-slim

WORKDIR /app

# Install basic tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    jq \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy project files
COPY package.json ./
RUN npm install --production

COPY src/ ./src/
COPY docs/ ./docs/
COPY infra/ ./infra/
COPY test-runner.sh ./

RUN chmod +x test-runner.sh

# Health check
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD curl -f http://localhost:3000/api/todos || exit 1

EXPOSE 3000

CMD ["node", "src/backend/server.js"]
