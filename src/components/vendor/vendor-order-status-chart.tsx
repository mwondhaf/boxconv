"use client";

import { IconTrendingUp } from "@tabler/icons-react";
import * as React from "react";
import { Label, Pie, PieChart } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart";

export interface OrderStatusData {
  pending: number;
  confirmed: number;
  processing: number;
  out_for_delivery: number;
  delivered: number;
  cancelled: number;
}

interface VendorOrderStatusChartProps {
  data?: OrderStatusData;
  title?: string;
  description?: string;
}

// Default demo data
const defaultData: OrderStatusData = {
  pending: 12,
  confirmed: 8,
  processing: 15,
  out_for_delivery: 6,
  delivered: 45,
  cancelled: 3,
};

const chartConfig = {
  orders: {
    label: "Orders",
  },
  pending: {
    label: "Pending",
    color: "var(--chart-1)",
  },
  confirmed: {
    label: "Confirmed",
    color: "var(--chart-2)",
  },
  processing: {
    label: "Processing",
    color: "var(--chart-3)",
  },
  out_for_delivery: {
    label: "Out for Delivery",
    color: "var(--chart-4)",
  },
  delivered: {
    label: "Delivered",
    color: "var(--chart-5)",
  },
  cancelled: {
    label: "Cancelled",
    color: "hsl(0, 84%, 60%)",
  },
} satisfies ChartConfig;

export function VendorOrderStatusChart({
  data = defaultData,
  title = "Order Status",
  description = "Distribution by status",
}: VendorOrderStatusChartProps) {
  const chartData = React.useMemo(
    () => [
      { status: "pending", orders: data.pending, fill: "var(--color-pending)" },
      {
        status: "confirmed",
        orders: data.confirmed,
        fill: "var(--color-confirmed)",
      },
      {
        status: "processing",
        orders: data.processing,
        fill: "var(--color-processing)",
      },
      {
        status: "out_for_delivery",
        orders: data.out_for_delivery,
        fill: "var(--color-out_for_delivery)",
      },
      {
        status: "delivered",
        orders: data.delivered,
        fill: "var(--color-delivered)",
      },
      {
        status: "cancelled",
        orders: data.cancelled,
        fill: "var(--color-cancelled)",
      },
    ],
    [data]
  );

  const totalOrders = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.orders, 0);
  }, [chartData]);

  const deliveryRate = React.useMemo(() => {
    if (totalOrders === 0) return 0;
    return Math.round((data.delivered / totalOrders) * 100);
  }, [data.delivered, totalOrders]);

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          className="mx-auto aspect-square max-h-[280px]"
          config={chartConfig}
        >
          <PieChart>
            <ChartTooltip
              content={<ChartTooltipContent hideLabel />}
              cursor={false}
            />
            <Pie
              data={chartData}
              dataKey="orders"
              innerRadius={60}
              nameKey="status"
              strokeWidth={5}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        dominantBaseline="middle"
                        textAnchor="middle"
                        x={viewBox.cx}
                        y={viewBox.cy}
                      >
                        <tspan
                          className="fill-foreground font-bold text-3xl"
                          x={viewBox.cx}
                          y={viewBox.cy}
                        >
                          {totalOrders.toLocaleString()}
                        </tspan>
                        <tspan
                          className="fill-muted-foreground"
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                        >
                          Orders
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
            <ChartLegend
              className="-translate-y-2 flex-wrap gap-2 *:basis-1/3 *:justify-center"
              content={<ChartLegendContent nameKey="status" />}
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 font-medium leading-none">
          {deliveryRate}% delivery success rate
          <IconTrendingUp className="size-4 text-green-600 dark:text-green-400" />
        </div>
        <div className="text-muted-foreground leading-none">
          Based on orders this month
        </div>
      </CardFooter>
    </Card>
  );
}
