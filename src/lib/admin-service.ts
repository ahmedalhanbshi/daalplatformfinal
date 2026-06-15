/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */
import apiClient from './api-client';

interface PendingTrainer {
    id: string;
    userId: string;
    bio: string | null;
    cvUrl: string | null;
    specialties: string[];
    certificatesUrls: string[];
    verificationStatus: string;
    user: {
        id: string;
        name: string;
        email: string;
        phone: string | null;
        createdAt: string;
    };
}

interface PendingInstitute {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    licenseNumber: string | null;
    licenseDocumentUrl: string | null;
    verificationStatus: string;
    user: {
        id: string;
        name: string;
        email: string;
        phone: string | null;
        createdAt: string;
    };
}

interface PendingVerifications {
    trainers: PendingTrainer[];
    institutes: PendingInstitute[];
}

export interface DashboardStats {
    stats: {
        totalUsers: number;
        totalInstitutes: number;
        totalCourses: number;
        totalRevenue: number;
        pendingApprovals: number;
    };
    pendingItems: {
        id: string;
        userId?: string;
        type: 'trainer' | 'institute' | 'course';
        title: string;
        description: string;
        date: string;
    }[];
    recentActivity: {
        action: string;
        details: string;
        time: string;
    }[];
}

class AdminService {
    /**
     * Get all pending verifications
     */
    async getPendingVerifications(): Promise<PendingVerifications> {
        const response = await apiClient.get<{ success: boolean; message: string; data: PendingVerifications }>(
            '/api/admin/verifications/pending'
        );
        return response.data.data;
    }

    /**
     * Approve trainer verification
     */
    async approveTrainer(trainerId: string): Promise<void> {
        await apiClient.post(`/api/admin/verifications/trainer/${trainerId}/approve`);
    }

    /**
     * Reject trainer verification
     */
    async rejectTrainer(trainerId: string, reason: string): Promise<void> {
        await apiClient.post(`/api/admin/verifications/trainer/${trainerId}/reject`, { reason });
    }

    /**
     * Approve institute verification
     */
    async approveInstitute(instituteId: string): Promise<void> {
        await apiClient.post(`/api/admin/verifications/institute/${instituteId}/approve`);
    }

    /**
     * Reject institute verification
     */
    async rejectInstitute(instituteId: string, reason: string): Promise<void> {
        await apiClient.post(`/api/admin/verifications/institute/${instituteId}/reject`, { reason });
    }

    /**
     * Get dashboard stats
     */
    async getDashboardStats(): Promise<DashboardStats> {
        const response = await apiClient.get<{ success: boolean; message: string; data: DashboardStats }>(
            '/api/admin/dashboard/stats'
        );
        return response.data.data;
    }

