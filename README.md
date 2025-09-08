# Novo Ambiente **Dev → Homologação → Produção** (Lab)

Este repositório/laboratório implementa uma aplicação mínima **Node.js/Express** conteinerizada com **Docker Compose** para três ambientes: **dev**, **homolog** e **prod**. Serve como base prática para o fluxo de implantação **dev → homologação → produção** com versionamento mensal, integração com **Jira** e pipelines **CI/CD**.

---

## 🎯 Objetivos
- Padronizar os ambientes (**dev/homolog/prod**) e treinar operação diária.
- Garantir que **homolog** espelhe **produção** (mesmas otimizações, `NODE_ENV=production`).
- Preparar terreno para **CI (build/push image)** e **CD** (deploy automatizado em homolog e tagueado em prod).
- Integrar o trabalho ao **Jira** com rastreabilidade (issue keys nos branches/commits/PRs).

---

## 🧱 Stack
- **Node.js 20** + **Express**
- **Docker** + **Docker Compose**
- **Git/GitHub** (exemplos com GHCR como registry)
- **Jira** (issue tracking e automações)

---

## ✅ Pré‑requisitos
- Docker + Docker Compose recentes.
- Portas **3001**, **3002**, **3003** livres no host.
- (Opcional) Conta GitHub com permissões para usar o **GitHub Container Registry (GHCR)**.

> ℹ️ Em **Windows/PowerShell**, o alias `curl` chama `Invoke-WebRequest`. Use o navegador para testar `/health` ou `Invoke-WebRequest`/`iwr`.

---

## 📁 Estrutura de diretórios

```
novo-ambiente-lab/
├─ app-exemplo/
│  ├─ index.js
│  ├─ package.json
│  ├─ .dockerignore
│  └─ Dockerfile
├─ env/
│  ├─ dev.env
│  ├─ homolog.env
│  └─ prod.env
└─ docker-compose.yml
```

---

## 🚀 Primeiros passos

### 1) Criar pastas
```bash
mkdir -p novo-ambiente-lab/app-exemplo
mkdir -p novo-ambiente-lab/env
cd novo-ambiente-lab
```

### 2) App Node/Express mínimo

**app-exemplo/package.json**
```json
{
  "name": "app-exemplo",
  "version": "1.0.0",
  "description": "App minimo Express para ambientes dev/homolog/prod",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "node index.js"
  },
  "dependencies": {
    "dotenv": "^16.4.5",
    "express": "^4.19.2"
  }
}
```

**app-exemplo/index.js**
```js
import express from "express";
import dotenv from "dotenv";

dotenv.config(); // o docker compose injeta via env_file

const app = express();

const APP_NAME = process.env.APP_NAME || "app-exemplo";
const ENV_NAME = process.env.ENV_NAME || process.env.NODE_ENV || "dev";
const PORT = parseInt(process.env.PORT || "3000", 10);
const LOG_LEVEL = process.env.LOG_LEVEL || "info";
const FEATURE_FAKE_DATA = (process.env.FEATURE_FAKE_DATA || "false") === "true";
const API_BASE_URL = process.env.API_BASE_URL || null;

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    app: APP_NAME,
    env: ENV_NAME,
    node_env: process.env.NODE_ENV || null,
    log_level: LOG_LEVEL,
    feature_fake_data: FEATURE_FAKE_DATA,
    api_base_url: API_BASE_URL,
    timestamp: new Date().toISOString()
  });
});

app.get("/", (req, res) => {
  res.send(
    `<h1>${APP_NAME}</h1>
     <p>Ambiente: <b>${ENV_NAME}</b></p>
     <p>Tente <code>/health</code></p>`
  );
});

app.listen(PORT, () => {
  console.log(`[${APP_NAME}] iniciado na porta ${PORT} (ENV=${ENV_NAME})`);
});
```

**app-exemplo/.dockerignore**
```
node_modules
npm-debug.log
.DS_Store
```

