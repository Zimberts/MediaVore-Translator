# Writing Good Agents — Guidance & Applied Checklist

This file summarizes best practices for authoring small, useful agents (drawn from
the GitHub Copilot "How to write a great agents.md" guidance) and how those practices
apply to this repository's agent artifacts in `agents/`.

Principles
- Small, focused responsibilities: each agent should solve one problem well. The
  MediaVore agent focuses on CSV -> TMDB JSON conversion and TMDB matching.
- Provide clear, deterministic examples: always include example inputs and expected
  outputs so behavior is testable and reviewable.
- Human-in-the-loop for ambiguity: prefer asking the user when multiple candidates exist.
- Version and test agents: maintain a versioned manifest and add simple unit tests or
  sample-conversion inputs to catch regressions.

Checklist (applied to this repo)
- [x] Agent manifest: `agents/agent.yaml` documents capabilities and constraints.
- [x] Persona file: `agents/persona.md` defines tone, behavior, and constraints.
- [x] Tools reference: `agents/tools.md` lists endpoints and local commands.
- [x] Examples & acceptance criteria: add small example conversions to the `tests/`
  directory (recommended) or include them in PRs that change agent behavior.

Recommended workflow for contributors
1. Run the dev server and use the UI to load `films.csv` and inspect mappings.
2. For ambiguous titles, follow the agent's numbered suggestions and confirm the correct
   TMDB id before exporting.
3. When updating agent behavior, add a small example CSV and expected `output.json` to
   a `tests/agents/` folder so CI can validate future changes.

Sample prompts for the agent (developer-facing)
- "Auto-search unique titles, auto-apply obvious matches, and list ambiguous ones."
- "Convert `films.csv` to JSON using confirmed mappings and return a downloadable file."

Security & Privacy
- Never commit secret keys. Use environment variables (`TMDB_API_TOKEN`) for API keys.
- Limit the agent's scope — it should not attempt to access secrets or modify unrelated files.

Next improvements
- Add a `tests/agents/` folder with a few small CSVs and expected outputs for CI.
- Add a tiny evaluation script that measures match ambiguity and reports confidence.
