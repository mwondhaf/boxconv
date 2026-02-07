"use client";

import { useMutation } from "@tanstack/react-query";
import { useConvexMutation, useConvexQuery } from "@convex-dev/react-query";
import { MapPin, Plus, Receipt, Trash2 } from "lucide-react";
import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { ZoneFormSheet, type ZoneData } from "../components/zone-form-sheet";
import { RuleFormSheet, type RuleData } from "../components/rule-form-sheet";

// =============================================================================
// Types
// =============================================================================

type Zone = {
  _id: Id<"deliveryZones">;
  name: string;
  city: string;
  country: string;
  centerLat: number;
  centerLng: number;
  maxDistanceMeters: number;
  color?: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
};

type Rule = {
  _id: Id<"pricingRules">;
  zoneId?: Id<"deliveryZones">;
  name: string;
  baseFee: number;
  ratePerKm: number;
  minFee: number;
  surgeMultiplier: number;
  daysOfWeek?: number[];
  startHour?: number;
  endHour?: number;
  status: "active" | "inactive";
  createdAt: number;
  updatedAt: number;
  zoneName?: string | null;
  zoneCity?: string | null;
};

// =============================================================================
// Helpers
// =============================================================================

function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatCurrency(amount: number): string {
  return `UGX ${amount.toLocaleString()}`;
}

function formatDays(days?: number[]): string {
  if (!days || days.length === 0) return "All days";
  if (days.length === 7) return "All days";

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days.map((d) => dayNames[d]).join(", ");
}

function formatHours(start?: number, end?: number): string {
  if (start === undefined && end === undefined) return "All hours";
  const startStr = start !== undefined ? `${start}:00` : "00:00";
  const endStr = end !== undefined ? `${end}:00` : "23:59";
  return `${startStr} - ${endStr}`;
}

// =============================================================================
// Component
// =============================================================================

