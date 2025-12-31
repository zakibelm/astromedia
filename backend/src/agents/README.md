# 🤖 AstroMedia AI Agents

**5 specialized AI agents for marketing automation (Phase 1 & 2)**

---

## 📦 Quick Overview

| Agent | Purpose | Model | Cost/Call |
|-------|---------|-------|-----------|
| **Community Manager** | Social media engagement & moderation | Claude Sonnet 4 | ~$0.003 |
| **SEO/AIO** | Google SEO + AI Overview optimization | Claude Sonnet 4 | ~$0.003 |
| **Compliance** | Legal compliance (CASL, RGPD, Copyright) | GPT-4o-mini | ~$0.0001 |
| **Trend Scout** | Viral trend detection | Perplexity Sonar | ~$0.005 |
| **Crisis Manager** | Reputation crisis management | Claude Sonnet 4 | ~$0.003 |

**Total workflow cost:** ~$0.02 USD

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements-agents.txt
```

### 2. Environment Setup

Add to your `.env`:

```bash
# OpenRouter API (required)
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx

# Optional: Neon DB for Python agents storage
NEON_DATABASE_URL=postgresql://...
```

### 3. Usage Example

```python
from agents import CommunityManagerAgent

# Initialize agent
agent = CommunityManagerAgent()

# Analyze a comment
result = await agent.run(
    comment="Great post! Do you offer consultations?",
    platform="linkedin",
    brand_context={
        "brand_name": "AstroMedia",
        "tone": "professional, friendly"
    }
)

print(result["suggested_response"])
# Output: "Thank you for your comment! Yes, we offer personalized consultations..."
```

---

## 📁 File Structure

```
backend/src/agents/
├── __init__.py          # Agents exports
├── base.py              # BaseAgent class
├── community_manager.py # Community Manager
├── seo_aio.py          # SEO/AIO Agent
├── compliance.py       # Compliance Agent
├── trend_scout.py      # Trend Scout
├── crisis_manager.py   # Crisis Manager
└── README.md           # This file
```

---

## 🎯 Agent Details

### 1️⃣ Community Manager

**Purpose:** Manage social media interactions
**Capabilities:**
- Sentiment analysis
- Context-aware responses
- Brand voice consistency
- Toxicity detection
- Escalation to humans when needed

**Example:**

```python
from agents import CommunityManagerAgent

agent = CommunityManagerAgent()

result = await agent.run(
    comment="Your service is terrible!",
    platform="twitter",
    brand_context={"tone": "empathetic, solution-oriented"}
)

# Returns:
# {
#   "sentiment": "negative",
#   "suggested_response": "We're sorry to hear...",
#   "requires_human": True,
#   "urgency": "high"
# }
```

---

### 2️⃣ SEO/AIO Agent

**Purpose:** Dual optimization for Google + AI search
**Capabilities:**
- Classic SEO (keywords, meta tags)
- AI Overview optimization (citation-readiness)
- E-E-A-T signals
- Structured data recommendations

**Example:**

```python
from agents import SEO_AIO_Agent

agent = SEO_AIO_Agent()

result = await agent.run(
    content="AI is transforming marketing...",
    target_keywords=["AI marketing", "automation"],
    language="fr"
)

# Returns:
# {
#   "seo": {
#     "meta_title": "AI Marketing: Complete Guide 2025",
#     "primary_keywords": ["AI marketing", ...]
#   },
#   "aio": {
#     "factual_accuracy_score": 95,
#     "citation_excerpts": [...]
#   }
# }
```

---

### 3️⃣ Compliance Agent

**Purpose:** Legal compliance validation
**Capabilities:**
- CASL verification (Canada)
- RGPD compliance (Europe)
- Copyright detection
- Risk assessment

**Example:**

```python
from agents import ComplianceAgent

agent = ComplianceAgent()

result = await agent.run(
    content="Exclusive offer for you!",
    content_type="email",
    target_regions=["CA"]
)

# Returns:
# {
#   "safe_to_publish": False,
#   "violations": [
#     {"severity": "critical", "law": "CASL", "issue": "No unsubscribe link"}
#   ]
# }
```

---

### 4️⃣ Trend Scout

**Purpose:** Detect viral opportunities
**Capabilities:**
- Real-time trend monitoring
- Virality scoring
- Timing recommendations
- Competitive analysis

**Example:**

```python
from agents import TrendScoutAgent

agent = TrendScoutAgent()

