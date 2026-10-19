#!/usr/bin/env bash
set -e

ACCOUNT="${1:-mahdiketabdar}"
ACCOUNT="${ACCOUNT//@/}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_EXEC="/usr/local/bin/inflow-python"
if [ ! -f "$PYTHON_EXEC" ]; then
    PYTHON_EXEC="$(which python3)"
fi

echo "[inFlow Engine] Executing worker pass for @${ACCOUNT}..."
exec "$PYTHON_EXEC" "$SCRIPT_DIR/worker.py" --account "$ACCOUNT" "${@:2}"
