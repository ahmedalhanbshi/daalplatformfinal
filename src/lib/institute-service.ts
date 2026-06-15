/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */
import apiClient from './api-client';

export interface InstituteDashboardData {
    institute: {
        id: string;
        name: string;
        adminName: string;
        verificationStatus: string;
    };
    stats: {
        activeCourses: number;
        totalCourses: number;
        rooms: number;
        roomBookingsToday: number;
        totalStudents: number;
        totalEarnings: number;
    };
    recentEnrollments: {
        id: string;
        courseTitle: string;
        studentName: string;
        enrolledAt: string;
        status: string;
    }[];
    upcomingSessions: {
        id: string;
        title: string;
        courseTitle: string;
        trainer: string;
        startDate: string;
        enrolledStudents: number;
        type: string;
    }[];
    recentNotifications: {
        id: string;
        title: string;
        message: string;
        createdAt: string;
        isRead: boolean;
    }[];
}

class InstituteService {
    async getDashboard(): Promise<InstituteDashboardData> {
        const response = await apiClient.get<{ success: boolean; message: string; data: InstituteDashboardData }>('/api/institute/dashboard');
        return response.data.data;
    }

    async getProfile(): Promise<any> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any }>('/api/institute/profile');
        return response.data.data;
    }

    async updateProfile(data: FormData): Promise<any> {
        const response = await apiClient.put<{ success: boolean; message: string; data: any }>('/api/institute/profile', data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data.data;
    }

    async getCourses(): Promise<any[]> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any[] }>('/api/institute/courses');
        return response.data.data;
    }

    async deleteCourse(id: string): Promise<void> {
        await apiClient.delete(`/api/institute/courses/${id}`);
    }

    async changeTrainer(courseId: string, trainerId: string): Promise<void> {
        await apiClient.put(`/api/institute/courses/${courseId}/trainer`, { trainerId });
    }

    async getTrainers(): Promise<{ id: string; name: string; email: string }[]> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any[] }>('/api/institute/trainers');
        return response.data.data;
    }

    async getCourseStudents(courseId: string): Promise<any> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any }>(`/api/institute/courses/${courseId}/students`);
        return response.data.data;
    }

    async unenrollStudent(courseId: string, enrollmentId: string, reason: string): Promise<void> {
        await apiClient.put(`/api/institute/courses/${courseId}/students/${enrollmentId}/unenroll`, { reason });
    }

    async getCourseById(courseId: string): Promise<any> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any }>(`/api/institute/courses/${courseId}`);
        return response.data.data;
    }

    async updateCourse(courseId: string, data: any | FormData): Promise<any> {
        let headers = {};
        if (data instanceof FormData) {
            headers = { 'Content-Type': 'multipart/form-data' };
        }
        const response = await apiClient.put<{ success: boolean; message: string; data: any }>(`/api/institute/courses/${courseId}`, data, { headers });
        return response.data.data;
    }

    async getCategories(): Promise<{ id: string; name: string }[]> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any[] }>('/api/institute/categories');
        return response.data.data;
    }

    async createCategory(name: string): Promise<{ id: string; name: string }> {
        const response = await apiClient.post<{ success: boolean; message: string; data: any }>('/api/institute/categories', { name });
        return response.data.data;
    }

    async createTag(name: string): Promise<any> {
        const response = await apiClient.post<{ success: boolean; message: string; data: any }>('/api/institute/tags', { name });
        return response.data.data;
    }


    async createCourse(data: FormData): Promise<any> {
        const response = await apiClient.post<{ success: boolean; message: string; data: any }>('/api/institute/courses', data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data.data;
    }

    async getStudents(): Promise<{ students: any[]; totalStudents: number; totalEnrollments: number; totalEarnings: number }> {
        const response = await apiClient.get<{ success: boolean; message: string; data: { students: any[]; totalStudents: number; totalEnrollments: number; totalEarnings: number } }>('/api/institute/students');
        return response.data.data;
    }


    async sendStudentAnnouncement(data: {
        title: string;
        message: string;
        recipientId?: string;
        recipientIds?: string[];
        courseId?: string;
        category?: string;
        status?: string;
        scheduledAt?: string;
    }): Promise<any> {
        const response = await apiClient.post<{ success: boolean; message: string; data: any }>('/api/institute/announcements/send', data);
        return response.data.data;
    }

    async getAnnouncements(): Promise<any[]> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any[] }>('/api/institute/announcements');
        return response.data.data;
    }

    async updateAnnouncement(id: string, data: { title: string; message: string }): Promise<any> {
        const response = await apiClient.put<{ success: boolean; message: string; data: any }>(`/api/institute/announcements/${id}`, data);
        return response.data.data;
    }

    async deleteAnnouncement(id: string): Promise<void> {
        await apiClient.delete(`/api/institute/announcements/${id}`);
    }

    async getEnrollments(): Promise<any[]> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any[] }>('/api/institute/enrollments');
        return response.data.data;
    }
    async updateEnrollmentStatus(enrollmentId: string, status: 'ACTIVE' | 'CANCELLED' | 'REJECT_PAYMENT' | 'REJECT_ENROLLMENT', reason?: string): Promise<any> {
        const response = await apiClient.patch<{ success: boolean; message: string; data: any }>(`/api/institute/enrollments/${enrollmentId}/status`, { status, reason });
        return response.data.data;
    }

    async getStaff(): Promise<any[]> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any[] }>('/api/institute/staff');
        return response.data.data;
    }

    async addStaff(data: FormData): Promise<any> {
        const response = await apiClient.post<{ success: boolean; message: string; data: any }>('/api/institute/staff', data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data.data;
    }

    async removeStaff(staffId: string): Promise<void> {
        await apiClient.delete(`/api/institute/staff/${staffId}`);
    }

    async updateStaff(staffId: string, data: FormData): Promise<any> {
        const response = await apiClient.patch<{ success: boolean; message: string; data: any }>(`/api/institute/staff/${staffId}`, data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data.data;
    }

    async updateStaffStatus(staffId: string, status: 'ACTIVE' | 'INACTIVE'): Promise<any> {
        const response = await apiClient.patch<{ success: boolean; message: string; data: any }>(`/api/institute/staff/${staffId}/status`, { status });
        return response.data.data;
    }

    // =====================================================
    // HALLS (ROOMS) MANAGEMENT
    // =====================================================

    async getHalls(): Promise<any[]> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any[] }>('/api/institute/halls');
        return response.data.data;
    }

    async validateHallUpdate(hallId: string, data: any): Promise<{affectedCourses: number, affectedBookings: number}> {
        const response = await apiClient.post<{ success: boolean; message: string; data: any }>(`/api/institute/halls/${hallId}/validate-update`, data);
        return response.data.data;
    }

    async addHall(data: FormData): Promise<any> {
        const response = await apiClient.post<{ success: boolean; message: string; data: any }>('/api/institute/halls', data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data.data;
    }

    async updateHall(hallId: string, data: FormData): Promise<any> {
        const response = await apiClient.patch<{ success: boolean; message: string; data: any }>(`/api/institute/halls/${hallId}`, data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data.data;
    }

    async removeHall(hallId: string): Promise<void> {
        await apiClient.delete(`/api/institute/halls/${hallId}`);
    }

    async getHallAvailability(hallId: string, date?: string): Promise<any> {
        const query = date ? `?date=${parseInt(date) ? date : new Date(date).toISOString()}` : ''; // simple query builder
        // Wait, backend expects strictly `?date=YYYY-MM-DD` or something that `new Date(dateStr)` parses.
        const url = `/api/institute/halls/${hallId}/availability${date ? `?date=${date}` : ''}`;
        const response = await apiClient.get<{ success: boolean; message: string; data: any }>(url);
        return response.data.data;
    }

    // =====================================================
    // BANK ACCOUNTS
    // =====================================================

    async getBankAccounts(): Promise<any[]> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any[] }>('/api/institute/bank-accounts');
        return response.data.data;
    }

    async addBankAccount(data: { bankName: string; accountName: string; accountNumber: string; iban?: string }): Promise<any> {
        const response = await apiClient.post<{ success: boolean; message: string; data: any }>('/api/institute/bank-accounts', data);
        return response.data.data;
    }

    async updateBankAccount(accountId: string, data: { bankName?: string; accountName?: string; accountNumber?: string; iban?: string; isActive?: boolean }): Promise<any> {
        const response = await apiClient.patch<{ success: boolean; message: string; data: any }>(`/api/institute/bank-accounts/${accountId}`, data);
        return response.data.data;
    }

    async deleteBankAccount(accountId: string): Promise<void> {
        await apiClient.delete(`/api/institute/bank-accounts/${accountId}`);
    }

    // =====================================================
    // ROOM BOOKINGS
    // =====================================================

    async getRoomBookings(): Promise<any[]> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any[] }>('/api/institute/halls/bookings');
        return response.data.data;
    }

    async getDirectBookers(): Promise<any[]> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any[] }>('/api/institute/halls/direct-bookers');
        return response.data.data;
    }

    async updateRoomBookingStatus(bookingId: string, data: { status: 'APPROVED' | 'REJECTED'; notes?: string; roomId?: string }): Promise<any> {
        const response = await apiClient.patch<{ success: boolean; message: string; data: any }>(`/api/institute/halls/bookings/${bookingId}/status`, data);
        return response.data.data;
    }

    async getSchedule(): Promise<any[]> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any[] }>('/api/institute/schedule');
        return response.data.data;
    }

    async updateSession(sessionId: string, data: { startTime?: string; endTime?: string; status?: string; meetingLink?: string; updateAll?: boolean; reason?: string }): Promise<any> {
        const response = await apiClient.patch<{ success: boolean; message: string; data: any }>(
            `/api/institute/sessions/${sessionId}`, data
        );
        return response.data.data;
    }

    async getPublicInstitutes(): Promise<any[]> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any[] }>('/api/public/institutes');
        return response.data.data;
    }

    async getPublicInstituteById(id: string): Promise<any> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any }>(`/api/public/institutes/${id}`);
        return response.data.data;
    }

    // ==========================================
    // Course � Edit & Lifecycle
    // ==========================================


    /**
     * تفع�Š�„ دورة PENDING_MINIMUM بعد اكتمال الحد الأدنى �ˆإضافة الجلسات.
     * �Šُح�ˆ�‘�„ جميع طلاب PRELIMINARY_APPROVED → PENDING_PAYMENT �ˆ�Šُرس�„ إشعار لكل طالب.
     */
    async activateCourse(courseId: string): Promise<{ courseId: string }> {
        const response = await apiClient.patch<{ success: boolean; message: string; data: { courseId: string } }>(
            `/api/institute/courses/${courseId}/activate`
        );
        return response.data.data;
    }
}

export const instituteService = new InstituteService();