result = await agent.run(
    industry="marketing",
    keywords=["AI", "automation"],
    timeframe="24h"
)

# Returns:
# {
#   "trends": [
#     {
#       "title": "ChatGPT search challenges Google",
#       "virality_score": 87,
#       "timing": "now"
#     }
#   ]
# }
```

---

### 5️⃣ Crisis Manager

**Purpose:** Reputation crisis detection
**Capabilities:**
- 24/7 monitoring
- Crisis severity scoring
- Response strategies
- Escalation alerts

**Example:**

```python
from agents import CrisisManagerAgent

agent = CrisisManagerAgent()

result = await agent.run(
    brand_name="AstroMedia",
    mentions=[
        {"platform": "twitter", "text": "Horrible service!"},
        {"platform": "linkedin", "text": "Very disappointed"}
    ]
)

# Returns:
# {
#   "crisis_detected": True,
#   "crisis_score": 65,
#   "severity": "alert",
#   "escalation_required": True
# }
```

---

## 🔗 Integration with TypeScript Backend

The agents are designed to work alongside your existing TypeScript backend.

### Option 1: Microservice Architecture (Recommended)

Run Python agents as a separate FastAPI service:

```bash
# Terminal 1: TypeScript backend
npm run dev

# Terminal 2: Python agents API
python -m uvicorn agents.api:app --port 8001
```

Call from TypeScript:

```typescript
// services/agents.ts
async function runCommunityManager(comment: string) {
  const response = await fetch('http://localhost:8001/agents/community-manager', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment, platform: 'linkedin' })
  });
  return response.json();
}
```

### Option 2: Direct Integration

Use `child_process` to call Python directly:

```typescript
// utils/runAgent.ts
import { exec } from 'child_process';

export async function runAgent(agentType: string, data: any) {
  return new Promise((resolve, reject) => {
    const python = exec(`python -m agents.${agentType}`);

    python.stdin.write(JSON.stringify(data));
    python.stdin.end();

    python.stdout.on('data', (result) => {
      resolve(JSON.parse(result));
    });
  });
}
```

---

## 📊 Database Integration

The agents automatically save results to Prisma database:

### Tables Created

- `agent_community_interactions`
- `agent_seo_optimizations`
- `agent_compliance_audits`
- `agent_trends`
- `agent_crisis_alerts`
- `agent_metrics`

### Run Migration

```bash
npx prisma migrate dev --name add_ai_agents
npx prisma generate
```

---

## 🧪 Testing

```bash
# Run all agent tests
pytest tests/agents/

# Test specific agent
pytest tests/agents/test_community_manager.py

# With coverage
pytest --cov=agents tests/
```

---

## 📈 Monitoring & Analytics

Track agent performance:

```python
from agents import AgentFactory, AgentType

# Get metrics for all agents
for agent_type in AgentType:
    agent = AgentFactory.get_agent(agent_type)
    metrics = agent.metrics

    print(f"{agent_type.value}:")
    print(f"  Total calls: {metrics.total_calls}")
    print(f"  Success rate: {metrics.successful_calls}/{metrics.total_calls}")
    print(f"  Avg response time: {metrics.avg_response_time:.2f}s")
```

---

## 💰 Cost Management

### Estimated Monthly Costs (500 workflows)

| Usage | Workflows/month | Cost |
|-------|-----------------|------|
| Light | 100 | $2 |
| Medium | 500 | $10 |
| Heavy | 2000 | $40 |

### Tips to Reduce Costs

1. **Cache results**: Store common responses
2. **Rate limiting**: Max calls per minute
3. **Use cheaper models**: Replace Claude with GPT-4o-mini
4. **Batch requests**: Group similar queries

---

## 🐛 Troubleshooting

### "Module not found: agents"

Ensure you're in the correct directory:

```bash
cd backend/src
python -c "from agents import CommunityManagerAgent"
```

### "OpenRouter API Key invalid"

Check your `.env` file:

```bash
grep OPENROUTER_API_KEY .env
```

### Agent responses are slow

- Check OpenRouter status
- Reduce `max_tokens` in agent config
- Use faster models (GPT-4o-mini instead of Claude)

---

## 📚 Additional Resources

- **OpenRouter Docs**: https://openrouter.ai/docs
- **Anthropic Claude API**: https://docs.anthropic.com
- **Perplexity API**: https://docs.perplexity.ai

---

**Version:** 1.0.0
**Last Updated:** January 2025
**Maintainer:** Zaki Belmokadem
