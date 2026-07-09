# Security Remediation Priority Audit & Roadmap

**Date:** 2026-06-13  
**Status:** Planning Phase  
**Baseline Risk Level:** 🔴 CRITICAL  
**Target Risk Level:** 🟢 LOW (after Phase 3 completion)

---

## Executive Summary

**Current Security Posture:** 10 work items identified with combined risk score of **68/100** (critical).

**Priority Order:** Address items in phases:

- **Phase 1 (Immediate - Days 1-7):** Blocks all other work; highest risk
- **Phase 2 (Short-term - Days 8-21):** Completes API-level security
- **Phase 3 (Medium-term - Days 22-35):** Adds persistence + audit trail
- **Phase 4 (Final - Days 36+):** UX redesign

**Total Estimated Effort:** 70-100 hours over 5-6 weeks

---

## Work Items Ranked by Risk Reduction

### **PHASE 1: CRITICAL AUTH & ROUTE PROTECTION**

---

#### **#1: Implement Employee Authentication**

| Metric                   | Value                                                           |
| ------------------------ | --------------------------------------------------------------- |
| **Risk Reduction Score** | **9/10** 🔴 CRITICAL                                            |
| **Current Risk**         | No login required; anyone can access /employee route            |
| **Impact**               | Eliminates cross-employee attack surface entirely               |
| **Effort Estimate**      | 6-10 hours                                                      |
| **Timeline**             | Days 1-2                                                        |
| **Dependencies**         | None (can start immediately)                                    |
| **Blocks**               | Route guards, RLS policies, server functions, timesheet backend |

**What's Required:**

- Supabase Auth signup/login setup
- `/auth/login` route with email/password form
- `/auth/signup` route for employee registration (optional, or admin-driven)
- Session management (JWT storage, refresh tokens)
- Route guard middleware to protect `/employee/*`
- User context hook to retrieve current employee

**Why First:**
Without employee authentication, all other security measures are incomplete. As long as anyone can navigate to `/employee` without login, they can exploit timesheet submission, employee data access, and cross-employee attacks. This is the **single highest-priority item**.

**Success Criteria:**

- ✅ Unauthenticated users redirected to `/auth/login` when accessing `/employee`
- ✅ Login with email + password creates session
- ✅ Session persists across page refreshes
- ✅ Logout clears session
- ✅ `auth.uid()` available in `createServerFn()` handlers

**Related Code:**

- `src/routes/employee.tsx` (currently no auth check)
- `src/routes/auth/login.tsx` (needs creation)
- Route guard middleware (needs creation)

---

#### **#2: Implement Route Guards**

| Metric                   | Value                                                         |
| ------------------------ | ------------------------------------------------------------- |
| **Risk Reduction Score** | **7/10** 🔴 HIGH                                              |
| **Current Risk**         | Route visibility metadata defined but not enforced at runtime |
| **Impact**               | Prevents unauthorized access to all protected routes          |
| **Effort Estimate**      | 4-6 hours                                                     |
| **Timeline**             | Days 2-3                                                      |
| **Dependencies**         | #1 (Employee authentication)                                  |
| **Blocks**               | Portal redesign (Phase 4)                                     |

**What's Required:**

- Middleware/hook to check `route-access.ts` metadata
- Compare authenticated user's role against `futureAllowedRoles`
- Redirect unauthorized users to `/` or `/auth/login`
- Handle edge cases (admin bypass, guest routes, etc.)

**Why Second:**
Once employees can log in, we need to prevent role-based bypass attacks. The route metadata already exists in `src/lib/route-access.ts`, but it's metadata-only (no runtime enforcement).

**Success Criteria:**

- ✅ Unauthenticated users cannot access routes marked `requiresAuthInPhase2: true`
- ✅ Employees cannot access `/admin`, `/employer`, `/client` routes (unless they have those roles)
- ✅ Public routes accessible to all
- ✅ Admin users can access all routes

**Related Code:**

- `src/lib/route-access.ts` (metadata source)
- `src/routes/__root.tsx` (root layout guard)
- New middleware file (e.g., `src/lib/route-guard.ts`)

---

### **PHASE 2: API-LEVEL SECURITY (Server Functions)**

---

#### **#4: Secure Employees.functions.ts**

