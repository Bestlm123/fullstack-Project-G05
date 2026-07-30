FROM node:22-alpine

WORKDIR /app

# เปิดใช้งาน pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# ก๊อปปี้ไฟล์จัดการแพ็กเกจมาก่อนเพื่อติดตั้ง
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ก๊อปปี้โค้ดทั้งหมดตามมา
COPY . .

EXPOSE 3000

# คำสั่งรันเซิร์ฟเวอร์
CMD ["pnpm", "run", "dev"]