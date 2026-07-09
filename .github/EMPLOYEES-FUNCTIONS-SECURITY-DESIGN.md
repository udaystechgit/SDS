# Secure employees.functions.ts Design Document

**Date:** 2026-06-13  
**Current State:** No authentication or authorization checks  
**Target State:** Enterprise-grade secure CRUD with role-based access control

---

## Executive Summary

**Current Vulnerabilities:**

- ❌ `listEmployeesFn()` returns all employees to unauthenticated users
- ❌ `upsertEmployeeFn()` allows anyone to create/modify employees
- ❌ `deleteEmployeeFn()` allows anyone to delete employees
- ❌ No `auth.uid()` validation in any function
- ❌ No role-based filtering
- ❌ No ownership checks

**Proposed Changes:**

- ✅ Add `auth.uid()` extraction in all functions
- ✅ Add role-based access control (admin, staff, employee, employer)
- ✅ Add ownership validation for employee self-service
- ✅ Add input validation on server side
- ✅ Add audit logging for compliance
- ✅ Add typed error responses (401, 403, 400)

**Impact:** All 3 functions require security hardening; ~40-50 lines of new auth/validation code per function.

---

## 1. Function-by-Function Security Requirements

### **Function 1: listEmployeesFn() - List/Search Employees**

#### Current Implementation Issues

```typescript
// ❌ VULNERABLE: Returns ALL employees to ANYONE
export const listEmployeesFn = createServerFn({ method: "POST" })
  .inputValidator(listInputSchema)
  .handler(async ({ data }) => {
    // No auth check
    // No role check
    // Returns all employees regardless of caller identity
    let query = client.from("employees").select("*");
    if (data.id) query = query.eq("id", data.id);
    const { data: rows } = await query;
    return { employees: rows.map(toModel) };
  });
```

#### Required Security Checks

| Check                  | Rule                             | Example                                                         |
| ---------------------- | -------------------------------- | --------------------------------------------------------------- |
| **Authentication**     | `auth.uid()` must exist          | If null → throw UnauthorizedError(401)                          |
| **Role Check**         | Determine caller role from JWT   | Extract from `app_metadata.role`                                |
| **Data Filtering**     | Return based on role             | Admin/staff see all; employer sees assigned; employee sees self |
| **Query Modification** | Filter by role at query level    | `WHERE (staff=true) OR (employee_id=auth.uid())`                |
| **Error Handling**     | Return 401/403/400 with messages | "Authentication required", "Access denied", "Invalid input"     |

#### Exact Auth Checks Required

```typescript
// Step 1: Extract auth context
const authUser = await getAuthUserFromRequest();
if (!authUser) throw new UnauthorizedError("Authentication required");
const userId = authUser.id; // UUID from JWT sub claim

// Step 2: Determine caller role
const userRole = await getUserRole(userId);
// Result: 'admin' | 'staff' | 'employee' | 'employer' | 'client' | 'anonymous'

// Step 3: Validate caller is authorized to list
if (!["admin", "staff", "employee", "employer"].includes(userRole)) {
  throw new ForbiddenError("Insufficient permissions to list employees");
}
```

#### Exact Role Checks Required

| Role          | Access Level                   | Query Filter                                                                                      |
| ------------- | ------------------------------ | ------------------------------------------------------------------------------------------------- |
| **admin**     | See all employees              | No filter; return all                                                                             |
| **staff**     | See all employees              | No filter; return all                                                                             |
| **employee**  | See only self                  | `WHERE id = (SELECT id FROM employees WHERE auth_user_id = $1)`                                   |
| **employer**  | See assigned employees         | `WHERE id IN (SELECT employee_id FROM employee_employer_assignments WHERE employer_user_id = $1)` |
| **recruiter** | See all employees (staff role) | No filter; return all                                                                             |
| **client**    | Cannot list employees          | Throw ForbiddenError                                                                              |
| **anonymous** | Cannot list employees          | Throw UnauthorizedError                                                                           |

#### Exact Ownership Checks Required

| Scenario                     | Check                                                   | Implementation             |
| ---------------------------- | ------------------------------------------------------- | -------------------------- |
| Employee requests self       | `userId == employee.auth_user_id`                       | Query must match           |
| Employer requests employee   | `employer_user_id == userId AND employee_id IN results` | Join with assignment table |
| Staff/admin request employee | No ownership check needed                               | Return without filtering   |

#### Function Transition

**Becomes:** 🔒 **Staff-only + Employee self-service + Employer-limited**

**Authorization Model:**

