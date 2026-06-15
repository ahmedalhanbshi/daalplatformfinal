"use server"

export type RegistrationStatus =
  | "NONE"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "PAYMENT_PENDING"
  | "PAYMENT_CONFIRMED"
  | "ENROLLED"
  | "REJECTED"

export type RegistrationRecord = {
  userId: string
  courseId: string
  fullName: string
  email: string
  phone: string
  status: RegistrationStatus
  createdAt: string
  updatedAt: string
}

declare global {
  var __courseRegistrationStore: Map<string, RegistrationRecord> | undefined
}

const store =
  globalThis.__courseRegistrationStore ??
  new Map<string, RegistrationRecord>()

if (!globalThis.__courseRegistrationStore) {
  globalThis.__courseRegistrationStore = store
}

const buildKey = (userId: string, courseId: string) => `${userId}:${courseId}`

export const getRegistrationStatus = (
  userId: string,
  courseId: string
): RegistrationStatus => {
  return store.get(buildKey(userId, courseId))?.status ?? "NONE"
}

export const upsertRegistration = ({
  userId,
  courseId,
  fullName,
  email,
  phone,
  status
}: Omit<RegistrationRecord, "createdAt" | "updatedAt">) => {
  const now = new Date().toISOString()
  const key = buildKey(userId, courseId)
  const existing = store.get(key)

  const record: RegistrationRecord = {
    userId,
    courseId,
    fullName,
    email,
    phone,
    status,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  }

  store.set(key, record)
  return record
}

export const setRegistrationStatus = (
  userId: string,
  courseId: string,
  status: RegistrationStatus
) => {
  const now = new Date().toISOString()
  const key = buildKey(userId, courseId)
  const existing = store.get(key)

  const record: RegistrationRecord = {
    userId,
    courseId,
    fullName: existing?.fullName ?? "",
    email: existing?.email ?? "",
    phone: existing?.phone ?? "",
    status,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  }

  store.set(key, record)
  return record
}
