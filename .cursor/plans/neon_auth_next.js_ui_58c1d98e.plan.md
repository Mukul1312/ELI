---
name: Neon Auth Next.js UI
overview: Upgrade to Neon Auth with Better Auth (createNeonAuth), add UI components (NeonAuthUIProvider, AuthView, AccountView, UserButton), create auth/account pages and optional proxy (Next.js 16), while preserving CohortAccess createServerGetSession integration.
todos: []
isProject: false
---

# Neon Auth with Next.js (UI Components) Implementation Plan

## Current State

- **Auth package:** `@neondatabase/auth@^0.1.0-beta.21` — uses `createAuthServer()` and `authApiHandler()`
- **Auth server:** [src/lib/auth/server.ts](src/lib/auth/server.ts) — conditional `createAuthServer()`, no cookie secret
- **Auth route:** [src/app/api/auth/[...path]/route.ts](src/app/api/auth/[...path]/route.ts) — `authApiHandler()` with lazy load when env missing
- **Auth client:** [src/lib/auth/client.ts](src/lib/auth/client.ts) — no `'use client'`
- **Layout:** [src/app/layout.tsx](src/app/layout.tsx) — no provider, inline styles
- **CohortAccess:** [src/app/api/ei/with-session.ts](src/app/api/ei/with-session.ts) imports `createServerGetSession` from auth/server
- **Tailwind/CSS:** No globals.css; project uses inline styles

---

## Phase 1: Upgrade SDK and Auth Server

1. **Upgrade package:** Run `npm install @neondatabase/auth@latest` to get `createNeonAuth` (current beta.21 has `createAuthServer`; latest has the new API).
2. **Add env variable:** Document `NEON_AUTH_COOKIE_SECRET` in `.env.example` or README. User generates with `openssl rand -base64 32`. Existing `.env` should add:

```
   NEON_AUTH_COOKIE_SECRET=your-secret-at-least-32-characters-long
   

```

1. **Rewrite [src/lib/auth/server.ts](src/lib/auth/server.ts):**
  - Replace `createAuthServer` with `createNeonAuth` from `@neondatabase/auth/next/server`
  - Config: `baseUrl: process.env.NEON_AUTH_BASE_URL!`, `cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! }`
  - **Preserve `createServerGetSession()`** — keep mapping `auth.getSession()` to CohortAccess `GetSessionFn` shape; update to use the new `auth` instance. Handle case when env is missing: only create auth when both `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET` exist; else `auth` is null and `createServerGetSession` returns a no-op that resolves to null.
2. **Update [src/app/api/auth/[...path]/route.ts](src/app/api/auth/[...path]/route.ts):**
  - Replace `authApiHandler()` with `auth.handler()` from `lib/auth/server`
  - When `auth` is null (env not configured), export GET/POST that return 503 (same fallback as today)
  - Route handlers receive `params: Promise<{ path: string[] }>`; await params before passing to `auth.handler()` if it expects them

---

## Phase 2: Auth Client and UI Provider

1. **Update [src/lib/auth/client.ts](src/lib/auth/client.ts):**
  - Add `'use client'` at top (required when used by client components)
  - Keep `createAuthClient()` from `@neondatabase/auth/next`
2. **Create [src/app/globals.css](src/app/globals.css):**
  - Project has no Tailwind config; use non-Tailwind option
  - Add: `@import "@neondatabase/auth/ui/css";` (or import in layout if preferred)
3. **Create [src/app/auth-provider.tsx](src/app/auth-provider.tsx):**
  - Client component wrapping `NeonAuthUIProvider` (import from `@neondatabase/auth/react/ui`)
  - Props: `authClient`, `navigate={router.push}`, `replace={router.replace}`, `onSessionChange={() => router.refresh()}`, `Link={Link}`
  - For Google OAuth: add `social={{ providers: ["google"] }}` to provider
4. **Update [src/app/layout.tsx](src/app/layout.tsx):**
  - Import `AuthProvider` from `./auth-provider`
  - Import `UserButton` from `@neondatabase/auth/react/ui`
  - Import `./globals.css`
  - Wrap `body` with `<AuthProvider>{children}</AuthProvider>`
  - Add `suppressHydrationWarning` on `<html>` to avoid hydration issues with theme switching
  - Add header with `UserButton` (or a minimal nav)

---

## Phase 3: Auth and Account Pages

1. **Create [src/app/auth/[path]/page.tsx](src/app/auth/[path]/page.tsx):**
  - Import `AuthView` from `@neondatabase/auth/react/ui`
  - Import `authViewPaths` from `@neondatabase/auth/react/ui/server` for `generateStaticParams`
  - `export const dynamicParams = false`
  - `generateStaticParams` returning `Object.values(authViewPaths).map((path) => ({ path }))`
  - Page: `params: Promise<{ path: string }>`, then `const { path } = await params`
  - Render `<AuthView pathname={path} />` (use `pathname` prop, not `path`)
2. **Create [src/app/account/[path]/page.tsx](src/app/account/[path]/page.tsx):**
  - Import `AccountView` from `@neondatabase/auth/react/ui`
  - Same pattern: `params: Promise<{ path: string }>`, `const { path } = await params`
  - Render `<AccountView pathname={path} />`

---

