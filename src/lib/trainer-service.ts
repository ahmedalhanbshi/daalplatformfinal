/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */
import apiClient from './api-client';

export interface TrainerDashboardData {
    stats: {
        totalCourses: number;
        activeCourses: number;
        totalStudents: number;
        totalSessions: number;
        sessionsToday: number;
        totalEarnings: number;
        upcomingSessions: number;
        pendingRoomBookings: number;
    };
    upcomingSessions: {
        id: string;
        title: string;
        courseTitle: string;
        startTime: string;
        endTime: string;
        type: string;
        room: string | null;
        meetingLink: string | null;
        enrolledStudents: number;
    }[];
    pendingRoomBookings: {
        id: string;
        courseTitle: string;
        sessionTitle: string;
        requestedDate: string;
        duration: number;
        requestedRoom: string;
        status: string;
    }[];
    recentEnrollments: {
        id: string;
        courseTitle: string;
        studentName: string;
        enrolledAt: string;
        status: string;
    }[];
    recentNotifications: {
        id: string;
        title: string;
        message: string;
        createdAt: string;
        isRead: boolean;
    }[];
}

export interface ExploreCourse {
    id: string;
    trainerId: string | null;
    instituteId: string | null;
    title: string;
    description: string;
    shortDescription: string;
    category: string;
    image: string | null;
    studentsCount: number;
    sessionsCount: number;
    duration: number | string;
    trainer: { name: string; avatar: string | null };
    staffTrainers?: { id: string; name: string; avatar: string | null }[];
    price: number;
    minStudents: number;
    courseStatus: 'ACTIVE' | 'PENDING_MINIMUM';
    startDate: string;
    createdAt: string;
    deliveryType: string;
    roomId?: string | null;
    roomName?: string | null;
}

export interface ExploreCoursesData {
    courses: ExploreCourse[];
    categories: { id: string; name: string }[];
}

export interface ExploreCoursesQuery {
    q?: string;
    category?: string;
    sort?: "newest" | "oldest" | "price_low" | "price_high";
    deliveryType?: "online" | "in_person" | "all";
    minPrice?: number;
    maxPrice?: number;
}

export interface CourseDetail {
    id: string;
    trainerId: string | null;
    instituteId: string | null;
    title: string;
    category: string;
    shortDescription: string;
    description: string;
    image: string | null;
    surveyLink?: string | null;
    price: number;
    minStudents: number; // min students needed to activate the course
    courseStatus: 'ACTIVE' | 'PENDING_MINIMUM';
    startDate: string;
    endDate: string;
    sessionsCount: number;
    weeksCount: number;
    maxStudents: number;
    enrolledCount: number;
    prerequisites: string[];
    objectives: string[];
    tags: string[];
    deliveryType: 'online' | 'in_person' | 'hybrid';
    sessions: {
        id: string;
        topic: string | null;
        startTime: string;
        endTime: string;
        type: string;
        status: string;
        meetingLink: string | null;
        location: string | null;
        room: { id: string; name: string; location: string | null; locationUrl?: string | null } | null;
        roomId?: string | null;
    }[];
    instructor: {
        name: string;
        avatar: string | null;
        email: string | null;
        phone: string | null;
        bio: string | null;
        specialties: string[];
        bankAccounts?: {
            id: string;
            bankName: string;
            accountName: string;
            accountNumber: string;
            iban: string | null;
            isActive: boolean;
        }[];
    };
    staffTrainers?: {
        id: string;
        name: string;
        bio: string | null;
        email: string | null;
        phone: string | null;
        specialties: string[];
    }[];
    institute?: {
        name: string;
        logo: string | null;
        email: string | null;
        phone: string | null;
        description: string | null;
        features?: string[];
    } | null;
}

export interface Session {
    id: string;
    title: string;
    courseId: string | null;
    courseTitle: string;
    startTime: string;
    endTime: string;
    type: 'online' | 'in_person' | 'hybrid';
    status: 'scheduled' | 'completed' | 'cancelled' | 'postponed';
    meetingLink: string | null;
    location: string;
    enrolledStudents: number;
    roomId: string | null;
    isDirectBooking?: boolean;
}

class TrainerService {
    async getSchedule(): Promise<Session[]> {
        const response = await apiClient.get<{ success: boolean; message: string; data: Session[] }>('/api/trainer/schedule');
        return response.data.data;
    }

    async getPublicCourseById(courseId: string): Promise<CourseDetail> {
        const response = await apiClient.get<{ success: boolean; message: string; data: CourseDetail }>(`/api/trainer/explore/${courseId}`);
        return response.data.data;
    }

