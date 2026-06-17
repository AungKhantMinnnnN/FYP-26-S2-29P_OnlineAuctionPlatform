#!/bin/sh
# Waits for MinIO then creates the auction-assets bucket

sleep 5

mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"

mc mb --ignore-existing local/auction-assets
mc mb --ignore-existing local/auction-avatars

# listing images — public read
mc anonymous set download local/auction-assets

# avatars — public read
mc anonymous set download local/auction-avatars

echo "MinIO buckets initialised"