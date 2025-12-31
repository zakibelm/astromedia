# AstroMedia : Guide de Développement et d'Architecture

Ce document est le plan d'ingénierie complet pour la construction de l'agent média full-stack AstroMedia. Il fusionne une interface utilisateur luxueuse avec une architecture backend résiliente, observable et prête pour la production.

## 1. Objectif du Projet

Construire une application full-stack d'agent média autonome (Telegram en front) capable de comprendre des instructions en langage naturel pour gérer des fichiers (Google Drive), créer du contenu (images, vidéos), et le publier sur les réseaux sociaux. L'architecture est conçue pour être résiliente et optimisée pour les coûts grâce à une logique de fallback multi-fournisseurs IA et une traçabilité complète.

---

## 2. Principes d’Architecture

1.  **Asynchrone** : Tâches lourdes en file d'attente (Celery/Redis). Réponse Telegram immédiate.
2.  **Résilience** : Chaque dépendance externe a un fallback. Jamais de point de défaillance unique.
3.  **Observabilité** : Logs d'actions, coûts, erreurs, métriques (Prometheus) et traces (OpenTelemetry).
4.  **Modularité** : Services & outils isolés, testables et substituables.

---

## 3. Stack Technique

-   **Backend** : Python 3.10+, FastAPI, Celery, Redis, PostgreSQL
-   **Données** : SQLAlchemy (ORM), Pydantic
-   **IA & Agents** : LangChain, OpenRouter, Hugging Face, Banana.dev, Fal.ai, Seedream, Vertex AI (Veo 3)
-   **Services Externes** : Google Drive API, Ayrshare API
-   **Conteneurisation** : Docker, Docker Compose
-   **CI/CD** : GitHub Actions
-   **Qualité** : Pytest, Ruff, Black, Mypy

---

## 4. Arborescence du Projet

```
/media_agent
|-- .env                  # Fichier des secrets (à créer)
|-- requirements.txt      # Dépendances Python
|-- README.md             # Ce fichier
|-- docker-compose.yml    # Orchestration des services
|-- Makefile              # Raccourcis de commandes
|-- app/
|   |-- __init__.py
|   |-- main.py             # API FastAPI
|   |-- config.py           # Chargement des variables d'environnement
|   |-- schemas.py          # Modèles Pydantic
|   |-- models/
|   |   |-- database.py     # Connexion DB
|   |   |-- log_entry.py    # Modèle SQLAlchemy
|   |-- services/
|   |   |-- ai_manager.py
|   |   |-- creative_manager.py
|   |   |-- drive_manager.py
|   |   |-- social_manager.py
|   |   |-- logger_service.py
|   |-- agents/
|   |   |-- media_agent.py
|   |-- tools/
|   |   |-- drive_tools.py
|   |   |-- creative_tools.py
|   |   |-- social_tools.py
|-- workers/
|   |-- celery_app.py       # Configuration Celery
|   |-- media_tasks.py      # Tâches asynchrones
|-- tests/
|   |-- ...                 # Tests unitaires et d'intégration
```

---

## 5. Mise en Place de l'Environnement

### 5.1. Prérequis
-   Docker
-   Docker Compose

### 5.2. Fichier d'Environnement (`.env`)
Créez un fichier `.env` à la racine du projet en vous basant sur ce modèle. **NE COMMITEZ JAMAIS CE FICHIER.**

```env
# Application
APP_ENV=dev
POSTGRES_USER=media
POSTGRES_PASSWORD=your_strong_password
POSTGRES_DB=media
POSTGRES_DSN=postgresql+psycopg2://media:your_strong_password@db:5432/media
REDIS_URL=redis://redis:6379/0

# Telegram
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_WEBHOOK_SECRET=a_very_strong_secret_token_for_security

# Fournisseurs IA
OPENROUTER_API_KEY=...
HF_API_KEY=...
BANANA_API_KEY=...
FAL_API_KEY=...
SEEDREAM_API_KEY=...
AYRSHARE_API_KEY=...

# Google Cloud (pour Vertex AI & Drive)
# Encoder le contenu du fichier JSON de credentials en Base64
# cat your-gcp-creds.json | base64
GCP_PROJECT_ID=your-gcp-project-id
GCP_VERTEX_REGION=us-central1
GCP_CREDENTIALS_JSON_BASE64=...

# Idem pour les credentials Google Drive
GOOGLE_DRIVE_CREDENTIALS_JSON_BASE64=...
```

