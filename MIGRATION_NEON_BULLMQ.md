# ✅ Migration Supabase + n8n → Neon + BullMQ

## 🎯 Ce qui a été fait

### Architecture simplifiée
- ❌ **Supprimé**: Supabase (remplacé par Neon)
- ❌ **Supprimé**: n8n (remplacé par BullMQ)
- ❌ **Supprimé**: PostgreSQL local (remplacé par Neon serverless)
- ✅ **Gardé**: Redis (pour BullMQ)
- ✅ **Gardé**: Tous les agents et services existants

### Nouveaux services créés

#### 1. **BullMQ Queues** (`backend/src/queues/`)
- `config.ts`: Configuration Redis & options par défaut
- `instagram.queue.ts`: Workflow Instagram auto-reply
- `index.ts`: Exports
- `worker.ts`: Process worker pour tous les jobs

#### 2. **Prisma + Neon**
- Schema mis à jour: `backend/prisma/schema.prisma`
- Nouveaux modèles: `InstagramInteraction`, `LeadProfile`, `CmoReport`, `QueueJob`
- Support Neon avec `NEON_DATABASE_URL`

#### 3. **Webhook Routes** (`backend/src/routes/webhooks.routes.ts`)
- Endpoint `/webhooks/instagram` (GET + POST)
- Vérification webhook Instagram
- Enqueue des messages dans BullMQ

---

## 🚀 Setup Rapide

### 1. Créer une base Neon (gratuit)

```bash
# Allez sur https://console.neon.tech
# 1. Créez un nouveau projet "astromedia"
# 2. Copiez la connection string
# 3. Collez dans .env
```

### 2. Configuration `.env`

```bash
cp .env.example .env
nano .env
```

**Variables essentielles:**
```bash
# Neon Database
NEON_DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/astromedia?sslmode=require

# Redis (local ou cloud)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Instagram (optionnel pour tester)
INSTAGRAM_ACCESS_TOKEN=your_token
INSTAGRAM_VERIFY_TOKEN=astromedia_verify

# OpenRouter (pour les LLMs)
OPENROUTER_API_KEY=sk-or-v1-xxxxx
```

### 3. Installation

```bash
cd backend

# Installer les dépendances
npm install

# Générer le client Prisma
npx prisma generate

# Créer la base de données sur Neon
npx prisma migrate dev --name init

# (Optionnel) Ouvrir Prisma Studio
npx prisma studio
```

### 4. Lancer l'application

```bash
# Méthode 1: Docker Compose (recommandé)
docker-compose up -d

# Méthode 2: En local
cd backend
npm run dev          # API
npm run worker       # Worker (dans un autre terminal)
```

---

## 📝 Utilisation

### Workflow Instagram Auto-Reply

**1. Recevoir un message Instagram:**

```bash
# Test avec curl (simule un webhook Instagram)
curl -X POST http://localhost:8000/webhooks/instagram \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "time": 1234567890,
      "messaging": [{
        "sender": {"id": "123456"},
        "message": {
          "mid": "msg_123",
          "text": "Bonjour! Quel est votre menu du jour?"
        }
      }]
    }]
  }'
```

**2. Le workflow automatique:**
1. Message enqueue dans Redis (BullMQ)
2. Worker le récupère
3. Analyse du sentiment (via llmRouter)
4. Génération de la réponse (Claude 3 Haiku)
5. Sauvegarde dans Neon
6. Envoi de la réponse Instagram
7. Update du lead score

**3. Consulter les interactions:**

```typescript
// Dans Prisma Studio: npx prisma studio
// Ou via code:
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const interactions = await prisma.instagramInteraction.findMany({
  orderBy: { timestamp: 'desc' },
  take: 10
});
```

### Créer un nouveau workflow

```typescript
// backend/src/queues/lead-gen.queue.ts
import { Queue, Worker } from 'bullmq';
import { defaultQueueOptions, defaultWorkerOptions } from './config';

export const leadGenQueue = new Queue('lead-gen', defaultQueueOptions);

export const leadGenWorker = new Worker('lead-gen', async (job) => {
  // Votre logique ici
  console.log('Processing lead gen:', job.data);

  // Exemple: Chercher des restaurants sur Google Maps
  const restaurants = await searchGoogleMaps(job.data.location);

  return { found: restaurants.length };
}, defaultWorkerOptions);

// Ajouter des jobs
export async function queueLeadGenJob(location: string) {
  return await leadGenQueue.add('search', { location });
}
```

