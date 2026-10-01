#!/usr/bin/env bash
set -euo pipefail

if [[ -x .venv/bin/python ]]; then
  exec .venv/bin/python "$@"
fi

if [[ -x .venv/Scripts/python.exe ]]; then
  exec .venv/Scripts/python.exe "$@"
fi

echo "Python virtual environment not found. Run ./scripts/install.sh first." >&2
exit 1
