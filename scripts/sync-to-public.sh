#!/bin/bash
# Sync changes from private repo to public repo
#
# This script syncs UI and shared code to the public (open-source) repo
# while excluding pro/cloud-specific files.
#
# Usage:
#   ./scripts/sync-to-public.sh           # Sync and show diff
#   ./scripts/sync-to-public.sh --commit  # Sync and auto-commit
#   ./scripts/sync-to-public.sh --dry-run # Show what would be synced

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRIVATE_REPO="$(dirname "$SCRIPT_DIR")"
PUBLIC_REPO="$HOME/projects/demoscript-public"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Parse args
DRY_RUN=false
AUTO_COMMIT=false
COMMIT_MSG=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --commit)
            AUTO_COMMIT=true
            shift
            if [[ $# -gt 0 && ! "$1" =~ ^-- ]]; then
                COMMIT_MSG="$1"
                shift
            fi
            ;;
        -h|--help)
            echo "Usage: $0 [--dry-run] [--commit [message]]"
            echo ""
            echo "Options:"
            echo "  --dry-run        Show what would be synced without making changes"
            echo "  --commit [msg]   Auto-commit changes with optional message"
            echo "  -h, --help       Show this help"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Verify repos exist
if [[ ! -d "$PUBLIC_REPO/.git" ]]; then
    echo -e "${RED}Public repo not found at: $PUBLIC_REPO${NC}"
    exit 1
fi

echo -e "${CYAN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     Sync Private -> Public Repo           ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Private: ${CYAN}$PRIVATE_REPO${NC}"
echo -e "  Public:  ${CYAN}$PUBLIC_REPO${NC}"
echo ""

# Files/dirs to exclude from sync (pro/cloud features)
EXCLUDES=(
    # Git and build
    ".git"
    "node_modules"
    "dist"
    "dist-pages"

    # GitHub workflows (public repo has its own)
    ".github"

    # Cloud package (entire directory)
    "packages/cloud"

    # Private-only directories
    "landing"
    "docs"

    # Pro CLI commands
    "packages/cli/src/commands/build.ts"
    "packages/cli/src/commands/deploy.ts"
    "packages/cli/src/commands/record.ts"
    "packages/cli/src/commands/export-video.ts"
    "packages/cli/src/commands/export-gif.ts"

    # Pro CLI libs
    "packages/cli/src/lib/screenshot.ts"
    "packages/cli/src/lib/video-encoder.ts"
    "packages/cli/src/lib/video-encoder.test.ts"

    # Private-only scripts
    "scripts/build-pages.sh"
    "scripts/publish.sh"
    "scripts/capture-demo.js"

    # Environment/secrets
    ".envrc"
    ".env"
    ".env.*"

    # Misc
    "assets/frames"
    "ROADMAP.md"

    # Files that differ between repos (have public-specific versions)
    "packages/ui/src/lib/execute-adapter.ts"
    "packages/cli/src/index.ts"
    "packages/cli/src/commands/serve.ts"
    "packages/cli/package.json"
    "packages/cli/tests/commands.test.ts"
    "package.json"
    "package-lock.json"
)

# Build rsync exclude args
RSYNC_EXCLUDES=""
for exclude in "${EXCLUDES[@]}"; do
    RSYNC_EXCLUDES="$RSYNC_EXCLUDES --exclude=$exclude"
done

# Step 1: Rsync files
echo -e "${YELLOW}[1/4] Syncing files...${NC}"

if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "  ${CYAN}(dry run - no changes made)${NC}"
    rsync -avn --delete $RSYNC_EXCLUDES "$PRIVATE_REPO/" "$PUBLIC_REPO/" 2>/dev/null | grep -v "^$" | head -50
    echo ""
    echo -e "${YELLOW}Dry run complete. No changes made.${NC}"
    exit 0
fi

rsync -av --delete $RSYNC_EXCLUDES "$PRIVATE_REPO/" "$PUBLIC_REPO/" > /tmp/rsync-output.txt 2>&1
SYNCED_COUNT=$(grep -c "^packages\|^examples\|^CLAUDE\|^README\|^DESIGN" /tmp/rsync-output.txt 2>/dev/null || echo "0")
echo -e "  ${GREEN}Synced $SYNCED_COUNT items${NC}"

# Step 2: Verify public-specific files weren't modified
echo -e "${YELLOW}[2/4] Verifying public-specific files...${NC}"

cd "$PUBLIC_REPO"

# These files are excluded from rsync and should remain unchanged
PUBLIC_SPECIFIC_FILES=(
    "packages/ui/src/lib/execute-adapter.ts"
    "packages/cli/src/index.ts"
    "packages/cli/src/commands/serve.ts"
    "packages/cli/package.json"
    "packages/cli/tests/commands.test.ts"
    "package.json"
    "package-lock.json"
)

for file in "${PUBLIC_SPECIFIC_FILES[@]}"; do
    if git diff --quiet "$file" 2>/dev/null; then
        echo -e "  ${GREEN}$file: unchanged (good)${NC}"
    else
        echo -e "  ${RED}$file: unexpectedly modified - restoring${NC}"
        git checkout "$file" 2>/dev/null || true
    fi
done

# Step 3: Clean up any pro files that slipped through
echo -e "${YELLOW}[3/4] Cleaning up pro files...${NC}"

PRO_FILES=(
    "packages/cli/src/commands/build.ts"
    "packages/cli/src/commands/deploy.ts"
    "packages/cli/src/commands/record.ts"
    "packages/cli/src/commands/export-video.ts"
    "packages/cli/src/commands/export-gif.ts"
    "packages/cli/src/lib/screenshot.ts"
    "packages/cli/src/lib/video-encoder.ts"
    "packages/cli/src/lib/video-encoder.test.ts"
    "docs/CLOUD-ARCHITECTURE.md"
    "docs/GO-TO-MARKET.md"
    ".envrc"
    "scripts/capture-demo.js"
)

CLEANED=0
for file in "${PRO_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        rm -f "$file"
        echo -e "  ${RED}Removed: $file${NC}"
        ((CLEANED++))
    fi
done

if [[ $CLEANED -eq 0 ]]; then
    echo -e "  ${GREEN}No pro files found${NC}"
fi

# Step 4: Show status
echo -e "${YELLOW}[4/4] Status...${NC}"
echo ""

STATUS=$(git status --short)
if [[ -z "$STATUS" ]]; then
    echo -e "${GREEN}Public repo is up to date. No changes to commit.${NC}"
    exit 0
fi

echo -e "${CYAN}Changes in public repo:${NC}"
git status --short
echo ""

# Auto-commit if requested
if [[ "$AUTO_COMMIT" == "true" ]]; then
    if [[ -z "$COMMIT_MSG" ]]; then
        COMMIT_MSG="Sync from private repo"
    fi

    echo -e "${YELLOW}Committing changes...${NC}"
    git add -A
    git commit -m "$COMMIT_MSG"
    echo ""
    echo -e "${GREEN}Committed. Run 'git push' in public repo to publish.${NC}"
else
    echo -e "${CYAN}To commit these changes:${NC}"
    echo "  cd $PUBLIC_REPO"
    echo "  git add -A"
    echo "  git commit -m 'Sync from private repo'"
    echo "  git push origin main"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Sync Complete!               ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}"