| Metric                   | Value                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------ |
| **Risk Reduction Score** | **8/10** 🔴 CRITICAL                                                                 |
| **Current Risk**         | No auth/role validation in `listEmployeesFn`, `upsertEmployeeFn`, `deleteEmployeeFn` |
| **Impact**               | Prevents unauthorized CRUD on employee records                                       |
| **Effort Estimate**      | 2-4 hours                                                                            |
| **Timeline**             | Days 3-4                                                                             |
| **Dependencies**         | #1 (Employee auth), #2 (Route guards)                                                |
| **Blocks**               | Employer/client access to employee data                                              |

**What's Required:**

- Add `auth.uid()` validation in each server function
- Check user role matches required level (staff, employer, etc.)
- Validate ownership (e.g., employer can only see assigned employees)
- Return 403 Forbidden if unauthorized
- Add server-side input validation

**Current Vulnerable Functions:**

```typescript
listEmployeesFn(); // No role check; returns all employees to anyone
upsertEmployeeFn(); // No auth check; anyone can create/update employees
deleteEmployeeFn(); // No auth check; anyone can delete employees
```

**Why Phase 2:**
Once auth exists and routes are guarded, we need to prevent direct API exploitation. An attacker could bypass route guards via direct API calls (even though routes are protected, server functions accept browser-initiated requests).

**Success Criteria:**

- ✅ `listEmployeesFn()` returns only employees visible to caller's role
- ✅ `upsertEmployeeFn()` only works if user is staff or owner
- ✅ `deleteEmployeeFn()` only works if user is admin
- ✅ All functions validate `auth.uid()` exists
- ✅ Unauthorized requests return 403 with clear error

**Related Code:**

- `src/lib/api/employees.functions.ts` (lines 98-190)

---

#### **#5: Secure Employer_Requirements.functions.ts**

| Metric                   | Value                                                 |
| ------------------------ | ----------------------------------------------------- |
| **Risk Reduction Score** | **6/10** 🟠 HIGH                                      |
| **Current Risk**         | Cross-employer data exposure; no ownership validation |
| **Impact**               | Prevents employer-to-employer data leakage            |
| **Effort Estimate**      | 4-6 hours                                             |
| **Timeline**             | Days 4-5                                              |
| **Dependencies**         | #1, #2, #4 (employees secured first)                  |
| **Blocks**               | Multi-tenant employer portal                          |

**What's Required:**

- Add `auth.uid()` to employer role check
- Validate `employer_user_id = auth.uid()` for owner operations
- Staff can see all; employers see only own requirements
- Input validation (no SQL injection via requirement text)

**Current Vulnerable Functions:**

```typescript
listEmployerRequirementsFn(); // No role check; anyone can list all requirements
upsertEmployerRequirementFn(); // No owner validation; can modify others' requirements
```

**Why This Priority:**
Affects multi-tenant isolation. If not fixed, Employer A can see/modify Employer B's requirements, leading to data leakage and business impact.

**Success Criteria:**

- ✅ `listEmployerRequirementsFn()` filters by `employer_user_id = auth.uid()`
- ✅ Staff see all requirements
- ✅ Employers cannot update others' requirements
- ✅ 403 returned for unauthorized access

**Related Code:**

- `src/lib/api/employer-requirements.functions.ts` (lines 81-120)

---

#### **#6: Secure Client_Requirements.functions.ts**

| Metric                   | Value                                               |
| ------------------------ | --------------------------------------------------- |
| **Risk Reduction Score** | **6/10** 🟠 HIGH                                    |
| **Current Risk**         | Cross-client data exposure; no ownership validation |
| **Impact**               | Prevents client-to-client data leakage              |
| **Effort Estimate**      | 4-6 hours                                           |
| **Timeline**             | Days 5-6                                            |
| **Dependencies**         | #1, #2, #4 (employees secured first)                |
| **Blocks**               | Multi-tenant client portal                          |

**Similar to #5 (employer_requirements):**

- Add `auth.uid()` validation
- Validate `client_user_id = auth.uid()`
- Staff see all; clients see only own

**Current Vulnerable Functions:**

```typescript
listClientRequirementsFn(); // No role check
upsertClientRequirementFn(); // No owner validation
```

**Success Criteria:**

- ✅ `listClientRequirementsFn()` filters by `client_user_id = auth.uid()`
- ✅ 403 on unauthorized access

**Related Code:**

- `src/lib/api/client-requirements.functions.ts` (lines 90-135)

---

#### **#7: Secure Jobs.functions.ts**

