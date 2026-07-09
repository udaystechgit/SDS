# Development Guide

## Prerequisites

| Tool    | Version           | Install                                  |
| ------- | ----------------- | ---------------------------------------- |
| Node.js | 22.x              | [nodejs.org](https://nodejs.org)         |
| npm     | bundled with Node | [docs.npmjs.com](https://docs.npmjs.com) |
| Git     | any               | [git-scm.com](https://git-scm.com)       |

---

## Setup

```bash
git clone https://github.com/udaybhaskar0699/sds-ai-core.git
cd sds-ai-core
npm install
cp .env.example .env   # fill in any required values
npm run dev
```

The dev server starts at **http://localhost:5173** with HMR enabled.

---

## Environment Variables

Create a `.env` file at the project root. Variables prefixed with `VITE_` are exposed to the browser.

```dotenv
# Public Supabase values — safe to ship to the browser
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Server-only — never use VITE_ prefix for secrets
SUPABASE_SERVICE_ROLE_KEY=
```

Add server-only variables to the `getServerConfig()` function in `src/lib/config.server.ts`. Read them **inside** the function body, not at module scope (required for Cloudflare Workers compatibility).

---

## Code Conventions

### TypeScript

- Strict mode is enabled (`tsconfig.json`)
- All new files should be `.tsx` (React) or `.ts` (non-JSX)
- Prefer named exports over default exports for components

### Imports

Use the `@/` alias to import from `src/`:

```ts
import { Button } from "@/components/ui/button";
import { buildSeoMeta } from "@/lib/seo";
```

### Styling

- Use **Tailwind CSS utility classes** only
- Component variants go through `class-variance-authority` (CVA)
- The `cn()` helper from `src/lib/utils.ts` merges and dedupes classes:

```ts
import { cn } from "@/lib/utils";
<div className={cn("base-class", isActive && "active-class")} />
```

### Forms

Use **React Hook Form** + **Zod** for all forms:

```ts
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

const form = useForm({ resolver: zodResolver(schema) });
```

---

## Adding a Route

1. Create `src/routes/my-page.tsx`
2. Use `createFileRoute`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { buildSeoMeta } from "@/lib/seo";

export const Route = createFileRoute("/my-page")({
  head: () => ({
    meta: buildSeoMeta({
      title: "My Page | SDS Consulting",
      description: "Page description",
      path: "/my-page",
    }),
  }),
  component: MyPage,
});

function MyPage() {
  return <div>Hello</div>;
}
```

3. The Vite plugin auto-regenerates `routeTree.gen.ts` on save.

---

## Adding a Server Function

```ts
// src/lib/api/my-feature.functions.ts
import { createServerFn } from "@tanstack/react-start";

export const fetchMyData = createServerFn().handler(async () => {
  // server-only logic
  return { data: [] };
});
```

Call it from a route loader or component:

```ts
const data = await fetchMyData();
```

---

## Linting & Formatting

```bash
npm run lint       # ESLint
npm run format     # Prettier (auto-fix)
```

ESLint config: `eslint.config.js`
Prettier config: inline in `package.json` or `.prettierrc`

---

## Building for Production

```bash
npm run build
```

Output:

- `.output/public/` — static client chunks and assets
- `.output/server/` — SSR server bundle

Preview the build locally:

```bash
npm run preview
```

---

## Deployment

The app is an SSR application. It requires a server runtime that can execute the `.output/server/` bundle.

**Compatible runtimes:**

- Node.js 22.x
- Vercel with the TanStack Start framework setting
- Any runtime supported by the configured TanStack Start/Nitro adapter

For static export (no SSR), configure the TanStack Start adapter in `vite.config.ts`.

---

## Common Issues

### `routeTree.gen.ts` out of date

Run `npm run dev` or `npm run build` to regenerate it. Never edit manually.

### TypeScript errors in editor but build passes

The Vite build uses `esbuild` for transpilation and skips type-checking. Run `npx tsc --noEmit` for a full type check.

### Port already in use

Change the port in `vite.config.ts`:

```ts
server: {
  port: 5174;
}
```
