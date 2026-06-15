"use client"

import { RoleDashboardLayout } from "@/components/layout/role-dashboard-layout"

export default function InstituteLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <RoleDashboardLayout role="INSTITUTE_ADMIN">{children}</RoleDashboardLayout>
}
