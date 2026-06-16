FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
COPY services/frontend/package.json services/frontend/
COPY services/gateway/package.json services/gateway/
COPY services/orchestrator/package.json services/orchestrator/
COPY services/agent-runtime/package.json services/agent-runtime/
COPY services/mcp-policy/package.json services/mcp-policy/
RUN npm install
COPY . .
RUN npm run build -w services/frontend

FROM node:22-alpine
RUN apk add --no-cache tini postgresql su-exec
WORKDIR /app
ENV NODE_ENV=production \
    GATEWAY_PORT=8080 \
    ORCHESTRATOR_PORT=8081 \
    AGENT_RUNTIME_PORT=8082 \
    MCP_POLICY_PORT=8083 \
    ORCHESTRATOR_URL=http://127.0.0.1:8081 \
    AGENT_RUNTIME_URL=http://127.0.0.1:8082 \
    MCP_POLICY_URL=http://127.0.0.1:8083 \
    FRONTEND_DIST=/app/services/frontend/dist \
    PGDATA=/var/lib/postgresql/data \
    DATABASE_URL=postgres://agentsphere:agentsphere@127.0.0.1:5432/agentsphere
COPY --from=build /app /app
RUN mkdir -p /var/lib/postgresql/data /run/postgresql \
    && chown -R postgres:postgres /var/lib/postgresql /run/postgresql
EXPOSE 8080
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "/app/start.sh"]
