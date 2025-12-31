"""
Crisis Manager Agent
====================
Detects and manages reputation crises 24/7.
"""

from typing import Dict, Any, List
from .base import BaseAgent
import logging

logger = logging.getLogger(__name__)


class CrisisManagerAgent(BaseAgent):
    """
    AI agent for crisis detection and reputation management.

    Features:
    - Negative mentions monitoring
    - Real-time sentiment analysis
    - Crisis severity scoring
    - Response strategies
    - Escalation alerts
    """

    def __init__(self, model: str = "anthropic/claude-3.5-sonnet"):
        super().__init__(
            name="CrisisManager",
            model=model,
            temperature=0.4,  # Balanced for crisis assessment
            max_tokens=2500
        )

    def _build_system_prompt(self) -> str:
        """Build system prompt for crisis management."""

        return """Tu es le Crisis Manager d'AstroMedia, expert en gestion de crise de réputation.

# Ton Rôle
Tu surveilles la réputation et détectes/gères les crises AVANT qu'elles explosent.

# Définition Crise

## 🟢 NORMAL (0-30)
- Mentions négatives <5/jour
- Sentiment positif/neutre
- Pas de viralité négative
**Action**: Monitoring routine

## 🟡 WATCH (31-50)
- Mentions négatives 5-20/jour
- Sentiment négatif croissant
- Quelques commentaires viraux
**Action**: Surveillance rapprochée

## 🟠 ALERTE (51-75)
- Spike négatif 20-100/jour
- Hashtag négatif émergent
- Couverture médias possible
**Action**: Protocole crise activé

## 🔴 CRISE (76-100)
- Explosion >100/jour
- Tendance négative
- Médias actifs
- Dommages durables
**Action**: Intervention CEO

# Facteurs Aggravants
- x1.5: Influenceur impliqué
- x1.3: Vidéo/preuve visuelle
- x1.2: Médias mainstream
- x2.0: Sécurité/santé publique
- x1.5: Violations éthiques/légales

# Process Gestion

## PHASE 1: DÉTECTION (0-1h)
1. Analyse contenu négatif
2. Classification type crise
3. Scoring sévérité
4. Identification amplificateurs
5. Alerte si score >50

## PHASE 2: CONTAINMENT (1-4h)
1. Pause posts joyeux
2. Monitoring 15min
3. Statement initial
4. Réponses individuelles
5. Brief équipe

## PHASE 3: RESOLUTION (4-48h)
1. Root cause analysis
2. Mesures correctives
3. Communication transparente
4. Compensation si nécessaire
5. Media outreach

## PHASE 4: RECOVERY (48h-30j)
1. Monitoring post-crise
2. Content positif
3. Re-engagement
4. Lessons learned
5. Reputation repair

# Stratégies Réponse

✅ À FAIRE:
- Reconnaître rapidement
- Empathie et accountability
- Faits vérifiés uniquement
- Transparence
- Solutions concrètes
- Updates réguliers

❌ NE PAS:
- Ignorer/supprimer
- Être défensif
- Blâmer clients
- Info non vérifiée
- Fausses promesses
- Disparaître

# Format Sortie (JSON)
{
  "crisis_detected": true|false,
  "crisis_score": 0-100,
  "severity": "normal|watch|alert|crisis",
  "crisis_type": "product|service|employee|security|advertising|other",
  "sentiment_analysis": {
    "positive": 0-100,
    "neutral": 0-100,
    "negative": 0-100,
    "trend": "improving|stable|worsening"
  },
  "key_issues": ["Issue 1", ...],
  "amplifiers": [
    {
      "type": "influencer|media|hashtag",
      "name": "Nom",
      "reach": "Portée",
      "sentiment": "negative"
    }
  ],
  "recommended_actions": [
    {
      "priority": "immediate|high|medium",
      "action": "Description",
      "owner": "team|ceo|legal|pr",
      "deadline": "Timeframe"
    }
  ],
  "statement_draft": "Statement si crise",
  "escalation_required": true|false,
  "estimated_impact": {
    "reputation_damage": "low|medium|high|severe",
    "financial_risk": "low|medium|high",
    "recovery_time": "days|weeks|months"
  },
  "monitoring_plan": {
    "frequency": "15min|1h|4h|daily",
    "platforms": ["twitter", ...],
    "keywords": ["keyword1", ...]
  }
}
"""

    async def run(
        self,
        brand_name: str,
        mentions: List[Dict[str, str]],
        monitoring_period: str = "24h",
        historical_sentiment: Dict[str, float] = None
    ) -> Dict[str, Any]:
        """
        Detect and analyze potential crisis.

        Args:
            brand_name: Brand name to monitor
            mentions: Recent mentions (platform, text, metadata)
            monitoring_period: Monitoring period (1h, 4h, 24h)
            historical_sentiment: Baseline normal sentiment

        Returns:
            Crisis analysis report
        """
        logger.info(f"[CrisisManager] Analyzing {len(mentions)} mentions for {brand_name}")

        if historical_sentiment is None:
            historical_sentiment = {"negative": 10}

        # Compile mentions for analysis
        mentions_text = "\n".join([
            f"- [{m.get('platform', 'unknown')}] {m.get('text', '')}"
            for m in mentions
        ])

        user_message = f"""Analyse mentions et détecte crise potentielle.

MARQUE: {brand_name}
PÉRIODE: dernières {monitoring_period}
SENTIMENT NORMAL: {historical_sentiment.get('negative', 10)}% négatif

MENTIONS ({len(mentions)} total):
{mentions_text if mentions_text else "Aucune mention"}

Effectue analyse complète et retourne JSON crisis management."""

        system_prompt = self._build_system_prompt()
        result = await self.call_llm(system_prompt, user_message)

        try:
            crisis = self.parse_json_response(result["content"])

            crisis["brand_name"] = brand_name
            crisis["monitoring_period"] = monitoring_period
            crisis["mentions_analyzed"] = len(mentions)
            crisis["model_used"] = result["model"]
            crisis["cost"] = result["cost"]
            crisis["latency_ms"] = result["latency_ms"]

            return crisis

        except Exception as e:
            logger.error(f"[CrisisManager] Error parsing response: {e}")
            raise
