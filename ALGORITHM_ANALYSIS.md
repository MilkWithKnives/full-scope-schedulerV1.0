# 🤖 Scheduling Algorithm Analysis & Missing Fields

## 📊 Algorithm Overview

Your scheduler uses a **constraint-based scoring system** that evaluates each employee for each unassigned shift and assigns a score from 0-100.

### Current Algorithm Constraints

The algorithm checks these factors (from `scheduler.ts`):

1. **Availability Match** (Lines 270-293)
   - ✅ DB Has: `Availability.dayOfWeek`, `startTime`, `endTime`
   - Checks if employee is available on that day
   - Checks if shift time falls within availability window

2. **Shift Conflicts** (Lines 296-310)
   - ✅ DB Has: Existing shifts via `User.shifts`
   - Detects overlapping shifts
   - Checks minimum rest hours between shifts (default: 8 hours)

3. **Weekly Hour Limits** (Lines 313-325)
   - ✅ DB Has: Can calculate from shifts
   - ❌ DB Missing: `User.maxHoursPerWeek` (uses hardcoded 40)
   - Warns if assignment would exceed max hours

4. **Consecutive Days** (Lines 328-332)
   - ✅ DB Has: Can calculate from shifts
   - ❌ DB Missing: `User.maxConsecutiveDays` preference
   - Default: 6 consecutive days max

5. **Preferred Location** (Lines 335-338)
   - ❌ DB Missing: `User.preferredLocationId`
   - Algorithm references it but field doesn't exist!
   - Gives 15-18 point bonus for location match

6. **Cost Optimization** (Lines 341-348)
   - ✅ DB Has: `User.defaultHourlyRate`
   - Prefers lower-cost employees when enabled

7. **Fair Distribution** (Lines 351-358)
   - ✅ DB Has: Can calculate from shifts
   - Penalizes if employee already has many shifts
   - Bonus for under-scheduled employees

## 🚨 **CRITICAL MISSING FIELDS**

### User Model - Missing Fields

```prisma
model User {
  // EXISTING FIELDS...

  // ❌ MISSING - Referenced by algorithm but doesn't exist:
  preferredLocationId  String?  // Preferred location to work at
  maxHoursPerWeek      Int?     // Already added! ✅

  // ❌ MISSING - Needed for better scheduling:
  minHoursPerWeek      Int?     // Minimum hours they want
  preferredShiftTypes  String[] // Morning, afternoon, evening, overnight
  skills               String[] // Required skills/certifications
  seniority            Int?     // Years of experience (for priority)
  isFullTime           Boolean  @default(false)

  // ❌ MISSING - For constraint preferences:
  maxConsecutiveDays   Int?     @default(6)
  minRestHours         Int?     @default(8)

  // ❌ MISSING - For better UX:
  notificationPrefs    Json?    // Email/SMS notification preferences
  language             String?  @default("en")
}
```

### Shift Model - Missing Fields

```prisma
model Shift {
  // EXISTING FIELDS...

  // ❌ MISSING - For better scheduling:
  requiredSkills       String[]  // Skills needed for this shift
  minSeniority         Int?      // Minimum experience required
  priority             Int?      @default(0) // High-priority shifts
  shiftType            String?   // Morning/Afternoon/Evening/Overnight
  maxEmployees         Int?      @default(1) // For multi-person shifts

  // ❌ MISSING - For scheduling patterns:
  isRecurring          Boolean   @default(false)
  recurringPattern     Json?     // Weekly pattern if recurring
  parentShiftId        String?   // Link to template/recurring shift
}
```

### SchedulingConstraints - NOT IN DATABASE!

Currently hardcoded in function parameters. Should be:

```prisma
model SchedulingPreferences {
  id                        String   @id @default(cuid())
  organizationId            String   @unique
  organization              Organization @relation(fields: [organizationId], references: [id])

  // Global constraints
  defaultMaxHoursPerWeek    Int      @default(40)
  defaultMaxConsecutiveDays Int      @default(6)
  defaultMinRestHours       Int      @default(8)

  // Algorithm settings
  preferredLocationWeight   Float    @default(1.2)
  costOptimizationEnabled   Boolean  @default(true)
  fairDistributionEnabled   Boolean  @default(true)

  // Auto-scheduling settings
  autoAssignEnabled         Boolean  @default(false)
  minScoreThreshold         Int      @default(60) // Don't auto-assign if score < 60

  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt
}
```

## 📋 What the Algorithm NEEDS vs What DB HAS

