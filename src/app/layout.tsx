import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { NotificationProvider } from "@/contexts/notification-context";
import { ThemeProvider } from "@/components/theme-provider";
import { PlatformProvider } from "@/contexts/platform-context";
import { NavbarWrapper } from "@/components/layout/navbar-wrapper";
import { Toaster } from "sonner";
import { PLATFORM_NAME } from "@/lib/brand";

import { fetchPublicSettings } from "@/lib/settings-service";

import { MaintenanceGuard } from "@/components/layout/maintenance-guard";

export async function generateMetadata(): Promise<Metadata> {
  const { general } = await fetchPublicSettings();
  return {
    title: {
      template: `%s | ${general.siteName || PLATFORM_NAME}`,
      default: general.siteName || PLATFORM_NAME,
    },
    description: general.siteDescription || "منصة شاملة لحجز وإدارة الدورات التدريبية",
    icons: {
      icon: "/favicon.ico?v=2",
      shortcut: "/favicon.ico?v=2",
      apple: "/apple-icon.png?v=2",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <AuthProvider>
          <NotificationProvider>
            <PlatformProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="light"
                enableSystem={false}
                disableTransitionOnChange
              >
                <MaintenanceGuard>
                  <NavbarWrapper />
                  {children}
                </MaintenanceGuard>
                <Toaster richColors position="bottom-right" />
              </ThemeProvider>
            </PlatformProvider>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}


