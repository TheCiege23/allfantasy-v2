# HOMEPAGE_FIX_TASK.md
# Drop into repo root. In Cursor: @HOMEPAGE_FIX_TASK.md implement step by step

## What This Fixes

Three surgical changes to `app/page.tsx` and the nav component:

1. **NAV** — Remove "Open App" button, add "Sign In" + "Sign Up" buttons
2. **HERO** — Replace "Open App" + "Dashboard" CTAs with "Sign Up Free" + "Sign In"
3. **LOGO** — Remove the dark square container box from the AF crest so it
   floats naturally on the page like the text below it

---

## Step 1 — Read these files before touching anything

```
app/page.tsx                    (606 lines — read ALL of it)
app/layout.tsx                  (find the nav/header component)
components/Navbar.tsx           (or wherever the top nav lives — search for it)
app/globals.css                 (check for hero-logo-wrap, nav-logo-img, landing-crest CSS)
```

Find the nav component:
```bash
grep -r "Open App" app/ components/ --include="*.tsx" --include="*.ts" -l
grep -r "rounded-lg px-4 py-2 text-sm font-semibold text-white" app/ components/ -l
```

---

## Step 2 — What the live DOM shows (verified by reading the rendered page)

### NAV (header element, class `fixed inset-x-0`):
Current links in order:
1. `a[href="/"]` — logo link (keep, no change)
2. `a[href="/admin"]` — class `hidden rounded-lg border px-3 py-1.5 text-xs font-medium` (keep)
3. `a[href="/dashboard"]` — class `hidden rounded-lg border px-3 py-2 text-sm font-medium` (keep)
4. `a[href="/app"]` — **"Open App"** class `rounded-lg px-4 py-2 text-sm font-semibold text-white` ← **REMOVE THIS**

### HERO CTAs (section > div.relative.z-10.mb-10):
Current links:
1. `a[href="/app"]` — **"Open App"** class `inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold` ← **REPLACE**
2. `a[href="/dashboard"]` — **"Dashboard"** class `inline-flex w-full items-center justify-center gap-2 rounded-xl border px-6 py-3 text-sm font-medium` ← **REPLACE**

### HERO LOGO (section > div.relative.z-10.mb-8 > div.hero-logo-wrap):
Current structure:
```
div.hero-logo-wrap.relative.flex.flex-col.items-center.justify-center.gap-2
  div (glow blur background — absolute positioned)
  div.hero-logo-wrap.relative.flex.flex-col.items-center.justify-center.gap-2
    div.relative.flex.items-center  ← this is the dark square box wrapper
      img.nav-logo-img.relative.h-[44px].w-auto  ← the actual AF crest image
```
The dark square box is created by the wrapper div around the img.
Below the nested hero-logo-wrap there's likely a span/div showing "ALLFANTASY" text.

---

## Step 3 — NAV FIX

In the nav component (find it via grep), locate the "Open App" link:
```tsx
// REMOVE this exact element (or equivalent JSX):
<Link href="/app" className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
  Open App
</Link>
```

**REPLACE WITH:**
```tsx
{/* Sign In — outline style matching existing border buttons */}
<Link
  href="/login"
  className="hidden rounded-lg border border-white/20 px-3 py-2 text-sm font-medium text-white/80 transition hover:border-white/40 hover:text-white sm:inline-flex"
>
  Sign In
</Link>

{/* Sign Up — filled teal, same visual weight as old "Open App" */}
<Link
  href="/signup"
  className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400 hover:opacity-90"
>
  Sign Up
</Link>
```

Note: If the existing "Open App" used a gradient background class like
`bg-gradient-to-r from-cyan-500 to-teal-500`, match that same gradient
on the Sign Up button. Read the file first to confirm.

---

## Step 4 — HERO CTA FIX

In `app/page.tsx`, find the section with the two hero CTA links.
The parent div has class containing `flex w-full flex-col items-center gap-3`.

**REMOVE:**
```tsx
<Link href="/app" className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold ...">
  Open App
  {/* arrow icon SVG here */}
</Link>
<Link href="/dashboard" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border px-6 py-3 text-sm font-medium ...">
  Dashboard
</Link>
```

**REPLACE WITH:**
```tsx
{/* Primary CTA — Sign Up */}
<Link
  href="/signup"
  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-8 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-cyan-400 sm:w-auto"
>
  Sign Up Free
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
  </svg>
</Link>

{/* Secondary CTA — Sign In */}
<Link
  href="/login"
  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 px-8 py-3.5 text-sm font-medium text-white/80 transition hover:-translate-y-0.5 hover:border-white/40 hover:text-white sm:w-auto"
>
  Sign In
</Link>
```

Note: If the original buttons used a gradient class (check the file),
apply `bg-gradient-to-r from-cyan-500 to-teal-400` on the Sign Up button
instead of solid `bg-cyan-500`. Match the existing visual language exactly.

Also look for and **REMOVE** the secondary row of buttons if present:
```tsx
{/* Remove any Download App or Share buttons */}
<button>Download App</button>   {/* REMOVE */}
<button>Share</button>           {/* REMOVE */}
```
These appear below the main CTAs. Remove the entire secondary button row.

---

## Step 5 — LOGO FIX

In `app/page.tsx`, find the hero logo section.
It is in the `section` element, inside a `div` with class containing
`relative z-10 mb-8` (the 3rd child of the section).

