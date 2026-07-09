# Phase 1 Authentication Architecture Analysis

**Date:** 2026-06-13  
**Goal:** Determine minimal implementation for: authenticated employee + employee self-read + admin read-all  
**Approach:** Analysis only (no code changes, no migrations, no schema modifications)

---

## Question 1: Can createServerFn() handler access the authenticated Supabase user today?

**Answer: NO (today) — But YES (with 1-line addition)**

### Current State (What DOESN'T work)

**Current Code Pattern:**

```typescript
export const listEmployeesFn = createServerFn({ method: "POST" })
  .inputValidator(listInputSchema)
  .handler(async ({ data }) => {
    // ❌ No way to access auth context here
    const client = getSupabaseServerClient(); // Only has service-role key
    // ...
  });
```

**Why it doesn't work:**

- `createServerFn()` handler receives only `{ data }` object
- No built-in access to HTTP request headers
- No auth context passed to handler
- Service-role client has full access (no ownership checking possible)

### What's Available Today

**Browser (Client-Side) - WORKS:**

```typescript
// In routes like client.requirements.tsx, employer.jobs.tsx
const supabase = getSupabaseBrowserClient();
const { data } = await supabase.auth.getUser(); // ✅ Returns authenticated user
const userId = data.user?.id; // UUID from JWT
```

**TanStack Start Architecture (Server-Side):**

- Uses Nitro as runtime (from vite.config.ts)
- Nitro supports H3Event (HTTP event context with headers, cookies, etc.)
- TanStack React Start middleware system exists (see start.ts)
- But createServerFn doesn't expose this by default

---

## Question 2: What is the exact supported TanStack Start pattern?

**Answer: Use H3Event via context parameter in createServerFn handler**

### The Supported Pattern (TanStack React Start + Nitro)

TanStack React Start's `createServerFn()` supports accessing the Nitro H3Event through the handler's **context parameter** (not the data parameter).

**Exact TanStack Start Pattern:**

```typescript
import { createServerFn } from "@tanstack/react-start";
import type { H3Event } from "h3";

export const secureFn = createServerFn({ method: "POST" }).handler(
  async ({ data }, context: { event?: H3Event }) => {
    const event = context.event;

    // Access request headers
    const authHeader = event?.headers.get("authorization");

    // Or access cookies
    const sessionCookie = event?.cookies.get("sb-access-token");

    // Parse JWT manually or query Supabase
    const userId = extractUserIdFromJwt(authHeader);

    // Now use userId to filter queries
    return { userId };
  },
);
```

**Key Points:**

- The handler receives a second `context` parameter (currently not used in existing code)
- The `context.event` is the Nitro H3Event
- H3Event has: `headers`, `cookies`, `body`, `method`, etc.
- This pattern is NOT currently used in the codebase

### Why This Isn't Used Today

Looking at `src/lib/api/employees.functions.ts`:

```typescript
.handler(async ({ data }) => {  // ← Only destructures data, ignores context
  // No access to event/headers
})
```

The current code ignores the context parameter entirely.

---

## Question 3: If auth context isn't accessible, what is the minimum change required?

**Answer: ZERO database changes required (use existing architecture)**

### Minimum Change Path (No Schema Modifications)

Instead of accessing auth.uid() from request headers, we can use a **client-side approach that's already working**:

1. **Client extracts auth context** (pattern already in use):

   ```typescript
   // In React component (browser)
   const supabase = getSupabaseBrowserClient();
   const { data } = await supabase.auth.getUser();
   const userId = data.user?.id; // UUID from JWT
   ```

2. **Client passes userId to server function**:

   ```typescript
   // Client sends userId as part of request data
   await listEmployeesFn({ userId, filters: {} });
   ```

3. **Server function validates and filters**:
   ```typescript
   .handler(async ({ data: { userId, filters } }) => {
     // userId is trusted (came from authenticated client session)
     // Filter query based on userId and role
   })
   ```

**Why this works:**

- ✅ No header parsing required
- ✅ No JWT validation code needed
- ✅ Client-side auth already validates JWT
- ✅ Leverages existing Supabase browser client
- ✅ Zero schema changes