**app-exemplo/Dockerfile**
```Dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine
WORKDIR /usr/src/app
COPY package.json ./
RUN npm install --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### 3) Variáveis de ambiente

> Recomendado: **todos** os containers escutam na porta interna **3000**; o Compose mapeia para 3001/3002/3003 no host.

**env/dev.env**
```env
APP_NAME=app-exemplo
ENV_NAME=dev
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
FEATURE_FAKE_DATA=true
API_BASE_URL=http://localhost:8080
```

**env/homolog.env**
```env
APP_NAME=app-exemplo
ENV_NAME=homolog
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
FEATURE_FAKE_DATA=false
API_BASE_URL=https://api-homolog.seu-dominio.com
```

**env/prod.env**
```env
APP_NAME=app-exemplo
ENV_NAME=prod
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
FEATURE_FAKE_DATA=false
API_BASE_URL=https://api.seu-dominio.com
```

### 4) Compose (raiz)

**docker-compose.yml**
```yaml
services:
  app-dev:
    build:
      context: ./app-exemplo
      dockerfile: Dockerfile
    env_file: ./env/dev.env
    ports:
      - "3001:3000"
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 10s
      timeout: 3s
      retries: 5
    restart: unless-stopped

  app-homolog:
    build:
      context: ./app-exemplo
      dockerfile: Dockerfile
    env_file: ./env/homolog.env
    ports:
      - "3002:3000"
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 10s
      timeout: 3s
      retries: 5
    restart: unless-stopped

  app-prod:
    build:
      context: ./app-exemplo
      dockerfile: Dockerfile
    env_file: ./env/prod.env
    ports:
      - "3003:3000"
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 10s
      timeout: 3s
      retries: 5
    restart: unless-stopped
