# 🔄 Guide de Migration v1.0 → v2.0

## 📦 Fichiers Créés dans v2.0

### Backend (Nouveau)

#### Configuration
```
backend/
├── package.json                           # Dépendances backend
├── tsconfig.json                          # Config TypeScript
├── Dockerfile                             # Docker multi-stage
├── prisma/
│   └── schema.prisma                      # Schéma database
```

#### Core Application
```
backend/src/
├── server.ts                              # Point d'entrée API + WebSocket
├── config/
│   └── index.ts                           # Configuration centralisée
├── utils/
│   ├── logger.ts                          # Logging structuré (Pino)
│   ├── prisma.ts                          # Prisma client singleton
│   └── redis.ts                           # Redis client
```

#### Middleware
```
backend/src/middleware/
├── auth.ts                                # JWT + API key authentication
├── rateLimit.ts                           # Rate limiting multi-niveaux
├── requestLogger.ts                       # Logging HTTP requests
└── errorHandler.ts                        # Error handling global
```

#### Routes
```
backend/src/routes/
├── auth.routes.ts                         # Register, login, refresh
├── campaign.routes.ts                     # CRUD campaigns + approvals
├── asset.routes.ts                        # CRUD assets + validation
├── user.routes.ts                         # Profile, usage, API keys
└── health.routes.ts                       # Health checks
```

#### Services
```
backend/src/services/
├── cache.service.ts                       # Caching intelligent Redis
└── costTracking.service.ts                # Tracking coûts LLM/AI
```

#### Queue & Workers
```
backend/src/queue/
└── campaign.queue.ts                      # BullMQ queue + worker
```

#### Monitoring
```
backend/src/monitoring/
└── metrics.ts                             # Métriques Prometheus
```

#### Orchestration (Migration de frontend)
```
backend/src/orchestration/
├── orchestrator.ts                        # Migré depuis services/
├── playbook.ts                            # Migré depuis services/
├── types.ts                               # Migré depuis services/
└── humanValidation.ts                     # Migré depuis services/
```

### DevOps

```
.github/workflows/
└── ci.yml                                 # CI/CD GitHub Actions

docker-compose.yml                         # Orchestration services
.env.example                               # Template configuration
```

### Documentation

```
README_V2.md                               # Documentation complète v2.0
EVALUATION_V2.md                           # Audit expert v2.0
MIGRATION_GUIDE.md                         # Ce fichier
```

---

## 🔧 Étapes de Migration

### 1. Installation Backend

```bash
# Créer le dossier backend si pas existant
mkdir -p backend/src

# Copier tous les fichiers backend créés
# (voir structure ci-dessus)

# Installer les dépendances
cd backend
npm install

# Générer Prisma Client
npx prisma generate
```

### 2. Configuration Base de Données

```bash
# Lancer PostgreSQL (Docker)
docker run -d \
  --name astromedia-db \
  -p 5432:5432 \
  -e POSTGRES_USER=astromedia \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=astromedia \
  postgres:16-alpine

# Appliquer les migrations
DATABASE_URL="postgresql://astromedia:your_password@localhost:5432/astromedia" \
npx prisma migrate dev --name init
```

### 3. Configuration Redis

```bash
# Lancer Redis (Docker)
docker run -d \
  --name astromedia-redis \
  -p 6379:6379 \
  redis:7-alpine
```

### 4. Variables d'Environnement

```bash
# Copier le template
cp .env.example .env

# Éditer .env et remplir:
# - DATABASE_URL
# - REDIS_URL
# - JWT_SECRET (générer avec: openssl rand -base64 32)
# - API keys (OPENROUTER_API_KEY, etc.)
```

### 5. Migration Services Frontend → Backend

#### Services à Migrer

Les services suivants doivent être appelés via l'API backend au lieu d'être exécutés côté client:

**Frontend (v1.0)**:
```typescript
// services/llmRouter.ts
// services/agentRunner.ts
// services/imageGenerator.ts
// services/videoGenerator.ts
```

**Backend (v2.0)**:
```typescript
// Maintenant appelés via:
POST /api/v1/internal/llm
POST /api/v1/internal/image
POST /api/v1/internal/video
```

#### Modification du Frontend

**Avant (v1.0)**:
```typescript
// Dashboard.tsx
const orchestrator = runPlaybookParallel({
  playbook: defaultPlaybook,
  state: initialState,
  events,
  campaignId
});
```

**Après (v2.0)**:
```typescript
// Dashboard.tsx
const response = await fetch('/api/v1/campaigns', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(formData)
});

// Écouter les updates via WebSocket
socket.emit('subscribe:campaign', campaignId);
socket.on('phase:status', handlePhaseUpdate);
```

### 6. WebSocket Integration

**Fichier**: `frontend/src/services/websocket.ts` (nouveau)

```typescript
import io from 'socket.io-client';

export const initWebSocket = (token: string) => {
  const socket = io('http://localhost:8000', {
    auth: { token }
  });

  return socket;
};
```

**Utilisation dans Dashboard**:
```typescript
useEffect(() => {
  const socket = initWebSocket(userToken);

  socket.on('campaign:status', (data) => {
    setCampaignStatus(data.status);
  });

  socket.on('phase:output', (data) => {
    setPhaseOutputs(prev => ({
      ...prev,
      [data.phaseId]: data.output
    }));
  });

  return () => socket.disconnect();
}, [userToken]);
```

