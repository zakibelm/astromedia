"""
AstroMedia AI Agents Module
============================

Five specialized AI agents for marketing automation:
1. CommunityManagerAgent - Social media engagement
2. SEO_AIO_Agent - Search optimization + AI Overviews
3. ComplianceAgent - Legal & regulatory compliance
4. TrendScoutAgent - Viral trend detection
5. CrisisManagerAgent - Reputation crisis management
"""

from .community_manager import CommunityManagerAgent
from .seo_aio import SEO_AIO_Agent
from .compliance import ComplianceAgent
from .trend_scout import TrendScoutAgent
from .crisis_manager import CrisisManagerAgent

__all__ = [
    'CommunityManagerAgent',
    'SEO_AIO_Agent',
    'ComplianceAgent',
    'TrendScoutAgent',
    'CrisisManagerAgent',
]

__version__ = '1.0.0'
