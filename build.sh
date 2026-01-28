#!/bin/bash
# DemoScript Build Script
#
# Builds all project components and optionally creates distribution packages.
#
# Usage:
#   ./build.sh                        # Build UI and CLI
#   ./build.sh --serve [serve-args]   # Build and start dev server
#   ./build.sh --rpm                  # Build everything + RPM package
#   ./build.sh --deb                  # Build everything + DEB package
#   ./build.sh --packages             # Build everything + all packages
#   ./build.sh --clean                # Clean build artifacts first
#   ./build.sh --publish [patch|minor|major]  # Build and publish to npm
#   ./build.sh --install                      # Build and install globally
#
# Options:
#   --clean      Clean build artifacts before building
#   --serve      Start dev server after building (args after this are passed to serve)
#   --rpm        Build RPM package after building
#   --deb        Build DEB package after building
#   --packages   Build all packages (RPM + DEB) after building
#   --skip-ui    Skip UI build (use existing)
#   --skip-cli   Skip CLI build (use existing)
#   --publish    Publish to npm (patch by default, or specify patch/minor/major)
#   --install    Install CLI locally to ~/.local (add -g for global)
#   -h, --help   Show this help message
#
# Serve examples:
#   ./build.sh --serve                              # Default demo, port 3001, all interfaces
#   ./build.sh --serve ~/my-demo                    # Custom demo path
#   ./build.sh --serve ~/my-demo --port 8080        # Custom port
#   ./build.sh --serve --tunnel                     # With ngrok tunnel

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Parse arguments
CLEAN=false
SERVE=false
BUILD_RPM=false
BUILD_DEB=false
SKIP_UI=false
SKIP_CLI=false
PUBLISH=false
INSTALL=false
INSTALL_GLOBAL=false
VERSION_BUMP="patch"
SERVE_ARGS=()

