"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

export default function InstituteCourseEditRedirectPage() {
  const params = useParams()
  const router = useRouter()

  useEffect(() => {
    const id = params?.id as string
    if (!id) return
    router.replace(`/institute/courses/create?editId=${id}`)
  }, [params, router])

  return null
}