## Phase 4: Proxy — Next.js 16+

**Per Next.js 16 conventions:** Use `proxy.ts`, `proxy()`, and `proxyConfig` (not `middleware.ts`).

1. **Create [src/proxy.ts](src/proxy.ts):**
  - Import `auth` from `@/lib/auth/server`, `NextResponse`, `NextRequest` from `next/server`
  - `export async function proxy(request: NextRequest)` — when `auth` is null, return `NextResponse.next()`; else return `auth.middleware({ loginUrl: '/auth/sign-in' })(request)`
  - `export const proxyConfig = { matcher: ['/account/:path*'] }`
  - Run `npx @next/codemod@latest upgrade` if migrating from existing middleware

---

## Phase 5: Error and Loading Pages

1. **Create [src/app/unauthorized.tsx](src/app/unauthorized.tsx):** Simple UI — "Please log in to continue" (401)
2. **Create [src/app/forbidden.tsx](src/app/forbidden.tsx):** Simple UI — "You don't have access to this resource" (403)
3. **In protected pages (e.g. account):** Call `unauthorized()` when no session; call `forbidden()` when session exists but lacks access
4. **Create [src/app/auth/loading.tsx](src/app/auth/loading.tsx):** Loading UI for auth segment (Suspense boundary)
5. **Create [src/app/account/loading.tsx](src/app/account/loading.tsx):** Loading UI for account segment (Suspense boundary)

---

## Phase 6: Verification and CohortAccess Compatibility

1. **Verify `createServerGetSession` compatibility:**
  - New `auth.getSession()` returns `{ data, error }`; `data` has `user`, `session`
    - Keep mapping: `data.user.id`, `data.session?.userId ?? data.user.id` for CohortAccess shape
2. **Build and test:**
  - `npm run build` — ensure no TypeScript errors
    - EI protocol routes still use `withEiSession` → `createServerGetSession` — should work if auth server export is unchanged

---

## Better Auth Configuration Notes

When using `createNeonAuth` (wraps Better Auth):

- **trustedOrigins:** Add `['http://localhost:3000', 'https://your-production-url.com']` for cross-origin setups
- **secret:** 32+ characters (e.g. from `openssl rand -base64 32`)
- **Per-page checks:** Auth checks should live in each page/route; proxy handles optimistic redirects; for full session checks use `auth.api.getSession({ headers })`

---

## Key File Changes Summary


| File                                  | Action                                          |
| ------------------------------------- | ----------------------------------------------- |
| `package.json`                        | Upgrade @neondatabase/auth to @latest           |
| `.env`                                | Add NEON_AUTH_COOKIE_SECRET                     |
| `src/lib/auth/server.ts`              | createNeonAuth, preserve createServerGetSession |
| `src/app/api/auth/[...path]/route.ts` | auth.handler(), 503 when auth null              |
| `src/lib/auth/client.ts`              | Add 'use client'                                |
| `src/app/globals.css`                 | Create with @neondatabase/auth/ui/css           |
| `src/app/auth-provider.tsx`           | Create — NeonAuthUIProvider wrapper             |
| `src/app/layout.tsx`                  | AuthProvider, UserButton                        |
| `src/app/auth/[path]/page.tsx`        | Create — AuthView                               |
| `src/app/account/[path]/page.tsx`     | Create — AccountView                            |
| `src/app/unauthorized.tsx`            | Create — 401 UI                                 |
| `src/app/forbidden.tsx`               | Create — 403 UI                                 |
| `src/app/auth/loading.tsx`            | Create — Suspense for auth                      |
| `src/app/account/loading.tsx`         | Create — Suspense for account                   |
| `src/proxy.ts`                        | Create (optional) — proxy(), proxyConfig        |


---

## Import Path Note

**Per Neon Auth MCP:** Use these import paths:


| Component / utility | Import path                          |
| ------------------- | ------------------------------------ |
| UI components       | `@neondatabase/auth/react/ui`        |
| Server utilities    | `@neondatabase/auth/react/ui/server` |


Verify exports: `NeonAuthUIProvider`, `AuthView`, `AccountView`, `UserButton` from `@neondatabase/auth/react/ui`; `authViewPaths` from `@neondatabase/auth/react/ui/server`.

---

## Diagram: Auth Flow After Implementation

```mermaid
flowchart TB
  subgraph RequestFlow [Request Flow]
    Proxy[proxy.ts]
    AuthPage[auth/[path]]
    AccountPage[account/[path]]
    Proxy -->|"matched /account/*"| AccountPage
    Proxy -->|"else"| NextResponse[NextResponse.next]
  end

  subgraph Client [Client]
    Layout[layout.tsx]
    Layout --> NeonAuthUIProvider
    NeonAuthUIProvider --> AuthPage
    NeonAuthUIProvider --> AccountPage
  end

  subgraph AuthServer [Auth Server]
    createNeonAuth[createNeonAuth]
    authHandler[auth.handler]
    getSession[auth.getSession]
  end

  subgraph CohortAccess [CohortAccess]
    createServerGetSession[createServerGetSession]
    withEiSession[withEiSession]
  end

  AuthPage --> authHandler
  createNeonAuth --> authHandler
  createNeonAuth --> getSession
  getSession --> createServerGetSession
  createServerGetSession --> withEiSession
```



