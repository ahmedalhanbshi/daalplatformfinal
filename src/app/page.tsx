"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  Compass,
  GraduationCap,
  Layers,
  Sparkles,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import {
  PublicService,
  type CategoryData,
  type FeaturedCourse,
  type PlatformStats,
} from "@/lib/public-service";
import { getFileUrl } from "@/lib/utils";

const features = [
  {
    icon: Compass,
    title: "استكشاف أسرع",
    description: "ابحث عن الدورة المناسبة حسب المجال والمستوى ونمط التعلم.",
  },
  {
    icon: Layers,
    title: "خيارات مرنة",
    description: "تعلّم أونلاين أو حضوريًا حسب وقتك وأسلوبك في التعلم.",
  },
  {
    icon: GraduationCap,
    title: "نتائج واضحة",
    description: "تفاصيل دقيقة قبل التسجيل تساعدك تتخذ قرارك بثقة.",
  },
  {
    icon: Sparkles,
    title: "تجربة حديثة",
    description: "واجهة عربية منظمة تمنحك رحلة استخدام مريحة وسريعة.",
  },
];

const easeOut = [0.22, 1, 0.36, 1] as const;
const inViewViewport = { once: true, amount: 0.24 } as const;

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const revealUpItem = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.58, ease: easeOut },
  },
};

const revealRightItem = {
  hidden: { opacity: 0, x: 24 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.56, ease: easeOut },
  },
};

function formatEnglishNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function CountUpNumber({
  target,
  start,
  reduceMotion,
}: {
  target: number;
  start: boolean;
  reduceMotion: boolean;
}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start || reduceMotion) {
      const instantFrame = window.requestAnimationFrame(() => setValue(target));
      return () => window.cancelAnimationFrame(instantFrame);
    }

    let frame = 0;
    const duration = 760;
    const startAt = performance.now();

    const animate = (now: number) => {
      const progress = Math.min((now - startAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));

      if (progress < 1) {
        frame = window.requestAnimationFrame(animate);
      }
    };

    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [target, start, reduceMotion]);

  return <>{formatEnglishNumber(value)}</>;
}

function CategorySkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.45)]">
      <div className="skeleton-shimmer h-6 w-2/3 rounded-lg" />
      <div className="mt-3 skeleton-shimmer h-4 w-1/3 rounded-md" />
    </div>
  );
}

function CourseSkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_16px_36px_-28px_rgba(15,23,42,0.45)]">
      <div className="skeleton-shimmer h-44 w-full" />
      <div className="p-4">
        <div className="skeleton-shimmer h-4 w-1/3 rounded-md" />
        <div className="mt-3 skeleton-shimmer h-5 w-5/6 rounded-md" />
        <div className="mt-2 skeleton-shimmer h-5 w-4/6 rounded-md" />
        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="skeleton-shimmer h-4 w-2/5 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const shouldReduceMotion = useReducedMotion();
  const [statsData, setStatsData] = useState<PlatformStats | null>(null);
  const [categoriesData, setCategoriesData] = useState<CategoryData[]>([]);
  const [coursesData, setCoursesData] = useState<FeaturedCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statsStarted, setStatsStarted] = useState(false);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const [stats, categories, courses] = await Promise.all([
          PublicService.getStats(),
          PublicService.getCategories(),
          PublicService.getFeaturedCourses(),
        ]);
        setStatsData(stats);
        setCategoriesData(categories);
        setCoursesData(courses);
      } catch (error) {
        console.warn("Home page data loaded with fallback values.", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadHomeData();
  }, []);

  const heroStats = useMemo(
    () => [
      { icon: Users, label: "طالب", value: statsData?.students ?? 5000 },
      { icon: BookOpen, label: "دورة", value: statsData?.courses ?? 200 },
      { icon: Building2, label: "معهد", value: statsData?.institutes ?? 50 },
    ],
    [statsData],
  );

  const quickStats = useMemo(
    () => [
      { icon: Users, label: "طالب نشط", value: statsData?.students ?? 5000 },
      { icon: BookOpen, label: "دورة تدريبية", value: statsData?.courses ?? 200 },
      { icon: Building2, label: "معهد شريك", value: statsData?.institutes ?? 50 },
    ],
    [statsData],
  );

  const logoMaskStyle: CSSProperties = {
    WebkitMaskImage: "url('/images/LOGOff-dal-mask.png')",
    WebkitMaskRepeat: "no-repeat",
    WebkitMaskSize: "contain",
    WebkitMaskPosition: "center",
    maskImage: "url('/images/LOGOff-dal-mask.png')",
    maskRepeat: "no-repeat",
    maskSize: "contain",
    maskPosition: "center",
  };

    return (
      <main
        dir="rtl"
        className="relative isolate min-h-screen overflow-x-hidden bg-[#f7f9ff] font-sans text-slate-900"
      >
        <Navbar />
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="ambient-blob absolute -top-24 right-[8%] h-[340px] w-[340px] rounded-full bg-indigo-300/20 blur-[120px]" />
        <div className="ambient-blob ambient-blob-alt absolute top-[28%] left-[10%] h-[280px] w-[280px] rounded-full bg-sky-300/20 blur-[110px]" />
        <div className="ambient-blob ambient-blob-slow absolute bottom-[10%] right-[42%] h-[240px] w-[240px] rounded-full bg-blue-200/18 blur-[100px]" />
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden pb-18 pt-8 lg:pb-22 lg:pt-12">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(145deg,#f9fbff_0%,#f2f6ff_58%,#eff2ff_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_32%,rgba(79,70,229,0.12),transparent_50%),radial-gradient(circle_at_22%_78%,rgba(59,130,246,0.12),transparent_48%)]" />
          <motion.div
            className="absolute -top-28 right-[8%] h-[340px] w-[340px] rounded-full bg-indigo-500/14 blur-[128px]"
            animate={shouldReduceMotion ? undefined : { x: [0, 18, 0], y: [0, -10, 0] }}
            transition={shouldReduceMotion ? undefined : { duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-24 left-[10%] h-[320px] w-[320px] rounded-full bg-sky-400/14 blur-[120px]"
            animate={shouldReduceMotion ? undefined : { x: [0, -16, 0], y: [0, 12, 0] }}
            transition={shouldReduceMotion ? undefined : { duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="container relative z-10 mx-auto max-w-[1320px] px-4">
          <div className="grid items-center gap-5 lg:grid-cols-[1.08fr_0.92fr] lg:[direction:ltr] lg:gap-5">
            {/* Visual */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 14, scale: 0.965 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.65, ease: easeOut }}
              className="order-1 lg:justify-self-end"
            >
              <div className="group relative mx-auto h-[350px] w-[350px] sm:h-[500px] sm:w-[500px] lg:mx-0 lg:h-[660px] lg:w-[660px]" aria-hidden>
                <div className="absolute inset-[11%] rounded-full bg-[#3f50e0]/30 blur-[96px]" aria-hidden />
                <div
                  className="pointer-events-none absolute inset-0 bg-[#4c5af0]/22 blur-[84px]"
                  style={logoMaskStyle}
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.34),rgba(79,70,229,0.12))]"
                  style={logoMaskStyle}
                  aria-hidden
                />
              </div>
            </motion.div>

            {/* Content */}
            <motion.div
              initial={shouldReduceMotion ? false : "hidden"}
              animate={shouldReduceMotion ? undefined : "show"}
              variants={staggerContainer}
              className="order-2 text-right [direction:rtl] lg:max-w-[600px] lg:justify-self-start"
            >
              <motion.h1
                variants={revealRightItem}
                className="text-right text-4xl leading-tight tracking-[-0.01em] text-[#111c3d] sm:text-5xl lg:text-[4rem]"
              >
                كل الطرق توصلك... بس هذه أسرع
              </motion.h1>

              <motion.p variants={revealRightItem} className="mt-2 text-lg leading-8 text-slate-800/95">
                دورات أونلاين وحضورية
                <br />
                اختار اللي يناسبك
                <br />
                وسجل بسهولة من مكان واحد
              </motion.p>

              <motion.div variants={revealRightItem} className="mt-5 flex w-full flex-col items-end gap-2.5 sm:flex-row sm:justify-start">
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="relative h-[3.75rem] overflow-hidden rounded-2xl border-slate-300 bg-white px-8 text-lg font-bold text-slate-900 transition-all duration-300 before:absolute before:inset-0 before:bg-[linear-gradient(115deg,transparent_0%,rgba(99,102,241,0.12)_50%,transparent_100%)] before:opacity-0 before:transition-opacity before:duration-300 hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-slate-50 hover:before:opacity-100 motion-reduce:transform-none"
                >
                  <Link href="/courses">استعرض الدورات</Link>
                </Button>

                <Button
                  asChild
                  size="lg"
                  className="h-[3.75rem] rounded-2xl bg-[#3e41d3] px-9 text-lg font-black text-white shadow-[0_16px_30px_-18px_rgba(62,65,211,0.68)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#3438c6] hover:shadow-[0_22px_38px_-20px_rgba(62,65,211,0.62)] active:translate-y-0 motion-reduce:transform-none"
                >
                  <Link href="/auth/register" className="group inline-flex items-center gap-2">
                    ابدأ الآن
                    <ArrowLeft className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-1" />
                  </Link>
                </Button>
              </motion.div>

              <motion.div variants={revealRightItem} className="mt-5 flex w-full flex-wrap items-center justify-start gap-2 text-sm font-bold text-slate-700 sm:flex-nowrap">
                {heroStats.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.5)] backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-20px_rgba(15,23,42,0.56)]"
                  >
                    <item.icon className="h-4 w-4 text-indigo-600" />
                    <span>
                      +{formatEnglishNumber(item.value)} {item.label}
                    </span>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <motion.section
        initial={shouldReduceMotion ? false : "hidden"}
        whileInView={shouldReduceMotion ? undefined : "show"}
        viewport={shouldReduceMotion ? undefined : inViewViewport}
        variants={staggerContainer}
        onViewportEnter={() => setStatsStarted(true)}
        className="container mx-auto max-w-[1320px] px-4 pb-8"
      >
        <div className="grid gap-4 rounded-[24px] bg-white p-5 shadow-[0_18px_55px_-35px_rgba(15,23,42,0.38)] sm:grid-cols-3">
          {quickStats.map((item) => (
            <motion.article
              key={item.label}
              variants={revealUpItem}
              whileHover={
                shouldReduceMotion
                  ? undefined
                  : {
                      y: -3,
                      boxShadow: "0 20px 40px -34px rgba(15,23,42,0.55)",
                    }
              }
              className="flex items-center justify-center gap-3 rounded-2xl bg-slate-50 px-4 py-4 transition-shadow duration-300"
            >
              <item.icon className="h-5 w-5 text-indigo-600" />
              <div className="text-right">
                <p className="text-xl font-black text-[#111c3d]">
                  +<CountUpNumber target={item.value} start={statsStarted} reduceMotion={Boolean(shouldReduceMotion)} />
                </p>
                <p className="text-sm font-semibold text-slate-600">{item.label}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </motion.section>

      {/* Features */}
      <motion.section
        initial={shouldReduceMotion ? false : "hidden"}
        whileInView={shouldReduceMotion ? undefined : "show"}
        viewport={shouldReduceMotion ? undefined : inViewViewport}
        variants={staggerContainer}
        className="container mx-auto max-w-[1320px] px-4 py-10"
      >
        <motion.div variants={revealUpItem} className="mb-8 text-right">
          <h2 className="text-3xl font-black text-[#111c3d]">لماذا منصة دال؟</h2>
          <p className="mt-2 text-base font-medium text-slate-600">
            تجربة عربية واضحة تساعدك تبدأ بسرعة وتختار بثقة.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => (
            <motion.article
              key={feature.title}
              variants={revealUpItem}
              whileHover={
                shouldReduceMotion
                  ? undefined
                  : {
                      y: -4,
                      boxShadow: "0 24px 44px -30px rgba(15,23,42,0.48)",
                    }
              }
              className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.45)] transition-all duration-300"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-2 motion-reduce:transform-none">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-black text-[#111c3d]">{feature.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{feature.description}</p>
            </motion.article>
          ))}
        </div>
      </motion.section>

      {/* Categories */}
      <motion.section
        initial={shouldReduceMotion ? false : "hidden"}
        whileInView={shouldReduceMotion ? undefined : "show"}
        viewport={shouldReduceMotion ? undefined : inViewViewport}
        variants={staggerContainer}
        className="container mx-auto max-w-[1320px] px-4 py-10"
      >
        <motion.div variants={revealUpItem} className="mb-8 text-right">
          <h2 className="text-3xl font-black text-[#111c3d]">استكشف المجالات</h2>
          <p className="mt-2 text-base font-medium text-slate-600">
            تصفح الدورات حسب التخصص الذي يناسب مسارك.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 8 }).map((_, index) => <CategorySkeletonCard key={`cat-skeleton-${index}`} />)
            : categoriesData.length > 0
              ? categoriesData.slice(0, 8).map((category, index) => (
                  <motion.div
                    key={category.id}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
                    animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.06, ease: easeOut }}
                  >
                    <Link
                      href={`/courses?category=${category.id}`}
                      className="block rounded-2xl border border-slate-100 bg-white p-5 text-right shadow-[0_16px_36px_-28px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_24px_40px_-30px_rgba(15,23,42,0.52)]"
                    >
                      <h3 className="text-lg font-black text-[#111c3d]">{category.name}</h3>
                      <p className="mt-2 text-sm font-semibold text-slate-600">
                        {formatEnglishNumber(category._count?.courses ?? 0)} دورة
                      </p>
                    </Link>
                  </motion.div>
                ))
              : (
                <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white/80 p-8 text-center text-slate-500">
                  سيتم عرض المجالات هنا قريبًا.
                </div>
                )}
        </div>
      </motion.section>

      {/* Courses */}
      <motion.section
        initial={shouldReduceMotion ? false : "hidden"}
        whileInView={shouldReduceMotion ? undefined : "show"}
        viewport={shouldReduceMotion ? undefined : inViewViewport}
        variants={staggerContainer}
        className="container mx-auto max-w-[1320px] px-4 py-10"
      >
        <motion.div variants={revealUpItem} className="mb-8 flex items-end justify-between gap-4">
          <div className="text-right">
            <h2 className="text-3xl font-black text-[#111c3d]">دورات مقترحة لك</h2>
            <p className="mt-2 text-base font-medium text-slate-600">
              مجموعة مختارة من أحدث الدورات على المنصة.
            </p>
          </div>
          <Link
            href="/courses"
            className="text-sm font-bold text-indigo-600 transition-colors duration-300 hover:text-indigo-700"
          >
            عرض الكل
          </Link>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => <CourseSkeletonCard key={`course-skeleton-${index}`} />)
            : coursesData.length > 0
              ? coursesData.slice(0, 8).map((course, index) => {
                  const fallbackImage = "/images/course-abstract.svg";
                  const imageSrc = course.image ? getFileUrl(course.image) || fallbackImage : fallbackImage;
                  const trainerName =
                    course.trainer?.name || course.staffTrainer?.name || course.institute?.name || "غير محدد";

                  return (
                    <motion.div
                      key={course.id}
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
                      animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                      transition={{ duration: 0.52, delay: index * 0.06, ease: easeOut }}
                    >
                      <Link
                        href={`/courses/${course.id}`}
                        className="group block overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_16px_36px_-28px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_24px_44px_-30px_rgba(15,23,42,0.56)]"
                      >
                        <div className="relative h-44 w-full overflow-hidden">
                          <Image
                            src={imageSrc}
                            alt={course.title}
                            fill
                            sizes="(max-width: 1024px) 100vw, 25vw"
                            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045]"
                            unoptimized
                          />
                        </div>

                        <div className="p-4 text-right">
                          <p className="text-xs font-bold text-indigo-600">
                            {course.category?.name || "غير مصنف"}
                          </p>
                          <h3 className="mt-2 line-clamp-2 min-h-[3rem] text-base font-black text-[#111c3d]">
                            {course.title}
                          </h3>
                          <p className="mt-2 text-sm font-semibold text-slate-600">{trainerName}</p>
                          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                            <span className="text-lg font-black text-[#111c3d]">{course.price} ر.س</span>
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600/80 transition-all duration-300 group-hover:text-indigo-700">
                              تفاصيل الدورة
                              <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" />
                            </span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })
              : (
                <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white/80 p-8 text-center text-slate-500">
                  سيتم عرض الدورات المقترحة هنا بعد إضافة المحتوى.
                </div>
                )}
        </div>
      </motion.section>

      {/* CTA */}
      <motion.section
        initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
        whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={shouldReduceMotion ? undefined : inViewViewport}
        transition={{ duration: 0.6, ease: easeOut }}
        className="container mx-auto max-w-[1320px] px-4 py-10"
      >
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-l from-[#3e41d3] via-[#4f46e5] to-[#2563eb] p-8 text-right text-white shadow-[0_24px_70px_-35px_rgba(37,99,235,0.6)] lg:p-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_16%,rgba(255,255,255,0.22),transparent_38%),radial-gradient(circle_at_88%_82%,rgba(255,255,255,0.15),transparent_42%)]" />
          <div className="animate-cta-sweep pointer-events-none absolute -right-[34%] top-0 h-full w-[44%] bg-gradient-to-l from-white/35 via-white/8 to-transparent blur-2xl motion-reduce:animate-none" />

          <div className="relative z-10">
            <h2 className="text-3xl font-black lg:text-4xl">جاهز تبدأ خطوتك القادمة؟</h2>
            <p className="mt-3 max-w-2xl text-base font-medium text-white/90 lg:text-lg">
              أنشئ حسابك الآن وابدأ التعلم بطريقة أسرع وأوضح في منصة واحدة.
            </p>
            <div className="mt-6">
              <Button
                asChild
                size="lg"
                className="h-13 rounded-xl bg-white px-8 text-base font-black text-[#2f3cd7] transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-[0_18px_34px_-22px_rgba(255,255,255,0.65)] motion-reduce:transform-none"
              >
                <Link href="/auth/register">ابدأ الآن</Link>
              </Button>
            </div>
          </div>
        </div>
      </motion.section>

      <Footer />
    </main>
  );
}


