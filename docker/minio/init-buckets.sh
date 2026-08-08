#!/bin/sh
# Wait for MinIO, then create and configure the buckets

sleep 5

mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"

mc mb --ignore-existing local/auction-assets
mc mb --ignore-existing local/auction-avatars
mc mb --ignore-existing local/auction-videos

# listing images — public read
mc anonymous set download local/auction-assets

# avatars — public read
mc anonymous set download local/auction-avatars

# marketing video — public read
mc anonymous set download local/auction-videos

echo "MinIO buckets initialised"