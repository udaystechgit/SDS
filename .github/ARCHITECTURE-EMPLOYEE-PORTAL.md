# Production-Ready Employee Portal Architecture Proposal

**Status:** Design Phase  
**Date:** 2026-06-13  
**Baseline:** Current state has NO authentication, localStorage-only timesheets, cross-employee attack surface  
**Target:** Enterprise-grade employee portal with auth, RLS, audit trail, multi-level approval

---

## Executive Summary

Current State: ❌ **Not production-ready**

- No authentication required
- Any user can submit timesheets as any employee
- No persistence layer (localStorage only)
- No audit trail or approval workflow
- No role separation between employee/admin/recruiter

Proposed State: ✅ **Production-ready**

- Employee-initiated Supabase Auth accounts (email/password + MFA-ready)
- 1:1 mapping: `auth.uid()` → `employees.uid`
- Timesheets persisted to Supabase with full RLS protection
- Multi-level approval workflow (employer → client → admin)
- Audit trail for compliance

---

## 1. Authentication Architecture

### 1.1 Should employees have their own Supabase Auth accounts?

**Yes. Recommendation: Mandatory employee-initiated signup.**

**Rationale:**

- Each employee needs a unique authenticated identity (`auth.uid()`)
- Timesheets must be cryptographically tied to the submitter
- Approval workflows require identity and audit trail
- Support for future MFA/SSO integrations
- Compliance with employment law (identity verification, audit trail)

**Account Lifecycle:**

1. **Recruitment Phase:** Recruiter (staff role) creates employee record in `public.employees` (uid = NULL)
2. **Onboarding Phase:** Employee signs up via `/auth/signup` → Supabase Auth creates account
3. **Identity Link:** After signup, employee auth record auto-links to `employees.uid = auth.uid()`
4. **Active Phase:** Employee can log in and use portal
5. **Offboarding:** Recruiter disables employee in `public.employees` (status = 'inactive'); auth account persists (for audit trail)

---

### 1.2 Can employees log in using email/password?

**Yes. Recommendation: Email/password + optional email verification.**

**Login Flow:**

```
Employee navigates to /auth/login
↓
Enters email + password
↓
Supabase.auth.signInWithPassword({ email, password })
↓
Session created (JWT in localStorage)
↓
auth.uid() from JWT matches employees.uid
↓
Redirected to /employee/dashboard
```

**Optional Enhancement (Phase 2):**

- Email verification: Required before first timesheet submission
- Password reset: Available via forgot-password flow
- MFA: "Magic link" SMS or TOTP (future)

**Security Considerations:**

- Password storage: Delegated to Supabase Auth (bcrypt, salted)
- Session management: JWT with configurable TTL (default 60 min browser, 7 day refresh)
- HTTPS-only cookies for secure token storage

---

### 1.3 How should auth.uid() map to employees.uid?

**Architecture: Direct 1:1 mapping via uid field**

**Current Schema Issue:**

```sql
-- CURRENT: employees.uid is TEXT, used for display only
CREATE TABLE public.employees (
  id UUID PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,  -- Display UID, NOT auth.uid()
  name TEXT NOT NULL,
  email TEXT,
  ...
);
-- Problem: uid field is independent from Supabase Auth
```

**Proposed Fix: Add auth_user_id column (PostgreSQL uuid type)**

```sql
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT NOT NULL UNIQUE,           -- Keep for backward compat + display
  auth_user_id UUID NOT NULL UNIQUE,  -- NEW: Supabase auth.uid()
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'active',       -- 'active' | 'inactive' | 'onboarding'
  job_title TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  ...
  FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
```

**Mapping Pattern:**

| Component                 | Maps To                  | Type | Example                                |
| ------------------------- | ------------------------ | ---- | -------------------------------------- |
| Supabase JWT `auth.uid()` | `employees.auth_user_id` | UUID | `550e8400-e29b-41d4-a716-446655440000` |
| Display / HR records      | `employees.uid`          | TEXT | `EMP-2025-00001`                       |
| Database primary key      | `employees.id`           | UUID | `660e8400-e29b-41d4-a716-446655440111` |

**Server Function Pattern (in createServerFn):**

```typescript
export const getCurrentEmployee = createServerFn({ method: "GET" }).handler(async () => {
  const { auth } = createServerRequest();
  const userId = auth.uid(); // Supabase JWT sub claim

  // Lookup: auth.uid() → employees.auth_user_id
  const { data: employee, error } = await supabaseServer
    .from("employees")
    .select("*")
    .eq("auth_user_id", userId)
    .single();

  if (error) throw new UnauthorizedError("Employee record not found");
  return employee;
});
```

---

## 2. Data Persistence Architecture

### 2.1 Should timesheets be stored in Supabase instead of localStorage?

**Yes. Recommendation: Supabase as system-of-record, localStorage as cache only.**

**Current Pain Points:**

- ❌ Data lost on browser clear
- ❌ No multi-device sync
- ❌ No approval workflow possible
- ❌ No audit trail
- ❌ No employer/client visibility
- ❌ No data backup

