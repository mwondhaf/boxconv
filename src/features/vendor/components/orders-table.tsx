"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Id } from "convex/_generated/dataModel";
import {
  CheckCircle,
  ChefHat,
  Eye,
  MoreHorizontal,
  Package,
  Truck,
  XCircle,
} from "lucide-react";
import * as React from "react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";
import { DataTable, SortableHeader } from "~/shared/components/data-table";

// =============================================================================
// Types
// =============================================================================

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled"
  | "canceled"
  | "refunded";

export type FulfillmentType = "delivery" | "pickup" | "self_delivery";

export type PaymentStatus = "awaiting" | "captured" | "refunded" | "canceled";

export interface Order {
  _id: Id<"orders">;
  displayId: number;
  status: OrderStatus;
  fulfillmentStatus?: string;
  paymentStatus?: PaymentStatus;
  fulfillmentType?: FulfillmentType;
  total: number;
  taxTotal: number;
  discountTotal: number;
  deliveryTotal: number;
  currencyCode: string;
  customerClerkId: string;
  riderId?: string;
  riderName?: string;
  riderPhone?: string;
  _creationTime: number;
  items?: Array<{
    title: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  itemCount?: number;
  deliveryAddress?: {
    name?: string;
    phone?: string;
    address?: string;
  } | null;
}

interface OrdersTableProps {
  data: Array<Order>;
  isLoading?: boolean;
  onView: (order: Order) => void;
  onConfirm?: (order: Order) => void;
  onStartPreparing?: (order: Order) => void;
  onMarkReady?: (order: Order) => void;
  onCancel?: (order: Order) => void;
  showCustomer?: boolean;
}

// =============================================================================
// Status Configuration
// =============================================================================

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  pending: {
    label: "Pending",
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    dot: "bg-yellow-500",
  },
  confirmed: {
    label: "Confirmed",
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  preparing: {
    label: "Preparing",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    dot: "bg-indigo-500",
  },
  ready_for_pickup: {
    label: "Ready",
    bg: "bg-purple-50",
    text: "text-purple-700",
    dot: "bg-purple-500",
  },
  out_for_delivery: {
    label: "Out for Delivery",
    bg: "bg-cyan-50",
    text: "text-cyan-700",
    dot: "bg-cyan-500",
  },
  delivered: {
    label: "Delivered",
    bg: "bg-green-50",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  completed: {
    label: "Completed",
    bg: "bg-green-50",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
  },
  canceled: {
    label: "Cancelled",
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
  },
  refunded: {
    label: "Refunded",
    bg: "bg-gray-50",
    text: "text-gray-700",
    dot: "bg-gray-500",
  },
};

const FULFILLMENT_CONFIG: Record<
  FulfillmentType,
  { label: string; icon: string }
> = {
  delivery: { label: "Delivery", icon: "🚴" },
  pickup: { label: "Pickup", icon: "🏪" },
  self_delivery: { label: "Self Delivery", icon: "🚗" },
};

// =============================================================================
// Helper Functions
// =============================================================================

function formatCurrency(amount: number, currency = "UGX"): string {
  if (currency === "UGX") {
    return `UGX ${amount.toLocaleString()}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// =============================================================================
// Sub-components
// =============================================================================

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium text-xs",
        config.bg,
        config.text
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}

function FulfillmentTypeBadge({ type }: { type: FulfillmentType }) {
  const config = FULFILLMENT_CONFIG[type] ?? FULFILLMENT_CONFIG.delivery;
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}

// =============================================================================
// Column Definitions
// =============================================================================

function createColumns(
  onView: (order: Order) => void,
  onConfirm: ((order: Order) => void) | undefined,
  onStartPreparing: ((order: Order) => void) | undefined,
  onMarkReady: ((order: Order) => void) | undefined,
  onCancel: ((order: Order) => void) | undefined,
  showCustomer: boolean
): Array<ColumnDef<Order>> {
  const columns: Array<ColumnDef<Order>> = [
    {
      accessorKey: "displayId",
      header: ({ column }) => (
        <SortableHeader column={column}>Order</SortableHeader>
      ),
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium font-mono">#{order.displayId}</span>
            <span className="text-muted-foreground text-xs">
              {order.itemCount ?? order.items?.length ?? 0} item
              {(order.itemCount ?? order.items?.length ?? 0) !== 1 ? "s" : ""}
            </span>
          </div>
        );
      },
    },
  ];

  if (showCustomer) {
    columns.push({
      accessorKey: "customer",
      header: "Customer",
      cell: ({ row }) => {
        const order = row.original;
        const address = order.deliveryAddress;
        return (
          <div className="flex flex-col">
            <span className="font-medium text-sm">
              {address?.name ?? "Customer"}
            </span>
            {address?.phone && (
              <span className="text-muted-foreground text-xs">
                {address.phone}
              </span>
            )}
          </div>
        );
      },
    });
  }

  columns.push(
    {
      accessorKey: "total",
      header: ({ column }) => (
        <SortableHeader column={column}>Total</SortableHeader>
      ),
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium">
              {formatCurrency(order.total, order.currencyCode)}
            </span>
            {order.deliveryTotal > 0 && (
              <span className="text-muted-foreground text-xs">
                +{formatCurrency(order.deliveryTotal, order.currencyCode)}{" "}
                delivery
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const order = row.original;
        return <OrderStatusBadge status={order.status} />;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: "fulfillmentType",
      header: "Type",
      cell: ({ row }) => {
        const order = row.original;
        return order.fulfillmentType ? (
          <FulfillmentTypeBadge type={order.fulfillmentType} />
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "rider",
      header: "Rider",
      cell: ({ row }) => {
        const order = row.original;
        if (!order.riderId) {
          return order.fulfillmentType === "delivery" &&
            order.status === "ready_for_pickup" ? (
            <span className="font-medium text-amber-600 text-xs">
              Needs rider
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        }
        return (
          <div className="flex flex-col">
            <span className="font-medium text-sm">{order.riderName}</span>
            {order.riderPhone && (
              <span className="text-muted-foreground text-xs">
                {order.riderPhone}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "_creationTime",
      header: ({ column }) => (
        <SortableHeader column={column}>Time</SortableHeader>
      ),
      cell: ({ row }) => {
        const timestamp = row.getValue("_creationTime") as number;
        return (
          <span className="text-muted-foreground text-sm">
            {formatRelativeTime(timestamp)}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      cell: ({ row }) => {
        const order = row.original;
        const canConfirm = order.status === "pending";
        const canPrepare = order.status === "confirmed";
        const canMarkReady = order.status === "preparing";
        const canCancel = ["pending", "confirmed", "preparing"].includes(
          order.status
        );

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(order)}>
                <Eye className="mr-2 size-4" />
                View Details
              </DropdownMenuItem>

              {canConfirm && onConfirm && (
                <DropdownMenuItem onClick={() => onConfirm(order)}>
                  <CheckCircle className="mr-2 size-4" />
                  Confirm Order
                </DropdownMenuItem>
              )}

              {canPrepare && onStartPreparing && (
                <DropdownMenuItem onClick={() => onStartPreparing(order)}>
                  <ChefHat className="mr-2 size-4" />
                  Start Preparing
                </DropdownMenuItem>
              )}

              {canMarkReady && onMarkReady && (
                <DropdownMenuItem onClick={() => onMarkReady(order)}>
                  <Truck className="mr-2 size-4" />
                  Mark Ready
                </DropdownMenuItem>
              )}

              {canCancel && onCancel && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onCancel(order)}
                  >
                    <XCircle className="mr-2 size-4" />
                    Cancel Order
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    }
  );

  return columns;
}

// =============================================================================
// OrdersTable Component
// =============================================================================

export function OrdersTable({
  data,
  isLoading,
  onView,
  onConfirm,
  onStartPreparing,
  onMarkReady,
  onCancel,
  showCustomer = true,
}: OrdersTableProps) {
  const columns = React.useMemo(
    () =>
      createColumns(
        onView,
        onConfirm,
        onStartPreparing,
        onMarkReady,
        onCancel,
        showCustomer
      ),
    [onView, onConfirm, onStartPreparing, onMarkReady, onCancel, showCustomer]
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      emptyState={
        <div className="flex flex-col items-center gap-2 py-8">
          <Package className="size-10 text-muted-foreground" />
          <p className="font-medium text-muted-foreground">No orders found</p>
          <p className="text-muted-foreground text-sm">
            Orders will appear here when customers place them.
          </p>
        </div>
      }
      getRowId={(row) => row._id}
      isLoading={isLoading}
      loadingState={
        <div className="flex items-center justify-center gap-2 py-8">
          <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-muted-foreground">Loading orders...</span>
        </div>
      }
      pageSize={20}
      searchColumn="displayId"
      searchPlaceholder="Search by order #..."
      showColumnToggle={false}
      showPagination={true}
      showSearch={true}
    />
  );
}

export default OrdersTable;
