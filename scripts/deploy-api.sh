#!/usr/bin/env bash
# Deploy Honey Cosmetics API on the Hetzner host without wiping product images.
# Run on the server as root (or via: ssh honey-prod 'bash -s' < scripts/deploy-api.sh).
set -euo pipefail

SOURCE_ROOT="${SOURCE_ROOT:-/opt/Honey_Cosmetics}"
PUBLISH_DIR="${PUBLISH_DIR:-/opt/honey-api}"
BUILD_DIR="${BUILD_DIR:-/tmp/honey-api-build}"
IMAGES_STORE="${IMAGES_STORE:-$SOURCE_ROOT/backend/src/HoneyCosmetics.Api/images}"
DOTNET_BIN="${DOTNET_BIN:-/root/.dotnet/dotnet}"
PROJECT="$SOURCE_ROOT/backend/src/HoneyCosmetics.Api/HoneyCosmetics.Api.csproj"

if [[ ! -f "$PROJECT" ]]; then
  echo "Project not found: $PROJECT" >&2
  exit 1
fi

mkdir -p "$IMAGES_STORE/thumbs" "$IMAGES_STORE/medium"

echo "==> Publishing API to $BUILD_DIR"
rm -rf "$BUILD_DIR"
"$DOTNET_BIN" publish "$PROJECT" -c Release -o "$BUILD_DIR"

echo "==> Syncing binaries to $PUBLISH_DIR (excluding images/)"
mkdir -p "$PUBLISH_DIR"
rsync -a --delete \
  --exclude 'images/' \
  --exclude 'images' \
  "$BUILD_DIR/" "$PUBLISH_DIR/"

# Keep a persistent image store outside the publish tree (symlink).
if [[ -L "$PUBLISH_DIR/images" ]]; then
  ln -sfn "$IMAGES_STORE" "$PUBLISH_DIR/images"
elif [[ -d "$PUBLISH_DIR/images" && ! -L "$PUBLISH_DIR/images" ]]; then
  echo "==> Migrating real images/ dir into persistent store"
  rsync -a "$PUBLISH_DIR/images/" "$IMAGES_STORE/"
  rm -rf "$PUBLISH_DIR/images"
  ln -sfn "$IMAGES_STORE" "$PUBLISH_DIR/images"
else
  ln -sfn "$IMAGES_STORE" "$PUBLISH_DIR/images"
fi

# Prefer explicit root path so even a broken symlink cannot empty the store.
if [[ -f /etc/honey-api.env ]] && ! grep -q '^Images__RootPath=' /etc/honey-api.env; then
  echo "Images__RootPath=$IMAGES_STORE" >> /etc/honey-api.env
  echo "==> Added Images__RootPath to /etc/honey-api.env"
fi

echo "==> Restarting honey-api"
systemctl restart honey-api
sleep 2
systemctl is-active honey-api
curl -sS -o /dev/null -w "api:%{http_code}\n" --max-time 10 \
  "http://127.0.0.1:5128/api/products?page=1&pageSize=1" || true

echo "==> Done. Image store: $IMAGES_STORE (files: $(find "$IMAGES_STORE" -type f | wc -l))"
