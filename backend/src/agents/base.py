"""
Base Agent Class
================
Foundation for all AstroMedia AI agents with OpenRouter integration.
"""

import os
import httpx
import json
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class BaseAgent:
    """Base class for all AI agents with OpenRouter integration."""

    def __init__(
        self,
        name: str,
        model: str = "anthropic/claude-3.5-sonnet",
        temperature: float = 0.7,
        max_tokens: int = 4000
    ):
        self.name = name
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.api_key = os.getenv("OPENROUTER_API_KEY")

        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY environment variable not set")

    async def call_llm(
        self,
        system_prompt: str,
        user_message: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Call OpenRouter API with the specified prompts.

        Args:
            system_prompt: System instructions for the LLM
            user_message: User message/query
            temperature: Override default temperature
            max_tokens: Override default max tokens

        Returns:
            Dict with 'content', 'model', 'cost', 'tokens' keys
        """
        url = "https://openrouter.ai/api/v1/chat/completions"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": os.getenv("APP_URL", "http://localhost:8000"),
            "X-Title": "AstroMedia",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            "temperature": temperature or self.temperature,
            "max_tokens": max_tokens or self.max_tokens
        }

        start_time = datetime.now()

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()

            end_time = datetime.now()
            latency_ms = int((end_time - start_time).total_seconds() * 1000)

            # Extract response
            content = data["choices"][0]["message"]["content"]

            # Calculate cost (OpenRouter provides usage info)
            usage = data.get("usage", {})
            prompt_tokens = usage.get("prompt_tokens", 0)
            completion_tokens = usage.get("completion_tokens", 0)
            total_tokens = usage.get("total_tokens", 0)

            # Rough cost estimation (varies by model)
            # Claude 3.5 Sonnet: ~$3/1M input, ~$15/1M output
            estimated_cost = (prompt_tokens * 0.000003) + (completion_tokens * 0.000015)

            return {
                "content": content,
                "model": self.model,
                "cost": round(estimated_cost, 6),
                "tokens": total_tokens,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "latency_ms": latency_ms,
                "timestamp": datetime.now().isoformat()
            }

        except httpx.HTTPError as e:
            logger.error(f"[{self.name}] HTTP error calling LLM: {e}")
            raise
        except Exception as e:
            logger.error(f"[{self.name}] Error calling LLM: {e}")
            raise

    def parse_json_response(self, content: str) -> Dict[str, Any]:
        """
        Parse JSON from LLM response, handling markdown code blocks.

        Args:
            content: Raw LLM response content

        Returns:
            Parsed JSON dict
        """
        # Remove markdown code blocks if present
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            logger.error(f"[{self.name}] Failed to parse JSON: {e}")
            logger.error(f"Content: {content[:500]}")
            raise ValueError(f"Invalid JSON response from {self.name}")

    async def run(self, **kwargs) -> Dict[str, Any]:
        """
        Run the agent. Must be implemented by subclasses.

        Returns:
            Agent execution result
        """
        raise NotImplementedError("Subclasses must implement run() method")
