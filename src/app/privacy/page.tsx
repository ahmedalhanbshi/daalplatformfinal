import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { PLATFORM_NAME } from "@/lib/brand"
import { fetchPublicSettings } from "@/lib/settings-service"

export async function generateMetadata(): Promise<Metadata> {
  const { general } = await fetchPublicSettings()
  const siteName = general.siteName || PLATFORM_NAME
  return {
    title: `سياسة الخصوصية | ${siteName}`,
    description: `سياسة الخصوصية لمنصة ${siteName}`,
  }
}

// Default static content used as fallback when DB has no content yet
const DEFAULT_CONTENT = `تحترم منصة دال خصوصية المستخدمين وتحرص على التعامل مع البيانات الشخصية بمسؤولية وشفافية.

توضح هذه السياسة أنواع البيانات التي قد نجمعها، وكيف نستخدمها، ومتى قد نشاركها، وما هي الحقوق المتاحة للمستخدم بشأنها.

قد نجمع الاسم، البريد الإلكتروني، رقم الجوال، نوع الحساب، وبيانات الملف الشخصي الأساسية، فضلاً عن بيانات التسجيلات والدورات وسندات الدفع المرفوعة.

نستخدم البيانات لإنشاء الحسابات، وإدارة التسجيلات، وإرسال الإشعارات، والتواصل مع المستخدم عند الحاجة.

قد تُشارك بيانات التسجيل ذات الصلة مع المدرب أو المعهد عند التسجيل في دورة، وذلك لغرض إدارة الدورة والتواصل التشغيلي.

نطبق إجراءات حماية تقنية وإدارية مناسبة للحد من الوصول غير المصرح به أو الفقد أو العبث بالبيانات.

يمكن للمستخدم مراجعة بياناته الشخصية وتعديلها من خلال حسابه متى ما كانت الأدوات متاحة لذلك.`

function parseContent(content: string) {
  const blocks = content.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)

  return blocks.map((block, index) => {
    if (block.startsWith("## ")) {
      return (
        <h2 key={index} className="text-xl font-bold text-slate-900 md:text-[1.35rem] mt-8 mb-4">
          {block.substring(3)}
        </h2>
      )
    }

    const lines = block.split("\n").map((l) => l.trim())
    if (lines.length >= 1 && lines.every((l) => l.startsWith("- "))) {
      return (
        <ul key={index} className="space-y-2 pr-5 text-slate-700 list-disc mt-2 mb-4">
          {lines.map((l, i) => (
            <li key={i}>{l.substring(2)}</li>
          ))}
        </ul>
      )
    }

    return (
      <p key={index} className="mb-3 whitespace-pre-wrap">
        {block}
      </p>
    )
  })
}

export default async function PrivacyPage() {
  const publicSettings = await fetchPublicSettings()
  const legal = publicSettings.legal

  const content = legal.privacy.content || DEFAULT_CONTENT
  const updatedAt = legal.privacy.updatedAt || "3 يونيو 2026"

  return (
    <main className="min-h-screen bg-slate-50/80 text-right" dir="rtl">
      <section className="mx-auto max-w-4xl px-6 py-10 md:px-8 md:py-14">
        <article className="rounded-[6.5px] border border-slate-200 bg-white shadow-sm">
          <div className="p-6 md:p-10">
            <div className="space-y-3">
              <Badge className="rounded-[6.5px] bg-blue-50 text-blue-700 hover:bg-blue-50">وثائق المنصة</Badge>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
                سياسة الخصوصية
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
                نوضح هنا كيف نجمع البيانات ونستخدمها ونحميها أثناء استخدامك لمنصة دال وحجز الدورات وإدارة التسجيلات.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span>آخر تحديث: {updatedAt}</span>
                <span aria-hidden="true" className="text-slate-300">�</span>
                <Button asChild variant="ghost" className="h-auto p-0 text-slate-600 hover:bg-transparent hover:text-slate-900">
                  <Link href="/" className="inline-flex items-center gap-1.5">
                    <ArrowRight className="h-4 w-4" />
                    العودة للرئيسية
                  </Link>
                </Button>
              </div>
            </div>

            <Separator className="my-6 bg-slate-200" />

            <article className="text-[15px] leading-8 text-slate-700">
              {parseContent(content)}
            </article>

            <div className="mt-8 border-t border-slate-200 pt-4 text-sm leading-7 text-slate-500">
              تنبيه: هذه السياسة إرشادية وقابلة للتحديث بما يتوافق مع الأنظمة المعمول بها.
            </div>
          </div>
        </article>
      </section>
    </main>
  )
}
