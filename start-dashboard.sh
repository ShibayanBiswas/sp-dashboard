#!/usr/bin/env bash
# Start SP Dashboard — Next.js frontend + Python analytics API (Linux/macOS)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install Node 20+ and retry."
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "Installing Node dependencies..."
  npm install
fi

PYTHON_API_URL="${PYTHON_API_URL:-http://127.0.0.1:8000}"
VENV="$ROOT/backend/python/.venv"
PY_REQ="$ROOT/backend/python/requirements.txt"

start_python() {
  if ! command -v python3 >/dev/null 2>&1; then
    echo "Python 3 not found — pivot tables will use Node fallback only."
    return
  fi
  if [[ ! -d "$VENV" ]]; then
    echo "Creating Python virtualenv..."
    python3 -m venv "$VENV"
    "$VENV/bin/pip" install -r "$PY_REQ"
  fi
  if command -v lsof >/dev/null 2>&1 && lsof -ti:8000 >/dev/null 2>&1; then
    echo "Python API already listening on :8000"
    return
  fi
  echo "Starting Python analytics API on $PYTHON_API_URL ..."
  (cd "$ROOT/backend/python" && "$VENV/bin/python" -m uvicorn main:app --host 127.0.0.1 --port 8000) &
  PY_PID=$!
  echo "$PY_PID" > "$ROOT/.python-api.pid"
}

stop_stale() {
  if ! command -v lsof >/dev/null 2>&1; then
    return
  fi
  for port in 3000 8000; do
    if lsof -ti:"$port" >/dev/null 2>&1; then
      echo "Stopping process on port $port..."
      lsof -ti:"$port" | xargs -r kill 2>/dev/null || true
      sleep 1
    fi
  done
}

if [[ "${1:-}" == "--stop" ]]; then
  stop_stale
  [[ -f .python-api.pid ]] && kill "$(cat .python-api.pid)" 2>/dev/null || true
  rm -f .python-api.pid
  exit 0
fi

stop_stale
start_python

export PYTHON_API_URL
echo "Starting Next.js on http://localhost:3000 ..."
echo "APIs: Next /api/* | Python $PYTHON_API_URL"
exec npm run dev