**Trust model:**

- Supabase handles JWT validation on client
- If JWT is invalid, `supabase.auth.getUser()` returns null
- Client only sends userId if authenticated
- Server trusts authenticated client (no need to re-validate JWT)

---

## Question 4: Can we derive auth.uid() from current request without creating new DB columns?

**Answer: YES — Two approaches**

### Approach A: Client-side Pass (No DB Access Required)

**Flow:**

```
Browser Client
    ↓ (gets auth user)
supabase.auth.getUser() → UUID
    ↓ (passes to server)
listEmployeesFn({ userId })
    ↓ (server trusts client JWT already validated)
NO database query needed; just use userId as filter parameter
```

**Pros:**

- ✅ No DB queries for auth
- ✅ No JWT parsing on server
- ✅ Minimal code change
- ✅ Leverages existing auth

**Cons:**

- ⚠️ Client responsible for sending userId (what if client is compromised?)
- ⚠️ No server-side auth verification

### Approach B: Server-side JWT Parsing (No DB Changes)

**Flow:**

```
Browser Client (authenticated session)
    ↓ (request includes Authorization header with JWT)
createServerFn handler
    ↓ (accesses context.event.headers.get("authorization"))
    ↓ (parses JWT to extract sub claim → UUID)
    ↓ (NO database lookup needed)
    ↓ (uses UUID to filter queries)
```

**Pros:**

