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
#
# Options:
#   --clean      Clean build artifacts before building
#   --serve      Start dev server after building (args after this are passed to serve)
#   --rpm        Build RPM package after building
#   --deb        Build DEB package after building
#   --packages   Build all packages (RPM + DEB) after building
#   --skip-ui    Skip UI build (use existing)
#   --skip-cli   Skip CLI build (use existing)
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
    echo -e "${YELLOW}[1/4] Cleaning build artifacts...${NC}"
    rm -rf packages/ui/dist
    rm -rf packages/cli/dist
    rm -rf dist
    echo -e "${GREEN}      Cleaned!${NC}"
    echo
fi

# Step 2: Build UI
if [ "$SKIP_UI" = false ]; then
    echo -e "${YELLOW}[2/4] Building UI package...${NC}"
    cd packages/ui
    npm run build
    cd "$SCRIPT_DIR"
    echo -e "${GREEN}      UI build complete!${NC}"
    echo
else
    echo -e "${YELLOW}[2/4] Skipping UI build${NC}"
    echo
fi

# Step 3: Build CLI
if [ "$SKIP_CLI" = false ]; then
    echo -e "${YELLOW}[3/4] Building CLI package...${NC}"
    cd packages/cli
    npm run build
    cd "$SCRIPT_DIR"
    echo -e "${GREEN}      CLI build complete!${NC}"
    echo
else
    echo -e "${YELLOW}[3/4] Skipping CLI build${NC}"
    echo
fi

# Step 4: Copy UI dist to CLI's ui-dist folder
# This is CRITICAL - the CLI serve command looks for ui-dist in its dist folder
echo -e "${YELLOW}[4/4] Syncing UI assets to CLI...${NC}"
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

if [ -f "packages/cli/dist/bundle.cjs" ]; then
    echo -e "  ${GREEN}✓${NC} CLI:     packages/cli/dist/bundle.cjs"
else
    echo -e "  ${RED}✗${NC} CLI bundle not found!"
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
