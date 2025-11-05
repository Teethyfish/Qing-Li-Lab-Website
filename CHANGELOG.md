# Changelog

All notable changes for the Qing Li Lab Website.
**Date:** 2025-11-04 (Pacific/Honolulu)

## [Latest] - 2025-11-04

### Added
- Theme and Profile pages to navbar for appropriate user roles
- Navbar hover effects with subtle background shade changes
- Warning button type for destructive actions

### Changed
- Simplified button system: replaced `btn-primary`, `btn-accent`, `btn-ghost` with **Basic**, **Muted**, and **Warning** categories
- Updated all buttons across the site to use the new simplified categories
- Theme editor now shows only Basic, Muted, and Warning button customization options
- Navbar now expands to full screen width (removed 1120px maxWidth constraint)

### Fixed
- Removed duplicate button CSS definitions from globals.css (~213 lines of duplicates)
- Theme editor button preview now accurately reflects available button types

---

## Added
- Registration → Approval workflow (Approve/Reject/Reset/Delete)
- Email delivery via Resend (preferred) with SMTP fallback
- Temp password issuance on approval + first-login password reset gate
- Members area with themed tiles
- Users (Admin) page: list/promote/demote/delete (type **DELETE** required)
- Theme Editor (admin): colors + buttons via AppConfig
- Home page: masthead, PI sidebar, announcements strip, member grid
- Middleware to block `/login` when authed and force `/reset-password` if `mustResetPassword=true`
- Prisma additions: `User.slug`, `User.mustResetPassword`

## Fixed
- Double NavBar on iOS/narrow widths
- Invisible buttons (now visible base with themed hover)
- Server/Client event handler boundary errors
- Build/type export issues and missing types
- InviteStatus enum mismatch (REJECTED vs DENIED) via runtime enum lookup
- Auto-login after register (tightened access logic)
- Profile field overflow beyond tile

## Changed
- Styling migrated to site-wide CSS variables + small utility classes
- `authOptions` moved to `src/lib/auth` and API route only exports GET/POST
- Pages updated to be Page-Builder friendly (config + CSS vars)

## Notes
- Supabase RLS enabled; ensure policies are correct for production
- Set `NEXT_PUBLIC_SITE_URL` to the deployed URL for correct email links
