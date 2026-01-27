# Dashboard & Layout Implementation Plan

**Created**: 2025-01-07
**Status**: Ready for Implementation

---

## Overview

This plan outlines the creation of a modern, minimal dashboard layout for the Dokra document management application, following the design guidelines in `app-style-guide.md`. The layout features a collapsible sidebar navigation, prominent search bar, and settings pages for organization and user management.

---

## Layout Architecture

### Overall Structure

```
┌──────────────────────────────────────────────────┐
│  Dokra  [Search...........................]  [Avatar] ▼ │
├────┬─────────────────────────────────────────────┤
│ <> │                                             │
│ H  │              Main Content                   │
│ D  │                                             │
│ T  │                                             │
│ M  │                                             │
│ S  │                                             │
│    │                                             │
└────┴─────────────────────────────────────────────┘
```

- **Fixed Header** (64px height): Logo, search bar, user avatar, org dropdown
- **Collapsible Sidebar** (left): Navigation links with icons
- **Main Content Area**: Scrollable, centered max-width container

---

## Header Component (`AppHeader.vue`)

### Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Dokra   [Search......................................] [Initials] ▼ │
└─────────────────────────────────────────────────────────────────────┘
         │                 │                           │
         │                 │                           └─ Org dropdown
         │                 └─ Prominent search bar (300px wide)
         └─ Logo (leftmost)
```

### Components

**Search Bar (`AppSearch.vue`)**
- ~300px wide input field
- Heroicons `MagnifyingGlassIcon` prefix
- Placeholder: "Search documents..."
- Subtle hover/focus states
- Calm, minimal styling per design guide

**User Menu (`UserMenu.vue`)**
- Avatar circle with user initials or uploaded image
- Dropdown on click containing:
  - Profile (links to `/settings/user`)
  - Settings → Organization
  - Settings → User
  - Divider
  - Sign Out

**Organization Dropdown (`OrgDropdown.vue`)**
- Shows current organization name with ▼ arrow
- Click to show minimal org list:
  - Organization names only
  - Checkmark icon for current org
  - No avatars or extra details
- Dropdown positioned next to user avatar

---

## Sidebar Component (`AppSidebar.vue`)

### Features

- **Toggle Button** (top): Collapses/expands sidebar
- **Collapsed State**: 64px width, icons only, tooltips on hover
- **Expanded State**: 200px width, icons + labels, smooth CSS transition
- **Persistent State**: localStorage to remember collapsed/expanded state

### Navigation Links

| Route | Label | Heroicon |
|-------|-------|----------|
| `/dashboard` | Home | `HomeIcon` |
| `/documents` | Documents | `DocumentIcon` |
| `/tags` | Tags | `TagIcon` |
| `/members` | Members | `UsersIcon` |
| `/settings/organization` | Settings | `CogIcon` |

### Active State Styling

- Subtle background tint
- Left accent border (2px, primary color)
- Bold label text
- Low-contrast styling for inactive states per design guide

---

## Pages to Create/Recreate

### Dashboard (`app/pages/dashboard.vue`)

Following the design guide:

- **Organization title/breadcrumb** at top
- **Stats Section**: Metric chips displaying:
  - "X documents in total"
  - "Y MB total size"
  - Label in muted gray, value in prominent larger text
- **Latest Documents Table**: Limit 10 recent documents
  - Columns: File name, Tags, Created at, Actions
  - Styling per design guide (alternating rows, hover highlights)
- **Empty State**: "No documents yet – Upload your first document" with outline button

### Settings Pages

**`app/pages/settings/index.vue`**
- Redirects to `/settings/organization`

**`app/pages/settings/organization.vue`**
- Organization name display
- Organization ID display
- Member list table:
  - Columns: Name, Email, Role, Actions
  - Role badges (owner, member, viewer)
  - Actions: Remove member, change role (owner only)
- Invite member functionality (email input + invite button)
- Delete organization button (owner only)

**`app/pages/settings/user.vue`**
- Profile form:
  - Name (editable)
  - Email (read-only, from auth)
- Change password section:
  - Current password
  - New password
  - Confirm password
- Session management:
  - List of active sessions (device, location, last active)
  - Revoke session option
- Delete account option (with confirmation)

---

## API Endpoints to Create

| Endpoint | Method | Description | File |
|----------|--------|-------------|------|
| `/api/organization/[id]/invite` | POST | Invite user by email | `server/api/organization/[id]/invite.post.ts` |
| `/api/organization/[id]/members/[userId]` | PATCH | Update member role | Existing, verify implementation |
| `/api/users/me` | GET | Get current user profile | `server/api/users/me.get.ts` |
| `/api/users/me` | PATCH | Update user profile | `server/api/users/me.patch.ts` |

---

## File Manifest

### New Files to Create

```
app/layouts/default.vue
app/components/AppHeader.vue
app/components/AppSidebar.vue
app/components/AppSearch.vue
app/components/OrgDropdown.vue
app/components/UserMenu.vue
app/components/DocumentTable.vue
app/components/StatsCard.vue
app/pages/settings/index.vue
app/pages/settings/organization.vue
app/pages/settings/user.vue
server/api/organization/[id]/invite.post.ts
server/api/users/me.get.ts
server/api/users/me.patch.ts
```

### Files to Modify

```
app/pages/dashboard.vue (recreate to match design guide)
app/pages/index.vue (add redirect to dashboard if authenticated)
```

---

## Styling Guidelines

Following `docs/app-style-guide.md`:

- **Header**: Light background (near white/pale gray), low-contrast borders, no heavy shadows
- **Sidebar**: Slightly darker background, consistent with header styling
- **Typography**: Modern sans-serif, clear hierarchy (bold titles, regular body)
- **Colors**: Calm accent (desaturated blue/teal) for primary buttons/links/active states
- **Hover States**: Subtle background tints, small color shifts (no big shadows/animations)
- **Spacing**: Generous white space, consistent vertical spacing between sections
- **Tables**: Alternating backgrounds or light hover highlights, left-aligned content
- **Empty States**: Calm copy, outline button for primary action, no illustrations

---

## Component Hierarchy

```
default.vue (layout)
├── AppHeader
│   ├── Logo
│   ├── AppSearch
│   ├── OrgDropdown
│   └── UserMenu
├── AppSidebar
│   └── NavLinks (Home, Documents, Tags, Members, Settings)
└── <slot> (page content)

