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

export interface VendorStatsData {
  totalRevenue: {
    value: string;
    trend: number;
    isPositive: boolean;
  };
  totalOrders: {
    value: number;
    trend: number;
    isPositive: boolean;
  };
  activeProducts: {
    value: number;
    trend: number;
    isPositive: boolean;
  };
  totalCustomers: {
    value: number;
    trend: number;
    isPositive: boolean;
  };
}

interface VendorSectionCardsProps {
  data?: VendorStatsData;
}

// Default demo data
const defaultData: VendorStatsData = {
  totalRevenue: {
    value: "UGX 2,450,000",
    trend: 12.5,
    isPositive: true,
  },
  totalOrders: {
    value: 156,
    trend: 8.2,
    isPositive: true,
  },
  activeProducts: {
    value: 45,
    trend: 3,
    isPositive: true,
  },
  totalCustomers: {
    value: 89,
    trend: 5.1,
    isPositive: true,
  },
};

export function VendorSectionCards({
  data = defaultData,
}: VendorSectionCardsProps) {
  return (
    <div className="grid @5xl/main:grid-cols-4 @xl/main:grid-cols-2 grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 dark:*:data-[slot=card]:bg-card">
      {/* Total Revenue Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Revenue</CardDescription>
          <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
            {data.totalRevenue.value}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {data.totalRevenue.isPositive ? (
                <IconTrendingUp className="text-green-600 dark:text-green-400" />
              ) : (
                <IconTrendingDown className="text-red-600 dark:text-red-400" />
              )}
              {data.totalRevenue.isPositive ? "+" : ""}
              {data.totalRevenue.trend}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {data.totalRevenue.isPositive ? "Trending up" : "Trending down"}{" "}
            this month
            {data.totalRevenue.isPositive ? (
              <IconTrendingUp className="size-4 text-green-600 dark:text-green-400" />
            ) : (
              <IconTrendingDown className="size-4 text-red-600 dark:text-red-400" />
            )}
          </div>
          <div className="text-muted-foreground">
            Revenue for the current month
          </div>
        </CardFooter>
      </Card>

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
            {data.totalOrders.isPositive
              ? "Orders increasing"
              : "Orders decreasing"}
            {data.totalOrders.isPositive ? (
              <IconTrendingUp className="size-4 text-green-600 dark:text-green-400" />
            ) : (
              <IconTrendingDown className="size-4 text-red-600 dark:text-red-400" />
            )}
          </div>
          <div className="text-muted-foreground">Compared to last month</div>
        </CardFooter>
      </Card>

      {/* Active Products Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Products</CardDescription>
          <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
            {data.activeProducts.value.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {data.activeProducts.isPositive ? (
                <IconTrendingUp className="text-green-600 dark:text-green-400" />
              ) : (
                <IconTrendingDown className="text-red-600 dark:text-red-400" />
              )}
              {data.activeProducts.isPositive ? "+" : ""}
              {data.activeProducts.trend}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Product catalog updated
            <IconTrendingUp className="size-4 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-muted-foreground">Currently listed products</div>
        </CardFooter>
      </Card>

      {/* Total Customers Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Customers</CardDescription>
          <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
            {data.totalCustomers.value.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {data.totalCustomers.isPositive ? (
                <IconTrendingUp className="text-green-600 dark:text-green-400" />
              ) : (
                <IconTrendingDown className="text-red-600 dark:text-red-400" />
              )}
              {data.totalCustomers.isPositive ? "+" : ""}
              {data.totalCustomers.trend}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {data.totalCustomers.isPositive
              ? "Customer base growing"
              : "Customer retention needed"}
            {data.totalCustomers.isPositive ? (
              <IconTrendingUp className="size-4 text-green-600 dark:text-green-400" />
            ) : (
              <IconTrendingDown className="size-4 text-red-600 dark:text-red-400" />
            )}
          </div>
          <div className="text-muted-foreground">Unique customers served</div>
        </CardFooter>
      </Card>
    </div>
  );
}
