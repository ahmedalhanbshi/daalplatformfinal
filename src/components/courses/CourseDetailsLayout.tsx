"use client"

import React from "react"
import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getFileUrl } from "@/lib/utils"
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  Globe,
  Heart,
  Mail,
  Phone,
  Rocket,
  Tag,
  UserCircle2,
  Users,
} from "lucide-react"

export interface CourseDetailsLayoutProps {
  courseData: Record<string, unknown>
  instructorData: Record<string, unknown>
  primaryAction?: React.ReactNode
  backLink?: string
}

function resolveImage(src?: string | null, fallback = "/images/course-web.png") {
  if (!src) return fallback
  return getFileUrl(src) || fallback
}

function formatYER(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0)
}

function fixText(value?: string | null) {
  if (!value) return ""
  return value.replace(/\uFFFD/g, "")
}

function formatDate(date?: string) {
  if (!date) return "غير محدد"
  try {
    return new Date(date).toLocaleDateString("ar-EG-u-nu-latn", { day: "numeric", month: "long", year: "numeric" })
  } catch {
    return date
  }
}

export function CourseDetailsLayout({
  courseData,
  instructorData,
  primaryAction,
  backLink = "/student/my-courses",
}: CourseDetailsLayoutProps) {
  const instructor = instructorData as {
    name?: string | null
    bio?: string | null
    specialties?: unknown
    phone?: string | null
    email?: string | null
    avatar?: string | null
  }
  const maxStudents = Number(courseData.maxStudents ?? 0)
  const enrolledStudents = Number(courseData.enrolledStudents ?? courseData.enrolledCount ?? 0)
  const availableSeats = Math.max(0, maxStudents - enrolledStudents)
  const tagsRaw = courseData.tags
  const tags = Array.isArray(tagsRaw) && tagsRaw.length > 0 ? tagsRaw : ["Figma", "UI Design", "UX Design", "Prototyping"]
  const category = fixText(typeof courseData.category === "string" ? courseData.category : "") || "Design & Creative"
  const price = Number(courseData.price ?? 450)
  const title = fixText(typeof courseData.title === "string" ? courseData.title : "") || "UI/UX Design Masterclass"
  const shortDescription = fixText(typeof courseData.shortDescription === "string" ? courseData.shortDescription : "") || "دورة شاملة لتعلم تصميم تجربة وواجهة المستخدم من الصفر حتى الاحتراف."
  const description =
    fixText(typeof courseData.description === "string" ? courseData.description : "") ||
    "دليل شامل لتصميم واجهات المستخدم وتجربة المستخدم من الفكرة إلى التنفيذ، باستخدام أفضل الممارسات والأدوات الحديثة."
  const startDate = formatDate(typeof courseData.startDate === "string" ? courseData.startDate : undefined)
  const endDate = formatDate(typeof courseData.endDate === "string" ? courseData.endDate : undefined)
  const duration = fixText(typeof courseData.duration === "string" ? courseData.duration : "") || "5 أسابيع"
  const courseImage = typeof courseData.image === "string" ? courseData.image : null
  const enrolledCount = enrolledStudents
  const objectivesRaw = courseData.objectives
  const objectives = Array.isArray(objectivesRaw) && objectivesRaw.length > 0
    ? objectivesRaw.map((x) => fixText(typeof x === "string" ? x : ""))
    : ["فهم أساسيات UX/UI Design", "تطبيق عملي على مشاريع حقيقية", "بناء معرض أعمال احترافي"]
  const learnItems = objectives.length > 4 ? objectives.slice(0, 5) : [
    ...objectives,
    "اختبار التصميم وتحسين تجربة المستخدم",
    "تصميم أنظمة واجهات متكاملة وقابلة للتوسع",
  ].slice(0, 5)
  const prerequisitesRaw = courseData.prerequisites
  const prerequisites = Array.isArray(prerequisitesRaw) ? prerequisitesRaw.map((x) => fixText(typeof x === "string" ? x : "")).filter(Boolean) : []
  const instructorName = fixText(typeof instructor.name === "string" ? instructor.name : "") || "د. نادية يوسف"
  const instructorBio = fixText(typeof instructor.bio === "string" ? instructor.bio : "") || "مدرب متخصص بخبرة عملية في تصميم المنتجات الرقمية وتجارب المستخدم."
  const instructorSpecialtiesRaw = instructor.specialties
  const instructorSpecialties: string[] = Array.isArray(instructorSpecialtiesRaw)
    ? instructorSpecialtiesRaw.map((s) => fixText(typeof s === "string" ? s : "")).filter(Boolean)
    : []

  return (
    <div className="min-h-screen bg-[#F5F7FB] text-right" dir="rtl" lang="ar">
      <div className="mx-auto max-w-7xl space-y-6 px-4 pb-8 pt-6 md:px-8">
        <section className="relative overflow-hidden rounded-[24px] bg-gradient-to-l from-[#0F172A] via-[#172554] to-[#1E1B4B] px-6 py-8 shadow-sm md:px-8 md:py-9">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/5 blur-2xl" />
          <div className="pointer-events-none absolute -left-10 bottom-0 h-48 w-48 rounded-full bg-blue-300/10 blur-2xl" />

          <div className="flex flex-col gap-6 lg:flex-row-reverse lg:items-start lg:justify-between">
            <div className="space-y-5 text-white lg:flex-1">
              <div className="flex items-center justify-between">
                <Button
                  asChild
                  variant="outline"
                  className="h-10 rounded-xl border-none bg-[#FACC15] px-4 font-bold text-[#111827] hover:bg-[#eab308]"
                >
                  <Link href={backLink}>
                    <ArrowRight className="ml-2 h-4 w-4" />
                    العودة للاستكشاف
                  </Link>
                </Button>
                <Badge className="border border-white/20 bg-white/10 text-white">{category}</Badge>
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-extrabold leading-tight text-white md:text-4xl">{title}</h1>
                <p className="max-w-3xl text-sm leading-8 text-white/80 md:text-base">{shortDescription}</p>
              </div>

              <div className="text-sm font-medium text-white/95">{enrolledCount} طالب مسجل</div>

              <div className="h-px w-full bg-white/15" />

              <div className="grid gap-4 text-white sm:grid-cols-2">
                <div className="flex flex-row-reverse items-center justify-end gap-2 text-right">
                  <Users className="h-4 w-4 text-blue-200" />
                  <span>{availableSeats} مقعد متاح</span>
                </div>
                <div className="flex flex-row-reverse items-center justify-end gap-2 text-right">
                  <Clock className="h-4 w-4 text-blue-200" />
                  <span>المدة: {duration}</span>
                </div>
                <div className="flex flex-row-reverse items-center justify-end gap-2 text-right">
                  <Calendar className="h-4 w-4 text-blue-200" />
                  <span>{startDate} - {endDate}</span>
                </div>
                <div className="flex flex-row-reverse items-center justify-end gap-2 text-right">
                  <Globe className="h-4 w-4 text-blue-200" />
                  <span>{courseData.deliveryType === "flexible" ? "يعتمد على المعهد لاحقاً" : courseData.deliveryType === "online" ? "أونلاين" : courseData.deliveryType === "hybrid" ? "هجين" : "حضوري"}</span>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                {tags.slice(0, 4).map((tag: string, index: number) => (
                  <Badge key={`${tag}-${index}`} className="border border-white/20 bg-white/10 text-white">
                    {fixText(tag)}
                  </Badge>
                ))}
                {tags.length > 4 && (
                  <Badge className="border border-white/20 bg-white/10 text-white">+{tags.length - 4}</Badge>
                )}
              </div>
            </div>

            <div className="w-full space-y-4 lg:w-[410px]">
              <div className="relative h-[250px] overflow-hidden rounded-[18px] border border-white/15 bg-[#1E293B] shadow-sm sm:h-[270px]">
                <Image src={resolveImage(courseImage)} alt="صورة الدورة" fill className="object-cover" unoptimized />
                <button className="absolute left-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm hover:text-red-500">
                  <Heart className="h-5 w-5" />
                </button>
              </div>

              <Card className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
                <CardContent className="space-y-4 p-5">
                  <div className="text-center">
                    <p className="text-5xl font-extrabold text-[#2563EB]">{formatYER(price)} <span className="text-3xl">ر.ي</span></p>
                    <p className="mt-1 text-sm text-[#64748B]">سعر الدورة</p>
                    <p className="mt-2 text-sm text-[#0F172A]">{availableSeats} مقعد متاح</p>
                  </div>

                  <div>
                    {primaryAction || (
                      <div className="grid gap-3">
                        <Button className="h-12 rounded-xl bg-[#2563EB] text-white hover:bg-[#1d4ed8]">التسجيل في الدورة</Button>
                        <Button variant="outline" className="h-12 rounded-xl border-[#CBD5E1] text-[#2563EB]">إضافة إلى المفضلة</Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <Card className="rounded-[18px] border border-[#E5E7EB] bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col gap-5 md:flex-row-reverse md:items-center md:justify-between">
              <div className="flex flex-col-reverse items-center gap-4 text-center sm:flex-row-reverse sm:text-right">
                <div className="space-y-2">
                  <h3 className="text-3xl font-extrabold text-[#0F172A]">{instructorName}</h3>
                  {instructorSpecialties.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2 sm:justify-end">
                      {instructorSpecialties.slice(0, 4).map((s) => (
                        <Badge key={s} className="border border-blue-200 bg-blue-50 text-[#2563EB]">{s}</Badge>
                      ))}
                    </div>
                  )}
                  <p className="max-w-2xl text-sm leading-7 text-[#64748B]">{instructorBio}</p>
                  <div className="flex flex-wrap justify-center gap-4 sm:justify-end">
                    {instructor.phone && (
                      <a href={`tel:${instructor.phone}`} className="inline-flex items-center gap-2 text-[#0F172A]">
                        <Phone className="h-4 w-4 text-[#2563EB]" />
                        <span dir="ltr">{instructor.phone}</span>
                      </a>
                    )}
                    {instructor.email && (
                      <a href={`mailto:${instructor.email}`} className="inline-flex items-center gap-2 text-[#2563EB]">
                        <Mail className="h-4 w-4" />
                        {instructor.email}
                      </a>
                    )}
                  </div>
                </div>
                <div className="relative h-24 w-24 overflow-hidden rounded-full border border-[#E5E7EB] bg-slate-100 shadow-sm">
                  <Image src={resolveImage(instructor.avatar, "/images/avatar-1.png")} alt={instructorName} fill className="object-cover" unoptimized />
                </div>
              </div>

              <Button variant="outline" className="h-11 rounded-xl border-[#E5E7EB] text-[#0F172A]">
                <UserCircle2 className="ml-2 h-4 w-4" />
                عرض الملف الشخصي
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="rounded-[18px] border border-[#E5E7EB] bg-white shadow-sm">
            <CardHeader className="items-end text-right">
              <div className="flex w-full flex-row-reverse items-center justify-end gap-3 text-right">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Tag className="h-5 w-5" />
                </div>
                <CardTitle className="text-right text-lg font-bold">عن الدورة</CardTitle>
              </div>
            </CardHeader>
            <CardContent dir="rtl" className="space-y-3 text-right">
              <p className="text-sm leading-7 text-[#64748B]">{description}</p>
              {objectives.slice(0, 3).map((item, idx) => (
                <div key={`${item}-${idx}`} className="flex flex-row-reverse items-center justify-end gap-2 text-right">
                  <CheckCircle className="h-4 w-4 text-[#2563EB]" />
                  <span className="text-sm text-[#0F172A]">{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[18px] border border-[#E5E7EB] bg-white shadow-sm">
            <CardHeader className="items-end text-right">
              <div className="flex w-full flex-row-reverse items-center justify-end gap-3 text-right">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <CardTitle className="text-right text-lg font-bold">ماذا ستتعلم؟</CardTitle>
              </div>
            </CardHeader>
            <CardContent dir="rtl" className="space-y-3 text-right">
              {learnItems.map((item, idx) => (
                <div key={`${item}-${idx}`} className="flex flex-row-reverse items-center justify-end gap-2 text-right">
                  <CheckCircle className="h-4 w-4 text-[#2563EB]" />
                  <span className="text-sm text-[#0F172A]">{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[18px] border border-[#E5E7EB] bg-white shadow-sm">
            <CardHeader className="items-end text-right">
              <div className="flex w-full flex-row-reverse items-center justify-end gap-3 text-right">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <CardTitle className="text-right text-lg font-bold">المتطلبات</CardTitle>
              </div>
            </CardHeader>
            <CardContent dir="rtl" className="space-y-3 text-right">
              {prerequisites.length > 0 ? (
                prerequisites.map((item, idx) => (
                  <div key={`${item}-${idx}`} className="flex flex-row-reverse items-center justify-end gap-2 text-right">
                    <CheckCircle className="h-4 w-4 text-[#16A34A]" />
                    <span className="text-sm text-[#0F172A]">{item}</span>
                  </div>
                ))
              ) : (
                <div className="flex flex-row-reverse items-center justify-end gap-2 text-right">
                  <CheckCircle className="h-4 w-4 text-[#16A34A]" />
                  <span className="text-sm text-[#64748B]">لا توجد متطلبات مسبقة لهذه الدورة.</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[18px] border border-[#E5E7EB] bg-white shadow-sm">
            <CardHeader className="items-end text-right">
              <div className="flex w-full flex-row-reverse items-center justify-end gap-3 text-right">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Calendar className="h-5 w-5" />
                </div>
                <CardTitle className="text-right text-lg font-bold">الجدول الزمني</CardTitle>
              </div>
            </CardHeader>
            <CardContent dir="rtl" className="space-y-2 text-right">
              <div className="flex flex-row-reverse items-center justify-end gap-2 text-right">
                <Calendar className="h-4 w-4 text-[#2563EB]" />
                <span className="text-sm text-[#0F172A]">تاريخ البداية: {startDate}</span>
              </div>
              <div className="flex flex-row-reverse items-center justify-end gap-2 text-right">
                <Clock className="h-4 w-4 text-[#2563EB]" />
                <span className="text-sm text-[#0F172A]">من 10:00 ص - 02:00 م</span>
              </div>
              <div className="flex flex-row-reverse items-center justify-end gap-2 text-right">
                <Globe className="h-4 w-4 text-[#2563EB]" />
                <span className="text-sm text-[#64748B]">بتوقيت السعودية</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[18px] border border-[#FCD34D] bg-gradient-to-l from-[#FEF3C7] to-[#FFF8DD] shadow-sm">
          <CardContent className="flex flex-col items-center justify-between gap-4 p-6 text-center md:flex-row-reverse md:text-right">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#2563EB] shadow-sm">
              <Rocket className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-extrabold text-[#0F172A]">ابدأ رحلتك الآن وطور مهاراتك!</h3>
              <p className="mt-1 text-[#64748B]">سجل الآن واحصل على فرصة التعلم من أفضل الخبراء في المجال.</p>
            </div>
            <Button className="h-12 min-w-[140px] rounded-xl bg-[#2563EB] px-6 text-white hover:bg-[#1d4ed8]">سجل الآن</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