- ✅ **Admin** → See all employees (staff role implies admin)
- ✅ **Recruiter/Staff** → See all employees
- ✅ **Employee** → See own profile only
- ✅ **Employer** → See assigned employees only
- ❌ **Client** → Denied
- ❌ **Anonymous** → Denied

---

### **Function 2: upsertEmployeeFn() - Create/Update Employee**

#### Current Implementation Issues

```typescript
// ❌ VULNERABLE: Allows ANYONE to create/update employees
export const upsertEmployeeFn = createServerFn({ method: "POST" })
  .inputValidator(upsertInputSchema)
  .handler(async ({ data }) => {
    // No auth check
    // No role check
    // No ownership validation

    if (!data.id) {
      // CREATE: Anyone can create employees
      const created = createEmployee(data.payload);
      const { data: inserted } = await client
        .from("employees")
        .insert({ id: created.id, ...toRow(data.payload) })
        .select("*")
        .single();
      return { employee: toModel(inserted) };
    }

    // UPDATE: Anyone can update any employee
    const { data: updatedRow } = await client
      .from("employees")
      .update(toRow(updated, updated.uid))
      .eq("id", data.id)
      .select("*")
      .single();
    return { employee: toModel(updatedRow) };
  });
```

#### Required Security Checks

| Operation              | Auth Required | Role Required            | Ownership Check  | Additional                                  |
| ---------------------- | ------------- | ------------------------ | ---------------- | ------------------------------------------- |
| **CREATE**             | ✅ Yes        | Staff/Admin only         | N/A (new record) | Validate all fields; generate uid           |
| **UPDATE**             | ✅ Yes        | Depends on field changes | ✅ Self or staff | Prevent privilege escalation; audit changes |
| **UPDATE by employee** | ✅ Yes        | Employee                 | ✅ Self only     | Limited fields (personal info only)         |
| **UPDATE by staff**    | ✅ Yes        | Staff/Admin              | Any employee     | All fields allowed; audit required          |

#### Exact Auth Checks Required

```typescript
// Step 1: Extract auth context
const authUser = await getAuthUserFromRequest();
if (!authUser) throw new UnauthorizedError("Authentication required");
const userId = authUser.id;

// Step 2: Determine role
const userRole = await getUserRole(userId);

// Step 3: Validate authorization
if (!["admin", "staff"].includes(userRole)) {
  // Non-staff users can only update their own profile (if employee)
  if (data.id) {
    // Check if updating self
    const targetEmployee = await getEmployeeByAuthUserId(userId);
    if (!targetEmployee || targetEmployee.id !== data.id) {
      throw new ForbiddenError("Can only update own employee profile");
    }
    // Even if self, can only update certain fields
    validateEmployeeSelfUpdateFields(data.payload);
  } else {
    throw new ForbiddenError("Only staff can create new employees");
  }
}
```

#### Exact Role Checks Required

| Role          | Create              | Update Any     | Update Self | Fields Allowed                                         |
| ------------- | ------------------- | -------------- | ----------- | ------------------------------------------------------ |
| **admin**     | ✅ Yes              | ✅ Yes         | ✅ Yes      | All fields                                             |
| **staff**     | ✅ Yes              | ✅ Yes         | ✅ Yes      | All fields                                             |
| **employee**  | ❌ No               | ❌ No (others) | ✅ Yes      | fullName, phone, email, workLocation, responsibilities |
| **recruiter** | ✅ Yes (staff role) | ✅ Yes         | ✅ Yes      | All fields                                             |
| **employer**  | ❌ No               | ❌ No          | N/A         | N/A                                                    |
| **client**    | ❌ No               | ❌ No          | N/A         | N/A                                                    |

#### Exact Ownership Checks Required

| Scenario               | Check                                    | Implementation                                             |
| ---------------------- | ---------------------------------------- | ---------------------------------------------------------- |
| Employee updates own   | `userId == target_employee.auth_user_id` | Look up by userId; validate match                          |
| Employee updates other | Deny (403)                               | If `userId != target_employee.auth_user_id`, throw error   |
| Staff updates employee | Allow (no ownership check)               | Check role is staff/admin; allow without ownership check   |
| Create new employee    | N/A (no existing record)                 | Only staff can create; set `auth_user_id = NULL` initially |

#### Privilege Escalation Prevention

