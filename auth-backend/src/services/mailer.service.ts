import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { decrypt } from '../utils/crypto';

const prisma = new PrismaClient();

interface MailOptions {
    to: string;
    subject: string;
    html: string;
}

class MailerService {
    private async getSmtpConfig() {
        const rows = await prisma.systemSetting.findMany({
            where: { key: { startsWith: 'email.' } }
        });

        const map = new Map(rows.map(r => [r.key, r.value]));

        return {
            host: map.get('email.smtpHost') || process.env.SMTP_HOST || 'smtp.gmail.com',
            port: Number(map.get('email.smtpPort') || process.env.SMTP_PORT || 587),
            user: map.get('email.smtpUser') || process.env.SMTP_USER || '',
            pass: decrypt(map.get('email.smtpPassword') || '') || process.env.SMTP_PASS || '',
            fromName: map.get('email.fromName') || process.env.SMTP_FROM?.split('<')[0]?.trim() || 'منصة دال',
            fromEmail: map.get('email.fromEmail') || process.env.SMTP_FROM?.match(/<(.*)>/)?.[1] || process.env.SMTP_FROM || '',
        };
    }

    private wrapHtml(title: string, body: string): string {
        return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  body{font-family:Segoe UI,Arial,sans-serif;background:#f5f7fa;margin:0;padding:0;direction:rtl}
  .container{max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)}
  .header{background:linear-gradient(135deg,#4f46e5,#06b6d4);padding:32px 24px;text-align:center}
  .header h1{color:#fff;margin:0;font-size:22px}
  .body{padding:32px 24px;color:#374151}
  .body p{line-height:1.7;margin:0 0 16px}
  .card{background:#f0f4ff;border-right:4px solid #4f46e5;border-radius:8px;padding:16px;margin:16px 0}
  .btn{display:inline-block;background:#4f46e5;color:#fff!important;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0}
  .footer{background:#f9fafb;padding:20px 24px;text-align:center;color:#9ca3af;font-size:13px;border-top:1px solid #e5e7eb}
</style></head>
<body>
<div class="container">
  <div class="header"><h1>🔔 ${title}</h1></div>
  <div class="body">${body}</div>
  <div class="footer">منصة دال - جميع الحقوق محفوظة</div>
</div>
</body></html>`;
    }

    async send(opts: MailOptions): Promise<void> {
        const config = await this.getSmtpConfig();

        console.log(`[Mailer] Attempting to send email to: ${opts.to}, SMTP_USER configured: ${!!config.user}`);
        if (!config.user || !config.pass) {
            console.warn('[Mailer] SMTP credentials not configured, skipping email');
            return;
        }

        const transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: false,
            auth: {
                user: config.user,
                pass: config.pass,
            },
            tls: { rejectUnauthorized: false },
        });

        try {
            const from = `"${config.fromName}" <${config.fromEmail || config.user}>`;
            await transporter.sendMail({
                from,
                to: opts.to,
                subject: opts.subject,
                html: opts.html,
            });
            console.log(`[Mailer] Email sent successfully to: ${opts.to}`);
        } catch (err) {
            console.error('[Mailer] Failed to send email:', err);
        }
    }

    async sendEnrollmentPreliminaryAccepted(to: string, studentName: string, courseTitle: string) {
        await this.send({
            to,
            subject: `✅ تم قبولك مبدئيًا في دورة "${courseTitle}"`,
            html: this.wrapHtml('قبول مبدئي', `
                <p>مرحبًا <strong>${studentName}</strong>،</p>
                <div class="card">
                    <p>🎉 يسعدنا إبلاغك بأنه تم قبولك مبدئيًا في دورة <strong>${courseTitle}</strong>.</p>
                </div>
                <p>الخطوة التالية هي إتمام عملية الدفع. يرجى الدخول إلى المنصة وإرفاق سند الدفع لاستكمال التسجيل.</p>
                <a class="btn" href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/student/courses">إكمال التسجيل</a>
            `),
        });
    }

    async sendEnrollmentFinalAccepted(to: string, studentName: string, courseTitle: string) {
        await this.send({
            to,
            subject: `🎓 تم قبولك نهائيًا في دورة "${courseTitle}"`,
            html: this.wrapHtml('قبول نهائي', `
                <p>مرحبًا <strong>${studentName}</strong>،</p>
                <div class="card">
                    <p>🎉 تهانينا! تم تأكيد تسجيلك نهائيًا في دورة <strong>${courseTitle}</strong>.</p>
                </div>
                <p>يمكنك الآن الوصول إلى محتوى الدورة والجلسات التدريبية من لوحة التحكم الخاصة بك.</p>
                <p>كما يمكنك <strong>تحميل شهادة تأكيد التسجيل</strong> بصيغة PDF من خلال زيارة قائمة الإشعارات في حسابك على المنصة.</p>
                <a class="btn" href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/student/courses">ابدأ التعلم</a>
            `),
        });
    }

    async sendEnrollmentRejected(to: string, studentName: string, courseTitle: string, reason?: string, isCancellation: boolean = false) {
        const title = isCancellation ? 'إلغاء التسجيل' : 'رفض التسجيل';
        const subjectAction = isCancellation ? 'تم إلغاء تسجيلك في' : 'تم رفض طلب تسجيلك في';
        const bodyAction = isCancellation ? 'بأنه تم إلغاء تسجيلك في دورة' : 'بأنه تم رفض طلب تسجيلك في دورة';

        await this.send({
            to,
            subject: `❌ ${subjectAction} "${courseTitle}"`,
            html: this.wrapHtml(title, `
                <p>مرحبًا <strong>${studentName}</strong>،</p>
                <p>نأسف لإعلامك ${bodyAction} <strong>${courseTitle}</strong>.</p>
                ${reason ? `<div class="card"><p><strong>السبب:</strong> ${reason}</p></div>` : ''}
                <p>يمكنك التواصل مع الدعم إذا كان لديك أي استفسار، أو التقدم لدورات أخرى.</p>
                <a class="btn" href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/courses">استعرض الدورات</a>
            `),
        });
    }

    async sendPaymentApproved(to: string, studentName: string, courseTitle: string) {
        await this.send({
            to,
            subject: `💳 تم قبول دفعتك لدورة "${courseTitle}"`,
            html: this.wrapHtml('قبول الدفعة', `
                <p>مرحبًا <strong>${studentName}</strong>،</p>
                <div class="card"><p>✅ تم التحقق من دفعتك لدورة <strong>${courseTitle}</strong> والموافقة عليها.</p></div>
                <p>تسجيلك مكتمل الآن. نتمنى لك تجربة تعليمية رائعة!</p>
                <p>كما يمكنك <strong>تحميل شهادة تأكيد التسجيل</strong> بصيغة PDF من خلال زيارة قائمة الإشعارات في حسابك على المنصة.</p>
                <a class="btn" href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/student/courses">دوراتي</a>
            `),
        });
    }

    async sendPaymentRejected(to: string, studentName: string, courseTitle: string, reason?: string) {
        await this.send({
            to,
            subject: `⚠️ تم رفض دفعتك لدورة "${courseTitle}"`,
            html: this.wrapHtml('رفض الدفعة', `
                <p>مرحبًا <strong>${studentName}</strong>،</p>
                <p>نأسف لإعلامك بأنه تم رفض سند الدفع المرفق لدورة <strong>${courseTitle}</strong>.</p>
                ${reason ? `<div class="card"><p><strong>السبب:</strong> ${reason}</p></div>` : ''}
                <p>يرجى إعادة رفع سند الدفع الصحيح من خلال لوحة التحكم.</p>
                <a class="btn" href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/student/courses">رفع السند</a>
            `),
        });
    }

    async sendSessionReminder(to: string, studentName: string, courseTitle: string, sessionTopic: string, startTime: Date) {
        const timeStr = startTime.toLocaleString('ar-SA-u-nu-latn', { dateStyle: 'full', timeStyle: 'short' });
        await this.send({
            to,
            subject: `⏰ تذكير: جلسة "${sessionTopic}" تبدأ بعد ساعة`,
            html: this.wrapHtml('تذكير بالجلسة', `
                <p>مرحبًا <strong>${studentName}</strong>،</p>
                <div class="card">
                    <p>🔔 تذكير: لديك جلسة تدريبية خلال ساعة!</p>
                    <p><strong>الدورة:</strong> ${courseTitle}</p>
                    <p><strong>موضوع الجلسة:</strong> ${sessionTopic}</p>
                    <p><strong>الوقت:</strong> ${timeStr}</p>
                </div>
                <a class="btn" href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/student/courses">دخول الجلسة</a>
            `),
        });
    }

    async sendNewEnrollmentRequest(to: string, trainerName: string, studentName: string, courseTitle: string) {
        await this.send({
            to,
            subject: `📝 طلب تسجيل جديد في دورة "${courseTitle}"`,
            html: this.wrapHtml('طلب تسجيل جديد', `
                <p>مرحبًا <strong>${trainerName}</strong>،</p>
                <div class="card"><p>👤 قدّم الطالب <strong>${studentName}</strong> طلب تسجيل في دورتك <strong>${courseTitle}</strong>.</p></div>
                <p>يرجى مراجعة الطلب والرد عليه من لوحة التحكم.</p>
                <a class="btn" href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/trainer/students">مراجعة الطلبات</a>
            `),
        });
    }

    async sendPaymentReceiptSubmitted(to: string, recipientName: string, studentName: string, courseTitle: string) {
        await this.send({
            to,
            subject: `💰 تم رفع إيصال دفع لدورة "${courseTitle}"`,
            html: this.wrapHtml('إيصال دفع جديد', `
                <p>مرحبًا <strong>${recipientName}</strong>،</p>
                <div class="card"><p>📤 أرفق الطالب <strong>${studentName}</strong> إيصال دفع لدورة <strong>${courseTitle}</strong>.</p></div>
                <p>يرجى المراجعة والتحقق من الإيصال في أقرب وقت.</p>
                <a class="btn" href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/trainer/students">مراجعة الإيصال</a>
            `),
        });
    }

    async sendAccountApproved(to: string, name: string, role: string) {
        await this.send({
            to,
            subject: `✅ تم قبول حسابك كـ${role}`,
            html: this.wrapHtml('قبول الحساب', `
                <p>مرحبًا <strong>${name}</strong>،</p>
                <div class="card"><p>🎉 يسعدنا إخبارك بأنه تم مراجعة حسابك والموافقة عليه كـ<strong>${role}</strong> في منصتنا.</p></div>
                <p>يمكنك الآن تسجيل الدخول والبدء في استخدام جميع ميزات المنصة.</p>
                <a class="btn" href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/login">تسجيل الدخول</a>
            `),
        });
    }

    async sendAccountRejected(to: string, name: string, role: string, reason?: string) {
        await this.send({
            to,
            subject: `❌ تم رفض طلب تسجيلك كـ${role}`,
            html: this.wrapHtml('رفض الحساب', `
                <p>مرحبًا <strong>${name}</strong>،</p>
                <p>نأسف لإعلامك بأنه تم رفض طلب تسجيلك كـ<strong>${role}</strong>.</p>
                ${reason ? `<div class="card"><p><strong>السبب:</strong> ${reason}</p></div>` : ''}
                <p>يمكنك التواصل مع الدعم لمزيد من التفاصيل.</p>
            `),
        });
    }

    async sendNewTrainerApplication(to: string, adminName: string, trainerName: string) {
        await this.send({
            to,
            subject: `🆕 طلب تسجيل مدرب جديد: ${trainerName}`,
            html: this.wrapHtml('طلب تسجيل مدرب', `
                <p>مرحبًا <strong>${adminName}</strong>،</p>
                <div class="card"><p>👤 قام المدرب <strong>${trainerName}</strong> بإنشاء حساب جديد وهو بانتظار مراجعتك.</p></div>
                <p>يرجى الدخول إلى لوحة التحكم لمراجعة الطلب واتخاذ القرار المناسب.</p>
                <a class="btn" href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/verifications">مراجعة الطلبات</a>
            `),
        });
    }

    async sendNewInstituteApplication(to: string, adminName: string, instituteName: string) {
        await this.send({
            to,
            subject: `🆕 طلب تسجيل معهد جديد: ${instituteName}`,
            html: this.wrapHtml('طلب تسجيل معهد', `
                <p>مرحبًا <strong>${adminName}</strong>،</p>
                <div class="card"><p>🏛️ قام المعهد <strong>${instituteName}</strong> بإنشاء حساب جديد وهو بانتظار مراجعتك.</p></div>
                <p>يرجى الدخول إلى لوحة التحكم لمراجعة الطلب واتخاذ القرار المناسب.</p>
                <a class="btn" href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/verifications">مراجعة الطلبات</a>
            `),
        });
    }

    async sendNewBookingRequest(to: string, instituteName: string, trainerName: string, roomName: string) {
        await this.send({
            to,
            subject: `🏛️ طلب حجز قاعة جديد: "${roomName}"`,
            html: this.wrapHtml('طلب حجز جديد', `
                <p>مرحبًا <strong>${instituteName}</strong>،</p>
                <div class="card"><p>👤 طلب المدرّب <strong>${trainerName}</strong> حجز قاعة <strong>${roomName}</strong>.</p></div>
                <p>يرجى مراجعة الطلب والرد عليه من لوحة التحكم.</p>
                <a class="btn" href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/institute/bookings">مراجعة الطلبات</a>
            `),
        });
    }

    async sendBookingApproved(to: string, recipientName: string, roomName: string) {
        await this.send({
            to,
            subject: `✅ تم قبول حجز القاعة "${roomName}"`,
            html: this.wrapHtml('قبول الحجز', `
                <p>مرحبًا <strong>${recipientName}</strong>،</p>
                <div class="card"><p>🏛️ تمت المراجعة والموافقة على حجزك لقاعة <strong>${roomName}</strong>.</p></div>
                <a class="btn" href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/trainer/bookings">تفاصيل الحجز</a>
            `),
        });
    }

    async sendBookingRejected(to: string, recipientName: string, roomName: string, reason?: string) {
        await this.send({
            to,
            subject: `❌ تم رفض حجز القاعة "${roomName}"`,
            html: this.wrapHtml('رفض الحجز', `
                <p>مرحبًا <strong>${recipientName}</strong>،</p>
                <p>نأسف لإعلامك بأنه تم رفض طلب حجز قاعة <strong>${roomName}</strong>.</p>
                ${reason ? `<div class="card"><p><strong>السبب:</strong> ${reason}</p></div>` : ''}
                <a class="btn" href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/trainer/halls">استعراض القاعات</a>
            `),
        });
    }

    async sendPasswordResetCode(to: string, userName: string, code: string) {
        await this.send({
            to,
            subject: `🔐 رمز إعادة تعيين كلمة المرور الخاص بك`,
            html: this.wrapHtml('إعادة تعيين كلمة المرور', `
                <p>مرحبًا <strong>${userName}</strong>،</p>
                <p>لقد تلقينا طلبًا لإعادة تعيين كلمة المرور لحسابك. استخدم رمز التحقق التالي:</p>
                <div class="card" style="text-align: center;">
                    <h2 style="font-size: 32px; letter-spacing: 4px; color: #4f46e5; margin: 0;">${code}</h2>
                </div>
                <p>صلاحية هذا الرمز 15 دقيقة. إذا لم تطلب تغيير كلمة المرور، يرجى تجاهل هذه الرسالة.</p>
            `),
        });
    }

    async sendAnnouncementEmail(to: string, userName: string, title: string, message: string, senderInfo?: { name: string; phone?: string | null; email?: string | null; instituteName?: string }) {
        let body = `
            <p>مرحبًا <strong>${userName}</strong>،</p>
            <div class="card">
                <p>${message.replace(/\n/g, '<br/>')}</p>
            </div>
        `;

        if (senderInfo) {
            body += `
                <div style="margin-top: 24px; padding-top: 16px; border-top: 1px dashed #e5e7eb; font-size: 14px; color: #4b5563;">
                    <p style="margin-bottom: 8px; font-weight: 600;">معلومات التواصل مع المرسل:</p>
                    <ul style="list-style: none; padding: 0; margin: 0;">
                        <li style="margin-bottom: 4px;">👤 <strong>الاسم:</strong> ${senderInfo.name}${senderInfo.instituteName ? ` (${senderInfo.instituteName})` : ''}</li>
                        ${senderInfo.phone ? `<li style="margin-bottom: 4px;">📞 <strong>الجوال:</strong> ${senderInfo.phone}</li>` : ''}
                        ${senderInfo.email ? `<li style="margin-bottom: 4px;">✉️ <strong>البريد:</strong> ${senderInfo.email}</li>` : ''}
                    </ul>
                </div>
            `;
        }

        body += `
            <p style="margin-top: 16px;">للرد أو للاستفسار، يمكنك تسجيل الدخول إلى حسابك في المنصة.</p>
            <a class="btn" href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/student/dashboard">الذهاب للمنصة</a>
        `;

        await this.send({
            to,
            subject: `📢 إعلان جديد: ${title}`,
            html: this.wrapHtml(title, body),
        });
    }

    async sendMinimumReachedEmail(
        to: string,
        ownerName: string,
        courseTitle: string,
        minStudents: number,
        setupUrl: string,
    ) {
        await this.send({
            to,
            subject: `🎉 اكتمل الحد الأدنى في دورة "${courseTitle}"`,
            html: this.wrapHtml('اكتمال الحد الأدنى', `
                <p>مرحبًا <strong>${ownerName}</strong>،</p>
                <div class="card">
                    <p>🎉 تهانينا! وصل عدد المسجلين المبدئيين في دورة <strong>${courseTitle}</strong> إلى الحد الأدنى المطلوب وهو <strong>${minStudents} طالب</strong>.</p>
                </div>
                <p>الخطوة التالية هي إكمال إعداد الدورة من خلال:</p>
                <ul style="padding-right:20px; line-height:2">
                    <li>إضافة القاعة والجلسات إذا كانت الدورة حضورية</li>
                    <li>إضافة رابط الاجتماع والجلسات إذا كانت الدورة أونلاين</li>
                </ul>
                <p>بمجرد حفظ الإعداد وتفعيل الدورة، سيُشعَر جميع الطلاب المسجلين تلقائيًا بإكمال عملية الدفع.</p>
                <a class="btn" href="${setupUrl}">إكمال إعداد الدورة</a>
            `),
        });
    }

    async sendCourseReadyForPaymentEmail(
        to: string,
        studentName: string,
        courseTitle: string,
        courseUrl: string,
    ) {
        await this.send({
            to,
            subject: `🎓 الدورة جاهزة! أكمل تسجيلك في "${courseTitle}"`,
            html: this.wrapHtml('الدورة جاهزة للتسجيل', `
                <p>مرحبًا <strong>${studentName}</strong>،</p>
                <div class="card">
                    <p>🎉 تم الانتهاء من إعداد دورة <strong>${courseTitle}</strong> وأصبحت جاهزة للانطلاق!</p>
                </div>
                <p>لتأكيد مقعدك، يرجى إكمال عملية الدفع في أقرب وقت ممكن.</p>
                <a class="btn" href="${courseUrl}">إكمال الدفع الآن</a>
            `),
        });
    }

    async sendPreliminaryAcceptedWaitingEmail(
        to: string,
        studentName: string,
        courseTitle: string,
        minStudents: number,
        courseUrl: string,
    ) {
        await this.send({
            to,
            subject: `✅ تم قبولك مبدئيًا في دورة "${courseTitle}"`,
            html: this.wrapHtml('قبول مبدئي - انتظار اكتمال العدد', `
                <p>مرحبًا <strong>${studentName}</strong>،</p>
                <div class="card">
                    <p>✅ يسعدنا إخبارك بقبول تسجيلك المبدئي في دورة <strong>${courseTitle}</strong>.</p>
                </div>
                <p>الدورة حاليًا بانتظار اكتمال الحد الأدنى المطلوب من الطلاب وهو <strong>${minStudents} طالب</strong>.</p>
                <p>سيتم إشعارك فور اكتمال العدد وجاهزية الدورة لإكمال عملية الدفع.</p>
                <a class="btn" href="${courseUrl}">عرض تفاصيل الدورة</a>
            `),
        });
    }

    async sendSessionUpdated(
        to: string,
        studentName: string,
        courseTitle: string,
        changes: { oldStart?: Date; oldEnd?: Date; newStart?: Date; newEnd?: Date; topic?: string },
        reason?: string,
    ) {
        const fmt = (d?: Date) =>
            d ? d.toLocaleString('ar-SA-u-nu-latn', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'غير محدد';

        const oldTime = `${fmt(changes.oldStart)} إلى ${fmt(changes.oldEnd)}`;
        const newTime = `${fmt(changes.newStart)} إلى ${fmt(changes.newEnd)}`;
        const topicLine = changes.topic ? `<p><strong>موضوع الجلسة:</strong> ${changes.topic}</p>` : '';

        await this.send({
            to,
            subject: `📅 تعديل موعد جلسة في دورة "${courseTitle}"`,
            html: this.wrapHtml('تعديل موعد جلسة', `
                <p>مرحبًا <strong>${studentName}</strong>،</p>
                <p>نود إعلامك بأنه تم تعديل موعد إحدى جلسات دورة <strong>${courseTitle}</strong>.</p>
                ${topicLine}
                <div class="card">
                    <p>⏱️ <strong>الموعد القديم:</strong><br/>${oldTime}</p>
                    <p>🆕 <strong>الموعد الجديد:</strong><br/>${newTime}</p>
                    ${reason ? `<p>📝 <strong>سبب التعديل:</strong> ${reason}</p>` : ''}
                </div>
                <p>يرجى تحديث جدولك الشخصي وفقًا للموعد الجديد.</p>
                <a class="btn" href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/student/courses">عرض جدول الدورة</a>
            `),
        });
    }

    async sendSessionCancelled(
        to: string,
        studentName: string,
        courseTitle: string,
        topic: string | undefined,
        reason?: string,
    ) {
        const topicLine = topic ? `<p><strong>موضوع الجلسة:</strong> ${topic}</p>` : '';

        await this.send({
            to,
            subject: `❌ إلغاء جلسة في دورة "${courseTitle}"`,
            html: this.wrapHtml('إلغاء جلسة', `
                <p>مرحبًا <strong>${studentName}</strong>،</p>
                <p>نأسف لإعلامك بأنه تم إلغاء إحدى جلسات دورة <strong>${courseTitle}</strong>.</p>
                ${topicLine}
                ${reason ? `<div class="card"><p><strong>السبب:</strong> ${reason}</p></div>` : ''}
                <p>يرجى مراجعة المنصة لأي تحديثات إضافية.</p>
                <a class="btn" href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/student/courses">عرض الدورة</a>
            `),
        });
    }

    async sendSessionsRescheduled(
        to: string,
        studentName: string,
        courseTitle: string,
        sessionsCount: number,
        reason?: string,
    ) {
        await this.send({
            to,
            subject: `🗓️ تحديث جدول دورة "${courseTitle}"`,
            html: this.wrapHtml('تحديث الجدول الدراسي', `
                <p>مرحبًا <strong>${studentName}</strong>،</p>
                <p>نود إعلامك بأنه تم تحديث الجدول الدراسي الكامل لدورة <strong>${courseTitle}</strong>.</p>
                <div class="card">
                    <p>📚 <strong>عدد الجلسات الجديدة:</strong> ${sessionsCount} جلسة</p>
                    ${reason ? `<p>📝 <strong>سبب التعديل:</strong> ${reason}</p>` : ''}
                </div>
                <p>يرجى الدخول إلى منصتك لمراجعة الجدول الجديد بالتفصيل.</p>
                <a class="btn" href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/student/courses">مراجعة الجدول الجديد</a>
            `),
        });
    }
}

export const mailerService = new MailerService();
