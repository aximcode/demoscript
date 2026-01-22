#!/bin/bash
#
# Capture Visual Editor screenshots and create animated GIF
#
# Usage: ./scripts/capture-editor-gif.sh
#
# Requires:
# - chromium or google-chrome
# - xdotool (for keyboard/mouse control)
# - import (ImageMagick, for screenshots)
# - ffmpeg (for GIF creation)
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FRAMES_DIR="$PROJECT_ROOT/assets/builder-frames"
OUTPUT_GIF="$PROJECT_ROOT/assets/builder.gif"
PORT=3002
WIDTH=1200
HEIGHT=800
FPS=0.5  # 2 seconds per frame

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log() { echo -e "${CYAN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }

# Check dependencies
check_deps() {
    log "Checking dependencies..."
    command -v xdotool >/dev/null 2>&1 || error "xdotool not found. Install with: dnf install xdotool"
    command -v import >/dev/null 2>&1 || error "ImageMagick not found. Install with: dnf install ImageMagick"
    command -v ffmpeg >/dev/null 2>&1 || error "ffmpeg not found. Install with: dnf install ffmpeg"

    # Find browser
    if command -v chromium-browser >/dev/null 2>&1; then
        BROWSER="chromium-browser"
    elif command -v chromium >/dev/null 2>&1; then
        BROWSER="chromium"
    elif command -v google-chrome >/dev/null 2>&1; then
        BROWSER="google-chrome"
    else
        error "Chrome/Chromium not found"
    fi
    success "All dependencies found (browser: $BROWSER)"
}

# Start builder server
start_server() {
    log "Starting builder server on port $PORT..."
    cd "$PROJECT_ROOT"
    node packages/cli/dist/index.js builder --port "$PORT" --no-open &
    SERVER_PID=$!
    sleep 5

    if ! kill -0 $SERVER_PID 2>/dev/null; then
        error "Failed to start builder server"
    fi
    success "Server started (PID: $SERVER_PID)"
}

# Stop builder server
stop_server() {
    if [ -n "$SERVER_PID" ]; then
        log "Stopping server..."
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
    fi
    if [ -n "$BROWSER_PID" ]; then
        log "Closing browser..."
        kill $BROWSER_PID 2>/dev/null || true
    fi
}

# Cleanup on exit
cleanup() {
    stop_server
}
trap cleanup EXIT

# Open browser and get window ID
open_browser() {
    log "Opening browser..."
    $BROWSER --new-window --window-size=${WIDTH},${HEIGHT} "http://localhost:$PORT/builder" &
    BROWSER_PID=$!
    sleep 3

    # Find the browser window
    WINDOW_ID=$(xdotool search --name "DemoScript Builder" | head -1)
    if [ -z "$WINDOW_ID" ]; then
        WINDOW_ID=$(xdotool search --name "Builder" | head -1)
    fi
    if [ -z "$WINDOW_ID" ]; then
        WINDOW_ID=$(xdotool search --name "localhost" | head -1)
    fi

    if [ -z "$WINDOW_ID" ]; then
        error "Could not find browser window"
    fi

    # Focus and resize window
    xdotool windowactivate --sync $WINDOW_ID
    xdotool windowsize $WINDOW_ID $WIDTH $HEIGHT
    sleep 1

    success "Browser opened (Window ID: $WINDOW_ID)"
}

# Capture a screenshot
FRAME_NUM=0
capture() {
    local label="$1"
    local filename=$(printf "frame-%03d.png" $FRAME_NUM)

    xdotool windowactivate --sync $WINDOW_ID
    sleep 0.5

    import -window $WINDOW_ID "$FRAMES_DIR/$filename"
    echo "  Frame $FRAME_NUM: $label"
    ((FRAME_NUM++))
}

# Click at coordinates relative to window
click() {
    local x=$1
    local y=$2
    xdotool windowactivate --sync $WINDOW_ID
    xdotool mousemove --window $WINDOW_ID $x $y
    sleep 0.2
    xdotool click 1
    sleep 0.5
}

# Type text
type_text() {
    local text="$1"
    xdotool type --delay 50 "$text"
    sleep 0.3
}

# Press key
press_key() {
    local key="$1"
    xdotool key "$key"
    sleep 0.3
}

# Create frames directory
setup_frames_dir() {
    log "Setting up frames directory..."
    rm -rf "$FRAMES_DIR"
    mkdir -p "$FRAMES_DIR"
}

# Capture builder workflow
capture_workflow() {
    log "Capturing builder workflow..."

    # Frame 1: Initial state (Custom mode)
    sleep 2
    capture "Initial - Custom mode"

    # Frame 2: Click OpenAPI tab (approximately at x=940, y=32 based on layout)
    log "Switching to OpenAPI mode..."
    click 940 32
    sleep 1
    capture "OpenAPI mode selected"

    # Frame 3: Enter OpenAPI URL
    log "Entering OpenAPI URL..."
    # Click on the URL input field (approximately at x=400, y=150)
    click 400 150
    sleep 0.5
    # Clear existing text and type new URL
    press_key "ctrl+a"
    type_text "/sandbox/openapi.json"
    press_key "Return"
    sleep 2
    capture "OpenAPI URL entered"

    # Frame 4: Wait for spec to load and show endpoints
    sleep 2
    capture "Endpoints loaded"

    # Frame 5: Click on an endpoint (first one in list, approximately y=250)
    log "Selecting endpoint..."
    click 400 280
    sleep 1
    capture "Endpoint selected"

    # Frame 6: Click Execute button
    log "Executing request..."
    # Execute button should be visible after selecting endpoint
    click 400 500
    sleep 2
    capture "Request executed"

    # Frame 7: Click Add to Demo button
    log "Adding to demo..."
    click 600 550
    sleep 1
    capture "Step added to demo"

    # Frame 8: Show the steps panel (right side)
    sleep 1
    capture "Demo steps panel"

    success "Captured $FRAME_NUM frames"
}

# Create GIF from frames
create_gif() {
    log "Creating GIF..."

    # Generate palette for better colors
    ffmpeg -y -framerate $FPS -i "$FRAMES_DIR/frame-%03d.png" \
        -vf "fps=$FPS,scale=$WIDTH:-1:flags=lanczos,palettegen=stats_mode=diff" \
        "$FRAMES_DIR/palette.png" 2>/dev/null

    # Create GIF with palette
    ffmpeg -y -framerate $FPS -i "$FRAMES_DIR/frame-%03d.png" -i "$FRAMES_DIR/palette.png" \
        -lavfi "fps=$FPS,scale=$WIDTH:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5" \
        -loop 0 "$OUTPUT_GIF" 2>/dev/null

    # Get file size
    SIZE=$(du -h "$OUTPUT_GIF" | cut -f1)
    success "GIF created: $OUTPUT_GIF ($SIZE)"
}

# Main
main() {
    echo ""
    echo "=========================================="
    echo "  DemoScript Builder GIF Capture"
    echo "=========================================="
    echo ""

    check_deps
    setup_frames_dir
    start_server
    open_browser
    capture_workflow
    create_gif

    echo ""
    success "Done! Builder GIF saved to assets/builder.gif"
}

main "$@"