```typescript
// Prevent employee from escalating their own role
const restrictedFields = ["status", "hourlyRate", "billingRate"];
if (userRole === "employee") {
  // Only allow personal info fields
  const allowedFields = ["fullName", "phone", "email", "responsibilities"];
  const attemptedFields = Object.keys(data.payload);
  const unauthorizedFields = attemptedFields.filter((f) => !allowedFields.includes(f));
  if (unauthorizedFields.length > 0) {
    throw new BadRequestError(`Fields not allowed for employees: ${unauthorizedFields.join(", ")}`);
  }
}

// Prevent anyone from changing critical fields without admin approval (future)
const criticalFields = ["hourlyRate", "billingRate", "serviceDomain", "assignedClient"];
if (userRole !== "admin") {
  const attemptedCritical = Object.keys(data.payload).filter((f) => criticalFields.includes(f));
  if (attemptedCritical.length > 0) {
    // Log warning; consider blocking or routing to admin approval
    console.warn(`User ${userId} attempted to modify critical fields: ${attemptedCritical}`);
  }
}
```

#### Function Transition

**Becomes:** 🔒 **Staff-only create + Employee self-service update (limited fields)**

**Authorization Model:**

- ✅ **Admin** → Create/update any employee; all fields
- ✅ **Staff** → Create/update any employee; all fields
- ✅ **Employee** → Update own profile; personal fields only
- ❌ **Employer** → Denied
- ❌ **Client** → Denied
- ❌ **Anonymous** → Denied

---

### **Function 3: deleteEmployeeFn() - Delete Employee**

#### Current Implementation Issues

```typescript
// ❌ VULNERABLE: Allows ANYONE to delete any employee
export const deleteEmployeeFn = createServerFn({ method: "POST" })
  .inputValidator(deleteInputSchema)
  .handler(async ({ data }) => {
    // No auth check
    // No role check
    // Deletes employee from database permanently
    const { error } = await client.from("employees").delete().eq("id", data.id);
    return { configured: true };
  });
```

#### Required Security Checks

| Check              | Rule                                | Enforcement                                 |
| ------------------ | ----------------------------------- | ------------------------------------------- |
| **Authentication** | `auth.uid()` must exist             | If null → 401 UnauthorizedError             |
| **Authorization**  | Only admin/staff can delete         | If not staff → 403 ForbiddenError           |
| **Soft Delete**    | Don't hard-delete; mark as inactive | Update `status='inactive'` instead          |
| **Audit Trail**    | Log who deleted and when            | Insert into employee_audit_log table        |
| **Cascading**      | Check for dependent records         | Warn if employee has timesheets/assignments |

#### Exact Auth Checks Required

```typescript
// Step 1: Extract auth context
const authUser = await getAuthUserFromRequest();
if (!authUser) throw new UnauthorizedError("Authentication required");
const userId = authUser.id;

// Step 2: Determine role
const userRole = await getUserRole(userId);

// Step 3: Validate authorization (admin/staff ONLY)
if (!["admin", "staff"].includes(userRole)) {
  throw new ForbiddenError("Only administrators can delete employees");
}

// Step 4: Verify target exists
const targetEmployee = await getEmployeeById(data.id);
if (!targetEmployee) throw new NotFoundError("Employee not found");
```

#### Exact Role Checks Required

| Role          | Delete Allowed      | Notes                        |
| ------------- | ------------------- | ---------------------------- |
| **admin**     | ✅ Yes              | Can delete any employee      |
| **staff**     | ✅ Yes              | Can delete any employee      |
| **employee**  | ❌ No               | Cannot delete self or others |
| **recruiter** | ✅ Yes (staff role) | Can delete any employee      |
| **employer**  | ❌ No               | Denied                       |
| **client**    | ❌ No               | Denied                       |
| **anonymous** | ❌ No               | Denied                       |

#### Soft Delete Implementation

```typescript
// ❌ DON'T: Hard delete
// await client.from("employees").delete().eq("id", data.id);

// ✅ DO: Soft delete (mark as inactive)
const { data: updated, error } = await client
  .from("employees")
  .update({ status: "inactive" })
  .eq("id", data.id)
  .select("*")
  .single();

if (error) throw new Error(`Failed to deactivate employee: ${error.message}`);
```

#### Cascading & Dependent Records

```typescript
// Check for timesheets before deleting
const timesheetCount = await client
  .from("timesheets")
  .select("id", { count: "exact", head: true })
  .eq("employee_id", data.id);

if (timesheetCount > 0) {
  console.warn(`Employee ${data.id} being marked inactive has ${timesheetCount} timesheets`);
  // Could throw error or just warn (depends on business rules)
}

// Check for active assignments
const activeAssignments = await client
  .from("employee_employer_assignments")
  .select("id")
  .eq("employee_id", data.id)
  .eq("status", "active");

if (activeAssignments.length > 0) {
  throw new ConflictError(
    `Cannot delete employee with active assignments. Reassign or end assignments first.`,
  );
}
```

#### Audit Logging

