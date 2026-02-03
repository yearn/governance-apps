#!/usr/bin/env sh
set -eu

# -----------------------------------------------------------------------------
# Sync selected environment / config files from base repo to agent worktrees
#
# - Must be run from the base repo directory
# - Copies files only if they exist in base repo
# - Never overwrites existing files in agent worktrees
# - Safe to run repeatedly
#
# Usage:
#   ./scripts/sync-agent-env.sh
#   ./scripts/sync-agent-env.sh ../repo.agent.ui ../repo.agent.dev
#   ./scripts/sync-agent-env.sh --install ../repo.agent.ui
# -----------------------------------------------------------------------------

REPO_NAME="$(basename "$(pwd)")"
DEFAULT_WORKTREE_GLOB="../${REPO_NAME}.agent.*"

FILES="
.env
.dev.vars
.env.local
next-env.d.ts
"

usage() {
  cat >&2 <<'EOF'
Usage:
  sync-agent-env.sh [--install|--no-install] [--sync-only] [worktree_dir...]
Notes:
  - With no worktree_dir args: syncs all ../<repo>.agent.* worktrees
  - With worktree_dir args: syncs only those dirs
  - --install runs a lockfile-aware install in each target
EOF
  exit 2
}

DO_INSTALL=0
SYNC_ONLY=0

# Parse flags (POSIX-ish; flags must come before dirs)
while [ "$#" -gt 0 ]; do
  case "$1" in
    --install) DO_INSTALL=1; shift ;;
    --no-install) DO_INSTALL=0; shift ;;
    --sync-only) SYNC_ONLY=1; shift ;;
    -h|--help) usage ;;
    --) shift; break ;;
    -*) echo "Unknown option: $1" >&2; usage ;;
    *) break ;;
  esac
done

# Must run from base repo root
if [ ! -d .git ]; then
  echo "ERROR: must be run from repo root (missing .git directory)" >&2
  exit 1
fi

# Determine targets: either args (explicit) or glob (default)
if [ "$#" -gt 0 ]; then
  TARGETS="$*"
else
  TARGETS="$DEFAULT_WORKTREE_GLOB"
fi

# ---- preflight: ensure at least one source file exists in base repo ----------
FOUND_FILES=0
for f in $FILES; do
  if [ -f "$f" ]; then
    FOUND_FILES=1
    break
  fi
done

if [ "$FOUND_FILES" -eq 0 ]; then
  echo "ERROR: none of the configured files exist in base repo:" >&2
  for f in $FILES; do echo "  - $f" >&2; done
  exit 1
fi

# ---- main -------------------------------------------------------------------
FOUND_WT=0
COPIED=0
SKIPPED=0

install_deps() {
  wt="$1"

  if [ -f "$wt/package-lock.json" ]; then
    echo "  → npm ci"
    (cd "$wt" && npm ci --prefer-offline --no-audit)
    return 0
  fi

  if [ -f "$wt/pnpm-lock.yaml" ]; then
    echo "  → pnpm install --frozen-lockfile"
    (cd "$wt" && pnpm install --frozen-lockfile)
    return 0
  fi

  if [ -f "$wt/yarn.lock" ]; then
    echo "  → yarn install --frozen-lockfile"
    (cd "$wt" && yarn install --frozen-lockfile)
    return 0
  fi

  echo "  WARN: no recognized lockfile; skipping install" >&2
  return 0
}

for d in $TARGETS; do
  [ -d "$d" ] || continue
  FOUND_WT=1

  echo "→ $d"

  for f in $FILES; do
    [ -f "$f" ] || continue

    TARGET="$d/$f"

    if [ -f "$TARGET" ]; then
      echo "  • $f exists — skipping"
      SKIPPED=$((SKIPPED + 1))
    else
      mkdir -p "$(dirname "$TARGET")"
      cp "$f" "$TARGET"
      echo "  ✓ copied $f"
      COPIED=$((COPIED + 1))
    fi
  done

  if [ "$SYNC_ONLY" -eq 0 ] && [ "$DO_INSTALL" -eq 1 ]; then
    install_deps "$d"
  fi
done

# ---- summary ----------------------------------------------------------------
if [ "$FOUND_WT" -eq 0 ]; then
  if [ "$#" -gt 0 ]; then
    echo "No matching worktrees found in args: $*" >&2
  else
    echo "No agent worktrees found (pattern: $DEFAULT_WORKTREE_GLOB)" >&2
  fi
else
  echo ""
  echo "Summary:"
  echo "  copied : $COPIED"
  echo "  skipped: $SKIPPED"
fi
