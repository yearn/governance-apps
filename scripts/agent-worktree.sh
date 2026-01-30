#!/usr/bin/env sh
set -eu

# -----------------------------------------------------------------------------
# Create/bootstrap one or many agent worktrees, then sync env files and install.
#
# Examples:
#   ./scripts/agent-worktree.sh ui
#   ./scripts/agent-worktree.sh ui,dev,bug
#   ./scripts/agent-worktree.sh agent/ui,agent/dev --no-install
#   ./scripts/agent-worktree.sh --agents ui,dev,bug
#   ./scripts/agent-worktree.sh --agents ui,dev --sync-only
# -----------------------------------------------------------------------------

usage() {
  cat >&2 <<'EOF'
Usage:
  agent-worktree.sh <name|csv> [--install|--no-install] [--sync-only]
  agent-worktree.sh --agents <csv> [--install|--no-install] [--sync-only]

Where:
  <name|csv>    "ui" or "ui,dev,bug" or "agent/ui,agent/dev"
  --agents      alternative to positional; accepts same csv format

Options:
  --install     run lockfile-aware install (default: on)
  --no-install  skip install
  --sync-only   only create worktree(s) and sync env/config files

Conventions:
  - worktree path: ../<repo>.agent.<name>
  - branch name  : agent/<name>
EOF
  exit 2
}

# Must run from base repo root
if [ ! -d .git ]; then
  echo "ERROR: must be run from repo root (missing .git directory)" >&2
  exit 1
fi

REPO_NAME="$(basename "$(pwd)")"

DO_INSTALL=1
SYNC_ONLY=0
AGENTS_CSV=""

# Parse args
while [ "$#" -gt 0 ]; do
  case "$1" in
    --agents)
      shift
      [ "$#" -ge 1 ] || usage
      AGENTS_CSV="$1"
      shift
      ;;
    --install) DO_INSTALL=1; shift ;;
    --no-install) DO_INSTALL=0; shift ;;
    --sync-only) SYNC_ONLY=1; shift ;;
    -h|--help) usage ;;
    --) shift; break ;;
    -*)
      echo "Unknown option: $1" >&2
      usage
      ;;
    *)
      # Positional: name or csv (only if --agents not used)
      if [ -n "$AGENTS_CSV" ]; then
        echo "ERROR: cannot use both --agents and positional names" >&2
        usage
      fi
      AGENTS_CSV="$1"
      shift
      ;;
  esac
done

[ -n "$AGENTS_CSV" ] || usage

# Normalize "agent/ui" -> "ui", and split CSV into lines
# POSIX: use tr + sed; avoid bash arrays.
AGENTS_LINES="$(printf "%s" "$AGENTS_CSV" \
  | tr ',' '\n' \
  | sed -e 's/^[[:space:]]*//; s/[[:space:]]*$//' \
        -e 's#^agent/##' \
        -e '/^$/d')"

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
SYNC_SCRIPT="$SCRIPT_DIR/sync-agent-env.sh"

create_one() {
  name="$1"

  WT_PATH="../${REPO_NAME}.agent.${name}"
  BRANCH="agent/${name}"

  if [ -d "$WT_PATH" ]; then
    echo "Worktree exists: $WT_PATH"
  else
    if git show-ref --verify --quiet "refs/heads/${BRANCH}"; then
      echo "Adding worktree: $WT_PATH (branch: $BRANCH)"
      git worktree add "$WT_PATH" "$BRANCH"
    else
      echo "Creating branch + worktree: $WT_PATH (branch: $BRANCH)"
      git worktree add -b "$BRANCH" "$WT_PATH"
    fi
  fi

  # Sync env/config files into that worktree
  if [ "$SYNC_ONLY" -eq 1 ]; then
    "$SYNC_SCRIPT" --sync-only "$WT_PATH"
  else
    if [ "$DO_INSTALL" -eq 1 ]; then
      "$SYNC_SCRIPT" --install "$WT_PATH"
    else
      "$SYNC_SCRIPT" --sync-only "$WT_PATH"
    fi
  fi
}

# Iterate agents
for name in $AGENTS_LINES; do
  echo ""
  echo "=== agent/${name} ==="
  create_one "$name"
done

echo ""
echo "Done."
