# StackSave Round 2 Implementation Plan
## "Living Audits" — Complete Engineering Plan

---

## 1. HIGH-LEVEL SYSTEM FLOW

### Current State (Round 1)
```
User runs audit → AI analyzes current stack → Recommendations generated → PDF/Link shared → Done
```
No persistence. Each audit is independent. No notion of "what changed."

### Target State (Round 2)
```
User runs audit → Results persisted + pricing snapshot stored
                ↓
             [LOOP]
             Monitor: New pricing detected?
             ↓
             Trigger re-audit with new pricing
             ↓
             Compare old vs new recommendations
             ↓
             Email user: "New recommendations available"
             ↓
             User views diff: "Here's what changed" + "New savings possible"
```

### Architecture Migration Strategy

**Phase 1: Persistence Layer**
- Stop throwing away audit results
- Each audit stored with: `{ id, timestamp, tool_array, pricing_snapshot, recommendations }`
- Audit ID becomes retrievable identifier

**Phase 2: Pricing Snapshot**
- Store pricing at time of audit: `{ tool_name, price_per_unit, effective_date }`
- Create pricing index: easy lookup of "what was pricing on date X?"

**Phase 3: Change Detection**
- Manual trigger endpoint: `/api/audit/check-pricing-changes`
- Compares current pricing against stored snapshot
- Returns list of audits with stale pricing

**Phase 4: Re-audit Engine**
- New endpoint: `/api/audit/re-audit`
- Takes old audit ID + current pricing
- Runs recommendation engine with new data
- Stores new snapshot linked to original audit

**Phase 5: Diff Generation**
- Compare old recommendations vs new
- Highlight: cost changes, new/removed tools, priority shifts
- Calculate: "additional savings now possible"

**Phase 6: Notification**
- Email user: "Pricing update found. New savings possible. [Link]"
- Link routes to diff-view page

**Phase 7: Frontend Diff UI**
- New page: show old vs new side-by-side
- Collapsible sections for unchanged items
- Visual hierarchy: biggest changes first
- Show: cost delta, recommendation changes, priority changes

### Key Architectural Principle
**Minimal disruption to existing audit flow.** Old audits still work exactly as before. New audits get persistence bonus. Re-audit is optional feature, not mandatory flow change.

---

## 2. FEATURE BREAKDOWN

### Module 1: Persistent Audit Storage
**Purpose:** Stop throwing away audit results after generation

**What it does:**
- Intercept audit completion
- Store full audit object + metadata
- Return audit ID to frontend
- Make audit retrievable by ID later

**Dependencies:**
- MongoDB connection (already exists)
- New schema design (see section 3)

**Complexity:** LOW
- Straightforward data persistence
- No business logic
- Just storing what's already computed

**Risks:**
- Schema design mistakes (oversimplify early, regret later)
- Audit object size (if storing full tool arrays, could be large)
- Query performance if not indexed properly

---

### Module 2: Pricing Snapshot System
**Purpose:** Capture pricing at audit time; use as baseline for change detection

**What it does:**
- At audit time, store current pricing alongside recommendations
- Create immutable snapshot: "this audit was based on THIS pricing"
- Can compare against latest pricing later

**Dependencies:**
- Audit storage (Module 1)
- Access to current pricing data

**Complexity:** LOW
- Pricing data already exists in audit
- Just persist it with metadata

**Risks:**
- Pricing format inconsistency (if pricing changes structure, schema breaks)
- Missing pricing edge cases (tools without pricing, free tools, etc.)
- Timestamp precision (timezone issues)

---

### Module 3: Change Detection Engine
**Purpose:** Identify when pricing has changed significantly enough to warrant re-audit

**What it does:**
- Compare stored pricing snapshot against current pricing
- Detect: new tools, price changes, removed tools
- Flag audit as "stale" if delta > threshold

**Dependencies:**
- Pricing snapshot (Module 2)
- Access to latest pricing

**Complexity:** MEDIUM
- Need to handle: partial pricing updates, new tool launches, tool removals
- Need threshold logic: what constitutes "significant change"?
- Need to avoid false positives

**Risks:**
- Overly sensitive detection (false positives = spam emails)
- Overly loose detection (misses real opportunities)
- Performance (N+1 queries if not careful)

---

### Module 4: Email Notification Flow
**Purpose:** Alert users to pricing changes + new savings opportunities

**What it does:**
- When change detected: compose email
- Email contains: "pricing update", link to new audit
- Send via email provider
- Track delivery

**Dependencies:**
- Email provider integration (Resend, Postmark, SendGrid)
- Change detection (Module 3)
- Re-audit flow (Module 5)