```typescript
// Log deletion to audit table
await client.from("employee_audit_log").insert({
  employee_id: data.id,
  action: "soft_delete",
  actor_user_id: userId,
  actor_role: userRole,
  changes: {
    status: { from: targetEmployee.status, to: "inactive" },
  },
  ip_address: getClientIP(),
  user_agent: getUserAgent(),
  timestamp: new Date().toISOString(),
});
```

#### Function Transition

**Becomes:** 🔒 **Admin-only with soft delete**

**Authorization Model:**

- ✅ **Admin** → Deactivate any employee
- ✅ **Staff** → Deactivate any employee
- ❌ **Everyone else** → Denied
- ✅ **Audit trail** → Every deletion logged
- ✅ **Data preserved** → Soft delete, recoverable

---

## 2. Required Helper Functions

### **Helper 1: getAuthUserFromRequest()**

**Purpose:** Extract authenticated user identity from request context

**Location:** `src/lib/supabase/auth.server.ts` (new file)

**Signature:**

```typescript
interface AuthUser {
  id: string; // UUID from JWT sub claim
  email: string; // From JWT email claim
  appRole: string; // From JWT app_metadata.role
  appMetadata: Record<string, unknown>;
}

export async function getAuthUserFromRequest(): Promise<AuthUser | null> {
  // Implementation: Extract from createServerRequest context
  // Return null if unauthenticated
}
```

**Implementation Details:**

- Called inside `createServerFn` handlers
- Accesses request context to read Authorization header
- Verifies JWT signature matches Supabase signing key
- Returns `null` if no valid JWT found
- Throws if JWT is malformed or expired

**Usage in upsertEmployeeFn:**

```typescript
const authUser = await getAuthUserFromRequest();
if (!authUser) throw new UnauthorizedError("Authentication required");
```

---

### **Helper 2: getUserRole(userId: string)**

**Purpose:** Determine user's role from database

**Location:** `src/lib/supabase/auth.server.ts`

**Signature:**

```typescript
export async function getUserRole(
  userId: string,
): Promise<"admin" | "staff" | "employee" | "employer" | "client" | "anonymous" | null> {
  // Implementation: Query auth.users.app_metadata.role from Supabase
  // Return role or null
}
```

**Implementation Details:**

- Query Supabase `auth.users` table (requires admin client)
- Read `app_metadata.role` field
- Fallback to 'anonymous' if not found
- Cache result (optional, for performance)

**Usage Pattern:**

```typescript
const userRole = await getUserRole(userId);
if (!["admin", "staff"].includes(userRole)) {
  throw new ForbiddenError("Staff role required");
}
```

---

### **Helper 3: getEmployeeByAuthUserId(userId: string)**

**Purpose:** Find employee record by auth user ID

**Location:** `src/lib/supabase/employees.server.ts` (new file)

**Signature:**

```typescript
export async function getEmployeeByAuthUserId(userId: string): Promise<EmployeeRow | null> {
  // Implementation: Query employees table by auth_user_id
  // Return employee or null
}
```

**Implementation Details:**

- Query `SELECT * FROM employees WHERE auth_user_id = $1`
- Return null if not found
- Used for employee self-service validation

**Usage Pattern:**

```typescript
const selfEmployee = await getEmployeeByAuthUserId(userId);
if (!selfEmployee) throw new NotFoundError("Employee record not found");
```

---

### **Helper 4: createUnauthorizedError & createForbiddenError**

**Purpose:** Standardized error responses

**Location:** `src/lib/errors.server.ts` (new file)

**Signature:**

```typescript
export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
    this.statusCode = 401;
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
    this.statusCode = 403;
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
    this.statusCode = 404;
  }
}

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
    this.statusCode = 400;
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
    this.statusCode = 409;
  }
}
```

**Usage Pattern:**

```typescript
if (!authUser) throw new UnauthorizedError("Authentication required");
if (userRole !== "staff") throw new ForbiddenError("Staff role required");
if (!employee) throw new NotFoundError("Employee not found");
```

---

### **Helper 5: validateEmployeeSelfUpdateFields(payload)**

**Purpose:** Restrict which fields employees can update

**Location:** `src/lib/employees.server.ts`

**Signature:**

```typescript
export function validateEmployeeSelfUpdateFields(payload: Partial<EmployeeInput>): void {
  // Throw error if restricted fields are present
}
```

**Implementation Details:**

```typescript
const restrictedFields = [
  "hourlyRate",
  "billingRate",
  "assignedClient",
  "assignedProject",
  "serviceDomain",
  "status",
  "employeeType",
];

const allowedFields = [
  "fullName",
  "email",
  "phone",
  "workLocation",
  "responsibilities",
  "requiredSkills",
];

export function validateEmployeeSelfUpdateFields(payload: any): void {
  const providedKeys = Object.keys(payload);
  const restricted = providedKeys.filter((k) => restrictedFields.includes(k));

  if (restricted.length > 0) {
    throw new BadRequestError(
      `Fields not allowed for employee self-updates: ${restricted.join(", ")}`,
    );
  }
}
```

