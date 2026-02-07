---
description: "BoxRiders Feature Implementation Tasks"
feature: "BoxRiders - Rider Management System"
version: "1.0"
last_updated: "2025-01-10"
---

# Tasks: BoxRiders - Comprehensive Rider Management

**Input**: `BOXRIDERS_FEATURES_IMPLEMENTATION.md`, `BOXRIDERS_FEATURES_SUMMARY.md`, `riders.md`
**Prerequisites**: Convex backend, Clerk authentication, existing orders system
**Platform**: BoxConv (Web) + BoxKuBoxApp (Mobile)

## Format: `[ID] [P?] [Platform] [Priority] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Platform]**: WEB (BoxConv), MOBILE (BoxKuBoxApp), BACKEND (Convex), SHARED
- **[Priority]**: 🔴 Critical, 🟡 Medium, 🟢 Low
- Include exact file paths in descriptions

---

## Phase 0: Database Schema & Backend Foundation

**Goal**: Extend Convex schema and create foundational backend infrastructure
**Duration**: 3-5 days
**Prerequisites**: None - can start immediately
**Blocks**: All other phases

### Schema Extensions

- [ ] BR001 [P] [BACKEND] 🔴 Extend `convex/schema.ts` - Add `riders` table with full profile fields
  - Fields: clerkId, riderCode, status, available, lastOnlineAt
  - Contact: phoneNumber, nextOfKinName, nextOfKinPhone
  - Compliance: nationalId, drivingPermitNumber, tin, helmetVerified, licenseExpiry, insuranceExpiry
  - Vehicle: vehicleType, vehiclePlate, vehicleMake, vehicleColor
  - Geography: pointLocation, district, subCounty, parish, village
  - Payout: preferredPayoutMethod, mobileMoneyNumber, bankAccountNumber, bankName
  - Performance: ratingSum, ratingCount, completedDeliveries, canceledDeliveries
  - Metadata: createdAt, updatedAt, organizationId
  - Indexes: by_clerk_id, by_rider_code, by_organization, by_status, by_phone

- [ ] BR002 [P] [BACKEND] 🟡 Extend `convex/schema.ts` - Add `stages` table for hub management
  - Fields: name, organizationId, location (lat/lng), address, district, isActive, capacity, createdAt
  - Index: by_organization

- [ ] BR003 [P] [BACKEND] 🟡 Extend `convex/schema.ts` - Add `riderStageMemberships` table for stage history
  - Fields: riderId, stageId, isActive, joinedAt, leftAt
  - Indexes: by_rider, by_stage, by_rider_active

- [ ] BR004 [P] [BACKEND] 🔴 Extend `convex/schema.ts` - Add `riderRatings` table for customer ratings
  - Fields: riderId, orderId, customerClerkId, rating (1-5), comment, createdAt
  - Indexes: by_rider, by_order, by_customer

- [ ] BR005 [P] [BACKEND] 🟡 Extend `convex/schema.ts` - Add `riderPayouts` table for payment tracking
  - Fields: riderId, amount, currency, method, status, period (start/end), processedAt, reference
  - Indexes: by_rider, by_status, by_period

- [ ] BR006 [P] [BACKEND] 🟢 Extend `convex/schema.ts` - Add `riderDocuments` table for compliance files
  - Fields: riderId, documentType, fileUrl, verificationStatus, uploadedAt, verifiedAt, expiresAt
  - Index: by_rider, by_type

### Helper Functions & Utilities

- [ ] BR007 [P] [BACKEND] 🔴 Create `convex/lib/riderUtils.ts` - Rider code generation utility
  - Function: `generateRiderCode()` - Generate unique codes like "RDR-001234"
  - Function: `isRiderCodeUnique(code)` - Check uniqueness

- [ ] BR008 [P] [BACKEND] 🔴 Create `convex/lib/phoneUtils.ts` - Phone number normalization
  - Function: `normalizeUgandaPhone(phone)` - Convert to +256 format
  - Function: `validatePhoneNumber(phone)` - Validation

- [ ] BR009 [P] [BACKEND] 🟡 Create `convex/lib/geographyUtils.ts` - Geographic hierarchy helpers
  - Function: `parseGeographicLocation(lat, lng)` - Reverse geocode to district/sub-county/parish
  - Function: `validateGeography(data)` - Validate geographic data

- [ ] BR010 [P] [BACKEND] 🟡 Create `convex/lib/performanceUtils.ts` - Performance calculation helpers
  - Function: `calculateAverageRating(ratingSum, ratingCount)` - Compute average
  - Function: `calculateAcceptanceRate(accepted, total)` - Acceptance percentage
  - Function: `calculateOnTimeRate(onTime, total)` - On-time percentage

**Checkpoint**: Schema ready, utility functions available - rider management can begin

---

## Phase 1: Rider Registration & Profile Management

**Goal**: Enable rider onboarding and profile management
**Duration**: 5-7 days
**Prerequisites**: Phase 0 complete
**Priority**: 🔴 Critical

### Backend - Registration & CRUD

- [ ] BR011 [BACKEND] 🔴 Create `convex/riders/registration.ts` - Rider registration mutation
  - Input: clerkId, phoneNumber, vehicleType, organizationId, basicProfile
  - Generate rider code automatically
  - Normalize phone to +256 format
  - Set status to "inactive" (pending approval)
  - Return riderId and riderCode