    /**
     * Get all trainers
     */
    async getAllTrainers(): Promise<any[]> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any[] }>(`/api/admin/trainers?t=${Date.now()}`);
        return response.data.data;
    }

    /**
     * Update trainer
     */
    async updateTrainer(id: string, data: any): Promise<void> {
        await apiClient.put(`/api/admin/trainers/${id}`, data);
    }

    /**
     * Get all institutes
     */
    async getAllInstitutes(): Promise<any[]> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any[] }>(`/api/admin/institutes?t=${Date.now()}`);
        return response.data.data;
    }

    async suspendInstitute(id: string, reason: string): Promise<void> {
        await apiClient.post(`/api/admin/institutes/${id}/suspend`, { reason });
    }

    async reactivateInstitute(id: string): Promise<void> {
        await apiClient.post(`/api/admin/institutes/${id}/reactivate`);
    }

    async deleteInstitute(id: string): Promise<void> {
        await apiClient.delete(`/api/admin/institutes/${id}`);
    }

    async updateInstitute(id: string, data: any): Promise<void> {
        await apiClient.put(`/api/admin/institutes/${id}`, data);
    }

    /**
     * Get all students
     */
    async getAllStudents(): Promise<any[]> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any[] }>(`/api/admin/students?t=${Date.now()}`);
        return response.data.data;
    }

    /**
     * Update student
     */
    async updateStudent(id: string, data: any): Promise<void> {
        await apiClient.put(`/api/admin/students/${id}`, data);
    }

    /**
     * Suspend student
     */
    async suspendStudent(id: string, reason: string): Promise<void> {
        await apiClient.post(`/api/admin/students/${id}/suspend`, { reason });
    }

    /**
     * Delete student
     */
    async deleteStudent(id: string): Promise<void> {
        await apiClient.delete(`/api/admin/students/${id}`);
    }

    // =====================================================
    // COURSE MANAGEMENT
    // =====================================================

    /**
     * Get all courses
     */
    async getAllCourses(): Promise<any[]> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any[] }>(`/api/admin/courses?t=${Date.now()}`);
        return response.data.data;
    }

    /**
     * Update course
     */
    async updateCourse(id: string, data: any): Promise<void> {
        await apiClient.put(`/api/admin/courses/${id}`, data);
    }

    /**
     * Delete course
     */
    async deleteCourse(id: string): Promise<void> {
        await apiClient.delete(`/api/admin/courses/${id}`);
    }

    /**
     * Suspend course
     */
    async suspendCourse(id: string): Promise<void> {
        await apiClient.post(`/api/admin/courses/${id}/suspend`);
    }

    // =====================================================
    // ANNOUNCEMENT MANAGEMENT
    // =====================================================

    /**
     * Get all announcements
     */
    async getAnnouncements(): Promise<any[]> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any[] }>(
            `/api/admin/announcements?t=${Date.now()}`
        );
        return response.data.data;
    }

    /**
     * Create a new announcement
     */
    async createAnnouncement(data: {
        title: string;
        content: string;
        targetAudience?: string;
        category?: string;
        scheduledDate?: string;
        scheduledTime?: string;
        recipientIds?: string[];
    }): Promise<{ id: string }> {
        const response = await apiClient.post<{ success: boolean; message: string; data: { id: string } }>(
            '/api/admin/announcements',
            data
        );
        return response.data.data;
    }

    /**
     * Update an announcement
     */
    async updateAnnouncement(id: string, data: any): Promise<void> {
        await apiClient.put(`/api/admin/announcements/${id}`, data);
    }

    /**
     * Delete an announcement
     */
    async deleteAnnouncement(id: string): Promise<void> {
        await apiClient.delete(`/api/admin/announcements/${id}`);
    }

    /**
     * Send an announcement (marks as SENT and creates notifications)
     */
    async sendAnnouncement(id: string): Promise<{ recipientCount: number }> {
        const response = await apiClient.post<{ success: boolean; message: string; data: { recipientCount: number } }>(
            `/api/admin/announcements/${id}/send`
        );
        return response.data.data;
    }

    /**
     * Get all system audit logs
     */
    async getAuditLogs(): Promise<any[]> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any[] }>(
            `/api/admin/audit-logs?t=${Date.now()}`
        );
        return response.data.data;
    }

    /**
     * Search users by name, email, or phone
     */
    async searchUsers(query: string): Promise<any[]> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any[] }>(
            `/api/admin/users/search?q=${encodeURIComponent(query)}`
        );
        return response.data.data;
    }

    // =====================================================
    // HALLS MANAGEMENT
    // =====================================================

    /**
     * Get all halls across all institutes (admin endpoint)
     */
    async getAllHalls(): Promise<any[]> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any[] }>(
            `/api/admin/halls`
        );
        return response.data.data;
    }

    /**
     * Update hall (activate/deactivate)
     */
    async updateHall(id: string, data: any): Promise<void> {
        await apiClient.put(`/api/admin/halls/${id}`, data);
    }

    /**
     * Get hall by ID
     */
    async getHallById(hallId: string): Promise<any> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any }>(
            `/api/public/halls/${hallId}`
        );
        return response.data.data;
    }

    // =====================================================
    // USER ACCOUNT STATUS MANAGEMENT
    // =====================================================

    /**
     * Reactivate a suspended trainer account (uses updateTrainer with status:active)
     */
    async reactivateTrainer(trainerId: string): Promise<void> {
        await apiClient.put(`/api/admin/trainers/${trainerId}`, { status: 'active' });
    }

    /**
     * Reactivate a suspended student account (uses updateStudent with status:active)
     */
    async reactivateStudent(studentId: string): Promise<void> {
        await apiClient.put(`/api/admin/students/${studentId}`, { status: 'active' });
    }

    /**
     * Update user login credentials � uses updateStudent/updateTrainer/updateInstitute
     * depending on the role. Pass email and/or password.
     */
    async updateUserCredentials(userId: string, data: { email?: string; password?: string }): Promise<void> {
        // Generic fallback: try student update endpoint
        await apiClient.put(`/api/admin/students/${userId}`, data);
    }
}

export const adminService = new AdminService();


