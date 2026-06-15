"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Activity, DollarSign, Bell, Search, Filter, Download, Loader2 } from "lucide-react"
import { formatDate, formatNumber } from "@/lib/utils"
import { AdminPageHeader } from "@/components/admin/page-header"
import { adminService } from "@/lib/admin-service"
import { toast } from "sonner"

// Audit log structure from backend
interface Log {
  id: string
  type: string
  action: string
  details: string
  user: string
  createdAt: string | Date
  status?: string
  amount?: number
  ip?: string
  rawAction?: string
}

// Helper component to format JSON in log details
const LogDetailsFormatter = ({ text }: { text: string }) => {
  if (!text) return null;

  if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
    return <span className="text-sm text-gray-400 italic">تفاصيل تقنية إضافية</span>;
  }

  let displayText = text;
  
  if (displayText.includes('القيم القديمة:')) {
    displayText = displayText.split('القيم القديمة:')[0];
  } else if (displayText.includes('القيم الجديدة:')) {
    displayText = displayText.split('القيم الجديدة:')[0];
  }

  // Clean up trailing punctuation or spaces
  displayText = displayText.replace(/[\.\-\s]+$/, '');

  return <span className="text-sm">{displayText}</span>;
};

export default function AdminLogs() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const data = await adminService.getAuditLogs()
      
      const actionMap: Record<string, string> = {
        CREATE: 'إنشاء',
        UPDATE: 'تعديل',
        DELETE: 'حذف',
        APPROVE: 'موافقة',
        REJECT: 'رفض',
        CANCEL: 'إلغاء'
      }

      // Map backend AuditLog to frontend Log structure
      const mappedLogs: Log[] = data.map((item: any) => {
        let logType = 'activity';
        if (item.entityName === 'Payment') logType = 'payment';
        else if (item.entityName === 'Announcement' || item.entityName === 'Notification') logType = 'notification';

        return {
          id: item.id,
          type: logType,
          rawAction: item.action,
          action: actionMap[item.action] || item.action,
          details: item.description || `عملية على ${item.entityName}`,
          user: item.performer?.name || 'النظام',
          createdAt: item.performedAt,
          status: 'success'
        }
      })
      setLogs(mappedLogs)
    } catch (error) {
      console.error("Error fetching logs:", error)
      toast.error("فشل تحميل السجلات")
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter((log: Log) => {
    const matchesType = typeFilter === "all" || log.type === typeFilter
    const matchesAction = actionFilter === "all" || log.rawAction === actionFilter
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesType && matchesAction && matchesSearch
  })

  const getStatusBadge = (status: Log['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">نجاح</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">فشل</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">قيد المعالجة</Badge>
      default:
        return null
    }
  }

  const getTypeIcon = (type: Log['type']) => {
    switch (type) {
      case 'activity':
        return <Activity className="h-4 w-4 text-blue-500" />
      case 'payment':
        return <DollarSign className="h-4 w-4 text-green-500" />
      case 'notification':
        return <Bell className="h-4 w-4 text-yellow-500" />
    }
  }

  const getTypeLabel = (type: Log['type']) => {
    switch (type) {
      case 'activity': return 'نشاط'
      case 'payment': return 'مدفوعات'
      case 'notification': return 'تنبيهات'
    }
  }

  const handleExport = () => {
    // Add BOM for Excel Arabic support
    const BOM = "\uFEFF";
    const csvHeader = "النوع,الإجراء,المستخدم,التفاصيل,التاريخ\n";
    const csvContent = filteredLogs.map(log => 
      `${getTypeLabel(log.type)},${log.action},${log.user},"${log.details}",${formatDate(log.createdAt)}`
    ).join("\n");
    
    const blob = new Blob([BOM + csvHeader + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="سجلات النظام"
        description="مراقبة نشاط النظام والعمليات المالية والتنبيهات"
        action={
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 ml-2" />
            تصدير السجلات
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="البحث في السجلات..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="pr-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="نوع السجل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع السجلات</SelectItem>
                <SelectItem value="activity">النشاطات</SelectItem>
                <SelectItem value="payment">المدفوعات</SelectItem>
                <SelectItem value="notification">التنبيهات</SelectItem>
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="نوع الإجراء" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الإجراءات</SelectItem>
                <SelectItem value="CREATE">إنشاء</SelectItem>
                <SelectItem value="UPDATE">تعديل</SelectItem>
                <SelectItem value="DELETE">حذف</SelectItem>
                <SelectItem value="APPROVE">موافقة</SelectItem>
                <SelectItem value="REJECT">رفض</SelectItem>
                <SelectItem value="CANCEL">إلغاء</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>أحدث السجلات</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>النوع</TableHead>
                <TableHead>الإجراء</TableHead>
                <TableHead>المستخدم</TableHead>
                <TableHead>التفاصيل</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>التاريخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(log.type)}
                      <span className="text-sm">{getTypeLabel(log.type)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{log.action}</TableCell>
                  <TableCell>{log.user}</TableCell>
                  <TableCell>
                    <div className="text-gray-600">
                      <LogDetailsFormatter text={log.details} />
                      {log.amount && <div className="text-sm mt-1">({formatNumber(log.amount)} ريال)</div>}
                      {log.ip && <div className="text-sm mt-1 text-gray-400">IP: {log.ip}</div>}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(log.status)}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {formatDate(log.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

