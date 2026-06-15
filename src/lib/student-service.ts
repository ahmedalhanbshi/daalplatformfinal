/* eslint-disable @typescript-eslint/no-explicit-any -- legacy student API contract typing; temporary until these endpoints are fully modeled */
import apiClient from './api-client';
import { User } from '@/types';

export interface StudentCourse {
    id: string;
    title: string;
    shortDescription: string;
    trainer: string;
    trainers?: { name: string; avatar?: string | null; id?: string }[];
    image: string | null;
    category: string;
}

export interface StudentNotification {
    id: string;
    title: string;
    message: string;
    time: string; // The backend returns an ISO string
    type: 'success' | 'warning' | 'reminder' | 'material' | 'info';
    isRead: boolean;
}

export interface StudentDashboardStats {
    activeCourses: number;
    completedCourses: number;
}

export interface StudentDashboardData {
    user: User;
    currentCourses: StudentCourse[];
    recentNotifications: StudentNotification[];
    favoriteIds: string[];
    stats: StudentDashboardStats;
}

export const studentService = {
    /**
     * Get dashboard data for the authenticated student
     */
    async getDashboard(): Promise<StudentDashboardData> {
        const response = await apiClient.get('/api/student/dashboard');
        return response.data.data;
    },

    /**
     * Get all courses for the student
     */
    async getMyCourses(): Promise<any[]> {
        const response = await apiClient.get('/api/student/my-courses');
        return response.data.data;
    },

    /**
     * Get the student's schedule (upcoming and past sessions)
     */
    async getSchedule(): Promise<any[]> {
        const response = await apiClient.get('/api/student/schedule');
        return response.data.data;
    },

    /**
     * Get the student's enrollment status for a specific course
     */
    async getEnrollmentStatus(courseId: string): Promise<{ status: string; id?: string }> {
        const response = await apiClient.get(`/api/student/courses/${courseId}/enrollment-status`);
        return response.data.data;
    },

    /**
     * Pre-register a student to a course
     */
    async preRegisterCourse(courseId: string, data: { fullName: string; email: string; phone: string }): Promise<{ status: string; enrollmentId: string }> {
        const response = await apiClient.post(`/api/student/courses/${courseId}/pre-register`, data);
        return response.data.data;
    },

    /**
     * Submit payment proof for a course
     */
    async submitPaymentProof(courseId: string, file: File): Promise<{ status: string }> {
        const formData = new FormData();
        formData.append('paymentReceipt', file);

        const response = await apiClient.post(
            `/api/student/courses/${courseId}/payment-proof`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            }
        );
        return response.data.data;
    },

    /**
     * Get detailed information for a specific course
     */
    async getCourseDetails(courseId: string): Promise<any> {
        const response = await apiClient.get(`/api/student/courses/${courseId}`);
        return response.data.data;
    },

    /**
     * Get the student's wishlist
     */
    async getWishlist(): Promise<any[]> {
        const response = await apiClient.get('/api/student/wishlist');
        return response.data.data;
    },

    /**
     * Remove a course from the student's wishlist
     */
    async removeFromWishlist(courseId: string): Promise<void> {
        await apiClient.delete(`/api/student/wishlist/${courseId}`);
    },

    /**
     * Toggle a course in the student's wishlist
     */
    async toggleWishlist(courseId: string): Promise<{ added: boolean }> {
        const response = await apiClient.post(`/api/student/wishlist/${courseId}/toggle`);
        return response.data.data;
    },

    /**
     * Get public hall details by ID
     */
    async getHallById(hallId: string): Promise<any> {
        const response = await apiClient.get(`/api/student/halls/${hallId}`);
        return response.data.data;
    },

    /**
     * Cancel an enrollment
     */
    async cancelEnrollment(enrollmentId: string): Promise<void> {
        await apiClient.post(`/api/student/enrollments/${enrollmentId}/cancel`);
    }
};
