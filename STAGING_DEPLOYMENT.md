# دليل النشر المرحلي (Staging Deployment)

هذا الملف يجهّز منصة دال للنشر المرحلي بشكل يدوي وواضح، دون تنفيذ النشر الفعلي الآن، ودون استخدام أسرار حقيقية أو تشغيل seed في staging أو production.

## 1) نظرة عامة على بنية المشروع

المشروع يتكوّن من جزأين رئيسيين:

### Frontend

- مبني بـ `Next.js`
- موجود في جذر المشروع
- مناسب للنشر على Vercel أو أي منصة تدعم Next.js

### Backend

- مبني بـ `Express` مع `TypeScript`
- موجود داخل `auth-backend`
- يعمل كخدمة Node طويلة العمر، وليس كـ serverless function

### Database

- قاعدة البيانات `PostgreSQL`
- يتم الاتصال بها عبر المتغير `DATABASE_URL`

### Redis

- يستخدم عبر:
  - `REDIS_HOST`
  - `REDIS_PORT`
  - `REDIS_PASSWORD`

### Uploads

- المسار الحالي للملفات المرفوعة:
  - `auth-backend/uploads`
- يحتاج لاحقًا إلى:
  - `persistent volume`
  - أو storage خارجي مثل S3-compatible storage

## 2) إعداد Frontend في Staging

### الإعدادات المطلوبة

- Root Directory:
  - `./`
- Install Command:
  - `npm install`
- Build Command:
  - `npm run build`
- Start Command:
  - `npm run start`
- Environment Variables:
  - `NEXT_PUBLIC_API_URL=https://YOUR_STAGING_API_URL`

### ملاحظات مهمة

- لا تستخدم `localhost` في staging.
- يجب أن يشير `NEXT_PUBLIC_API_URL` إلى رابط الـ backend المنشور فعليًا.
- بعد تغيير `NEXT_PUBLIC_API_URL` يجب إعادة بناء الواجهة.

## 3) إعداد Backend في Staging

### الإعدادات المطلوبة

- Root Directory:
  - `auth-backend`
- Install Command:
  - `npm install`
- Build Command:
  - `npm install && npm run prisma:generate && npm run build`
- Pre-deploy / Release Command:
  - `npm run prisma:deploy`
- Start Command:
  - `npm run start`

### Environment Variables المطلوبة

- `PORT=5001`
- `DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE`
- `JWT_ACCESS_SECRET=CHANGE_ME`
- `JWT_REFRESH_SECRET=CHANGE_ME`
- `JWT_ACCESS_EXPIRES_IN=15m`
- `JWT_REFRESH_EXPIRES_IN=7d`
- `REDIS_HOST=YOUR_REDIS_HOST`
- `REDIS_PORT=6379`
- `REDIS_PASSWORD=YOUR_REDIS_PASSWORD`
- `FRONTEND_URL=https://YOUR_STAGING_FRONTEND_URL`
- `BCRYPT_ROUNDS=12`
- `MAX_LOGIN_ATTEMPTS=5`
- `LOCK_TIME_MINUTES=15`
- `SMTP_HOST=YOUR_SMTP_HOST`
- `SMTP_PORT=587`
- `SMTP_USER=YOUR_SMTP_USER`
- `SMTP_PASS=YOUR_SMTP_PASSWORD`
- `SMTP_FROM=no-reply@example.com`
- `TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM=whatsapp:+000000000000`

### ملاحظات مهمة

- لا تضع أسرارًا حقيقية داخل هذا الملف.
- استخدم placeholders فقط.
- يجب أن تكون JWT secrets طويلة وقوية ومختلفة بين staging و production.

## 4) PostgreSQL في Staging

### التعليمات

- أنشئ قاعدة PostgreSQL منفصلة للـ staging.
- لا تستخدم قاعدة التطوير المحلية.
- لا تستخدم قاعدة الإنتاج.
- ضع `DATABASE_URL` الخاصة بها داخل إعدادات backend.
- بعد ربط القاعدة شغّل:
  - `npm run prisma:deploy`
- لا تشغّل:
  - `npm run prisma:seed`
  - إلا إذا كان seed مخصصًا وآمنًا للـ staging وبشكل مقصود جدًا.

## 5) Prisma Migrations

### الوضع الحالي

- يوجد migration أولي في:
  - `auth-backend/prisma/migrations/20260615_init/`

### في staging والـ production

- استخدم:
  - `npm run prisma:deploy`

### لا تستخدم

- `npx prisma migrate dev`

في staging أو production، لأنه مخصص للتطوير المحلي فقط.

## 6) تحذير الـ Seed

### الحالة الحالية

- الـ seed الحالي لم يعد ينشئ demo data.
- الـ seed لا يحذف أي بيانات.
- الـ seed ينشئ أو يحدّث حساب أدمن واحد فقط:
  - `admin@platform.com`
- يوجد password تجريبي:
  - `Test@123456`

### التعليمات