**Proposed Hybrid Approach:**

```
┌─────────────────────────────────────────────────────────┐
│ Timesheet Submission Flow                               │
├─────────────────────────────────────────────────────────┤
│ 1. Employee fills form (client-side, validated)         │
│ 2. onClick "Save Draft" → POST to createServerFn        │
│ 3. createServerFn:                                      │
│    - Validates auth.uid() ownership                     │
│    - Creates row in timesheets table                   │
│    - Status = 'Draft'                                   │
│ 4. Returns { id, createdAt } to client                 │
│ 5. Client stores in localStorage as cache               │
│ 6. On subsequent load, hydrate from Supabase (not cache)│
│                                                         │
│ onClick "Submit for Approval" → Status = 'Submitted'   │
│ → Email notifications sent to employer/client          │
│ → Workflow transitions                                  │
└─────────────────────────────────────────────────────────┘
```

**Key Principle:** Supabase is source-of-truth; localStorage is ephemeral cache.

---

### 2.2 What new tables are required?

#### **Table 1: Timesheets (main)**

```sql
CREATE TABLE public.timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  -- Hours breakdown
  monday INT CHECK (monday >= 0 AND monday <= 24),
  tuesday INT CHECK (tuesday >= 0 AND tuesday <= 24),
  wednesday INT CHECK (wednesday >= 0 AND wednesday <= 24),
  thursday INT CHECK (thursday >= 0 AND thursday <= 24),
  friday INT CHECK (friday >= 0 AND friday <= 24),
  saturday INT CHECK (saturday >= 0 AND saturday <= 24),
  sunday INT CHECK (sunday >= 0 AND sunday <= 24),
  total_hours INT GENERATED ALWAYS AS (
    monday + tuesday + wednesday + thursday + friday + saturday + sunday
  ) STORED,
  -- Metadata
  project_name TEXT,
  work_summary TEXT,
  blockers TEXT,
  status TEXT NOT NULL DEFAULT 'Draft',  -- 'Draft' | 'Submitted' | 'Rejected' | 'Approved'
  submitted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  -- Audit trail (populated by triggers)
  submitted_by UUID REFERENCES auth.users(id),
  submitted_ip_address INET,
  INDEX ON (employee_id, week_start_date, status)
);

-- Constraint: One timesheet per employee per week
ALTER TABLE public.timesheets
ADD CONSTRAINT unique_employee_week UNIQUE (employee_id, week_start_date);
```

#### **Table 2: Timesheet Approvals (workflow tracking)**

```sql
CREATE TABLE public.timesheet_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id UUID NOT NULL REFERENCES public.timesheets(id) ON DELETE CASCADE,
  approval_stage TEXT NOT NULL,  -- 'employer' | 'client' | 'admin'
  approver_role TEXT NOT NULL,   -- For audit trail
  status TEXT NOT NULL DEFAULT 'Pending',  -- 'Pending' | 'Approved' | 'Rejected'
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX ON (timesheet_id, approval_stage, status)
);
```

#### **Table 3: Timesheet Audit Log (compliance)**

```sql
CREATE TABLE public.timesheet_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id UUID NOT NULL REFERENCES public.timesheets(id) ON DELETE CASCADE,
  action TEXT NOT NULL,  -- 'created' | 'submitted' | 'approved' | 'rejected' | 'modified'
  actor_user_id UUID REFERENCES auth.users(id),
  actor_role TEXT,
  changes JSONB,  -- Delta of what changed (for edit tracking)
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX ON (timesheet_id, created_at)
);
```

#### **Table 4: Employee-Employer Assignments (for routing approvals)**

```sql
-- EXISTING: employee_requirements table tracks which jobs/employers an employee is assigned to
-- Extend this to route timesheet approvals:

-- Link: Which employers can approve an employee's timesheets?
CREATE TABLE public.employee_employer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  employer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_type TEXT,  -- 'direct_hire' | 'contract' | 'staffing'
  status TEXT DEFAULT 'active',  -- 'active' | 'completed' | 'paused'
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (employee_id, employer_user_id)
);
```

#### **Updated Table 5: Employees (schema changes)**

```sql
-- Add these columns to existing employees table:
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS (
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',  -- 'active' | 'inactive' | 'onboarding'
  email TEXT UNIQUE NOT NULL,
  onboarded_at TIMESTAMP,
  offboarded_at TIMESTAMP
);
```

#### **Table 6: Employee Portal Settings (optional, for future UX)**

```sql
CREATE TABLE public.employee_portal_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL UNIQUE REFERENCES public.employees(id) ON DELETE CASCADE,
  -- Notification preferences
  notify_approval_status BOOLEAN DEFAULT true,
  notify_email TEXT,
  -- Portal preferences
  preferred_hours_view TEXT DEFAULT 'weekly',  -- 'weekly' | 'monthly' | 'daily'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 3. RLS Policies Architecture

### 3.1 What RLS policies would eventually be needed?

**Principle:** Each role sees only data they are authorized to access. Service-role client (used in server functions) bypasses RLS.

#### **Policy Set 1: Employees Table**

```sql
-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Policy 1A: Staff (admin/recruiter) see all employees
CREATE POLICY "staff_manage_employees" ON public.employees
  FOR ALL USING (public.is_staff());

