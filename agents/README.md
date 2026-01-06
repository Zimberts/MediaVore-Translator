# Agents for MediaVore Translator

This directory contains agent metadata and guidance compatible with the Android Gemini
agent-files convention and the GitHub "How to write a great agents.md" recommendations.

Purpose
- Help contributors run reproducible CSV -> JSON conversions and improve TMDB matching.

Files
- `agent.yaml` — high-level manifest describing agent capabilities and constraints.
- `persona.md` — persona, tone, and behavior rules for the agent.
- `tools.md` — list of local endpoints, CLI commands, and recommended helper functions.

How to use
1. Read `persona.md` to understand the agent's expected behavior.
2. Use `tools.md` for concrete endpoint and CLI examples to run conversions locally.
3. If integrating with a platform (Gemini or other), map the manifest fields in `agent.yaml`
   into the platform's agent registration format.

Feedback
- Please open a PR if you want to change behavior, add example prompts, or provide
  evaluation tests for the agent.
