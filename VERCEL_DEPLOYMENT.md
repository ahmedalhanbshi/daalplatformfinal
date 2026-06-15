# دليل النشر على Vercel

هذا الملف يوضح إعدادات نشر الواجهة الأمامية لمنصة دال على Vercel بشكل عملي، دون تنفيذ نشر فعلي الآن، ودون استخدام رابط backend حقيقي أو أسرار حقيقية.

## 1) نوع المشروع

- Framework Preset: `Next.js`
- Root Directory: `./`

## 2) الأوامر المعتمدة فعليًا

السكربتات الموجودة في الجذر حاليًا هي:

- `npm install`
- `npm run build`
- `npm run start`
- `npm run lint`

## 3) إعدادات Vercel المقترحة

- Framework Preset:
  - `Next.js`
- Root Directory:
  - `./`
- Build Command:
  - `npm run build`
- Install Command:
  - `npm install`
- Output Directory:
  - اتركه افتراضيًا لـ Next.js

## 4) متغيرات البيئة المطلوبة

```env
NEXT_PUBLIC_API_URL=https://YOUR_RENDER_BACKEND_URL
```

### ملاحظات مهمة

- لا تستخدم `localhost` في Vercel production.
- لا تضع رابطًا حقيقيًا الآن إذا لم يكن جاهزًا.
- `NEXT_PUBLIC_API_URL` يجب أن يشير إلى backend المنشور فعليًا على Render.
- في هذا المشروع، الواجهة تبني روابط API اعتمادًا على `NEXT_PUBLIC_API_URL` مباشرة، لذلك عادة لا تضيف `/api` إلى هذا المتغير إلا إذا كان deployment proxy يتطلب ذلك.

## 5) متى تعيد deploy الواجهة؟

أعد deploy عندما:

- يتغير `NEXT_PUBLIC_API_URL`
- يتغير أي routing أو منطق اتصال يعتمد على API
- يتغير الشكل أو السلوك في الواجهة

## 6) كيف تختبر الاتصال بالـ backend

### بعد النشر

- افتح الصفحة الرئيسية
- جرّب تسجيل الدخول
- راقب طلبات الشبكة في المتصفح
- تأكد أن الطلبات تذهب إلى backend المنشور وليس إلى `localhost`

### نقطة مهمة

backend الحالي لديه endpoint صحي:

- `GET /health`

والرابط المتوقع يجب أن يكون على نمط:

```text
https://YOUR_RENDER_BACKEND_URL/health
```

## 7) مشاكل شائعة

### 1. `NEXT_PUBLIC_API_URL` ما زال `localhost`

- السبب:
  - لم يتم تحديث متغير البيئة في Vercel
- الحل:
  - حدّث المتغير وأعد النشر

### 2. أخطاء CORS

- السبب:
  - `FRONTEND_URL` في backend لا يطابق رابط Vercel
- الحل:
  - اجعل `FRONTEND_URL` مساويًا لرابط الواجهة النهائي

### 3. URL الخاص بالـ API ناقص أو غير صحيح

- السبب:
  - تم إدخال URL غير متوافق مع طريقة بناء الطلبات في التطبيق
- الحل:
  - استخدم رابط backend الأساسي الكامل كما هو منشور

### 4. تحذير `Dynamic server usage`

- السبب:
  - بعض الصفحات تحاول جلب بيانات من backend أثناء build
- الملاحظة:
  - هذا تحذير موجود في المشروع حاليًا ويجب توثيقه، لا تنظيفه في هذه المرحلة

## 8) ماذا تفعل إذا فشل build

تحقق من الآتي:

- وجود `NEXT_PUBLIC_API_URL`
- أن رابط الـ API صحيح ومتصل
- أن backend منشور ويستجيب
- أن لا توجد تغييرات تكسر TypeScript أو Next.js build

## 9) checklist سريع قبل الضغط على Deploy

- Root Directory مضبوط على `./`
- Build Command مضبوط
- Install Command مضبوط
- `NEXT_PUBLIC_API_URL` مضبوط
- backend منشور على Render
- `GET /health` يعمل
- تم اختبار تسجيل الدخول بعد النشر

## 10) تقرير نهائي مختصر

- هل تم إنشاء `VERCEL_DEPLOYMENT.md`؟
  - نعم / لا
- هل تم تعديل أي ملف غير التوثيق؟
  - نعم / لا
- هل تم نشر فعلي؟
  - نعم / لا

لا يحتاج المشروع `vercel.json` حاليًا لأن Vercel يكتشف Next.js تلقائيًا، ويكفي ضبط `NEXT_PUBLIC_API_URL`.