- [ ] BR012 [BACKEND] 🔴 Create `convex/riders/queries.ts` - Rider profile queries
  - Query: `getRiderProfile(clerkId)` - Get full rider profile
  - Query: `getRiderByCode(riderCode)` - Get rider by code
  - Query: `getRidersByOrganization(organizationId, filters)` - List riders with filters
  - Query: `searchRiders(organizationId, searchTerm)` - Search by name, code, phone

- [ ] BR013 [BACKEND] 🔴 Create `convex/riders/mutations.ts` - Rider profile mutations
  - Mutation: `updateRiderProfile(riderId, profileData)` - Update basic profile
  - Mutation: `updateRiderCompliance(riderId, complianceData)` - Update compliance fields
  - Mutation: `updateRiderVehicle(riderId, vehicleData)` - Update vehicle info
  - Mutation: `updateRiderPayout(riderId, payoutData)` - Update payout preferences

- [ ] BR014 [BACKEND] 🔴 Create `convex/riders/approval.ts` - Rider approval workflow
  - Mutation: `approveRider(riderId, approvedBy)` - Change status to "active"
  - Mutation: `suspendRider(riderId, reason, suspendedBy)` - Suspend rider
  - Mutation: `reactivateRider(riderId, reactivatedBy)` - Reactivate suspended rider
  - Query: `getPendingApprovals(organizationId)` - List riders awaiting approval

### Backend - Next of Kin & Emergency Contacts

- [ ] BR015 [P] [BACKEND] 🔴 Create `convex/riders/emergency.ts` - Emergency contact management
  - Mutation: `updateNextOfKin(riderId, name, phone)` - Update emergency contact
  - Query: `getEmergencyContact(riderId)` - Get emergency contact details

### Web UI - Admin Registration & Management

- [ ] BR016 [WEB] 🔴 Create `src/components/rider/RiderRegistrationForm.tsx` - Multi-step registration
  - Step 1: Basic Info (name, phone, organization)
  - Step 2: Vehicle Details (type, plate, make, color)
  - Step 3: Compliance (NIN, permit, TIN)
  - Step 4: Emergency Contact (next of kin)
  - Step 5: Payout Preferences (method, details)
  - Auto-generate and display rider code
  - Form validation for each step
  - Submit to `convex/riders/registration.ts`

- [ ] BR017 [WEB] 🔴 Create `src/components/rider/RiderProfileView.tsx` - Display rider profile
  - Show all profile sections (identity, vehicle, compliance, performance)
  - Display rider code prominently
  - Show status badge (active/inactive/suspended)
  - Show availability indicator (online/offline/busy)
  - Display performance metrics (rating, deliveries)

- [ ] BR018 [WEB] 🔴 Create `src/components/rider/RiderProfileEdit.tsx` - Edit rider profile
  - Separate sections for different profile categories
  - Validation for phone numbers (+256 format)
  - Validation for compliance fields
  - Save changes to `convex/riders/mutations.ts`

- [ ] BR019 [WEB] 🔴 Create `src/components/rider/RidersList.tsx` - Searchable rider list
  - Table/grid view with pagination
  - Search by name, code, phone
  - Filter by status, availability, stage, vehicle type
  - Sort by rating, deliveries, earnings
  - Quick actions: view, edit, approve, suspend

- [ ] BR020 [WEB] 🔴 Create `src/components/rider/RiderApprovalQueue.tsx` - Pending approvals view
  - List riders with status "inactive"
  - Show profile summary for quick review
  - Bulk approval actions
  - Approval/rejection with notes

### Web UI - Admin Routes

- [ ] BR021 [WEB] 🔴 Create `src/routes/_authed/_admin/a/riders/index.tsx` - Riders list page
  - Use RidersList component
  - Add filters and search
  - Export to CSV functionality

- [ ] BR022 [WEB] 🔴 Create `src/routes/_authed/_admin/a/riders/new.tsx` - New rider registration page
  - Use RiderRegistrationForm component
  - Success redirect to rider profile

- [ ] BR023 [WEB] 🔴 Create `src/routes/_authed/_admin/a/riders/$riderId.tsx` - Rider detail page
  - Use RiderProfileView component
  - Edit mode toggle
  - Tabs: Profile, Performance, Deliveries, Documents, Payouts

- [ ] BR024 [WEB] 🔴 Create `src/routes/_authed/_admin/a/riders/approvals.tsx` - Approval queue page
  - Use RiderApprovalQueue component
  - Approval workflow

### Mobile UI - Rider Profile

- [ ] BR025 [MOBILE] 🟡 Create `app/(all)/(rider)/profile/index.tsx` - Rider profile screen
  - Display profile information
  - Edit profile button
  - View performance stats
  - View earnings summary

- [ ] BR026 [MOBILE] 🟡 Create `app/(all)/(rider)/profile/edit.tsx` - Edit profile screen
  - Form for basic info
  - Vehicle details
  - Emergency contact
  - Payout preferences

**Checkpoint**: Riders can be registered, approved, and managed through admin panel

---

## Phase 2: Compliance & Document Management

**Goal**: Track Uganda-specific compliance requirements
**Duration**: 5-7 days
**Prerequisites**: Phase 1 complete
**Priority**: 🔴 Critical

### Backend - Compliance

- [ ] BR027 [BACKEND] 🔴 Create `convex/riders/compliance.ts` - Compliance management
  - Mutation: `updateComplianceFields(riderId, fields)` - Update NIN, permit, TIN, etc.
  - Mutation: `verifyHelmet(riderId, verifiedBy, photoUrl)` - Mark helmet verified
  - Query: `getComplianceStatus(riderId)` - Get compliance overview
  - Query: `getExpiringSoon(organizationId, days)` - List riders with expiring licenses/insurance
  - Query: `getNonCompliantRiders(organizationId)` - List riders missing compliance

