"use client"

import { useParams } from "next/navigation"
import CourseStudentsManager from "@/components/courses/course-students-manager"

export default function InstituteCourseStudentsPage() {
  const params = useParams()
  const courseId = params.id as string

  return (
    <CourseStudentsManager 
      courseId={courseId} 
      backLink="/institute/courses"
      backText="العودة للدورات"
    />
  )
}
