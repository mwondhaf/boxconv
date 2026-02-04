/**
 * Checkout Module - Mobile App Checkout Flow
 *
 * This module provides a streamlined checkout experience for mobile app customers:
 * - Cart validation and price verification
 * - Delivery quote calculation
 * - Payment initiation (placeholder for payment provider integration)
 * - Order creation
 *
 * The checkout flow is designed to be atomic and provide clear error messages.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { rateLimiter } from "./components";
import { calculateFare, estimateDeliveryTime } from "./lib/fare";

// =============================================================================
// TYPES
// =============================================================================

const fulfillmentTypeValidator = v.union(
  v.literal("delivery"),
  v.literal("pickup"),
  v.literal("self_delivery")
);

const paymentMethodValidator = v.union(
  v.literal("cash_on_delivery"),
  v.literal("mobile_money"),
  v.literal("card"),
  v.literal("wallet")
);

// =============================================================================
// CHECKOUT VALIDATION
// =============================================================================

/**
 * Validate checkout - comprehensive validation before order creation.
 * Call this before initiating payment to ensure everything is valid.
 */
export const validate = query({
  args: {
    cartId: v.id("carts"),
    customerClerkId: v.string(),
    deliveryAddressId: v.optional(v.id("customerAddresses")),
    fulfillmentType: fulfillmentTypeValidator,
    isExpress: v.optional(v.boolean()),
    promoCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validate cart exists and belongs to customer
    const cart = await ctx.db.get(args.cartId);
    if (!cart) {
      return {
        valid: false,
        errors: ["Cart not found"],
        warnings: [],
        summary: null,
      };
    }

    if (cart.clerkId !== args.customerClerkId) {
      return {
        valid: false,
        errors: ["Cart does not belong to this customer"],
        warnings: [],
        summary: null,
      };
    }

    // Check cart expiration
    if (cart.expiresAt < Date.now()) {
      return {
        valid: false,
        errors: ["Cart has expired. Please add items again."],
        warnings: [],
        summary: null,
      };
    }

    // 2. Validate cart items
    const cartItems = await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (q) => q.eq("cartId", args.cartId))
      .collect();

    if (cartItems.length === 0) {
      return {
        valid: false,
        errors: ["Cart is empty"],
        warnings: [],
        summary: null,
      };
    }

    // 3. Validate organization/store
    const org = await ctx.db.get(cart.organizationId);
    if (!org) {
      errors.push("Store not found");
    } else if (org.isBusy) {
      errors.push("Store is currently not accepting orders. Please try again later.");
    }

    // 4. Validate delivery address for delivery orders
    let deliveryAddress = null;
    let deliveryInfo = null;

    if (args.fulfillmentType === "delivery") {
      if (!args.deliveryAddressId) {
        errors.push("Delivery address is required for delivery orders");
      } else {
        deliveryAddress = await ctx.db.get(args.deliveryAddressId);

        if (!deliveryAddress) {
          errors.push("Delivery address not found");
        } else if (deliveryAddress.clerkId !== args.customerClerkId) {
          errors.push("Delivery address does not belong to this customer");
        } else if (!deliveryAddress.lat || !deliveryAddress.lng) {
          errors.push("Delivery address is missing location coordinates. Please update the address.");
        } else if (org && org.lat && org.lng) {
          // Calculate distance and validate delivery zone
          const distanceKm = calculateDistance(
            org.lat,
            org.lng,
            deliveryAddress.lat,
            deliveryAddress.lng
          );

          const maxDeliveryDistance = 15; // km
          if (distanceKm > maxDeliveryDistance) {
            errors.push(
              `Delivery address is too far (${distanceKm.toFixed(1)}km). Maximum delivery distance is ${maxDeliveryDistance}km.`
            );
          } else {
            deliveryInfo = {
              distanceKm: Math.round(distanceKm * 100) / 100,
              available: true,
            };
          }
        } else if (!org?.lat || !org?.lng) {
          warnings.push("Store location not set. Delivery fee may vary.");
        }
      }
    }

    // 5. Validate items and calculate totals
    let subtotal = 0;
    const validatedItems: Array<{
      variantId: string;
      productId: string;
      title: string;
      quantity: number;
      unitPrice: number;
      itemSubtotal: number;
      available: boolean;
      issue?: string;
    }> = [];

    for (const cartItem of cartItems) {
      const variant = await ctx.db.get(cartItem.variantId);

      if (!variant) {
        errors.push(`A product in your cart no longer exists`);
        continue;
      }

      if (!variant.isAvailable) {
        errors.push(`Product is no longer available`);
        continue;
      }

      if (variant.organizationId !== cart.organizationId) {
        errors.push(`Invalid product in cart`);
        continue;
      }

      // Get product for title
      const product = await ctx.db.get(variant.productId);
      if (!product) {
        errors.push(`Product not found`);
        continue;
      }

      // Get current price
      const priceSet = await ctx.db
        .query("priceSets")
        .withIndex("by_variant", (q) => q.eq("variantId", variant._id))
        .first();

      let unitPrice = 0;

      if (priceSet) {
        const moneyAmounts = await ctx.db
          .query("moneyAmounts")
          .withIndex("by_priceSet", (q) => q.eq("priceSetId", priceSet._id))
          .collect();

        // Sort by minQuantity to find applicable tier
        const sortedPrices = moneyAmounts.sort(
          (a, b) => (a.minQuantity ?? 0) - (b.minQuantity ?? 0)
        );

        for (const ma of sortedPrices) {
          const minQty = ma.minQuantity ?? 1;
          const maxQty = ma.maxQuantity ?? Number.MAX_SAFE_INTEGER;

          if (cartItem.quantity >= minQty && cartItem.quantity <= maxQty) {
            unitPrice =
              ma.saleAmount && ma.saleAmount < ma.amount
                ? ma.saleAmount
                : ma.amount;
            break;
          }
        }

        // Fallback to first price if no tier matches
        if (unitPrice === 0 && sortedPrices.length > 0) {
          const firstPrice = sortedPrices[0];
          unitPrice =
            firstPrice.saleAmount && firstPrice.saleAmount < firstPrice.amount
              ? firstPrice.saleAmount
              : firstPrice.amount;
        }
      }

      if (unitPrice === 0) {
        errors.push(`No price found for: ${product.name}`);
        continue;
      }

      const itemSubtotal = unitPrice * cartItem.quantity;
      subtotal += itemSubtotal;

      validatedItems.push({
        variantId: variant._id,
        productId: variant.productId,
        title: `${product.name} - ${variant.unit}`,
        quantity: cartItem.quantity,
        unitPrice,
        itemSubtotal,
        available: true,
      });
    }

    // 6. Calculate delivery fee
    let deliveryTotal = 0;
    let deliveryEstimate = null;

    if (args.fulfillmentType === "delivery" && deliveryInfo?.available && org?.lat && org?.lng) {
      const fareBreakdown = calculateFare({
        distanceKm: deliveryInfo.distanceKm,
        orderSubtotal: subtotal,
        hourOfDay: new Date().getHours(),
        isExpress: args.isExpress ?? false,
      });

      deliveryTotal = fareBreakdown.total;

      const timeEstimate = estimateDeliveryTime(
        deliveryInfo.distanceKm,
        args.isExpress ?? false
      );

      deliveryEstimate = {
        fee: fareBreakdown.total,
        isFreeDelivery: fareBreakdown.isFreeDelivery,
        distanceKm: deliveryInfo.distanceKm,
        minMinutes: timeEstimate.minMinutes,
        maxMinutes: timeEstimate.maxMinutes,
        breakdown: fareBreakdown,
      };
    }

    // 7. Calculate totals
    const taxTotal = 0; // Platform tax calculation would go here
    let discountTotal = 0;

    // 8. Validate promo code if provided
    if (args.promoCode) {
      const promo = await ctx.db
        .query("promotions")
        .filter((q) => q.eq(q.field("code"), args.promoCode))
        .first();

      if (!promo) {
        warnings.push(`Promo code "${args.promoCode}" not found`);
      } else if (promo.status !== "active") {
        warnings.push(`Promo code "${args.promoCode}" is not active`);
      } else if (promo.endsAt && promo.endsAt < Date.now()) {
        warnings.push(`Promo code "${args.promoCode}" has expired`);
      } else if (promo.usageLimit && promo.usageCount >= promo.usageLimit) {
        warnings.push(`Promo code "${args.promoCode}" has reached its usage limit`);
      } else {
        // Promo is valid - calculate discount
        // This is a simplified calculation; real implementation would
        // consider application methods, rules, etc.
        const appMethod = await ctx.db
          .query("applicationMethods")
          .filter((q) => q.eq(q.field("promotionId"), promo._id))
          .first();

        if (appMethod) {
          if (appMethod.type === "percentage") {
            discountTotal = Math.round((subtotal * appMethod.value) / 100);
          } else if (appMethod.type === "fixed") {
            discountTotal = appMethod.value;
          }

          // Cap discount at subtotal
          discountTotal = Math.min(discountTotal, subtotal);
        }
      }
    }

    const total = subtotal + taxTotal - discountTotal + deliveryTotal;

    // Build summary
    const summary = {
      items: validatedItems,
      itemCount: validatedItems.length,
      subtotal,
      taxTotal,
      discountTotal,
      deliveryTotal,
      total,
      currency: cart.currencyCode ?? "UGX",
      store: org
        ? {
            _id: org._id,
            name: org.name,
            logo: org.logo,
            phone: org.phone,
          }
        : null,
      deliveryAddress: deliveryAddress
        ? {
            _id: deliveryAddress._id,
            name: deliveryAddress.name,
            phone: deliveryAddress.phone,
            address: [deliveryAddress.street, deliveryAddress.town, deliveryAddress.city]
              .filter(Boolean)
              .join(", "),
          }
        : null,
      deliveryEstimate,
      fulfillmentType: args.fulfillmentType,
    };

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      summary,
    };
  },
});