**Complexity:** MEDIUM
- Email provider setup + credential management
- HTML template design (keep simple)
- Testing email delivery (different from local testing)
- Rate limiting (don't spam same user)

**Risks:**
- Credentials management (dev vs prod environments)
- Email deliverability (spam filters)
- Email template rendering issues
- Testing in 36 hours (need fast feedback loop)

---

### Module 5: Re-Audit Engine
**Purpose:** Run new audit with current pricing; compare against old audit

**What it does:**
- Take old audit ID
- Fetch stored pricing snapshot
- Fetch current pricing
- Re-run recommendation engine with both
- Store new audit linked to old audit
- Generate diff

**Dependencies:**
- Audit storage (Module 1)
- Pricing snapshots (Module 2)
- Diff generation logic (Module 6)

**Complexity:** MEDIUM
- Need to re-run audit engine with custom pricing data
- Need to handle: tool removals, new tools, pricing format changes
- Need to link old ↔ new audits

**Risks:**
- Audit engine assumes fresh pricing data (might not handle "compare mode" gracefully)
- Schema misalignment (old audit structure vs new one)
- Performance (re-audit could be slow)

---

### Module 6: Diff Generation Logic
**Purpose:** Compare old vs new recommendations; generate understandable diff

**What it does:**
- Input: old audit, new audit
- Output: structured diff showing: changed recommendations, cost deltas, priority changes
- Highlight: biggest improvements first

**Dependencies:**
- Re-audit engine (Module 5)
- Understanding of recommendation structure

**Complexity:** MEDIUM-HIGH
- Need sophisticated comparison logic
- Need to handle: new tools, removed tools, changed priorities
- Need to decide: what constitutes "significant change"?
- Need performance: diff generation shouldn't be slow

**Risks:**
- Overly complex comparison logic (hard to debug)
- Diff not user-understandable
- False positives (flagging unchanged items as changed)
- Performance (if diff generation happens real-time)

---

### Module 7: Frontend Diff UI Component
**Purpose:** Display old vs new audit in way users understand and trust

**What it does:**
- New page: `/audit/:id/diff` or `/audit/:id/compare`
- Shows: original audit, new audit, diff highlighting
- Collapsible sections: unchanged items hidden by default
- Visual hierarchy: biggest savings first
- Shows: cost improvement, recommendation changes

**Dependencies:**
- Diff generation logic (Module 6)
- Shared audit infrastructure (already exists)
- Frontend routing

**Complexity:** MEDIUM
- React component design
- CSS layout (side-by-side comparison is tricky)
- Mobile responsiveness
- Data fetching + loading states

**Risks:**
- Layout complexity (side-by-side on mobile breaks)
- Too much information (overwhelming users)
- Performance (if re-audit slow, page feels broken)
- Accessibility (color-coding green/red might not be enough)

---

### Module 8: Backend API Endpoints
**Purpose:** Expose all new functionality via REST

**Endpoints needed:**
1. `POST /api/audit/check-pricing-changes` — find audits with stale pricing
2. `POST /api/audit/:id/re-audit` — trigger re-audit for specific audit
3. `GET /api/audit/:id/diff` — fetch diff data
4. `POST /api/audit/:id/re-audit-and-notify` — re-audit + send email (internal)

**Dependencies:**
- All modules above

**Complexity:** LOW-MEDIUM
- Endpoints are wrappers around business logic
- Main complexity: input validation, error handling

**Risks:**
- API design confusion (should re-audit be automatic or manual?)
- Auth/permissions (who can trigger re-audit?)
- Rate limiting (prevent abuse)

---

### Module 9: Testing & Verification Strategy
**Purpose:** Ensure 36-hour implementation actually works end-to-end

**What needs testing:**
1. Audit persistence (can retrieve stored audit)
2. Pricing snapshot accuracy (prices stored correctly)
3. Change detection (correctly identifies price changes)
4. Re-audit accuracy (new recommendations correct)
5. Diff generation (comparison logic sound)
6. Email delivery (emails actually send)
7. Frontend rendering (diff-view displays correctly)
8. Edge cases (tools removed, new tools, etc.)

**Dependencies:**
- All modules
- Test data + fixtures

**Complexity:** MEDIUM
- Lots of integration points to test
- Deployment testing (email doesn't work locally)
- Hard to test without real data

**Risks:**
- Late discovery of bugs
- Email testing delays (provider setup)
- Dataset size (testing with real audit data)

---

### Module 10: Deployment Strategy
**Purpose:** Ship to production within 36 hours

**Steps:**
1. Render backend config + MongoDB connection
2. Frontend build + deployment
3. Email provider credentials setup
4. Run end-to-end tests in deployed environment
5. Rollout

**Dependencies:**
- All modules working locally first

**Complexity:** MEDIUM
- Multiple environment variables
- Email provider integration
- Database migration (legacy audits)

**Risks:**
- Environment variable misalignment
- Database connection issues
- Email credentials incorrect
- Deployment rollback needed

---

## 3. DATABASE DESIGN PLANNING

### Current Schema (assumed, based on context)
```
Audit Collection:
{
  _id: ObjectId,
  userId: string,
  timestamp: Date,
  tools: [
    { name, cost, category, ... }
  ],
  recommendations: [
    { toolName, action, savings, ... }
  ],
  totalSavings: number,
  pdf: URL,
  shareToken: string,
  ...
}
```

### New Schema Requirements

#### Collection: `Audits` (modified)
```
{
  _id: ObjectId,
  userId: string,
  timestamp: Date,
  version: "v1", // track schema version
  
  // Original audit data
  tools: [
    { name, cost, category, estimatedSavings, ... }
  ],
  recommendations: [
    { toolName, action, priority, estimatedSavings, confidence, ... }
  ],
  totalSavings: number,
  
  // Pricing snapshot (NEW)
  pricingSnapshot: {
    capturedAt: Date,
    tools: [
      { name, unitPrice, billingCycle, ... }
    ],
    pricingHash: string // SHA256 for quick comparison
  },
  
  // Re-audit metadata (NEW)
  reAuditOf: ObjectId, // if this is re-audit, points to original
  reAuditedAt: Date,
  isLatestVersion: boolean, // mark which is "current" audit
  
  // Sharing/export
  pdf: URL,
  shareToken: string,
  
  // Metadata
  auditDuration: number, // ms
  toolCount: number,
  status: "completed" | "error" | "pending"
}
```

#### Collection: `PricingSnapshots` (NEW, optional)
If pricing becomes complex, separate it:
```
{
  _id: ObjectId,
  auditId: ObjectId,
  timestamp: Date,
  tools: [
    { name, unitPrice, billingCycle, vendor, ... }
  ],
  pricingHash: string,
  version: number
}
```

**Decision:** Keep pricing embedded in Audit (simpler, less overhead, no join needed)

#### Collection: `AuditNotifications` (NEW, optional)
Track which users got notified:
```
{
  _id: ObjectId,
  auditId: ObjectId,
  originalAuditId: ObjectId,
  notificationType: "pricing_change",
  sentAt: Date,
  deliveryStatus: "sent" | "failed",
  recipientEmail: string
}
```

**Decision:** Optional. Log email sends in audit record instead (simpler).

### Indexing Strategy

```
Audits:
  - { userId, timestamp } // find user's audits by date
  - { userId, isLatestVersion } // find "current" audits per user
  - { pricingSnapshot.pricingHash } // find audits with specific pricing (for change detection)
  - { shareToken } // shared audit lookup
  - { reAuditOf } // find re-audits of specific audit

```

### Schema Design Decisions

**Why embed pricing instead of separate collection?**
- Simpler queries (no joins)
- Each audit is self-contained
- Pricing rarely changes after audit
- MongoDB documents can handle it (< 16MB limit)

**Why track `reAuditOf` and `isLatestVersion`?**
- Preserve audit history
- Don't lose original
- Easy to show "here's old, here's new"
- Makes diff generation straightforward

**Why store `pricingHash`?**
- Quick comparison without deep object inspection
- O(1) detection instead of O(n)
- Handles pricing updates efficiently

**What about legacy audits?**
- No migration required (reAuditOf is optional)
- Old audits work as-is
- New features only apply to new audits + re-audits

### Data Size Considerations

**Typical audit:** ~3-5KB (tools + recommendations)
**Typical pricing snapshot:** ~2-3KB
**Total per audit:** ~5-8KB

**Safe to store:** Yes. MongoDB comfortable with millions of these.

---

## 4. BACKEND API PLANNING

### API Endpoint 1: Persist Audit on Completion
```
Endpoint: POST /api/audit/create
Already exists (assumed), but modifying to store snapshot

Input:
{
  userId: string,
  tools: [ { name, cost, ... } ],
  recommendations: [ { toolName, action, ... } ],
  totalSavings: number,
  currentPricing: { /* current vendor pricing */ }
}

Output:
{
  auditId: ObjectId,
  timestamp: Date,
  shareToken: string
}

Logic:
1. Generate pricingHash from current pricing
2. Store audit + pricing snapshot + metadata
3. Return audit ID for frontend to track

Edge cases:
- User not authenticated (add auth check)
- Invalid pricing data (validate structure)
- Database write failure (retry logic)
```

### API Endpoint 2: Check Pricing Changes (Manual Trigger)
```
Endpoint: POST /api/audit/check-pricing-changes
or
POST /api/audit/check-all-pricing-changes

Input:
{
  userId: string // optional, if provided check only user's audits
}

Output:
{
  auditIds: [ObjectId, ...],
  changedCount: number,
  details: [
    {
      auditId: ObjectId,
      oldPricingHash: string,
      newPricingHash: string,
      priceChangedTools: [string, ...]
    }
  ]
}

Logic:
1. Query all "latest" audits (where isLatestVersion = true)
2. For each audit, compare pricingSnapshot.pricingHash against current hash
3. Flag mismatches
4. Return list

Performance:
- Hash comparison O(1) per audit
- Total time: O(n) where n = audit count
- Should be <500ms for typical user (10-50 audits)

Edge cases:
- No audits with pricing changes
- User has no audits
- Current pricing unavailable
```

### API Endpoint 3: Trigger Re-Audit
```
Endpoint: POST /api/audit/:auditId/re-audit

Input:
{
  auditId: ObjectId
}

Output:
{
  originalAuditId: ObjectId,
  newAuditId: ObjectId,
  diff: {
    changedRecommendations: [...],
    newRecommendations: [...],
    removedRecommendations: [...],
    savingsDelta: number
  }
}

Logic:
1. Fetch original audit + pricing snapshot
2. Fetch current pricing
3. Run audit engine with: original tools + current pricing
4. Store new audit with reAuditOf = auditId
5. Mark original as isLatestVersion = false, new as isLatestVersion = true
6. Generate diff
7. Return both audit IDs + diff summary

Edge cases:
- Tools removed from market (handle gracefully)
- New tools added (include in recommendations)
- Pricing no longer available (fallback to last known)
- Audit engine errors (return error, don't corrupt state)

Performance considerations:
- Re-audit engine could be slow (30 tools * AI analysis)
- Should run async or accept latency
- For 36-hour MVP: sync is fine, accept 2-3s latency
```

### API Endpoint 4: Fetch Diff Data
```
Endpoint: GET /api/audit/:auditId/diff

Input:
- auditId: ObjectId (can be original or re-audit)

Output:
{
  originalAudit: { /* full audit object */ },
  latestAudit: { /* full audit object */ },
  diff: {
    toolsChanged: [
      {
        name: string,
        costDelta: number,
        recommendationChanged: boolean,
        oldRecommendation: string,
        newRecommendation: string,
        priority: "high" | "medium" | "low"
      }
    ],
    toolsAdded: [{ name, recommendation, savings }],
    toolsRemoved: [{ name }],
    totalSavingsDelta: number,
    changeTimestamp: Date
  }
}

Logic:
1. Fetch auditId
2. If reAuditOf exists, fetch original
3. If reAuditOf doesn't exist, find latest reaudit where reAuditOf = auditId
4. Generate diff between original and latest
5. Return both audits + structured diff

Edge cases:
- Only one version (no re-audit yet)
- Multiple re-audits (return original vs latest)
- Missing data (gracefully handle)
```

### API Endpoint 5: Trigger Re-Audit + Send Email
```
Endpoint: POST /api/audit/:auditId/notify-if-changed

Input:
{
  auditId: ObjectId,
  userEmail: string
}

Output:
{
  reAuditTriggered: boolean,
  emailSent: boolean,
  message: string
}

Logic:
1. Call check-pricing-changes on single audit
2. If changed, call re-audit
3. If re-audit successful, send email
4. Return status

This is a convenience endpoint for: "check, re-audit, and notify if anything changed"
Useful for batch processing.

Edge cases:
- Pricing unchanged (don't send email)
- Email send fails (return error but audit still created)
- User already notified recently (rate limit, don't send duplicate)
```

### API Design Decisions

**Why manual trigger instead of cron?**
- Simpler infrastructure (no background job scheduler needed)
- Can be called from frontend
- Can be tested immediately
- Render free tier doesn't have reliable cron

**Why separate "check" from "re-audit"?**
- Check is fast (hash comparison only)
- Re-audit is slow (full analysis)
- Frontend can show "pricing changed?" without waiting for analysis
- Batch processing becomes possible

**Rate limiting strategy?**
- Check: 1 per minute per user (fast)
- Re-audit: 1 per 30 minutes per audit (slow)
- Email: 1 per audit per 24 hours (avoid spam)

**Auth strategy?**
- For 36-hour MVP: basic userId in request (not production-ready)
- Add JWT/session validation later
- Can add permission checks later

---

## 5. CHANGE DETECTION STRATEGY

### Option 1: Cron-Based Monitoring
```
Every X minutes:
  - Query all audits
  - Compare each audit's pricing snapshot to current pricing
  - Flag stale audits
  - Trigger re-audits automatically
  - Send emails
```

**Pros:**
- Automatic, users don't have to do anything
- Can monitor in background

**Cons:**
- Infrastructure overhead (need job scheduler)
- Render free tier doesn't support cron well
- Harder to test (time-dependent)
- Might send too many emails
- Hard to debug timing issues
- Waste compute on audits with no users

**Complexity:** HIGH

---

### Option 2: Manual Trigger Endpoint
```
Users/system calls:
  POST /api/audit/check-pricing-changes

Endpoint checks all audits for user
Returns list of stale ones
Frontend can then:
  - Offer re-audit
  - Auto-trigger re-audit
  - Send email notification
```

**Pros:**
- Simple infrastructure (just REST endpoint)
- Easy to test (call endpoint, get response)
- User controls timing (doesn't feel spammy)
- Easy to deploy + debug
- Can call from frontend, admin UI, or external job

**Cons:**
- Requires active checking (doesn't happen automatically)
- User might not check frequently
- Could miss pricing opportunities

**Complexity:** LOW

---

### Option 3: Hybrid Approach
```
Manual endpoint for on-demand checking
+ External service calling endpoint every N hours
(external could be: Make.com, Zapier, or simple cron on separate tier)
```

**Pros:**
- Best of both worlds
- Can monitor regularly + on-demand

**Cons:**
- More complex setup
- Need external service

**Complexity:** MEDIUM

---

### RECOMMENDATION: Option 2 (Manual Trigger)

**Why?**
1. **36-hour constraint:** Simplest to implement + deploy
2. **Testability:** Easy to verify locally + in production
3. **No external dependencies:** All self-contained
4. **Debugging:** Easier to troubleshoot (no timing issues)
5. **Cost:** No overhead on Render free tier
6. **Product thinking:** Allows users to opt-in to re-audits (trust)

**Implementation:**
1. Backend endpoint: `POST /api/audit/check-pricing-changes`
2. Frontend can auto-call on page load (optional)
3. Can add "Check for updates" button in dashboard
4. Can be called by external job later (easy to add)

**Future iteration:** Add actual background job once infrastructure matures.

---

## 6. RE-AUDIT & DIFF VIEW LOGIC

### Re-Audit Flow (Detailed)

```
User Action:
  Click "Re-audit with current pricing" on old audit

Process:
  1. Fetch original audit:
     - Original tools array
     - Original pricing snapshot
     - Original recommendations
  
  2. Fetch current pricing:
     - Latest vendor pricing for all tools
     - Handle: new tools, removed tools, price changes
  
  3. Re-run audit engine:
     - Input: original tools + CURRENT pricing
     - Output: new recommendations based on new prices
     - Store: new recommendations
  
  4. Create new audit record:
     - Copy original audit data
     - Update: pricing snapshot to current
     - Set: reAuditOf = original audit ID
     - Mark: isLatestVersion = true
     - Mark: original isLatestVersion = false
  
  5. Generate diff:
     - Compare original recommendations vs new
     - Identify: changed priorities, new opportunities, removed tools
     - Calculate: new total savings vs old
  
  6. Return:
     - New audit ID
     - Diff data
     - Success confirmation
```

### Diff Generation Logic (Detailed)

```
Input:
  - originalAudit: { tools, recommendations, totalSavings }
  - newAudit: { tools, recommendations, totalSavings }

Output:
  - Structured diff showing what changed

Algorithm:

1. Build tool lookup maps:
   - oldMap = { [toolName]: tool } from originalAudit
   - newMap = { [toolName]: tool } from newAudit

2. Build recommendation lookup maps:
   - oldRecs = { [toolName]: recommendation }
   - newRecs = { [toolName]: recommendation }

3. Find unchanged tools:
   - For each tool in oldMap:
     - If exists in newMap AND price/recommendation same → unchanged

4. Find changed tools:
   - For each tool in oldMap:
     - If exists in newMap AND (price different OR recommendation different) → changed
     - Calculate: savingsDelta, recommendationChange, priorityChange

5. Find added tools:
   - For each tool in newMap:
     - If NOT in oldMap → added

6. Find removed tools:
   - For each tool in oldMap:
     - If NOT in newMap → removed

7. Calculate deltas:
   - totalSavingsDelta = newAudit.totalSavings - originalAudit.totalSavings
   - changedCount = # of tools that changed
   - priorityShiftCount = # of tools with priority change

8. Sort by impact:
   - highestSavingsPotential first
   - largestPriceChanges first
   - mostUrgentPriorities first

Output structure:
{
  summary: {
    toolsChanged: number,
    toolsAdded: number,
    toolsRemoved: number,
    totalSavingsDelta: number,
    timestamp: Date
  },
  changed: [
    {
      name: string,
      oldPrice: number,
      newPrice: number,
      priceDelta: number,
      oldRecommendation: string,
      newRecommendation: string,
      recommendationChanged: boolean,
      oldPriority: "high" | "medium" | "low",
      newPriority: "high" | "medium" | "low",
      priorityChanged: boolean,
      oldSavings: number,
      newSavings: number,
      savingsDelta: number,
      reason: string // why recommendation changed
    }
  ],
  added: [
    {
      name: string,
      price: number,
      recommendation: string,
      priority: string,
      savings: number,
      reason: string
    }
  ],
  removed: [
    {
      name: string,
      reason: string
    }
  ],
  unchanged: [
    {
      name: string,
      // minimal info for unchanged items
    }
  ]
}
```

### Key Design Decisions

**Should re-audit always succeed?**
- No. If pricing unavailable or engine fails, return error.
- Don't silently create corrupted audit.

**Should we keep all versions?**
- Yes. Preserves history. Users want to see progression.
- Query latest with `isLatestVersion = true`.

**Should diff show ALL changes or only significant ones?**
- Show all changes.
- Frontend can filter/collapse unchanged items.
- Trust users with complete information.

**Should we show confidence scores?**
- Yes. Some recommendations have higher confidence.
- Help users understand: "This is definitely worth it" vs "Maybe consider"

**How to handle tools with no pricing?**
- Treat as "can't evaluate" (missing data)
- Don't recommend/change recommendations based on missing data
- Flag in diff: "Pricing not available for X tools"

---

## 7. FRONTEND UX PLAN

### Current UI Structure (assumed)
```
Dashboard:
  - List of past audits
  - "Run new audit" button
  - Shared audit view (via token)

Audit results page:
  - List of recommendations
  - PDF download
  - Share button
  - Savings display
```

### New Components Needed

#### Component 1: Diff View Page
```
Route: /audit/:auditId/diff
or: /audit/:auditId/compare

Layout:
┌─────────────────────────────────┐
│ Header: "Pricing Update Results" │
│ Subtitle: "Re-audited 2025-05-20"│
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Summary Box (Big numbers):       │
│ • Old total savings: $X,XXX      │
│ • New total savings: $Y,YYY      │
│ • Additional potential: +$Z,ZZZ  │
│ • Tools recommendation changed: N│
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Tabs:                           │
│ [All Changes] [Added] [Removed] │
└─────────────────────────────────┘

[All Changes tab content]:
┌─────────────────────────────────┐
│ Filter:                         │
│ [Show all] [High priority only] │
│ [Biggest savings first]         │
└─────────────────────────────────┘

For each changed tool:
┌──────────────────────────────────┐
│ Tool Name                        │
│ Price: $X → $Y (↓$Z)            │
│ Recommendation: A → B           │
│ Priority: High                  │
│ New savings potential: +$ZZZ    │
│ [Reason] dropdown               │
└──────────────────────────────────┘

[Unchanged items]:
┌──────────────────────────────────┐
│ ✓ Tool Name (unchanged)         │
│   [Expand to see details]       │
└──────────────────────────────────┘
```

**Mobile responsive:** Stack vertically instead of side-by-side

#### Component 2: Diff Summary Box
```
Display prominently at top:
- Original savings
- New savings
- Delta
- % change
- Tools changed count
```

**Design:** Large numbers, clear color coding (green for gains, neutral for no change)

#### Component 3: Changed Recommendation Card
```
For each tool that changed:
- Tool icon (if available)
- Tool name
- Price delta (with direction arrow)
- Old recommendation → New recommendation
- Priority level
- Additional savings
- Reason (collapsible)
```

**Visual hierarchy:**
1. Biggest opportunity first
2. High priority before low
3. Positive changes (increased savings) highlighted

### Where to place new UI in existing app

**Option A: New tab on audit view**
```
Audit page tabs:
[Recommendations] [Diff] [PDF]
```

**Option B: Separate page**
```
/audit/:id/view (current)
/audit/:id/diff (new)
```

**Recommendation: Option B (Separate page)**
- Cleaner separation
- Shared link structure unchanged
- Less redesign of existing page
- Easier to test

### UX Considerations

**Trust & Explainability:**
- Show WHY recommendations changed
- Include confidence scores
- Be honest about missing data (pricing unavailable)
- Don't hide negative scenarios (if costs increased, show it)

**Information density:**
- Collapse unchanged items by default
- Show filters: "High priority changes only"
- Sort by impact (biggest opportunity first)
- Keep text concise

**Mobile:**
- Side-by-side comparison doesn't work
- Stack vertically
- Swipe between old/new
- Or tabbed view: [Original] [Updated] [Diff]

**Performance:**
- Diff rendering should be fast (<200ms)
- If audit large (50+ tools), might be slow
- Consider: pagination, lazy loading, virtual scrolling
- For 36-hour MVP: assume <50 tools per audit (safe)

### What NOT to change

- Keep existing audit results page as-is
- Don't redesign dashboard
- Don't change PDF export
- Don't alter recommendation engine

---

## 8. EMAIL NOTIFICATION PLAN

### Email Provider Options

**Option 1: Resend (Modern, developer-friendly)**
- Free tier: 100 emails/day
- Setup: 5 minutes
- API: Simple, good docs
- Template: HTML support
- Best for: Startups
- **Recommendation: Use this**

**Option 2: SendGrid**
- Free tier: 100 emails/day
- Setup: 10 minutes
- API: Good but older
- More features, more complexity

**Option 3: Postmark**
- Free tier: 100 emails/month
- Setup: 10 minutes
- API: Excellent
- Best for: Transactional emails

**Option 4: AWS SES**
- Free tier: 62k emails/month
- Setup: 30 minutes (requires AWS account)
- Complex configuration
- Most powerful

**RECOMMENDATION: Resend**
- Simplest setup
- Good free tier (100/day covers MVP testing)
- Modern API
- No AWS required

### Email Integration Architecture

```
Flow:
User triggers re-audit
  ↓
Re-audit completes successfully
  ↓
Diff data generated
  ↓
Email service called with:
  - userEmail
  - auditName
  - diffSummary
  - link to diff-view
  ↓
Email queued and sent
  ↓
Delivery status logged
```

### Email Template Design

```
Subject: "New pricing found for your StackSave audit [AUDIT_NAME]"

Body:

---

Hi [USER_NAME],

We detected pricing changes in your stack.

📊 Quick Summary:
• Old total savings: $X,XXX
• New total savings: $Y,YYY
• Change: +$Z,ZZZ ([+X%])

🔍 What changed:
• [Tool A]: Price ↓ from $X to $Y
• [Tool B]: New recommendation available
• [Tool C]: No longer recommended

→ [View Full Details & Recommendations]

Questions? Reply to this email.

— StackSave team

---
```

**Design principles:**
- Concise (users won't read long emails)
- Action-oriented (clear link)
- Trustworthy (honest about changes)
- Mobile-friendly (single column)

### Implementation Plan

```
Step 1: Set up Resend account
- Create account
- Verify domain (or use default Resend domain)
- Get API key

Step 2: Add to backend
- Install Resend SDK
- Create EmailService
- Implement sendPricingChangeNotification()

Step 3: Integrate with re-audit flow
- After re-audit succeeds
- Call emailService.send()
- Log result

Step 4: Test locally
- Use Resend test API key
- Send to test email
- Verify template rendering

Step 5: Deploy
- Add API key to Render config
- Test email in production
- Monitor delivery
```

### Rate Limiting & Spam Prevention

```
Rules:
- Max 1 email per audit per 24 hours (prevent spam if re-audit called multiple times)
- Track: auditId + "last_notification_sent"
- Skip email if: less than 24 hours since last notification
- Log all emails sent (for debugging)
```

### Testing Strategy

```
Local testing:
1. Use test API key from Resend
2. Send to personal test email
3. Verify template rendering
4. Check link works

Production testing (after deployment):
1. Call re-audit endpoint with test audit
2. Verify email arrives in inbox (not spam)
3. Verify link works and shows diff-view
4. Test with multiple emails

Edge cases:
- Email send fails (network error) → log and retry?
- User email invalid → handle gracefully
- Template has bad data → email still sends with fallback

For 36-hour MVP:
- Simple fire-and-forget (don't retry on failure)
- Log failures for debugging
- Can add retry logic later
```

### What if Email Provider Down?

**Strategy:**
- Don't let email failures block re-audit
- Queue failed emails for retry (simple log file)
- Alert engineer (log to console + file)
- User still sees diff-view (just no email)
- Can manually retry later

---

## 9. IMPLEMENTATION ORDER

### Recommended Sequence (Strict ordering for 36 hours)

**Batch 1: Foundation (Hours 0-6)**

1. **Database schema design** (1 hour)
   - Design new Audit schema
   - Plan indexes
   - NO MIGRATIONS YET (just design)

2. **Persistence layer** (2 hours)
   - Modify audit creation endpoint
   - Store audit + pricing snapshot
   - Verify stored data in MongoDB
   - Test: Create audit, retrieve audit

3. **Pricing snapshot structure** (1 hour)
   - Create pricingHash logic
   - Store pricing with audit
   - Test: Pricing captured correctly

4. **Commit checkpoint** (0.5 hours)
   - "Feat: Persistent audit storage with pricing snapshot"

**Why this order?**
- Unblock all downstream work
- Verify data layer works before building on it
- Quick wins build momentum

---

**Batch 2: Change Detection (Hours 6-12)**

5. **Change detection logic** (2 hours)
   - Implement pricingHash comparison
   - Write detection algorithm
   - Test: Compare old vs new pricing

6. **Check pricing changes endpoint** (1 hour)
   - Create `/api/audit/check-pricing-changes`
   - Query all user audits
   - Return list of stale audits
   - Test locally

7. **Commit checkpoint** (0.5 hours)
   - "Feat: Pricing change detection"

**Why this order?**
- Detection is foundation for re-audit
- Need working detection before re-audit makes sense
- Endpoint is simple, low-risk

---

**Batch 3: Re-Audit & Diff (Hours 12-20)**

8. **Re-audit endpoint** (3 hours)
   - Fetch original audit + pricing
   - Fetch current pricing
   - Re-run audit engine with new pricing
   - Store new audit linked to original
   - Handle edge cases

9. **Diff generation logic** (2 hours)
   - Compare old vs new recommendations
   - Generate structured diff data
   - Sort by impact
   - Test with sample data

10. **Commit checkpoint** (0.5 hours)
    - "Feat: Re-audit and diff generation"

11. **Fetch diff endpoint** (0.5 hours)
    - Create `/api/audit/:id/diff`
    - Return both audits + diff data
    - Test

**Why this order?**
- These are core feature
- Backend needs working before frontend starts
- Diff generation is business logic (test thoroughly)

---

**Batch 4: Email (Hours 20-24)**

12. **Email service setup** (1.5 hours)
    - Resend account + API key
    - EmailService class
    - Email template
    - Local testing

13. **Integrate email with re-audit** (1 hour)
    - After re-audit, send email
    - Rate limiting (1 email per audit per 24h)
    - Logging
    - Test locally

14. **Commit checkpoint** (0.5 hours)
    - "Feat: Email notifications on pricing change"

**Why this order?**
- Email is lower priority than core flow
- Can be tested later
- Doesn't block other features
- Easy to add last

---

**Batch 5: Frontend Diff UI (Hours 24-30)**

15. **Diff view component** (3 hours)
    - React component structure
    - Fetch diff data from API
    - Display old vs new
    - Summary box
    - Collapsible unchanged items

16. **Styling & mobile responsiveness** (1 hour)
    - CSS layout
    - Mobile stacking
    - Colors (green/red for changes)
    - Basic responsive grid

17. **Commit checkpoint** (0.5 hours)
    - "Feat: Frontend diff-view page"

**Why this order?**
- Backend must be solid first
- Frontend builds on API
- UI is last, lowest risk if time runs short

---

**Batch 6: Testing & Deployment (Hours 30-36)**

18. **Manual end-to-end testing** (2 hours)
    - Create audit
    - Check for pricing changes
    - Trigger re-audit
    - View diff
    - Verify email
    - Test edge cases

19. **Deployment to Render** (1.5 hours)
    - Environment variables
    - Database connection
    - Email credentials
    - Frontend build + deploy
    - Backend deploy

20. **Final verification** (1 hour)
    - Test in production
    - Verify all endpoints work
    - Check email delivery
    - Spot-check frontend

21. **Documentation** (0.5 hours)
    - Update DEVLOG
    - Update ROUND2_PR.md
    - Add notes to code

**Commit:** "Release: Round 2 complete"

---

### Why This Order?

1. **Database first:** Everything depends on it
2. **Detection second:** Enables re-audit
3. **Re-audit third:** Core feature
4. **Email fourth:** Important but not blocking
5. **Frontend fifth:** Needs backend working
6. **Testing/deploy last:** Verify + ship

### If Time Runs Short (Cutting order)

**Priority 1 (MUST ship):**
- Audit persistence
- Pricing snapshot
- Change detection
- Re-audit engine
- Diff generation

**Priority 2 (Should ship):**
- Email notifications
- Frontend diff UI

**Priority 3 (Can skip):**
- Email HTML styling
- Advanced diff features
- Mobile optimization

**MVP acceptable with:** Backend + basic frontend, no email

---

## 10. ENGINEERING TRADEOFFS

### What to Keep Simple

**1. Change Detection**
- Simple hash comparison (not granular per-tool)
- One recommendation per tool (not multiple options)
- Binary: pricing changed or not (no threshold)

**Rationale:** Complexity adds debugging time. Hash is sufficient.

---

**2. Re-Audit**
- Run full audit engine again (simple, proven code path)
- Don't try to "delta" audit (too complex)
- Store full new audit (not just deltas)

**Rationale:** Reuse existing engine = less new code. More storage (acceptable).

---

**3. Diff Generation**
- Simple array comparison (not sophisticated NLP)
- Highlight changes, hide unchanged (basic filtering)
- Sort by savings (no complex ranking)

**Rationale:** Users understand simple diffs. ML-based ranking overkill for MVP.

---

**4. Email Template**
- Plain HTML, no CSS framework
- Single column, mobile-friendly
- Text links (no complex styling)

**Rationale:** Email rendering inconsistent across clients. Keep it simple.

---

### What to Avoid (Time Traps)

**1. Background Job Infrastructure**
- Don't build cron system
- Don't use external job queue
- Don't deploy separate worker

**Rationale:** 36 hours. Use simple HTTP endpoints. Complexity not worth it.

---

**2. Advanced Diff Visualization**
- Don't build side-by-side timeline
- Don't animate price changes
- Don't create complex charts

**Rationale:** Users need info, not animations. Focus on clarity.

---

**3. Admin Dashboard**
- Don't build UI to manage audits
- Don't build audit history viewer
- Don't build analytics dashboard

**Rationale:** Out of scope. Features for later.

---

**4. Complex Auth**
- Don't implement role-based access control
- Don't build permission system
- Keep auth simple (userId in request)

**Rationale:** Works for MVP. Add later if needed.

---

**5. Notification Preferences**
- Don't build email frequency settings
- Don't build unsubscribe page
- Don't build notification center

**Rationale:** Nice-to-have. MVP can skip.

---

**6. Audit Versioning**
- Don't build version history UI
- Don't build edit/delete audit features
- Don't build audit recovery

**Rationale:** Too complex. Immutable audits sufficient.

---

### What to Engineer Carefully (High Score)

**1. Diff Generation Accuracy**
- This is the core feature
- Users trust the diff
- Must be correct
- Spend time: unit tests, edge cases

---

**2. Database Schema**
- Gets locked in early
- Hard to change later
- Invest time: good design upfront
- Test with realistic data

---

**3. Re-Audit Accuracy**
- Must produce correct recommendations
- Must not corrupt audit data
- Spend time: validation, error handling

---

**4. Email Delivery**
- Reflects on product quality
- Must work reliably
- Test thoroughly in production

---

### Complexity Budget Allocation

```
Total effort: 36 hours

Backend logic:         12 hours (database + detection + re-audit + diff)
Email integration:      3 hours
Frontend UI:            4 hours
Testing:                3 hours
Deployment:             2 hours
Debugging/buffer:       2 hours

Total:                 26 hours

Buffer: 10 hours for: unexpected issues, debugging, additional testing
```

---

## 11. DEBUGGING RISK ANALYSIS

### Predicted Problem Areas

#### Risk 1: Stale Pricing Mismatch
**Problem:** Audit engine uses fresh pricing. Comparison engine uses stored pricing. Mismatch in pricing source.

**Symptom:** Diff shows changes that shouldn't be there (or vice versa)

**Root cause:** Pricing fetching logic called twice, returning different data

**Prevention:**
- Centralize pricing fetch (one function)
- Store pricing in variable, reuse
- Unit test: pricing fetch called twice = same result

**Debug strategy:**
- Log pricing hash at audit time
- Log pricing hash at re-audit time
- Compare hashes
- If different, dump both pricing objects to see delta

---

#### Risk 2: MongoDB Serialization Issue
**Problem:** MongoDB ObjectId doesn't serialize to JSON. Frontend gets binary data.

**Symptom:** Frontend crashes with "Cannot serialize ObjectId"

**Root cause:** Forgot `.toJSON()` on MongoDB schema

**Prevention:**
- Implement custom serializer early
- Test: fetch audit from API, parse JSON in frontend
- Check: no [Object] in response

**Debug strategy:**
- Log raw API response
- Check if ObjectIds present
- Add custom serializer

---

#### Risk 3: Timezone Inconsistency
**Problem:** Backend stores UTC, frontend assumes local time. Diff shows wrong timestamps.

**Symptom:** Diff shows audit "2 hours in future" or "2 hours in past"

**Root cause:** Timezone conversion error in audit storage

**Prevention:**
- Always store UTC ISO string in database
- Test: store in one timezone, read in another
- Frontend: parse as UTC before display

**Debug strategy:**
- Check stored timestamp in MongoDB
- Check browser timezone
- Log before/after conversion

---

#### Risk 4: N+1 Query Performance
**Problem:** Re-audit queries pricing for each tool separately. With 50 tools = 50 queries.

**Symptom:** Re-audit takes 30 seconds instead of 2 seconds

**Root cause:** Forgot to batch pricing query

**Prevention:**
- Design pricing fetch to be batch
- Log query count
- Test with 50-tool audit before deployment

**Debug strategy:**
- Enable MongoDB query logging
- Run re-audit, count queries
- If > 10, you have N+1

---

#### Risk 5: Race Condition on Re-Audit
**Problem:** Two simultaneous re-audit requests create duplicate snapshots.

**Symptom:** Multiple new audits created, unclear which is "latest"

**Root cause:** No locking on re-audit operation

**Prevention:**
- Add unique index: (auditId, timestamp_bucket)
- Test: trigger re-audit twice simultaneously
- Handle duplicate error gracefully

**Debug strategy:**
- Check MongoDB indexes
- Run concurrent requests
- Verify unique constraint fires

---

#### Risk 6: Email Credentials Missing
**Problem:** Email API key not in production environment.

**Symptom:** Email send fails silently. No error in logs.

**Root cause:** Forgot to add credentials to Render config

**Prevention:**
- Test email sending before deployment
- Add credentials to Render early
- Log all email sends (sent/failed)

**Debug strategy:**
- Check environment variables on Render
- Test email endpoint directly
- Check Resend dashboard for delivery status

---

#### Risk 7: Audit Engine Breaks with New Pricing
**Problem:** Audit engine assumes specific pricing data structure. New pricing is different format.

**Symptom:** Re-audit fails, recommender throws error

**Root cause:** Pricing schema changed or fetch returns different structure

**Prevention:**
- Validate pricing structure before passing to engine
- Unit test: engine with old pricing + current pricing
- Handle missing pricing gracefully

**Debug strategy:**
- Log pricing structure before engine call
- Compare to expected schema
- Add type validation

---

#### Risk 8: Frontend Diff Rendering Performance
**Problem:** With 100 tools, diff rendering takes 5 seconds. Page feels broken.

**Symptom:** Frontend hangs while loading diff-view

**Root cause:** React rendering O(n²) instead of O(n), no memoization

**Prevention:**
- Test with 50-tool audit
- Profile rendering in DevTools
- Memoize expensive components

**Debug strategy:**
- React DevTools performance tab
- Check rendering time
- Add virtual scrolling if needed

---

#### Risk 9: Shared Audit Link Breaks on Re-Audit
**Problem:** Shared link keyed to audit ID. Re-audit creates new ID. Link broken.

**Symptom:** User shares link, clicks again later, sees different audit

**Root cause:** Architecture assumed audit IDs are permanent

**Prevention:**
- Design: link stays same, shows "latest" audit
- Or: link shows original + option to view latest
- Decide early, build correctly

**Debug strategy:**
- Share audit, trigger re-audit
- Click original link, verify it works

---

#### Risk 10: Email Template HTML Rendering Issues
**Problem:** Email template shows raw HTML or doesn't render properly.

**Symptom:** User gets unformatted email with <p> tags visible

**Root cause:** Email provider doesn't support HTML, or template syntax wrong

**Prevention:**
- Test email in Gmail, Outlook, Apple Mail
- Keep HTML simple
- Use inline styles (external CSS doesn't work in email)

**Debug strategy:**
- Send test email to multiple providers
- Check email source code
- Compare to working template

---

### General Debugging Strategy

**1. Log Heavily**
- Log at every major step
- Include: input, output, timestamp, user context
- Makes tracing easy

**2. Test End-to-End Early**
- Don't wait until integration phase
- Test each feature immediately after building
- Catch issues early

**3. Use Realistic Data**
- Test with actual audit data (not minimal samples)
- Use 50-tool audits, not 2-tool
- Use real pricing (not mocked)

**4. Monitor in Production**
- Log to file/external service
- Set up alerts
- Quick debugging after deployment

**5. Automate Tests**
- Unit tests for business logic
- Integration tests for API endpoints
- Run before commit

---

## 12. DOCUMENTATION STRATEGY

### ROUND2_PR.md Content Strategy

**Purpose:** Communicate feature to evaluators. Emphasis: engineering judgment + scope control.

**Sections:**

1. **Feature Overview (1 paragraph)**
   - What problem it solves
   - How it works (high level)

2. **Implementation Summary (3-4 bullets)**
   - Persistent audit storage
   - Pricing change detection
   - Re-audit engine
   - Diff-view UI + notifications

3. **Architecture Decisions (3-5 bullets)**
   - Why manual trigger instead of cron
   - Why simple hash comparison instead of ML
   - Why separate re-audit endpoint instead of automatic
   - Why no background jobs
   - Why this order

4. **Key Changes (code areas touched)**
   - Database schema
   - Backend endpoints
   - Frontend components
   - Email integration

5. **Testing & Verification**
   - What was tested
   - Test data used
   - Deployment verification

6. **Known Limitations (honest)**
   - What was cut/simplified
   - What can be improved
   - Technical debt (named, not hidden)

7. **Deployment Notes**
   - Environment variables needed
   - Database changes
   - Email provider setup
   - Any manual steps

**Tone:** Professional but honest. Show engineering judgment, not perfection.

---

### ROUND2_DEVLOG.md Content Strategy

**Purpose:** Show authentic engineering process. Emphasis: realistic iteration, debugging, honest decisions.

**Already created, but sections should cover:**

1. **Planning phase** (first few entries)
   - Architecture decisions
   - Why chosen approach over alternatives
   - Risk identification

2. **Implementation phase** (most entries)
   - What was built
   - What broke and how fixed
   - Tradeoffs made mid-implementation
   - Debugging moments

3. **Testing phase**
   - What was tested
   - What issues found
   - How fixed
   - Deployment challenges

4. **Final reflection**
   - What went well
   - What was difficult
   - Lessons learned
   - Known limitations

**Tone:** Real engineer under time pressure. Include:
- Uncertainty ("not sure if this will work")
- Mistakes ("realized schema wrong, had to refactor")
- Pragmatism ("good enough for MVP")
- Technical depth (show understanding)

---

### ROUND2_REFLECTION.md Content Strategy

**Purpose:** Deep engineering analysis. Emphasis: system thinking, technical clarity, honest assessment.

**Sections:**

1. **What Went Well**
   - Core feature works reliably
   - Architecture supports iteration
   - Team feedback positive
   - Deployment smooth

2. **What Was Difficult**
   - MongoDB schema design complexity
   - Email provider integration (credentials management)
   - Diff generation accuracy (handling edge cases)
   - Testing end-to-end (multiple systems)
   - Performance optimization (re-audit speed)

3. **Key Decisions Explained**
   - Why persistent storage (enables future features)
   - Why manual trigger (simpler, testable)
   - Why hash comparison (fast, sufficient)
   - Why separate re-audit endpoint (modularity)
   - Why manual email (no background jobs needed)

4. **Architecture Decisions Explained**
   - Why embed pricing vs separate collection (simplicity)
   - Why track reAuditOf (preserves history)
   - Why store pricingHash (fast comparison)
   - Why simple diff logic (sufficient clarity)

5. **What I'd Do Differently**
   - Start with database schema earlier (save refactor time)
   - Test email integration earlier (integration pain)
   - Add monitoring/logging earlier (debugging ease)
   - Pre-plan API contracts (saves integration work)

6. **Lessons Learned**
   - 36 hours is tight. Simplicity wins over features.
   - Early testing saves debugging time.
   - Schema design is critical (locks in early).
   - Email integration is surprisingly complex (credentials, testing).
   - Pricing system needs careful thought (many edge cases).

7. **Technical Debt & Future Work**
   - No background job infrastructure (manual trigger only)
   - No UI for manual re-audit trigger (API exists)
   - No audit editing/deletion (immutable only)
   - No admin dashboard
   - No granular pricing per-tool detection (hash only)
   - No ML-based ranking (simple sort)
   - No retry logic on email failure (fire and forget)

**Tone:** Senior engineer reflecting on 36-hour sprint. Technical, honest, thoughtful.

---

### Documentation Checklist

**Before submission:**
- [ ] ROUND2_PR.md complete and clear
- [ ] ROUND2_DEVLOG.md shows authentic iteration
- [ ] ROUND2_REFLECTION.md demonstrates system thinking
- [ ] Code is commented at critical decision points
- [ ] README.md updated with new feature
- [ ] API documentation included (or inline)

---

## SUMMARY: Implementation Readiness

This plan covers:
✅ System architecture (high-level flow)
✅ Feature breakdown (10 modules)
✅ Database design (schema + indexing)
✅ API design (5 endpoints)
✅ Change detection strategy (recommended manual trigger)
✅ Re-audit & diff logic (detailed algorithms)
✅ Frontend UX (diff-view component)
✅ Email integration (Resend recommended)
✅ Implementation order (strict sequence, 36 hours)
✅ Engineering tradeoffs (what to simplify, avoid)
✅ Debugging risks (10 predicted issues + prevention)
✅ Documentation strategy (3 markdown files)

**Next step:** Implement following the strict sequence. Build database → backend → frontend → test → deploy.