### 5.3. Obtention des Identifiants
-   **Google Cloud / Drive** : Créez un projet sur GCP, activez les API Vertex AI et Google Drive. Créez un compte de service, donnez-lui les rôles nécessaires, et téléchargez sa clé JSON.
-   **Autres APIs** : Créez des comptes sur OpenRouter, Hugging Face, Banana.dev, Fal.ai, Seedream et Ayrshare pour obtenir vos clés API.

---

## 6. Lancement et Utilisation

### 6.1. Commandes `Makefile`
Un `Makefile` simplifie la gestion du projet.

```makefile
# Makefile à la racine du projet

.PHONY: dev test lint fmt down

dev:
	docker-compose up -d --build

test:
	docker-compose run --rm api pytest

lint:
	docker-compose run --rm api ruff check .

fmt:
	docker-compose run --rm api ruff format . && docker-compose run --rm api black .

down:
	docker-compose down

```
Pour démarrer tous les services :
```bash
make dev
```

### 6.2. Configuration du Webhook Telegram
Après avoir lancé l'application, vous devrez configurer le webhook de votre bot Telegram pour qu'il pointe vers votre API.

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://your-public-domain.com/telegram-webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

---

## 7. Guide d'Implémentation & Extraits de Code

### 7.1. `docker-compose.yml`
Voici une base solide pour votre fichier `docker-compose.yml`.

```yaml
version: '3.8'

services:
  db:
    image: postgres:13-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data/
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:6-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build: .
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    volumes:
      - .:/app
    ports:
      - "8000:8000"
    env_file:
      - .env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  worker:
    build: .
    command: celery -A workers.celery_app.celery worker --loglevel=info
    volumes:
      - .:/app
    env_file:
      - .env
    depends_on:
      api:
        condition: service_started

volumes:
  postgres_data:
```

### 7.2. API Gateway (`app/main.py`)
```python
# app/main.py
from fastapi import FastAPI, Request, HTTPException, Header
from celery.result import AsyncResult
import os

from workers.media_tasks import process_media_request
from app.schemas import WebhookAck

app = FastAPI(title="AstroMedia Agent")

@app.post("/telegram-webhook", response_model=WebhookAck)
async def handle_telegram_webhook(request: Request, x_telegram_bot_api_secret_token: str = Header(None)):
    # Sécurité: Valider le secret token
    if os.getenv("TELEGRAM_WEBHOOK_SECRET") and x_telegram_bot_api_secret_token != os.getenv("TELEGRAM_WEBHOOK_SECRET"):
        raise HTTPException(status_code=403, detail="Invalid secret token")

    payload = await request.json()
    
    # Lancer la tâche en arrière-plan
    # On minimise le payload pour ne pas surcharger Redis
    chat_id = payload.get("message", {}).get("chat", {}).get("id")
    message_text = payload.get("message", {}).get("text")
    
    if chat_id and message_text:
        process_media_request.delay(chat_id, message_text)

    # Répondre immédiatement pour ne pas bloquer Telegram
    return {"ok": True}

@app.get("/healthz", status_code=200)
def health_check():
    return {"status": "ok"}
```

### 7.3. Tâche Asynchrone (`workers/media_tasks.py`)
```python
# workers/media_tasks.py
from .celery_app import celery
from app.agents.media_agent import MediaAgent # À créer
from app.services.logger_service import LoggerService # À créer
import logging

@celery.task(
    name="process_media_request",
    bind=True,
    autoretry_for=(Exception,), # Configurez des exceptions plus spécifiques
    retry_kwargs={'max_retries': 3},
    retry_backoff=True
)
def process_media_request(self, chat_id: int, user_input: str):
    logger = LoggerService(task_id=self.request.id)
    try:
        logger.log(action="task_start", status="success", input_summary=user_input)
        
        # Le cœur de la logique
        agent = MediaAgent(logger=logger)
        result = agent.run(user_input)
        
        # Envoyer le résultat à l'utilisateur via un service Telegram
        # telegram_service.send_message(chat_id, result)

        logger.log(action="task_end", status="success", output_summary=result)
    except Exception as e:
        logging.error(f"Task {self.request.id} failed: {e}")
        logger.log(action="task_end", status="failed", output_summary=str(e))
        # Envoyer un message d'erreur à l'utilisateur
        # telegram_service.send_message(chat_id, "Une erreur est survenue...")
        raise e
```

