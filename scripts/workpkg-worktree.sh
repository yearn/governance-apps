#!/usr/bin/env sh
set -eu

usage() {
  cat >&2 <<'EOF'
Usage:
  workpkg-worktree.sh create --track <teams|ybc|shared> --milestone <M#> [--wp <WP#>] [--base <ref>] [--install|--no-install] [--seed-template]
  workpkg-worktree.sh remove --track <teams|ybc|shared> --milestone <M#> [--wp <WP#>] [--keep-branch] [--force] [--prune]
  workpkg-worktree.sh path   --track <teams|ybc|shared> --milestone <M#> [--wp <WP#>]
  workpkg-worktree.sh branch --track <teams|ybc|shared> --milestone <M#> [--wp <WP#>]
  workpkg-worktree.sh list

Notes:
  - Worktrees are created as ../<repo>.<track>.<milestone>[.<wp>]
  - --base is used only when creating a new branch; default is current HEAD
  - Milestone-only worktrees are valid and recommended for integration branches
  - Work package worktrees are recommended for focused implementation branches
EOF
  exit 2
}

if [ ! -d .git ]; then
  echo "ERROR: run from repo root (missing .git)" >&2
  exit 1
fi

CMD="${1:-}"
[ -n "$CMD" ] || usage
shift || true

TRACK=""
MILESTONE=""
WP=""
BASE_REF=""
DO_INSTALL=1
SEED_TEMPLATE=0
KEEP_BRANCH=0
FORCE_REMOVE=0
DO_PRUNE=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --track) shift; TRACK="${1:-}"; shift || true ;;
    --milestone) shift; MILESTONE="${1:-}"; shift || true ;;
    --wp) shift; WP="${1:-}"; shift || true ;;
    --base) shift; BASE_REF="${1:-}"; shift || true ;;
    --install) DO_INSTALL=1; shift ;;
    --no-install) DO_INSTALL=0; shift ;;
    --seed-template) SEED_TEMPLATE=1; shift ;;
    --keep-branch) KEEP_BRANCH=1; shift ;;
    --force) FORCE_REMOVE=1; shift ;;
    --prune) DO_PRUNE=1; shift ;;
    -h|--help) usage ;;
    --) shift; break ;;
    *) echo "Unknown arg: $1" >&2; usage ;;
  esac
done

REPO_NAME="$(basename "$(pwd)")"
ROOT_PREFIX="../${REPO_NAME}"

normalize() {
  echo "$1" | tr '[:upper:]' '[:lower:]'
}

TRACK="$(normalize "$TRACK")"
MILESTONE="$(normalize "$MILESTONE")"
WP="$(normalize "$WP")"

case "$CMD" in
  list)
    echo "Work package worktrees:"
    found=0
    for path in "${ROOT_PREFIX}.teams."* "${ROOT_PREFIX}.ybc."* "${ROOT_PREFIX}.shared."*; do
      [ -d "$path" ] || continue
      found=1
      echo "$path"
    done
    [ "$found" -eq 1 ] || echo "(none)"
    exit 0
    ;;
  create|remove|path|branch)
    [ -n "$TRACK" ] || { echo "ERROR: --track is required" >&2; usage; }
    [ -n "$MILESTONE" ] || { echo "ERROR: --milestone is required" >&2; usage; }
    ;;
  *)
    usage
    ;;
esac

case "$TRACK" in
  teams|ybc|shared) ;;
  *) echo "ERROR: invalid --track '$TRACK'" >&2; usage ;;
esac

# Sanitize labels such as M1 / WP2 / m1 / wp2
MILESTONE="$(echo "$MILESTONE" | sed 's#[^a-z0-9._-]##g')"
WP="$(echo "$WP" | sed 's#[^a-z0-9._-]##g')"

PATH_SUFFIX="$TRACK.$MILESTONE"
BRANCH="agent/$TRACK/$MILESTONE"
LEGACY_BRANCH="codex/$TRACK/$MILESTONE"
if [ -n "$WP" ]; then
  PATH_SUFFIX="$PATH_SUFFIX.$WP"
  BRANCH="$BRANCH/$WP"
  LEGACY_BRANCH="$LEGACY_BRANCH/$WP"
fi
WT_PATH="$ROOT_PREFIX.$PATH_SUFFIX"
LEGACY_WT_PATH="../${REPO_NAME}.worktree/$TRACK/$MILESTONE"
if [ -n "$WP" ]; then
  LEGACY_WT_PATH="$LEGACY_WT_PATH/$WP"