### 7. Authentification

**Nouveau fichier**: `frontend/src/services/auth.service.ts`

```typescript
class AuthService {
  async login(email: string, password: string) {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) throw new Error('Login failed');

    const { token, user } = await response.json();

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));

    return { token, user };
  }

  async register(email: string, password: string) {
    const response = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) throw new Error('Registration failed');

    const { token, user } = await response.json();

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));

    return { token, user };
  }

  getToken() {
    return localStorage.getItem('token');
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}

export const authService = new AuthService();
```

### 8. Lancement des Services

**Option A: Docker Compose (Recommandé)**

```bash
# Lancer tous les services
docker-compose up -d

# Vérifier les logs
docker-compose logs -f api
docker-compose logs -f worker
```

**Option B: Manuel**

```bash
# Terminal 1: Backend API
cd backend
npm run dev

# Terminal 2: Worker
cd backend
npm run worker

# Terminal 3: Frontend
cd ..
npm run dev
```

### 9. Vérification

```bash
# Health check
curl http://localhost:8000/api/v1/health

# Metrics
curl http://localhost:8000/metrics

# Create user
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

## ⚠️ Points d'Attention

### Variables d'Environnement Supprimées du Frontend

**À SUPPRIMER du `.env` frontend** (maintenant backend uniquement):
```
OPENROUTER_API_KEY
HF_API_KEY
GOOGLE_CLOUD_CREDENTIALS
AYRSHARE_API_KEY
```

**À AJOUTER au `.env` frontend**:
```
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

### Changements Breaking Changes

1. **Orchestrateur** - Maintenant côté backend
2. **LLM Calls** - Via API backend uniquement
3. **Authentication** - JWT requis pour toutes les requêtes
4. **WebSocket** - Remplace polling pour updates temps réel

### Compatibilité Rétroactive

**Non compatible**:
- Sessions frontend (perdues à la migration)
- Campagnes en cours (doivent être relancées)
- Clés API (nouvelles clés à générer)

**Compatible**:
- UI Components (inchangés)
- Agent definitions (inchangés)
- Playbook structure (inchangé)

---

## 🧪 Tests Post-Migration

### 1. Backend API

```bash
# Tests unitaires
cd backend
npm test

# Tests avec coverage
npm run test:coverage
```

### 2. Frontend

```bash
# Tests UI
npm test

# Build production
npm run build
```

### 3. Integration E2E

```bash
# Lancer tous les services
docker-compose up -d

# Créer un utilisateur
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}'

# Créer une campagne (avec token reçu)
curl -X POST http://localhost:8000/api/v1/campaigns \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @test-campaign.json

# Vérifier via UI
open http://localhost:5173
```

---

## 📊 Monitoring Post-Migration

### Prometheus Metrics

```bash
open http://localhost:9090

# Requêtes utiles:
rate(astromedia_http_requests_total[5m])
histogram_quantile(0.95, astromedia_http_request_duration_seconds)
astromedia_llm_cost_usd_total
```

### Grafana Dashboards

```bash
open http://localhost:3000
# Login: admin/admin

# Importer dashboards:
# - monitoring/grafana/dashboards/system.json
# - monitoring/grafana/dashboards/llm.json
```

### Logs

```bash
# API logs
docker-compose logs -f api | jq

# Worker logs
docker-compose logs -f worker | jq

# Filtrer par niveau
docker-compose logs api | jq 'select(.level=="error")'
```

---

## 🆘 Troubleshooting

### Database Connection Failed

```bash
# Vérifier PostgreSQL
docker ps | grep postgres

# Tester connexion
psql postgresql://astromedia:password@localhost:5432/astromedia

# Reset database
docker-compose down -v
docker-compose up -d db
npx prisma migrate deploy
```

### Redis Connection Failed

```bash
# Vérifier Redis
docker ps | grep redis

# Tester connexion
redis-cli -h localhost -p 6379 ping
```

### JWT Token Invalid

```bash
# Vérifier JWT_SECRET dans .env
# Régénérer si nécessaire
openssl rand -base64 32
```

### Worker Not Processing Jobs

```bash
# Vérifier worker logs
docker-compose logs worker

# Vérifier queue Redis
redis-cli
> KEYS bull:campaign-processing:*
> LLEN bull:campaign-processing:waiting
```

---

## 📚 Ressources

- **README v2.0**: Documentation complète
- **EVALUATION_V2.md**: Audit détaillé
- **API Documentation**: http://localhost:8000/api/v1/docs (TODO: Swagger)
- **Monitoring**: http://localhost:3000
- **GitHub**: Issues & Discussions

---

## ✅ Checklist Migration

- [ ] Backend installé et fonctionnel
- [ ] Database migrée
- [ ] Redis configuré
- [ ] Variables d'environnement configurées
- [ ] Frontend modifié pour utiliser API
- [ ] WebSocket intégré
- [ ] Authentication implémentée
- [ ] Tests backend passent
- [ ] Tests frontend passent
- [ ] CI/CD configuré
- [ ] Monitoring opérationnel
- [ ] Documentation à jour

---

**Temps estimé de migration**: 2-4 heures pour un développeur expérimenté.

**Support**: Ouvrir une issue sur GitHub si besoin d'aide.
