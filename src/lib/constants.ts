/**
 * Application constants for BoxKuBox
 */

// Currency settings
export const CURRENCY = 'UGX' as const
export const CURRENCY_SYMBOL = 'USh'
export const CURRENCY_LOCALE = 'en-UG'

// Timezone settings
export const TIMEZONE = 'Africa/Kampala' as const

// Order settings
export const DEFAULT_ORDER_PREFIX = 'ORD-'
export const DEFAULT_TAX_RATE = 0.18 // 18% VAT in Uganda
export const DEFAULT_DELIVERY_FEE = 5000 // UGX

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

// Date format settings
export const DATE_FORMAT = 'dd/MM/yyyy'
export const DATE_TIME_FORMAT = 'dd/MM/yyyy HH:mm'
export const TIME_FORMAT = 'HH:mm'

// Phone settings (Uganda)
export const PHONE_COUNTRY_CODE = '+256'
export const PHONE_REGEX = /^(\+256|0)?[37]\d{8}$/

/**
 * Format currency amount for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format date for display using the app timezone
 */
export function formatDate(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date) : date
  return d.toLocaleDateString(CURRENCY_LOCALE, {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Format datetime for display using the app timezone
 */
export function formatDateTime(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date) : date
  return d.toLocaleString(CURRENCY_LOCALE, {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