-- Policy 1B: Employee sees only their own record
CREATE POLICY "employee_read_own" ON public.employees
  FOR SELECT USING (
    auth.uid() = auth_user_id
  );

-- Policy 1C: Public read published career info (not sensitive HR data)
CREATE POLICY "public_read_careers" ON public.employees
  FOR SELECT USING (
    status = 'public_career_profile' -- Only if opted in
    AND is_staff() IS FALSE
  );

-- Policy 1D: Employer sees employees they are associated with
CREATE POLICY "employer_read_assigned_employees" ON public.employees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.employee_employer_assignments
      WHERE employee_id = employees.id
      AND employer_user_id = auth.uid()
      AND status = 'active'
    )
  );
```

#### **Policy Set 2: Timesheets Table**

```sql
-- Enable RLS
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;

-- Policy 2A: Employee submits own timesheets (Draft stage)
CREATE POLICY "employee_insert_own_draft" ON public.timesheets
  FOR INSERT WITH CHECK (
    employee_id IN (
      SELECT id FROM public.employees WHERE auth_user_id = auth.uid()
    )
    AND status = 'Draft'
    AND submitted_at IS NULL
  );

-- Policy 2B: Employee updates own Draft timesheets
CREATE POLICY "employee_update_own_draft" ON public.timesheets
  FOR UPDATE USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE auth_user_id = auth.uid()
    )
    AND status = 'Draft'
  )
  WITH CHECK (
    employee_id IN (
      SELECT id FROM public.employees WHERE auth_user_id = auth.uid()
    )
    AND status IN ('Draft', 'Submitted')  -- Can only transition to Submitted
  );

-- Policy 2C: Employee reads own timesheets (all statuses)
CREATE POLICY "employee_read_own_timesheets" ON public.timesheets
  FOR SELECT USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE auth_user_id = auth.uid()
    )
  );

-- Policy 2D: Employer reads timesheets from assigned employees
CREATE POLICY "employer_read_assigned_timesheets" ON public.timesheets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.employee_employer_assignments
      WHERE employee_id = timesheets.employee_id
      AND employer_user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Policy 2E: Staff (admin/recruiter) see all timesheets
CREATE POLICY "staff_manage_timesheets" ON public.timesheets
  FOR ALL USING (public.is_staff());

-- Policy 2F: Client sees timesheets routed through their requirements
CREATE POLICY "client_read_routed_timesheets" ON public.timesheets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.client_requirements cr
      WHERE cr.job_requirement_id IN (
        SELECT id FROM public.job_requirements
        WHERE employee_id = timesheets.employee_id
      )
      AND cr.client_user_id = auth.uid()
      AND cr.status = 'active'
    )
  );
```

#### **Policy Set 3: Timesheet Approvals Table**

```sql
-- Enable RLS
ALTER TABLE public.timesheet_approvals ENABLE ROW LEVEL SECURITY;

-- Policy 3A: Employer approves timesheets (employer stage)
CREATE POLICY "employer_approve_timesheets" ON public.timesheet_approvals
  FOR UPDATE USING (
    approval_stage = 'employer'
    AND EXISTS (
      SELECT 1 FROM public.timesheets t
      INNER JOIN public.employee_employer_assignments ea
        ON t.employee_id = ea.employee_id
      WHERE t.id = timesheet_approvals.timesheet_id
      AND ea.employer_user_id = auth.uid()
    )
  );

-- Policy 3B: Client approves timesheets (client stage)
CREATE POLICY "client_approve_timesheets" ON public.timesheet_approvals
  FOR UPDATE USING (
    approval_stage = 'client'
    AND EXISTS (
      SELECT 1 FROM public.timesheets t
      INNER JOIN public.client_requirements cr
        ON cr.job_requirement_id IN (
          SELECT id FROM public.job_requirements
          WHERE employee_id = t.employee_id
        )
      WHERE t.id = timesheet_approvals.timesheet_id
      AND cr.client_user_id = auth.uid()
    )
  );

-- Policy 3C: Staff approves timesheets (admin stage)
CREATE POLICY "staff_approve_timesheets" ON public.timesheet_approvals
  FOR ALL USING (
    approval_stage = 'admin'
    AND public.is_staff()
  );

-- Policy 3D: All users read approval history for their own timesheets
CREATE POLICY "read_approval_history" ON public.timesheet_approvals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.timesheets t
      WHERE t.id = timesheet_id
      AND t.employee_id IN (
        SELECT id FROM public.employees WHERE auth_user_id = auth.uid()
      )
    )
    OR public.is_staff()
  );