// =============================================================================
// CHECKOUT EXECUTION
// =============================================================================

/**
 * Complete checkout - validates cart, processes payment, and creates order.
 * This is the main checkout mutation for mobile apps.
 */
export const complete = mutation({
  args: {
    cartId: v.id("carts"),
    customerClerkId: v.string(),
    deliveryAddressId: v.optional(v.id("customerAddresses")),
    fulfillmentType: fulfillmentTypeValidator,
    paymentMethod: paymentMethodValidator,
    paymentReference: v.optional(v.string()), // For prepaid orders
    notes: v.optional(v.string()),
    isExpress: v.optional(v.boolean()),
    promoCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Rate limit checkout
    const { ok } = await rateLimiter.limit(ctx, "createOrder", {
      key: args.customerClerkId,
    });

    if (!ok) {
      throw new Error("Too many checkout attempts. Please wait a moment.");
    }

    // === VALIDATION PHASE ===

    // Get and validate cart
    const cart = await ctx.db.get(args.cartId);
    if (!cart) {
      throw new Error("Cart not found");
    }

    if (cart.clerkId !== args.customerClerkId) {
      throw new Error("Cart does not belong to this customer");
    }

    if (cart.expiresAt < Date.now()) {
      throw new Error("Cart has expired. Please add items again.");
    }

    // Get cart items
    const cartItems = await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (q) => q.eq("cartId", args.cartId))
      .collect();

    if (cartItems.length === 0) {
      throw new Error("Cart is empty");
    }

    // Validate organization
    const org = await ctx.db.get(cart.organizationId);
    if (!org) {
      throw new Error("Store not found");
    }

    if (org.isBusy) {
      throw new Error("Store is currently not accepting orders");
    }

    // Validate delivery address
    let deliveryAddress = null;
    let deliveryTotal = 0;
    let distanceKm = 0;

    if (args.fulfillmentType === "delivery") {
      if (!args.deliveryAddressId) {
        throw new Error("Delivery address is required");
      }

      deliveryAddress = await ctx.db.get(args.deliveryAddressId);
      if (!deliveryAddress) {
        throw new Error("Delivery address not found");
      }

      if (deliveryAddress.clerkId !== args.customerClerkId) {
        throw new Error("Delivery address does not belong to this customer");
      }

      if (org.lat && org.lng && deliveryAddress.lat && deliveryAddress.lng) {
        distanceKm = calculateDistance(
          org.lat,
          org.lng,
          deliveryAddress.lat,
          deliveryAddress.lng
        );

        if (distanceKm > 15) {
          throw new Error(`Delivery address is too far (${distanceKm.toFixed(1)}km)`);
        }
      }
    }

    // === ITEM PROCESSING PHASE ===

    let subtotal = 0;
    const orderItemsToInsert: Array<{
      productId: any;
      variantId: any;
      title: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      taxTotal: number;
    }> = [];

    for (const cartItem of cartItems) {
      const variant = await ctx.db.get(cartItem.variantId);
      if (!variant || !variant.isAvailable) {
        throw new Error("A product in your cart is no longer available");
      }

      if (variant.organizationId !== cart.organizationId) {
        throw new Error("Invalid product in cart");
      }

      const product = await ctx.db.get(variant.productId);
      if (!product) {
        throw new Error("Product not found");
      }

      // Get price
      const priceSet = await ctx.db
        .query("priceSets")
        .withIndex("by_variant", (q) => q.eq("variantId", variant._id))
        .first();

      let unitPrice = 0;

      if (priceSet) {
        const moneyAmounts = await ctx.db
          .query("moneyAmounts")
          .withIndex("by_priceSet", (q) => q.eq("priceSetId", priceSet._id))
          .collect();

        const sortedPrices = moneyAmounts.sort(
          (a, b) => (a.minQuantity ?? 0) - (b.minQuantity ?? 0)
        );

        for (const ma of sortedPrices) {
          const minQty = ma.minQuantity ?? 1;
          const maxQty = ma.maxQuantity ?? Number.MAX_SAFE_INTEGER;

          if (cartItem.quantity >= minQty && cartItem.quantity <= maxQty) {
            unitPrice =
              ma.saleAmount && ma.saleAmount < ma.amount
                ? ma.saleAmount
                : ma.amount;
            break;
          }
        }

        if (unitPrice === 0 && sortedPrices.length > 0) {
          const firstPrice = sortedPrices[0];
          unitPrice =
            firstPrice.saleAmount && firstPrice.saleAmount < firstPrice.amount
              ? firstPrice.saleAmount
              : firstPrice.amount;
        }
      }

      if (unitPrice === 0) {
        throw new Error(`No price found for: ${product.name}`);
      }

      const itemSubtotal = unitPrice * cartItem.quantity;
      subtotal += itemSubtotal;

      orderItemsToInsert.push({
        productId: variant.productId,
        variantId: variant._id,
        title: `${product.name} - ${variant.unit}`,
        quantity: cartItem.quantity,
        unitPrice,
        subtotal: itemSubtotal,
        taxTotal: 0,
      });
    }

    // Calculate delivery fee
    if (args.fulfillmentType === "delivery" && distanceKm > 0) {
      const fareBreakdown = calculateFare({
        distanceKm,
        orderSubtotal: subtotal,
        hourOfDay: new Date().getHours(),
        isExpress: args.isExpress ?? false,
      });
      deliveryTotal = fareBreakdown.total;
    }

    // Calculate discount
    let discountTotal = 0;
    let appliedPromoId: string | null = null;

    if (args.promoCode) {
      const promo = await ctx.db
        .query("promotions")
        .filter((q) => q.eq(q.field("code"), args.promoCode))
        .first();

      if (promo && promo.status === "active") {
        const appMethod = await ctx.db
          .query("applicationMethods")
          .filter((q) => q.eq(q.field("promotionId"), promo._id))
          .first();

        if (appMethod) {
          if (appMethod.type === "percentage") {
            discountTotal = Math.round((subtotal * appMethod.value) / 100);
          } else if (appMethod.type === "fixed") {
            discountTotal = appMethod.value;
          }
          discountTotal = Math.min(discountTotal, subtotal);
          appliedPromoId = promo._id;
        }
      }
    }

    const taxTotal = 0;
    const total = subtotal + taxTotal - discountTotal + deliveryTotal;

    // === PAYMENT PHASE ===

    let paymentStatus: "awaiting" | "captured" = "awaiting";

    if (args.paymentMethod === "cash_on_delivery") {
      paymentStatus = "awaiting"; // Will be captured on delivery
    } else if (args.paymentReference) {
      // Verify payment reference with payment provider
      // For now, assume it's valid
      paymentStatus = "captured";
    }

    // === ORDER CREATION PHASE ===

    // Get next display ID
    const displayId = await getNextDisplayId(ctx);

    // Create order
    const orderId = await ctx.db.insert("orders", {
      displayId,
      status: "pending",
      fulfillmentStatus: "not_fulfilled",
      paymentStatus,
      fulfillmentType: args.fulfillmentType,
      customerClerkId: args.customerClerkId,
      organizationId: cart.organizationId,
      deliveryAddressId: args.deliveryAddressId,
      currencyCode: cart.currencyCode ?? "UGX",
      total,
      taxTotal,
      discountTotal,
      deliveryTotal,
    });

    // Insert order items
    for (const item of orderItemsToInsert) {
      await ctx.db.insert("orderItems", {
        orderId,
        ...item,
      });
    }

    // Log order creation
    await ctx.db.insert("orderEvents", {
      orderId,
      clerkId: args.customerClerkId,
      eventType: "created",
      toOrderStatus: "pending",
      reason: args.notes ? `Customer notes: ${args.notes}` : undefined,
      snapshotTotal: total,
      snapshotTaxTotal: taxTotal,
      snapshotDiscountTotal: discountTotal,
      snapshotDeliveryTotal: deliveryTotal,
    });

    // Track promotion usage
    if (appliedPromoId) {
      const promoId = appliedPromoId as any;

      await ctx.db.insert("promotionUsages", {
        promotionId: promoId,
        orderId,
        customerClerkId: args.customerClerkId,
        discountAmount: discountTotal,
        currencyCode: cart.currencyCode ?? "UGX",
      });

      // Increment usage count - query promotions table directly
      const promoDoc = await ctx.db
        .query("promotions")
        .filter((q) => q.eq(q.field("_id"), promoId))
        .first();

      if (promoDoc) {
        await ctx.db.patch(promoDoc._id, {
          usageCount: (promoDoc.usageCount ?? 0) + 1,
        });
      }
    }

    // Track customer relationship
    const existingRelation = await ctx.db
      .query("organizationCustomers")
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), cart.organizationId),
          q.eq(q.field("clerkId"), args.customerClerkId)
        )
      )
      .first();

    if (!existingRelation) {
      await ctx.db.insert("organizationCustomers", {
        organizationId: cart.organizationId,
        clerkId: args.customerClerkId,
      });
    }

    // Clear cart
    for (const item of cartItems) {
      await ctx.db.delete(item._id);
    }
    await ctx.db.delete(args.cartId);

    // Send notification to vendor
    await ctx.scheduler.runAfter(0, internal.notifications.sendNewOrderNotification, {
      vendorClerkId: org.clerkOrgId, // This would need to be mapped to actual vendor user IDs
      orderId,
      orderDisplayId: String(displayId),
      orderTotal: total,
      currency: cart.currencyCode ?? "UGX",
      itemCount: orderItemsToInsert.length,
    });

    return {
      success: true,
      orderId,
      displayId,
      total,
      paymentStatus,
      message: `Order #${displayId} created successfully`,
    };
  },
});

