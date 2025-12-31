"""
Compliance Agent
================
Validates legal compliance (CASL, RGPD, copyright) before publication.
"""

from typing import Dict, Any, List
from .base import BaseAgent
import logging

logger = logging.getLogger(__name__)


class ComplianceAgent(BaseAgent):
    """
    AI agent for legal compliance validation.

    Features:
    - CASL verification (Canada)
    - RGPD compliance (Europe)
    - Copyright violation detection
    - Legal mentions validation
    - Risk assessment
    """

    def __init__(self, model: str = "openai/gpt-4o-mini"):
        super().__init__(
            name="Compliance",
            model=model,  # GPT-4o-mini is cheaper and good for structured tasks
            temperature=0.3,  # Low temperature for factual/legal work
            max_tokens=2000
        )

    def _build_system_prompt(self) -> str:
        """Build system prompt for compliance checking."""

        return """Tu es l'Agent Compliance d'AstroMedia, expert en conformité légale marketing.

# Ton Rôle
Tu audites tous les contenus marketing pour garantir conformité légale AVANT publication.

# Lois et Règlements

## 1. CASL (Loi canadienne anti-pourriel)
Obligations:
- ✅ Consentement explicite avant envoi emails commerciaux
- ✅ Identification claire expéditeur
- ✅ Mécanisme opt-out visible
- ✅ Adresse postale dans footer
Amendes: jusqu'à 10M$ CAD

## 2. RGPD (Règlement européen)
Obligations:
- ✅ Base légale traitement données
- ✅ Transparence utilisation données
- ✅ Droits accès/rectification/suppression
- ✅ Privacy by design
Amendes: jusqu'à 4% revenus annuels

## 3. Droits d'auteur
Vérifications:
- Images: licence commerciale
- Textes: pas de plagiat
- Marques: usage autorisé
- Citations: attribution correcte

## 4. Publicité trompeuse
Interdictions:
- Fausses promesses
- Témoignages fabriqués
- Prix trompeurs
- Omissions matérielles

# Classification Sévérité
🔴 CRITIQUE: Blocage publication (risque légal élevé)
🟠 MAJEUR: Correction requise
🟡 MINEUR: Amélioration recommandée
🟢 CONFORME: Aucun problème

# Format de Sortie (JSON)
{
  "compliance_status": "compliant|minor_issues|major_issues|critical",
  "overall_risk": "low|medium|high|critical",
  "checks_performed": ["CASL", "RGPD", "Copyright", ...],
  "violations": [
    {
      "severity": "critical|major|minor",
      "law": "CASL|RGPD|Copyright|FTC",
      "issue": "Description",
      "article": "Article de loi",
      "recommendation": "Correction proposée",
      "risk": "Conséquence si non corrigé"
    }
  ],
  "required_mentions": ["Mention 1", ...],
  "safe_to_publish": true|false,
  "corrected_version": "Version corrigée si applicable"
}
"""

    async def run(
        self,
        content: str,
        content_type: str,
        target_regions: List[str] = None,
        contains_images: bool = False,
        contains_claims: bool = False
    ) -> Dict[str, Any]:
        """
        Perform compliance audit.

        Args:
            content: Content to audit
            content_type: Type (email, post, landing_page, ad)
            target_regions: Target regions (CA, EU, US, etc.)
            contains_images: Whether content has images
            contains_claims: Whether content has health/guarantee claims

        Returns:
            Compliance audit report
        """
        logger.info(f"[Compliance] Auditing {content_type} for {target_regions}")

        if not target_regions:
            target_regions = ["CA"]

        user_message = f"""Audit de conformité légale.

TYPE: {content_type}
RÉGIONS CIBLÉES: {', '.join(target_regions)}
CONTIENT IMAGES: {contains_images}
CONTIENT CLAIMS: {contains_claims}

CONTENU:
{content}

Effectue un audit complet et retourne le JSON de compliance."""

        system_prompt = self._build_system_prompt()
        result = await self.call_llm(system_prompt, user_message)

        try:
            audit = self.parse_json_response(result["content"])

            audit["content_type"] = content_type
            audit["target_regions"] = target_regions
            audit["model_used"] = result["model"]
            audit["cost"] = result["cost"]
            audit["latency_ms"] = result["latency_ms"]

            return audit

        except Exception as e:
            logger.error(f"[Compliance] Error parsing response: {e}")
            raise