Current structure (simplified):
```tsx
<div className="... relative z-10 mb-8 ...">
  {/* background glow */}
  <div className="landing-crest-glow absolute left-1/2 top-1/2 h-[360px] ..." />

  {/* hero logo wrap — OUTER */}
  <div className="hero-logo-wrap landing-float relative flex flex-col items-center justify-center gap-2">
    
    {/* background blur circle */}
    <div className="pointer-events-none absolute left-1/2 top-[42%] h-[260px] w-[260px] ..." />
    
    {/* hero logo wrap — INNER */}
    <div className="hero-logo-wrap relative flex flex-col items-center justify-center gap-2">
      
      {/* THIS IS THE DARK BOX — REMOVE wrapper, keep img */}
      <div className="relative flex items-center ...">
        <Image
          src="/logo.png"  {/* or whatever the actual src is */}
          className="nav-logo-img relative h-[44px] w-auto"
          alt="AllFantasy"
        />
      </div>

      {/* ALLFANTASY text pill — REMOVE entirely */}
      <div className="... rounded ...">
        <span>ALLFANTASY</span>
      </div>

    </div>
  </div>
</div>
```

**CHANGES:**

1. **Remove the dark box wrapper** around the Image/img:
   - Find the `div` that wraps the logo img and has styling that creates
     the dark square (likely has `bg-`, `rounded-`, `p-`, `border` classes
     or is the source of the dark container via the CSS module)
   - Remove that wrapper div entirely, keeping only the `<Image>` or `<img>` tag

2. **Remove the "ALLFANTASY" pill** below the logo:
   - Find and delete the div/span that shows "ALLFANTASY" text

3. **Make the logo itself float cleanly**:
   - The `<Image>` or `<img>` tag should have NO parent container with
     background color or border
   - Add `drop-shadow-lg` to the image class if not present
   - Keep class `h-[44px] w-auto` or increase to `h-[56px] w-auto` for
     better visibility

4. **Remove the glow blur background div** if it creates the dark square:
   - The `pointer-events-none absolute left-1/2 top-[42%] h-[260px] w-[260px]`
     div — if this has a bg-color creating the dark square, remove it
   - If it's a blur/glow (transparent), keep it

**RESULT**: The AF shield should appear like this — same as the
"Fantasy Sports" text below it, just floating naturally with no container:
```
        [AF shield icon — clean, no box]
     Fantasy Sports
  With AI Superpowers
```

---

## Step 6 — Also fix the nav logo

The nav logo (in the header, `a[href="/"]`) likely also uses the same
`nav-logo-img` image. Check if it also has a dark container wrapper.

If the nav logo link (`a[href="/"]`) wraps the logo in a container div
with background styling, remove that container too.

The nav logo should just be the image floating in the header:
```tsx
<Link href="/" className="flex items-center gap-2 px-2 py-1.5 transition-opacity hover:opacity-80">
  <Image
    src="/logo.png"
    alt="AllFantasy"
    className="h-8 w-auto"  {/* or nav-logo-img class — keep it */}
  />
</Link>
```

---

## Step 7 — Verify auth-gated behavior

The page likely shows different buttons based on whether the user is
logged in (session exists) or not.

Read `app/page.tsx` and find the session check:
```tsx
const session = await getServerSession(authOptions)
// or
const { data: session } = useSession()
```

The new buttons should follow this logic:
```tsx
{session ? (
  // User is logged in — show Dashboard
  <Link href="/dashboard">Go to Dashboard</Link>
) : (
  // User is NOT logged in — show Sign Up + Sign In
  <>
    <Link href="/signup">Sign Up Free →</Link>
    <Link href="/login">Sign In</Link>
  </>
)}
```

If the page is a Server Component (no 'use client'), use `getServerSession`.
If it's a Client Component, use `useSession` from `next-auth/react`.
Read the file to determine which it uses, then implement accordingly.

For the NAV: same logic — show Sign In + Sign Up when logged out,
show Dashboard when logged in.

---

## Step 8 — TypeScript check

```bash
npx tsc --noEmit
```

Fix any import errors for Link (should be `import Link from 'next/link'`).
Fix any Image import errors (`import Image from 'next/image'`).

---

## Commit

```bash
git add app/page.tsx
git add components/Navbar.tsx        # or whatever nav file changed
git add app/layout.tsx               # only if changed
git commit -m "fix: add sign in/sign up to nav and hero, remove logo container box and webapp buttons"
```

---

## Visual Checklist (verify before committing)

- [ ] Nav right side shows: [Sign In (outline)] [Sign Up (teal filled)]
- [ ] Nav does NOT show: "Open App"
- [ ] Hero shows: [Sign Up Free →] [Sign In]
- [ ] Hero does NOT show: "Open App", "Dashboard", "Download App", "Share"
- [ ] AF crest/shield renders with NO dark square box behind it
- [ ] AF crest/shield has NO "ALLFANTASY" pill/badge below it
- [ ] Logo looks like it's floating naturally on the page background
- [ ] When logged IN: nav shows Dashboard link, hero shows Go to Dashboard
- [ ] When logged OUT: nav shows Sign In + Sign Up, hero shows Sign Up Free

---

## Constraints

- Do NOT change any API routes
- Do NOT change `/login` or `/signup` page files
- Do NOT change the "Admin" nav link behavior
- Do NOT remove the Language selector from the nav
- The "Dashboard" nav link (for logged-in users) stays — only remove it
  from the logged-out hero CTA and nav
- No new npm dependencies
- No any / no @ts-ignore