    async getExploreCourses(params?: ExploreCoursesQuery): Promise<ExploreCoursesData> {
        const response = await apiClient.get<{ success: boolean; message: string; data: ExploreCoursesData }>('/api/trainer/explore', {
            params: {
                ...(params?.q ? { q: params.q } : {}),
                ...(params?.category ? { category: params.category } : {}),
                ...(params?.sort ? { sort: params.sort } : {}),
                ...(params?.deliveryType && params.deliveryType !== "all" ? { deliveryType: params.deliveryType } : {}),
                ...(params?.minPrice !== undefined ? { minPrice: params.minPrice } : {}),
                ...(params?.maxPrice !== undefined ? { maxPrice: params.maxPrice } : {}),
            },
        });
        return response.data.data;
    }

    async getDashboard(): Promise<TrainerDashboardData> {
        const response = await apiClient.get<{ success: boolean; message: string; data: TrainerDashboardData }>('/api/trainer/dashboard');
        return response.data.data;
    }

    async getCategories(): Promise<any[]> {
        const response = await apiClient.get('/api/trainer/categories');
        return response.data.data;
    }

    async createCategory(name: string): Promise<any> {
        const response = await apiClient.post('/api/trainer/categories', { name });
        return response.data.data;
    }

    async createTag(name: string): Promise<any> {
        const response = await apiClient.post('/api/trainer/tags', { name });
        return response.data.data;
    }

