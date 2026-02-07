import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ============================================================================
// ENUMS (as unions)
// ============================================================================

const orderStatus = v.union(
  v.literal("pending"),
  v.literal("confirmed"),
  v.literal("preparing"),
  v.literal("ready_for_pickup"),
  v.literal("out_for_delivery"),
  v.literal("delivered"),
  v.literal("completed"),
  v.literal("cancelled"),
  v.literal("canceled"),
  v.literal("refunded")
);

const fulfillmentStatus = v.union(
  v.literal("not_fulfilled"),
  v.literal("fulfilled"),
  v.literal("shipped"),
  v.literal("returned")
);

const paymentStatus = v.union(
  v.literal("awaiting"),
  v.literal("captured"),
  v.literal("refunded"),
  v.literal("canceled")
);

const fulfillmentType = v.union(
  v.literal("delivery"),
  v.literal("pickup"),
  v.literal("self_delivery")
);

const customerAddressType = v.union(
  v.literal("hotel"),
  v.literal("apartment"),
  v.literal("home"),
  v.literal("office")
);

const parcelStatus = v.union(
  v.literal("draft"),
  v.literal("pending"),
  v.literal("picked_up"),
  v.literal("in_transit"),
  v.literal("delivered"),
  v.literal("canceled"),
  v.literal("failed")
);

const parcelSizeCategory = v.union(
  v.literal("small"),
  v.literal("medium"),
  v.literal("large"),
  v.literal("extra_large")
);

const parcelPaymentStatus = v.union(
  v.literal("pending"),
  v.literal("paid"),
  v.literal("refunded")
);

const riderStatus = v.union(
  v.literal("offline"),
  v.literal("online"),
  v.literal("busy")
);

// Rider account status (for registration/compliance workflow)
const riderAccountStatus = v.union(
  v.literal("pending"), // Awaiting approval
  v.literal("active"), // Approved and can work
  v.literal("suspended"), // Temporarily disabled
  v.literal("inactive") // Deactivated
);

// Vehicle types for riders
const vehicleType = v.union(
  v.literal("walking"),
  v.literal("bicycle"),
  v.literal("scooter"),
  v.literal("motorbike"),
  v.literal("car"),
  v.literal("van"),
  v.literal("truck")
);

// Payout methods
const payoutMethod = v.union(
  v.literal("mobile_money"),
  v.literal("bank"),
  v.literal("cash"),
  v.literal("wallet")
);

const pricingRuleStatus = v.union(v.literal("active"), v.literal("inactive"));

const promotionType = v.union(v.literal("standard"), v.literal("buyget"));

const promotionStatus = v.union(
  v.literal("draft"),
  v.literal("active"),
  v.literal("inactive"),
  v.literal("expired")
);

const campaignBudgetType = v.union(v.literal("spend"), v.literal("usage"));

const applicationMethodType = v.union(
  v.literal("fixed"),
  v.literal("percentage")
);

const applicationMethodTargetType = v.union(
  v.literal("items"),
  v.literal("shipping"),
  v.literal("order")
);

const applicationMethodAllocation = v.union(
  v.literal("each"),
  v.literal("across")
);

const promotionRuleOperator = v.union(
  v.literal("eq"),
  v.literal("ne"),
  v.literal("gt"),
  v.literal("gte"),
  v.literal("lt"),
  v.literal("lte"),
  v.literal("in")
);

const promotionRuleAttribute = v.union(
  v.literal("product_id"),
  v.literal("product_category_id"),
  v.literal("customer_id"),
  v.literal("customer_group_id"),
  v.literal("currency_code"),
  v.literal("cart_total"),
  v.literal("item_quantity")
);

