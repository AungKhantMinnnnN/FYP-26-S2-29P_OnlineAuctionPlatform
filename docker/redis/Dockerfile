FROM redis:7-alpine

LABEL description="Auction platform Redis"

COPY init-redis.sh /usr/local/bin/init-redis.sh
RUN chmod +x /usr/local/bin/init-redis.sh

EXPOSE 6379