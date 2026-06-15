import React from "react"
import { Calendar, CheckCircle, GraduationCap, MapPin, ShieldCheck, User, Award, BookOpen } from "lucide-react"
import { getFileUrl } from "@/lib/utils"

export interface CertificateData {
  studentName: string
  courseTitle: string
  duration: number
  startDate: string
  endDate: string
  trainerName: string
  instituteName?: string
  enrolledAt: string
  issueDate: string
  siteName: string
  siteLogo?: string
}

export function RegistrationCertificate({ data }: { data: CertificateData }) {
  const issueNumber = data.issueDate.replace(/-/g, "").slice(-5)

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div
      id="certificate-container"
      dir="rtl"
      style={{
        width: "1122px",
        height: "793px",
        backgroundColor: "#ffffff",
        fontFamily: "'Inter', sans-serif",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Background Graphic Patterns */}
      <div style={{ position: "absolute", top: "-100px", left: "-100px", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(37,99,235,0.06) 0%, rgba(255,255,255,0) 70%)", borderRadius: "50%" }} />
      <div style={{ position: "absolute", bottom: "-150px", right: "-100px", width: "600px", height: "600px", background: "radial-gradient(circle, rgba(14,165,233,0.06) 0%, rgba(255,255,255,0) 70%)", borderRadius: "50%" }} />
      
      {/* Outer Border Layer */}
      <div style={{ position: "absolute", inset: "24px", border: "1px solid #E2E8F0", borderRadius: "20px" }} />
      <div style={{ position: "absolute", inset: "32px", border: "2px solid #2563EB", borderRadius: "14px" }} />
      <div style={{ position: "absolute", inset: "36px", border: "1px solid rgba(37, 99, 235, 0.2)", borderRadius: "10px" }} />

      {/* Main Content Area */}
      <div style={{ width: "100%", height: "100%", padding: "60px 80px", position: "relative", zIndex: 10, display: "flex", flexDirection: "column" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "30px" }}>
          <div>
            <h1 style={{ fontSize: "40px", fontWeight: "900", color: "#0F172A", margin: 0, letterSpacing: "-0.5px" }}>
              شهادة تأكيد تسجيل
            </h1>
            <p style={{ fontSize: "16px", color: "#64748B", marginTop: "8px", fontWeight: "500", display: "flex", alignItems: "center", gap: "8px" }}>
              <ShieldCheck size={18} color="#2563EB" /> وثيقة رسمية معتمدة من المنصة
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ textAlign: "left" }}>
              <p style={{ margin: 0, fontSize: "22px", fontWeight: "900", color: "#1E3A8A", letterSpacing: "-0.5px" }}>{data.siteName}</p>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748B", fontWeight: "500" }}>بوابة التعليم الرائدة</p>
            </div>
            <div style={{ width: "64px", height: "64px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src={getFileUrl(data.siteLogo) || "/images/logo.png"} alt={data.siteName} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: "100%", height: "2px", background: "linear-gradient(90deg, #2563EB 0%, rgba(37,99,235,0) 100%)", marginBottom: "40px", opacity: 0.3 }} />

        {/* Body Text */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
          <p style={{ fontSize: "20px", color: "#475569", margin: 0, fontWeight: "500" }}>
            يشهد النظام الإلكتروني بأن المتدرب/ـة
          </p>
          
          <h2 style={{ fontSize: "52px", fontWeight: "900", color: "#1E40AF", marginTop: "16px", marginBottom: "20px", letterSpacing: "-1px" }}>
            {data.studentName}
          </h2>
          
          <p style={{ fontSize: "20px", color: "#475569", margin: 0, fontWeight: "500" }}>
            قد أكمل/ت كافة الإجراءات وتم تأكيد مقعده/ها رسمياً في دورة
          </p>
          
          <div style={{ marginTop: "24px", marginBottom: "40px", display: "inline-block", padding: "12px 40px", background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: "100px" }}>
            <h3 style={{ fontSize: "28px", fontWeight: "800", color: "#0F172A", margin: 0 }}>
              {data.courseTitle}
            </h3>
          </div>
          
          {/* Details Grid */}
          <div style={{ display: "grid", gridTemplateColumns: data.instituteName ? "repeat(4, 1fr)" : "repeat(3, 1fr)", gap: "20px", width: "100%" }}>
            
            <div style={{ background: "#ffffff", border: "1px solid #E2E8F0", padding: "20px", borderRadius: "16px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02)" }}>
              <div style={{ background: "#EFF6FF", padding: "10px", borderRadius: "12px", marginBottom: "12px" }}><User style={{ color: "#2563EB" }} size={24} /></div>
              <p style={{ margin: 0, fontSize: "13px", color: "#64748B", fontWeight: "600", marginBottom: "4px" }}>المدرب المشرف</p>
              <p style={{ margin: 0, fontSize: "16px", color: "#0F172A", fontWeight: "800", lineHeight: "1.4" }}>{data.trainerName}</p>
            </div>

            {data.instituteName && (
              <div style={{ background: "#ffffff", border: "1px solid #E2E8F0", padding: "20px", borderRadius: "16px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02)" }}>
                <div style={{ background: "#EFF6FF", padding: "10px", borderRadius: "12px", marginBottom: "12px" }}><GraduationCap style={{ color: "#2563EB" }} size={24} /></div>
                <p style={{ margin: 0, fontSize: "13px", color: "#64748B", fontWeight: "600", marginBottom: "4px" }}>الجهة المقدمة</p>
                <p style={{ margin: 0, fontSize: "16px", color: "#0F172A", fontWeight: "800", lineHeight: "1.4" }}>{data.instituteName}</p>
              </div>
            )}
            
            <div style={{ background: "#ffffff", border: "1px solid #E2E8F0", padding: "20px", borderRadius: "16px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02)" }}>
              <div style={{ background: "#EFF6FF", padding: "10px", borderRadius: "12px", marginBottom: "12px" }}><Calendar style={{ color: "#2563EB" }} size={24} /></div>
              <p style={{ margin: 0, fontSize: "13px", color: "#64748B", fontWeight: "600", marginBottom: "4px" }}>فترة الدورة</p>
              <p style={{ margin: 0, fontSize: "16px", color: "#0F172A", fontWeight: "800", lineHeight: "1.4" }}>{formatDate(data.startDate)} - {formatDate(data.endDate)}</p>
            </div>
            
            <div style={{ background: "#ffffff", border: "1px solid #E2E8F0", padding: "20px", borderRadius: "16px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02)" }}>
              <div style={{ background: "#F0FDF4", padding: "10px", borderRadius: "12px", marginBottom: "12px" }}><CheckCircle style={{ color: "#16A34A" }} size={24} /></div>
              <p style={{ margin: 0, fontSize: "13px", color: "#64748B", fontWeight: "600", marginBottom: "4px" }}>تاريخ التأكيد</p>
              <p style={{ margin: 0, fontSize: "16px", color: "#0F172A", fontWeight: "800", lineHeight: "1.4" }}>{formatDate(data.enrolledAt)}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: "40px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "1px solid #E2E8F0", paddingTop: "24px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <div style={{ width: "32px", height: "32px", background: "#F1F5F9", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BookOpen size={16} color="#64748B" />
              </div>
              <p style={{ margin: 0, fontSize: "13px", color: "#64748B", fontWeight: "600" }}>رقم الإصدار: #{issueNumber}</p>
            </div>
            <p style={{ margin: 0, fontSize: "13px", color: "#94A3B8" }}>تاريخ الإصدار: {formatDate(data.issueDate)} � وثيقة إلكترونية لا تحتاج إلى توقيع فعلي.</p>
            <p style={{ margin: 0, fontSize: "13px", color: "#EF4444", marginTop: "4px", fontWeight: "600" }}>ملاحظة: هذه الشهادة تثبت حجز المقعد والتسجيل فقط ولا تعتبر شهادة اجتياز للدورة.</p>
          </div>
          
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
            {/* Signature Graphic/Placeholder */}
            <div style={{ width: "120px", height: "40px", marginBottom: "4px", position: "relative" }}>
              <svg viewBox="0 0 100 40" style={{ width: "100%", height: "100%", opacity: 0.6 }}>
                <path d="M10,30 Q20,10 30,25 T50,20 T70,30 T90,15" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
                <path d="M30,35 Q50,15 70,35" fill="none" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div style={{ width: "180px", borderBottom: "1px dashed #CBD5E1", marginBottom: "8px" }} />
            <p style={{ margin: 0, fontSize: "15px", color: "#334155", fontWeight: "800" }}>الإدارة العامة للمنصة</p>
          </div>
        </div>
      </div>
    </div>
  )
}