- [ ] BR028 [BACKEND] 🟡 Create `convex/riders/documents.ts` - Document management
  - Mutation: `uploadDocument(riderId, documentType, fileUrl)` - Upload compliance document
  - Mutation: `verifyDocument(documentId, verifiedBy, status)` - Verify document
  - Query: `getRiderDocuments(riderId)` - Get all documents for rider
  - Document types: NIN_CARD, DRIVING_PERMIT, INSURANCE, HELMET_PHOTO, VEHICLE_PHOTO

### Backend - Scheduled Jobs

- [ ] BR029 [BACKEND] 🟡 Create `convex/scheduledJobs/riderCompliance.ts` - Compliance monitoring
  - Job: Check for expiring licenses (30 days, 7 days, 1 day warnings)
  - Job: Check for expiring insurance
  - Send notifications to riders and admins
  - Update rider compliance status

### Web UI - Compliance Management

- [ ] BR030 [WEB] 🔴 Create `src/components/rider/ComplianceDocumentsUpload.tsx` - Document upload
  - File upload for each document type
  - Preview uploaded documents
  - Verification status badges
  - Integration with Cloudflare R2 storage

- [ ] BR031 [WEB] 🟡 Create `src/components/rider/ComplianceDashboard.tsx` - Compliance overview
  - Show compliance percentage per rider
  - Filter by compliant/non-compliant
  - Expiry alerts section
  - Quick verification actions

- [ ] BR032 [WEB] 🟡 Create `src/routes/_authed/_admin/a/riders/compliance.tsx` - Compliance page
  - Use ComplianceDashboard component
  - Compliance reports
  - Bulk reminder sending

### Mobile UI - Document Upload

- [ ] BR033 [MOBILE] 🔴 Create `app/(all)/(rider)/documents/index.tsx` - Documents screen
  - List all required documents
  - Upload status for each
  - Camera integration for photos
  - Document viewer

- [ ] BR034 [MOBILE] 🔴 Create `app/(all)/(rider)/documents/upload.tsx` - Document upload screen
  - Camera capture for ID/permit/helmet
  - Photo library selection
  - Document type selection
  - Upload progress

**Checkpoint**: Compliance tracking and document management functional

---

## Phase 3: Stage/Hub Management

**Goal**: Organize riders by gathering points
**Duration**: 5-7 days
**Prerequisites**: Phase 1 complete
**Priority**: 🟡 Medium

### Backend - Stage Management

- [ ] BR035 [BACKEND] 🟡 Create `convex/stages/mutations.ts` - Stage CRUD operations
  - Mutation: `createStage(organizationId, name, location, address)` - Create stage
  - Mutation: `updateStage(stageId, data)` - Update stage details
  - Mutation: `deactivateStage(stageId)` - Deactivate stage
  - Mutation: `assignRiderToStage(riderId, stageId)` - Assign rider (deactivates previous)
  - Mutation: `removeRiderFromStage(riderId)` - Remove from current stage

- [ ] BR036 [BACKEND] 🟡 Create `convex/stages/queries.ts` - Stage queries
  - Query: `getStagesByOrganization(organizationId)` - List all stages
  - Query: `getStageDetails(stageId)` - Get stage with rider count
  - Query: `getRidersByStage(stageId)` - List riders at stage
  - Query: `getRiderStageHistory(riderId)` - Get stage membership history
  - Query: `getStageCapacityAnalytics(stageId)` - Peak/idle hours analysis

### Web UI - Stage Management

- [ ] BR037 [WEB] 🟡 Create `src/components/stages/StageForm.tsx` - Create/edit stage form
  - Name, address input
  - Map picker for location (lat/lng)
  - District selection
  - Capacity limit
  - Active/inactive toggle

- [ ] BR038 [WEB] 🟡 Create `src/components/stages/StagesList.tsx` - List all stages
  - Table with stage name, location, rider count, capacity
  - Edit/deactivate actions
  - View riders at stage

- [ ] BR039 [WEB] 🟡 Create `src/components/stages/StageRidersView.tsx` - Riders at stage
  - List riders assigned to stage
  - Add/remove riders
  - Stage capacity indicator

- [ ] BR040 [WEB] 🟡 Create `src/routes/_authed/_admin/a/stages/index.tsx` - Stages management page
  - Use StagesList component
  - Create new stage button

- [ ] BR041 [WEB] 🟡 Create `src/routes/_authed/_admin/a/stages/$stageId.tsx` - Stage detail page
  - Stage info
  - Riders at stage
  - Analytics (peak hours, utilization)

### Mobile UI - Stage Selection

- [ ] BR042 [MOBILE] 🟡 Create `app/(all)/(rider)/profile/stage.tsx` - Select stage screen
  - List available stages
  - Show distance from current location
  - Current stage highlighted
  - Change stage action

**Checkpoint**: Stage management operational, riders can be assigned to stages

---

## Phase 4: Performance & Rating System

**Goal**: Track rider performance and customer satisfaction
**Duration**: 4-6 days
**Prerequisites**: Phase 1 complete, existing orders system
**Priority**: 🔴 Critical

### Backend - Ratings

