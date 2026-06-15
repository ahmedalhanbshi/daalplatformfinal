"use client"

import { Lock } from "lucide-react"

interface BookingSectionLockedProps {
    reason?: string
}

export function BookingSectionLocked({ reason }: BookingSectionLockedProps) {
    return (
        <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/80">
            {/* Overlay content */}
            <div className="flex flex-col items-center justify-center py-14 px-6 text-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 border border-slate-200 shadow-sm">
                    <Lock className="h-7 w-7 text-slate-400" />
                </div>
                <div className="space-y-1.5 max-w-sm">
                    <h3 className="text-base font-semibold text-slate-600">
                        قسم الحجز والمواعيد مغلق مؤقتاً
                    </h3>
                    {reason && (
                        <p className="text-sm text-slate-500 leading-relaxed">
                            {reason}
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
