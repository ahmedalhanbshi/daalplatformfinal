"use client"

import { Navbar } from "@/components/layout/navbar"
import { Sidebar } from "@/components/layout/sidebar"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { PanelRightClose, PanelRightOpen } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

export default function CoursesLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user } = useAuth()
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)

    // If no user is logged in, show default layout (just children, assuming Navbar is in Root)
    // Actually RootLayout has NavbarWrapper. 
    // But duplicate Navbar logic might be tricky if we use standard Layout structure.
    // Let's assume RootLayout handles Navbar.
    // BUT specific layouts (StudentLayout) imported Navbar explicitly. 
    // Let's check RootLayout again. Step 347 shows RootLayout has <NavbarWrapper />.
    // AND StudentLayout (Step 239) has <Navbar />. 
    // This implies double navbar if not careful!
    // Wait, RootLayout has NavbarWrapper. StudentLayout has Navbar.
    // If StudentLayout is used, it nests inside RootLayout? 
    // Next.js Layout: RootLayout wraps EVERYTHING.
    // So StudentLayout children are wrapped in RootLayout.
    // If RootLayout has NavbarWrapper, and StudentLayout has Navbar, we get TWO navbars?
    // Let's check NavbarWrapper.

    if (!user) {
        return <div className="min-h-screen bg-gray-50 dark:bg-background pt-8">{children}</div>
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-background" dir="rtl">
            <div className="flex relative">
                <div 
                    className={cn(
                        "sticky top-[60px] h-[calc(100vh-60px)] overflow-y-auto transition-all duration-300 ease-in-out border-l border-gray-200 dark:border-gray-800",
                        isSidebarOpen ? "w-64 opacity-100 translate-x-0" : "w-0 opacity-0 translate-x-10 overflow-hidden border-none"
                    )}
                >
                    <Sidebar role={user.role} className="h-full border-none w-64" />
                </div>
                <main className="flex-1 p-8 transition-all duration-300 min-w-0">
                    <div className="mb-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                            title={isSidebarOpen ? "إخفاء القائمة الجانبية" : "إظهار القائمة الجانبية"}
                        >
                            {isSidebarOpen ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
                        </Button>
                    </div>
                    {children}
                </main>
            </div>
        </div>
    )
}