```

#### **Policy Set 4: Audit Log (read-only for compliance)**

```sql
-- Enable RLS
ALTER TABLE public.timesheet_audit_log ENABLE ROW LEVEL SECURITY;

-- Only staff can read audit logs (compliance/HR)
CREATE POLICY "staff_read_audit_logs" ON public.timesheet_audit_log
  FOR SELECT USING (public.is_staff());
```

---

## 4. Recommended Architecture for Key Flows

### 4.1 Employee Login Flow

```
┌────────────────────────────────────────────────────────────┐
│ EMPLOYEE LOGIN SEQUENCE                                     │
├────────────────────────────────────────────────────────────┤
│                                                              │
│ 1. USER NAVIGATES TO /auth/login                           │
│    └─ Route guard: if authenticated, redirect to /employee │
│                                                              │
│ 2. FORM SUBMISSION                                         │
│    email: "alice@acme.com"                                 │
│    password: "••••••"                                       │
│    └─ POST /auth/login (client-side action)               │
│                                                              │
│ 3. SUPABASE AUTH                                           │
│    supabase.auth.signInWithPassword({email, password})    │
│    └─ Success: JWT token in browser                        │
│    └─ Failure: "Invalid credentials" error                │
│                                                              │
│ 4. VALIDATE EMPLOYEE RECORD                               │
│    createServerFn: validateEmployeeLoginFn()               │
│    - Read: auth.uid() from JWT                            │
│    - Query: SELECT * FROM employees WHERE auth_user_id = auth.uid()  │
│    - Verify: status != 'inactive' AND status != 'onboarding' │
│    - Return: { id, uid, name, email, status }             │
│                                                              │
│ 5. ROUTE TO DASHBOARD                                     │
│    if validated: /employee/dashboard                       │
│    if not found: /auth/employee-not-found                 │
│    if inactive: /auth/access-denied                        │
│                                                              │
│ 6. HYDRATE EMPLOYEE CONTEXT                               │
│    useQueryEmployee() hook:                                │
│    - Called in __root.tsx or employee layout               │
│    - Sets global context with employee name, uid, id       │
│    - Used in subsequent server functions                   │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

**Code Pattern:**

```typescript
// src/lib/api/auth.functions.ts
export const validateEmployeeLoginFn = createServerFn({ method: "GET" }).handler(async () => {
  const { auth } = createServerRequest();
  const userId = auth.uid();

  if (!userId) throw new Error("Not authenticated");

  const employee = await supabaseServer
    .from("employees")
    .select("id, uid, name, email, status")
    .eq("auth_user_id", userId)
    .eq("status", "active")
    .single();

  if (error) {
    if (error.code === "PGRST116") throw new UnauthorizedError("Employee not found");
    throw error;
  }

  return employee.data;
});

// src/routes/employee.tsx
export const Route = createFileRoute("/employee")({
  beforeLoad: async ({ context }) => {
    // Guard: must be authenticated
    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      throw redirect({ to: "/auth/login" });
    }

    // Validate employee record exists and is active
    const employee = await validateEmployeeLoginFn();
    return { employee };
  },
  component: EmployeeLayout,
});
```

---

### 4.2 Employee Dashboard

