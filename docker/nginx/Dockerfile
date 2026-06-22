FROM node:20-alpine AS frontend-build

WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./

ARG VITE_API_URL=/v1.0.0
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM nginx:alpine

LABEL description="Auction platform Nginx reverse proxy + static frontend"

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/dist /usr/share/nginx/html

EXPOSE 80
