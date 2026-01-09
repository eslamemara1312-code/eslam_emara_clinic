---
title: Smart Clinic V1
emoji: 🦷
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
app_port: 7860
---

# Smart Clinic Dental SaaS

## Overview

Secure, multi-tenant Dental Clinic Management System built with FastAPI (Backend) and React (Frontend).

## Features

- **Multi-Tenancy**: Data isolation per clinic.
- **Role-Based Access**: Super Admin, Clinic Admin, Dentist, Receptionist.
- **Appointment Scheduling**: Interactive calendar.
- **Dental Charting**: Visual teeth status tracking.
- **Billing & Expenses**: Financial management with dashboard analytics.
- **Secure File Uploads**: Strict validation for images and attachments.
- **Authentication**: JWT-based auth with Refresh Tokens.

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy, Pydantic, PostgreSQL/SQLite.
- **Frontend**: React, Vite, TailwindCSS.
- **Deployment**: Docker, Hugging Face Spaces.

## Security Features

- JWT Access Tokens (24hr expiry) + Refresh Tokens (7 days)
- Rate Limiting on sensitive endpoints
- Strict file validation (MIME type + extension matching)
- Secure password hashing (bcrypt)
- CORS configuration
- Input validation via Pydantic

## Setup

1. **Clone Repo**:
   ```bash
   git clone <repo_url>
   cd dentalsaas_pro
   ```
2. **Environment Variables**:
   Copy `backend/.env.example` to `backend/.env` and configure:
   - `SECRET_KEY`
   - `DATABASE_URL`
   - `CLOUDINARY_*` (Optional)
3. **Run Locally**:

   ```bash
   # Backend
   cd backend
   uvicorn main:app --reload

   # Frontend
   cd frontend
   npm install
   npm run dev
   ```

## API Documentation

Once the backend is running, visit:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Deployment

This project is configured for deployment on **Hugging Face Spaces** (Docker SDK).
Ensure `Dockerfile` is present in the root.
