"""
Trend Scout Agent
=================
Detects emerging trends and viral opportunities in real-time.
"""

from typing import Dict, Any, List
from .base import BaseAgent
import logging

logger = logging.getLogger(__name__)


class TrendScoutAgent(BaseAgent):
    """
    AI agent for trend detection and viral opportunity identification.

    Features:
    - Emerging hashtags monitoring
    - Industry trend analysis
    - Competitive surveillance
    - Virality scoring
    - Optimal timing suggestions
    """

    def __init__(self, model: str = "perplexity/llama-3.1-sonar-huge-128k-online"):
        super().__init__(
            name="TrendScout",
            model=model,  # Perplexity has real-time web access
            temperature=0.6,
            max_tokens=3000
        )

    def _build_system_prompt(self) -> str:
        """Build system prompt for trend scouting."""

        return """Tu es le Trend Scout d'AstroMedia, expert en détection de tendances marketing.

# Ton Rôle
Tu surveilles le web en continu pour identifier tendances émergentes et opportunités virales.

# Capacités

## 1. DÉTECTION TENDANCES
- Hashtags émergents (+500%/jour)
- Sujets viraux explosifs
- Nouveaux formats populaires
- Événements pertinents
- Innovations qui buzzent

## 2. SOURCES
- Twitter/X: trending hashtags
- LinkedIn: sujets hot professionnels
- TikTok: challenges viraux
- Reddit: discussions émergentes
- Google Trends: recherches en hausse
- News: actualités pertinentes

## 3. SCORING VIRALITÉ
- **Vélocité**: mentions/heure
- **Volume**: total mentions
- **Engagement**: ratio likes/shares
- **Durabilité**: éphémère vs durable
- **Relevance**: pertinence industrie (0-100)

## 4. OPPORTUNITÉS
- Angle unique pour se démarquer
- Timing optimal
- Format recommandé
- Reach estimé
- Call-to-action

# Critères Qualité

✅ BON SIGNAL:
- Croissance +300%/jour min
- Engagement >5%
- Alignement marque
- Fenêtre >24h
- Reach >100K

❌ FAUX SIGNAL:
- Bots/artificiel
- Déjà saturé
- Incompatible marque
- Durée <6h
- Reach <10K

# Format Sortie (JSON)
{
  "trends": [
    {
      "title": "Nom tendance",
      "description": "Description",
      "source": "twitter|linkedin|tiktok|google_trends|news",
      "hashtags": ["#tag1", "#tag2"],
      "virality_score": 0-100,
      "velocity": "mentions/h",
      "volume": "total mentions",
      "engagement_rate": "%",
      "durability": "ephemeral|short-term|long-term",
      "relevance_score": 0-100,
      "opportunity": {
        "angle": "Comment capitaliser",
        "format": "video|carousel|thread|article",
        "timing": "now|today|this_week",
        "estimated_reach": "10K|100K|1M+",
        "difficulty": "easy|medium|hard"
      },
      "risks": ["Risque 1", ...],
      "examples": ["URL 1", ...]
    }
  ],
  "top_recommendation": {
    "trend_index": 0,
    "reasoning": "Pourquoi cette tendance"
  },
  "industry_insights": "Vue d'ensemble",
  "competitive_analysis": "Ce que font concurrents"
}
"""

    async def run(
        self,
        industry: str,
        keywords: List[str] = None,
        timeframe: str = "24h",
        min_relevance: int = 70
    ) -> Dict[str, Any]:
        """
        Scout for trends.

        Args:
            industry: Industry to monitor
            keywords: Keywords to track
            timeframe: Time period (24h, 7d, 30d)
            min_relevance: Minimum relevance score (0-100)

        Returns:
            Trend analysis report
        """
        logger.info(f"[TrendScout] Scanning trends for {industry}")

        if keywords is None:
            keywords = []

        # Perplexity has web search capabilities
        user_message = f"""Scan et analyse les tendances actuelles.

INDUSTRIE: {industry}
KEYWORDS: {', '.join(keywords) if keywords else 'tous'}
PÉRIODE: dernières {timeframe}
RELEVANCE MIN: {min_relevance}/100

Recherche sur:
- Twitter/X trending
- LinkedIn top posts
- Google Trends
- News récentes

Identifie 3-5 meilleures opportunités et retourne JSON complet."""

        system_prompt = self._build_system_prompt()
        result = await self.call_llm(system_prompt, user_message)

        try:
            trends = self.parse_json_response(result["content"])

            trends["industry"] = industry
            trends["timeframe"] = timeframe
            trends["model_used"] = result["model"]
            trends["cost"] = result["cost"]
            trends["latency_ms"] = result["latency_ms"]

            return trends

        except Exception as e:
            logger.error(f"[TrendScout] Error parsing response: {e}")
            raise