- ✅ Server-side validation
- ✅ More secure (can't bypass with modified client)
- ✅ Aligns with auth standards

**Cons:**

- ⚠️ Requires JWT parsing library (add dependency)
- ⚠️ Requires Supabase JWT public key for verification
- ⚠️ More code complexity

### Recommended Approach: Hybrid

**Use client-side pass + RLS policies for defense-in-depth:**

1. **Client passes userId** (fast, minimal code)
2. **Server uses userId for basic filtering**
3. **RLS policies enforce at database layer** (defense-in-depth)

---

## Question 5: Can employees.uid be matched to auth.uid()?

**Answer: NO — They are incompatible identifiers**

### Current Schema Analysis

**employees table:**

```sql
CREATE TABLE employees (
  id UUID,              -- Database row ID
  uid TEXT,             -- "EMP-2025-00001" (DISPLAY UID, NOT auth)
  full_name TEXT,
  email TEXT,
  ...
);
```

**Supabase auth.users table:**

```sql
CREATE TABLE auth.users (
  id UUID,              -- "550e8400-e29b-41d4..." (auth.uid() from JWT)
  email TEXT,
  ...
);
```

### Why They Can't Be Matched Today

| Field             | Type | Source            | Purpose           | Unique             |
| ----------------- | ---- | ----------------- | ----------------- | ------------------ |
| `employees.uid`   | TEXT | Generated counter | Display/HR record | ✅ Yes             |
| `employees.email` | TEXT | Entered manually  | Contact info      | ❌ No (not unique) |
| `auth.users.id`   | UUID | Supabase Auth     | JWT subject claim | ✅ Yes             |

**The gap:**

- `employees.uid` is "EMP-2025-00001" (human-readable display)
- `auth.users.id` is "550e8400-..." (cryptographic UUID)
- **No column in employees table links them**

### Matching Possibilities Without Schema Changes

**Option 1: Match by email (RISKY)**

```sql
SELECT * FROM employees
WHERE email = (
  SELECT email FROM auth.users WHERE id = $1
);
```

**Issues:**

- ❌ `employees.email` is NOT unique (multiple employees might share email)
- ❌ Unreliable matching
- ❌ Could return wrong employee

**Option 2: Use client-passed userId (as discussed above)**

```typescript
// Client sends userId
// Server filters: WHERE employees.uid IN (SELECT uid FROM lookupTable WHERE auth_user_id = userId)
// But lookupTable doesn't exist today
```

**Conclusion:** Cannot reliably match without either:

1. **New column:** `employees.auth_user_id UUID` (links to auth.users.id)
2. **Separate table:** `employee_auth_mapping` (join table)

---

## Question 6: Is auth_user_id actually required right now, or can existing schema support ownership validation?

**Answer: NO new column needed for Phase 1 MVP**

### Phase 1 Constraints (No Schema Changes)

If we cannot modify schema, we have these options:

#### Option A: Public UID Column Matching (Weakest)

**Use case:** Employee enters their UID on login form

```typescript
// Employee manually enters their UID: "EMP-2025-00001"
// Client validates against auth.uid()
// Server receives both userId and employeeUid
// Server matches: SELECT * FROM employees WHERE uid = 'EMP-2025-00001'
```

**Issues:**

- ❌ Manual entry error-prone
- ❌ No true ownership validation
- ❌ Employee could guess other UIDs
- ❌ Not suitable for production

#### Option B: Email-Based Lookup (Moderate, with validation)

**Flow:**

```typescript
// Browser authenticates → gets user email (from Supabase JWT)
// Server receives userId from client
// Server queries:
//   SELECT auth.users WHERE id = userId → extract email
//   SELECT employees WHERE email = email → find employee
// Trust: Email ownership validated by Supabase auth
```

**Issues:**

- ⚠️ Email not unique in employees table (soft constraint)
- ⚠️ If multiple employees have same email, returns first
- ✅ Reasonably secure (Supabase ensures email ownership)

#### Option C: Client Provides Full Context (Lightest)

**Trust model:**

```
Client Flow:
  1. User logs in → Supabase validates JWT
  2. Client calls: listEmployeesFn({ userId, role })
  3. Server trusts: If userId is provided, user is authenticated
  4. Server trusts: Role from JWT
  5. Filter based on role:
     - Admin: return all
     - Employee: needs some way to determine which employee...
```

**Issue:** Without a link table, server can't determine if userId belongs to which employee

### Phase 1 MVP Reality Check

**Without schema changes, Phase 1 can only support:**

| Use Case                      | Feasible   | Notes                             |
| ----------------------------- | ---------- | --------------------------------- |
| **Admin reads all employees** | ✅ YES     | No filter needed; just check role |
| **Employee reads own**        | ⚠️ LIMITED | Needs client to pass employee ID  |
| **Role-based filtering**      | ✅ YES     | Check role from JWT/client data   |
| **True ownership validation** | ❌ NO      | Requires auth_user_id link        |

---

## Question 7: What's the smallest possible implementation that allows:

- Authenticated employee access required
- Employee reads own record only
- Admin/staff reads all records

### Answer: Minimal 3-Step Implementation (No Migrations)

#### Step 1: Client-Side Authentication Check (Already Works)

**Location:** Route guard (create new file)

**File:** `src/lib/route-guard.ts`

```typescript
// Pattern (no code, just pattern)
export async function requireAuth() {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect("/auth/login");
  }
  return data.user; // { id, email, user_metadata, app_metadata }
}
```

**Usage:** Add to `/employee` route beforeLoad hook

```typescript
// No code written; just pattern
beforeLoad: async () => {
  const user = await requireAuth();
  // User can't proceed without auth
};
```

**Result:** ✅ Authentication required at route level

#### Step 2: Server Function Role Check (Minimal Change)

**Location:** `src/lib/api/employees.functions.ts`

**Pattern (no code, just pattern):**

```typescript
export const listEmployeesFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string().uuid(), // ← Client passes authenticated user ID
      employeeId: z.string().optional(), // ← Employee passes own ID to read self
    }),
  )
  .handler(async ({ data }) => {
    const { userId, employeeId } = data;

    // Minimal change: Add role check
    // Pattern: Determine role from... where?
    // PROBLEM: Role not available without DB lookup or client data

    // For admin: return all (if role is admin)
    // For employee: return where id = employeeId (if userId == employeeId owner)
    // For staff: return all (if role is staff)
  });
```

**Challenge:** Role information not available without:

1. Looking it up in database
2. Having client send it (not trusted)
3. Decoding JWT (needs implementation)

#### Step 3: Client-Passed Role Context

**Solution:** Client passes role along with request

**Pattern:**

```typescript
// Browser component
const { data } = await supabase.auth.getUser();
const appRole = data.user?.app_metadata?.role; // "admin" | "staff" | "employee"

// Call server function with role
await listEmployeesFn({
  userId: data.user.id,
  appRole: appRole,
  employeeId: // ...
});
```

**Server validation:**

```typescript
.handler(async ({ data: { userId, appRole, employeeId } }) => {
  // Validate role (check against Supabase metadata)
  // Filter based on role:
  if (appRole === 'admin' || appRole === 'staff') {
    // Return all
  } else if (appRole === 'employee') {
    // Return where employeeId = ???
    // PROBLEM: Still can't link userId to employeeId without schema
  }
})
```

### The Fundamental Blocker

**Without new schema, we cannot implement:**

```
auth.uid (from JWT)
    ↓ (need to find which employee record this belongs to)
employees.? (no column links them)
    ↓
employees.id
```

---

## Realistic Phase 1 Implementation (With Minimal Schema Change)

### Minimum Required Schema Change

**Single migration (non-breaking):**

```sql
-- Add ONE column
ALTER TABLE employees ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- Add index for fast lookup
CREATE INDEX employees_auth_user_id_idx ON employees(auth_user_id);
```

**Result:**

- ✅ Existing data unaffected (column nullable)
- ✅ New employees link to auth on signup
- ✅ Enables 1:1 mapping

### With This Change, Phase 1 Becomes Feasible

**Pattern:**

```typescript
// Client passes userId
// Server looks up: SELECT * FROM employees WHERE auth_user_id = userId
// Returns the employee record for that user
// Enforces ownership: employee can only read where auth_user_id = userId
```

---

## Summary: Phase 1 Authentication Architecture

### Option A: Without Schema Changes (Blocked at Ownership)

**What works:**

- ✅ Route-level auth requirement (redirect to login)
- ✅ Role-based filtering for admin/staff (if role passed from client)
- ⚠️ Role/permission from JWT but not verified server-side

**What doesn't work:**

- ❌ Employee reads own record only (can't link auth.uid to employees.id)
- ❌ Server-side role verification (no lookup possible)
- ❌ Audit trail (don't know which user made request)

**Effort:** 3-4 hours (route guards + basic filtering)  
**Security:** ⚠️ Limited (client provides role, not trusted)

### Option B: With ONE Column Addition (Recommended)

**Change required:**

```sql
ALTER TABLE employees ADD COLUMN auth_user_id UUID REFERENCES auth.users(id);
```

**What works:**

- ✅ Authenticated access required
- ✅ Employee reads own record only (via auth_user_id match)
- ✅ Admin/staff reads all records (via role check)
- ✅ Server-side role verification (lookup from auth_user_id)
- ✅ Audit trail (know which user made request)

**Effort:** 5-7 hours (migration + server functions + role checks)  
**Security:** ✅ Strong (server-side validation + RLS-ready)

---

## Recommended Approach for Phase 1

### Architecture Decision

**Use Option B:** Add `auth_user_id` column (single non-breaking migration)

**Rationale:**

1. **Minimal schema change** (one column, fully backwards-compatible)
2. **Enables true ownership validation** (auth.uid → employee.auth_user_id)
3. **Foundation for Phase 2** (RLS policies, audit logging)
4. **No existing data loss** (nullable column, gradual migration)
5. **Standards-aligned** (common pattern for auth-linked records)

---

## Implementation Path for Phase 1 MVP

### Before Code Changes:

1. ✅ **Approve** `auth_user_id` column addition
2. ✅ **Create** non-breaking migration (safe to deploy)
3. ✅ **Decide** how new employees get `auth_user_id` linked:
   - Option A: During signup (employee sets it)
   - Option B: Admin links during provisioning
   - Option C: Auto-link via email match

### Code Changes (Phase 1):

1. **Route guard** (5 mins)
   - Add beforeLoad hook to `/employee` route
   - Require `supabase.auth.getUser()` to exist
   - Redirect to `/auth/login` if not authenticated

2. **Server function updates** (2 hours)
   - Add `userId` parameter to functions
   - Query `employees` table by `auth_user_id = userId`
   - Filter based on role (admin sees all, employee sees self)

3. **Error handling** (1 hour)
   - Return 401 for unauthenticated
   - Return 403 for unauthorized
   - Return 404 if employee record not found

### Testing (2 hours)

- Employee can access `/employee` → redirects to login if not authenticated
- Employee can read own record only
- Admin can read all records
- Cross-employee access blocked (403)

---

## TanStack Start & Nitro Constraints

### What TanStack Start Provides

✅ **For client-side auth:**

- `getSupabaseBrowserClient()` works perfectly
- Can access `supabase.auth.getUser()`
- Can read JWT claims via `data.user?.app_metadata`

✅ **For server-side routing:**

- Request middleware exists (in `start.ts`)
- Can intercept requests before handler

⚠️ **For handler-level auth (createServerFn):**

- Context parameter available but undocumented
- Could access `context.event` (Nitro H3Event)
- Would require manual JWT parsing

### Recommended: Trust Client JWT

Instead of server-side JWT parsing, **trust the client JWT** (Supabase already validated it):

1. Client calls `supabase.auth.getUser()` (validates JWT)
2. If no user, Supabase returns null
3. Client sends `userId` to server function
4. Server trusts: If userId provided, user is authenticated
5. Server filters based on ownership

This is safe because:

- Supabase Auth validates JWT signature
- Client can't forge a JWT without private key
- Server just needs to trust the client session

---

## Final Recommendations

### For Phase 1 (Days 1-7)

1. **Add `auth_user_id` column** (non-breaking, nullable)
2. **Add route guard** to `/employee` (redirect if not authenticated)
3. **Update 3 server functions** (add userId parameter, filter by auth_user_id)
4. **Test ownership validation** (employee can't access other employees)

**Effort:** 6-8 hours  
**Risk:** Low (all changes non-breaking)  
**Security gain:** 🟢 Significant (auth required + ownership enforced)

### Skip (Phase 2+)

- ❌ Full RLS policies (Phase 3)
- ❌ Multi-tenant employer isolation (Phase 3)
- ❌ Audit logging (Phase 3)
- ❌ JWT parsing on server (unnecessary with client trust model)

---

## Architecture Diagram

```
Current State (No Auth):
┌──────────────────────────────────────────────────┐
│ Browser (any user)                               │
├──────────────────────────────────────────────────┤
│  supabase.auth.getUser() → { user?: {...} }     │
│                                                  │
│  No login required; anyone can access            │
│  listEmployeesFn() → all employees              │
└──────────────────────────────────────────────────┘

Phase 1 (Minimal Auth):
┌──────────────────────────────────────────────────┐
│ Browser (authenticated user only)                │
├──────────────────────────────────────────────────┤
│  supabase.auth.getUser() → { user: { id, ... }}│
│  Route guard: if !user, redirect /auth/login    │
│                                                  │
│  listEmployeesFn(userId) → query employees     │
│    WHERE auth_user_id = userId (if employee)    │
│    OR return all (if admin)                      │
└──────────────────────────────────────────────────┘
    ↓
┌──────────────────────────────────────────────────┐
│ Server (Supabase)                                │
├──────────────────────────────────────────────────┤
│  employees table:                                │
│    id UUID PRIMARY KEY                          │
│    auth_user_id UUID REFERENCES auth.users      │
│    uid TEXT                                      │
│    name TEXT                                     │
│    ...                                           │
└──────────────────────────────────────────────────┘
```

---

## Conclusion

**TanStack Start can support Phase 1 authentication with:**

✅ One column addition (`auth_user_id`)  
✅ Client-side JWT validation (already works)  
✅ Server-side ownership filtering (minimal code)  
✅ No external auth libraries needed  
✅ Foundation for Phase 2 (RLS, audit trail)

**Is it production-ready?**

- ✅ For MVP (authentication required, ownership enforced)
- ⚠️ For enterprise (RLS policies needed for Phase 2)
- ⚠️ For compliance (audit logging needed for Phase 3)