    /**
     * Get all active halls across all institutes 
     */
    async getHalls(): Promise<any[]> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any[] }>('/api/trainer/halls');
        return response.data.data;
    }

    async getHallById(hallId: string): Promise<any> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any }>(`/api/public/halls/${hallId}`);
        return response.data.data;
    }

    async getHallAvailability(hallId: string, date?: string): Promise<any> {
        const url = `/api/trainer/halls/${hallId}/availability${date ? `?date=${date}` : ''}`;
        const response = await apiClient.get<{ success: boolean; message: string; data: any }>(url);
        return response.data.data;
    }


    /**
     * Create a new course
     * Handles standard courses, or "in_person" courses where a hall is booked and a payment receipt is required.
     */
    async getCourses(): Promise<any[]> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any[] }>('/api/trainer/courses');
        return response.data.data;
    }

    async deleteCourse(id: string): Promise<void> {
        await apiClient.delete(`/api/trainer/courses/${id}`);
    }

    async getTrainerCourseById(courseId: string): Promise<any> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any }>(`/api/trainer/courses/${courseId}`);
        return response.data.data;
    }

    async updateTrainerCourse(courseId: string, data: any | FormData): Promise<any> {
        let headers = {};
        if (data instanceof FormData) {
            headers = { 'Content-Type': 'multipart/form-data' };
        }
        const response = await apiClient.put<{ success: boolean; message: string; data: any }>(`/api/trainer/courses/${courseId}`, data, { headers });
        return response.data.data;
    }

    async getCourseStudents(courseId: string): Promise<any> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any }>(`/api/trainer/courses/${courseId}/students`);
        return response.data.data;
    }

    async unenrollStudent(courseId: string, enrollmentId: string, reason: string): Promise<any> {
        const response = await apiClient.patch<{ success: boolean; message: string; data: any }>(`/api/trainer/courses/${courseId}/students/${enrollmentId}/unenroll`, { reason });
        return response.data.data;
    }

    async createCourse(data: FormData): Promise<any> {
        const response = await apiClient.post<{ success: boolean; message: string; data: any }>('/api/trainer/courses', data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data.data;
    }

    async getProfile(): Promise<any> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any }>('/api/trainer/profile');
        return response.data.data;
    }

    async updateProfile(data: {
        name?: string;
        phone?: string;
        email?: string;
        bio?: string;
        specialties?: string[];
        avatar?: File;
    }): Promise<any> {
        const formData = new FormData();
        if (data.name) formData.append('name', data.name);
        if (data.phone !== undefined) formData.append('phone', data.phone);
        if (data.email) formData.append('email', data.email);
        if (data.bio !== undefined) formData.append('bio', data.bio);
        if (data.specialties) formData.append('specialties', JSON.stringify(data.specialties));
        if (data.avatar) formData.append('avatar', data.avatar);

        const response = await apiClient.patch<{ success: boolean; message: string; data: any }>('/api/trainer/profile', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data.data;
    }

    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        await apiClient.post('/api/trainer/profile/change-password', { currentPassword, newPassword });
    }

    async getAllStudents(): Promise<any> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any }>('/api/trainer/students');
        return response.data.data;
    }

    async sendStudentAnnouncement(data: {
        title: string;
        message: string;
        recipientIds?: string[];
        courseId?: string;
        category?: string;
        status?: string;
        scheduledAt?: string;
    }): Promise<any> {
        const response = await apiClient.post<{ success: boolean; message: string; data: any }>('/api/trainer/announcements/send', data);
        return response.data.data;
    }

    async getAnnouncements(): Promise<any[]> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any[] }>('/api/trainer/announcements');
        return response.data.data;
    }

    async updateAnnouncement(id: string, data: { title: string; message: string }): Promise<any> {
        const response = await apiClient.put<{ success: boolean; message: string; data: any }>(`/api/trainer/announcements/${id}`, data);
        return response.data.data;
    }

    async deleteAnnouncement(id: string): Promise<void> {
        await apiClient.delete(`/api/trainer/announcements/${id}`);
    }

    async getEnrollments(): Promise<any[]> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any[] }>('/api/trainer/enrollments');
        return response.data.data;
    }

    async updateEnrollmentStatus(enrollmentId: string, status: 'ACTIVE' | 'CANCELLED' | 'REJECT_PAYMENT' | 'REJECT_ENROLLMENT', reason?: string): Promise<any> {
        const response = await apiClient.patch<{ success: boolean; message: string; data: any }>(`/api/trainer/enrollments/${enrollmentId}/status`, { status, reason });
        return response.data.data;
    }

    async getRoomBookings(): Promise<any[]> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any[] }>('/api/trainer/bookings');
        return response.data.data;
    }

    async resubmitBookingPayment(courseId: string, bookingId: string, file: File): Promise<any> {
        const formData = new FormData();
        formData.append('paymentReceipt', file);
        const response = await apiClient.post<{ success: boolean; message: string; data: any }>(
            `/api/trainer/courses/${courseId}/bookings/${bookingId}/resubmit`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return response.data.data;
    }

    async cancelBooking(courseId: string | null | undefined, bookingId: string): Promise<any> {
        // Direct bookings (not linked to a course) use a different endpoint
        const url = courseId && courseId !== 'null'
            ? `/api/trainer/courses/${courseId}/bookings/${bookingId}`
            : `/api/trainer/bookings/${bookingId}`;
        const response = await apiClient.delete<{ success: boolean; message: string; data: any }>(url);
        return response.data.data;
    }

    async updateSession(sessionId: string, data: { startTime?: string; endTime?: string; status?: string; meetingLink?: string; updateAll?: boolean; reason?: string }): Promise<any> {
        const response = await apiClient.patch<{ success: boolean; message: string; data: any }>(
            `/api/trainer/sessions/${sessionId}`, data
        );
        return response.data.data;
    }

    async bookHall(hallId: string, sessions: { date: string; slot: number }[], receipt?: File, note?: string): Promise<any> {
        const formData = new FormData();
        formData.append('sessions', JSON.stringify(sessions));
        if (receipt) formData.append('paymentReceipt', receipt);
        if (note) formData.append('note', note);

        const response = await apiClient.post<{ success: boolean; message: string; data: any }>(
            `/api/trainer/halls/${hallId}/book`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return response.data;
    }

    // ==========================================
    // Trainer Bank Accounts
    // ==========================================

    async getBankAccounts(): Promise<any[]> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any[] }>('/api/trainer/bank-accounts');
        return response.data.data;
    }

    async addBankAccount(data: { bankName: string; accountName: string; accountNumber: string; iban?: string }): Promise<any> {
        const response = await apiClient.post<{ success: boolean; message: string; data: any }>('/api/trainer/bank-accounts', data);
        return response.data.data;
    }

    async updateBankAccount(accountId: string, data: { bankName?: string; accountName?: string; accountNumber?: string; iban?: string; isActive?: boolean }): Promise<any> {
        const response = await apiClient.patch<{ success: boolean; message: string; data: any }>(`/api/trainer/bank-accounts/${accountId}`, data);
        return response.data.data;
    }

    async deleteBankAccount(accountId: string): Promise<void> {
        await apiClient.delete(`/api/trainer/bank-accounts/${accountId}`);
    }

    // ==========================================
    // Course Lifecycle � Activation
    // ==========================================

    /**
     * تفع�Š�„ دورة PENDING_MINIMUM بعد اكتمال الحد الأدنى �ˆإضافة الجلسات.
     * �Šُح�ˆ�‘�„ جميع طلاب PRELIMINARY_APPROVED → PENDING_PAYMENT �ˆ�Šُرس�„ إشعار لكل طالب.
     */
    async activateCourse(courseId: string): Promise<{ courseId: string }> {
        const response = await apiClient.patch<{ success: boolean; message: string; data: { courseId: string } }>(
            `/api/trainer/courses/${courseId}/activate`
        );
        return response.data.data;
    }

    /**
     * جلب بيانات دورة واحدة للتعديل مع إحصاء الطلاب المقبولين مبدئياً.
     * �Šُع�Šد �†فس بيانات getTrainerCourseById مع إضافة enrolledCount.
     */
    async getTrainerCourseWithEnrollments(courseId: string): Promise<any> {
        const response = await apiClient.get<{ success: boolean; message: string; data: any }>(
            `/api/trainer/courses/${courseId}`
        );
        return response.data.data;
    }

}

export const trainerService = new TrainerService();