| Metric                   | Value                                           |
| ------------------------ | ----------------------------------------------- |
| **Risk Reduction Score** | **6/10** 🟠 HIGH                                |
| **Current Risk**         | Job data exposure; no role-based filtering      |
| **Impact**               | Prevents unauthorized job creation/modification |
| **Effort Estimate**      | 2-4 hours                                       |
| **Timeline**             | Days 6-7                                        |
| **Dependencies**         | #1, #2 (auth + routes)                          |
| **Blocks**               | None (independent)                              |

**What's Required:**

- Add role check to `listJobRequirementsFn()`, `upsertJobRequirementFn()`, `deleteJobRequirementFn()`
- Staff create/modify; public can read published jobs
- Input validation

**Current Vulnerable Functions:**

```typescript
listJobRequirementsFn(); // No auth check
upsertJobRequirementFn(); // No role check; anyone can create jobs
deleteJobRequirementFn(); // No auth check
```

**Why This Priority:**
Jobs are less sensitive than employee/employer/client data, but still need protection to prevent spam/abuse.

**Success Criteria:**

- ✅ Only staff can create jobs
- ✅ Only staff can modify jobs
- ✅ Public can read published jobs
- ✅ Unauthorized requests blocked

**Related Code:**

- `src/lib/api/jobs.functions.ts` (lines 102-210)

---

### **PHASE 3: DATABASE-LEVEL SECURITY (RLS Policies)**

---

#### **#3: Add Employees Table RLS**

