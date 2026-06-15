/**
 * course-edit-permissions.ts
 *
 * منطق مركزي مشترك لتحديد ما يُسمح بتعديله وما يُعرض من أزرار
 * في صفحة تعديل الدورة، بناءً على حالة الدورة الحالية وعدد الطلاب.
 *
 * يُستخدم في:
 *   - src/app/trainer/courses/[id]/edit/page.tsx
 *   - src/app/institute/courses/[id]/edit/page.tsx
 */

// ─── الحالة المنطقية المحسوبة ──────────────────────────────────────────────────

export type CourseEditState =
    | 'draft'               // DRAFT � مسودة لم تُنشر
    | 'pending_min_waiting' // PENDING_MINIMUM + لم يكتمل الحد الأدنى بعد
    | 'pending_min_ready'   // PENDING_MINIMUM + اكتمل الحد الأدنى → جاهز للإعداد النهائي
    | 'active'              // ACTIVE � نشطة، الطلاب مسجلون
    | 'completed_or_cancelled' // COMPLETED | CANCELLED | REJECTED � منتهية

// ─── صلاحيات التعديل ──────────────────────────────────────────────────────────

export interface CourseEditPermissions {
    /** الحالة المنطقية المحسوبة */
    state: CourseEditState

    // ── الأقسام ──
    /** السماح بتعديل معلومات الدورة الأساسية */
    canEditCourseInfo: boolean
    /** الحقول المجمّدة داخل قسم المعلومات */
    lockedCourseInfoFields: string[]
    /** السماح بتعديل قسم الحجز والمواعيد */
    canEditBookingSection: boolean
    /** سبب إغلاق قسم الحجز (للعرض في الـ overlay) */
    bookingLockedReason?: string

    // ── الأزرار ──
    /** زر "حفظ كمسودة" */
    showSaveAsDraft: boolean
    /** زر "نشر الدورة" → يحوّل إلى PENDING_MINIMUM */
    showPublishCourse: boolean
    /** زر "حفظ التغييرات" → يحفظ الحقول المسموح بها */
    showSaveChanges: boolean
    /** زر "نشر وإعلام الطلاب" → يستدعي /activate */
    showPublishAndNotify: boolean

    /** هل الصفحة بالكامل للقراءة فقط (منتهية) */
    isReadOnly: boolean
}

// ─── الدالة الرئيسية ───────────────────────────────────────────────────────────

/**
 * يحسب صلاحيات التعديل بناءً على:
 * @param status        - حالة الدورة من API (DRAFT, PENDING_MINIMUM, ACTIVE, ...)
 * @param enrolledCount - عدد الطلاب المقبولين مبدئياً (PRELIMINARY_APPROVED)
 * @param minStudents   - الحد الأدنى المطلوب من الطلاب
 * @param deliveryType  - نوع التنفيذ (online, in_person, flexible)
 */
export function getCourseEditPermissions(
    status: string,
    enrolledCount: number,
    minStudents: number,
    deliveryType: string = ''
): CourseEditPermissions {
    const s = (status || 'DRAFT').toUpperCase()

    // ── مسودة ──────────────────────────────────────────────────────────────────
    if (s === 'DRAFT') {
        return {
            state: 'draft',
            canEditCourseInfo: true,
            lockedCourseInfoFields: [],
            canEditBookingSection: true,
            showSaveAsDraft: false,
            showPublishCourse: true,
            showSaveChanges: true,
            showPublishAndNotify: false,
            isReadOnly: false,
        }
    }

    // ── بانتظار الحد الأدنى ────────────────────────────────────────────────────
    if (s === 'PENDING_MINIMUM') {
        const minimumReached = enrolledCount >= minStudents && minStudents > 0

        if (!minimumReached) {
            // لم يكتمل الحد الأدنى � قسم الحجز مغلق
            return {
                state: 'pending_min_waiting',
                canEditCourseInfo: true,
                lockedCourseInfoFields: [], // جعلناها مفتوحة بناءً على طلبك
                canEditBookingSection: false,
                bookingLockedReason: `الدورة منشورة وتنتظر اكتمال الحد الأدنى من الطلاب (${enrolledCount} من ${minStudents}). سيُفتح قسم المواعيد بعد اكتمال العدد.`,
                showSaveAsDraft: false,
                showPublishCourse: false,
                showSaveChanges: true,
                showPublishAndNotify: false,
                isReadOnly: false,
            }
        } else {
            // اكتمل الحد الأدنى � جاهز للإعداد النهائي
            return {
                state: 'pending_min_ready',
                canEditCourseInfo: true,
                lockedCourseInfoFields: [], // جعلناها مفتوحة بناءً على طلبك
                canEditBookingSection: true, // مفتوح لإضافة الجلسات
                showSaveAsDraft: false,
                showPublishCourse: false,
                showSaveChanges: false,
                showPublishAndNotify: true,  // الزر الرئيسي
                isReadOnly: false,
            }
        }
    }

    // ── نشطة ────────────────────────────────────────────────────────────────────
    if (s === 'ACTIVE') {
        const isOnline = deliveryType === 'online';
        return {
            state: 'active',
            canEditCourseInfo: true,
            lockedCourseInfoFields: ['deliveryType'], // لا يمكن تغيير نوع الدورة بعد أن تصبح نشطة
            canEditBookingSection: isOnline,
            bookingLockedReason: isOnline ? undefined : 'الدورة نشطة والطلاب مسجلون. لا يمكن تعديل الجدول الزمني أو القاعة لتجنب الإرباك.',
            showSaveAsDraft: false,
            showPublishCourse: false,
            showSaveChanges: true,
            showPublishAndNotify: false,
            isReadOnly: false,
        }
    }

    // ── منتهية (مكتملة / ملغاة / مرفوضة) ───────────────────────────────────────
    return {
        state: 'completed_or_cancelled',
        canEditCourseInfo: false,
        lockedCourseInfoFields: ['*'],
        canEditBookingSection: false,
        bookingLockedReason: 'الدورة منتهية ولا يمكن تعديلها.',
        showSaveAsDraft: false,
        showPublishCourse: false,
        showSaveChanges: false,
        showPublishAndNotify: false,
        isReadOnly: true,
    }
}

