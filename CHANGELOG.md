# Changelog

All notable changes for the Qing Li Lab Website.

## [Latest] - 2025-11-06

### Added
- **Announcements System**
  - Admin-only announcements manager at /members/announcements
  - Full-width edge-to-edge banner carousel on home page displaying active announcements
  - Fixed banner positioning below navbar that stays in place while content scrolls over it
  - Smooth slide and fade transitions between announcements (slides in direction of navigation)
  - Initial load animation - banner fades in from the right on page load
  - Auto-rotation every 5 seconds (pauses on hover)
  - Custom carousel navigation with transparent white arrow buttons and page indicator dots
  - Fade gradient effect where page content transitions over the banner
  - Create announcements with banner image upload and cropping tool
  - Edit existing announcements with full form support
  - Archive/unarchive announcements with separate tabs
  - Delete announcements with confirmation dialog
  - Multi-language support (English, Chinese, Korean) for all announcement content
  - Optional details pages for announcements with custom URL slugs (accessible at /announcements/[slug])
  - Display order management for controlling banner sequence
  - Translation validation with warning dialog for missing language content

### Changed
- **Navigation Bar**
  - Changed navbar from sticky to fixed positioning - stays at top while scrolling
  - Navbar extends full viewport width edge-to-edge
  - Increased navbar z-index to 100 to ensure it stays above all content

- **Home Page Layout**
  - Page background extends edge-to-edge while content maintains centered layout with margins
  - Content wrapper max-width of 1280px with proper padding

### Fixed
- Banner image size limit validation
- Carousel button styling no longer inherits global CSS (uses inline styles)
- Horizontal overflow issues with full-width elements

---

## [Previous] - 2025-11-05

### Added
- **Profile Picture System**
  - Added `imageUrl` field to User model for profile pictures
  - Profile picture upload with interactive cropping tool (react-easy-crop)
  - Circular crop area with zoom slider (1x-3x) and pan controls
  - Profile pictures display on home page (80px), navbar (36px), and profile pages (120px)
  - Clickable profile picture on edit page with "Edit" overlay on hover for re-cropping
  - Cropper appears as centered popup tile with dark backdrop
  - Images stored as base64 in database

- **Navbar Dropdown Menu**
  - Profile picture in navbar now clickable with dropdown menu
  - Dropdown options: View Profile, Edit Profile, Settings
  - Click outside to close dropdown

- **Profile Page Layout**
  - Two-column layout for user profile pages (/people/{slug})
  - Left tile: profile picture (120px) + name + email (mailto link)
  - Right tile: About section with bio
  - Added top padding for spacing from navbar

### Changed
- **Navbar Navigation**
  - Removed Profile link from main navbar (moved to dropdown)
  - Profile link now correctly points to user's public profile (/people/{slug}) instead of edit page
  - Navbar items only highlight for exact path matches (no parent category highlighting)

- **Theme Page**
  - Fixed TypeScript compilation errors in theme editor
  - Updated CompactSliderField, CompactColorField, and CompactTextField components to use proper props
  - Components now accept `field` prop instead of spread syntax

- **Login/Register Pages**
  - Migrated LoginForm from Tailwind to global CSS variables
  - Migrated RegisterForm from Tailwind to global CSS variables
  - Both forms now use `.tile` class and theme-aware styling
  - Added top padding for spacing from navbar
  - Buttons now use global button system (btn-basic, btn-muted)

### Fixed
- Profile picture button border styling (removed thick black border from global button styles)
- Cropper z-index issues (now appears above all content with z-index: 99999)
- Profile dropdown appears above tiles and navbar
- Form styling consistency across login, register, and profile pages

---

## [Previous] - 2025-11-04

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
