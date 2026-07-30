FROM node:22-alpine

WORKDIR /app

# ก๊อปปี้แค่ package.json มาก่อน
COPY package.json ./

# ใช้ npm ธรรมดาติดตั้งแทน pnpm (ตัดปัญหาจุกจิกทั้งหมด)
RUN npm install

# ก๊อปปี้โค้ดทั้งหมดตามมา
COPY . .

EXPOSE 3000

# เปลี่ยนคำสั่งรันเป็น npm
CMD ["npm", "run", "dev"]