- [ ] BR043 [BACKEND] 🔴 Create `convex/riders/ratings.ts` - Rating system
  - Mutation: `rateRider(orderId, riderId, customerClerkId, rating, comment)` - Submit rating
  - Mutation: `updateRiderRatingCounters(riderId)` - Update ratingSum and ratingCount
  - Query: `getRiderRatings(riderId, limit)` - Get rider ratings with pagination
  - Query: `getAverageRating(riderId)` - Calculate and return average rating

### Backend - Performance Metrics

- [ ] BR044 [BACKEND] 🔴 Create `convex/riders/performance.ts` - Performance tracking
  - Mutation: `incrementDeliveryCounter(riderId, type)` - Increment completed/canceled
  - Query: `getPerformanceMetrics(riderId)` - Get all metrics
  - Query: `getAcceptanceRate(riderId)` - Calculate acceptance rate
  - Query: `getOnTimeRate(riderId)` - Calculate on-time delivery rate
  - Query: `getLeaderboard(organizationId, metric, limit)` - Top riders by metric

### Backend - Update Order Workflow

- [ ] BR045 [BACKEND] 🔴 Update `convex/riders.ts` - Add rating after delivery
  - Modify `markDelivered` mutation to trigger rating request
  - Create notification for customer to rate rider

### Web UI - Performance Display

- [ ] BR046 [WEB] 🔴 Create `src/components/rider/RiderRatingDisplay.tsx` - Star rating component
  - Display average rating with stars
  - Show rating count
  - Link to view all ratings

- [ ] BR047 [WEB] 🟡 Create `src/components/rider/RiderPerformanceDashboard.tsx` - Performance stats
  - Rating chart over time
  - Completed vs canceled deliveries
  - Acceptance rate gauge
  - On-time delivery percentage
  - Earnings trends

- [ ] BR048 [WEB] 🟡 Create `src/components/rider/RiderLeaderboard.tsx` - Top riders display
  - Top 10 by rating
  - Top 10 by deliveries
  - Top 10 by earnings
  - Filters by time period

- [ ] BR049 [WEB] 🟡 Create `src/routes/_authed/_admin/a/riders/leaderboard.tsx` - Leaderboard page
  - Use RiderLeaderboard component
  - Multiple metric tabs

### Mobile UI - Performance Viewing

- [ ] BR050 [MOBILE] 🔴 Create `app/(all)/(rider)/performance/index.tsx` - Performance screen
  - Current rating display
  - Recent ratings list
  - Performance stats (acceptance, on-time)
  - Deliveries completed

- [ ] BR051 [MOBILE] 🟡 Create `components/rider/PerformanceStatsCard.tsx` - Stats card component
  - Reusable stats display
  - Icons for each metric

### Customer Rating UI

- [ ] BR052 [MOBILE] 🔴 Create `app/(all)/(grocery)/order/[orderId]/rate-rider.tsx` - Rate rider screen
  - Star rating input
  - Optional comment
  - Submit rating
  - Thank you confirmation

**Checkpoint**: Riders can be rated, performance metrics tracked and displayed

---

## Phase 5: Payout & Earnings Management

**Goal**: Enable flexible payment processing
**Duration**: 10-14 days
**Prerequisites**: Phase 1 complete
**Priority**: 🔴 Critical

### Backend - Earnings Calculation

- [ ] BR053 [BACKEND] 🔴 Create `convex/riders/earnings.ts` - Earnings tracking
  - Query: `getEarningsSummary(riderId)` - Daily, weekly, monthly, all-time
  - Query: `getEarningsDetails(riderId, startDate, endDate)` - Detailed breakdown
  - Function: Calculate delivery earnings from completed orders
  - Include bonus, penalties, tips in calculation

### Backend - Payout Processing

- [ ] BR054 [BACKEND] 🟡 Create `convex/payouts/batch.ts` - Batch payout generation
  - Mutation: `createPayoutBatch(organizationId, period, riderIds)` - Create batch
  - Query: `getPayoutBatch(batchId)` - Get batch details
  - Query: `getPendingPayouts(organizationId)` - Unpaid earnings
  - Calculate total earnings per rider for period

- [ ] BR055 [BACKEND] 🟡 Create `convex/payouts/process.ts` - Payout processing
  - Mutation: `markPayoutProcessed(payoutId, reference)` - Mark as paid
  - Mutation: `cancelPayout(payoutId, reason)` - Cancel payout
  - Query: `getPayoutHistory(riderId)` - Rider's payout history

### Backend - Mobile Money Integration (Future)

- [ ] BR056 [BACKEND] 🟢 Create `convex/integrations/mobileMoney.ts` - Mobile money actions
  - Action: `sendMTNMoney(phone, amount)` - MTN integration placeholder
  - Action: `sendAirtelMoney(phone, amount)` - Airtel integration placeholder
  - Handle API responses and update payout status

### Web UI - Payout Management

- [ ] BR057 [WEB] 🟡 Create `src/components/payouts/PayoutMethodSelector.tsx` - Payment method form
  - Radio buttons for mobile_money, bank, cash, wallet
  - Conditional fields based on selection
  - Mobile money: phone number
  - Bank: account number, bank name, branch
  - Validation for each method

- [ ] BR058 [WEB] 🔴 Create `src/components/payouts/EarningsDashboard.tsx` - Earnings overview
  - Period selector (daily, weekly, monthly)
  - Total earnings display
  - Earnings chart
  - Breakdown by delivery type
  - Pending vs paid earnings