settings/organization.vue
├── OrgInfoCard
├── MembersTable
└── InviteMemberModal

settings/user.vue
├── ProfileForm
├── PasswordForm
└── SessionsList
```

---

## Implementation Phases

### Phase 1: Header Components
- `AppSearch.vue`
- `OrgDropdown.vue`
- `UserMenu.vue`
- `AppHeader.vue` (integrates above components)

### Phase 2: Sidebar Component
- `AppSidebar.vue`
- Navigation links with icons
- Collapsible state logic + localStorage

### Phase 3: Layout Integration
- `default.vue` layout
- Grid-based layout structure
- Header + Sidebar + Content area

### Phase 4: Dashboard Page
- Recreate `dashboard.vue` per design guide
- Stats section with metric chips
- Document table component
- Empty state handling

### Phase 5: Settings Pages
- `settings/index.vue` (redirect)
- `settings/organization.vue` (org management)
- `settings/user.vue` (user profile)

### Phase 6: API Endpoints
- `POST /api/organization/[id]/invite`
- `GET /api/users/me`
- `PATCH /api/users/me`

---

## Dependencies & Conventions

- **Icons**: Heroicons via `@nuxt/icon` (`lucide` preset)
- **Styling**: Tailwind CSS v4 + DaisyUI v5 (configured in `main.css`)
- **Icons**: Use Heroicons class names (e.g., `HomeIcon`, `DocumentIcon`)
- **Components**: Vue 3 `<script setup>` syntax
- **State Management**: Nuxt composables + localStorage for sidebar state
- **Middleware**: Existing `auth` and `guest` middleware

---

## Open Questions (Resolved)

1. **Sidebar width**: Both states - 64px (collapsed, icons-only) and 200px (expanded, icons + labels)
2. **Organization selector**: In header next to user avatar, minimal dropdown with checkmark for current org
3. **Search bar**: Prominent, always visible, ~300px wide in header
4. **User menu**: Avatar dropdown with Profile, Settings links, Sign Out
5. **Icons package**: Heroicons via `@nuxt/icon`

---

## References

- Design guidelines: `docs/app-style-guide.md`
- Testing strategy: `docs/testing.md`
- Architecture overview: `docs/agent-overview.md`
- Existing components: `app/pages/dashboard.vue`, `app/composables/useAuth.ts`
- Existing API: `server/api/organization/`, `server/api/files/`
