import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";

import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export interface AdminStatsData {
  totalOrders: {
    value: number;
    trend: number;
    isPositive: boolean;
  };
  activeRiders: {
    value: number;
    online: number;
  };
  activeVendors: {
    value: number;
    trend: number;
    isPositive: boolean;
  };
  platformRevenue: {
    value: string;
    trend: number;
    isPositive: boolean;
  };
}

interface AdminSectionCardsProps {
  data?: AdminStatsData;
}

// Default demo data
const defaultData: AdminStatsData = {
  totalOrders: {
    value: 1234,
    trend: 15.2,
    isPositive: true,
  },
  activeRiders: {
    value: 48,
    online: 32,
  },
  activeVendors: {
    value: 156,
    trend: 8.5,
    isPositive: true,
  },
  platformRevenue: {
    value: "UGX 24,500,000",
    trend: 22.3,
    isPositive: true,
  },
};

export function AdminSectionCards({
  data = defaultData,
}: AdminSectionCardsProps) {
  return (
    <div className="grid @5xl/main:grid-cols-4 @xl/main:grid-cols-2 grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 dark:*:data-[slot=card]:bg-card">
      {/* Total Orders Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Orders</CardDescription>
          <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
            {data.totalOrders.value.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {data.totalOrders.isPositive ? (
                <IconTrendingUp className="text-green-600 dark:text-green-400" />
              ) : (
                <IconTrendingDown className="text-red-600 dark:text-red-400" />
              )}
              {data.totalOrders.isPositive ? "+" : ""}
              {data.totalOrders.trend}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Platform-wide orders
            {data.totalOrders.isPositive ? (
              <IconTrendingUp className="size-4 text-green-600 dark:text-green-400" />
            ) : (
              <IconTrendingDown className="size-4 text-red-600 dark:text-red-400" />
            )}
          </div>
          <div className="text-muted-foreground">Today's order volume</div>
        </CardFooter>
      </Card>

      {/* Active Riders Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Riders</CardDescription>
          <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
            {data.activeRiders.value}
          </CardTitle>
          <CardAction>
            <Badge
              className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              variant="outline"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-green-500" />
              </span>
              {data.activeRiders.online} online
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Fleet status healthy
            <IconTrendingUp className="size-4 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-muted-foreground">
            {data.activeRiders.online} currently accepting orders
          </div>
        </CardFooter>
      </Card>

      {/* Active Vendors Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Vendors</CardDescription>
          <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
            {data.activeVendors.value.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {data.activeVendors.isPositive ? (
                <IconTrendingUp className="text-green-600 dark:text-green-400" />
              ) : (
                <IconTrendingDown className="text-red-600 dark:text-red-400" />
              )}
              {data.activeVendors.isPositive ? "+" : ""}
              {data.activeVendors.trend}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Vendor network growing
            {data.activeVendors.isPositive ? (
              <IconTrendingUp className="size-4 text-green-600 dark:text-green-400" />
            ) : (
              <IconTrendingDown className="size-4 text-red-600 dark:text-red-400" />
            )}
          </div>
          <div className="text-muted-foreground">
            Registered vendors on platform
          </div>
        </CardFooter>
      </Card>

      {/* Platform Revenue Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Platform Revenue</CardDescription>
          <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
            {data.platformRevenue.value}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {data.platformRevenue.isPositive ? (
                <IconTrendingUp className="text-green-600 dark:text-green-400" />
              ) : (
                <IconTrendingDown className="text-red-600 dark:text-red-400" />
              )}
              {data.platformRevenue.isPositive ? "+" : ""}
              {data.platformRevenue.trend}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {data.platformRevenue.isPositive
              ? "Revenue growing"
              : "Revenue declining"}
            {data.platformRevenue.isPositive ? (
              <IconTrendingUp className="size-4 text-green-600 dark:text-green-400" />
            ) : (
              <IconTrendingDown className="size-4 text-red-600 dark:text-red-400" />
            )}
          </div>
          <div className="text-muted-foreground">
            Commission earnings this month
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