```
┌────────────────────────────────────────────────────────────┐
│ EMPLOYEE DASHBOARD                                          │
├────────────────────────────────────────────────────────────┤
│                                                              │
│ SECTION A: Welcome + Quick Stats                           │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ Welcome, Alice!                                      │  │
│ │ Employee ID: EMP-2025-00001                         │  │
│ │ Status: Active                                       │  │
│ │ Current Assignment: ACME Inc. - Staff Augmentation  │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                              │
│ SECTION B: Timesheet Status Overview                       │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ Timesheets                                           │  │
│ │ • This Week (Draft): 24 hours [EDIT] [SUBMIT]      │  │
│ │ • Last Week (Approved): 40 hours [VIEW]            │  │
│ │ • 2 Weeks Ago (Pending): 40 hours [AWAITING REVIEW] │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                              │
│ SECTION C: Recent Activity                                 │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ Timesheet Submitted: 2026-06-10 by You              │  │
│ │ Timesheet Approved: 2026-06-09 by John Smith (ACME) │  │
│ │ Timesheet Rejected: 2026-06-02 by Jane Doe (ACME)   │  │
│ │ Note: "Missing Thursday hours. Please resubmit."    │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                              │
│ SECTION D: Call-to-Action                                  │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ [+ NEW TIMESHEET] [VIEW ALL] [SETTINGS] [LOGOUT]    │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

**Data Requirements:**

```typescript
interface EmployeeDashboardData {
  employee: {
    id: UUID;
    uid: string; // EMP-2025-00001
    name: string;
    email: string;
  };
  currentAssignment: {
    employer_name: string;
    job_title: string;
    start_date: string;
    end_date?: string;
  };
  timesheetStats: {
    thisWeek: {
      status: "Draft" | "Submitted" | "Approved" | "Rejected";
      totalHours: number;
      timesheetId: UUID;
    };
    recentTimesheets: {
      weekStart: string;
      status: string;
      totalHours: number;
      approvals: ApprovalStatus[];
    }[];
  };
  recentActivity: ActivityLog[];
}
```

**Server Function:**

```typescript
export const getDashboardDataFn = createServerFn({ method: "GET" }).handler(async () => {
  const { auth } = createServerRequest();
  const userId = auth.uid();

  // 1. Fetch employee
  const employee = await supabaseServer
    .from("employees")
    .select("id, uid, name, email")
    .eq("auth_user_id", userId)
    .single();

  // 2. Fetch current assignment
  const assignment = await supabaseServer
    .from("employee_employer_assignments")
    .select("employer_id, assignment_type, start_date, end_date")
    .eq("employee_id", employee.data.id)
    .eq("status", "active")
    .single();

  // 3. Fetch timesheet stats (current week + recent)
  const timesheets = await supabaseServer
    .from("timesheets")
    .select("id, week_start_date, status, total_hours")
    .eq("employee_id", employee.data.id)
    .order("week_start_date", { ascending: false })
    .limit(5);

  // 4. Fetch approval status
  const approvals = await supabaseServer
    .from("timesheet_approvals")
    .select("timesheet_id, approval_stage, status, approved_at, notes")
    .eq("timesheet_id", timesheets.data[0].id);

  return {
    employee: employee.data,
    assignment: assignment.data,
    timesheets: timesheets.data,
    approvals: approvals.data,
  };
});
```

---

### 4.3 Timesheet Submission Flow

```
┌────────────────────────────────────────────────────────────┐
│ TIMESHEET SUBMISSION SEQUENCE                               │
├────────────────────────────────────────────────────────────┤
│                                                              │
│ 1. EMPLOYEE OPENS TIMESHEET                                │
│    GET /employee/timesheets/new (week: 2026-06-09)         │
│    └─ Pre-populate week start/end dates                    │
│    └─ Load employee assignment (employer, job title)       │
│    └─ Show prior week as template (if exists)              │
│                                                              │
│ 2. EMPLOYEE FILLS FORM (Client-side)                      │
│    ┌─────────────────────────────────┐                    │
│    │ Week of: 2026-06-09             │                    │
│    │ Mon: 8 hrs                      │                    │
│    │ Tue: 8 hrs                      │                    │
│    │ Wed: 8 hrs                      │                    │
│    │ Thu: 8 hrs                      │                    │
│    │ Fri: 8 hrs                      │                    │
│    │ Sat: 0 hrs                      │                    │
│    │ Sun: 0 hrs                      │                    │
│    │ Total: 40 hrs [auto-calculated] │                    │
│    │ Project: "Q2 Platform Refactor" │                    │
│    │ Summary: "Completed X and Y"    │                    │
│    │ Blockers: "None"                │                    │
│    └─────────────────────────────────┘                    │
│                                                              │
│ 3. CLIENT-SIDE VALIDATION                                  │
│    • All hours >= 0 AND <= 24                              │
│    • Total hours > 0                                        │
│    • Week dates valid                                       │
│    • Project name provided                                  │
│    └─ If invalid: Show error toast, don't submit           │
│                                                              │
│ 4A. SAVE AS DRAFT (Optional interim step)                 │
│     POST to saveDraftTimesheetFn()                        │
│     createServerFn() handler:                              │
│     - Validate auth.uid()                                  │
│     - Check employee_id matches auth.uid()                │
│     - INSERT into timesheets (status='Draft')              │
│     - CREATE audit log entry                               │
│     └─ Return: { id, createdAt }                           │
│     └─ Client stores in localStorage cache                 │
│                                                              │
│ 4B. SUBMIT FOR APPROVAL                                    │
│     POST to submitTimesheetFn({ timesheetId })            │
│     createServerFn() handler:                              │
│     - Validate auth.uid()                                  │
│     - SELECT timesheet WHERE id = timesheetId              │
│     - Verify timesheet.employee_id matches auth user       │
│     - Verify timesheet.status = 'Draft'                    │
│     - UPDATE status = 'Submitted'                          │
│     - INSERT record into timesheet_approvals               │
│       (approval_stage='employer', status='Pending')        │
│     - CREATE audit log entry                               │
│     - TRIGGER: Send email to employer                      │
│     └─ Return: { id, status, submittedAt }                 │
│                                                              │
│ 5. CONFIRMATION TO EMPLOYEE                               │
│    "Timesheet submitted successfully!"                     │
│    "Awaiting approval from John Smith (ACME Inc.)"        │
│    └─ Redirect to /employee/timesheets (list view)         │
│                                                              │
│ 6. EMPLOYER NOTIFICATION                                   │
│    Email sent to employer:                                 │
│    Subject: "New Timesheet: Alice - Week of 2026-06-09"   │
│    Link: "/employer/timesheets/pending"                    │
│    └─ Employer can review and approve/reject              │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

**Error Scenarios:**

