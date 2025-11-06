# Usage Guide

Date: 2025-11-05 (Pacific/Honolulu)

This guide covers how to use the site as an **Admin** and as a **Member**.

---

## Admin Workflows

### 1) Approving Registrations
1. Go to **Members → Approval**
2. For a **pending** request:
   - **Approve**: creates the `User`, generates temp password, emails the user
   - **Reject**: frees the requested slug and marks request decided
   - **Reset** (only for rejected/denied): returns the request to PENDING
   - **Delete**: removes the request entirely
3. Decided rows remain visible but are greyed out

### 2) Managing Users
- Go to **Members → Users (Admin)**
- Promote/Demote roles
- Delete (requires typing **DELETE**)
- You cannot demote yourself

### 3) Theme Editor
- Go to **Members → Theme** (Admin only)
- Adjust site colors (background, text, muted, accent, card)
- Customize cards & tiles (radius, padding, border, shadow)
- Configure **navbar** appearance (background, text, border, opacity, height, blur)
- Configure **button** shape (radius, padding, font weight)
- Customize three button types:
  - **Basic**: primary actions (saves, submissions, main CTAs)
  - **Muted**: secondary/neutral actions (delete, cancel)
  - **Warning**: destructive/important actions (reject, deny)
- **Reset to Defaults** button to restore all theme settings
- Save writes to `AppConfig` → changes apply site-wide instantly

### 4) Email System
- Preferred: **Resend** (`RESEND_API_KEY`, `RESEND_FROM`)
- Fallback: **SMTP** (`SMTP_*`)
- Reset links use `NEXT_PUBLIC_SITE_URL`

---

## Member Workflows

### Registration
1. Go to **Register**
2. Enter Name, Email, desired Slug, and optional Note
3. Submit → waits for Admin approval

### Approval → Temp Password
- On approval, you’ll receive an email with a **temporary password**
- Login with temp password → you’ll be redirected to **Reset Password**

### Reset Password
- Enter new password twice (eye toggle to show/hide)
- Once complete, you can access **Members** pages normally

### Edit Profile
- Click your **profile picture** in the navbar → **Edit Profile**
- Update Name and About text
- **Upload Profile Picture**:
  - Click "Choose File" to upload a new image
  - Or click your existing profile picture to re-crop it
  - Interactive cropper with zoom slider and pan controls
  - Circular crop preview shows exactly how it will appear
  - Click "Save Crop" to confirm or "Cancel" to discard
- Changes apply to navbar, home page, and your public profile page

### View Your Profile
- Click your **profile picture** in the navbar → **View Profile**
- See your public profile page at `/people/{your-slug}`
- Displays your profile picture, name, email, and bio

---

## Navigation

### Navbar Features
- **Profile Picture Icon**: Click to open dropdown menu with:
  - **View Profile**: See your public profile page
  - **Edit Profile**: Update your name, bio, and profile picture
  - **Settings**: (Coming soon)
- **Logout Button**: Sign out of your account
- Links visible based on role:
  - **Home**: Everyone
  - **Members**: Authenticated users only
  - **Approval, Users, Theme**: Admins only

## Guards & Access Rules

- `/login` is blocked when already authenticated
- Any access to `/members/*` requires not only auth but **mustResetPassword=false**
  (first-login users must reset password before entering `/members`)
- Public profile pages (`/people/{slug}`) are accessible to all authenticated users

---

## Page Builder Compatibility (in Progress)

- Pages use **CSS variables** and utility classes: `tile`, `muted`, `btn*`
- Per-page JSON configs via `AppConfig` (e.g., `members.page` tiles)
- Admin Page Builder will write these configs and manage editable blocks
