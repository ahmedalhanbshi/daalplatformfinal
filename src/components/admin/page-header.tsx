import { Button } from "@/components/ui/button"
import { ReactNode } from "react"

interface AdminPageHeaderProps {
    title: string
    description: string
    action?: ReactNode
}

export function AdminPageHeader({ title, description, action }: AdminPageHeaderProps) {
    return (
        <div dir="rtl" className="mb-8 flex flex-col gap-4 text-right md:flex-row md:items-center md:justify-between">
            <div className="text-right">
                <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
                <p className="mt-2 text-gray-600">{description}</p>
            </div>
            {action && <div>{action}</div>}
        </div>
    )
}
