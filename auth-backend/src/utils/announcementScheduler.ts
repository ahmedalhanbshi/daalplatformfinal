/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */
import prisma from '../config/database';
import { mailerService } from '../services/mailer.service';

/**
 * Periodically checks for SCHEDULED announcements that are due for sending.
 */
async function processScheduledAnnouncements() {
    try {
        const now = new Date();
        
        // 1. Find all announcements that are due
        const dueAnnouncements = await (prisma.announcement as any).findMany({
            where: {
                status: 'SCHEDULED',
                scheduledAt: { lte: now }
            },
            include: {
                sender: { 
                    select: { 
                        id: true, 
                        name: true, 
                        phone: true, 
                        email: true,
                        institute: { select: { id: true, name: true } }
                    } 
                },
                recipient: { select: { id: true, name: true, email: true } },
                course: { select: { id: true, title: true } }
            }
        });

        if (dueAnnouncements.length === 0) return;

        console.log(`[Announcement-Scheduler] 🕒 Found ${dueAnnouncements.length} announcements due for dispatch at ${now.toISOString()}`);

        for (const ann of dueAnnouncements) {
            try {
                console.log(`[Announcement-Scheduler] Processing: ${ann.title} (ID: ${ann.id})`);
                const institute = ann.sender?.institute;
                if (!institute) {
                    console.warn(`[Announcement-Scheduler] No institute found for sender ${ann.senderId}. Skipping.`);
                    continue;
                }

                // a. Identify recipients
                let studentsToNotify: any[] = [];
                let trainersToEmail: any[] = [];

                const recIds = (ann.recipientIds as string[]) || [];

                // Logic based on RECIPRIENT IDS (Selective Batch)
                if (recIds.length > 0) {
                     // Fetch users (students)
                     const users = await prisma.user.findMany({
                         where: { id: { in: recIds } },
                         select: { id: true, name: true, email: true }
                     });
                     studentsToNotify = users;

                     // Fetch staff (trainers)
                     const staff = await prisma.instituteStaff.findMany({
                         where: { id: { in: recIds }, instituteId: institute.id },
                         select: { id: true, name: true, email: true }
                     });
                     trainersToEmail = staff;
                }
                // Logic based on BROADCAST
                else {
                    const audience = ann.targetAudience?.toUpperCase() || 'STUDENTS';

                    // Trainers broadcast
                    if (audience === 'TRAINERS' || audience === 'ALL') {
                        trainersToEmail = await prisma.instituteStaff.findMany({
                            where: { instituteId: institute.id, status: 'ACTIVE' },
                            select: { id: true, name: true, email: true }
                        });
                    }

                    // Students broadcast
                    if (audience === 'STUDENTS' || audience === 'ALL') {
                        const targetCourseIds = ann.courseId ? [ann.courseId] : (await prisma.course.findMany({
                            where: { instituteId: institute.id },
                            select: { id: true }
                        })).map(c => c.id);

                        const enrollments = await prisma.enrollment.findMany({
                            where: { 
                                courseId: { in: targetCourseIds },
                                deletedAt: null,
                                status: { in: ["ACTIVE", "COMPLETED", "PRELIMINARY", "PENDING_PAYMENT"] }
                            },
                            select: { student: { select: { id: true, name: true, email: true } } },
                            distinct: ["studentId"]
                        });
                        studentsToNotify = enrollments.map(e => e.student);
                    }
                }

                // b. Update status FIRST to prevent double-processing
                await (prisma.announcement as any).update({
                    where: { id: ann.id },
                    data: { 
                        status: 'SENT',
                        sentAt: now
                    }
                });

                // c. Dispatch to Students (Notification + Email)
                if (studentsToNotify.length > 0) {
                    await prisma.notification.createMany({
                        data: studentsToNotify.map(s => ({
                            userId: s.id,
                            type: 'NEW_ANNOUNCEMENT' as any,
                            title: ann.title,
                            message: ann.message,
                            relatedEntityId: ann.id
                        })),
                        skipDuplicates: true
                    });

                    studentsToNotify.forEach(s => {
                        if (s.email) {
                            mailerService.sendAnnouncementEmail(s.email, s.name, ann.title, ann.message, {
                                name: ann.sender?.name || 'مدير المعهد',
                                instituteName: institute.name
                            }).catch(err => console.error(`[Scheduler-Email] Student ${s.email} failed:`, err));
                        }
                    });
                }

                // d. Dispatch to Trainers (Email Only)
                if (trainersToEmail.length > 0) {
                    trainersToEmail.forEach(t => {
                        if (t.email) {
                            mailerService.sendAnnouncementEmail(t.email, t.name, ann.title, ann.message, {
                                name: ann.sender?.name || 'مدير المعهد',
                                instituteName: institute.name
                            }).catch(err => console.error(`[Scheduler-Email] Trainer ${t.email} failed:`, err));
                        }
                    });
                }

                console.log(`[Announcement-Scheduler] ✅ Successfully dispatched: ${ann.title} to ${studentsToNotify.length} students and ${trainersToEmail.length} trainers.`);
            } catch (err: any) {
                console.error(`[Announcement-Scheduler] âŒ Failed to process announcement ${ann.id}:`, err.message);
            }
        }
    } catch (err: any) {
        console.error('[Announcement-Scheduler] CRITICAL ERROR:', err.message);
    }
}

export function startAnnouncementScheduler() {
    console.log('[Announcement-Scheduler] Worker started (every 60 seconds)');
    // Run immediately
    processScheduledAnnouncements();
    // Then periodically
    setInterval(processScheduledAnnouncements, 60 * 1000);
}

