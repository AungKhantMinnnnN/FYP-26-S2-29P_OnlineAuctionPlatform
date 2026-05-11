FROM postgres:16-alpine

LABEL description="Auction platform PostgreSQL"

COPY init.sql /docker-entrypoint-initdb.d/01-init.sql

EXPOSE 5432