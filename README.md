# 🚀 Project Setup Guide

คู่มือสำหรับติดตั้งและรันระบบ **Backend + Frontend** สำหรับการพัฒนาในเครื่อง Local

---

## 📋 Prerequisites

ก่อนเริ่มต้น ตรวจสอบว่าเครื่องติดตั้งสิ่งต่อไปนี้แล้ว

- [Node.js](https://nodejs.org/)
- [pnpm](https://pnpm.io/)
- PostgreSQL Database
- Git

---

# ⚙️ 1. Backend Setup

### 1.1 Install Dependencies

เปิด Terminal ที่ root ของโปรเจกต์ แล้วรัน:

```bash
pnpm install
```

---

### 1.2 Configure Environment Variables

สร้างไฟล์ `.env` ภายในโฟลเดอร์ `backend`

```text
backend/
└── .env
```

จากนั้นเพิ่ม configuration ดังนี้:

```env
DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<database>
PORT=8000

CMU_OAUTH_CLIENT_ID=<your-client-id>
CMU_OAUTH_CLIENT_SECRET=<your-client-secret>
CMU_OAUTH_CALLBACK_URL=http://localhost:8000/api/auth/callback

SESSION_SECRET=<your-session-secret>
```

> ⚠️ **Security Warning**
>
> ห้าม commit ไฟล์ `.env` ขึ้น GitHub เนื่องจากอาจมี Database Password, OAuth Secret และ Session Secret
>
> แนะนำให้เพิ่ม `.env` ลงใน `.gitignore`

```gitignore
.env
.env.*
```

---

### 1.3 Start Database with Docker

สำหรับผู้ที่ใช้ Docker ในการรัน PostgreSQL Database ให้ทำการเปิด Container ก่อนการอัปเดต Schema

```bash
docker compose up -d
```
---

### 1.4 Update Database Schema

รันคำสั่ง Migration / Schema Push:

```bash
pnpm run db:push
```

หากระบบถาม:

```text
Do you want to truncate users table?
```

ให้เลือก:

```text
No
```

เพื่อเพิ่ม constraint โดย **ไม่ลบข้อมูลที่มีอยู่ใน `users` table**

> ⚠️ **Important:** อย่าเลือก `Yes` หากไม่ต้องการให้ข้อมูลใน `users` table ถูกลบ

---

### 1.5 Start Backend Server

รัน:

```bash
pnpm run dev
```

หากทำงานสำเร็จ จะเห็นข้อความประมาณ:

```text
Server is running smoothly on port 8000
```

Backend จะสามารถเข้าถึงได้ที่:

```text
http://localhost:8000
```

---

# 🎨 2. Frontend Setup

เปิด **Terminal ใหม่** โดยให้ Backend ยังคงทำงานอยู่

จากนั้นเข้าไปที่โฟลเดอร์ `frontend`:

```bash
cd frontend
```

---

### 2.1 Install Dependencies

```bash
pnpm install
```

---

### 2.2 Start Frontend Server

```bash
pnpm run dev
```

หากทำงานสำเร็จ ระบบจะแสดง URL ประมาณ:

```text
http://localhost:5173
```

สามารถเปิดเว็บไซต์ผ่าน:

**http://localhost:5173**

---

# 🖥️ 3. Running the Project

เมื่อ Setup เสร็จแล้ว ควรเปิด Terminal ไว้ **2 หน้าต่าง**

### Terminal 1 — Backend

```bash
pnpm run dev
```

> Backend → `http://localhost:8000`

### Terminal 2 — Frontend

```bash
cd frontend
pnpm run dev
```

> Frontend → `http://localhost:5173`

---

# 📁 Project Structure

```text
project-root/
│
├── backend/
│   ├── .env
│   └── ...
│
├── frontend/
│   └── ...
│
├── package.json
├── pnpm-lock.yaml
└── README.md
```

---

# 🔗 Local Development URLs

| Service | URL |
|---|---|
| 🌐 Frontend | `http://localhost:5173` |
| ⚙️ Backend | `http://localhost:8000` |
| 🔐 OAuth Callback | `http://localhost:8000/api/auth/callback` |

---

# 🛠️ Quick Start

หากเคย Setup แล้ว สามารถเริ่มระบบได้อย่างรวดเร็ว:

**Backend**

```bash
pnpm run dev
```

**Frontend**

```bash
cd frontend
pnpm run dev
```

จากนั้นเปิด:

```text
http://localhost:5173
```

---

## ❗ Troubleshooting

### Port 8000 ถูกใช้งานอยู่

ตรวจสอบว่ามี Backend ตัวอื่นกำลังทำงานอยู่หรือไม่ แล้วหยุด Process นั้นก่อน

### Port 5173 ถูกใช้งานอยู่

ตรวจสอบว่ามี Frontend/Vite instance อื่นกำลังทำงานอยู่หรือไม่

### Database Connection Error

ตรวจสอบค่า `DATABASE_URL` ใน:

```text
backend/.env
```

และตรวจสอบว่า PostgreSQL Database สามารถเชื่อมต่อได้

### OAuth Login ไม่ทำงาน

ตรวจสอบว่า:

- `CMU_OAUTH_CLIENT_ID` ถูกต้อง
- `CMU_OAUTH_CLIENT_SECRET` ถูกต้อง
- `CMU_OAUTH_CALLBACK_URL` ตรงกับ Callback URL ที่ลงทะเบียนไว้
- Backend ทำงานอยู่ที่ Port `8000`

---

# ✅ Setup Complete

หาก Backend และ Frontend ทำงานสำเร็จแล้ว สามารถเข้าใช้งานระบบผ่าน:

**http://localhost:5173**

🎉 **Happy Coding!**