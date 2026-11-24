#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Sitekit — deploy on the VPS (called over SSH by .github/workflows/sitekit-update.yml)
#
# Usage: bash .github/sitekit/deploy.sh <version-tag> [assets.tgz]
#
#   1. maintenance mode
#   2. database backup (spatie/laravel-backup)
#   3. git reset to origin/<branch> (the merged + tested code)
#   4. composer install, unpack prebuilt public/build
#   5. migrate, optimize, queue restart
#   6. sitekit:health-check
#   7. back online
#
# On any error: code + assets are restored to the previous commit and the site is
# brought back up. Migrations are NOT rolled back automatically — restore the
# database from the backup taken in step 2 if a migration broke the schema.
#
# Env (optional): SITEKIT_BRANCH (default main), PHP_BIN, COMPOSER_BIN
# Never touched: .env, storage/, public/storage, database data.
# ─────────────────────────────────────────────────────────────────────────────

# Everything lives inside main() so bash parses the whole script before running it
# (this file itself is replaced by the git reset below).
main() {
  set -Eeuo pipefail

  local version="${1:?version tag required}"
  local assets="${2:-}"
  local branch="${SITEKIT_BRANCH:-main}"
  local php="${PHP_BIN:-php}"
  local composer="${COMPOSER_BIN:-composer}"

  local app_dir
  app_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  cd "$app_dir"

  local previous_commit
  previous_commit="$(git rev-parse HEAD)"
  local assets_backup="$app_dir/storage/app/sitekit-build-previous"
  local storefront_backup="$app_dir/storage/app/sitekit-storefront-previous"

  log() { echo "[sitekit-deploy $(date '+%H:%M:%S')] $*"; }

  rollback() {
    local exit_code=$?
    trap - ERR
    set +e
    log "FAILED (exit $exit_code) — rolling back to $previous_commit"
    git reset --hard "$previous_commit"
    "$composer" install --no-dev --no-interaction --prefer-dist --optimize-autoloader
    if [ -d "$assets_backup" ]; then
      rm -rf public/build && cp -a "$assets_backup" public/build
    fi
    if [ -d "$storefront_backup" ]; then
      rm -rf public/storefront && cp -a "$storefront_backup" public/storefront
    fi
    "$php" artisan optimize:clear
    "$php" artisan optimize
    "$php" artisan up
    log "Rolled back. Check storage/logs and the database backup if migrations ran."
    exit "$exit_code"
  }
  trap rollback ERR

  log "Deploying $version (branch $branch) in $app_dir"

  "$php" artisan down --retry=30 || true

  log "Backing up database"
  "$php" artisan backup:run --only-db --disable-notifications || log "WARNING: database backup failed — continuing"

  log "Fetching code"
  git fetch origin "$branch" --tags
  git reset --hard "origin/$branch"

  log "Installing PHP dependencies"
  "$composer" install --no-dev --no-interaction --prefer-dist --optimize-autoloader

  if [ -n "$assets" ] && [ -f "$assets" ]; then
    log "Installing prebuilt frontend assets"
    rm -rf "$assets_backup" "$storefront_backup"
    if [ -d public/build ]; then cp -a public/build "$assets_backup"; fi
    rm -rf public/build
    # The archive contains build/ and, for projects with their own frontend, storefront/.
    if tar -tzf "$assets" | grep -q '^storefront/'; then
      if [ -d public/storefront ]; then cp -a public/storefront "$storefront_backup"; fi
      rm -rf public/storefront
    fi
    tar -xzf "$assets" -C public
    rm -f "$assets"
  fi

  log "Running migrations"
  "$php" artisan migrate --force

  log "Optimizing"
  "$php" artisan optimize:clear
  "$php" artisan optimize
  "$php" artisan queue:restart || true

  log "Health check"
  "$php" artisan sitekit:health-check

  trap - ERR
  "$php" artisan up
  log "Deployed $version ($(cat VERSION 2>/dev/null || echo '?'))"
}

main "$@"
exit $?
