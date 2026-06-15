"use client"

export const dynamic = "force-dynamic"

import { Suspense } from "react"
import { StudentCoursesPageContent } from "../student/courses/page"

export default function CoursesPage() {
  return (
    <Suspense fallback={null}>
      <StudentCoursesPageContent basePath="/courses" />
    </Suspense>
  )
}