| Scenario                                     | Status | Response                                       |
| -------------------------------------------- | ------ | ---------------------------------------------- |
| Employee not authenticated                   | 401    | Redirect to /auth/login                        |
| Timesheet already submitted (duplicate week) | 409    | "Timesheet for this week already submitted"    |
| Employee record inactive                     | 403    | "Your access has been revoked"                 |
| Submission after deadline (if enforced)      | 400    | "Submission deadline has passed"               |
| Database error                               | 500    | "Failed to submit timesheet. Contact support." |

---

### 4.4 Timesheet Approval Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│ MULTI-STAGE APPROVAL WORKFLOW                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ STAGE 1: EMPLOYER REVIEW (first approval gate)                      │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Timesheet: Alice - Week of 2026-06-09 (40 hours)              │ │
│ │ Assigned To: ACME Inc. (Employer)                             │ │
│ │ Status: PENDING EMPLOYER REVIEW                               │ │
│ │                                                                 │ │
│ │ [APPROVE] [REQUEST CHANGES] [REJECT]                          │ │
│ │                                                                 │ │
│ │ If APPROVE:                                                    │ │
│ │   ✓ Update timesheet_approvals (employer stage='Approved')   │ │
│ │   ✓ Move to STAGE 2 (client review)                          │ │
│ │   ✓ Send email to client contact                              │ │
│ │                                                                 │ │
│ │ If REQUEST CHANGES:                                           │ │
│ │   ↻ Revert timesheet to Draft                                │ │
│ │   ↻ Notify employee: "Please add Thu/Fri hours"             │ │
│ │   ↻ Employee can re-edit and resubmit                        │ │
│ │                                                                 │ │
│ │ If REJECT:                                                    │ │
│ │   ✗ Update timesheet_approvals (status='Rejected')          │ │
│ │   ✗ Notify employee: "Timesheet rejected. Reason: ..."       │ │
│ │   ✗ Workflow halts (no further stages)                       │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│ STAGE 2: CLIENT REVIEW (second gate, if applicable)                 │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Timesheet: Alice - Week of 2026-06-09 (40 hours)              │ │
│ │ Assigned To: ContosoClient (Client)                           │ │
│ │ Status: PENDING CLIENT REVIEW                                 │ │
│ │ (Employer already approved)                                    │ │
│ │                                                                 │ │
│ │ [APPROVE] [REQUEST CHANGES] [REJECT]                          │ │
│ │                                                                 │ │
│ │ If APPROVE:                                                    │ │
│ │   ✓ Update timesheet_approvals (client stage='Approved')     │ │
│ │   ✓ Move to STAGE 3 (admin sign-off) OR                      │ │
│ │   ✓ Mark timesheet FINAL_APPROVED if no admin gate            │ │
│ │   ✓ Send notification to employee                             │ │
│ │                                                                 │ │
│ │ If REJECT:                                                    │ │
│ │   ✗ Workflow halts                                            │ │
│ │   ✗ Notify all parties                                        │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│ STAGE 3: ADMIN SIGN-OFF (optional final gate)                        │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Timesheet: Alice - Week of 2026-06-09 (40 hours)              │ │
│ │ Status: PENDING ADMIN APPROVAL                                │ │
│ │ (Employer + Client approved)                                   │ │
│ │                                                                 │ │
│ │ [APPROVE] [REJECT]                                            │ │
│ │                                                                 │ │
│ │ If APPROVE:                                                    │ │
│ │   ✓ Update timesheet.status = 'Approved'                      │ │
│ │   ✓ Mark for payroll processing                               │ │
│ │   ✓ Send confirmation to all parties                          │ │
│ │   ✓ Log to audit trail                                        │ │
│ │                                                                 │ │
│ │ If REJECT:                                                    │ │
│ │   ✗ Workflow halts                                            │ │
│ │   ✗ Notify all parties with reason                            │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│ DATABASE STATE TRACKING:                                             │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ timesheets.status         → Overall workflow state             │ │
│ │ timesheet_approvals rows  → Per-stage approval records         │ │
│ │ timesheet_audit_log rows  → Change history for compliance      │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

**Approval Decision Server Function:**