- [ ] BR059 [WEB] 🟡 Create `src/components/payouts/PayoutHistory.tsx` - Transaction history
  - Table of past payouts
  - Filter by status, method, date range
  - Export to CSV
  - Payout details modal

- [ ] BR060 [WEB] 🟡 Create `src/components/payouts/PayoutBatchManager.tsx` - Batch processing
  - Create new batch for period
  - Select riders for batch
  - Review batch totals
  - Process batch (mark as paid)
  - Export batch report

- [ ] BR061 [WEB] 🟡 Create `src/routes/_authed/_admin/a/payouts/index.tsx` - Payouts page
  - Pending payouts summary
  - Create batch button
  - Recent batches list

- [ ] BR062 [WEB] 🟡 Create `src/routes/_authed/_admin/a/payouts/batches/$batchId.tsx` - Batch detail page
  - Batch summary
  - Riders in batch
  - Process batch actions

### Mobile UI - Earnings Display

- [ ] BR063 [MOBILE] 🔴 Create `app/(all)/(rider)/earnings/index.tsx` - Earnings screen
  - Today's earnings prominent display
  - Week/month/all-time tabs
  - Earnings chart
  - Delivery count
  - Average per delivery

- [ ] BR064 [MOBILE] 🔴 Create `app/(all)/(rider)/earnings/history.tsx` - Earnings history
  - List of completed deliveries with earnings
  - Filter by date range
  - Total earnings summary

- [ ] BR065 [MOBILE] 🔴 Create `app/(all)/(rider)/earnings/payouts.tsx` - Payout history
  - List of received payouts
  - Payout method used
  - Status badges
  - Pending earnings display

- [ ] BR066 [MOBILE] 🔴 Create `components/rider/EarningsSummaryCard.tsx` - Earnings card component
  - Reusable earnings display
  - Period selector
  - Trend indicators

**Checkpoint**: Earnings calculated, payouts can be processed, riders can view earnings

---

## Phase 6: Enhanced Delivery Assignment & Auto-Assignment

**Goal**: Implement intelligent rider assignment
**Duration**: 7-10 days
**Prerequisites**: Phase 1 complete, existing delivery system
**Priority**: 🟡 Medium

### Backend - Auto-Assignment Algorithm

- [ ] BR067 [BACKEND] 🟡 Create `convex/assignment/scoring.ts` - Rider scoring algorithm
  - Function: `scoreRider(riderId, orderLocation, orderValue)` - Calculate score
  - Factor 1: Distance (40% weight) - Proximity to pickup
  - Factor 2: Availability (30% weight) - Online and not busy
  - Factor 3: Performance (20% weight) - Rating + acceptance rate
  - Factor 4: Compliance (10% weight) - Valid documents
  - Return scored riders sorted by score

- [ ] BR068 [BACKEND] 🟡 Create `convex/assignment/autoAssign.ts` - Auto-assignment logic
  - Mutation: `autoAssignOrder(orderId)` - Find and assign best rider
  - Use scoring algorithm
  - Consider vehicle type for order size
  - Avoid recently rejected riders
  - Send notification to assigned rider
  - Log assignment decision

- [ ] BR069 [BACKEND] 🟡 Update `convex/riders.ts` - Enhanced rider queries
  - Improve `findNearbyRiders` with geohash indexing
  - Add filters for compliance, performance threshold
  - Add vehicle type filtering

### Backend - Assignment Analytics

- [ ] BR070 [BACKEND] 🟢 Create `convex/analytics/assignments.ts` - Assignment analytics
  - Query: `getAssignmentSuccessRate()` - Auto vs manual success rates
  - Query: `getAverageAssignmentTime()` - Time to assign
  - Query: `getRejectionReasons()` - Why riders reject

### Web UI - Assignment Control

- [ ] BR071 [WEB] 🟡 Create `src/components/assignment/AutoAssignToggle.tsx` - Enable auto-assign
  - Toggle for organization/vendor
  - Configuration: max distance, min rating threshold
  - Fallback to manual option

- [ ] BR072 [WEB] 🟡 Create `src/components/assignment/AssignmentAnalytics.tsx` - Assignment metrics
  - Success rate charts
  - Average assignment time
  - Rejection analysis
  - Comparison: auto vs manual

**Checkpoint**: Auto-assignment working, analytics available

---

## Phase 7: Mobile Rider App - Core Delivery Workflow

**Goal**: Complete mobile delivery experience
**Duration**: 10-14 days
**Prerequisites**: Phase 1 complete, existing delivery system
**Priority**: 🔴 Critical

### Mobile UI - Dashboard

- [ ] BR073 [MOBILE] 🔴 Create `app/(all)/(rider)/index.tsx` - Rider dashboard screen
  - Status toggle (online/offline)
  - Today's stats (deliveries, earnings)
  - Active deliveries list
  - Pending assignments count
  - Quick actions menu

- [ ] BR074 [MOBILE] 🔴 Create `components/rider/RiderStatusToggle.tsx` - Online/offline toggle
  - Prominent switch component
  - Visual indicator (green dot when online)
  - Confirm dialog when going offline with active delivery
  - Update backend status

### Mobile UI - Assignment Management

- [ ] BR075 [MOBILE] 🔴 Create `app/(all)/(rider)/assignments/index.tsx` - Available assignments screen
  - List available orders
  - Distance from current location
  - Estimated earnings
  - Order details preview
  - Accept/reject buttons

- [ ] BR076 [MOBILE] 🔴 Create `app/(all)/(rider)/assignments/[orderId].tsx` - Assignment detail screen
  - Full order details
  - Store information
  - Customer delivery address
  - Items list
  - Estimated distance
  - Estimated earnings
  - Accept/reject actions with confirmation

