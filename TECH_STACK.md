# تقنيات وأدوات المشروع (Tech Stack)

هذا الملف يوضح جميع التقنيات، اللغات، وإطارات العمل (Frameworks) والأدوات التي تم استخدامها لبناء هذه المنصة (الواجهة الأمامية والخلفية).

## 1. الواجهة الأمامية (Frontend)
- **إطار العمل الأساسي (Framework):** [Next.js](https://nextjs.org/) (الإصدار 16)
- **مكتبة بناء الواجهات:** [React](https://react.dev/) (الإصدار 19)
- **لغة البرمجة:** TypeScript
- **تنسيق الواجهات (Styling):** [Tailwind CSS](https://tailwindcss.com/) (الإصدار 4)
- **مكتبة المكونات الجاهزة (UI Components):** [Shadcn UI](https://ui.shadcn.com/) مبنية على Radix UI Primitives.
- **إدارة النماذج والتحقق (Forms & Validation):** React Hook Form مع مكتبة Zod للتحقق من صحة المدخلات.
- **توليد الشهادات وملفات PDF:** مكتبات `react-pdf` و `html2canvas` و `jspdf`.
- **الطلبات البرمجية (HTTP Client):** Axios
- **الأيقونات:** Lucide React
- **المنبهات والإشعارات المؤقتة (Toasts):** Sonner

## 2. الواجهة الخلفية (Backend)
- **إطار العمل الأساسي (Framework):** [Express.js](https://expressjs.com/) (بيئة Node.js)
- **لغة البرمجة:** TypeScript
- **التعامل مع قاعدة البيانات (ORM):** [Prisma](https://www.prisma.io/)
- **قاعدة البيانات:** PostgreSQL
- **التحقق من صحة البيانات (Validation):** Zod
- **المصادقة والأمان (Authentication & Security):** 
  - JSON Web Tokens (JWT)
  - Bcrypt (لتشفير كلمات المرور)
  - Helmet & CORS
  - Express Rate Limit (للحماية من الطلبات المتكررة)
- **إرسال البريد الإلكتروني:** Nodemailer
- **إرسال الرسائل (SMS/WhatsApp):** Twilio
- **رفع الملفات (File Uploads):** Multer
- **المهام المجدولة (Cron Jobs):** node-cron
- **التخزين المؤقت (Caching):** Redis (باستخدام مكتبة `ioredis`)

## 3. بيئة التطوير وأدوات أخرى (Development Tools)
- **إدارة الحزم (Package Manager):** npm
- **التحقق من جودة الكود:** ESLint
- **تحويل التنسيقات (PostCSS):** مستخدم لدمج وإدارة مكتبة Tailwind.

---
*تم إنشاء هذا الملف ليكون مرجعاً سريعاً لأي مطور يعمل على هذا المشروع لمعرفة الأدوات الأساسية المستخدمة فيه.*

<br><br>

# Project Tech Stack

This file outlines all the technologies, languages, frameworks, and tools used to build this platform (Frontend and Backend).

## 1. Frontend
- **Core Framework:** [Next.js](https://nextjs.org/) (Version 16)
- **UI Library:** [React](https://react.dev/) (Version 19)
- **Programming Language:** TypeScript
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) (Version 4)
- **UI Components:** [Shadcn UI](https://ui.shadcn.com/) built on Radix UI Primitives.
- **Forms & Validation:** React Hook Form with Zod library for input validation.
- **PDF Generation & Certificates:** `react-pdf`, `html2canvas`, and `jspdf` libraries.
- **HTTP Client:** Axios
- **Icons:** Lucide React
- **Toasts & Notifications:** Sonner

## 2. Backend
- **Core Framework:** [Express.js](https://expressjs.com/) (Node.js environment)
- **Programming Language:** TypeScript
- **ORM (Object-Relational Mapping):** [Prisma](https://www.prisma.io/)
- **Database:** PostgreSQL
- **Data Validation:** Zod
- **Authentication & Security:** 
  - JSON Web Tokens (JWT)
  - Bcrypt (for password hashing)
  - Helmet & CORS
  - Express Rate Limit (for protection against repeated requests)
- **Email Delivery:** Nodemailer
- **Messaging (SMS/WhatsApp):** Twilio
- **File Uploads:** Multer
- **Scheduled Tasks (Cron Jobs):** node-cron
- **Caching:** Redis (using `ioredis` library)

## 3. Development Tools
- **Package Manager:** npm
- **Code Linter:** ESLint
- **CSS Preprocessor (PostCSS):** Used to integrate and manage the Tailwind CSS.

---
*This file was created to serve as a quick reference for any developer working on this project to know the core tools used in it.*
