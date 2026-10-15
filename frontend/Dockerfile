# Stage 1: Builder
FROM node:22-alpine as builder
WORKDIR /app
COPY package.json ./
RUN npm install -g npm@latest && \
    rm -rf package-lock.json node_modules && \
    npm install --no-package-lock
COPY . .

# ดึงค่า URL มาฝังตอน Build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2: Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]