- [ ] BR077 [MOBILE] 🔴 Create `components/rider/DeliveryCard.tsx` - Order card component
  - Compact order display
  - Store name, customer name
  - Distance, earnings
  - Status badge
  - Quick actions

### Mobile UI - Active Delivery

- [ ] BR078 [MOBILE] 🔴 Create `app/(all)/(rider)/active/index.tsx` - Current delivery screen
  - Order details
  - Pickup location (store)
  - Delivery location (customer)
  - Customer contact (call/message)
  - Store contact (call/message)
  - Navigation button
  - Mark picked up button
  - Mark delivered button

- [ ] BR079 [MOBILE] 🔴 Create `app/(all)/(rider)/active/navigate.tsx` - Navigation screen
  - Map view with route
  - Turn-by-turn directions
  - Integration with Google Maps/Apple Maps
  - Estimated time of arrival
  - Customer location marker

### Mobile UI - Delivery Actions

- [ ] BR080 [MOBILE] 🔴 Create `components/rider/AcceptRejectButtons.tsx` - Assignment action buttons
  - Accept button with confirmation
  - Reject button with reason selection
  - Loading states
  - Success/error feedback

- [ ] BR081 [MOBILE] 🔴 Create `components/rider/DeliveryActionButtons.tsx` - Delivery action buttons
  - Mark picked up button
  - Mark delivered button
  - Cancel delivery button (with reason)
  - Confirm dialogs

### Mobile UI - Proof of Delivery

- [ ] BR082 [MOBILE] 🟡 Create `app/(all)/(rider)/delivery/proof.tsx` - Proof of delivery screen
  - Camera integration
  - Photo capture of delivered items
  - Multiple photos support
  - Optional customer signature
  - Delivery notes input
  - Submit confirmation

- [ ] BR083 [MOBILE] 🟡 Create `components/rider/ProofOfDeliveryCamera.tsx` - Camera component
  - Expo Camera integration
  - Photo preview
  - Retake option
  - Gallery upload option

### Mobile UI - Communication

- [ ] BR084 [MOBILE] 🔴 Create `components/rider/CustomerContactButtons.tsx` - Contact buttons
  - Call customer button (tel: link)
  - Message customer button (future: in-app chat)
  - Call store button
  - Display phone numbers

### Mobile UI - Delivery History

- [ ] BR085 [MOBILE] 🔴 Create `app/(all)/(rider)/history/index.tsx` - Delivery history screen
  - List past deliveries
  - Filter by date range
  - Sort by date/earnings
  - Show status (delivered/canceled)
  - Earnings per delivery

- [ ] BR086 [MOBILE] 🔴 Create `app/(all)/(rider)/history/[orderId].tsx` - Delivery detail screen
  - Order details
  - Delivery timeline
  - Earnings breakdown
  - Customer rating (if rated)

**Checkpoint**: Riders can manage deliveries end-to-end on mobile

---

## Phase 8: Real-Time Features & Notifications

**Goal**: Live updates and push notifications
**Duration**: 4-6 days
**Prerequisites**: Phase 7 complete
**Priority**: 🔴 Critical

### Backend - Notification System

- [ ] BR087 [BACKEND] 🔴 Update `convex/notifications.ts` - Add rider notifications
  - Type: `assignment_received` - New delivery assigned
  - Type: `order_cancelled_by_customer` - Order canceled
  - Type: `earnings_processed` - Payout processed
  - Type: `document_expiring` - License/insurance expiring
  - Type: `performance_milestone` - Achievement unlocked

### Mobile - Background Services

- [ ] BR088 [MOBILE] 🔴 Create `services/locationService.ts` - Background location tracking
  - Expo Location background service
  - Update location every 30 seconds when online
  - Send to backend via `convex/riders/updateLocation`
  - Battery optimization
  - Stop when offline

- [ ] BR089 [MOBILE] 🔴 Create `services/notificationService.ts` - Push notification handler
  - Expo Notifications setup
  - Register device token
  - Handle notification received (foreground)
  - Handle notification tapped (background/killed)
  - Navigate to relevant screen

- [ ] BR090 [MOBILE] 🔴 Create `services/heartbeatService.ts` - Heartbeat system
  - Send heartbeat every 5 minutes when online
  - Update `lastOnlineAt` timestamp
  - Handle network errors gracefully

### Mobile - Real-Time Updates

- [ ] BR091 [MOBILE] 🔴 Update rider screens - Add Convex subscriptions
  - Dashboard: Subscribe to earnings, active deliveries
  - Assignments: Subscribe to available assignments
  - Active delivery: Subscribe to order status changes
  - Real-time data sync

### Mobile - Notification Handling

- [ ] BR092 [MOBILE] 🔴 Create `app/(all)/(rider)/notifications/index.tsx` - Notifications screen
  - List all notifications
  - Mark as read
  - Group by type
  - Clear all action

**Checkpoint**: Real-time updates working, push notifications functional

---

## Phase 9: Admin Operations & Analytics

**Goal**: Comprehensive platform management
**Duration**: 10-14 days
**Prerequisites**: All previous phases
**Priority**: 🟡 Medium

### Web UI - Admin Dashboard

- [ ] BR093 [WEB] 🟡 Create `src/components/admin/RiderOverviewStats.tsx` - Rider stats cards
  - Total riders count
  - Active riders
  - Online riders right now
  - Pending approvals
  - Compliance percentage

