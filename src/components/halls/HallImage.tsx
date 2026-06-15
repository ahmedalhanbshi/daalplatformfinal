"use client"

import React, { useMemo, useState } from "react"
import { ImageOff } from "lucide-react"
import { getFileUrl } from "@/lib/utils"

interface HallImageProps {
    src: string | null | undefined
    alt: string
    fill?: boolean
    className?: string
    sizes?: string
}

export function HallImage({ src, alt, fill = true, className, sizes }: HallImageProps) {
    const fallbackSrc = "/images/course-web.png"
    const imgSrc = useMemo(() => getFileUrl(src) || fallbackSrc, [src])
    const [failedSrc, setFailedSrc] = useState<string | null>(null)
    const hasError = failedSrc === imgSrc

    if (hasError) {
        if (imgSrc !== fallbackSrc) {
            return (
                <img
                    src={fallbackSrc}
                    alt={alt}
                    className={`h-full w-full object-cover ${className || ""}`}
                    onError={() => setFailedSrc(fallbackSrc)}
                />
            )
        }
        return <div className={`flex h-full w-full items-center justify-center bg-slate-100 text-slate-400 ${className}`}><ImageOff className="h-10 w-10 opacity-30" /></div>
    }

    if (fill) {
        return (
            <img
                src={imgSrc}
                alt={alt}
                className={`h-full w-full object-cover ${className || ""}`}
                onError={() => setFailedSrc(imgSrc)}
            />
        )
    }

    return (
        <img
            src={imgSrc}
            alt={alt}
            sizes={sizes}
            className={className}
            onError={() => setFailedSrc(imgSrc)}
        />
    )
}