| Algorithm Needs | DB Has It? | Status |
|----------------|-----------|---------|
| **Employee Availability** |
| Day of week | ✅ Yes | Working |
| Time range | ✅ Yes | Working |
| Multiple blocks per day | ❌ No | JUST FIXED! ✅ |
| Preferred vs Available | ❌ No | Added `isPreferred` ✅ |
| Blackout dates | ❌ No | Added `UnavailableDate` ✅ |
| **Employee Constraints** |
| Preferred location | ❌ NO | CRITICAL! ⚠️ |
| Max hours per week | ✅ Yes | Just added! |
| Min hours per week | ❌ No | Not critical |
| Max consecutive days | ❌ No | Should add |
| Min rest hours | ❌ No | Should add |
| Shift type preferences | ❌ No | Nice to have |
| Skills/certifications | ❌ No | Important |
| **Shift Requirements** |
| Basic info | ✅ Yes | Working |
| Required skills | ❌ No | Should add |
| Min seniority | ❌ No | Should add |
| Priority level | ❌ No | Should add |
| Shift type | ❌ No | Should add |
| **Organization Settings** |
| Scheduling constraints | ❌ No | CRITICAL! ⚠️ |
| Algorithm tuning | ❌ No | Should add |

## 🎯 Priority Fixes (In Order)

### Priority 1: CRITICAL (Breaks Algorithm)
1. **Add `User.preferredLocationId`**
   - Algorithm line 335-338 references it but field doesn't exist
   - Causes runtime errors when location matching

2. **Add `SchedulingPreferences` model**
   - Currently all constraints are hardcoded
   - Managers can't customize algorithm behavior

### Priority 2: HIGH (Algorithm Works But Limited)
3. **Add `User.maxConsecutiveDays`**
   - Currently hardcoded to 6
   - Different employees have different stamina

4. **Add `User.minRestHours`**
   - Currently hardcoded to 8
   - Some employees need more rest

5. **Add `Shift.requiredSkills` & `User.skills`**
   - Can't match employees to specialized shifts
   - Important for restaurants with different stations

### Priority 3: MEDIUM (Nice to Have)
6. **Add shift type categorization**
   - Morning, Afternoon, Evening, Overnight
   - Some employees prefer certain shifts

7. **Add seniority/experience tracking**
   - For assigning important shifts to experienced staff

8. **Add `User.minHoursPerWeek`**
   - Help employees get enough hours
   - Fair scheduling warnings

## 🔧 Recommended Schema Updates

### Update 1: Fix Critical Fields

```prisma
model User {
  // Add this:
  preferredLocationId  String?
  preferredLocation    Location? @relation("PreferredLocation", fields: [preferredLocationId], references: [id])

  maxConsecutiveDays   Int?      @default(6)
  minRestHours         Int?      @default(8)
  minHoursPerWeek      Int?

  skills               String[]  @default([])
  shiftTypePreferences String[]  @default([]) // ["morning", "afternoon", "evening"]
}
```

### Update 2: Add Organization Preferences

```prisma
model SchedulingPreferences {
  id                        String       @id @default(cuid())
  organizationId            String       @unique
  organization              Organization @relation(fields: [organizationId], references: [id])

  defaultMaxHoursPerWeek    Int          @default(40)
  defaultMaxConsecutiveDays Int          @default(6)
  defaultMinRestHours       Int          @default(8)

  preferredLocationWeight   Float        @default(1.2)
  costOptimizationEnabled   Boolean      @default(true)
  minScoreThreshold         Int          @default(60)

  createdAt                 DateTime     @default(now())
  updatedAt                 DateTime     @updatedAt
}
```

### Update 3: Enhance Shifts

```prisma
model Shift {
  // Add this:
  requiredSkills    String[]  @default([])
  shiftType         String?   // morning/afternoon/evening/overnight
  priority          Int       @default(0) // 0-10, higher = more important
  minSeniority      Int?      // Minimum years of experience
}
```

## 📱 UI Updates Needed

Once schema is updated, these UIs need changes:

1. **Employee Profile**
   - Add preferred location selector
   - Add skills/certifications multi-select
   - Add shift type preferences (checkboxes)
   - Add personal constraints (max consecutive days, min rest)

2. **Auto-Schedule Modal** (`AutoScheduleModal.svelte`)
   - Add organization scheduling preferences UI
   - Allow managers to tune algorithm parameters
   - Show/edit default constraints

3. **Shift Creation**
   - Add required skills selector
   - Add shift type dropdown
   - Add priority slider (0-10)
   - Add min seniority requirement

4. **Availability UI** (Already on TODO!)
   - Support multiple time blocks per day ✅ (Schema fixed!)
   - Add "preferred" vs "available" toggle
   - Visual calendar for blackout dates

## ⚠️ Breaking Changes Warning

Adding `preferredLocationId` requires:
1. Migration to add column
2. Update algorithm to handle null values gracefully
3. UI to let users select preferred location

But it WON'T break existing data - just needs careful migration.

## 🚀 Next Steps

Would you like me to:
1. **Add the critical missing fields** (`preferredLocationId`, `SchedulingPreferences`)?
2. **Update the algorithm** to handle new fields?
3. **Update the UIs** to collect this data?
4. **Create migrations** for all schema changes?

Let me know which to tackle first!