- [ ] BR094 [WEB] 🟡 Update `src/routes/_authed/_admin/a/index.tsx` - Add rider stats to admin dashboard
  - Use RiderOverviewStats component
  - Link to rider management sections

### Web UI - Operations Tools

- [ ] BR095 [WEB] 🟡 Create `src/components/rider/RiderBulkActions.tsx` - Bulk operations
  - Bulk approve riders
  - Bulk suspend riders
  - Bulk send notifications
  - Export selected riders

- [ ] BR096 [WEB] 🟡 Create `src/components/rider/RiderSearchFilters.tsx` - Advanced filters
  - Filter by compliance status
  - Filter by performance rating
  - Filter by stage
  - Filter by vehicle type
  - Filter by payout method
  - Date range filters

### Web UI - Analytics & Reports

- [ ] BR097 [WEB] 🟡 Create `src/components/analytics/RiderAnalytics.tsx` - Analytics dashboard
  - Rider growth chart
  - Active vs inactive trend
  - Deliveries per rider average
  - Earnings distribution
  - Geographic coverage map

- [ ] BR098 [WEB] 🟡 Create `src/components/analytics/ComplianceReports.tsx` - Compliance reports
  - Compliance percentage over time
  - Non-compliant riders list
  - Expiring documents report
  - Export to PDF

- [ ] BR099 [WEB] 🟢 Create `src/components/analytics/StageAnalytics.tsx` - Stage analytics
  - Stage utilization (riders per stage)
  - Peak hours per stage
  - Deliveries by stage
  - Coverage gaps

- [ ] BR100 [WEB] 🟡 Create `src/routes/_authed/_admin/a/analytics/riders.tsx` - Rider analytics page
  - Use RiderAnalytics component
  - Date range selector
  - Export reports

### Backend - Analytics Queries

- [ ] BR101 [BACKEND] 🟡 Create `convex/analytics/riders.ts` - Rider analytics queries
  - Query: `getRiderGrowthData(startDate, endDate)` - Rider growth over time
  - Query: `getActiveRidersTrend(days)` - Active riders trend
  - Query: `getDeliveriesPerRider(period)` - Average deliveries
  - Query: `getEarningsDistribution(organizationId)` - Earnings percentiles
  - Query: `getGeographicCoverage(organizationId)` - Coverage by district

**Checkpoint**: Admin has comprehensive tools for rider management and analytics

---

## Phase 10: Advanced Features & Polish

**Goal**: Nice-to-have features and improvements
**Duration**: Ongoing
**Prerequisites**: Core features complete
**Priority**: 🟢 Low

### Advanced Mobile Features

- [ ] BR102 [MOBILE] 🟢 Create `app/(all)/(rider)/chat/[orderId].tsx` - In-app chat screen
  - Real-time messaging with customer
  - Real-time messaging with store
  - Send/receive messages
  - Typing indicators
  - Message history

- [ ] BR103 [MOBILE] 🟢 Create `components/rider/MultiStopDelivery.tsx` - Multi-stop support
  - Handle multiple orders in one trip
  - Optimized route
  - Sequential delivery tracking

- [ ] BR104 [MOBILE] 🟢 Create `components/rider/OfflineMode.tsx` - Offline support
  - Queue actions when offline
  - Sync when back online
  - Offline indicator
  - Cached data display

### Advanced Web Features

- [ ] BR105 [WEB] 🟢 Create `src/components/maps/RiderHeatMap.tsx` - Geographic heat map
  - Show rider density by area
  - Identify coverage gaps
  - Peak hours overlay
  - Interactive map controls

- [ ] BR106 [WEB] 🟢 Create `src/components/fraud/DuplicateRiderDetection.tsx` - Fraud detection
  - Find duplicate phones
  - Find duplicate NIDs
  - Similar names detection
  - Flag suspicious patterns

- [ ] BR107 [WEB] 🟢 Create `src/components/rider/RiderRecruitment.tsx` - Recruitment tools
  - Referral tracking
  - Recruitment campaigns
  - Onboarding funnel analytics

### Backend - Advanced Features

- [ ] BR108 [BACKEND] 🟢 Create `convex/optimization/routes.ts` - Route optimization
  - Action: `optimizeMultiStopRoute(stops)` - Optimize delivery sequence
  - Consider traffic, distance, time windows

- [ ] BR109 [BACKEND] 🟢 Create `convex/fraud/detection.ts` - Fraud detection
  - Function: `detectDuplicateRiders()` - Find duplicates
  - Function: `detectSuspiciousPatterns()` - Unusual behavior
  - Function: `verifyIdentityConsistency()` - Cross-check data

### Documentation & Training

- [ ] BR110 [SHARED] 🟢 Create rider onboarding guide (PDF/video)
  - How to register
  - How to accept deliveries
  - How to use the app
  - Payment information
  - Safety guidelines

- [ ] BR111 [SHARED] 🟢 Create admin user guide
  - Rider management workflows
  - Approval process
  - Payout processing
  - Compliance monitoring

**Checkpoint**: Advanced features complete, platform fully polished

---

## Dependencies & Execution Order

### Phase Dependencies