export function AdminPricingPage() {
  // State
  const [zoneFormOpen, setZoneFormOpen] = React.useState(false);
  const [ruleFormOpen, setRuleFormOpen] = React.useState(false);
  const [editingZone, setEditingZone] = React.useState<ZoneData | null>(null);
  const [editingRule, setEditingRule] = React.useState<RuleData | null>(null);
  const [deleteZone, setDeleteZone] = React.useState<Zone | null>(null);
  const [deleteRule, setDeleteRule] = React.useState<Rule | null>(null);

  // Queries
  const zones = useConvexQuery(api.deliveryZones.list, {});
  const rules = useConvexQuery(api.pricingRules.list, {});

  // Mutations
  const deleteZoneMutation = useMutation({
    mutationFn: useConvexMutation(api.deliveryZones.remove),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: useConvexMutation(api.pricingRules.remove),
  });

  // Handlers
  const handleEditZone = (zone: Zone) => {
    setEditingZone({
      _id: zone._id,
      name: zone.name,
      city: zone.city,
      country: zone.country,
      centerLat: zone.centerLat,
      centerLng: zone.centerLng,
      maxDistanceMeters: zone.maxDistanceMeters,
      color: zone.color,
      active: zone.active,
    });
    setZoneFormOpen(true);
  };

  const handleEditRule = (rule: Rule) => {
    setEditingRule({
      _id: rule._id,
      zoneId: rule.zoneId,
      name: rule.name,
      baseFee: rule.baseFee,
      ratePerKm: rule.ratePerKm,
      minFee: rule.minFee,
      surgeMultiplier: rule.surgeMultiplier,
      daysOfWeek: rule.daysOfWeek,
      startHour: rule.startHour,
      endHour: rule.endHour,
      status: rule.status,
    });
    setRuleFormOpen(true);
  };

  const handleDeleteZoneConfirm = async () => {
    if (!deleteZone) return;
    try {
      await deleteZoneMutation.mutateAsync({ id: deleteZone._id });
    } catch (error) {
      console.error("Failed to delete zone:", error);
    }
    setDeleteZone(null);
  };

  const handleDeleteRuleConfirm = async () => {
    if (!deleteRule) return;
    try {
      await deleteRuleMutation.mutateAsync({ id: deleteRule._id });
    } catch (error) {
      console.error("Failed to delete rule:", error);
    }
    setDeleteRule(null);
  };

  const handleZoneFormClose = (open: boolean) => {
    setZoneFormOpen(open);
    if (!open) setEditingZone(null);
  };

  const handleRuleFormClose = (open: boolean) => {
    setRuleFormOpen(open);
    if (!open) setEditingRule(null);
  };

  const zonesLoading = zones === undefined;
  const rulesLoading = rules === undefined;

  // Create zone map for displaying zone names in rules
  const zoneMap = new Map(zones?.map((z) => [z._id, z]) ?? []);

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="font-bold text-2xl">Delivery Pricing</h1>
        <p className="text-muted-foreground">
          Manage delivery zones and pricing rules for distance-based fees
        </p>
      </div>

      {/* Delivery Zones Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="size-5" />
              Delivery Zones
            </CardTitle>
            <Button
              onClick={() => {
                setEditingZone(null);
                setZoneFormOpen(true);
              }}
              size="sm"
            >
              <Plus className="mr-1.5 size-4" />
              Add Zone
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {zonesLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading zones...
            </div>
          ) : zones?.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No delivery zones configured yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Max Distance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones?.map((zone) => (
                  <TableRow key={zone._id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {zone.color && (
                          <div
                            className="size-3 rounded-full"
                            style={{ backgroundColor: zone.color }}
                          />
                        )}
                        <span className="font-medium">{zone.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{zone.city}</TableCell>
                    <TableCell>{zone.country}</TableCell>
                    <TableCell>{formatDistance(zone.maxDistanceMeters)}</TableCell>
                    <TableCell>
                      <Badge variant={zone.active ? "default" : "secondary"}>
                        {zone.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => handleEditZone(zone)}
                          size="sm"
                          variant="outline"
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => setDeleteZone(zone)}
                          size="sm"
                          variant="destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pricing Rules Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="size-5" />
              Pricing Rules
            </CardTitle>
            <Button
              onClick={() => {
                setEditingRule(null);
                setRuleFormOpen(true);
              }}
              size="sm"
            >
              <Plus className="mr-1.5 size-4" />
              Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rulesLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading rules...
            </div>
          ) : rules?.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No pricing rules configured yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Base Fee</TableHead>
                  <TableHead>Rate/km</TableHead>
                  <TableHead>Min Fee</TableHead>
                  <TableHead>Surge</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules?.map((rule) => {
                  const zone = rule.zoneId ? zoneMap.get(rule.zoneId) : null;
                  return (
                    <TableRow key={rule._id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>
                        {zone ? (
                          <span>
                            {zone.name} ({zone.city})
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            All zones
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{formatCurrency(rule.baseFee)}</TableCell>
                      <TableCell>{formatCurrency(rule.ratePerKm)}</TableCell>
                      <TableCell>{formatCurrency(rule.minFee)}</TableCell>
                      <TableCell>
                        {rule.surgeMultiplier !== 1.0 ? (
                          <Badge variant="outline">
                            {rule.surgeMultiplier}x
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">1.0x</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatDays(rule.daysOfWeek)}</div>
                          <div className="text-muted-foreground text-xs">
                            {formatHours(rule.startHour, rule.endHour)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            rule.status === "active" ? "default" : "secondary"
                          }
                        >
                          {rule.status === "active" ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => handleEditRule(rule)}
                            size="sm"
                            variant="outline"
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => setDeleteRule(rule)}
                            size="sm"
                            variant="destructive"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Zone Form Sheet */}
      <ZoneFormSheet
        onOpenChange={handleZoneFormClose}
        open={zoneFormOpen}
        zone={editingZone}
      />

      {/* Rule Form Sheet */}
      <RuleFormSheet
        onOpenChange={handleRuleFormClose}
        open={ruleFormOpen}
        rule={editingRule}
      />

      {/* Delete Zone Confirmation */}
      <AlertDialog
        onOpenChange={() => setDeleteZone(null)}
        open={!!deleteZone}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Delivery Zone</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteZone?.name}"? This action
              cannot be undone. Any pricing rules linked to this zone must be
              deleted first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteZoneConfirm}
            >
              Delete Zone
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Rule Confirmation */}
      <AlertDialog
        onOpenChange={() => setDeleteRule(null)}
        open={!!deleteRule}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pricing Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteRule?.name}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteRuleConfirm}
            >
              Delete Rule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AdminPricingPage;
