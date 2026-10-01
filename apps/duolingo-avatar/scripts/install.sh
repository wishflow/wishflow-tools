#!/usr/bin/env bash
set -euo pipefail

app_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$app_dir"

npm ci

if [[ -f pyproject.toml ]]; then
  python3 -m venv .venv
  if [[ -f requirements.txt ]]; then
    .venv/bin/python -m pip install -r requirements.txt
  else
    .venv/bin/python -m pip install -e .
  fi
fi