1. **Phase 0** (Foundation): No dependencies - START HERE
2. **Phase 1** (Registration): Depends on Phase 0
3. **Phase 2** (Compliance): Depends on Phase 1
4. **Phase 3** (Stages): Depends on Phase 1
5. **Phase 4** (Performance): Depends on Phase 1
6. **Phase 5** (Payouts): Depends on Phase 1
7. **Phase 6** (Auto-Assign): Depends on Phase 1
8. **Phase 7** (Mobile App): Depends on Phase 1
9. **Phase 8** (Real-Time): Depends on Phase 7
10. **Phase 9** (Admin Tools): Depends on Phases 1-5
11. **Phase 10** (Advanced): Depends on all core phases

### Parallel Opportunities

**After Phase 0 completes, the following can run in parallel:**
- Phase 1 (Registration) - Team A
- Phase 2 (Compliance) - Team B (after Phase 1 backend done)
- Phase 3 (Stages) - Team C
- Phase 4 (Performance) - Team D
- Phase 5 (Payouts) - Team E

**After Phase 1 completes:**
- Phase 6 (Auto-Assign) - Team F
- Phase 7 (Mobile App) - Team G

### Critical Path

```
Phase 0 → Phase 1 → Phase 7 → Phase 8
(5 days)  (7 days)  (14 days)  (6 days)
Total: 32 days for core mobile rider experience
```

---

## Implementation Strategy

### Sprint 1 (Weeks 1-2): Foundation & Registration
- Complete Phase 0 (schema, utilities)
- Complete Phase 1 (registration, profiles)
- **Deliverable**: Riders can be registered and managed in admin panel

### Sprint 2 (Weeks 3-4): Compliance & Performance
- Complete Phase 2 (compliance tracking)
- Complete Phase 4 (ratings, performance)
- **Deliverable**: Compliance tracking and performance metrics working

### Sprint 3 (Weeks 5-6): Payouts & Stages
- Complete Phase 5 (earnings, payouts)
- Complete Phase 3 (stage management)
- **Deliverable**: Payment processing functional, stages organized

### Sprint 4 (Weeks 7-8): Mobile Core
- Complete Phase 7 (mobile delivery workflow)
- **Deliverable**: Riders can manage deliveries on mobile

### Sprint 5 (Week 9): Real-Time & Auto-Assign
- Complete Phase 8 (notifications, location tracking)
- Complete Phase 6 (auto-assignment)
- **Deliverable**: Real-time updates and intelligent assignment

### Sprint 6 (Week 10): Admin Tools
- Complete Phase 9 (admin operations, analytics)
- **Deliverable**: Complete admin management suite

### Sprint 7+ (Ongoing): Polish & Advanced
- Complete Phase 10 (advanced features)
- **Deliverable**: Production-ready platform

---

## Testing Strategy

### Unit Tests
- Utility functions (rider code generation, phone normalization)
- Performance calculations
- Scoring algorithms

### Integration Tests
- Rider registration flow
- Assignment workflow
- Payout processing
- Document upload

### E2E Tests
- Complete rider onboarding (web)
- Accept and deliver order (mobile)
- Admin approval process (web)
- Earnings and payout flow

### Manual Testing
- Mobile app on iOS and Android
- Push notifications
- Background location tracking
- Real-time updates
- Document camera capture

---

## Success Criteria

### Technical Metrics
- [ ] All schema tables created and indexed
- [ ] All backend functions implemented and tested
- [ ] All web UI components functional
- [ ] All mobile screens implemented
- [ ] Push notifications 98%+ delivery rate
- [ ] Location updates < 5 second latency
- [ ] App crash rate < 0.1%
- [ ] Background battery usage < 5%

### Business Metrics
- [ ] Rider registration completion < 24 hours
- [ ] Assignment acceptance < 2 minutes average
- [ ] Auto-assignment accuracy > 90%
- [ ] On-time delivery rate > 95%
- [ ] Customer satisfaction > 4.5/5 stars

### Compliance Metrics
- [ ] 100% riders have NIN recorded
- [ ] 90%+ riders fully compliant
- [ ] Document expiry alerts functional
- [ ] Helmet verification enforced

---

## Task Count Summary

- **Phase 0**: 10 tasks (Backend foundation)
- **Phase 1**: 16 tasks (Registration & profiles)
- **Phase 2**: 8 tasks (Compliance & documents)
- **Phase 3**: 8 tasks (Stage management)
- **Phase 4**: 10 tasks (Performance & ratings)
- **Phase 5**: 14 tasks (Payouts & earnings)
- **Phase 6**: 6 tasks (Auto-assignment)
- **Phase 7**: 14 tasks (Mobile core workflow)
- **Phase 8**: 6 tasks (Real-time & notifications)
- **Phase 9**: 9 tasks (Admin operations)
- **Phase 10**: 11 tasks (Advanced features)

**Total: 111 tasks**

**Critical Path Tasks**: 42 tasks (Phases 0, 1, 7, 8)
**Estimated Duration**: 8-10 weeks for complete implementation

---

## Notes

- All tasks include exact file paths for implementation
- [P] markers indicate parallelizable tasks
- Priority markers help focus on critical features first
- Mobile tasks assume React Native with Expo
- Web tasks assume TanStack Start + shadcn/ui
- Backend tasks assume Convex with Clerk auth
- Phone numbers normalized to Uganda +256 format
- Geographic hierarchy specific to Uganda (district/sub-county/parish/village)
- Payout methods support Uganda's mobile money (MTN, Airtel)
- Compliance tracking follows Uganda regulations (NIN, driving permits, TIN)

---

**Document Status**: Ready for Implementation
**Next Steps**: Review and prioritize tasks, assign to team members, create first sprint
**Maintained By**: Development Team
**Last Updated**: 2025-01-10
