import crons from "@convex-dev/crons/convex.config.js";
import expoPushNotifications from "@convex-dev/expo-push-notifications/convex.config.js";
import geospatial from "@convex-dev/geospatial/convex.config.js";
import r2 from "@convex-dev/r2/convex.config.js";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";
import workflow from "@convex-dev/workflow/convex.config.js";
import { defineApp } from "convex/server";

const app = defineApp();

// File storage
app.use(r2);

// Location-based queries for stores and riders
app.use(geospatial);

// API rate limiting for security
app.use(rateLimiter);

// Durable workflow execution for order processing
app.use(workflow);

// Scheduled jobs for cart cleanup, reports, etc.
app.use(crons);

// Push notifications for order updates
app.use(expoPushNotifications);

export default app;
