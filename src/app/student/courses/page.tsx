"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
export const dynamic = "force-dynamic"
import { ChevronDown, Heart, Users, CalendarDays } from "lucide-react"
import { trainerService, type ExploreCourse } from "@/lib/trainer-service"
import { studentService } from "@/lib/student-service"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0)
}

const FALLBACK_COURSE_IMAGE = "/images/course-web.png"

function resolveCourseImage(image?: string | null) {
  if (!image) return FALLBACK_COURSE_IMAGE

  const cleaned = image.trim().replace(/\\/g, "/")
  if (!cleaned) return FALLBACK_COURSE_IMAGE

  if (cleaned.startsWith("data:") || cleaned.startsWith("blob:")) return cleaned
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) return encodeURI(cleaned)

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"
  const normalized = cleaned.startsWith("/") ? cleaned : `/${cleaned}`
  return encodeURI(`${apiBase}${normalized}`)
}

function CourseImage({ src, alt }: { src: string; alt: string }) {
  const [currentSrc, setCurrentSrc] = useState(src)

  useEffect(() => {
    setCurrentSrc(src)
  }, [src])

  return (
    <Image
      src={currentSrc}
      alt={alt}
      fill
      unoptimized
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
      className="object-cover object-center"
      onError={() => {
        if (currentSrc !== FALLBACK_COURSE_IMAGE) setCurrentSrc(FALLBACK_COURSE_IMAGE)
      }}
    />
  )
}

function creatorName(course: any) {
  return course.trainer?.name || course.instructor?.name || course.institute?.name || course.providerName || "غير محدد"
}

function creatorAvatar(course: any) {
  const avatar =
    course.trainer?.avatar ||
    course.trainerAvatar ||
    course.instructor?.avatar ||
    course.institute?.logo ||
    course.instituteAvatar
  return resolveCourseImage(avatar || "")
}

