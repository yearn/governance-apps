#!/usr/bin/env sh
set -eu

usage() {
  cat >&2 <<'EOF'
Usage:
  workpkg-sync-env.sh [--install|--no-install] [--seed-template] [worktree_dir...]
Notes:
  - With no worktree_dir args: syncs all ../<repo>.<track>.<milestone>[.<wp>] worktrees
  - Copies selected env/config files only when missing in the target
  - --seed-template copies .env.worktree.example -> .env.local when target has no .env.local
  - --install runs a lockfile-aware install in each target
EOF
  exit 2
}

DO_INSTALL=0
SEED_TEMPLATE=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --install) DO_INSTALL=1; shift ;;
    --no-install) DO_INSTALL=0; shift ;;
    --seed-template) SEED_TEMPLATE=1; shift ;;
    -h|--help) usage ;;
    --) shift; break ;;
    -*) echo "Unknown option: $1" >&2; usage ;;
    *) break ;;
  esac
done

if [ ! -d .git ]; then
  echo "ERROR: run from repo root (missing .git)" >&2
  exit 1
fi

REPO_NAME="$(basename "$(pwd)")"
ROOT_PREFIX="../${REPO_NAME}"

FILES="
.env
.dev.vars
.env.local
next-env.d.ts
"

TEMPLATE_FILE=".env.worktree.example"

if [ "$#" -gt 0 ]; then
  TARGETS="$*"
else
  TARGETS=""
  for path in "${ROOT_PREFIX}.teams."* "${ROOT_PREFIX}.ybc."* "${ROOT_PREFIX}.shared."*; do
    [ -d "$path" ] || continue
    TARGETS="${TARGETS}${TARGETS:+ }$path"
  done
fi

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

    set node_version 22
    if test -f .nvmrc
      set node_version (string trim < .nvmrc)
    end

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

  node_version="22"
  if [ -f "$wt/.nvmrc" ]; then
    node_version="$(sed -n '1{s/[[:space:]]//g;p;q;}' "$wt/.nvmrc")"
  fi
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
  if [ "$current_major" = "22" ]; then
    echo "  WARN: nvm not found; current node is already 22.x" >&2
    (cd "$wt" && "$@")
    return 0
  fi

  echo "  ERROR: nvm is required to select Node 22 before installing dependencies." >&2
  echo "         Install/load nvm, run 'nvm install 22', or pass --no-install." >&2
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
}

FOUND=0

for wt in $TARGETS; do
  [ -d "$wt" ] || continue
  FOUND=1

  echo "→ $wt"

  for f in $FILES; do
    [ -f "$f" ] || continue
    target="$wt/$f"

    if [ -f "$target" ]; then
      echo "  • $f exists — skipping"
    else
      mkdir -p "$(dirname "$target")"
      cp "$f" "$target"
      echo "  ✓ copied $f"
    fi
  done

  if [ "$SEED_TEMPLATE" -eq 1 ] && [ -f "$TEMPLATE_FILE" ] && [ ! -f "$wt/.env.local" ]; then
    cp "$TEMPLATE_FILE" "$wt/.env.local"
    echo "  ✓ seeded .env.local from $TEMPLATE_FILE"
  fi

  if [ "$DO_INSTALL" -eq 1 ]; then
    install_deps "$wt"
  fi
done

if [ "$FOUND" -eq 0 ]; then
  echo "No matching worktrees found." >&2
fi
