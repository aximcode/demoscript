#!/bin/bash
# Build RPM and DEB packages for demoscript
#
# Prerequisites:
#   RPM: rpmbuild (dnf install rpm-build)
#   DEB: dpkg-buildpackage (apt install dpkg-dev debhelper)
#
# Usage:
#   ./scripts/build-packages.sh [rpm|deb|all]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Get version from package.json
VERSION=$(node -p "require('./packages/cli/package.json').version")
PKG_NAME="demoscript"

echo "Building $PKG_NAME v$VERSION"
echo

# Output directory
mkdir -p "$PROJECT_DIR/dist/packages"

BUILD_TYPE="${1:-all}"

build_rpm() {
    echo "Building RPM..."

    # Check for rpmbuild
    if ! command -v rpmbuild &> /dev/null; then
        echo "Error: rpmbuild not found. Install with: dnf install rpm-build"
        exit 1
    fi

    # Setup rpmbuild directories
    mkdir -p ~/rpmbuild/{BUILD,RPMS,SOURCES,SPECS,SRPMS}

    # Create source tarball
    TARBALL="${PKG_NAME}-${VERSION}.tar.gz"
    git archive --format=tar.gz --prefix="${PKG_NAME}-${VERSION}/" HEAD > ~/rpmbuild/SOURCES/"$TARBALL"

    # Copy spec file with version substitution
    sed "s/^Version:.*/Version:        ${VERSION}/" packaging/rpm/demoscript.spec > ~/rpmbuild/SPECS/demoscript.spec

    # Build RPM
    rpmbuild -ba ~/rpmbuild/SPECS/demoscript.spec

    # Copy to dist
    cp ~/rpmbuild/RPMS/noarch/${PKG_NAME}-${VERSION}-*.noarch.rpm "$PROJECT_DIR/dist/packages/"

    echo "Created: dist/packages/${PKG_NAME}-${VERSION}-*.noarch.rpm"
}

build_deb() {
    echo "Building DEB..."

    # Check for dpkg-buildpackage
    if ! command -v dpkg-buildpackage &> /dev/null; then
        echo "Error: dpkg-buildpackage not found. Install with: apt install dpkg-dev debhelper"
        exit 1
    fi

    # Create build directory
    BUILD_DIR=$(mktemp -d)
    trap "rm -rf $BUILD_DIR" EXIT

    # Export source to build directory
    git archive --format=tar HEAD | tar -x -C "$BUILD_DIR"

    # Copy debian directory
    cp -r packaging/deb/debian "$BUILD_DIR/"

    # Update changelog version
    sed -i "s/^demoscript (.*)/demoscript (${VERSION}-1)/" "$BUILD_DIR/debian/changelog"

    # Make rules executable
    chmod +x "$BUILD_DIR/debian/rules"

    # Build
    cd "$BUILD_DIR"
    dpkg-buildpackage -us -uc -b

    # Copy to dist
    cp ../${PKG_NAME}_${VERSION}-1_all.deb "$PROJECT_DIR/dist/packages/"

    echo "Created: dist/packages/${PKG_NAME}_${VERSION}-1_all.deb"
}

case "$BUILD_TYPE" in
    rpm)
        build_rpm
        ;;
    deb)
        build_deb
        ;;
    all)
        build_rpm
        echo
        build_deb
        ;;
    *)
        echo "Usage: $0 [rpm|deb|all]"
        exit 1
        ;;
esac

echo
echo "Done! Packages are in dist/packages/"
ls -lh "$PROJECT_DIR/dist/packages/" 2>/dev/null || true
