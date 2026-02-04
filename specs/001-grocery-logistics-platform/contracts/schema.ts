import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ============================================================================
// ENUMS (as unions)
// ============================================================================

const orderStatus = v.union(
  v.literal("pending"),
  v.literal("completed"),
  v.literal("canceled")
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

const deliveryHandoffStatus = v.union(
  v.literal("queued"),
  v.literal("acknowledged"),
  v.literal("failed")
);

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

const invitationStatus = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("expired")
);

// ============================================================================
// SCHEMA DEFINITION
// ============================================================================

export default defineSchema({
  // ==========================================================================
  // AUTHENTICATION & AUTHORIZATION
  // ==========================================================================

  // Users (Synced from Clerk)
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    image: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    phoneNumberVerified: v.optional(v.boolean()),
    role: v.optional(v.string()), // 'vendor', 'customer', etc.
    isStaff: v.optional(v.boolean()), // Platform admin flag
    banned: v.optional(v.boolean()),
    banReason: v.optional(v.string()),
    banExpires: v.optional(v.number()), // Timestamp
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_isStaff", ["isStaff"]),

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
  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    logo: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    // Location
    country: v.optional(v.string()), // Default: 'UG'
    cityOrDistrict: v.optional(v.string()),
    town: v.optional(v.string()),
    street: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    geohash: v.optional(v.string()), // For geospatial queries
    // Category
    categoryId: v.optional(v.id("organizationCategories")),
    // Operating Hours
    openingTime: v.optional(v.string()), // "08:00"
    closingTime: v.optional(v.string()), // "22:00"
    businessHours: v.optional(v.any()), // JSON: { monday: { open, close, isClosed }, ... }
    timezone: v.optional(v.string()), // Default: 'Africa/Kampala'
    isBusy: v.optional(v.boolean()), // Pause orders
    // Metadata
    metadata: v.optional(v.any()),
  })
    .index("by_slug", ["slug"])
    .index("by_category", ["categoryId"])
    .index("by_geohash", ["geohash"]),

  // Teams within organizations
  teams: defineTable({
    name: v.string(),
    organizationId: v.id("organizations"),
  }).index("by_organization", ["organizationId"]),

  // Organization members
  members: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    role: v.optional(v.string()), // 'owner', 'admin', 'staff'
    phone: v.optional(v.string()),
    contract: v.optional(v.string()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_org_user", ["organizationId", "userId"]),

  // Team members
  teamMembers: defineTable({
    teamId: v.id("teams"),
    userId: v.id("users"),
  })
    .index("by_team", ["teamId"])
    .index("by_user", ["userId"]),

  // Invitations
  invitations: defineTable({
    organizationId: v.id("organizations"),
    email: v.string(),
    role: v.optional(v.string()),
    teamId: v.optional(v.id("teams")),
    status: invitationStatus,
    expiresAt: v.number(), // Timestamp
    inviterId: v.id("users"),
  })
    .index("by_organization", ["organizationId"])
    .index("by_email", ["email"])
    .index("by_status", ["status"]),

  // ==========================================================================
  // PRODUCT CATALOG
  // ==========================================================================

  // Product Categories (hierarchical)
  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    parentId: v.optional(v.id("categories")),
    thumbnailUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
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
    url: v.string(),
    storageId: v.optional(v.id("_storage")), // Convex file storage
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

  // Customer Addresses
  customerAddresses: defineTable({
    userId: v.id("users"),
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
    .index("by_user", ["userId"])
    .index("by_default", ["userId", "isDefault"]),

  // Organization Customers (links customers to vendors)
  organizationCustomers: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  })
    .index("by_organization", ["organizationId"])
    .index("by_user", ["userId"]),

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
    customerId: v.id("users"),
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
    .index("by_customer", ["customerId"])
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
    userId: v.string(), // Actor (string for history preservation)
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
    userId: v.string(),
    eventType: v.string(), // 'add', 'exchange', 'remove'
    oldVariantId: v.optional(v.string()),
    newVariantId: v.optional(v.string()),
    snapshotTitle: v.string(),
    snapshotQuantity: v.number(),
    snapshotUnitPrice: v.number(),
    snapshotSubtotal: v.number(),
    snapshotTaxTotal: v.number(),
  }).index("by_order", ["orderId"]),

  // Delivery Handoff (integration with external delivery system)
  deliveryHandoffs: defineTable({
    orderId: v.id("orders"),
    externalId: v.optional(v.string()),
    status: deliveryHandoffStatus,
    attemptCount: v.number(),
    lastAttemptAt: v.optional(v.number()),
    signature: v.optional(v.string()),
    payload: v.optional(v.any()), // JSON
  })
    .index("by_order", ["orderId"])
    .index("by_externalId", ["externalId"])
    .index("by_status", ["status"]),

  // ==========================================================================
  // PARCEL / P2P DELIVERY
  // ==========================================================================

  // Parcels
  parcels: defineTable({
    displayId: v.number(),
    senderId: v.id("users"),
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
    .index("by_sender", ["senderId"])
    .index("by_status", ["status"])
    .index("by_displayId", ["displayId"]),

  // Parcel Events (audit log)
  parcelEvents: defineTable({
    parcelId: v.id("parcels"),
    eventType: v.string(), // 'created', 'status_changed', 'assigned', etc.
    status: v.optional(v.string()),
    description: v.optional(v.string()),
    userId: v.optional(v.string()),
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
    customerId: v.string(),
    discountAmount: v.number(),
    currencyCode: v.string(), // Default: 'UGX'
  })
    .index("by_promotion", ["promotionId"])
    .index("by_order", ["orderId"])
    .index("by_customer", ["customerId"]),

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
    userId: v.optional(v.id("users")), // Guest carts have no user
    sessionId: v.optional(v.string()), // For guest carts
    organizationId: v.id("organizations"),
    currencyCode: v.string(), // Default: 'UGX'
    expiresAt: v.number(), // Cart expiration timestamp
  })
    .index("by_user", ["userId"])
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
});