// ─── دوال مساعدة لعرض الحالة ─────────────────────────────────────────────────

/** يُرجع التسمية العربية للحالة */
export function getCourseStateLabel(state: CourseEditState): string {
    const labels: Record<CourseEditState, string> = {
        draft: 'مسودة',
        pending_min_waiting: 'بانتظار الحد الأدنى',
        pending_min_ready: 'جاهز للنشر النهائي',
        active: 'نشطة',
        completed_or_cancelled: 'منتهية',
    }
    return labels[state] || 'غير معروفة'
}

/** يُرجع لون الـ badge بحسب الحالة (Tailwind classes) */
export function getCourseStateBadgeClasses(state: CourseEditState): string {
    const classes: Record<CourseEditState, string> = {
        draft: 'bg-slate-100 text-slate-700 border-slate-200',
        pending_min_waiting: 'bg-amber-50 text-amber-700 border-amber-200',
        pending_min_ready: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        active: 'bg-blue-50 text-blue-700 border-blue-200',
        completed_or_cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
    }
    return classes[state] || ''
}

/** يُرجع لون شريط الحالة Banner بحسب الحالة */
export function getCourseStateBannerClasses(state: CourseEditState): {
    bg: string
    border: string
    icon: string
    text: string
} {
    const map: Record<CourseEditState, { bg: string; border: string; icon: string; text: string }> = {
        draft: {
            bg: 'bg-slate-50',
            border: 'border-slate-200',
            icon: 'text-slate-500',
            text: 'text-slate-700',
        },
        pending_min_waiting: {
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            icon: 'text-amber-500',
            text: 'text-amber-800',
        },
        pending_min_ready: {
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            icon: 'text-emerald-600',
            text: 'text-emerald-800',
        },
        active: {
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            icon: 'text-blue-600',
            text: 'text-blue-800',
        },
        completed_or_cancelled: {
            bg: 'bg-gray-50',
            border: 'border-gray-200',
            icon: 'text-gray-400',
            text: 'text-gray-600',
        },
    }
    return map[state]
}

/** يُرجع الرسالة التوضيحية لكل حالة */
export function getCourseStateBannerMessage(
    state: CourseEditState,
    enrolledCount: number,
    minStudents: number
): string {
    switch (state) {
        case 'draft':
            return 'الدورة في وضع المسودة وغير مرئية للطلاب. يمكنك تعديل جميع الإعدادات.'
        case 'pending_min_waiting':
            return `الدورة منشورة ومرئية للطلاب. تم قبول ${enrolledCount} من ${minStudents} طالب مطلوبين. قسم المواعيد سيُفتح عند اكتمال العدد.`
        case 'pending_min_ready':
            return `🎉 اكتمل الحد الأدنى! (${enrolledCount}/${minStudents} طالب). أضف الجلسات واختر نوع التنفيذ ثم اضغط "نشر وإعلام الطلاب".`
        case 'active':
            return 'الدورة نشطة والطلاب مسجلون. يمكنك تعديل الوصف والصورة فقط، ولا يمكن تغيير الجدول أو الأسعار.'
        case 'completed_or_cancelled':
            return 'هذه الدورة منتهية ولا يمكن تعديلها.'
        default:
            return ''
    }
}