```typescript
export const approveTimesheetFn = createServerFn({ method: "POST" }).handler(
  async ({ timesheetId, decision, notes }) => {
    // decision: 'approve' | 'request_changes' | 'reject'

    const { auth } = createServerRequest();
    const userId = auth.uid();

    // 1. Determine approver role
    const approverRole = await determineApproverRole(userId, timesheetId);
    // Returns: 'employer' | 'client' | 'admin'

    // 2. Validate approver permissions (RLS handles row filtering)
    const approval = await supabaseServer
      .from("timesheet_approvals")
      .select("*")
      .eq("timesheet_id", timesheetId)
      .eq("approval_stage", approverRole)
      .eq("status", "Pending")
      .single();

    if (!approval.data) {
      throw new ForbiddenError("Not authorized to approve this timesheet");
    }

    // 3. Process decision
    if (decision === "approve") {
      // Update approval record
      await supabaseServer
        .from("timesheet_approvals")
        .update({
          status: "Approved",
          approved_by: userId,
          approved_at: new Date().toISOString(),
          notes,
        })
        .eq("id", approval.data.id);

      // Check if all approvals complete → transition timesheet
      const allApprovals = await supabaseServer
        .from("timesheet_approvals")
        .select("approval_stage, status")
        .eq("timesheet_id", timesheetId);

      const allApproved = allApprovals.data.every((a) => a.status === "Approved");
      if (allApproved) {
        await supabaseServer
          .from("timesheets")
          .update({ status: "Approved" })
          .eq("id", timesheetId);
      }

      // Send notifications
      await notifyApprovalDecision(timesheetId, "approved", approverRole);
    } else if (decision === "request_changes") {
      // Revert timesheet to Draft
      await supabaseServer.from("timesheets").update({ status: "Draft" }).eq("id", timesheetId);

      // Reset all pending approvals
      await supabaseServer
        .from("timesheet_approvals")
        .update({ status: "Pending" })
        .eq("timesheet_id", timesheetId);

      await notifyApprovalDecision(timesheetId, "changes_requested", approverRole, notes);
    } else if (decision === "reject") {
      // Reject workflow
      await supabaseServer
        .from("timesheet_approvals")
        .update({ status: "Rejected" })
        .eq("timesheet_id", timesheetId);

      await supabaseServer.from("timesheets").update({ status: "Rejected" }).eq("id", timesheetId);

      await notifyApprovalDecision(timesheetId, "rejected", approverRole, notes);
    }

    // 4. Log to audit trail
    await supabaseServer.from("timesheet_audit_log").insert({
      timesheet_id: timesheetId,
      action: decision,
      actor_user_id: userId,
      actor_role: approverRole,
      notes,
      ip_address: getClientIP(),
      user_agent: getUserAgent(),
    });

    return { success: true, newStatus: newTimesheetStatus };
  },
);
```

---

## 5. Portal Routes Structure

### 5.1 Recommended Route Tree

```
/auth                          [Public]
├── /login                      [GET] Employee login
├── /signup                     [GET/POST] Employee signup (if self-service)
├── /forgot-password            [GET/POST] Password reset
├── /reset-password/:token      [GET/POST] Reset confirmation
└── /callback                   [GET] OAuth callback (future)

/employee                       [Authenticated: Employee role]
├── /                          [GET] Redirect to /dashboard
├── /dashboard                 [GET] Employee dashboard
├── /timesheets                [GET] List all timesheets
├── /timesheets/:id            [GET] View single timesheet
├── /timesheets/new            [GET] Create new timesheet form
├── /timesheets/:id/edit       [GET] Edit draft timesheet
├── /settings                  [GET] Employee portal settings
├── /help                      [GET] FAQ / support
└── /logout                    [POST] Session termination

/employer                       [Authenticated: Employer role]
├── /dashboard                 [GET] Employer dashboard
├── /timesheets                [GET] List assigned employee timesheets
├── /timesheets/:id            [GET] View timesheet
├── /timesheets/:id/approve    [POST] Approve/reject timesheet
├── /employees                 [GET] View assigned employees
└── /reports                   [GET] Approval metrics

/client                         [Authenticated: Client role]
├── /dashboard                 [GET] Client dashboard
├── /timesheets                [GET] List routed timesheets
├── /timesheets/:id/approve    [POST] Approve/reject
└── /reports                   [GET] Invoice/timesheet reports

/admin                          [Authenticated: Admin role]
├── /dashboard                 [GET] Admin dashboard
├── /timesheets                [GET] All timesheets (with filters)
├── /timesheets/:id/approve    [POST] Final admin approval
├── /employees                 [GET] Manage all employees
├── /audit-log                 [GET] Timesheet audit log
└── /payroll                   [GET] Payroll export
```

---

## 6. Security Hardening Checklist

| Layer             | Requirement                                               | Status                     |
| ----------------- | --------------------------------------------------------- | -------------------------- |
| **Auth**          | Employees have Supabase Auth accounts                     | ❌ TODO                    |
| **Auth**          | Email/password login enforced                             | ❌ TODO                    |
| **Auth**          | Session JWT stored in secure HTTP-only cookie             | ❌ TODO (Supabase default) |
| **Auth**          | auth.uid() must equal employees.auth_user_id              | ❌ TODO                    |
| **Data**          | Timesheets persisted to Supabase, not localStorage        | ❌ TODO                    |
| **Data**          | RLS policies on employees, timesheets, approvals          | ❌ TODO                    |
| **Data**          | Foreign key constraints prevent orphaned records          | ❌ TODO                    |
| **API**           | All server functions validate auth.uid()                  | ❌ TODO                    |
| **API**           | Service-role client used only in createServerFn           | ✅ Current                 |
| **API**           | No sensitive data in response without auth check          | ❌ TODO                    |
| **Audit**         | All timesheet changes logged to audit_log table           | ❌ TODO                    |
| **Audit**         | IP address + user agent captured for compliance           | ❌ TODO                    |
| **Validation**    | Client-side form validation (hours, dates)                | ✅ Current                 |
| **Validation**    | Server-side validation on all inputs                      | ❌ TODO                    |
| **Notifications** | Email sent on timesheet state changes                     | ❌ TODO                    |
| **Compliance**    | Soft-delete on employee offboarding (no permanent delete) | ❌ TODO                    |
| **Rate Limiting** | API endpoints rate-limited per user                       | ❌ TODO (Future)           |

