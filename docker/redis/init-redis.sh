#!/bin/sh
# Creates the Redis Stream consumer group for the bidding engine
# on first startup after Redis is ready

sleep 2

redis-cli -a "$REDIS_PASSWORD" \
  XGROUP CREATE bids-stream bidding-engine-group $ MKSTREAM 2>/dev/null || true

echo "Redis stream and consumer group initialised"