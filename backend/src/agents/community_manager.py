"""
Community Manager Agent
=======================
Analyzes social media comments and generates contextual responses.
"""

from typing import Dict, Any, List
from .base import BaseAgent
import logging

logger = logging.getLogger(__name__)


class CommunityManagerAgent(BaseAgent):
    """
    AI agent for managing social media community interactions.

    Features:
    - Sentiment analysis
    - Context-aware response generation
    - Brand voice consistency
    - Multi-language support (FR/EN)
    """

    def __init__(self, model: str = "anthropic/claude-3.5-sonnet"):
        super().__init__(
            name="CommunityManager",
            model=model,
            temperature=0.8,  # More creative for social media
            max_tokens=500
        )

    def _build_system_prompt(self, brand_context: Dict[str, Any]) -> str:
        """Build system prompt with brand context."""

        brand_name = brand_context.get("brand_name", "la marque")
        industry = brand_context.get("industry", "")
        tone = brand_context.get("tone", "friendly, professional")
        language = brand_context.get("language", "fr")

        return f"""Tu es le Community Manager AI pour {brand_name}, une entreprise {industry}.

TON RÔLE:
- Analyser les commentaires sur les réseaux sociaux
- Générer des réponses contextuelles et engageantes
- Maintenir une voix de marque cohérente
- Détecter et signaler les contenus problématiques

TON DE COMMUNICATION:
{tone}

LANGUE PRINCIPALE: {language.upper()}

DIRECTIVES:
1. Réponds TOUJOURS dans la même langue que le commentaire
2. Sois empathique et à l'écoute
3. Pour les commentaires négatifs: reconnais le problème, excuse-toi si nécessaire, propose une solution
4. Pour les questions: fournis des réponses précises et utiles
5. Pour les compliments: remercie chaleureusement
6. Utilise des émojis avec modération (max 2 par réponse)
7. Garde les réponses courtes (50-150 mots)
8. Ne fais jamais de promesses que tu ne peux pas tenir
9. Signale immédiatement: spam, contenu haineux, trolls

RÉPONSE FORMAT (JSON):
{{
  "sentiment": "positive|neutral|negative|spam|toxic",
  "category": "question|complaint|compliment|spam|other",
  "urgency": "low|medium|high|critical",
  "suggested_response": "Ta réponse ici",
  "requires_human": true|false,
  "tags": ["tag1", "tag2"],
  "internal_notes": "Notes pour l'équipe"
}}
"""

    async def run(
        self,
        comment: str,
        platform: str,
        brand_context: Dict[str, Any],
        conversation_history: List[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Analyze a comment and generate response.

        Args:
            comment: The social media comment to analyze
            platform: Platform name (instagram, facebook, linkedin, tiktok, twitter)
            brand_context: Brand information (name, industry, tone, etc.)
            conversation_history: Previous messages in thread (optional)

        Returns:
            Analysis and suggested response
        """
        logger.info(f"[CommunityManager] Analyzing comment on {platform}")

        # Build user message
        user_message = f"""PLATEFORME: {platform.upper()}

COMMENTAIRE À ANALYSER:
"{comment}"
"""

        if conversation_history:
            user_message += "\n\nHISTORIQUE CONVERSATION:\n"
            for msg in conversation_history[-3:]:  # Last 3 messages only
                role = msg.get("role", "user")
                text = msg.get("text", "")
                user_message += f"[{role}]: {text}\n"

        user_message += "\n\nGénère l'analyse complète au format JSON."

        # Call LLM
        system_prompt = self._build_system_prompt(brand_context)
        result = await self.call_llm(system_prompt, user_message)

        # Parse JSON response
        try:
            analysis = self.parse_json_response(result["content"])

            # Add metadata
            analysis["platform"] = platform
            analysis["model_used"] = result["model"]
            analysis["cost"] = result["cost"]
            analysis["latency_ms"] = result["latency_ms"]

            return analysis

        except Exception as e:
            logger.error(f"[CommunityManager] Error parsing response: {e}")
            # Fallback response
            return {
                "sentiment": "neutral",
                "category": "other",
                "urgency": "low",
                "suggested_response": "Merci pour votre message! Notre équipe reviendra vers vous rapidement.",
                "requires_human": True,
                "tags": ["parse_error"],
                "internal_notes": f"Error parsing AI response: {str(e)}",
                "error": True
            }


# Example usage
async def test_community_manager():
    """Test function for CommunityManager agent."""
    agent = CommunityManagerAgent()

    brand_context = {
        "brand_name": "Resto Québec",
        "industry": "restaurant québécois",
        "tone": "Chaleureux, amical, un peu humoristique",
        "language": "fr"
    }

    comment = "Wow, c'était délicieux! Meilleur poutine de ma vie 🍟❤️"

    result = await agent.run(
        comment=comment,
        platform="instagram",
        brand_context=brand_context
    )

    print("Result:", result)
    return result