function fallbackAvatarDataUri(name: string) {
  const letter = (name || "؟").trim().charAt(0) || "؟"
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='100%' height='100%' rx='32' fill='#DBEAFE'/><text x='50%' y='55%' text-anchor='middle' dominant-baseline='middle' font-family='Thmanyah Sans' font-size='28' font-weight='700' fill='#1D4ED8'>${letter}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: { label: string; value: string }[]
}) {
  return (
    <div className="relative">
      <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 min-w-[130px] appearance-none rounded-xl border border-slate-200 bg-white px-4 pl-8 text-sm font-semibold text-slate-700 outline-none hover:border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

interface StudentCoursesPageProps {
  basePath?: string
}

export function StudentCoursesPageContent(props: StudentCoursesPageProps) {
  const basePath = props.basePath ?? "/student/explore/course"
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [courses, setCourses] = useState<ExploreCourse[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])

  const q = searchParams.get("q") ?? ""
  const sort = searchParams.get("sort") ?? "newest"
  const category = searchParams.get("category") ?? "all"
  const price = searchParams.get("price") ?? "all"

  const effectiveSort = useMemo(() => {
    if (price === "high") return "price_high"
    if (price === "low") return "price_low"
    return sort
  }, [price, sort])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const data = await trainerService.getExploreCourses({
          q: q || undefined,
          category: category !== "all" ? category : undefined,
          sort: (effectiveSort as "newest" | "oldest" | "price_low" | "price_high") || "newest",
        })
        if (!cancelled) {
          setCourses(data.courses || [])
          setCategories(data.categories?.length ? data.categories : [{ id: "all", name: "الكل" }])
        }
      } catch {
        if (!cancelled) {
          setCourses([])
          setCategories([{ id: "all", name: "الكل" }])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [q, category, effectiveSort])

  useEffect(() => {
    if (!user?.id) {
      setFavoriteIds([])
      return
    }

    studentService
      .getWishlist()
      .then((data) => setFavoriteIds(data.map((item: any) => item.id)))
      .catch(() => {})
  }, [user?.id])

  const updateQuery = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (!value || value === "all") params.delete(key)
    else params.set(key, value)
    router.replace(`${pathname}?${params.toString()}`)
  }

  const toggleFavorite = async (id: string) => {
    if (!user?.id) {
      toast.error("يرجى تسجيل الدخول لإضافة الدورة إلى قائمة الرغبات")
      return
    }

    try {
      const result = await studentService.toggleWishlist(id)
      setFavoriteIds((prev) => (result.added ? [...prev, id] : prev.filter((item) => item !== id)))
      toast.success(result.added ? "تمت الإضافة إلى المفضلة" : "تمت الإزالة من المفضلة")
    } catch (error: any) {
      toast.error(error?.message || "حدث خطأ أثناء تحديث المفضلة")
    }
  }

  return (
    <section dir="rtl" className="min-h-full bg-transparent">
      <div className="mx-auto max-w-[1500px] -mt-3 space-y-3 bg-transparent pt-0 md:-mt-4 md:pt-0">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-3 shadow-[0_4px_14px_rgba(15,23,42,0.035)] md:px-4 md:py-3.5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <FilterSelect
                value={sort}
                onChange={(value) => updateQuery("sort", value)}
                options={[
                  { label: "الأحدث", value: "newest" },
                  { label: "الأقدم", value: "oldest" },
                ]}
              />

              <FilterSelect
                value={category}
                onChange={(value) => updateQuery("category", value)}
                options={[
                  { label: "كل التصنيفات", value: "all" },
                  ...categories.filter((cat) => cat.id !== "all").map((cat) => ({ label: cat.name, value: cat.id })),
                ]}
              />

              <FilterSelect
                value={price}
                onChange={(value) => updateQuery("price", value)}
                options={[
                  { label: "السعر", value: "all" },
                  { label: "الأعلى", value: "high" },
                  { label: "الأقل", value: "low" },
                ]}
              />
            </div>
            <p className="px-1 text-sm font-semibold text-slate-500 md:whitespace-nowrap">
              {loading ? "جارِ التحميل..." : `تم العثور على ${courses.length} دورات`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {!loading && courses.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
              <h3 className="text-lg font-extrabold text-slate-900">لا توجد دورات حاليًا</h3>
              <p className="mt-2 text-sm font-medium text-slate-500">ستظهر الدورات هنا بعد اعتماد ونشر الدورات من المدربين أو المعاهد.</p>
            </div>
          ) : null}

          {courses.map((course) => {
            const isFavorite = favoriteIds.includes(course.id)

            return (
              <article
                key={course.id}
                className="group flex h-full min-h-[390px] flex-col overflow-hidden rounded-lg border border-slate-200/90 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-slate-200/90 hover:shadow-[0_18px_36px_rgba(37,99,235,0.16)]"
              >
                <div className="relative h-[188px] overflow-hidden bg-slate-100 md:h-[196px]">
                  <CourseImage src={resolveCourseImage(course.image)} alt={course.title} />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/25 via-slate-900/10 to-transparent transition-opacity duration-300 group-hover:opacity-90" />

                  <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
                    {course.courseStatus === "PENDING_MINIMUM" || (course as any).status === "PENDING_MINIMUM" ? (
                      <span className="rounded-full border border-amber-200/50 bg-amber-500/90 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm backdrop-blur-[2px]">
                        بانتظار اكتمال العدد
                      </span>
                    ) : course.courseStatus === "ACTIVE" || (course as any).status === "ACTIVE" ? (
                      <span className="rounded-full border border-emerald-200/50 bg-emerald-500/90 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm backdrop-blur-[2px]">
                        مستمرة
                      </span>
                    ) : null}
                  </div>

                  <span className="absolute bottom-3 right-3 rounded-full bg-white/86 px-2.5 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur-[2px]">
                    {course.category || "الفئة"}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-3.5 text-right">
                  <div className="space-y-1">
                    <h3 className="line-clamp-2 text-[17px] font-extrabold leading-6 text-slate-900">{course.title}</h3>
                    <p className="line-clamp-2 text-[12px] leading-5 text-slate-600">{course.shortDescription || course.description}</p>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[12px] font-medium text-slate-600">
                    <div className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-slate-500" />
                      <span>{course.studentsCount} طالب</span>
                    </div>
                    <div className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
                      <span>{course.sessionsCount} جلسات</span>
                    </div>

                  </div>

                  <div className="mt-2 flex items-center justify-start gap-2 text-[12px] text-slate-600">
                    {course.staffTrainers && course.staffTrainers.length > 1 ? (
                        <div className="flex flex-col gap-2 w-full pt-1">
                            {course.staffTrainers.slice(0, 2).map((t, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="relative w-6 h-6 rounded-full overflow-hidden border border-slate-200 shrink-0">
                                        {t.avatar ? (
                                            <Image src={resolveCourseImage(t.avatar)} alt={t.name} fill className="object-cover" unoptimized={true} />
                                        ) : (
                                            <div className="w-full h-full bg-blue-100 flex items-center justify-center text-[9px] font-bold text-blue-600">
                                                {t.name.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-xs font-medium text-slate-600 truncate" title={t.name}>{t.name}</span>
                                </div>
                            ))}
                            {course.staffTrainers.length > 2 && (
                                <span className="text-[10px] font-medium text-slate-500 pr-1">+{course.staffTrainers.length - 2} مدربين آخرين</span>
                            )}
                        </div>
                    ) : (
                      <div className="inline-flex items-center gap-2">
                        <div className="relative h-6 w-6 overflow-hidden rounded-full border border-slate-200 bg-blue-100">
                          <Image
                            src={creatorAvatar(course) || fallbackAvatarDataUri(creatorName(course))}
                            alt={creatorName(course)}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <span className="line-clamp-1">{creatorName(course)}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-2.5">
                    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-1 pt-3">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`${basePath}/${course.id}`}
                          className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md bg-[#2563EB] px-4 text-sm font-bold text-white transition-colors hover:bg-blue-700"
                        >
                          عرض الدورة
                        </Link>
                        <button
                          type="button"
                          onClick={() => toggleFavorite(course.id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-red-500 shadow-sm transition-colors hover:bg-slate-50"
                          aria-label="إضافة إلى المفضلة"
                        >
                          <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
                        </button>
                      </div>
                      <p className="whitespace-nowrap text-[20px] font-extrabold leading-none tracking-tight text-[#2563EB]">
                        {formatPrice(course.price)} <span className="text-xs font-bold text-blue-500">ر.ي</span>
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default function StudentCoursesPage(props: StudentCoursesPageProps) {
  return (
    <Suspense fallback={null}>
      <StudentCoursesPageContent {...props} />
    </Suspense>
  )
}

