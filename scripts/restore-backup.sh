#!/bin/bash
# DBMartNG Database Restore Script
# Usage: ./scripts/restore-backup.sh <backup-file>
#
# Downloads and restores a database backup from Cloudflare R2.
# Requires: aws-cli configured with R2 credentials, pg_restore

set -euo pipefail

R2_ENDPOINT="${R2_ENDPOINT:-}"
R2_BUCKET="${R2_BACKUP_BUCKET:-}"
BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file>"
  echo ""
  echo "Examples:"
  echo "  $0 dbmartng_2026-01-15_02-00-00.dump"
  echo "  $0 latest    # Uses the most recent backup"
  exit 1
fi

if [ -z "$R2_ENDPOINT" ] || [ -z "$R2_BUCKET" ]; then
  echo "Error: R2_ENDPOINT and R2_BACKUP_BUCKET must be set"
  exit 1
fi

if [ "$BACKUP_FILE" = "latest" ]; then
  echo "Fetching latest backup..."
  BACKUP_FILE=$(aws s3 ls "s3://${R2_BUCKET}/backups/" \
    --endpoint-url "${R2_ENDPOINT}" \
    --region auto | sort -r | head -1 | awk '{print $4}')
  echo "Latest backup: ${BACKUP_FILE}"
fi

echo "Downloading backup from R2..."
aws s3 cp "s3://${R2_BUCKET}/backups/${BACKUP_FILE}" ./restore_temp.dump \
  --endpoint-url "${R2_ENDPOINT}" \
  --region auto

echo "Restoring database..."
echo "WARNING: This will overwrite the current database!"
read -p "Enter the target database URL: " DB_URL

pg_restore \
  --dbname="$DB_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --verbose \
  ./restore_temp.dump

echo "Cleaning up..."
rm ./restore_temp.dump

echo "Restore complete!"
