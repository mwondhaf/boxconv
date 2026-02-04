'use client'

import { Clock } from 'lucide-react'

import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Switch } from '~/components/ui/switch'

// =============================================================================
// Types
// =============================================================================

export interface DayHours {
  open: string // "08:00"
  close: string // "22:00"
  isClosed: boolean
}

export interface BusinessHours {
  monday: DayHours
  tuesday: DayHours
  wednesday: DayHours
  thursday: DayHours
  friday: DayHours
  saturday: DayHours
  sunday: DayHours
}

export interface OperatingHoursFormProps {
  value: BusinessHours
  onChange: (value: BusinessHours) => void
  disabled?: boolean
}

// =============================================================================
// Constants
// =============================================================================

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const

const DEFAULT_HOURS: DayHours = {
  open: '08:00',
  close: '22:00',
  isClosed: false,
}

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  monday: { ...DEFAULT_HOURS },
  tuesday: { ...DEFAULT_HOURS },
  wednesday: { ...DEFAULT_HOURS },
  thursday: { ...DEFAULT_HOURS },
  friday: { ...DEFAULT_HOURS },
  saturday: { ...DEFAULT_HOURS },
  sunday: { open: '10:00', close: '18:00', isClosed: false },
}

// =============================================================================
// Component
// =============================================================================

export function OperatingHoursForm({
  value,
  onChange,
  disabled = false,
}: OperatingHoursFormProps) {
  const handleDayChange = (
    day: keyof BusinessHours,
    field: keyof DayHours,
    fieldValue: string | boolean
  ) => {
    onChange({
      ...value,
      [day]: {
        ...value[day],
        [field]: fieldValue,
      },
    })
  }

  const handleApplyToAll = (sourceDay: keyof BusinessHours) => {
    const sourceHours = value[sourceDay]
    const newHours: BusinessHours = { ...value }

    for (const day of DAYS_OF_WEEK) {
      newHours[day.key] = { ...sourceHours }
    }

    onChange(newHours)
  }

  const handleApplyToWeekdays = (sourceDay: keyof BusinessHours) => {
    const sourceHours = value[sourceDay]
    const newHours: BusinessHours = { ...value }

    const weekdays: Array<keyof BusinessHours> = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
    ]

    for (const day of weekdays) {
      newHours[day] = { ...sourceHours }
    }

    onChange(newHours)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="size-5" />
          Operating Hours
        </CardTitle>
        <CardDescription>
          Set your store's operating hours for each day of the week.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 pb-4 border-b">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => handleApplyToAll('monday')}
          >
            Apply Monday to All
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => handleApplyToWeekdays('monday')}
          >
            Apply Monday to Weekdays
          </Button>
        </div>

        {/* Days Grid */}
        <div className="space-y-3">
          {DAYS_OF_WEEK.map(({ key, label }) => {
            const dayHours = value[key]

            return (
              <div
                key={key}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border bg-muted/30"
              >
                {/* Day Label & Closed Toggle */}
                <div className="flex items-center justify-between sm:w-32">
                  <Label className="font-medium">{label}</Label>
                  <div className="flex items-center gap-2 sm:hidden">
                    <Label htmlFor={`${key}-closed`} className="text-sm text-muted-foreground">
                      Closed
                    </Label>
                    <Switch
                      id={`${key}-closed`}
                      checked={dayHours.isClosed}
                      onCheckedChange={(checked) =>
                        handleDayChange(key, 'isClosed', checked)
                      }
                      disabled={disabled}
                    />
                  </div>
                </div>

                {/* Time Inputs */}
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-2 flex-1">
                    <Label htmlFor={`${key}-open`} className="sr-only">
                      Opening time
                    </Label>
                    <Input
                      id={`${key}-open`}
                      type="time"
                      value={dayHours.open}
                      onChange={(e) => handleDayChange(key, 'open', e.target.value)}
                      disabled={disabled || dayHours.isClosed}
                      className="w-full sm:w-28"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Label htmlFor={`${key}-close`} className="sr-only">
                      Closing time
                    </Label>
                    <Input
                      id={`${key}-close`}
                      type="time"
                      value={dayHours.close}
                      onChange={(e) => handleDayChange(key, 'close', e.target.value)}
                      disabled={disabled || dayHours.isClosed}
                      className="w-full sm:w-28"
                    />
                  </div>
                </div>

                {/* Closed Toggle (Desktop) */}
                <div className="hidden sm:flex items-center gap-2">
                  <Switch
                    id={`${key}-closed-desktop`}
                    checked={dayHours.isClosed}
                    onCheckedChange={(checked) =>
                      handleDayChange(key, 'isClosed', checked)
                    }
                    disabled={disabled}
                  />
                  <Label
                    htmlFor={`${key}-closed-desktop`}
                    className="text-sm text-muted-foreground w-14"
                  >
                    {dayHours.isClosed ? 'Closed' : 'Open'}
                  </Label>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Parse business hours from a JSON object (from database).
 */
export function parseBusinessHours(data: unknown): BusinessHours {
  if (!data || typeof data !== 'object') {
    return DEFAULT_BUSINESS_HOURS
  }

  const hours = data as Record<string, unknown>
  const result: BusinessHours = { ...DEFAULT_BUSINESS_HOURS }

  for (const day of DAYS_OF_WEEK) {
    const dayData = hours[day.key]
    if (dayData && typeof dayData === 'object') {
      const d = dayData as Record<string, unknown>
      result[day.key] = {
        open: typeof d.open === 'string' ? d.open : DEFAULT_HOURS.open,
        close: typeof d.close === 'string' ? d.close : DEFAULT_HOURS.close,
        isClosed: typeof d.isClosed === 'boolean' ? d.isClosed : false,
      }
    }
  }

  return result
}

/**
 * Check if the store is currently open based on business hours.
 */
export function isStoreOpen(
  hours: BusinessHours,
  timezone: string = 'UTC'
): boolean {
  const now = new Date()

  // Get current day and time in the store's timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(now)
  const weekday = parts.find((p) => p.type === 'weekday')?.value?.toLowerCase()
  const hour = parts.find((p) => p.type === 'hour')?.value
  const minute = parts.find((p) => p.type === 'minute')?.value

  if (!weekday || !hour || !minute) {
    return false
  }

  const dayKey = weekday as keyof BusinessHours
  const dayHours = hours[dayKey]

  if (!dayHours || dayHours.isClosed) {
    return false
  }

  const currentTime = `${hour}:${minute}`
  return currentTime >= dayHours.open && currentTime <= dayHours.close
}

/**
 * Format business hours for display.
 */
export function formatBusinessHours(hours: BusinessHours): string[] {
  const lines: string[] = []

  for (const day of DAYS_OF_WEEK) {
    const dayHours = hours[day.key]
    if (dayHours.isClosed) {
      lines.push(`${day.label}: Closed`)
    } else {
      lines.push(`${day.label}: ${dayHours.open} - ${dayHours.close}`)
    }
  }

  return lines
}