---

### **Helper 6: auditLogEmployeeChange(action, employeeId, userId, changes)**

**Purpose:** Log all employee modifications for compliance

**Location:** `src/lib/supabase/audit.server.ts` (new file)

**Signature:**

```typescript
export async function auditLogEmployeeChange(
  action: "create" | "update" | "soft_delete",
  employeeId: string,
  userId: string,
  userRole: string,
  changes?: Record<string, { from: any; to: any }>,
): Promise<void> {
  // Implementation: Insert into employee_audit_log table
}
```

**Implementation Details:**

```typescript
export async function auditLogEmployeeChange(
  action: "create" | "update" | "soft_delete",
  employeeId: string,
  userId: string,
  userRole: string,
  changes?: Record<string, { from: any; to: any }>,
): Promise<void> {
  const client = getSupabaseServerClient();

  const { error } = await client.from("employee_audit_log").insert({
    employee_id: employeeId,
    action,
    actor_user_id: userId,
    actor_role: userRole,
    changes: changes || {},
    ip_address: getClientIP(),
    user_agent: getUserAgent(),
    timestamp: new Date().toISOString(),
  });

  if (error) {
    console.error(`Audit logging failed for employee ${employeeId}:`, error);
    // Don't throw; just warn (audit shouldn't block operations)
  }
}
```

---

## 3. Required Supabase Changes

### **Database Schema Changes**

#### **Change 1: Add auth_user_id to employees table**

```sql
-- Migration: Add auth_user_id column
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_employees_auth_user_id ON public.employees(auth_user_id);

-- Constraint: email must be unique
ALTER TABLE public.employees ADD CONSTRAINT unique_email_per_employee UNIQUE(email);
```

**Rationale:**

- Enables 1:1 mapping between `auth.uid()` and employee records
- Allows employee self-service validation
- Unique constraint prevents multiple auth accounts per employee

---

#### **Change 2: Add employee_audit_log table**

```sql
-- Migration: Create audit log table
CREATE TABLE IF NOT EXISTS public.employee_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'soft_delete')),
  actor_user_id UUID REFERENCES auth.users(id),
  actor_role TEXT,
  changes JSONB,  -- {field: {from: old_value, to: new_value}}
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),

  -- Indexes
  INDEX idx_employee_audit_employee_id ON (employee_id),
  INDEX idx_employee_audit_timestamp ON (timestamp DESC)
);
```

**Rationale:**

- Full audit trail for compliance (GDPR, HIPAA, etc.)
- Enables change tracking and forensics
- Supports compliance reporting

---

#### **Change 3: Create employee_employer_assignments table** (if not exists)

```sql
-- Migration: Create assignment table for employer access
CREATE TABLE IF NOT EXISTS public.employee_employer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  employer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_type TEXT DEFAULT 'direct_hire',  -- 'direct_hire' | 'contract' | 'staffing'
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Constraints & Indexes
  UNIQUE(employee_id, employer_user_id),
  INDEX idx_assignment_employee_id ON (employee_id),
  INDEX idx_assignment_employer_user_id ON (employer_user_id),
  INDEX idx_assignment_status ON (status)
);
```

**Rationale:**

- Enables employer to see only assigned employees
- Supports timesheet approval routing
- Many-to-many relationship between employees and employers

---

### **RLS Policy Changes**

#### **Enable RLS on employees table**

```sql
-- Ensure RLS is enabled
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
```

#### **Add RLS policies for employees table**

```sql
-- Policy 1: Staff (admin/recruiter) see all employees
CREATE POLICY "staff_view_employees" ON public.employees
FOR SELECT USING (public.is_staff());

-- Policy 2: Employee sees only their own record
CREATE POLICY "employee_view_own" ON public.employees
FOR SELECT USING (auth.uid() = auth_user_id);

-- Policy 3: Employer sees assigned employees
CREATE POLICY "employer_view_assigned" ON public.employees
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.employee_employer_assignments
    WHERE employee_id = employees.id
    AND employer_user_id = auth.uid()
    AND status = 'active'
  )
);

-- Policy 4: Staff (admin/recruiter) can create/update/delete
CREATE POLICY "staff_manage_employees" ON public.employees
FOR ALL USING (public.is_staff());

-- Policy 5: Employee can update own record (limited fields)
CREATE POLICY "employee_update_own" ON public.employees
FOR UPDATE USING (
  auth.uid() = auth_user_id
)
WITH CHECK (
  auth.uid() = auth_user_id
  -- Additional checks in server function for field restrictions
);
```