### 7.4. Modèle de Données (`models/log_entry.py`)
```python
# models/log_entry.py
from sqlalchemy import Column, Integer, String, DateTime, Numeric, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from .database import Base

class LogEntry(Base):
    __tablename__ = "log_entries"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    task_id = Column(String, index=True)
    action = Column(String, index=True)
    status = Column(String, default="success") # "success", "failed", "fallback_used"
    provider_used = Column(String, index=True, nullable=True)
    input_summary = Column(Text, nullable=True)
    output_summary = Column(Text, nullable=True)
    cost_estimate = Column(Numeric(10, 6), nullable=True)
    metadata = Column(JSONB, nullable=True)
```

---

## 8. Prochaines Étapes

1.  **Implémenter les Services** : Coder la logique pour chaque manager (`AIModelManager`, `CreativeManager`, etc.) en suivant les stratégies de fallback définies.
2.  **Créer les Outils LangChain** : Développer les fonctions pour chaque outil (`create_image`, `post_to_social_media`...) et les rendre disponibles à l'agent.
3.  **Construire l'Agent** : Assembler l'agent LangChain avec son LLM (votre `AIModelManager`) et sa boîte à outils.
4.  **Écrire les Tests** : Créer des tests unitaires et d'intégration pour chaque composant, en particulier pour les logiques de fallback et de routage.
5.  **Mettre en place la CI/CD** : Créer un workflow GitHub Actions pour lancer les tests et le linting à chaque push.

---

## 9. Concept de Briefing de Campagne

Pour que les agents IA fonctionnent de manière optimale, ils ont besoin d'un brief stratégique clair et complet. Bien que cela ne soit pas implémenté via un formulaire dans l'interface utilisateur actuelle pour conserver la simplicité, les points de données conceptuels qui alimenteraient la stratégie incluent :

-   **Nom de l'entreprise** : L'entité qui lance la campagne.
-   **Audience Cible** : Une description détaillée du client idéal.
-   **Forces** : Les avantages internes du produit ou de l'entreprise.
-   **Faiblesses** : Les inconvénients internes à prendre en compte.
-   **Facteurs de Différenciation** : Ce qui rend l'offre unique sur le marché.
-   **Concurrents** : Les principaux acteurs concurrents sur le marché.

Ces informations sont fondamentales pour que le CMO IA puisse élaborer un plan pertinent et pour que les agents spécialisés puissent exécuter leurs tâches avec le bon contexte.

---

## 10. Workflow de Collaboration des Agents

AstroMedia ne fonctionne pas comme une IA monolithique, mais comme une équipe coordonnée d'agents spécialisés. Ce flux de travail est conçu pour imiter une agence de marketing digital de haute performance.

1.  **Direction Stratégique (CMO)** : Chaque campagne commence avec l'**Agent Chief Marketing Officer (CMO)**. En se basant sur la mission initiale de l'utilisateur, le CMO élabore la stratégie de haut niveau et le plan d'action.

2.  **Contexte de Campagne Partagé** : C'est le système nerveux central de l'opération. Le plan du CMO, ainsi que toutes les données ultérieures (mots-clés, brouillons, visuels, analyses), sont stockés dans un contexte partagé accessible à tous les agents. Cela garantit une collaboration et une cohérence parfaites.

