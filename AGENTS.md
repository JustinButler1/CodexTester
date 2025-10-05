# Repository Guidelines

## Project Structure & Module Organization
Keep runtime code inside `src/`. Agent implementations live under `src/agents/<agent_name>/` with shared utilities in `src/shared/`. Configuration files belong in `configs/` and standardized prompt templates in `configs/templates/`. Tests mirror the source layout: `tests/unit/` for fast checks, `tests/integration/` for workflow scenarios, and recorded fixtures under `tests/fixtures/`. Store sample dialogues, datasets, and media assets in `assets/` with descriptive, kebab-case filenames. Document any new top-level directory in `docs/index.md` so future contributors can discover it quickly.

## Build, Test, and Development Commands
Create an isolated environment per workstation: `python -m venv .venv && source .venv/bin/activate`. Install dependencies via `pip install -e .[dev]` (declare them in `pyproject.toml`). Run `ruff format src tests` to auto-format and `ruff check src tests` to lint. Execute `pytest --maxfail=1 --disable-warnings` for the unit suite and `pytest -m integration` for slower end-to-end flows. Use `python -m src.agents.<agent_name>.main --config configs/<agent_name>.yaml` to exercise an agent locally; commit example configs alongside new agents.

## Coding Style & Naming Conventions
Follow 4-space indentation and PEP 8-compliant Python style. Modules, functions, and variables use `snake_case`, classes use `PascalCase`, and configuration keys stay in lower-kebab-case. Keep prompts and scenario manifests in Markdown or plain text with lowercase hyphenated filenames. Export public APIs through the package `__init__.py` so tooling can discover them. Keep docstrings concise: explain the agent’s objective, key inputs, external services, and expected outputs.

## Testing Guidelines
Write one regression test per bug fix and place shared fixtures in `tests/fixtures/`. Tag longer scenarios with `@pytest.mark.integration` so they can be skipped locally via `pytest -m "not integration"`. Maintain at least 80% line coverage (`pytest --cov=src --cov-report=term-missing`). When calling external APIs, capture traffic via VCR.py or hand-crafted stubs; never depend on live services in CI. Update `tests/README.md` when adding new fixtures or markers.

## Commit & Pull Request Guidelines
Use Conventional Commit prefixes (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`) and keep the subject ≤72 characters. Multi-line commit bodies should explain the reasoning, not just the what. Pull requests must describe the change, reference any issue IDs, list verification steps (commands run, configs used), and attach logs or transcript snippets for agent behavioural changes. Request review from another maintainer, ensure automatic checks pass, and squash-merge unless maintainers request a linear history.

## Security & Configuration Tips
Do not commit secrets or API tokens; load them from `.env` and document variables in `configs/README.md`. Review every new dependency for license compatibility and pin versions. Use `secrets.example.env` to show required keys. If an agent needs privileged access, describe the risk and mitigation in the PR and update the `SECURITY.md` threat model.