| Metric                   | Value                                                      |
| ------------------------ | ---------------------------------------------------------- |
| **Risk Reduction Score** | **7/10** 🔴 HIGH                                           |
| **Current Risk**         | Employee data unprotected at DB layer; RLS not enabled     |
| **Impact**               | Hardens employee data access; prevents service-role bypass |
| **Effort Estimate**      | 2-3 hours                                                  |
| **Timeline**             | Days 3-4 (parallel with #1)                                |
| **Dependencies**         | Auth system + `auth_user_id` column in employees table     |
| **Blocks**               | Timesheet backend, approved access patterns                |

**What's Required:**

- Enable RLS on `public.employees` table
- Write policy: Staff manage all employees
- Write policy: Employee reads own record
- Write policy: Employer reads assigned employees
- Test RLS policies

**Why This Priority:**
RLS provides **defense-in-depth** at the database layer. Even if server functions are compromised, RLS prevents data leakage. Must happen early (alongside auth) to establish patterns for other tables.

**Current Schema Issue:**

```sql
-- CURRENT: No RLS enabled
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;  -- TODO

-- TODO: Policies
CREATE POLICY "staff_manage_employees" ON public.employees
  FOR ALL USING (public.is_staff());

CREATE POLICY "employee_read_own" ON public.employees
  FOR SELECT USING (auth.uid() = auth_user_id);
```

**Success Criteria:**

- ✅ RLS enabled on employees table
- ✅ Staff can CRUD all employees
- ✅ Employee can read only own record
- ✅ Employer can read assigned employees
- ✅ Service-role client (in server functions) bypasses RLS

**Related Code:**

- `supabase/migrations/20260606_portal_role_policies.sql` (extend with employees policies)

---

#### **#9: Add Job_Requirements RLS**

| Metric                   | Value                                                               |
| ------------------------ | ------------------------------------------------------------------- |
| **Risk Reduction Score** | **5/10** 🟠 MEDIUM                                                  |
| **Current Risk**         | Partial RLS (read-published policy exists); missing employee access |
| **Impact**               | Completes RBAC for job data; enables employee job browsing          |
| **Effort Estimate**      | 2-3 hours                                                           |
| **Timeline**             | Days 10-11                                                          |
| **Dependencies**         | #3 (employees RLS pattern), job functions secured                   |
| **Blocks**               | None (nice-to-have)                                                 |

**What's Required:**

- Add policy: Staff manage all jobs
- Add policy: Employee reads published jobs
- Verify existing "public_read_published" policy works

**Current Policies:**

```sql
-- EXISTING: Public can read published
CREATE POLICY "public_read_published_jobs" ON public.job_requirements
  FOR SELECT USING (status = 'Published');

-- TODO: Complete RLS
CREATE POLICY "staff_manage_jobs" ON public.job_requirements
  FOR ALL USING (public.is_staff());

CREATE POLICY "employee_read_published" ON public.job_requirements
  FOR SELECT USING (status = 'Published' AND auth.uid() IS NOT NULL);
```

**Success Criteria:**

- ✅ Staff can CRUD all jobs
- ✅ Public/employee can read published jobs only
- ✅ Draft jobs invisible to non-staff
- ✅ RLS fully enforced

**Related Code:**

- `supabase/migrations/20260606_init.sql` (lines with job_requirements policies)

---

### **PHASE 4: PERSISTENCE & AUDIT**

---

#### **#8: Implement Timesheet Backend**

| Metric                   | Value                                                                |
| ------------------------ | -------------------------------------------------------------------- |
| **Risk Reduction Score** | **7/10** 🔴 HIGH                                                     |
| **Current Risk**         | localStorage-only; no persistence, audit trail, or multi-device sync |
| **Impact**               | Enables approval workflows, compliance, data recovery                |
| **Effort Estimate**      | 10-15 hours                                                          |
| **Timeline**             | Days 15-21                                                           |
| **Dependencies**         | #1, #3, #4, #5, #6, #7 (all Phase 1-2 items)                         |
| **Blocks**               | Employee portal redesign                                             |

**What's Required:**

- Create `timesheets` table with RLS
- Create `timesheet_approvals` table
- Create `timesheet_audit_log` table
- Create server functions: `saveDraftTimesheetFn()`, `submitTimesheetFn()`, `approveTimesheetFn()`
- Implement multi-stage approval workflow
- Add triggers for audit logging
- Implement email notifications

**Why This Priority:**
Requires all auth/role/function security to be in place first. High effort means it should wait until foundation is solid.

**Success Criteria:**

- ✅ Timesheets persisted to Supabase (not localStorage)
- ✅ Employee can submit own timesheets
- ✅ Employer/client can approve
- ✅ Full audit trail in `timesheet_audit_log`
- ✅ Multi-device sync works
- ✅ Approval notifications sent

**Related Code:**

- New migration: `supabase/migrations/20260613_timesheets_tables.sql`
- New server functions: `src/lib/api/timesheets.functions.ts`
- New RLS policies in migration

---

### **PHASE 5: UX REDESIGN**

---

#### **#10: Build Employee Portal Redesign**

| Metric                   | Value                                                   |
| ------------------------ | ------------------------------------------------------- |
| **Risk Reduction Score** | **5/10** 🟠 MEDIUM                                      |
| **Current Risk**         | Poor UX; confusing employee selection, no auth feedback |
| **Impact**               | Improves user experience + security posture signaling   |
| **Effort Estimate**      | 20-30 hours                                             |
| **Timeline**             | Days 22-35                                              |
| **Dependencies**         | #1-#9 (all backend work complete)                       |
| **Blocks**               | None (final phase)                                      |

**What's Required:**

- Login/signup flows (UX)
- Employee dashboard redesign
- Timesheet creation/submission forms
- Approval workflow UI
- Settings/profile management
- Help/support section
- Mobile responsiveness

**Why Last:**
No point redesigning UI if backend isn't secure. Redesign should happen after all plumbing is in place.

**Success Criteria:**

- ✅ Login required to access employee portal
- ✅ Clear timesheet submission flow
- ✅ Visible approval status + notifications
- ✅ Mobile-friendly design
- ✅ User feedback on errors

**Related Code:**

- `src/routes/employee.tsx` (full redesign)
- New components: `EmployeeDashboard`, `TimesheetForm`, `ApprovalWorkflow`

---

## Dependency Graph

```
PHASE 1 (Days 1-7)
    ↓
    #1: Employee Auth ─────────────┐
    ├─ #2: Route Guards            │
    ├─ #3: Employees RLS           │
    │                              │
    PHASE 2 (Days 8-21)            │
    ↓                              │
    #4: Secure employees.functions ├─┐
    ├─ #5: Secure employer_reqs    │ │
    ├─ #6: Secure client_reqs      │ │
    └─ #7: Secure jobs.functions   │ │
                                    │ │
    #9: Add job_requirements RLS ──┘ │
                                      │
    PHASE 3 (Days 22-35)             │
    ↓                                │
    #8: Timesheet Backend ──────────┘

    PHASE 4 (Days 36+)
    ↓
    #10: Portal Redesign
```

---

## Implementation Roadmap (By Phase)

### **PHASE 1: AUTH + ROUTES (Days 1-7, ~20 hours)**

| Day       | Task              | Hours           | Owner    | Acceptance Criteria                        |
| --------- | ----------------- | --------------- | -------- | ------------------------------------------ |
| 1-2       | #1: Employee Auth | 6-10            | Backend  | Login/signup working; session persists     |
| 2-3       | #2: Route Guards  | 4-6             | Backend  | Protected routes block unauthorized access |
| 3-4       | #3: Employees RLS | 2-3             | Database | RLS enabled; policies tested               |
| **Total** |                   | **12-19 hours** |          | All items in Phase 1 complete ✅           |

**Go/No-Go Gate:** ✅ Proceed to Phase 2 only if all Phase 1 items pass acceptance criteria.

---

### **PHASE 2: API SECURITY (Days 8-21, ~20 hours)**

| Day       | Task                             | Hours           | Owner    | Acceptance Criteria             |
| --------- | -------------------------------- | --------------- | -------- | ------------------------------- |
| 3-4       | #4: Secure employees.functions   | 2-4             | Backend  | All functions check auth.uid()  |
| 4-5       | #5: Secure employer_requirements | 4-6             | Backend  | Owner validation working        |
| 5-6       | #6: Secure client_requirements   | 4-6             | Backend  | Owner validation working        |
| 6-7       | #7: Secure jobs.functions        | 2-4             | Backend  | Role-based filtering works      |
| 10-11     | #9: Add job_requirements RLS     | 2-3             | Database | RLS policies complete           |
| **Total** |                                  | **14-23 hours** |          | All server functions secured ✅ |

**Go/No-Go Gate:** ✅ All 401/403 responses tested; rate limiting planned for Phase 4.

---

### **PHASE 3: PERSISTENCE (Days 15-21, ~15 hours)**

| Day       | Task                  | Hours           | Owner   | Acceptance Criteria                                           |
| --------- | --------------------- | --------------- | ------- | ------------------------------------------------------------- |
| 15-21     | #8: Timesheet Backend | 10-15           | Backend | Tables created; server functions working; audit log populated |
| **Total** |                       | **10-15 hours** |         | Timesheets persisted; approval workflow functional ✅         |

**Go/No-Go Gate:** ✅ End-to-end workflow tested: employee submit → employer approve → admin sign-off.

---

### **PHASE 4: UX (Days 22-35, ~25 hours)**

| Day       | Task                 | Hours           | Owner    | Acceptance Criteria                      |
| --------- | -------------------- | --------------- | -------- | ---------------------------------------- |
| 22-35     | #10: Portal Redesign | 20-30           | Frontend | All user flows tested; mobile responsive |
| **Total** |                      | **20-30 hours** |          | Portal launch-ready ✅                   |

---

## Risk Reduction Timeline

```
Current Risk Score: 68/100 (CRITICAL 🔴)

After Phase 1 (Day 7):  55/100 (HIGH 🟠)
  - Employee auth eliminates cross-employee attacks
  - Route guards prevent role bypass
  - RLS provides DB-level defense

After Phase 2 (Day 21): 25/100 (MEDIUM 🟡)
  - API-level validation prevents exploitation
  - Multi-tenant isolation enforced

After Phase 3 (Day 35): 10/100 (LOW 🟢)
  - Audit trail enables compliance
  - Approval workflows complete
  - Ready for production

After Phase 4 (Day 42): 5/100 (LOW 🟢)
  - UX improvements reduce user errors
  - Security posture clear to users
```

---

## Resource Allocation

**Recommended Team:**

- 1 Backend Engineer (Phase 1, 2, 3): Owns auth, server functions, database
- 1 Frontend Engineer (Phase 1, 4): Owns login UI, portal redesign
- 1 Database/Infrastructure Engineer (Phase 1-3): Owns RLS policies, migrations
- 1 QA Engineer (All phases): Testing, acceptance criteria validation

**Total FTE:** ~2.5 engineers for 5-6 weeks

---

## Success Metrics

| Metric                          | Current              | Target (Phase 3)   | Target (Phase 4)     |
| ------------------------------- | -------------------- | ------------------ | -------------------- |
| Authentication Required         | ❌ No                | ✅ Yes             | ✅ Yes               |
| Cross-employee attacks possible | ❌ Yes               | ✅ No              | ✅ No                |
| RLS enabled on sensitive tables | ❌ No                | ✅ 50% (employees) | ✅ 100% (all tables) |
| API functions have auth checks  | ❌ 0%                | ✅ 100%            | ✅ 100%              |
| Timesheet persistence           | ❌ localStorage only | ✅ Supabase        | ✅ Supabase          |
| Audit trail exists              | ❌ No                | ✅ Yes (full)      | ✅ Yes + reporting   |
| Multi-stage approval workflow   | ❌ No                | ✅ Yes             | ✅ Yes (UI polished) |
| Security risk score             | 68/100               | 10/100             | 5/100                |

---

## Go/No-Go Gates

### **After Phase 1 (Day 7):**

- [ ] Employee can log in with email/password
- [ ] Route guards block unauthenticated access to /employee
- [ ] auth.uid() available in server functions
- [ ] RLS enabled on employees table; policies tested
- **Decision:** Proceed to Phase 2 if ✅ all items pass

### **After Phase 2 (Day 21):**

- [ ] All server functions check auth.uid()
- [ ] Unauthorized requests return 403
- [ ] Multi-tenant isolation verified (employer A can't see employer B's data)
- [ ] Job RLS policies complete
- **Decision:** Proceed to Phase 3 if ✅ all items pass

### **After Phase 3 (Day 35):**

- [ ] Timesheets persisted to Supabase
- [ ] Multi-stage approval workflow end-to-end tested
- [ ] Audit log captures all changes
- [ ] Email notifications sent on approval
- **Decision:** Proceed to Phase 4 (portal redesign) if ✅ all items pass

### **After Phase 4 (Day 42):**

- [ ] Login flow UX tested with employees
- [ ] Portal responsive on mobile/desktop
- [ ] All user acceptance tests pass
- [ ] Security audit passed (external or internal)
- **Decision:** Deploy to production if ✅ all items pass

---

## Risks & Mitigation

| Risk                                                | Impact                | Mitigation                                                                        |
| --------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------- |
| **Auth implementation takes longer than estimated** | Blocks all other work | Allocate 2 engineers; use Supabase Auth (don't build custom)                      |
| **RLS policy bugs cause data leakage**              | Security breach       | Peer review all policies; test with multiple users                                |
| **Service-role client grants too much access**      | Bypass RLS            | Use `supabase.rls()` only in server functions; separate key for client            |
| **Employees reject new login requirement**          | User adoption failure | Communicate early; provide password reset support; demo new features              |
| **Database migration fails in production**          | Downtime              | Test migration in staging; have rollback plan; schedule during low-traffic window |
| **Email notifications fail silently**               | Missed approvals      | Add retry logic; monitor email delivery logs; manual fallback                     |

---

## Testing Strategy

### **Phase 1 Testing:**

- [ ] Manual login/logout flow
- [ ] Session persistence across page refreshes
- [ ] Redirect to login for protected routes
- [ ] RLS policies tested with `psql` (manual queries)

### **Phase 2 Testing:**

- [ ] API calls without auth return 401
- [ ] API calls with wrong role return 403
- [ ] Multi-tenant isolation: employer A can't modify employer B's data
- [ ] Edge cases: admin bypass, staff override

### **Phase 3 Testing:**

- [ ] Timesheet create/read/update/delete workflow
- [ ] Approval state transitions
- [ ] Audit log entries for each action
- [ ] Email notifications sent on status changes
- [ ] Multi-device sync (submit on device A, refresh device B)

### **Phase 4 Testing:**

- [ ] User acceptance testing (UAT) with employees
- [ ] Mobile responsiveness
- [ ] Accessibility (WCAG 2.1 AA)
- [ ] Performance (page load < 3s)

---

## Post-Implementation Hardening (Future)

These items extend the roadmap but are **not critical** for initial launch:

1. **Rate Limiting** (2-3 hours)
   - API endpoints limited to 100 req/min per user
   - Prevent brute-force password attacks

2. **MFA (Multi-factor Authentication)** (4-6 hours)
   - SMS/TOTP for sensitive operations (timesheet approval)
   - Optional for initial launch; recommend for Phase 5

3. **SSO Integration** (8-12 hours)
   - OAuth 2.0 with corporate identity provider
   - Future enhancement; not required for MVP

4. **Data Encryption at Rest** (4-6 hours)
   - Supabase encryption handled by default; review for sensitive fields
   - Consider column-level encryption for salary data

5. **Penetration Testing** (8-16 hours)
   - External security audit
   - Recommended after Phase 3; before Phase 4 public launch

---

## Conclusion

**Recommended Approach:**

✅ Start **immediately** with Phase 1 (Employee Auth + Routes)  
✅ Proceed to Phase 2 after Phase 1 gate passes (Day 7)  
✅ Proceed to Phase 3 after Phase 2 gate passes (Day 21)  
✅ Proceed to Phase 4 after Phase 3 gate passes (Day 35)  
✅ Target production deployment: **Week 7 (Day 42)**

**Current Status:** 🔴 CRITICAL → **Target Status:** 🟢 LOW (after Phase 3)

**Success = Security + UX + Compliance:** All three achieved after Phase 4.
