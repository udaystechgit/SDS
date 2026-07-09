# SDS AI Core

SDS AI Core is a full-stack web platform for SDS Consulting Services, focused on AI data center staffing, infrastructure operations, and role-based workforce portals.

## Project Docs

- [Project Report](docs/project-report.md)
- [Tech Stack](docs/tech-stack.md)
- [Architecture](docs/architecture.md)
- [Routes](docs/routes.md)
- [Portals](docs/portals.md)
- [Supabase Backend](docs/backend-supabase.md)
- [Development Guide](docs/development.md)

## Public Website

The marketing site includes the home page, services, about, careers, and contact pages. The current public contact details are:

- Email: `hr@sdsconsultingservice.com`
- Phone: `+1 262-270-9899`
- Address: `2761 Allied Street, 1st Floor, Green Bay, WI 54304`

## Portal Areas

- Admin: workforce, jobs, leave, timesheets, activity, and reporting
- Employee: dashboard, profile, documents, leave, and timesheets
- Employer: jobs, candidates, timesheets, and reports
- Client: requirements, resources, timesheets, and invoices

## Setup

1. Install dependencies with `npm install`.
2. Create a `.env` file with the required Supabase values:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Start development with `npm run dev`.
4. Build production output with `npm run build`.

See [docs/development.md](docs/development.md) for detailed local workflow notes.