// ============================================================================
// SCHEMA DEFINITION
// ============================================================================
// NOTE: No users table - user data comes from Clerk.
// All user references use clerkId (string) instead of v.id('users').
// User info (name, email, phone, image) is fetched from Clerk token or API.
// Roles are managed via Clerk publicMetadata.platformRole ('admin' | 'rider')
// and Clerk organization roles ('org:owner' | 'org:admin' | 'org:member').
//
// NOTE: No members, invitations, teams, or teamMembers tables.
// These are all managed by Clerk Organizations:
// - Members: Use Clerk's organization memberships API
// - Invitations: Use Clerk's organization invitations API
// - Roles: Use Clerk's organization roles (org:owner, org:admin, org:member)

export default defineSchema({
  // ==========================================================================
  // ORGANIZATION / VENDOR STRUCTURE
  // ==========================================================================

  // Organization Categories (e.g., "Supermarket", "Pharmacy")
  organizationCategories: defineTable({
    name: v.string(),
    slug: v.string(),
    parentId: v.optional(v.id("organizationCategories")),
  })
    .index("by_slug", ["slug"])
    .index("by_parent", ["parentId"]),

  // Organizations (Vendors/Stores)
  // NOTE: This table stores business-specific data not available in Clerk.
  // The clerkOrgId links this record to the Clerk organization.
  // Created via webhook when a Clerk organization is created.
  organizations: defineTable({
    clerkOrgId: v.string(), // Clerk organization ID (e.g., "org_xxx")
    name: v.string(), // Synced from Clerk on creation
    slug: v.string(), // Synced from Clerk on creation
    logo: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    // Location (business-specific, not in Clerk)
    country: v.optional(v.string()), // Default: 'UG'
    cityOrDistrict: v.optional(v.string()),
    town: v.optional(v.string()),
    street: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    geohash: v.optional(v.string()), // For geospatial queries
    // Category (business-specific)
    categoryId: v.optional(v.id("organizationCategories")),
    // Operating Hours (business-specific)
    openingTime: v.optional(v.string()), // "08:00"
    closingTime: v.optional(v.string()), // "22:00"
    businessHours: v.optional(v.any()), // JSON: { monday: { open, close, isClosed }, ... }
    timezone: v.optional(v.string()), // Default: 'Africa/Kampala'
    isBusy: v.optional(v.boolean()), // Pause orders
    // Metadata
    metadata: v.optional(v.any()),
  })
    .index("by_clerkOrgId", ["clerkOrgId"])
    .index("by_slug", ["slug"])
    .index("by_category", ["categoryId"])
    .index("by_geohash", ["geohash"]),

  // ==========================================================================
  // PRODUCT CATALOG
  // ==========================================================================

  // Product Categories (hierarchical)
  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    parentId: v.optional(v.id("categories")),
    thumbnailR2Key: v.optional(v.string()), // R2 object key for thumbnail
    bannerR2Key: v.optional(v.string()), // R2 object key for banner
    isActive: v.boolean(),
  })
    .index("by_slug", ["slug"])
    .index("by_parent", ["parentId"])
    .index("by_active", ["isActive"]),

  // Brands
  brands: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
  }).index("by_slug", ["slug"]),

  // Master Products (Admin managed)
  products: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    brandId: v.optional(v.id("brands")),
    categoryId: v.id("categories"),
    isActive: v.boolean(),
  })
    .index("by_slug", ["slug"])
    .index("by_category", ["categoryId"])
    .index("by_brand", ["brandId"])
    .index("by_active", ["isActive"])
    .searchIndex("search_name", { searchField: "name" }),

  // Product Images
  productImages: defineTable({
    productId: v.id("products"),
    r2Key: v.string(), // R2 object key - public URL generated from this
    alt: v.optional(v.string()),
    isPrimary: v.boolean(),
  })
    .index("by_product", ["productId"])
    .index("by_primary", ["productId", "isPrimary"]),

  // Product Tags
  productTags: defineTable({
    productId: v.id("products"),
    value: v.string(),
  }).index("by_product", ["productId"]),

  // Product Variants (Vendor-specific listings)
  productVariants: defineTable({
    productId: v.id("products"),
    organizationId: v.id("organizations"),
    sku: v.string(),
    unit: v.string(), // "kg", "piece", "500ml"
    weightGrams: v.optional(v.number()),
    barcode: v.optional(v.string()),
    stockQuantity: v.number(),
    isAvailable: v.boolean(),
    isApproved: v.boolean(),
  })
    .index("by_product", ["productId"])
    .index("by_organization", ["organizationId"])
    .index("by_org_product", ["organizationId", "productId"])
    .index("by_org_sku", ["organizationId", "sku"])
    .index("by_available", ["organizationId", "isAvailable"]),

  // Price Sets (container for variant pricing)
  priceSets: defineTable({
    variantId: v.id("productVariants"),
    organizationId: v.id("organizations"),
  })
    .index("by_variant", ["variantId"])
    .index("by_organization", ["organizationId"]),

  // Money Amounts (actual prices with tiered pricing support)
  moneyAmounts: defineTable({
    priceSetId: v.id("priceSets"),
    currency: v.string(), // Default: 'UGX'
    amount: v.number(), // Regular price (in smallest unit)
    saleAmount: v.optional(v.number()), // Discounted price
    minQuantity: v.optional(v.number()), // Tiered pricing
    maxQuantity: v.optional(v.number()),
  }).index("by_priceSet", ["priceSetId"]),

  // ==========================================================================
  // CUSTOMERS
  // ==========================================================================

  // Customer Addresses (clerkId references Clerk user)
  customerAddresses: defineTable({
    clerkId: v.string(), // Clerk user ID
    name: v.string(), // Address label
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    town: v.optional(v.string()),
    street: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    addressType: v.optional(customerAddressType),
    buildingName: v.optional(v.string()),
    apartmentNo: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    geohash: v.optional(v.string()),
    directions: v.optional(v.string()),
    isDefault: v.boolean(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_default", ["clerkId", "isDefault"]),

  // Organization Customers (links customers to vendors)
  organizationCustomers: defineTable({
    organizationId: v.id("organizations"),
    clerkId: v.string(), // Clerk user ID
  })
    .index("by_organization", ["organizationId"])
    .index("by_clerkId", ["clerkId"]),

  // ==========================================================================
  // ORDERS & FULFILLMENT
  // ==========================================================================

  // Orders
  orders: defineTable({
    displayId: v.number(), // Auto-increment display number
    status: orderStatus,
    fulfillmentStatus,
    paymentStatus,
    fulfillmentType,
    customerClerkId: v.string(), // Clerk user ID of customer
    organizationId: v.id("organizations"),
    deliveryAddressId: v.optional(v.id("customerAddresses")),
    // External delivery info
    deliveryQuoteId: v.optional(v.string()),
    riderId: v.optional(v.string()), // External rider ID
    riderName: v.optional(v.string()),
    riderPhone: v.optional(v.string()),
    // Totals
    currencyCode: v.string(), // Default: 'UGX'
    total: v.number(), // In smallest unit
    taxTotal: v.number(),
    discountTotal: v.number(),
    deliveryTotal: v.number(),
  })
    .index("by_customerClerkId", ["customerClerkId"])
    .index("by_organization", ["organizationId"])
    .index("by_status", ["status"])
    .index("by_fulfillmentStatus", ["fulfillmentStatus"])
    .index("by_displayId", ["displayId"]),

  // Order Items
  orderItems: defineTable({
    orderId: v.id("orders"),
    productId: v.id("products"),
    variantId: v.id("productVariants"),
    title: v.string(), // Snapshot of product name
    quantity: v.number(),
    unitPrice: v.number(),
    subtotal: v.number(),
    taxTotal: v.number(),
  }).index("by_order", ["orderId"]),

  // Order Events (audit log)
  orderEvents: defineTable({
    orderId: v.id("orders"),
    clerkId: v.string(), // Actor (Clerk user ID)
    eventType: v.string(), // 'created', 'status_changed', 'payment_captured', etc.
    fromOrderStatus: v.optional(v.string()),
    toOrderStatus: v.optional(v.string()),
    fromPaymentStatus: v.optional(v.string()),
    toPaymentStatus: v.optional(v.string()),
    fromFulfillmentStatus: v.optional(v.string()),
    toFulfillmentStatus: v.optional(v.string()),
    reason: v.optional(v.string()),
    // Snapshots
    snapshotTotal: v.number(),
    snapshotTaxTotal: v.number(),
    snapshotDiscountTotal: v.number(),
    snapshotDeliveryTotal: v.number(),
  }).index("by_order", ["orderId"]),

  // Order Item Events (audit log for item changes)
  orderItemEvents: defineTable({
    orderId: v.id("orders"),
    orderItemId: v.string(), // Raw ID
    clerkId: v.string(), // Actor (Clerk user ID)
    eventType: v.string(), // 'add', 'exchange', 'remove'
    oldVariantId: v.optional(v.string()),
    newVariantId: v.optional(v.string()),
    snapshotTitle: v.string(),
    snapshotQuantity: v.number(),
    snapshotUnitPrice: v.number(),
    snapshotSubtotal: v.number(),
    snapshotTaxTotal: v.number(),
  }).index("by_order", ["orderId"]),

  // Rider Locations (for internal rider tracking - real-time location)
  riderLocations: defineTable({
    clerkId: v.string(), // Rider's Clerk ID
    lat: v.number(),
    lng: v.number(),
    geohash: v.optional(v.string()),
    status: riderStatus,
    lastUpdatedAt: v.number(),
    // Current active order (if any)
    activeOrderId: v.optional(v.id("orders")),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_status", ["status"])
    .index("by_geohash", ["geohash"]),

  // ==========================================================================
  // RIDERS - Full rider profiles (registration, compliance, performance)
  // ==========================================================================

  riders: defineTable({
    // Core Identity
    clerkId: v.string(), // Clerk user ID (links to Clerk for auth)
    riderCode: v.string(), // Auto-generated code (e.g., "RDR-001234")
    name: v.string(), // Full name
    accountStatus: riderAccountStatus, // Registration/approval status

    // Contact Information
    phoneNumber: v.string(), // Normalized to +256 format
    email: v.optional(v.string()),
    nextOfKinName: v.optional(v.string()),
    nextOfKinPhone: v.optional(v.string()),

    // Compliance (Uganda-specific)
    nationalId: v.optional(v.string()), // NIN (National Identification Number)
    drivingPermitNumber: v.optional(v.string()),
    drivingPermitExpiry: v.optional(v.number()), // Timestamp
    tin: v.optional(v.string()), // Tax Identification Number
    helmetVerified: v.boolean(), // Has verified helmet
    insuranceNumber: v.optional(v.string()),
    insuranceExpiry: v.optional(v.number()), // Timestamp

    // Vehicle Information
    vehicleType: vehicleType,
    vehiclePlate: v.optional(v.string()),
    vehicleMake: v.optional(v.string()),
    vehicleModel: v.optional(v.string()),
    vehicleColor: v.optional(v.string()),
    vehicleYear: v.optional(v.number()),

    // Location & Geography (home/base location)
    district: v.optional(v.string()),
    subCounty: v.optional(v.string()),
    parish: v.optional(v.string()),
    village: v.optional(v.string()),
    homeAddress: v.optional(v.string()),
    homeLat: v.optional(v.float64()),
    homeLng: v.optional(v.float64()),

    // Media
    photoUrl: v.optional(v.string()), // Profile photo
    photoR2Key: v.optional(v.string()), // R2 storage key
    nationalIdPhotoR2Key: v.optional(v.string()), // ID document photo
    drivingPermitPhotoR2Key: v.optional(v.string()), // Permit photo

    // Payout Preferences
    preferredPayoutMethod: payoutMethod,
    mobileMoneyProvider: v.optional(v.string()), // MTN, Airtel, etc.
    mobileMoneyNumber: v.optional(v.string()),
    bankName: v.optional(v.string()),
    bankAccountNumber: v.optional(v.string()),
    bankAccountName: v.optional(v.string()),

    // Performance Metrics (denormalized for fast queries)
    ratingSum: v.number(), // Sum of all ratings (to calculate average)
    ratingCount: v.number(), // Number of ratings received
    completedDeliveries: v.number(),
    canceledDeliveries: v.number(),
    totalEarnings: v.number(), // Lifetime earnings in smallest currency unit

    // Operational
    currentStageId: v.optional(v.id("stages")), // Current assigned stage/hub
    onboardedAt: v.optional(v.number()), // When rider completed onboarding
    approvedAt: v.optional(v.number()), // When admin approved
    approvedBy: v.optional(v.string()), // Admin clerkId who approved
    suspendedAt: v.optional(v.number()),
    suspendedBy: v.optional(v.string()),
    suspensionReason: v.optional(v.string()),

    // Metadata
    notes: v.optional(v.string()), // Admin notes
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_riderCode", ["riderCode"])
    .index("by_accountStatus", ["accountStatus"])
    .index("by_phoneNumber", ["phoneNumber"])
    .index("by_vehicleType", ["vehicleType"])
    .index("by_district", ["district"])
    .index("by_currentStage", ["currentStageId"])
    .searchIndex("search_riders", {
      searchField: "name",
      filterFields: ["accountStatus", "vehicleType", "district"],
    }),

  // ==========================================================================
  // STAGES - Rider gathering points / hubs
  // ==========================================================================

  stages: defineTable({
    name: v.string(),
    code: v.string(), // Unique stage code (e.g., "STG-KAMPALA-01")
    description: v.optional(v.string()),

    // Location
    address: v.string(),
    district: v.optional(v.string()),
    lat: v.float64(),
    lng: v.float64(),
    geohash: v.optional(v.string()),

    // Zone association
    zoneId: v.optional(v.id("deliveryZones")),

    // Capacity & Status
    capacity: v.optional(v.number()), // Max riders at this stage
    isActive: v.boolean(),

    // Contact
    contactName: v.optional(v.string()), // Stage supervisor
    contactPhone: v.optional(v.string()),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_zone", ["zoneId"])
    .index("by_active", ["isActive"])
    .index("by_district", ["district"])
    .index("by_geohash", ["geohash"]),

  // ==========================================================================
  // RIDER STAGE MEMBERSHIPS - Many-to-many rider to stage assignments
  // ==========================================================================

  riderStageMemberships: defineTable({
    riderId: v.id("riders"),
    stageId: v.id("stages"),
    isActive: v.boolean(), // Currently assigned to this stage
    isPrimary: v.boolean(), // Primary stage for this rider
    joinedAt: v.number(),
    leftAt: v.optional(v.number()),
    assignedBy: v.optional(v.string()), // Admin clerkId who assigned
  })
    .index("by_rider", ["riderId"])
    .index("by_stage", ["stageId"])
    .index("by_rider_active", ["riderId", "isActive"])
    .index("by_stage_active", ["stageId", "isActive"]),

  // ==========================================================================
  // RIDER RATINGS - Individual rating records for analytics
  // ==========================================================================

  riderRatings: defineTable({
    riderId: v.id("riders"),
    orderId: v.optional(v.id("orders")),
    parcelId: v.optional(v.id("parcels")),
    customerClerkId: v.string(), // Who gave the rating
    rating: v.number(), // 1-5 stars
    comment: v.optional(v.string()),
    // Rating categories (optional detailed feedback)
    deliverySpeedRating: v.optional(v.number()), // 1-5
    communicationRating: v.optional(v.number()), // 1-5
    professionalismRating: v.optional(v.number()), // 1-5
    createdAt: v.number(),
  })
    .index("by_rider", ["riderId"])
    .index("by_order", ["orderId"])
    .index("by_parcel", ["parcelId"])
    .index("by_customer", ["customerClerkId"])
    .index("by_rider_and_created", ["riderId", "createdAt"]),

  // ==========================================================================
  // RIDER PAYOUTS - Payout batches and transactions
  // ==========================================================================

  riderPayouts: defineTable({
    riderId: v.id("riders"),
    amount: v.number(), // Amount in smallest currency unit
    currency: v.string(), // e.g., "UGX"
    payoutMethod: payoutMethod,

    // Payment details (based on method)
    mobileMoneyNumber: v.optional(v.string()),
    mobileMoneyProvider: v.optional(v.string()),
    bankAccountNumber: v.optional(v.string()),
    bankName: v.optional(v.string()),

    // Status
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),

    // Period covered
    periodStart: v.number(), // Start of earnings period
    periodEnd: v.number(), // End of earnings period
    deliveryCount: v.number(), // Number of deliveries in this payout

    // Transaction details
    transactionId: v.optional(v.string()), // External transaction ID
    processedAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),

    // Admin
    createdBy: v.string(), // Admin clerkId who initiated
    approvedBy: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    notes: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_rider", ["riderId"])
    .index("by_status", ["status"])
    .index("by_rider_and_status", ["riderId", "status"])
    .index("by_period", ["periodStart", "periodEnd"]),

  // ==========================================================================
  // PARCEL / P2P DELIVERY
  // ==========================================================================

  // Parcels
  parcels: defineTable({
    displayId: v.number(),
    senderClerkId: v.string(), // Clerk user ID of sender
    // Pickup Details
    pickupName: v.string(),
    pickupPhone: v.string(),
    pickupAddress: v.string(),
    pickupLat: v.optional(v.number()),
    pickupLng: v.optional(v.number()),
    pickupGeohash: v.optional(v.string()),
    pickupNotes: v.optional(v.string()),
    // Dropoff Details
    recipientName: v.string(),
    recipientPhone: v.string(),
    dropoffAddress: v.string(),
    dropoffLat: v.optional(v.number()),
    dropoffLng: v.optional(v.number()),
    dropoffGeohash: v.optional(v.string()),
    dropoffNotes: v.optional(v.string()),
    // Package Details
    description: v.string(),
    weight: v.optional(v.number()), // In kg
    sizeCategory: parcelSizeCategory,
    fragile: v.boolean(),
    valueAmount: v.optional(v.number()), // Declared value
    valueCurrency: v.string(), // Default: 'UGX'
    // Status & Assignment
    status: parcelStatus,
    externalDeliveryId: v.optional(v.string()),
    externalRiderId: v.optional(v.string()),
    externalRiderName: v.optional(v.string()),
    externalRiderPhone: v.optional(v.string()),
    riderAssignedAt: v.optional(v.number()),
    // Pricing
    estimatedDistance: v.optional(v.number()), // In km
    priceAmount: v.optional(v.number()),
    priceCurrency: v.string(), // Default: 'UGX'
    paymentStatus: parcelPaymentStatus,
    // Verification Codes
    pickupCode: v.optional(v.string()),
    deliveryCode: v.optional(v.string()),
    // Timestamps
    pickedUpAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    canceledAt: v.optional(v.number()),
    cancelReason: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index("by_senderClerkId", ["senderClerkId"])
    .index("by_status", ["status"])
    .index("by_displayId", ["displayId"]),

  // Parcel Events (audit log)
  parcelEvents: defineTable({
    parcelId: v.id("parcels"),
    eventType: v.string(), // 'created', 'status_changed', 'assigned', etc.
    status: v.optional(v.string()),
    description: v.optional(v.string()),
    clerkId: v.optional(v.string()), // Actor (Clerk user ID)
    metadata: v.optional(v.any()),
  }).index("by_parcel", ["parcelId"]),

  // ==========================================================================
  // PROMOTIONS SYSTEM
  // ==========================================================================

  // Campaigns
  campaigns: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    campaignIdentifier: v.optional(v.string()), // External tracking
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    organizationId: v.optional(v.id("organizations")), // null = platform-wide
    deletedAt: v.optional(v.number()), // Soft delete
  })
    .index("by_organization", ["organizationId"])
    .index("by_active", ["startsAt", "endsAt"]),

  // Campaign Budgets
  campaignBudgets: defineTable({
    campaignId: v.id("campaigns"),
    type: campaignBudgetType,
    currencyCode: v.string(), // Default: 'UGX'
    limitAmount: v.optional(v.number()),
    usedAmount: v.number(), // Default: 0
  }).index("by_campaign", ["campaignId"]),

  // Promotions
  promotions: defineTable({
    code: v.string(),
    type: promotionType,
    status: promotionStatus,
    isAutomatic: v.boolean(),
    isTaxInclusive: v.boolean(),
    campaignId: v.optional(v.id("campaigns")),
    organizationId: v.optional(v.id("organizations")), // null = platform-wide
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    usageLimit: v.optional(v.number()),
    usageCount: v.number(), // Default: 0
    customerUsageLimit: v.optional(v.number()),
    deletedAt: v.optional(v.number()), // Soft delete
  })
    .index("by_code", ["code"])
    .index("by_organization", ["organizationId"])
    .index("by_status", ["status"])
    .index("by_campaign", ["campaignId"]),

  // Application Methods (how discounts are applied)
  applicationMethods: defineTable({
    promotionId: v.id("promotions"),
    type: applicationMethodType,
    targetType: applicationMethodTargetType,
    allocation: applicationMethodAllocation,
    value: v.number(), // Discount amount or percentage
    currencyCode: v.string(), // Default: 'UGX'
    maxQuantity: v.optional(v.number()),
    buyRulesMinQuantity: v.optional(v.number()), // Buy X
    applyToQuantity: v.optional(v.number()), // Get Y free
  }).index("by_promotion", ["promotionId"]),

  // Promotion Rules
  promotionRules: defineTable({
    promotionId: v.id("promotions"),
    description: v.optional(v.string()),
    attribute: promotionRuleAttribute,
    operator: promotionRuleOperator,
  }).index("by_promotion", ["promotionId"]),

  // Promotion Rule Values
  promotionRuleValues: defineTable({
    promotionRuleId: v.id("promotionRules"),
    value: v.string(),
  }).index("by_rule", ["promotionRuleId"]),

  // Promotion Usage (tracks when promotions are used)
  promotionUsages: defineTable({
    promotionId: v.id("promotions"),
    orderId: v.id("orders"),
    customerClerkId: v.string(), // Clerk user ID of customer
    discountAmount: v.number(),
    currencyCode: v.string(), // Default: 'UGX'
  })
    .index("by_promotion", ["promotionId"])
    .index("by_order", ["orderId"])
    .index("by_customerClerkId", ["customerClerkId"]),

  // Campaign Budget Usage
  campaignBudgetUsages: defineTable({
    campaignBudgetId: v.id("campaignBudgets"),
    promotionId: v.id("promotions"),
    amount: v.number(),
  })
    .index("by_budget", ["campaignBudgetId"])
    .index("by_promotion", ["promotionId"]),

  // ==========================================================================
  // CART (Ephemeral - consider Redis/session in production)
  // ==========================================================================

  // Shopping Carts
  carts: defineTable({
    clerkId: v.optional(v.string()), // Clerk user ID (guest carts have no user)
    sessionId: v.optional(v.string()), // For guest carts
    organizationId: v.id("organizations"),
    currencyCode: v.string(), // Default: 'UGX'
    expiresAt: v.number(), // Cart expiration timestamp
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_session", ["sessionId"])
    .index("by_organization", ["organizationId"]),

  // Cart Items
  cartItems: defineTable({
    cartId: v.id("carts"),
    variantId: v.id("productVariants"),
    quantity: v.number(),
  })
    .index("by_cart", ["cartId"])
    .index("by_variant", ["variantId"]),

  // ==========================================================================
  // COUNTERS (for display IDs)
  // ==========================================================================

  counters: defineTable({
    name: v.string(), // 'orders', 'parcels', etc.
    value: v.number(),
  }).index("by_name", ["name"]),

  // ==========================================================================
  // DELIVERY ZONES & PRICING
  // Geographic zones for delivery coverage with distance-based pricing
  // ==========================================================================

  deliveryZones: defineTable({
    name: v.string(),
    city: v.string(),
    country: v.string(), // ISO country code, default "UG"
    // Zone center point for map display and distance calculations
    centerLat: v.float64(),
    centerLng: v.float64(),
    // Maximum driving distance for deliveries in this zone (meters)
    maxDistanceMeters: v.number(),
    // Display color for UI map (hex color)
    color: v.optional(v.string()),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_city", ["city"])
    .index("by_active", ["active"])
    .index("by_country", ["country"]),

  pricingRules: defineTable({
    zoneId: v.optional(v.id("deliveryZones")), // null = applies to all zones
    name: v.string(),
    // Monetary values in smallest currency unit (UGX has no decimals)
    baseFee: v.number(), // Fixed base fee
    ratePerKm: v.number(), // Rate per kilometer
    minFee: v.number(), // Minimum fee floor
    surgeMultiplier: v.float64(), // 1.0 = no surge, 1.5 = 50% surge
    // Time window constraints (optional)
    daysOfWeek: v.optional(v.array(v.number())), // 0-6 (Sun-Sat), null = any day
    startHour: v.optional(v.number()), // 0-23, null = no lower bound
    endHour: v.optional(v.number()), // 0-23, null = no upper bound
    status: pricingRuleStatus,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_zone", ["zoneId"])
    .index("by_status", ["status"])
    .index("by_zone_and_status", ["zoneId", "status"]),

  // ==========================================================================
  // DELIVERY QUOTES
  // Cached delivery fee calculations
  // ==========================================================================

  deliveryQuotes: defineTable({
    // Origin (pickup location)
    pickupLat: v.float64(),
    pickupLng: v.float64(),
    // Destination (delivery location)
    dropoffLat: v.float64(),
    dropoffLng: v.float64(),
    // Distance calculation
    distanceMeters: v.number(),
    distanceSource: v.union(v.literal("mapbox"), v.literal("haversine")),
    estimatedDurationSeconds: v.optional(v.number()),
    // Pricing breakdown
    baseFee: v.number(),
    ratePerKm: v.number(),
    distanceFee: v.number(),
    surgeMultiplier: v.float64(),
    minFee: v.number(),
    deliveryFee: v.number(), // Final calculated fee
    // Zone/rule info (for auditing)
    zoneId: v.optional(v.id("deliveryZones")),
    zoneName: v.optional(v.string()),
    ruleId: v.optional(v.id("pricingRules")),
    ruleName: v.optional(v.string()),
    // Quote validity
    expiresAt: v.number(), // Timestamp when quote expires
    usedAt: v.optional(v.number()), // Timestamp when quote was used (linked to order/parcel)
    // Linking
    orderId: v.optional(v.id("orders")),
    parcelId: v.optional(v.id("parcels")),
    createdAt: v.number(),
  })
    .index("by_order", ["orderId"])
    .index("by_parcel", ["parcelId"])
    .index("by_expires", ["expiresAt"]),
});
