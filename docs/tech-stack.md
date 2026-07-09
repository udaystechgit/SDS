# Tech Stack

Last updated: July 9, 2026

## Runtime And Framework

| Layer                | Technology     | Current Use                                                            |
| -------------------- | -------------- | ---------------------------------------------------------------------- |
| Language             | TypeScript     | Strict typed application code                                          |
| UI runtime           | React 19       | Component rendering and hydration                                      |
| Full-stack framework | TanStack Start | SSR, routing integration, server functions                             |
| Build tool           | Vite 7         | Dev server, HMR, client/SSR production builds                          |
| Server engine        | Nitro 3 beta   | Server bundle/runtime output through TanStack Start                    |
| Package manager      | npm            | `package-lock.json` is present and scripts use npm-compatible commands |
| Node target          | Node 22.x      | Declared in `package.json` engines                                     |

## Routing And Data

| Technology               | Role                                                      |
| ------------------------ | --------------------------------------------------------- |
| `@tanstack/react-router` | File-based routes, type-safe links, route tree generation |
| `@tanstack/react-start`  | SSR adapter and `createServerFn` server functions         |
| `@tanstack/react-query`  | Async data and cache management                           |
| Supabase JS              | Auth-aware database client and server-side service access |
| Zod                      | Runtime validation for forms and server function inputs   |

## UI And Styling

| Technology                    | Role                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| Tailwind CSS 4                | Utility-first styling                                                               |
| Radix UI                      | Accessible primitives for dialogs, menus, forms, tabs, sheets, and related controls |
| shadcn-style local components | Reusable UI wrappers under `src/components/ui/`                                     |
| Lucide React                  | Icon system                                                                         |
| class-variance-authority      | Component variant composition                                                       |
| clsx and tailwind-merge       | Conditional class composition and class conflict handling                           |
| Sonner                        | Toast notifications                                                                 |
| Recharts                      | Reporting and chart visualizations                                                  |

## Forms And Validation

| Technology            | Role                                      |
| --------------------- | ----------------------------------------- |
| React Hook Form       | Form state management                     |
| `@hookform/resolvers` | Zod resolver integration                  |
| Zod                   | Schema validation and typed input parsing |

## Backend Infrastructure

| Area                   | Location                             |
| ---------------------- | ------------------------------------ |
| Supabase client        | `src/lib/supabase/client.ts`         |
| Supabase server access | `src/lib/supabase/server.server.ts`  |
| Database types         | `src/lib/supabase/database.types.ts` |
| Server functions       | `src/lib/api/*.functions.ts`         |
| Migrations             | `supabase/migrations/`               |
| Server config          | `src/lib/config.server.ts`           |

## Application Structure

| Path                   | Purpose                                                         |
| ---------------------- | --------------------------------------------------------------- |
| `src/routes/`          | TanStack file routes for public pages and portals               |
| `src/components/`      | Shared layout, navigation, portal, marketing, and UI components |
| `src/lib/`             | Auth, API, Supabase, SEO, utilities, and domain models          |
| `src/assets/`          | App images used by the Vite pipeline                            |
| `public/`              | Static public assets and redirects                              |
| `docs/`                | Project documentation                                           |
| `supabase/migrations/` | Database schema and policy migrations                           |

## Scripts

| Command           | Purpose                                          |
| ----------------- | ------------------------------------------------ |
| `npm run dev`     | Start the Vite/TanStack Start development server |
| `npm run build`   | Build client, SSR, and Nitro production output   |
| `npm run preview` | Preview the production build locally             |
| `npm run lint`    | Run ESLint                                       |
| `npm run format`  | Run Prettier over the project                    |

## Deployment

The project includes `vercel.json` with the TanStack Start framework setting. Production requires the Supabase environment variables to be configured in the deployment environment.

Required Supabase environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Current Build Notes

`npm run build` completes successfully. Current warnings are non-blocking and include:

- TanStack Start server function deprecation warnings for `.inputValidator()`
- Large chunk warning for the main client bundle
- Bundler notices for ignored `"use client"` directives in third-party modules
