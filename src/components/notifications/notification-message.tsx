"use client"

import { Building2, User, Phone, Mail, MessageSquare } from "lucide-react"

interface NotificationMessageProps {
  message: string
  isFull?: boolean
}

function decodeMojibake(value: string) {
  if (!/[ÃØÙ]/.test(value)) return value

  try {
    const bytes = Uint8Array.from(Array.from(value), (char) => char.charCodeAt(0) & 0xff)
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes)
  } catch {
    return value
  }
}

function repairKnownNotificationText(value: string) {
  const instituteMatch = value.match(/تمت مراجعة معهد\s+"([^"]+)"/)
  if (instituteMatch && value.includes("يمكنكم الآن") && value.includes("إنشاء الدورات")) {
    return `تهانينا! تمت مراجعة معهد "${instituteMatch[1]}" والموافقة عليه. يمكنكم الآن البدء في إنشاء الدورات.`
  }

  if (value.includes("تمت مراجعة") && value.includes("الشخصي") && value.includes("إنشاء دوراتك")) {
    return "تهانينا! تمت مراجعة ملفك الشخصي والموافقة عليه. يمكنك الآن البدء في إنشاء دوراتك."
  }

  return value
}

export function NotificationMessage({ message, isFull = false }: NotificationMessageProps) {
  if (!message) return null

  const displayMessage = repairKnownNotificationText(decodeMojibake(message))
  const parts = displayMessage.split("---")
  const mainMessage = parts[0].trim()
  const metadataStr = parts.length > 1 ? parts[1].trim() : ""

  if (!metadataStr) {
    return <p className={`text-sm ${isFull ? "text-gray-700 leading-relaxed" : "text-gray-500 truncate"}`}>{displayMessage}</p>
  }

  const labels = [
    { key: "المعهد:", icon: <Building2 className="h-3.5 w-3.5" />, color: "text-blue-500" },
    { key: "المرسل:", icon: <User className="h-3.5 w-3.5" />, color: "text-purple-500" },
    { key: "الجوال:", icon: <Phone className="h-3.5 w-3.5" />, color: "text-green-500" },
    { key: "البريد:", icon: <Mail className="h-3.5 w-3.5" />, color: "text-red-500" },
  ]

  const metadata: { label: string; value: string; icon: React.ReactNode; color: string }[] = []
  const remainingStr = metadataStr

  labels.forEach((label, index) => {
    if (remainingStr.includes(label.key)) {
      const nextLabel = labels.slice(index + 1).find((item) => remainingStr.includes(item.key))
      const start = remainingStr.indexOf(label.key) + label.key.length
      const end = nextLabel ? remainingStr.indexOf(nextLabel.key) : remainingStr.length

      let value = remainingStr.slice(start, end).trim()
      value = value.replace(/[🏛️👤📞✉️]/g, "").trim()

      if (value) {
        metadata.push({
          label: label.key.replace(":", ""),
          value,
          icon: label.icon,
          color: label.color,
        })
      }
    }
  })

  const hasInstitute = metadata.some((item) => item.label === "المعهد")
  const displayMetadata = hasInstitute ? metadata.filter((item) => item.label !== "المرسل") : metadata

  if (!isFull) {
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-800 line-clamp-1">{mainMessage}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {displayMetadata.slice(0, 2).map((item, idx) => (
            <div key={idx} className="flex items-center gap-1 text-[11px] text-gray-500">
              <span className={item.color}>{item.icon}</span>
              <span className="truncate max-w-[120px]">{item.value}</span>
            </div>
          ))}
          {displayMetadata.length > 2 && <span className="text-[10px] text-gray-400">...</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
        <div className="flex gap-3">
          <MessageSquare className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-gray-700 leading-relaxed font-medium">{mainMessage}</p>
        </div>
      </div>

      {displayMetadata.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {displayMetadata.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-white hover:border-gray-200 transition-colors"
            >
              <div className={`p-2 rounded-md ${item.color.replace("text", "bg")}/10 ${item.color}`}>
                {item.icon}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{item.label}</p>
                <p className="text-sm text-gray-700 font-semibold truncate" dir="ltr">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
