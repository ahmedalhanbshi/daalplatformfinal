import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const PROFILE_IMAGE_MAX_SIZE_MB = 6
export const PROFILE_IMAGE_MAX_SIZE_BYTES = PROFILE_IMAGE_MAX_SIZE_MB * 1024 * 1024

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isValidEmail(email: string): boolean {
  if (!email) return false;
  // A standard regex for basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function toLatinDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
  return toLatinDigits(new Intl.NumberFormat("en-US", options).format(value || 0))
}

export function formatDate(date: Date | string | number, options?: Intl.DateTimeFormatOptions) {
  const d = new Date(date)
  if (isNaN(d.getTime())) return 'تاريخ غير صالح'

  const formatter = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options
  })
  const parts = formatter.formatToParts(d)
  const day = parts.find(p => p.type === 'day')?.value
  const month = parts.find(p => p.type === 'month')?.value
  const year = parts.find(p => p.type === 'year')?.value

  return toLatinDigits(`${day} ${month} ${year}`)
}

export function getFileUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  const trimmedPath = path.trim().replace(/\\/g, "/")
  const lower = trimmedPath.toLowerCase()
  if (!trimmedPath || lower === "null" || lower === "undefined" || lower === "nan") {
    return undefined
  }
  if (trimmedPath.startsWith("http") || trimmedPath.startsWith("blob:")) return trimmedPath
  const cleanPath = trimmedPath.startsWith("/") ? trimmedPath : `/${trimmedPath}`
  return cleanPath.startsWith("/uploads/")
    ? cleanPath
    : cleanPath.startsWith("/uploads")
      ? cleanPath
      : `/uploads${cleanPath}`
}

export function formatTime(date: Date | string | number, options?: Intl.DateTimeFormatOptions) {
  const d = new Date(date)
  return toLatinDigits(d.toLocaleTimeString('ar-EG-u-nu-latn', {
    hour: '2-digit',
    minute: '2-digit',
    ...options
  }))
}