while [[ $# -gt 0 ]]; do
    case $1 in
        --clean)
            CLEAN=true
            shift
            ;;
        --serve)
            SERVE=true
            shift
            # Collect remaining args for serve command
            SERVE_ARGS=("$@")
            break
            ;;
        --rpm)
            BUILD_RPM=true
            shift
            ;;
        --deb)
            BUILD_DEB=true
            shift
            ;;
        --packages)
            BUILD_RPM=true
            BUILD_DEB=true
            shift
            ;;
        --skip-ui)
            SKIP_UI=true
            shift
            ;;
        --skip-cli)
            SKIP_CLI=true
            shift
            ;;
        --publish)
            PUBLISH=true
            shift
            # Check for optional version bump type
            if [[ $# -gt 0 && "$1" =~ ^(patch|minor|major)$ ]]; then
                VERSION_BUMP="$1"
                shift
            fi
            ;;
        --install)
            INSTALL=true
            shift
            # Check for optional -g flag
            if [[ $# -gt 0 && "$1" == "-g" ]]; then
                INSTALL_GLOBAL=true
                shift
            fi
            ;;
        -h|--help)
            head -28 "$0" | tail -27
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       DemoScript Build Script        ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo

# Step 1: Clean if requested
if [ "$CLEAN" = true ]; then
    echo -e "${YELLOW}[1/5] Cleaning build artifacts...${NC}"
    rm -rf packages/shared/dist
    rm -rf packages/ui/dist
    rm -rf packages/cli/dist
    rm -rf dist
    echo -e "${GREEN}      Cleaned!${NC}"
    echo
fi

# Step 2: Build shared package (required by CLI)
echo -e "${YELLOW}[2/5] Building shared package...${NC}"
cd packages/shared
npm run build
cd "$SCRIPT_DIR"
echo -e "${GREEN}      Shared package built!${NC}"
echo

# Step 3: Build UI
if [ "$SKIP_UI" = false ]; then
    echo -e "${YELLOW}[3/5] Building UI package...${NC}"
    cd packages/ui
    npm run build
    cd "$SCRIPT_DIR"
    echo -e "${GREEN}      UI build complete!${NC}"
    echo
else
    echo -e "${YELLOW}[3/5] Skipping UI build${NC}"
    echo
fi

# Step 4: Build CLI
if [ "$SKIP_CLI" = false ]; then
    echo -e "${YELLOW}[4/5] Building CLI package...${NC}"
    cd packages/cli
    echo -e "      Type checking..."
    npm run typecheck
    echo -e "      Bundling..."
    npm run build
    cd "$SCRIPT_DIR"
    echo -e "${GREEN}      CLI build complete!${NC}"
    echo
else
    echo -e "${YELLOW}[4/5] Skipping CLI build${NC}"
    echo
fi

# Step 5: Copy UI dist to CLI's ui-dist folder
# This is CRITICAL - the CLI serve command looks for ui-dist in its dist folder
echo -e "${YELLOW}[5/5] Syncing UI assets to CLI...${NC}"
if [ -d "packages/ui/dist" ]; then
    mkdir -p packages/cli/dist/ui-dist
    rm -rf packages/cli/dist/ui-dist/*
    cp -r packages/ui/dist/* packages/cli/dist/ui-dist/
    echo -e "${GREEN}      UI assets synced to CLI!${NC}"
else
    echo -e "${RED}      Error: UI dist not found. Run without --skip-ui first.${NC}"
    exit 1
fi
echo

# Verify build
echo -e "${CYAN}Build verification:${NC}"
if [ -f "packages/cli/dist/ui-dist/index.html" ]; then
    JS_FILE=$(grep -o 'index-[A-Za-z0-9]*\.js' packages/cli/dist/ui-dist/index.html | head -1)
    CSS_FILE=$(grep -o 'index-[A-Za-z0-9]*\.css' packages/cli/dist/ui-dist/index.html | head -1)
    echo -e "  ${GREEN}✓${NC} UI HTML: packages/cli/dist/ui-dist/index.html"
    echo -e "  ${GREEN}✓${NC} JS:      packages/cli/dist/ui-dist/assets/${JS_FILE}"
    echo -e "  ${GREEN}✓${NC} CSS:     packages/cli/dist/ui-dist/assets/${CSS_FILE}"
else
    echo -e "  ${RED}✗${NC} UI dist not found!"
    exit 1
fi

if [ -f "packages/cli/dist/index.js" ]; then
    echo -e "  ${GREEN}✓${NC} CLI:     packages/cli/dist/index.js"
else
    echo -e "  ${RED}✗${NC} CLI entry point not found!"
    exit 1
fi
echo

# Build packages if requested
if [ "$BUILD_RPM" = true ] || [ "$BUILD_DEB" = true ]; then
    echo -e "${CYAN}Building distribution packages...${NC}"
    echo

    if [ "$BUILD_RPM" = true ] && [ "$BUILD_DEB" = true ]; then
        ./scripts/build-packages.sh all
    elif [ "$BUILD_RPM" = true ]; then
        ./scripts/build-packages.sh rpm
    elif [ "$BUILD_DEB" = true ]; then
        ./scripts/build-packages.sh deb
    fi
    echo
fi

# Publish to npm if requested
if [ "$PUBLISH" = true ]; then
    echo -e "${CYAN}Publishing to npm...${NC}"
    echo

    # Bump CLI version
    cd packages/cli
    OLD_VERSION=$(node -p "require('./package.json').version")
    npm version "$VERSION_BUMP" --no-git-tag-version
    NEW_VERSION=$(node -p "require('./package.json').version")
    echo -e "  Version: ${YELLOW}$OLD_VERSION${NC} → ${GREEN}$NEW_VERSION${NC}"

    # Build with esbuild (bundles everything)
    echo -e "  Building bundle..."
    node esbuild.config.js

    # Copy UI dist
    rm -rf dist/ui-dist
    cp -r ../ui/dist dist/ui-dist
    rm -f dist/ui-dist/assets/*.map
    rm -rf dist/ui-dist/dist  # Remove nested dist if exists

    # Publish
    echo -e "  Publishing @demoscript/cli@$NEW_VERSION..."
    npm publish --access public

    cd "$SCRIPT_DIR"
    echo -e "${GREEN}  Published @demoscript/cli@$NEW_VERSION${NC}"
    echo
fi

# Install globally if requested
if [ "$INSTALL" = true ]; then
    echo -e "${CYAN}Installing CLI globally...${NC}"
    echo

    cd packages/cli

    # Build with esbuild if not already built
    if [ ! -f "dist/bundle.cjs" ]; then
        echo -e "  Building bundle..."
        node esbuild.config.js
    fi

    # Ensure UI dist is present
    if [ ! -d "dist/ui-dist" ]; then
        rm -rf dist/ui-dist
        cp -r ../ui/dist dist/ui-dist
        rm -f dist/ui-dist/assets/*.map
        rm -rf dist/ui-dist/dist
    fi

    # Install (local by default, global with -g)
    if [ "$INSTALL_GLOBAL" = true ]; then
        NPM_PREFIX=$(npm config get prefix)
        if [ -w "$NPM_PREFIX/lib" ] 2>/dev/null; then
            echo -e "  Running: npm install -g . (to $NPM_PREFIX)"
            npm install -g .
        else
            echo -e "  Running: sudo npm install -g . (to $NPM_PREFIX)"
            sudo npm install -g .
        fi
        cd "$SCRIPT_DIR"
        VERSION=$(demoscript --version 2>/dev/null || echo "unknown")
        echo -e "${GREEN}  Installed demoscript@$VERSION globally${NC}"
    else
        # Local install to ~/.local
        LOCAL_PREFIX="$HOME/.local"
        mkdir -p "$LOCAL_PREFIX/bin" "$LOCAL_PREFIX/lib"
        echo -e "  Running: npm install -g . --prefix $LOCAL_PREFIX"
        npm install -g . --prefix "$LOCAL_PREFIX"
        cd "$SCRIPT_DIR"
        VERSION=$("$LOCAL_PREFIX/bin/demoscript" --version 2>/dev/null || echo "unknown")
        echo -e "${GREEN}  Installed demoscript@$VERSION to $LOCAL_PREFIX${NC}"
        echo -e "  ${YELLOW}Ensure $LOCAL_PREFIX/bin is in your PATH${NC}"
    fi
    echo
fi

echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Build Complete!             ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo

# Start server if requested
if [ "$SERVE" = true ]; then
    echo -e "${CYAN}Starting dev server...${NC}"
    echo "Use Ctrl+C to stop"
    echo

    # Parse serve args - first non-flag arg is the demo path
    DEMO_PATH=""
    EXTRA_ARGS=()
    HAS_PORT=false
    HAS_HOST=false

    for arg in "${SERVE_ARGS[@]}"; do
        if [[ "$arg" == --port* ]] || [[ "$arg" == -p ]]; then
            HAS_PORT=true
            EXTRA_ARGS+=("$arg")
        elif [[ "$arg" == -H ]] || [[ "$arg" == --host ]]; then
            HAS_HOST=true
            EXTRA_ARGS+=("$arg")
        elif [[ "$arg" == -* ]]; then
            EXTRA_ARGS+=("$arg")
        elif [ -z "$DEMO_PATH" ]; then
            DEMO_PATH="$arg"
        else
            EXTRA_ARGS+=("$arg")
        fi
    done

    # Default demo path
    DEMO_PATH="${DEMO_PATH:-examples/feature-showcase}"

    # Add default port and host if not specified
    if [ "$HAS_PORT" = false ]; then
        EXTRA_ARGS+=(--port 3001)
    fi
    if [ "$HAS_HOST" = false ]; then
        EXTRA_ARGS+=(-H 0.0.0.0)
    fi

    if [ -d "$DEMO_PATH" ] || [ -f "$DEMO_PATH" ]; then
        echo -e "  Demo: ${CYAN}$DEMO_PATH${NC}"
        echo -e "  Args: ${CYAN}${EXTRA_ARGS[*]}${NC}"
        echo
        node packages/cli/dist/index.js serve "$DEMO_PATH" "${EXTRA_ARGS[@]}"
    else
        echo -e "${RED}Demo not found: $DEMO_PATH${NC}"
        echo
        echo "Usage: ./build.sh --serve [demo-path] [serve-options]"
        echo "Examples:"
        echo "  ./build.sh --serve"
        echo "  ./build.sh --serve ~/my-demo"
        echo "  ./build.sh --serve ~/my-demo --port 8080"
        echo "  ./build.sh --serve --tunnel"
        exit 1
    fi
fi