**Démarrer le worker:**

```typescript
// backend/src/worker.ts
import { instagramWorker } from './queues/instagram.queue';
import { leadGenWorker } from './queues/lead-gen.queue';

// Les workers démarrent automatiquement!
```

---

## 🔧 Commandes Utiles

### Prisma

```bash
# Générer le client
npx prisma generate

# Créer une migration
npx prisma migrate dev --name add_new_field

# Appliquer en production
npx prisma migrate deploy

# Studio (UI pour la DB)
npx prisma studio

# Reset la DB (DANGER)
npx prisma migrate reset
```

### BullMQ / Redis

```bash
# Voir les jobs en cours (via code)
import { instagramQueue } from './queues';

const jobs = await instagramQueue.getJobs(['active', 'waiting']);
console.log(jobs);

# Nettoyer les jobs complétés
await instagramQueue.clean(24 * 3600 * 1000, 100, 'completed');
```

### Docker

```bash
# Tout démarrer
docker-compose up -d

# Voir les logs
docker-compose logs -f worker  # Worker BullMQ
docker-compose logs -f api     # API

# Redémarrer le worker
docker-compose restart worker

# Stop tout
docker-compose down
```

---

## 📊 Monitoring

### Voir les jobs BullMQ

**Option 1: Bull Board (UI Web)**

```bash
npm install @bull-board/express @bull-board/api

# backend/src/server.ts
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [new BullMQAdapter(instagramQueue)],
  serverAdapter,
});
app.use('/admin/queues', serverAdapter.getRouter());
```

Accès: `http://localhost:8000/admin/queues`

**Option 2: Code**

```typescript
import { instagramQueue } from './queues';

// Stats
const counts = await instagramQueue.getJobCounts();
console.log(counts);
// { waiting: 5, active: 2, completed: 100, failed: 3 }

// Jobs récents
const failed = await instagramQueue.getFailed(0, 10);
console.log('Failed jobs:', failed);
```

### Database (Neon Console)

- Allez sur: https://console.neon.tech
- Sélectionnez votre projet
- Onglet "Monitoring" pour voir:
  - Queries/sec
  - Storage usage
  - Active connections

---

## 💰 Coûts

### Avant (Supabase + n8n)
- Supabase Free: 500MB storage, 2GB bandwidth
- n8n self-hosted: 1 container supplémentaire
- PostgreSQL local: 1 container supplémentaire

### Après (Neon + BullMQ)
- **Neon Free Tier**:
  - 0.5GB storage (10x plus que nécessaire)
  - 191.9h compute/mois
  - Database branching ✅
- **BullMQ**: Gratuit (library)
- **Redis**: 1 container (déjà nécessaire)

**Économie**: -2 containers, +database branching, +simplicité

---

## 🐛 Troubleshooting

### Erreur: "Neon connection refused"

```bash
# Vérifiez votre .env
echo $NEON_DATABASE_URL

# Testez la connection
npx prisma db pull
```

### Worker ne process pas les jobs

```bash
# Vérifiez que Redis tourne
docker-compose ps redis

# Vérifiez les logs
docker-compose logs worker

# Redémarrez
docker-compose restart worker
```

### Jobs échouent toujours

```bash
# Voir les jobs failed
import { instagramQueue } from './queues';
const failed = await instagramQueue.getFailed();
console.log(failed[0].failedReason);

# Retry manuellement
await failed[0].retry();
```

---

## 📚 Ressources

- **Neon Docs**: https://neon.tech/docs
- **BullMQ Docs**: https://docs.bullmq.io
- **Prisma Docs**: https://www.prisma.io/docs
- **Instagram API**: https://developers.facebook.com/docs/instagram-api

---

## ✅ Checklist Migration

- [x] Prisma schema mis à jour
- [x] BullMQ queues créés
- [x] Worker configuré
- [x] Docker-compose simplifié
- [x] .env.example mis à jour
- [x] Fichiers obsolètes supprimés
- [ ] Database Neon créée
- [ ] Variables .env configurées
- [ ] `npx prisma migrate dev` exécuté
- [ ] Application testée

---

**Migration complétée avec succès! 🎉**

Architecture: **-2 services**, **+simplicité**, **+type safety**, **+version control**
