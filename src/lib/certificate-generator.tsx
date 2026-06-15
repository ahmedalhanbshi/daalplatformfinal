import React from "react"
import { createRoot } from "react-dom/client"
import { toJpeg } from "html-to-image"
import jsPDF from "jspdf"
import { CertificateData, RegistrationCertificate } from "@/components/certificate/RegistrationCertificate"
import { toast } from "sonner"
import apiClient from "./api-client"

export async function downloadRegistrationCertificate(enrollmentId: string, siteName: string = "Daal Platform", siteLogo?: string) {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;
  
  try {
    // 1. Fetch certificate data from backend
    const response = await apiClient.get<{ success: boolean, message: string, data: Omit<CertificateData, "siteName" | "siteLogo"> }>(
      `/api/student/enrollments/${enrollmentId}/certificate`
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || "فشل في جلب بيانات الشهادة");
    }

    const certificateData: CertificateData = {
      ...response.data.data,
      siteName,
      siteLogo,
    };

    // 2. Create a hidden container in the DOM
    container = document.createElement("div");
    container.style.position = "fixed";
    container.style.top = "-9999px";
    container.style.left = "-9999px";
    // Important: Keep it visible to html2canvas by not using display: none
    document.body.appendChild(container);

    // 3. Render the React component into the container
    root = createRoot(container);
    
    // We need to wait for the component to actually render in the DOM
    await new Promise<void>((resolve) => {
      root!.render(
        <div id="certificate-render-wrapper">
          <RegistrationCertificate data={certificateData} />
        </div>
      );
      // Give React time to mount and browser time to paint
      setTimeout(resolve, 500);
    });

    // 4. Capture the certificate with html2canvas
    const element = document.getElementById("certificate-container");
    if (!element) {
      throw new Error("لم يتم العثور على عنصر الشهادة");
    }

    // Capture at a higher scale for better PDF quality
    const imgData = await toJpeg(element, {
      quality: 1.0,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
    });

    // 5. Generate the PDF
    // A4 dimensions: 210 x 297 mm. We use landscape: 297 x 210
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // Add image to PDF
    pdf.addImage(imgData, "JPEG", 0, 0, 297, 210);

    // 6. Download the PDF
    const filename = `شهادة-تسجيل-${certificateData.courseTitle.replace(/\s+/g, "-")}.pdf`;
    pdf.save(filename);
    
    toast.success("تم تحميل شهادة تأكيد التسجيل بنجاح");
  } catch (error: unknown) {
    console.error("Error generating certificate:", error);
    const message = error instanceof Error ? error.message : "حدث خطأ أثناء إنشاء الشهادة";
    toast.error(message);
    throw error;
  } finally {
    // Clean up DOM and React tree
    if (root) {
      setTimeout(() => root!.unmount(), 0);
    }
    if (container && document.body.contains(container)) {
      setTimeout(() => document.body.removeChild(container!), 0);
    }
  }
}