**Rationale:**

- RLS provides defense-in-depth (even if server function is compromised)
- Combines role-based filtering with ownership validation
- Supports multi-tenant isolation (employer sees only assigned)

---

### **Required Helper SQL Functions** (if not exist)

```sql
-- Check if user is staff (admin or recruiter)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean AS $$
  SELECT (auth.jwt() ->> 'app_metadata')::jsonb->>'role' IN ('admin', 'staff', 'recruiter')
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT (auth.jwt() ->> 'app_metadata')::jsonb->>'role' = 'admin'
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if user is employee
CREATE OR REPLACE FUNCTION public.is_employee()
RETURNS boolean AS $$
  SELECT (auth.jwt() ->> 'app_metadata')::jsonb->>'role' = 'employee'
$$ LANGUAGE SQL SECURITY DEFINER;

-- Get current user's app role
CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'app_metadata')::jsonb->>'role',
    'anonymous'
  )
$$ LANGUAGE SQL SECURITY DEFINER;
```

---

## 4. Function-Level Implementation Plan

### **Phase 1: Setup (1-2 hours)**

1. Create new helper files:
   - `src/lib/supabase/auth.server.ts` (auth context extraction)
   - `src/lib/supabase/employees.server.ts` (employee queries)
   - `src/lib/errors.server.ts` (error classes)
   - `src/lib/supabase/audit.server.ts` (audit logging)

2. Implement helper functions:
   - `getAuthUserFromRequest()`
   - `getUserRole(userId: string)`
   - `getEmployeeByAuthUserId(userId: string)`
   - Error classes

3. Deploy database migrations:
   - Add `auth_user_id` column to employees
   - Create `employee_audit_log` table
   - Create `employee_employer_assignments` table
   - Enable RLS on employees
   - Add RLS policies

### **Phase 2: Secure listEmployeesFn() (3-4 hours)**

1. Add auth extraction:

   ```typescript
   const authUser = await getAuthUserFromRequest();
   if (!authUser) throw new UnauthorizedError("Authentication required");
   ```

2. Add role determination:

   ```typescript
   const userRole = await getUserRole(authUser.id);
   ```

3. Add role-based filtering:

   ```typescript
   switch (userRole) {
     case "admin":
     case "staff":
       // No filter; return all
       break;
     case "employee":
       // Filter to self
       query = query.eq("auth_user_id", authUser.id);
       break;
     case "employer":
       // Filter to assigned
       query = query.in("id", assignedEmployeeIds);
       break;
     default:
       throw new ForbiddenError("Access denied");
   }
   ```

4. Test with multiple user roles

### **Phase 3: Secure upsertEmployeeFn() (4-5 hours)**

1. Add auth extraction and role check

2. For CREATE:
   - Verify `userRole === 'staff'`
   - Generate UID with counter
   - Set `auth_user_id = NULL` (will be linked during signup)
   - Call `auditLogEmployeeChange('create', ...)`

3. For UPDATE:
   - If employee: Validate self-update, restrict fields
   - If staff: Allow all changes
   - Log delta changes to audit table

4. Add input validation:

   ```typescript
   const validation = employeeInputSchema.safeParse(data.payload);
   if (!validation.success) throw new BadRequestError(validation.error.message);
   ```

5. Test with multiple user roles and edge cases

### **Phase 4: Secure deleteEmployeeFn() (2-3 hours)**

1. Add auth extraction and role check (staff only)

2. Replace hard delete with soft delete:

   ```typescript
   await client.from("employees").update({ status: "inactive" }).eq("id", data.id);
   ```

3. Check for dependent records (timesheets, assignments)

4. Call `auditLogEmployeeChange('soft_delete', ...)`

5. Test cascading logic

### **Phase 5: Testing & Validation (4-6 hours)**

1. Unit tests for each function with multiple roles
2. Integration tests for multi-tenant isolation
3. Audit log verification
4. Error handling validation
5. Performance testing (no n+1 queries)

---

## 5. Code Structure & Patterns

### **Pattern 1: Auth + Role Check**

```typescript
export const secureEmployeeFn = createServerFn({ method: "POST" })
  .inputValidator(secureEmployeeSchema)
  .handler(async ({ data }) => {
    // 1. Extract auth
    const authUser = await getAuthUserFromRequest();
    if (!authUser) throw new UnauthorizedError("Authentication required");

    // 2. Get role
    const userRole = await getUserRole(authUser.id);

    // 3. Validate role
    const requiredRoles = ["admin", "staff"];
    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenError(`Required role: ${requiredRoles.join(" or ")}`);
    }

    // 4. Proceed with operation
    // ...
  });
```

