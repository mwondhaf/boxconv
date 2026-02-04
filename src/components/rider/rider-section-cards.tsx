import {
  IconCash,
  IconClock,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react";

import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export interface RiderStatsData {
  activeDeliveries: {
    value: number;
    inProgress: number;
  };
  pendingAssignments: {
    value: number;
    awaitingPickup: number;
  };
  completedToday: {
    value: number;
    trend: number;
    isPositive: boolean;
  };
  todaysEarnings: {
    value: string;
    trend: number;
    isPositive: boolean;
  };
}

interface RiderSectionCardsProps {
  data?: RiderStatsData;
  isOnline?: boolean;
}

// Default demo data
const defaultData: RiderStatsData = {
  activeDeliveries: {
    value: 2,
    inProgress: 2,
  },
  pendingAssignments: {
    value: 5,
    awaitingPickup: 3,
  },
  completedToday: {
    value: 12,
    trend: 25,
    isPositive: true,
  },
  todaysEarnings: {
    value: "UGX 85,000",
    trend: 15.5,
    isPositive: true,
  },
};

export function RiderSectionCards({
  data = defaultData,
  isOnline = true,
}: RiderSectionCardsProps) {
  return (
    <div className="grid @5xl/main:grid-cols-4 @xl/main:grid-cols-2 grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 dark:*:data-[slot=card]:bg-card">
      {/* Active Deliveries Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Deliveries</CardDescription>
          <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
            {data.activeDeliveries.value}
          </CardTitle>
          <CardAction>
            <Badge
              className={
                isOnline
                  ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
              }
              variant="outline"
            >
              <span className="relative flex size-2">
                {isOnline && (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex size-2 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-500"}`}
                />
              </span>
              {isOnline ? "Online" : "Offline"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <IconClock className="size-4" />
            {data.activeDeliveries.inProgress} in progress
          </div>
          <div className="text-muted-foreground">Currently being delivered</div>
        </CardFooter>
      </Card>

      {/* Pending Assignments Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Pending Assignments</CardDescription>
          <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
            {data.pendingAssignments.value}
          </CardTitle>
          <CardAction>
            {data.pendingAssignments.value > 0 ? (
              <Badge
                className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                variant="outline"
              >
                Action needed
              </Badge>
            ) : (
              <Badge variant="outline">All clear</Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {data.pendingAssignments.awaitingPickup} awaiting pickup
          </div>
          <div className="text-muted-foreground">
            Orders ready for collection
          </div>
        </CardFooter>
      </Card>

      {/* Completed Today Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Completed Today</CardDescription>
          <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
            {data.completedToday.value}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {data.completedToday.isPositive ? (
                <IconTrendingUp className="text-green-600 dark:text-green-400" />
              ) : (
                <IconTrendingDown className="text-red-600 dark:text-red-400" />
              )}
              {data.completedToday.isPositive ? "+" : ""}
              {data.completedToday.trend}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {data.completedToday.isPositive ? "Great progress!" : "Keep going!"}
            {data.completedToday.isPositive ? (
              <IconTrendingUp className="size-4 text-green-600 dark:text-green-400" />
            ) : (
              <IconTrendingDown className="size-4 text-red-600 dark:text-red-400" />
            )}
          </div>
          <div className="text-muted-foreground">
            Deliveries completed today
          </div>
        </CardFooter>
      </Card>

      {/* Today's Earnings Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Today's Earnings</CardDescription>
          <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
            {data.todaysEarnings.value}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconCash className="text-green-600 dark:text-green-400" />
              {data.todaysEarnings.isPositive ? "+" : ""}
              {data.todaysEarnings.trend}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {data.todaysEarnings.isPositive
              ? "Earnings up!"
              : "Keep delivering!"}
            {data.todaysEarnings.isPositive ? (
              <IconTrendingUp className="size-4 text-green-600 dark:text-green-400" />
            ) : (
              <IconTrendingDown className="size-4 text-red-600 dark:text-red-400" />
            )}
          </div>
          <div className="text-muted-foreground">Before tips and bonuses</div>
        </CardFooter>
      </Card>
    </div>
  );
}
