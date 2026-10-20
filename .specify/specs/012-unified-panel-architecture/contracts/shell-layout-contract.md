# Contract: Workspace Shell & Layout Hierarchy

**Type**: Component & Layout Architecture Contract  
**Applies to**: `src/app/[account]/layout.tsx` and all child views (`comments`, `dms`, `logs`)

---

## 1. Hierarchy & Nesting

```text
src/app/[account]/layout.tsx (Server Component)
└── WorkspaceShell (Client Component)
    ├── PersistentSidebar (SidebarNav)
    └── Main Area (flex-1 flex flex-col min-w-0 h-full overflow-hidden)
        ├── PersistentTopBar (Account selector, Breadcrumb, Bot button, Language, User)
        └── UnifiedScrollContainer (flex-1 overflow-y-auto min-w-0)
            └── PageContainer
                ├── PageHeader (Title, Subtitle, Actions slot)
                ├── PageBody (Children content)
                └── PageFooter (Optional footer)
```

---

## 2. Server Layout Responsibilities (`src/app/[account]/layout.tsx`)

1. **Authentication Guard**: Call `getSessionUser()`. Redirect to `/login` if unauthenticated.
2. **Access Control**: Validate `hasAccountAccess(user, username)`. Render unauthorized view if denied.
3. **Account Resolution**: Query database for `accounts WHERE username = ?`. Render 404 view if missing.
4. **Accessible Accounts Query**: Query DB for accounts the user can access (for switcher).
5. **Pass Down**: Provide resolved props to `<WorkspaceShell>`.

---

## 3. Client Shell Responsibilities (`WorkspaceShell`)

1. **Zero-Unmount Guarantee**: The shell remains mounted when navigating between `/@account/comments` and `/@account/dms`.
2. **Single Scroll Container**: The only element with `overflow-y-auto` is the `UnifiedScrollContainer`. Window scroll is locked (`overflow: hidden`).
3. **BiDi Scroll Alignment**: Direction is synchronized with active language. RTL puts the scrollbar on the left; LTR on the right.
4. **Global Bot & VNC Management**: Houses `BotMonitorDrawer` and `VncViewerModal` so telemetry persists during page transitions.
5. **Global Toast Mounting**: Mounts `<Toaster position="bottom-left" dir="rtl" />`.

---

## 4. Layout Primitives

```typescript
export function PageContainer({ children, className }: { children: React.ReactNode; className?: string });
export function PageHeader({ 
  title, 
  subtitle, 
  actions, 
  badge 
}: { 
  title: string; 
  subtitle?: string; 
  actions?: React.ReactNode; 
  badge?: React.ReactNode; 
});
export function PageBody({ children, className }: { children: React.ReactNode; className?: string });
```
