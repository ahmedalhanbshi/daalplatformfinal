"use client"

import { usePathname } from "next/navigation"
import { RoleDashboardLayout } from "@/components/layout/role-dashboard-layout"

export default function TrainerLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const isFullBleedCourseDetails =
        pathname.startsWith("/trainer/courses/") || pathname.startsWith("/trainer/explore/course/")

    return (
        <RoleDashboardLayout role="TRAINER" contentMode={isFullBleedCourseDetails ? "fullBleed" : "default"}>
            {children}
        </RoleDashboardLayout>
    )
}

