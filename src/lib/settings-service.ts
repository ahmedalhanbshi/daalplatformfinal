import apiClient from './api-client';

export interface SystemSettings {
  general: {
    siteName: string;
    siteDescription: string;
    siteLogo: string;
    contactEmail: string;
    supportPhone: string;
    maintenanceMode: string;
    maintenanceMessage: string;
    maintenanceEndTime: string;
    registrationEnabled: string;
  };
  email: {
    fromName: string;
    fromEmail: string;
    smtpHost: string;
    smtpPort: string;
    smtpUser: string;
    smtpPassword: string;
  };
  legal: {
    termsContent: string;
    termsUpdatedAt: string;
    privacyContent: string;
    privacyUpdatedAt: string;
  };
}

export interface LegalContent {
  terms: { content: string; updatedAt: string };
  privacy: { content: string; updatedAt: string };
}

class SettingsService {
  /**
   * GET /api/admin/settings � جلب كل الإعدادات (admin)
   */
  async getSettings(): Promise<SystemSettings> {
    const response = await apiClient.get<{
      success: boolean;
      message: string;
      data: SystemSettings;
    }>('/api/admin/settings');
    return response.data.data;
  }

  /**
   * PUT /api/admin/settings � حفظ قسم معين من الإعدادات
   * يحوّل الـ object إلى مصفوفة key-value للـ backend
   */
  async saveSection(
    section: string,
    values: Record<string, string>
  ): Promise<void> {
    const entries = Object.entries(values).map(([field, value]) => ({
      key: `${section}.${field}`,
      value,
    }));
    await apiClient.put('/api/admin/settings', entries);
  }

  /**
   * POST /api/admin/settings/maintenance � تفعيل وضع الصيانة
   */
  async updateMaintenanceMode(data: {
    maintenanceMode: boolean | string;
    maintenanceMessage?: string;
    maintenanceEndTime?: string;
    hardMode?: boolean;
  }): Promise<void> {
    await apiClient.post('/api/admin/settings/maintenance', data);
  }

  /**
   * POST /api/admin/settings/logo � رفع شعار جديد للمنصة
   */
  async uploadSiteLogo(file: File): Promise<{ logoUrl: string }> {
    const formData = new FormData();
    formData.append('logo', file);

    const response = await apiClient.post<{
      success: boolean;
      message: string;
      data: { logoUrl: string };
    }>('/api/admin/settings/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  }

  /**
   * DELETE /api/admin/settings/logo � remove the platform logo
   */
  async removeSiteLogo(): Promise<{ logoUrl: string }> {
    const response = await apiClient.delete<{
      success: boolean;
      message: string;
      data: { logoUrl: string };
    }>('/api/admin/settings/logo');

    return response.data.data;
  }
}

export const settingsService = new SettingsService();

export interface PublicSettings {
  general: {
    siteName: string;
    siteDescription: string;
    siteLogo?: string;
    contactEmail: string;
    supportPhone: string;
    maintenanceMode?: boolean;
    maintenanceMessage?: string;
    maintenanceEndTime?: string;
  };
  legal: {
    terms: {
      content: string;
      updatedAt: string;
    };
    privacy: {
      content: string;
      updatedAt: string;
    };
  };
}

/**
 * جلب الإعدادات العامة من الـ API العام (للاستخدام في server components)
 */
export async function fetchPublicSettings(): Promise<PublicSettings> {
  const defaultLegal = {
    content: "",
    updatedAt: "",
  };

  const defaultGeneral = {
    siteName: "منصة دال",
    siteDescription: "منصة شاملة لحجز وإدارة الدورات التدريبية",
    siteLogo: "",
    contactEmail: "support@platform.com",
    supportPhone: "",
  };

  try {
    // Set NEXT_PUBLIC_API_URL in production; the local fallback matches the current dev backend.
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    const res = await fetch(`${apiBase}/api/public/settings`, {
      cache: 'no-store', // always fetch fresh � reflects admin changes immediately
    });
    if (!res.ok) {
      return { general: defaultGeneral, legal: { terms: defaultLegal, privacy: defaultLegal } };
    }

    const data = await res.json();
    return data.data || { general: defaultGeneral, legal: { terms: defaultLegal, privacy: defaultLegal } };
  } catch (error) {
    console.error("Error fetching public settings:", error);
    return { general: defaultGeneral, legal: { terms: defaultLegal, privacy: defaultLegal } };
  }
}
