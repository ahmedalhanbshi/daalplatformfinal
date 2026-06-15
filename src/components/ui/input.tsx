import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, dir, ...props }, ref) => {
    const normalizedType = type?.toLowerCase()
    const shouldRtl = !normalizedType || (normalizedType !== "number" && normalizedType !== "url")
    const resolvedDir = dir ?? (shouldRtl ? "rtl" : undefined)
    const isRtl = resolvedDir === "rtl"

    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          isRtl && "text-right",
          className
        )}
        dir={resolvedDir}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