// =============================================================================
// PAYMENT HELPERS
// =============================================================================

/**
 * Initiate mobile money payment.
 * Returns a payment reference to be used with the complete mutation.
 */
export const initiateMobileMoneyPayment = mutation({
  args: {
    cartId: v.id("carts"),
    customerClerkId: v.string(),
    phoneNumber: v.string(),
    provider: v.union(v.literal("mtn"), v.literal("airtel")),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    // Rate limit payment initiation
    const { ok } = await rateLimiter.limit(ctx, "apiCall", {
      key: args.customerClerkId,
    });

    if (!ok) {
      throw new Error("Too many payment requests. Please wait a moment.");
    }

    // Validate cart still exists
    const cart = await ctx.db.get(args.cartId);
    if (!cart) {
      throw new Error("Cart not found");
    }

    // In production, this would integrate with a payment provider like:
    // - MTN MoMo API
    // - Airtel Money API
    // - Flutterwave
    // - Paystack
    // - etc.

    // For now, generate a placeholder reference
    const paymentReference = `MM-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // In production:
    // 1. Call payment provider API to initiate payment
    // 2. Store payment request in database
    // 3. Return payment reference and any provider-specific data (STK push, etc.)

    return {
      paymentReference,
      provider: args.provider,
      phoneNumber: args.phoneNumber,
      amount: args.amount,
      status: "pending",
      message: "Payment request sent. Please check your phone to complete the payment.",
    };
  },
});

/**
 * Check payment status.
 */
export const checkPaymentStatus = query({
  args: {
    paymentReference: v.string(),
  },
  handler: async (_ctx, args) => {
    // In production, this would:
    // 1. Look up the payment in our database
    // 2. Check with payment provider for latest status
    // 3. Return current status

    // Placeholder response
    return {
      paymentReference: args.paymentReference,
      status: "pending", // 'pending' | 'completed' | 'failed' | 'cancelled'
      message: "Waiting for payment confirmation",
    };
  },
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get next order display ID.
 */
async function getNextDisplayId(ctx: any): Promise<number> {
  const counter = await ctx.db
    .query("counters")
    .filter((q: any) => q.eq(q.field("name"), "order_display_id"))
    .first();

  if (counter) {
    const nextValue = counter.value + 1;
    await ctx.db.patch(counter._id, { value: nextValue });
    return nextValue;
  } else {
    await ctx.db.insert("counters", {
      name: "order_display_id",
      value: 1001,
    });
    return 1000;
  }
}

/**
 * Calculate distance between two points using Haversine formula.
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const EARTH_RADIUS_KM = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
