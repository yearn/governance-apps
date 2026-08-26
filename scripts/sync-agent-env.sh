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

load_nvm() {
  if command -v nvm >/dev/null 2>&1; then
    return 0
  fi

  if [ -n "${NVM_DIR:-}" ] && [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1090
    . "$NVM_DIR/nvm.sh"
  elif [ -s "$HOME/.nvm/nvm.sh" ]; then
    NVM_DIR="$HOME/.nvm"
    export NVM_DIR
    # shellcheck disable=SC1090
    . "$NVM_DIR/nvm.sh"
  elif [ -s "/opt/homebrew/opt/nvm/nvm.sh" ]; then
    NVM_DIR="$HOME/.nvm"
    export NVM_DIR
    # shellcheck disable=SC1091
    . "/opt/homebrew/opt/nvm/nvm.sh"
  elif [ -s "/usr/local/opt/nvm/nvm.sh" ]; then
    NVM_DIR="$HOME/.nvm"
    export NVM_DIR
    # shellcheck disable=SC1091
    . "/usr/local/opt/nvm/nvm.sh"
  fi

  command -v nvm >/dev/null 2>&1
}

fish_has_nvm() {
  command -v fish >/dev/null 2>&1 && fish -lc 'type -q nvm' >/dev/null 2>&1
}

node_major_from_version() {
  printf "%s" "$1" | sed 's/^v//; s/[^0-9].*$//'
}

find_installed_node_bin_dir() {
  expected_major="$1"
  found_bin_dir=""

  for base in "$HOME/.local/share/nvm" "$HOME/.nvm/versions/node"; do
    [ -d "$base" ] || continue
    for node_bin in "$base"/v"$expected_major".*/bin/node "$base"/"$expected_major".*/bin/node; do
      [ -x "$node_bin" ] || continue
      found_bin_dir="$(dirname "$node_bin")"
    done
  done

  if [ -n "${NVM_DIR:-}" ]; then
    for base in "$NVM_DIR/versions/node" "$NVM_DIR"; do
      [ -d "$base" ] || continue
      for node_bin in "$base"/v"$expected_major".*/bin/node "$base"/"$expected_major".*/bin/node; do
        [ -x "$node_bin" ] || continue
        found_bin_dir="$(dirname "$node_bin")"
      done
    done
  fi

  [ -n "$found_bin_dir" ] || return 1
  printf "%s\n" "$found_bin_dir"
}

run_with_fish_project_node() {
  wt="$1"
  shift

  fish -lc '
    set wt $argv[1]
    set -e argv[1]
    cd "$wt"

    if not test -f .nvmrc
      echo "  ERROR: .nvmrc is required before installing dependencies." >&2
      exit 1
    end
    set node_version (string trim < .nvmrc)

    set use_version $node_version
    if string match --quiet --regex "^[0-9]+\$" -- $use_version
      set use_version v$use_version
    end

    echo "  → nvm use $use_version"
    nvm use $use_version

    set expected_major (string replace --regex "^v?([0-9]+).*\$" "\$1" -- $node_version)
    set actual_major (node -p "process.versions.node.split(\".\")[0]")
    if test "$expected_major" != "$actual_major"
      echo "  ERROR: expected Node $expected_major.x, but active Node is "(node -v) >&2
      exit 1
    end

    command $argv
  ' "$wt" "$@"
}

run_with_project_node() {
  wt="$1"
  shift

  if [ ! -f "$wt/.nvmrc" ]; then
    echo "  ERROR: $wt/.nvmrc is required before installing dependencies." >&2
    return 1
  fi
  node_version="$(sed -n '1{s/[[:space:]]//g;p;q;}' "$wt/.nvmrc")"
  expected_major="$(node_major_from_version "$node_version")"

  if [ -z "$expected_major" ]; then
    echo "  ERROR: could not infer Node major from version '$node_version'." >&2
    return 1
  fi

  node_bin_dir="$(find_installed_node_bin_dir "$expected_major" || true)"
  if [ -n "$node_bin_dir" ]; then
    (
      cd "$wt"
      PATH="$node_bin_dir:$PATH"
      export PATH
      actual_major="$(node -p "process.versions.node.split('.')[0]")"
      if [ "$expected_major" != "$actual_major" ]; then
        echo "  ERROR: expected Node $expected_major.x, but active Node is $(node -v)" >&2
        exit 1
      fi
      echo "  → using Node $(node -v) ($node_bin_dir/node)"
      "$@"
    )
    return $?
  fi

  if load_nvm; then
    (
      cd "$wt"
      use_version="$node_version"
      case "$use_version" in
        v*) ;;
        *[!0-9]*) ;;
        *) use_version="v$use_version" ;;
      esac
      echo "  → nvm use $use_version"
      nvm use "$use_version"
      actual_major="$(node -p "process.versions.node.split('.')[0]")"
      if [ "$expected_major" != "$actual_major" ]; then
        echo "  ERROR: expected Node $expected_major.x, but active Node is $(node -v)" >&2
        exit 1
      fi
      "$@"
    )
    return 0
  fi

  if fish_has_nvm; then
    run_with_fish_project_node "$wt" "$@"
    return $?
  fi

  current_major="$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || true)"
  if [ "$current_major" = "$expected_major" ]; then
    echo "  WARN: nvm not found; current node is already ${expected_major}.x" >&2
    (cd "$wt" && "$@")
    return 0
  fi

  echo "  ERROR: nvm is required to select Node ${expected_major} before installing dependencies." >&2
  echo "         Install/load nvm, run 'nvm install ${expected_major}', or pass --no-install." >&2
  return 1
}

install_deps() {
  wt="$1"

  if [ -f "$wt/package-lock.json" ]; then
    echo "  → npm ci"
    run_with_project_node "$wt" npm ci --prefer-offline --no-audit
    return 0
  fi

  if [ -f "$wt/pnpm-lock.yaml" ]; then
    echo "  → pnpm install --frozen-lockfile"
    run_with_project_node "$wt" pnpm install --frozen-lockfile
    return 0
  fi

  if [ -f "$wt/yarn.lock" ]; then
    echo "  → yarn install --frozen-lockfile"
    run_with_project_node "$wt" yarn install --frozen-lockfile
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
