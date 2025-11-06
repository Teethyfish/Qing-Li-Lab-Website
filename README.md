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
  - Site-wide CSS variables for colors, buttons, tiles, and navbar
  - Admin Theme Editor writes to `AppConfig` JSON
  - Simplified button system with three categories:
    - `btn-basic`: primary actions (default dark button)
    - `btn-muted`: secondary/neutral actions (light gray button)
    - `btn-warning`: destructive/important actions (orange/amber button)
  - Customizable navbar (background, text, border, opacity, height, blur)
  - Customizable tiles (radius, padding, border, shadow)
  - Reset to Defaults button to restore all theme settings
  - Utility classes: `tile`, `muted`, `btn`, `nav-item`
  - Full-width navbar with hover effects

- **Profile Pictures**
  - Upload and crop profile pictures with interactive cropper
  - Circular crop area with zoom slider (1x-3x) and pan controls
  - Re-crop existing photos by clicking the profile picture
  - Profile pictures display on:
    - Navbar (36px circle with dropdown menu)
    - Home page member grid (80px circles)
    - Public profile pages (120px circle)
  - Images stored as base64 in database
  - Fallback to initials when no picture is uploaded

- **Pages**
  - Home: masthead, PI sidebar, announcements strip, grid of members with profile pictures
  - Members: themed tiles for quick access (Profile, Reading List)
  - Profile Edit: edit name, about, and profile picture with cropper
  - Profile View (`/people/{slug}`): public profile page with two-column layout (picture/contact + bio)
  - Theme: admin-only theme customization with navbar and tile settings
  - Users: admin-only management
  - Approval: full workflow with temp password email
  - Login/Register: theme-aware forms using global CSS
  - Navbar: full-width, responsive with hover effects, profile picture dropdown menu, contextual links based on role

---

## Stack

- **Next.js** (App Router 15.5.x)
- **next-auth** (credentials)
- **Prisma** + **Supabase Postgres**
- **Resend** or **SMTP (Gmail App Password)**
- **react-easy-crop** (profile picture cropping)
- **TypeScript**
- Styling: custom CSS variables + small utility classes (migrated from Tailwind)