- لا تشغّل seed في production.
- في staging يمكن تشغيله لأنه أصبح آمنًا من ناحية عدم المسح وعدم إنشاء demo data.
- يجب تغيير كلمة المرور مباشرة بعد أول دخول في staging أو production.
- كلمة المرور الحالية تجريبية، ولا يجب تركها كما هي في الإنتاج.

## 7) Redis في Staging

### التعليمات

- استخدم Redis منفصل للـ staging.
- اضبط:
  - `REDIS_HOST`
  - `REDIS_PORT`
  - `REDIS_PASSWORD`
- لا تستخدم Redis المحلي في staging.
- تأكد أن backend يستطيع الاتصال بـ Redis عند التشغيل.

## 8) استراتيجية Uploads

### القرار الحالي

- الخيار المؤقت:
  - استخدام `persistent volume` إذا كانت منصة backend تدعم ذلك.
  - ربطه بالمسار:
    - `auth-backend/uploads`

### الخيار الأفضل لاحقًا

- نقل uploads إلى storage خارجي متوافق مع S3.
- تعديل خدمة الرفع لاحقًا لتخزين الملفات في storage خارجي بدل filesystem المحلي.

### مهم

- لا تنقل الملفات الآن.
- لا تعدل منطق uploads الآن.
- فقط وثّق القرار الحالي.

## 9) CORS و FRONTEND_URL

### ما هو الموجود حاليًا

- backend يستخدم `CORS` مع `FRONTEND_URL` كمصدر أساسي.
- هناك allowlist محلي للتطوير مثل:
  - `http://localhost:3000`
  - `http://127.0.0.1:3000`
  - `http://localhost:3001`
  - `http://127.0.0.1:3001`

### المطلوب في staging

- تأكد أن `FRONTEND_URL` يطابق رابط الواجهة المنشورة.
- إذا كان هناك allowlist واضح في منصة الاستضافة أو على مستوى التطبيق، اذكره هنا عند الحاجة.
- لا تفتح `CORS` على `*` في الإنتاج.

## 10) Health Check

### الموجود حاليًا

- يوجد endpoint صحي في backend:
  - `/health`

### التعليمات

- بعد نشر backend اختبر `/health`.
- بعد نشر الواجهة اختبر:
  - تسجيل الدخول
  - الاتصال بـ API

## 11) Staging Testing Checklist

نفّذ هذا checklist يدويًا بعد النشر المرحلي:

- فتح الصفحة الرئيسية
- تسجيل حساب جديد
- تسجيل الدخول
- تسجيل الخروج
- تجربة صلاحيات `student`
- تجربة صلاحيات `trainer`
- تجربة صلاحيات `institute`
- تجربة صلاحيات `admin`
- تجربة رفع ملف أو صورة إذا كانت موجودة
- تجربة الصفحات العامة:
  - `about`
  - `terms`
  - `privacy`
- تجربة dashboard
- تجربة أخطاء API
- تجربة refresh للصفحة بعد تسجيل الدخول
- تجربة الجوال والتابلت
- فحص console في المتصفح
- فحص logs في backend

## 12) Final Pre-production Checklist

قبل الانتقال إلى production تأكد من التالي:

- تغيير جميع أسرار JWT
- عدم تشغيل seed التجريبي
- تجهيز storage دائم للرفع
- تأكيد migrations
- تأكيد SMTP
- تأكيد Twilio
- تأكيد Redis
- ضبط domain حقيقي
- ضبط HTTPS
- ربط `NEXT_PUBLIC_API_URL` بدومين الـ API الحقيقي
- ربط `FRONTEND_URL` بدومين الواجهة الحقيقي
- اختبار كامل قبل الإعلان

## 13) الاختبارات بعد إنشاء الملف

بعد إنشاء `STAGING_DEPLOYMENT.md` شغّل:

### في جذر المشروع

```bash
npm run build
npm run lint
```

### داخل `auth-backend`

```bash
npm run build
```

### ملاحظة

- لا تشغّل deploy فعلي الآن.
- لا تشغّل seed.
- لا تنظّف warnings يدويًا في هذه المرحلة.

## 14) تقرير نهائي مختصر

### أولًا: هل تم إنشاء `STAGING_DEPLOYMENT.md`؟

- نعم / لا

### ثانيًا: ماذا يحتوي الملف؟

- ملخص بنية المشروع
- إعدادات staging للواجهة
- إعدادات staging للباكند
- PostgreSQL و Prisma migrations
- تحذير seed
- Redis
- uploads strategy
- CORS و `FRONTEND_URL`
- health check
- staging testing checklist
- final pre-production checklist

### ثالثًا: هل تم تعديل أي ملفات غير التوثيق؟

- نعم / لا
- إذا نعم، اذكرها وسببها

### رابعًا: نتائج الاختبار

- `npm run build` للواجهة
- `npm run lint`
- `npm run build` للباكند

### خامسًا: هل المشروع جاهز لنشر staging يدوي؟

- نعم / لا
- ما الذي يجب توفيره قبل الضغط على deploy؟
