# Stage 1: Build โค้ด React ให้กลายเป็นไฟล์ HTML/CSS/JS ธรรมดา
FROM node:22-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./

# ✅ เพิ่มบรรทัดนี้เข้าไปเหมือนกัน
RUN echo "only-built-dependencies=esbuild" > .npmrc

RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# Stage 2: เอาไฟล์ที่ Build เสร็จแล้วมาเสิร์ฟผ่าน Nginx (เว็บเซิร์ฟเวอร์ขนาดเล็ก)
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]