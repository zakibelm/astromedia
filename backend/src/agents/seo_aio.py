"""
SEO/AIO Agent
=============
Optimizes content for both traditional search engines (SEO)
and AI-powered search (AIO - ChatGPT, Claude, Perplexity).
"""

from typing import Dict, Any, List
from .base import BaseAgent
import logging

logger = logging.getLogger(__name__)


class SEO_AIO_Agent(BaseAgent):
    """
    Dual optimization agent for Google SEO + AI Overviews.

    Features:
    - Classic SEO (keywords, meta, structure)
    - AIO optimization (citation-readiness, factual accuracy)
    - E-E-A-T signals
    - Structured data recommendations
    """

    def __init__(self, model: str = "anthropic/claude-3.5-sonnet"):
        super().__init__(
            name="SEO_AIO",
            model=model,
            temperature=0.3,  # More factual
            max_tokens=3000
        )

    def _build_system_prompt(self) -> str:
        """Build system prompt for SEO/AIO optimization."""

        return """Tu es un expert en SEO moderne ET en AI Overview Optimization (AIO).

TON RÔLE:
- Optimiser le contenu pour les moteurs de recherche traditionnels (Google SEO)
- Optimiser pour les résultats d'IA (ChatGPT, Claude, Perplexity, Google AI Overviews)
- Maximiser la citation-readiness pour les LLMs
- Garantir factual accuracy et authority signals

DOUBLE OPTIMISATION:

📊 **SEO CLASSIQUE:**
1. Keywords primaires et secondaires
2. Meta title (50-60 chars)
3. Meta description (150-160 chars)
4. Headers structure (H1, H2, H3)
5. URL slug
6. Alt text images
7. Internal linking suggestions

🤖 **AIO MODERNE:**
1. Citation-ready facts (sources, dates, chiffres)
2. Structured answers (Q&A format)
3. Entity optimization (personnes, lieux, organisations)
4. Factual accuracy score
5. Authority signals (E-E-A-T)
6. Conversational query optimization
7. Schema.org structured data

DIRECTIVES:
- Priorise TOUJOURS la factual accuracy
- Chaque fait doit être citable
- Utilise des chiffres et dates précis
- Optimise pour featured snippets
- Pense voice search + conversational queries
- Applique E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)

RÉPONSE FORMAT (JSON):
{
  "seo": {
    "primary_keywords": ["keyword1", "keyword2"],
    "secondary_keywords": ["keyword3", "keyword4"],
    "meta_title": "Title optimisé (50-60 chars)",
    "meta_description": "Description optimisée (150-160 chars)",
    "url_slug": "optimized-url-slug",
    "h1": "H1 principal",
    "h2_structure": ["H2 #1", "H2 #2", "H2 #3"],
    "internal_links": [
      {"anchor": "texte", "target": "/url"}
    ],
    "image_alt_texts": ["Alt text 1", "Alt text 2"]
  },
  "aio": {
    "citation_ready_facts": [
      {
        "fact": "Fait précis avec source",
        "source": "Source URL ou nom",
        "date": "2025-01-01"
      }
    ],
    "qa_pairs": [
      {
        "question": "Question conversationnelle",
        "answer": "Réponse concise et factuelle"
      }
    ],
    "entities": {
      "people": ["Personne 1"],
      "organizations": ["Organisation 1"],
      "locations": ["Lieu 1"]
    },
    "factual_accuracy_score": 95,
    "authority_signals": {
      "experience": "Démonstration expérience",
      "expertise": "Démonstration expertise",
      "authoritativeness": "Signaux autorité",
      "trustworthiness": "Signaux confiance"
    },
    "schema_suggestions": [
      {
        "type": "Article",
        "properties": {
          "headline": "...",
          "author": "...",
          "datePublished": "..."
        }
      }
    ]
  },
  "voice_search_optimization": [
    "Question voice search 1?",
    "Question voice search 2?"
  ],
  "featured_snippet_target": "Texte optimisé pour featured snippet",
  "overall_score": 88,
  "recommendations": [
    "Recommendation 1",
    "Recommendation 2"
  ]
}
"""

    async def run(
        self,
        content: str,
        target_keywords: List[str] = None,
        language: str = "fr",
        content_type: str = "blog_post"
    ) -> Dict[str, Any]:
        """
        Optimize content for SEO and AIO.

        Args:
            content: The content to optimize
            target_keywords: Optional target keywords
            language: Content language
            content_type: Type (blog_post, product_page, landing_page, etc.)

        Returns:
            Complete SEO/AIO optimization report
        """
        logger.info(f"[SEO_AIO] Optimizing {content_type} in {language}")

        # Build user message
        user_message = f"""LANGUE: {language.upper()}
TYPE DE CONTENU: {content_type}
"""

        if target_keywords:
            user_message += f"\nMOTS-CLÉS CIBLES: {', '.join(target_keywords)}\n"

        user_message += f"""
CONTENU À OPTIMISER:
---
{content}
---

Génère l'analyse SEO/AIO complète au format JSON.
Assure-toi que TOUS les faits sont citables et vérifiables.
"""

        # Call LLM
        system_prompt = self._build_system_prompt()
        result = await self.call_llm(system_prompt, user_message)

        # Parse JSON response
        try:
            optimization = self.parse_json_response(result["content"])

            # Add metadata
            optimization["language"] = language
            optimization["content_type"] = content_type
            optimization["model_used"] = result["model"]
            optimization["cost"] = result["cost"]
            optimization["latency_ms"] = result["latency_ms"]

            return optimization

        except Exception as e:
            logger.error(f"[SEO_AIO] Error parsing response: {e}")
            raise


# Example usage
async def test_seo_aio():
    """Test function for SEO_AIO agent."""
    agent = SEO_AIO_Agent()

    content = """
    Le marketing digital a évolué en 2024. Les entreprises québécoises
    investissent maintenant 40% de leur budget dans le marketing automation.
    Notre solution AstroMedia permet d'économiser 15 heures par semaine.
    """

    result = await agent.run(
        content=content,
        target_keywords=["marketing automation", "québec", "PME"],
        language="fr",
        content_type="blog_post"
    )

    print("SEO/AIO Result:", result)
    return result