fi

case "$CMD" in
  path)
    echo "$WT_PATH"
    exit 0
    ;;
  branch)
    echo "$BRANCH"
    exit 0
    ;;
esac

SYNC_SCRIPT="./scripts/workpkg-sync-env.sh"

rename_legacy_branch() {
  if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
    return 0
  fi

  if git show-ref --verify --quiet "refs/heads/$LEGACY_BRANCH"; then
    echo "Renaming legacy branch: $LEGACY_BRANCH -> $BRANCH"
    git branch -m "$LEGACY_BRANCH" "$BRANCH"
  fi
}

create_worktree() {
  if [ -n "$BASE_REF" ] && ! git rev-parse --verify --quiet "$BASE_REF^{commit}" >/dev/null; then
    echo "ERROR: --base ref not found or not a commit: $BASE_REF" >&2
    exit 1
  fi

  if [ -d "$WT_PATH" ]; then
    echo "Worktree exists: $WT_PATH"
    [ -z "$BASE_REF" ] || echo "Base ignored because worktree already exists: $BASE_REF"
    rename_legacy_branch
  elif [ -d "$LEGACY_WT_PATH" ]; then
    echo "Moving legacy worktree: $LEGACY_WT_PATH -> $WT_PATH"
    git worktree move "$LEGACY_WT_PATH" "$WT_PATH"
    [ -z "$BASE_REF" ] || echo "Base ignored because legacy worktree already exists: $BASE_REF"
    rename_legacy_branch
  else
    rename_legacy_branch
    if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
      echo "Adding worktree: $WT_PATH (branch: $BRANCH)"
      [ -z "$BASE_REF" ] || echo "Base ignored because branch already exists: $BASE_REF"
      git worktree add "$WT_PATH" "$BRANCH"
    else
      if [ -n "$BASE_REF" ]; then
        echo "Creating branch + worktree: $WT_PATH (branch: $BRANCH, base: $BASE_REF)"
        git worktree add -b "$BRANCH" "$WT_PATH" "$BASE_REF"
      else
        echo "Creating branch + worktree: $WT_PATH (branch: $BRANCH)"
        git worktree add -b "$BRANCH" "$WT_PATH"
      fi
    fi
  fi

  sync_args=""
  if [ "$DO_INSTALL" -eq 1 ]; then
    sync_args="--install"
  else
    sync_args="--no-install"
  fi

  if [ "$SEED_TEMPLATE" -eq 1 ]; then
    sync_args="$sync_args --seed-template"
  fi

  # shellcheck disable=SC2086
  "$SYNC_SCRIPT" $sync_args "$WT_PATH"

  echo ""
  echo "Ready:"
  echo "  path   : $WT_PATH"
  echo "  branch : $BRANCH"
  if [ -n "$BASE_REF" ]; then
    echo "  base   : $BASE_REF"
  fi
}

remove_worktree() {
  REMOVE_PATH="$WT_PATH"
  if [ ! -d "$REMOVE_PATH" ] && [ -d "$LEGACY_WT_PATH" ]; then
    REMOVE_PATH="$LEGACY_WT_PATH"
  fi

  if [ -d "$REMOVE_PATH" ]; then
    echo "Removing worktree: $REMOVE_PATH"
    if [ "$FORCE_REMOVE" -eq 1 ]; then
      git worktree remove -f "$REMOVE_PATH"
    else
      git worktree remove "$REMOVE_PATH"
    fi
  else
    echo "Worktree not found on disk: $WT_PATH"
    echo "Legacy worktree not found on disk: $LEGACY_WT_PATH"
  fi

  DELETE_BRANCH="$BRANCH"
  if [ "$KEEP_BRANCH" -eq 0 ] && ! git show-ref --verify --quiet "refs/heads/$DELETE_BRANCH" && git show-ref --verify --quiet "refs/heads/$LEGACY_BRANCH"; then
    DELETE_BRANCH="$LEGACY_BRANCH"
  fi

  if [ "$KEEP_BRANCH" -eq 0 ] && git show-ref --verify --quiet "refs/heads/$DELETE_BRANCH"; then
    echo "Deleting branch: $DELETE_BRANCH"
    git branch -D "$DELETE_BRANCH"
  else
    echo "Keeping branch: $BRANCH"
  fi

  if [ "$DO_PRUNE" -eq 1 ]; then
    git worktree prune
  fi
}

case "$CMD" in
  create) create_worktree ;;
  remove) remove_worktree ;;
esac
