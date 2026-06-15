"use client"

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { getFileUrl } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { usePlatform } from "@/contexts/platform-context";
import { Wrench, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { settings } = usePlatform();
  const [forcedMaintenance, setForcedMaintenance] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleMaintenanceEvent = () => {
      setForcedMaintenance(true);
    };

    window.addEventListener("maintenance-mode-active", handleMaintenanceEvent);
    return () => {
      window.removeEventListener("maintenance-mode-active", handleMaintenanceEvent);
    };
  }, []);

  // Wait for auth to finish loading so we don't flash the maintenance page
  // if an admin is hard-refreshing the page.
  if (isLoading) {
    return <>{children}</>; 
  }

  const isMaintenanceMode = settings?.general?.maintenanceMode === true || forcedMaintenance;
  const isPlatformAdmin = isAuthenticated && user?.role === "PLATFORM_ADMIN";
  const isAuthPage = pathname?.startsWith('/auth');

  if (isMaintenanceMode && !isPlatformAdmin && !isAuthPage) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-slate-900 p-4" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center space-y-6">
          <div className="mx-auto relative w-20 h-20 mb-4">
            <Image 
              src={getFileUrl(settings?.general?.siteLogo) || "/images/logo.png"} 
              alt="Logo" 
              fill 
              className="object-contain" 
              unoptimized 
            />
          </div>
          
          <h1 className="text-2xl font-bold text-slate-800">المنصة تحت الصيانة</h1>
          
          <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
            {settings?.general?.maintenanceMessage || "نعتذر عن الإزعاج، نقوم حالياً بإجراء تحديثات وتحسينات على المنصة. يرجى المحاولة مرة أخرى لاحقاً."}
          </p>

          {settings?.general?.maintenanceEndTime && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mt-6">
              <p className="text-sm text-slate-500 mb-1">وقت الانتهاء المتوقع:</p>
              <p className="font-medium text-slate-800">{settings.general.maintenanceEndTime}</p>
            </div>
          )}

          <div className="pt-6">
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full gap-2"
              variant="outline"
            >
              <RefreshCw className="w-4 h-4" />
              تحديث الصفحة
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