```

### 5) Subir e validar
```bash
docker compose up -d --build
docker compose ps
```

**Endpoints:**
- Dev:     http://localhost:3001/health
- Homolog: http://localhost:3002/health
- Prod:    http://localhost:3003/health

**Logs:**
```bash
docker compose logs -f app-homolog
```

---

## 🧭 Operação do dia a dia
```bash
docker compose down                       # parar tudo
docker compose up -d app-homolog          # subir só homolog
docker compose stop app-homolog           # parar só homolog
docker compose restart app-prod           # reiniciar só prod
docker compose build --no-cache && docker compose up -d  # rebuild + subir
```

---

## 🗂️ Git – fluxo e convenções

Inicialização:
```bash
git init
git branch -M main
echo "node_modules" > app-exemplo/.gitignore
echo ".env" >> .gitignore
git add .
git commit -m "chore: bootstrap lab (dev/homolog/prod via compose)"
```

**Branches (proposta):**
- `main` → base estável
- `feat/*` → novas funcionalidades (ex.: `feat/health-logs`)
- `fix/*` → correções
- `hotfix/*` → correções críticas originadas de produção
- `release/*` → preparação do pacote mensal (ex.: `release/2025.09`)

**Conventional Commits + Jira:**
- `feat(health): add detailed status (EDU-123)`
- `fix(compose): healthcheck fetch fallback (EDU-145)`
- `chore(release): bump to 2025.09.0 (EDU-200)`

> Inclua a **issue key Jira** no título/descrição do commit/PR.

---

## 🏷️ Versionamento e tags

Padrão mensal + patch: `AAAA.MM.PATCH` (ex.: `2025.09.0`, `2025.09.1`)

```bash
git tag -a 2025.09.0 -m "release 2025.09.0"
git push origin main --tags
```

---

## 🤖 CI (GitHub Actions) — build & push de imagem

Arquivo: **.github/workflows/ci.yml**
```yaml
name: CI

on:
  push:
    branches: [ main, "feat/**", "fix/**", "hotfix/**", "release/**" ]
  pull_request:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}/app-exemplo

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Set IMAGE_TAG
        id: vars
        run: echo "IMAGE_TAG=${GITHUB_REF_NAME}-${GITHUB_SHA::7}" >> $GITHUB_OUTPUT

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build & Push
        uses: docker/build-push-action@v6
        with:
          context: ./app-exemplo
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ steps.vars.outputs.IMAGE_TAG }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
```

> Ajuste o registry se preferir Docker Hub / ACR / ECR.

---

## 🚚 CD Homolog (auto ao fazer push em `main`)

Arquivo: **.github/workflows/cd-homolog.yml**
```yaml
name: CD Homolog

on:
  push:
    branches: [ main ]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}/app-exemplo

jobs:
  deploy-homolog:
    runs-on: ubuntu-latest
    steps:
      - name: Set IMAGE_TAG from latest commit
        id: vars
        run: echo "IMAGE_TAG=main-${GITHUB_SHA::7}" >> $GITHUB_OUTPUT

      - name: SSH deploy to homolog host
        uses: appleboy/ssh-action@v1.2.2
        with:
          host: ${{ secrets.HOMOLOG_HOST }}
          username: ${{ secrets.HOMOLOG_USER }}
          key: ${{ secrets.HOMOLOG_SSH_KEY }}
          script: |
            export IMAGE_TAG=${{ steps.vars.outputs.IMAGE_TAG }}
            mkdir -p ~/novo-ambiente-homolog
            cd ~/novo-ambiente-homolog

            cat > compose-homolog.yml << 'EOF'
            services:
              app-homolog:
                image: ghcr.io/${{ github.repository }}/app-exemplo:${IMAGE_TAG}
                env_file: ./env/homolog.env
                ports:
                  - "3002:3000"
                healthcheck:
                  test: ["CMD", "node", "-e", "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
                  interval: 10s
                  timeout: 3s
                  retries: 5
                restart: unless-stopped
            EOF

            mkdir -p env
            # env/homolog.env deve existir no host (preferir cofre/secrets)
            docker login ghcr.io -u ${{ github.actor }} -p ${{ secrets.GITHUB_TOKEN }}
            docker compose -f compose-homolog.yml pull
            docker compose -f compose-homolog.yml up -d --remove-orphans
            docker compose -f compose-homolog.yml ps
```

> **Secrets necessários**: `HOMOLOG_HOST`, `HOMOLOG_USER`, `HOMOLOG_SSH_KEY`.

---

## 🚀 CD Prod (ao criar tag `20YY.MM.X`)

Arquivo: **.github/workflows/cd-prod.yml**
```yaml
name: CD Prod

on:
  push:
    tags:
      - '20*.**.*'

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}/app-exemplo

jobs:
  deploy-prod:
    runs-on: ubuntu-latest
    steps:
      - name: Set IMAGE_TAG from tag
        id: vars
        run: echo "IMAGE_TAG=${GITHUB_REF_NAME}" >> $GITHUB_OUTPUT

      - name: SSH deploy to prod host
        uses: appleboy/ssh-action@v1.2.2
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            export IMAGE_TAG=${{ steps.vars.outputs.IMAGE_TAG }}
            mkdir -p ~/novo-ambiente-prod
            cd ~/novo-ambiente-prod

            cat > compose-prod.yml << 'EOF'
            services:
              app-prod:
                image: ghcr.io/${{ github.repository }}/app-exemplo:${IMAGE_TAG}
                env_file: ./env/prod.env
                ports:
                  - "3003:3000"
                healthcheck:
                  test: ["CMD", "node", "-e", "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
                  interval: 10s
                  timeout: 3s
                  retries: 5
                restart: unless-stopped
            EOF

            mkdir -p env
            # env/prod.env deve existir e ser gerenciado com segurança
            docker login ghcr.io -u ${{ github.actor }} -p ${{ secrets.GITHUB_TOKEN }}
            docker compose -f compose-prod.yml pull
            docker compose -f compose-prod.yml up -d --remove-orphans
            docker compose -f compose-prod.yml ps
```

> **Secrets necessários**: `PROD_HOST`, `PROD_USER`, `PROD_SSH_KEY`.  
> **Disparo**: criar tag `2025.09.0` ⇒ deploy em produção.

---

## 🔗 Integração com Jira

1. Conectar repositório ao Jira (ex.: **Jira Cloud for GitHub**).
2. Usar **issue keys** em branches/commits/PRs (ex.: `EDU-123`).
3. (Opcional) **Smart Commits**:  
   - `EDU-123 #comment Ajuste de health`  
   - `EDU-123 #time 1h`  
   - `EDU-123 #transition "Em Homologação"`

> Sugestão: automatizar no Jira a transição para **“Em Homologação”** após sucesso do **CD Homolog**.

---

## 🧪 Homolog espelha Produção
- `NODE_ENV=production` também em **homolog**.
- Mesmas otimizações/flags, endpoints de **staging**.
- Objetivo: fidelidade máxima dos testes e redução de riscos no deploy final.

---

## 🛠️ Troubleshooting
- **Conexão fechada ao acessar `/health`**: verifique se `PORT=3000` dentro do container e mapeamento `3001/3002/3003:3000` no Compose; reconstrua (`docker compose build --no-cache`).
- **Healthcheck falha**: teste de dentro do container:  
  `docker compose exec app-dev sh -lc "wget -qO- http://localhost:3000/health || curl -s http://localhost:3000/health"`
- **Porta em uso**: ajuste portas do host no Compose ou libere a porta (lsof/netstat/ss).

---

## 🗺️ Roadmap (resumo)
- **Fase 1 – Fundação**: ambientes + operação (✅ concluído no lab)
- **Fase 2 – Plataforma**: Git, versionamento, CI/CD (este README)
- **Fase 3 – Escala**: janelas de deploy, hotfixes, runbooks de rollback

---

Feito com ❤️ para simplificar o caminho **dev → homolog → prod**. Ajuste à sua realidade (providers, registry, secrets, observabilidade, etc.).
