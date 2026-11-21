#!/usr/bin/env bash
# Installs and checks the portal from a clean checkout (backlog REL-01: "an install script as the default").
#
#   scripts/install.sh            # install, check, build the demo (mock) build
#   scripts/install.sh --serve    # ... then serve it on http://localhost:4173
#
# Needs Node.js 20.19 or later (24 recommended, see .nvmrc) and npm 10 or later. No backend, Docker or
# credentials are needed: the demo build uses the typed mock adapters (VITE_API_MODE=mock).
# To run against the real backend instead, see the README ("Backend") and docs/runbook.md.
set -euo pipefail
cd "$(dirname "$0")/.."

need() { echo "install: $*" >&2; exit 1; }
command -v node >/dev/null || need "Node.js is not installed (20.19 or later; see .nvmrc)."
command -v npm >/dev/null || need "npm is not installed."
node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>20||(a===20&&b>=19)?0:1)' \
  || need "Node.js $(node --version) is too old: 20.19 or later is required (24 recommended)."

echo "1/5  Installing dependencies from the lockfile (npm ci)"
npm ci --no-audit --no-fund

if [ ! -f .env ]; then
  echo "2/5  Creating .env from .env.example (names only; mock mode needs no values)"
  cp .env.example .env
else
  echo "2/5  Keeping the existing .env"
fi

echo "3/5  Lint and type-check"
npm run -s lint
npm run -s typecheck

echo "4/5  Unit tests"
npm run -s test

echo "5/5  Demo build (mock mode, fictional data)"
VITE_API_MODE=mock npm run -s build

echo
echo "Installed. Build output: dist/"
if [ "${1:-}" = "--serve" ]; then
  echo "Serving the demo build on http://localhost:4173 (Ctrl+C to stop)"
  exec npx vite preview --port 4173 --strictPort
else
  echo "Run it:   npm run preview     (or: scripts/install.sh --serve)"
  echo "Develop:  npm run dev         (http://localhost:5173)"
fi
