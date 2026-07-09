# Portals

SDS AI Core has four internal portals, each scoped to a specific user role. All portals share a common `InternalPortalNav` sidebar/header and a `PortalBanner` component.

---

## Admin Portal — `/admin`

**Audience:** SDS internal administrators

| Route           | URL                    | Description                                                           |
| --------------- | ---------------------- | --------------------------------------------------------------------- |
| Dashboard       | `/admin`               | Overview / landing                                                    |
| Timesheets      | `/admin/timesheets`    | Review, approve, and reject submitted timesheets across all employees |
| Employees       | `/admin/employees`     | List of all employees                                                 |
| Employee Detail | `/admin/employees/:id` | Individual employee profile and history                               |
| Jobs            | `/admin/jobs`          | Active and historical job postings                                    |
| Reports         | `/admin/reports`       | Aggregated workforce and billing reports                              |

### Timesheet Workflow (Admin)

- Admins see all submitted timesheets in a table
- Each row has **Approve** / **Reject** actions
- Approval cascades: approved timesheets become billable and feed into client invoice generation

---

## Client Portal — `/client`

**Audience:** Enterprise clients who have engaged SDS for staffing

| Route        | URL                    | Description                                                 |
| ------------ | ---------------------- | ----------------------------------------------------------- |
| Dashboard    | `/client`              | Overview / landing                                          |
| Timesheets   | `/client/timesheets`   | View approved timesheets for workers deployed at their site |
| Invoices     | `/client/invoices`     | View generated invoices based on approved timesheets        |
| Resources    | `/client/resources`    | Deployed resource list                                      |
| Requirements | `/client/requirements` | Open staffing requirements / job requests                   |

### Invoice Generation Logic (`client.invoices.tsx`)

Invoices are derived from approved timesheets:

- Billing rate: **$80 / hour**
- A `phaseOneInvoices` memo computes invoice records from `readTimesheets()` where `status === "approved"`
- If persisted invoices exist in storage (`readInvoices()`), those take precedence over the computed set

---

## Employer Portal — `/employer`

**Audience:** Partner employers or hiring managers

| Route      | URL                    | Description                          |
| ---------- | ---------------------- | ------------------------------------ |
| Dashboard  | `/employer`            | Overview / landing                   |
| Timesheets | `/employer/timesheets` | View and manage submitted timesheets |
| Candidates | `/employer/candidates` | View candidate pipeline              |
| Jobs       | `/employer/jobs`       | Active job listings                  |
| Reports    | `/employer/reports`    | Recruitment and billing reports      |

---

## Employee Portal — `/employee`

**Audience:** Field technicians and deployed staff

| Route     | URL         | Description                      |
| --------- | ----------- | -------------------------------- |
| Dashboard | `/employee` | Personal profile and quick links |

Employees typically submit timesheets through this portal. Time entries feed into the admin approval workflow.

---

## Shared Portal Components

| Component           | Description                                                      |
| ------------------- | ---------------------------------------------------------------- |
| `InternalPortalNav` | Sidebar/top nav present on all portal pages. Links vary by role. |
| `PortalBanner`      | Page header banner with title and breadcrumb inside portals      |

---

## Role Access Summary

| Role     | Admin Portal   | Client Portal  | Employer Portal | Employee Portal  |
| -------- | -------------- | -------------- | --------------- | ---------------- |
| Admin    | ✅ Full access | —              | —               | —                |
| Client   | —              | ✅ Full access | —               | —                |
| Employer | —              | —              | ✅ Full access  | —                |
| Employee | —              | —              | —               | ✅ Own data only |

> Authentication / authorization guards are not yet enforced at the route level. Role-based access control (RBAC) should be added via route `beforeLoad` guards in a future iteration.
