"use client"

import { RoleDashboardLayout } from "@/components/layout/role-dashboard-layout"

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <RoleDashboardLayout role="STUDENT">{children}</RoleDashboardLayout>
}
