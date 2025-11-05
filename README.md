# Qing Li Lab Website

Internal lab website for the Qing X. Li Lab — built with Next.js, Prisma, and Supabase.  
This repo includes registration → approval workflow, credential auth, email notifications, a site-wide theme system, and guard rails to keep unapproved users out.

---

## Features

- **Auth & Roles**
  - Credentials login via Prisma `User`
  - Role in session; Admin-only routes
  - Middleware blocks `/login` if already authed and forces `/reset-password` when `mustResetPassword=true`

- **Registration → Approval**
  - Public *Register* (name, email, slug, note) with slug cleaning & duplicate checks
  - Admin *Approval Dashboard*: Approve / Reject (frees slug) / Reset (to pending) / Delete
  - Decided rows remain visible but are greyed out; Reset shows only for rejected/denied
  - On approval: temp password generated & emailed to the user

- **Password Reset Flow**
  - First login with temp password → **must** reset password (double confirm + eye toggle)
  - Direct `/reset-password` blocked unless authed
  - Access to `/members/*` blocked until reset is complete

- **User Management (Admin)**
  - List, promote/demote, and delete
  - Self-demotion blocked
  - Delete requires typing **DELETE**

- **Email**
  - **Resend** preferred if `RESEND_API_KEY` is set
  - Falls back to **SMTP** (Gmail App Password) if Resend is not configured
  - Emails include reset link using `NEXT_PUBLIC_SITE_URL`

- **Theme System**
  - Site-wide CSS variables for colors and buttons
  - Admin Theme Editor writes to `AppConfig` JSON
  - Simplified button system with three categories:
    - `btn-basic`: primary actions (default dark button)
    - `btn-muted`: secondary/neutral actions (light gray button)
    - `btn-warning`: destructive/important actions (orange/amber button)
  - Utility classes: `tile`, `muted`, `btn`, `nav-item`
  - Full-width navbar with hover effects

- **Pages**
  - Home: masthead, PI sidebar, announcements strip, grid of members
  - Members: themed tiles for quick access (Profile, Reading List)
  - Profile: edit name/about; inputs contained within tiles (visible to authenticated users in navbar)
  - Theme: admin-only theme customization (visible to admins in navbar)
  - Users: admin-only management (visible to admins in navbar)
  - Approval: full workflow with temp password email (visible to admins in navbar)
  - Navbar: full-width, responsive with hover effects, contextual links based on role

---

## Stack

- **Next.js** (App Router 15.5.x)
- **next-auth** (credentials)
- **Prisma** + **Supabase Postgres**
- **Resend** or **SMTP (Gmail App Password)**
- **TypeScript**
- Styling: custom CSS variables + small utility classes (no Tailwind in page code)

