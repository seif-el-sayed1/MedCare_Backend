# 🏥 Clinic Management System — Backend

A backend API for managing a medical clinic, built with **Node.js**, **Express**, and **PostgreSQL**.

---

## 🚀 Getting Started

```bash
git clone https://github.com/seif-el-sayed1/MedCare_Backend.git
npm install
```

---

## 🛠️ Tech Stack

- Node.js
- Express.js
- PostgreSQL
- Prisma
- JWT
- Firebase Storage
- Firebase Cloud Messaging (FCM)
- Nodemailer
- Node-Cron
- Paymob

---

## ✨ Features

### 👥 User Management

- Register, login, and verify account via OTP
- Profile picture upload via Firebase
- Multi-language support (Arabic / English)

### 🩺 Doctor Management & Auth

- Forget password via email with reset token
- Add and manage doctors with specializations
- Set and update working hours per day
- Manage doctor leaves (weekly leave system)
- Soft delete doctors without losing historical data
- Doctor can update own profile and write diagnoses

### 📅 Appointment Booking

- Book appointments in available time slots
- Support partial and full payment types
- Cancel appointments
- Track appointment status (Pending → Confirmed → Completed / Absent)
- Add consultation follow-up date
- Generate PDF report for each appointment
- Generate & scan QR code for clinic check-in

### 💳 Payment System

- Integrated payment gateway with callback support
- Partial or full payment options

### ⏳ Waiting List

- Users can join a waiting list for a doctor on a specific date
- Automatic notification when a slot becomes available or is taken

### 🔔Notifications (FCM)

- Appointment reminders the day before
- Payment deadline warnings
- Waiting list status updates
- Mark notifications as seen (single or all)

### ⭐ Ratings & Reviews

- Users can rate doctors after appointments
- Update or delete their own rating
- Doctor rating average auto-calculated

### 📊 Admin Dashboard

- Overview stats (users, appointments, revenue)
- Charts: appointments, revenue, new users, specializations, payment status
- Top doctors by rating
- Recent appointments and payments

### 🤖 Automated Cron Jobs

- Daily reminder for tomorrow's appointments (8:00 AM)
- Hourly cleanup of unpaid appointments with escalating payment reminders (at 45, 30, and 15 minutes before cancellation)
- Weekly reset of doctor working hours and leave tracking

### 🔐 Role-Based Access Control

- 4 roles: `Super Admin`, `Admin`, `Doctor`, `User`
- Each endpoint restricted to the appropriate role(s)
- JWT-based authentication