### **Pattern 2: Conditional Access**

```typescript
export const employeeLookupFn = createServerFn({ method: "POST" })
  .inputValidator(employeeIdSchema)
  .handler(async ({ data }) => {
    const authUser = await getAuthUserFromRequest();
    if (!authUser) throw new UnauthorizedError("Authentication required");

    const userRole = await getUserRole(authUser.id);
    const client = getSupabaseServerClient();

    let query = client.from("employees").select("*").eq("id", data.id);

    // Role-based filtering
    if (userRole === "employee") {
      // Can only access own record
      query = query.eq("auth_user_id", authUser.id);
    } else if (userRole === "employer") {
      // Can only access assigned employees
      query = query.in("id", await getAssignedEmployeeIds(authUser.id));
    }
    // Admin/staff: no filter

    const { data: employee, error } = await query.single();
    if (error) throw new NotFoundError("Employee not found or access denied");

    return employee;
  });
```

### **Pattern 3: Audit Trail**

```typescript
export const auditedUpdateFn = createServerFn({ method: "POST" }).handler(async ({ data }) => {
  const authUser = await getAuthUserFromRequest();
  const userRole = await getUserRole(authUser.id);

  const client = getSupabaseServerClient();

  // Get old values
  const { data: oldRecord } = await client.from("employees").select("*").eq("id", data.id).single();

  // Update record
  const { data: newRecord, error } = await client
    .from("employees")
    .update(data.updates)
    .eq("id", data.id)
    .select("*")
    .single();

  if (error) throw error;

  // Calculate delta
  const changes: Record<string, any> = {};
  for (const key of Object.keys(data.updates)) {
    if (oldRecord[key] !== newRecord[key]) {
      changes[key] = { from: oldRecord[key], to: newRecord[key] };
    }
  }

  // Log audit
  await auditLogEmployeeChange("update", data.id, authUser.id, userRole, changes);

  return newRecord;
});
```

---

## 6. Testing Strategy

### **Test Suite 1: listEmployeesFn**

```typescript
describe("listEmployeesFn - Security", () => {
  test("401: Unauthenticated user cannot list", async () => {
    // Mock: No auth context
    const result = await listEmployeesFn({ data: {} });
    expect(result).toThrow(UnauthorizedError);
  });

  test("200: Admin sees all employees", async () => {
    // Mock: Admin user
    const result = await listEmployeesFn({ data: {} });
    expect(result.employees).toHaveLength(10); // All
  });

  test("200: Employee sees only self", async () => {
    // Mock: Employee user
    const result = await listEmployeesFn({ data: {} });
    expect(result.employees).toHaveLength(1); // Self only
    expect(result.employees[0].id).toBe(employeeId);
  });

  test("403: Client denied", async () => {
    // Mock: Client user
    const result = await listEmployeesFn({ data: {} });
    expect(result).toThrow(ForbiddenError);
  });
});
```

### **Test Suite 2: upsertEmployeeFn**

```typescript
describe('upsertEmployeeFn - Security', () => {
  test('401: Unauthenticated cannot create', async () => {
    // Mock: No auth
    const result = await upsertEmployeeFn({ data: { payload: {...} } });
    expect(result).toThrow(UnauthorizedError);
  });

  test('403: Employee cannot create', async () => {
    // Mock: Employee user
    const result = await upsertEmployeeFn({ data: { payload: {...} } });
    expect(result).toThrow(ForbiddenError);
  });

  test('201: Staff can create', async () => {
    // Mock: Staff user
    const result = await upsertEmployeeFn({ data: { payload: {...} } });
    expect(result.employee.id).toBeDefined();
  });

  test('403: Employee cannot update other', async () => {
    // Mock: Employee user, different id
    const result = await upsertEmployeeFn({ data: { id: otherId, payload: {...} } });
    expect(result).toThrow(ForbiddenError);
  });

  test('200: Employee can update self (restricted fields)', async () => {
    // Mock: Employee user, own id
    const result = await upsertEmployeeFn({
      data: {
        id: employeeId,
        payload: { fullName: 'New Name', hourlyRate: '999' } // hourlyRate restricted
      }
    });
    expect(result).toThrow(BadRequestError); // Restricted field
  });
});
```

### **Test Suite 3: deleteEmployeeFn**

