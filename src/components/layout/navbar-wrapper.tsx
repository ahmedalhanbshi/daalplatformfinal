"use client"

import { usePathname } from "next/navigation"
import { Navbar } from "./navbar"

export function NavbarWrapper() {
  const pathname = usePathname()
  
  // Dashboard routes usually have their own layouts with specialized Navbars
  const isDashboardRoute = 
    pathname?.startsWith('/admin') || 
    pathname?.startsWith('/student') || 
    pathname?.startsWith('/trainer') || 
    pathname?.startsWith('/institute')

  const isLandingPage = pathname === "/"

  if (isDashboardRoute || isLandingPage) {
    return null
  }

  return <Navbar />
}
