#!/usr/bin/env bash
#
# PipPaper Desktop App Build Script
#
# Builds native desktop applications for macOS, Windows, and Linux
# using `deno desktop` (experimental, requires Deno 2.9+).
#
# Usage:
#   ./desktop/build.sh              # build all platforms
#   ./desktop/build.sh macos        # build macOS only (universal)
#   ./desktop/build.sh windows      # build Windows only
#   ./desktop/build.sh linux        # build Linux only (x64 + arm64)
#
# Prerequisites:
#   - Deno 2.9+ (deno upgrade)
#   - No other toolchain needed — deno desktop cross-compiles
#
set -euo pipefail

cd "$(dirname "$0")/.."

OUT_DIR="desktop/dist"
ENTRY="main.ts"
INCLUDES="--include deno.json"
PERMS="-A --unstable-kv"
COMMON_FLAGS="--no-check $INCLUDES $PERMS"

mkdir -p "$OUT_DIR"

build_macos() {
  echo "🍎 Building macOS (ARM64 + x64)..."
  deno desktop $COMMON_FLAGS --icon desktop/icon.icns \
    --target aarch64-apple-darwin \
    --output "$OUT_DIR/PipPaper-macOS-arm64.dmg" \
    $ENTRY
  deno desktop $COMMON_FLAGS --icon desktop/icon.icns \
    --target x86_64-apple-darwin \
    --output "$OUT_DIR/PipPaper-macOS-x64.dmg" \
    $ENTRY
  echo "✅ macOS done"
}

build_windows() {
  echo "🪟 Building Windows (x64)..."
  deno desktop $COMMON_FLAGS --icon desktop/icon.ico \
    --target x86_64-pc-windows-msvc \
    --output "$OUT_DIR/PipPaper-Windows-x64.msi" \
    $ENTRY
  echo "✅ Windows done"
}

build_linux() {
  echo "🐧 Building Linux (x64 + ARM64)..."
  deno desktop $COMMON_FLAGS --icon desktop/icon.png \
    --target x86_64-unknown-linux-gnu \
    --output "$OUT_DIR/PipPaper-Linux-x64.AppImage" \
    $ENTRY
  deno desktop $COMMON_FLAGS --icon desktop/icon.png \
    --target aarch64-unknown-linux-gnu \
    --output "$OUT_DIR/PipPaper-Linux-arm64.AppImage" \
    $ENTRY
  echo "✅ Linux done"
}

case "${1:-all}" in
  macos)   build_macos ;;
  windows) build_windows ;;
  linux)   build_linux ;;
  all)
    build_macos
    build_windows
    build_linux
    ;;
  *)
    echo "Usage: $0 [macos|windows|linux|all]"
    exit 1
    ;;
esac

echo ""
echo "📦 Build complete. Artifacts in $OUT_DIR/:"
ls -lh "$OUT_DIR"/ 2>/dev/null || echo "  (no artifacts)"
