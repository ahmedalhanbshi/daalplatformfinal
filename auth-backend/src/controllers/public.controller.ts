import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const publicController = {
  // 1. Get Platform Stats
  getStats: async (req: Request, res: Response) => {
    try {
      // Parallelize queries for efficiency
      const [studentsCount, coursesCount, trainersCount, institutesCount] = await Promise.all([
        prisma.user.count({ where: { role: 'STUDENT', status: 'ACTIVE' } }),
        prisma.course.count({ where: { status: 'ACTIVE' } }),
        prisma.user.count({ where: { role: 'TRAINER', status: 'ACTIVE' } }),
        prisma.institute.count({ where: { user: { status: 'ACTIVE' } } })
      ]);

      res.status(200).json({
        success: true,
        data: {
          students: studentsCount,
          courses: coursesCount,
          trainers: trainersCount,
          institutes: institutesCount
        }
      });
    } catch (error: unknown) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ success: false, message: 'فش�„ ف�Š جلب الإحصائيات' });
    }
  },

  // 2. Get Categories with Course Count
  getCategories: async (req: Request, res: Response) => {
    try {
      const categories = await prisma.courseCategory.findMany({
        include: {
          _count: {
            select: { courses: { where: { status: 'ACTIVE' } } }
          }
        }
      });

      res.status(200).json({ success: true, data: categories });
    } catch (error: unknown) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ success: false, message: 'فش�„ ف�Š جلب ا�„تص�†�Šفات' });
    }
  },

  // 3. Get Featured Courses
  getFeaturedCourses: async (req: Request, res: Response) => {
    try {
      const courses = await prisma.course.findMany({
        where: { status: 'ACTIVE' },
        take: 4,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          category: true,
          trainer: {
            select: { id: true, name: true, avatar: true }
          },
          institute: {
            select: { id: true, name: true, logo: true }
          }
        }
      });

      res.status(200).json({ success: true, data: courses });
    } catch (error: unknown) {
      console.error('Error fetching featured courses:', error);
      res.status(500).json({ success: false, message: 'فش�„ ف�Š جلب الدورات المميزة' });
    }
  },

  // 4. Get All Tags
  getTags: async (req: Request, res: Response) => {
    try {
      const tags = await prisma.tag.findMany({
        orderBy: { name: 'asc' }
      });
      res.status(200).json({ success: true, data: tags });
    } catch (error: unknown) {
      console.error('Error fetching tags:', error);
      res.status(500).json({ success: false, message: 'فش�„ ف�Š جلب الوسوم' });
    }
  },

  // 5. Get Public Announcements
  getAnnouncements: async (req: Request, res: Response) => {
    try {
      const announcements = await prisma.announcement.findMany({
        where: {
          status: 'SENT',
          targetAudience: {
            in: ['ALL', 'STUDENTS']
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: {
          sender: {
            select: { id: true, name: true }
          },
          course: {
            select: { id: true, title: true }
          }
        }
      });

      res.status(200).json({
        success: true,
        data: announcements.map((announcement) => ({
          id: announcement.id,
          title: announcement.title,
          message: announcement.message,
          category: announcement.category,
          createdAt: announcement.createdAt,
          sentAt: announcement.sentAt,
          sender: announcement.sender
            ? {
                id: announcement.sender.id,
                name: announcement.sender.name
              }
            : null,
          course: announcement.course
            ? {
                id: announcement.course.id,
                title: announcement.course.title
              }
            : null
        }))
      });
    } catch (error: unknown) {
      console.error('Error fetching public announcements:', error);
      res.status(500).json({ success: false, message: 'فش�„ ف�Š جلب الإعلانات' });
    }
  }
};

export default publicController;
