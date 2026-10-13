#!/bin/sh
set -eu

app_dir=$(CDPATH= cd "$(dirname "$0")/.." && pwd)
cd "$app_dir"
exec pnpm install --frozen-lockfile