---

## 7. Implementation Roadmap

### **Phase 1: Auth Foundation (Week 1-2)**

- [ ] Add `auth_user_id UUID` column to employees table
- [ ] Create `createServerFn()` for `validateEmployeeLoginFn()`
- [ ] Build `/auth/login` route with Supabase Auth
- [ ] Add route guard middleware for `/employee/*`
- [ ] Update employee model types

### **Phase 2: Data Models (Week 2-3)**

- [ ] Create `timesheets` table with RLS enabled
- [ ] Create `timesheet_approvals` table
- [ ] Create `timesheet_audit_log` table
- [ ] Create `employee_employer_assignments` table
- [ ] Write RLS policy functions

### **Phase 3: Server Functions (Week 3-4)**

- [ ] Implement `saveDraftTimesheetFn()`
- [ ] Implement `submitTimesheetFn()`
- [ ] Implement `approveTimesheetFn()`
- [ ] Implement `rejectTimesheetFn()`
- [ ] Implement `getDashboardDataFn()`

### **Phase 4: Frontend Flows (Week 4-5)**

- [ ] Build `/employee/dashboard`
- [ ] Build `/employee/timesheets` (list + create form)
- [ ] Build `/employer/timesheets` (approval view)
- [ ] Build `/client/timesheets` (approval view)
- [ ] Build approval modal/workflow UI

### **Phase 5: Notifications & Audit (Week 5-6)**

- [ ] Email notifications on state changes
- [ ] Audit log triggers in PostgreSQL
- [ ] Compliance report view

### **Phase 6: Testing & Hardening (Week 6-7)**

- [ ] Integration tests for server functions
- [ ] E2E tests for approval workflows
- [ ] RLS policy testing
- [ ] Security penetration testing

---

## 8. Key Decisions Summary

| Decision                                  | Rationale                                                   | Trade-off                               |
| ----------------------------------------- | ----------------------------------------------------------- | --------------------------------------- |
| **Employee-initiated signup**             | Verifies employee controls email; reduces admin burden      | Adds onboarding UX flow                 |
| **1:1 auth.uid() → auth_user_id mapping** | Enables direct ownership validation in RLS                  | Requires schema migration               |
| **Supabase for persistence**              | Single source-of-truth; enables approvals + audit           | Requires API layer (createServerFn)     |
| **Multi-stage approval workflow**         | Meets stakeholder requirements (employer + client sign-off) | Adds table complexity                   |
| **Audit log table**                       | Compliance + debugging; supports forensics                  | Increases storage; requires triggers    |
| **Service-role server client**            | Full schema access in createServerFn; RLS enforced          | No fine-grained API rate limiting (yet) |

---

## 9. Open Questions for Refinement

1. **Employee Signup Self-Service?**
   - Should employees self-register, or should recruiters provision accounts?
   - If self-service, how do we verify someone is a legitimate hire?

2. **Multi-level Approval Required?**
   - Do all timesheets need employer + client + admin approval?
   - Or can certain timesheets skip stages (e.g., admin employees)?

3. **Timesheet Deadline Enforcement?**
   - Should timesheets be locked after week end (e.g., every Friday 5pm)?
   - How do we handle late submissions?

4. **Email Integration?**
   - Which email service: Supabase built-in, SendGrid, AWS SES?
   - What notification cadence: immediate, daily digest, or on-demand?

5. **Offline Support?**
   - Should employees be able to fill timesheets offline (e.g., on plane)?
   - If yes, how do we sync when online?

6. **Mobile App?**
   - Is mobile timesheet submission planned?
   - React Native or native apps?

---

## 10. Conclusion

The proposed architecture transforms the employee portal from a prototype (no auth, localStorage-only) to a production-grade system with:

✅ **Strong Authentication:** Employee-owned Supabase Auth accounts  
✅ **Secure Data Model:** Supabase RLS policies + server function validation  
✅ **Audit Trail:** Full compliance logging for HR/payroll  
✅ **Multi-stage Workflows:** Employer → Client → Admin approval  
✅ **Scalability:** PostgreSQL backend can handle enterprise volume  
✅ **Maintainability:** Clear role separation + RLS-driven access control

**Estimated Effort:** 6-8 weeks for full implementation  
**Risk Level:** Low (leverages existing TanStack Start + Supabase patterns)  
**Go-Live Readiness:** Phase 6 completion + security audit
