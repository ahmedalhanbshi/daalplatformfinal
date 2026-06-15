"use client"

import { BookOpen, CheckCircle, Clock, Lock, AlertTriangle } from "lucide-react"
import {
    CourseEditState,
    getCourseStateBannerClasses,
    getCourseStateBannerMessage,
    getCourseStateLabel,
} from "@/lib/course-edit-permissions"

interface CourseStatusBannerProps {
    state: CourseEditState
    enrolledCount: number
    minStudents: number
}

const stateIcons: Record<CourseEditState, React.ReactNode> = {
    draft: <BookOpen className="h-5 w-5 shrink-0" />,
    pending_min_waiting: <Clock className="h-5 w-5 shrink-0" />,
    pending_min_ready: <CheckCircle className="h-5 w-5 shrink-0" />,
    active: <CheckCircle className="h-5 w-5 shrink-0" />,
    completed_or_cancelled: <Lock className="h-5 w-5 shrink-0" />,
}

export function CourseStatusBanner({ state, enrolledCount, minStudents }: CourseStatusBannerProps) {
    const classes = getCourseStateBannerClasses(state)
    const message = getCourseStateBannerMessage(state, enrolledCount, minStudents)
    const label = getCourseStateLabel(state)
    const icon = stateIcons[state]

    return (
        <div
            className={`mb-6 flex items-start gap-3 rounded-xl border px-5 py-4 ${classes.bg} ${classes.border}`}
            role="status"
            aria-label={`حالة الدورة: ${label}`}
        >
            <span className={`mt-0.5 ${classes.icon}`}>{icon}</span>
            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-sm font-bold ${classes.text}`}>
                        حالة الدورة:
                    </span>
                    <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${classes.border} ${classes.bg} ${classes.text}`}
                    >
                        {label}
                    </span>
                    {state === 'pending_min_waiting' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            {enrolledCount} / {minStudents} طالب
                        </span>
                    )}
                    {state === 'pending_min_ready' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                            <CheckCircle className="h-3 w-3" />
                            {enrolledCount} طالب مقبول
                        </span>
                    )}
                </div>
                <p className={`text-sm ${classes.text} opacity-90 leading-relaxed`}>{message}</p>

                {/* تنبيه خاص بحالة &quot;جاهز للنشر&quot; */}
                {state === 'pending_min_ready' && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-100/60 border border-emerald-200 px-3 py-2">
                        <AlertTriangle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-emerald-700 font-medium">
                            الخطوات المطلوبة: اختر نوع التنفيذ (أونلاين / حضوري) ← أضف الجلسات ← اضغط <strong>&quot;نشر وإعلام الطلاب&quot;</strong>
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
