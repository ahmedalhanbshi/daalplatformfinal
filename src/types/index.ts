export type UserRole = 'STUDENT' | 'TRAINER' | 'INSTITUTE_ADMIN' | 'PLATFORM_ADMIN';
export type UserStatus = 'pending' | 'active' | 'approved' | 'rejected' | 'suspended';
export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type InstituteStatus = VerificationStatus;

export type CourseStatus = 'draft' | 'pending' | 'approved' | 'active' | 'completed' | 'cancelled';
export type BookingTrigger = 'none' | 'manual' | 'auto';

export type SessionType = 'online' | 'in_person' | 'hybrid';
export type SessionStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

export type EnrollmentStatus = 'preliminary' | 'pending_payment' | 'active' | 'completed' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'paid' | 'rejected' | 'refunded' | 'failed';

export type BookingMode = 'single' | 'batch' | 'recurring';
export type RoomBookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type NotificationType = 'payment' | 'enrollment' | 'session' | 'announcement' | 'booking' | 'system' | 'review';
export type AuditAction = 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'cancel';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  instituteId?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
  trainerProfile?: TrainerProfile;
}

export interface TrainerProfile {
  id: string;
  userId: string;
  bio?: string;
  cvUrl?: string;
  specialties: string[];
  certificatesUrls?: string[];
  verificationStatus?: VerificationStatus;
  rejectionReason?: string;
  rating?: number;
}

export interface Institute {
  id: string;
  name: string;
  description?: string;
  email: string;
  phone?: string;
  address?: string;
  logo?: string;
  website?: string;
  locationUrl?: string;
  licenseNumber?: string;
  licenseDocumentUrl?: string;
  features?: string[];
  verificationStatus?: VerificationStatus;
  rejectionReason?: string;
  status: InstituteStatus;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  price: number;
  duration: number; // in hours
  startDate: Date;
  endDate: Date;
  minStudents?: number;
  maxStudents: number;
  status: CourseStatus | 'pending_approval' | 'payment_required' | 'processing_payment';
  bookingTrigger?: BookingTrigger;
  image?: string;
  prerequisites?: string;
  objectives?: string[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  deactivatedAt?: Date;

  // UI-only helpers
  deliveryType?: 'online' | 'in_person' | 'hybrid' | 'flexible';
  isCapacityBased?: boolean;

  category: string;
  categoryId?: string;
  categoryDetails?: CourseCategory;

  // Relations
  trainerId: string;
  trainer: User;
  instituteId?: string;
  institute?: Institute;

  enrolledStudents?: number; // Computed
  rating?: number; // Computed
  reviewCount?: number; // Computed
}

export interface Session {
  id: string;
  startTime: Date;
  endTime: Date;
  type: SessionType;
  status: SessionStatus;
  meetingLink?: string;

  courseId: string;

  // Legacy/UI-only fields
  title?: string;
  description?: string;
  roomId?: string;
  trainerId?: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  enrolledAt: Date;
  status: EnrollmentStatus;
  cancellationReason?: string;
  deletedAt?: Date;
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method?: string;
  transactionId?: string;
  depositSlipImage?: string;
  notes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  enrollmentId?: string;
  roomBookingId?: string;
}

export interface Attendance {
  id: string;
  status: 'present' | 'absent' | 'excused';
  markedAt: Date;
  sessionId: string;
  studentId: string;
}

export interface Material {
  id: string;
  title: string;
  description?: string;
  type: 'pdf' | 'video' | 'link' | 'document';
  url: string;
  order: number;
  isVisible: boolean;
  uploadedAt: Date;
  courseId: string;
}

export interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: Date;
  courseId: string;
  studentId: string;
}

export interface Certificate {
  id: string;
  certificateCode: string;
  issuedAt: Date;
  url: string;
  courseId: string;
  enrollmentId: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: Date;
  relatedEntityId?: string;
  userId: string;
  title?: string;
  message?: string;
  actionUrl?: string;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  pricePerHour?: number;
  facilities: string[];
  image?: string;
  isActive: boolean;
  instituteId: string;
  institute?: Institute;
}

export interface RoomBooking {
  id: string;
  batchId?: string;
  bookingMode?: BookingMode;
  startTime: Date;
  endTime: Date;
  status: RoomBookingStatus;
  purpose?: string;
  notes?: string;
  rejectionReason?: string;
  totalPrice?: number;
  createdAt: Date;

  roomId: string;
  sessionId?: string;
  requestedById: string;
  approvedById?: string;

  // Verification
  initialConfirmation?: boolean;
  paymentConfirmation?: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  createdAt: Date;
  scheduledAt?: Date;
  sentAt?: Date;
  courseId?: string;
  senderId: string;
  recipientId?: string;
  instituteId?: string;
  category?: string;
  status?: string;
  targetAudience?: 'all' | 'students' | 'trainers' | 'institute_admins' | 'platform_admins' | 'course_students' | 'SINGLE_USER' | 'STUDENTS' | 'ALL';
  recipient?: { id: string; name: string; avatar?: string | null };
  sender?: { id: string; name: string; avatar?: string | null };
}

export interface Wishlist {
  id: string;
  createdAt: Date;
  studentId: string;
  courseId: string;
}

export interface AuditLog {
  id: string;
  action: AuditAction;
  entityName: string;
  entityId: string;
  description?: string;
  performedBy?: string;
  performedAt: Date;
}
