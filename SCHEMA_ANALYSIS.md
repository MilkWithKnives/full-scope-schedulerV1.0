# SvelteRoster Schema & Workflow Analysis

## 📋 Current State Analysis

### ✅ What's Working Well

1. **Core Models Are Solid**
   - Organization → User → Shift relationships are correct
   - Time tracking (TimeEntry) is properly structured
   - Shift swap system is well-designed
   - Time off requests are properly implemented

2. **Good Security Practices**
   - Cascade deletes configured correctly
   - Unique constraints on critical fields (email, availability per day)
   - Role-based access with enum

3. **Basic Availability System**
   - Tracks day of week and time ranges
   - Supports recurring weekly patterns

### ⚠️ Issues & Missing Fields

#### 1. **Signup Workflow Issues**

**Current Flow:**
- Single-step signup
- Creates organization + owner user
- Redirects to login (user has to log in again!)
- No onboarding process
- No initial setup wizard

**Problems:**
- User creates account but doesn't get logged in automatically
- No guided setup for first location, roles, etc.
- No email verification
- Missing phone number field (needed for SMS notifications)
- Missing timezone field (critical for multi-location businesses)

#### 2. **Schema Missing Fields**

##### **User Model**
Missing:
- `phone` - Phone number for SMS notifications and 2FA
- `phoneVerified` - Phone verification status
- `emailVerified` - Email verification status
- `timezone` - User's timezone (for availability display)
- `profilePicture` - Profile image URL
- `emergencyContactName` - Emergency contact information
- `emergencyContactPhone` - Emergency contact phone
- `hireDate` - Employment start date
- `position` - Job title/position
- `skills` - Array of skills/certifications
- `preferredLocations` - Locations they prefer to work at
- `maxHoursPerWeek` - Maximum hours willing to work
- `notificationPreferences` - JSON of notification settings

##### **Organization Model**
Missing:
- `timezone` - Organization default timezone
- `settings` - JSON of organization-wide settings
- `stripeCustomerId` - For billing
- `subscriptionStatus` - Active/Cancelled/Trial
- `subscriptionEndsAt` - Subscription end date
- `maxEmployees` - Plan limit
- `features` - JSON of enabled features
- `logoUrl` - Organization logo
- `onboardingCompleted` - Whether setup wizard is done

##### **Location Model**
Missing:
- `timezone` - Location-specific timezone
- `phone` - Location contact number
- `manager` - Manager user ID for this location
- `isActive` - Whether location is currently operational
- `settings` - JSON of location-specific settings (geofence radius, etc.)

##### **Availability Model Issues**
Current Issues:
- ✅ Has recurring pattern support
- ✅ Has day of week
- ❌ Only allows ONE time range per day (too restrictive!)
- ❌ No custom time input (stuck with 4 preset slots)
- ❌ No break times
- ❌ No "blackout dates" (dates they CANNOT work)
- ❌ No "preferred" vs "available" distinction

**Should Support:**
- Multiple time ranges per day (e.g., 9-12 AND 2-5)
- Custom start/end times
- Unavailable dates (vacation, appointments)
- Preferred vs available (willing vs prefer)

##### **Shift Model**
Missing:
- `color` - For visual distinction in calendar
- `isRecurring` - Whether shift repeats weekly
- `recurringPattern` - JSON of recurrence rules
- `requiredSkills` - Skills needed for shift
- `actualStartTime` - Actual clock-in time (vs scheduled)
- `actualEndTime` - Actual clock-out time

##### **New Models Needed**

1. **Notification Model**
```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  type      String   // shift_assigned, shift_changed, swap_requested, etc.
  title     String
  message   String
  read      Boolean  @default(false)
  actionUrl String?
  createdAt DateTime @default(now())
}
```

2. **AuditLog Model** (for compliance)
```prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  action    String   // shift_created, user_deleted, etc.
  details   Json
  ipAddress String?
  createdAt DateTime @default(now())
}
```

3. **Skill Model**
```prisma
model Skill {
  id          String   @id @default(cuid())
  name        String
  description String?
  category    String?  // certification, language, equipment, etc.
  users       User[]   @relation("UserSkills")
}
```

4. **UnavailableDate Model** (blackout dates)
```prisma
model UnavailableDate {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  date      DateTime
  reason    String?
  createdAt DateTime @default(now())
}
```

#### 3. **Availability UI Issues**

**Current Problems:**
- ❌ Limited to 4 preset time slots (not flexible)
- ❌ Can't input custom times
- ❌ Can't set multiple ranges per day
- ❌ No visual timeline/calendar view
- ❌ Doesn't show existing schedule for context
- ❌ No drag-and-drop interface
- ❌ Requires page reload after each change
- ❌ No bulk operations (copy Monday to all weekdays, etc.)

**What Users Need:**
- ✅ Custom time input (e.g., 9:37 AM - 2:15 PM)
- ✅ Multiple time blocks per day
- ✅ Visual timeline view
- ✅ Drag to extend/shrink time blocks
- ✅ Copy availability to multiple days
- ✅ Calendar view to mark unavailable dates
- ✅ See their actual scheduled shifts alongside availability
- ✅ "Preferred hours" vs "Available hours"

## 🎯 Recommended Action Plan

### Phase 1: Critical Schema Updates (Do This First!)

1. **Update User model** - Add phone, timezone, verification fields
2. **Update Organization model** - Add timezone, onboarding, billing fields
3. **Fix Availability model** - Remove unique constraint, allow multiple per day
4. **Add UnavailableDate model** - For blackout dates
5. **Add Notification model** - For in-app notifications

### Phase 2: Improved Signup Flow

Create multi-step onboarding:
1. **Step 1**: Account creation (email, password, name)
2. **Step 2**: Organization details (name, timezone, industry)
3. **Step 3**: First location setup
4. **Step 4**: Set owner's phone & preferences
5. **Step 5**: Skip or invite team members
6. **Complete**: Auto-login + redirect to dashboard

### Phase 3: Modern Availability UI

Build a new availability interface with:
- Weekly calendar view with timeline
- Click and drag to create time blocks
- Custom time picker (not just presets)
- Multiple blocks per day
- Copy to other days
- Visual conflict detection
- Month view to mark blackout dates

### Phase 4: Nice-to-Have Enhancements

- Skill tracking system
- Audit logging
- Advanced notifications
- Recurring shift templates
- Labor cost forecasting

## 🚨 Breaking Changes Warning

Removing the unique constraint on `Availability` is a **breaking change**:

```prisma
// Current (WRONG):
@@unique([userId, dayOfWeek])

// Should be (CORRECT):
// No unique constraint, allow multiple per day per user
```

**Migration Plan:**
1. Create new migration
2. Drop unique constraint
3. Optionally: consolidate existing overlapping slots
4. Update UI to support multiple entries

## 📝 Next Steps

1. **Confirm schema changes** with you
2. **Create migration file**
3. **Update signup flow** with wizard
4. **Build new availability UI** with calendar
5. **Test thoroughly** with real data
6. **Deploy** to production

---

**Priority Order:**
1. 🔴 HIGH: Schema fixes (especially Availability)
2. 🟡 MEDIUM: Signup workflow improvement
3. 🟢 LOW: Availability UI redesign (can work with current schema)

Do you want me to proceed with implementing these changes?
