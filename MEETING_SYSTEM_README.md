# Paperless Conference System - Meeting Feature

## Overview
Sistem meeting yang sudah diintegrasikan antara backend dan frontend untuk memulai dan bergabung dengan meeting konferensi.

## Fitur yang Sudah Dijalankan

### 1. Start Page (`/start`)
- User dapat memilih role (Host atau Participant)
- Host dapat membuat meeting baru
- Participant dapat bergabung dengan meeting yang ada
- Semua user akan diarahkan ke Waiting Room setelah submit

### 2. Waiting Room (`/waiting`)
- Host dapat melihat tombol "Start Meeting"
- Participant akan menunggu host memulai meeting
- Auto-redirect ke Participant Dashboard ketika meeting dimulai
- Polling status meeting setiap 3 detik untuk participant

### 3. Participant Dashboard (`/participant/dashboard`)
- Dashboard utama untuk semua user (host dan participant)
- Menampilkan menu-menu yang tersedia berdasarkan role
- Informasi meeting yang sedang berlangsung
- Tombol "End Meeting" untuk mengakhiri meeting

## Alur Sistem

```
Start Page → Input Nama → Waiting Room → Meeting Started → Participant Dashboard
```

### Untuk Host:
1. Buka `/start`
2. Pilih role "Host"
3. Input nama
4. Klik "Create Meeting"
5. Diarahkan ke Waiting Room
6. Klik "Start Meeting" untuk memulai
7. Otomatis masuk ke Participant Dashboard

### Untuk Participant:
1. Buka `/start`
2. Pilih role "Participant"
3. Input nama
4. Klik "Join Meeting"
5. Diarahkan ke Waiting Room
6. Menunggu host memulai meeting
7. Otomatis masuk ke Participant Dashboard

## API Endpoints yang Digunakan

### Backend Routes:
- `POST /api/meeting/create` - Membuat meeting baru
- `POST /api/meeting/start` - Memulai meeting
- `POST /api/meeting/join` - Bergabung dengan meeting
- `GET /api/meeting/:meetingId/status` - Cek status meeting
- `GET /api/meeting/test` - Test endpoint

### Frontend Services:
- `meetingService.createMeeting()` - Membuat meeting
- `meetingService.startMeeting()` - Memulai meeting
- `meetingService.joinMeeting()` - Bergabung dengan meeting
- `meetingService.getMeetingStatus()` - Cek status meeting

## Struktur Data

### Meeting Info (localStorage):
```json
{
  "id": "1234",
  "code": "MTG-1234",
  "title": "Meeting Title",
  "status": "started"
}
```

### User Info (localStorage):
```json
{
  "pconf.displayName": "User Display Name",
  "pconf.useAccountName": "1",
  "user": "user object from backend"
}
```

## Cara Menjalankan

### 1. Backend
```bash
cd backend
npm install
npm start
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Test API
```bash
cd backend
node test-meeting-api.js
```

## Catatan Penting

1. **Host Dashboard tidak digunakan** - Semua user akan masuk ke Participant Dashboard
2. **Meeting otomatis dimulai** ketika host membuat meeting (status: 'started')
3. **Participant bergabung otomatis** ketika meeting sudah dimulai
4. **Waiting Room** berfungsi sebagai buffer antara start dan meeting aktif
5. **LocalStorage** digunakan untuk menyimpan informasi meeting dan user

## Troubleshooting

### Jika meeting tidak bisa dibuat:
1. Pastikan backend berjalan di port 3000
2. Cek database connection
3. Pastikan user sudah login dan memiliki role yang sesuai

### Jika tidak bisa join meeting:
1. Pastikan meeting sudah dibuat oleh host
2. Cek status meeting di database
3. Pastikan API endpoint `/api/meeting/join` berfungsi

### Jika tidak ada redirect:
1. Cek console browser untuk error
2. Pastikan localStorage `currentMeeting` tersimpan
3. Cek routing di App.jsx

## Pengembangan Selanjutnya

1. **Menu Access Control** - Implementasi akses menu berdasarkan role
2. **Real-time Updates** - WebSocket untuk update real-time
3. **Meeting Invitation** - Sistem undangan meeting
4. **Meeting History** - Riwayat meeting yang sudah selesai
5. **File Sharing** - Berbagi file dalam meeting
6. **Chat System** - Sistem chat dalam meeting
