"use client"

import { RoleDashboardLayout } from "@/components/layout/role-dashboard-layout"

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <RoleDashboardLayout role="PLATFORM_ADMIN">{children}</RoleDashboardLayout>
}