```typescript
describe("deleteEmployeeFn - Security", () => {
  test("401: Unauthenticated cannot delete", async () => {
    const result = await deleteEmployeeFn({ data: { id: employeeId } });
    expect(result).toThrow(UnauthorizedError);
  });

  test("403: Employee cannot delete", async () => {
    // Mock: Employee user
    const result = await deleteEmployeeFn({ data: { id: employeeId } });
    expect(result).toThrow(ForbiddenError);
  });

  test("200: Staff can soft-delete", async () => {
    // Mock: Staff user
    const result = await deleteEmployeeFn({ data: { id: employeeId } });
    expect(result.configured).toBe(true);

    // Verify soft delete (status=inactive, not hard delete)
    const { data: employee } = await client
      .from("employees")
      .select("*")
      .eq("id", employeeId)
      .single();
    expect(employee.status).toBe("inactive");
  });

  test("409: Cannot delete with active timesheets", async () => {
    // Scenario: Employee has submitted timesheets
    const result = await deleteEmployeeFn({ data: { id: employeeIdWithTimesheets } });
    expect(result).toThrow(ConflictError);
  });
});
```

---

## 7. Implementation Checklist

### **Before Code Changes**

- [ ] Database migrations created (auth_user_id, audit table, RLS policies)
- [ ] Migrations tested in staging environment
- [ ] Backup of employees table created
- [ ] Rollback plan documented

### **During Code Changes**

- [ ] Helper files created (`auth.server.ts`, `errors.server.ts`, etc.)
- [ ] All 3 functions modified with auth checks
- [ ] Audit logging added to all mutation functions
- [ ] Input validation strengthened
- [ ] Error messages clear and actionable

### **Testing**

- [ ] Unit tests pass (401, 403, 404, 200 scenarios)
- [ ] Integration tests pass (multi-role, multi-tenant)
- [ ] Audit logs verified (all changes tracked)
- [ ] RLS policies verified (via `psql` queries)
- [ ] Performance tested (no n+1, <100ms per request)

### **Deployment**

- [ ] Code review completed
- [ ] Security review completed (peer reviewed auth logic)
- [ ] Staging deployment successful
- [ ] Smoke tests pass
- [ ] Production deployment with monitoring
- [ ] Rollback ready if needed

---

## 8. Summary Table

| Aspect                   | Current             | Proposed                              |
| ------------------------ | ------------------- | ------------------------------------- |
| **Authentication**       | ❌ None             | ✅ Required (401 if missing)          |
| **Authorization**        | ❌ None             | ✅ Role-based (403 if denied)         |
| **listEmployeesFn**      | 🔴 Public           | 🟢 Auth required; role-filtered       |
| **upsertEmployeeFn**     | 🔴 Public           | 🟢 Staff create; employee self-update |
| **deleteEmployeeFn**     | 🔴 Public           | 🟢 Staff soft-delete only             |
| **Ownership Checks**     | ❌ None             | ✅ Employee self-access validation    |
| **Privilege Escalation** | ❌ Possible         | ✅ Field restrictions enforced        |
| **Audit Trail**          | ❌ None             | ✅ All changes logged                 |
| **Error Handling**       | ❌ Generic          | ✅ Typed (401, 403, 404, 400, 409)    |
| **Input Validation**     | ⚠️ Client-side only | ✅ Server-side validation             |

---

## 9. Risk & Mitigation

| Risk                                    | Impact           | Mitigation                                 |
| --------------------------------------- | ---------------- | ------------------------------------------ |
| **Auth extraction fails silently**      | Security bypass  | Unit tests for all scenarios               |
| **RLS policies not applied**            | Data leakage     | Verify policies in staging; pg_iam audit   |
| **Soft delete breaks downstream**       | Broken workflows | Test timesheet/assignment queries          |
| **Audit logging performance hit**       | Slow API         | Async logging; separate table; indexes     |
| **Database migration fails**            | Downtime         | Test migration on backup; have rollback    |
| **Existing data has null auth_user_id** | Migration breaks | Handle nulls in queries; gradual migration |

---

## Conclusion

This design document provides a **complete blueprint** for securing `employees.functions.ts` from unauthenticated/unauthorized access to an enterprise-grade secure CRUD system with:

✅ **Authentication:** All functions require valid JWT  
✅ **Authorization:** Role-based access control (admin, staff, employee, employer)  
✅ **Ownership Validation:** Employee self-service + employer limited access  
✅ **Audit Trail:** Full change tracking for compliance  
✅ **Privilege Escalation Prevention:** Restricted field updates  
✅ **Error Handling:** Typed responses (401, 403, 404, etc.)

**Estimated Implementation Time:** 14-20 hours (setup + secure 3 functions + testing)

**Ready to implement Phase 2 of security roadmap** after Phase 1 (auth + routes) is complete.
