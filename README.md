# 📑 Paperless Conference System

Sistem konferensi tanpa kertas yang terdiri dari **backend** (Node.js/Express) dan **frontend** (React + Vite + Electron).

---

## ⚙️ Backend Setup

1. Masuk ke folder backend:
   ```bash
   cd backend
   ```
2. Install dependencies:

   ```bash
   npm install
   npm install mysql2 cors dotenv
   npm install sequelize sequelize-cli mysql2
   npm install mediasoup-client socket.io-client
   npm install node-cron
   ```

3. Buat file .env dan isi konfigurasi database

## 🚀 Menjalankan Backend

1. Jalankan Sequelize:

   ```bash
   npm start
   ```

2. Jalankan Seeder:

   ```bash
   npm run seed
   ```

3. Jalankan Media Server

   ```bash
   npm run media
   ```

4. Jalankan Server

   ```bash
   npm start
   ```

## 🎨 Frontend Setup

1. Masuk ke folder frontend:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   npm install react-router-dom
   ```

### 🚀 Menjalankan Frontend

    npm run dev