3.  **Exécution Parallèle (Acquisition & Contenu)** :
    *   **Équipe d'Acquisition** : Des agents comme le **SEO**, le **SEA (Publicité)**, et le **Social Media** commencent leur travail simultanément. Ils recherchent des mots-clés, planifient des campagnes publicitaires et préparent des stratégies sociales, injectant leurs découvertes dans le contexte partagé.
    *   **Équipe de Contenu** : En parallèle, le **Designer IA**, le **Rédacteur de Contenu**, et le **Copywriter** commencent à créer les actifs. Ils extraient les données stratégiques (comme les mots-clés de l'agent SEO) du contexte partagé pour s'assurer que leur travail est parfaitement aligné avec les objectifs de la campagne.

4.  **Optimisation Continue (Boucle de Rétroaction)** : Une fois la campagne lancée, l'**Agent Analytics** et le **Growth Hacker** prennent le relais. Ils surveillent les performances en temps réel et identifient les opportunités d'optimisation. Leurs aperçus créent une boucle de rétroaction continue, permettant à l'équipe d'agents de s'adapter et d'améliorer l'efficacité de la campagne au fil du temps.

---

## 11. Stratégie des Modèles IA

Cette section détaille les modèles d'IA utilisés par les différents agents pour la création de contenu. L'approche est basée sur un routage intelligent pour optimiser la qualité, la vitesse et le coût.

### 📝 Texte & Stratégie

#### Agent CMO (stratégie, benchmark, SWOT)

*   **Modèles premium (qualité haute)** :
    *   **GPT-4 (OpenAI via OpenRouter)** : Idéal pour l'analyse stratégique et les synthèses claires.
    *   **Claude 3.5 Sonnet (Anthropic)** : Très performant pour la rédaction structurée, adapté aux présentations et synthèses.
*   **Alternatives open-source (moins cher)** :
    *   **Mixtral-8x22B (OpenRouter)** : Efficace pour les résumés longs et complexes.
    *   **LLaMA 3 70B (Meta via HuggingFace)** : Puissant pour la génération de texte de haute qualité.

#### Agent Rédaction (posts, articles, légendes SEO)

*   **GPT-4o mini (rapide & économique)** : Parfait pour les posts courts sur les réseaux sociaux et les appels à l'action (CTA).
*   **Claude 3 Haiku** : Excellent pour une rédaction fluide avec un ton conversationnel.
*   **Zephyr-7B (HuggingFace, open-source)** : Une option légère et rapide pour les légendes et les textes courts.

### 🎨 Images

#### Agent Designer (visuels, carrousels, bannières)

L'agent Designer adopte une approche de **divergence créative** en générant systématiquement deux versions d'un même visuel pour la validation client.

*   **Proposition A (Créative & Artistique)** :
    *   **Modèle** : **NanoBanana (gemini-2.5-flash-image)**
    *   **Style** : Approche plus artistique, colorée et conceptuelle. Idéal pour des visuels qui doivent se démarquer.
*   **Proposition B (Réaliste & Photographique)** :
    *   **Modèle** : **Seedream API**
    *   **Style** : Approche plus photoréaliste. Parfait pour des visuels produits ou des mises en scène authentiques.

👉 **Workflow de Validation Client (UI)** :
1.  **Présentation Côte à Côte** : Les deux images générées sont affichées l'une à côté de l'autre dans l'interface de validation.
2.  **Décision Client** : Le client a trois options : "✅ Valider la version A (NanoBanana)", "✅ Valider la version B (Seedream)", ou "🔄 Demander une nouvelle itération".
3.  **Archivage** : La sélection est sauvegardée dans le Dashboard comme "Visuel validé" et devient l'actif officiel pour la campagne.

### 🎬 Vidéo & Narration

#### Agent Vidéo (Reels, TikTok, pubs courtes)

Pour chaque script ou scénario, l'agent Vidéo génère deux propositions parallèles pour offrir un choix stylistique au client.

*   **Proposition A (Narrative & Storytelling)** :
    *   **Modèle** : **WAN 2.2**
    *   **Style** : Génération fluide, narrative, idéale pour le storytelling et les vidéos qui nécessitent une ambiance posée.
*   **Proposition B (Dynamique & Punchy)** :
    *   **Modèle** : **Veo3 (veo-2.0-generate-001)**
    *   **Style** : Rendu dynamique et percutant, avec une cohérence élevée. Parfaitement adapté aux formats courts et engageants pour les réseaux sociaux.

👉 **Workflow de Validation Client (UI)** :
1.  **Lecteur Double** : Les deux vidéos sont présentées via des miniatures cliquables dans un lecteur double pour une comparaison facile.
2.  **Sélection Client** : Le client visionne les deux versions et choisit celle qui correspond le mieux à l'objectif du contenu.
3.  **Archivage pour Diffusion** : La vidéo sélectionnée est archivée, validée et prête à être utilisée dans la phase de distribution.

#### Agent Script + Narration (Voice-over)

*   **Voix Premium :**
    *   **ElevenLabs API** → Voix ultra-réalistes, multi-langues, clonage vocal.
*   **Alternative Open-Source :**
    *   **Bark** → Voix IA de bonne qualité pour des besoins plus simples.