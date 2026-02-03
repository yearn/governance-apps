#!/usr/bin/env sh
set -eu

# -----------------------------------------------------------------------------
# agent-worktree.sh
#
# Create/bootstrap or remove one or many agent worktrees.
#
# Conventions:
#   - worktree path: ../<repo>.agent.<name>
#   - branch name  : agent/<name>
#
# Examples:
#   ./scripts/agent-worktree.sh ui
#   ./scripts/agent-worktree.sh create ui,dev,bug
#   ./scripts/agent-worktree.sh --agents agent/ui,agent/dev --no-install
#
# Cleanup (branch deletion default ON):
#   ./scripts/agent-worktree.sh remove ui
#   ./scripts/agent-worktree.sh remove ui,dev --prune
#   ./scripts/agent-worktree.sh remove ui --keep-branch
#   ./scripts/agent-worktree.sh remove ui --force
# -----------------------------------------------------------------------------

usage() {
  cat >&2 <<'EOF'
Usage:
  agent-worktree.sh [create] <name|csv> [--install|--no-install] [--sync-only]
  agent-worktree.sh [create] --agents <csv> [--install|--no-install] [--sync-only]

  agent-worktree.sh remove <name|csv> [--keep-branch] [--force] [--prune]
  agent-worktree.sh remove --agents <csv> [--keep-branch] [--force] [--prune]

Where:
  <name|csv>    "ui" or "ui,dev,bug" or "agent/ui,agent/dev"
  --agents      alternative to positional; accepts same csv format

Create options:
  --install     run lockfile-aware install (default: on)
  --no-install  skip install
  --sync-only   only create worktree(s) and sync env/config files

Remove options:
  --keep-branch keep agent/<name> branch (default: delete branch)
  --force       pass -f to git worktree remove (DANGEROUS if uncommitted work)
  --prune       run git worktree prune afterwards

Notes:
  - Removal will fail if the worktree cannot be removed safely unless --force is used.
  - Branch deletion will fail if the branch is checked out in any remaining worktree.
EOF
  exit 2
}

# Must run from base repo root
if [ ! -d .git ]; then
  echo "ERROR: must be run from repo root (missing .git directory)" >&2
  exit 1
fi

REPO_NAME="$(basename "$(pwd)")"

CMD="create"
DO_INSTALL=1
SYNC_ONLY=0

# remove defaults
DELETE_BRANCH=1   # default ON for remove
FORCE_REMOVE=0
DO_PRUNE=0

AGENTS_CSV=""

# Optional leading subcommand
if [ "$#" -ge 1 ]; then
  case "$1" in
    create|remove)
      CMD="$1"
      shift
      ;;
  esac
fi

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
    --keep-branch) DELETE_BRANCH=0; shift ;;
    --force) FORCE_REMOVE=1; shift ;;
    --prune) DO_PRUNE=1; shift ;;
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

# Normalize "agent/ui" -> "ui", split CSV into lines
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

  # Sync env/config files into that worktree (+ optional install)
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

remove_one() {
  name="$1"

  WT_PATH="../${REPO_NAME}.agent.${name}"
  BRANCH="agent/${name}"

  if [ ! -d "$WT_PATH" ]; then
    echo "Worktree not found on disk: $WT_PATH"
  else
    echo "Removing worktree: $WT_PATH"
    if [ "$FORCE_REMOVE" -eq 1 ]; then
      git worktree remove -f "$WT_PATH"
    else
      git worktree remove "$WT_PATH"
    fi
  fi

  if [ "$DELETE_BRANCH" -eq 1 ]; then
    if git show-ref --verify --quiet "refs/heads/${BRANCH}"; then
      echo "Deleting branch: $BRANCH"
      # Fails (good) if checked out elsewhere.
      git branch -D "$BRANCH"
    else
      echo "Branch not found: $BRANCH"
    fi
  else
    echo "Keeping branch: $BRANCH"
  fi
}

case "$CMD" in
  create)
    for name in $AGENTS_LINES; do
      echo ""
      echo "=== agent/${name} ==="
      create_one "$name"
    done
    ;;
  remove)
    for name in $AGENTS_LINES; do
      echo ""
      echo "=== agent/${name} ==="
      remove_one "$name"
    done

    if [ "$DO_PRUNE" -eq 1 ]; then
      echo ""
      echo "Pruning stale worktree metadata"
      git worktree prune
    fi
    ;;
  *)
    usage
    ;;
esac

echo ""
echo "Done."
