"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, Building2, Users, CheckCircle2 } from "lucide-react"
import { AdminPageHeader } from "@/components/admin/page-header"
import { adminService } from "@/lib/admin-service"
import { getFileUrl, formatDate } from "@/lib/utils"
import { toast } from "sonner"

interface HallData {
  id: string
  name: string
  capacity: number
  description: string | null
  image: string | null
  isActive: boolean
  type?: string
  location?: string | null
  pricePerHour?: number | null
  facilities?: string[]
  features?: string[]
  createdAt: string
  institute?: {
    id: string
    name: string
    logo?: string | null
  }
  courses?: any[]
}

function resolveImage(src: string | null | undefined): string {
  const url = getFileUrl(src || "") 
  return url || "/images/course-web.png"
}

export default function AdminHallsPage() {
  const [halls, setHalls] = useState<HallData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedHall, setSelectedHall] = useState<HallData | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const loadHalls = async () => {
    try {
      setLoading(true)
      const data = await adminService.getAllHalls()
      setHalls(data || [])
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل تحميل بيانات القاعات")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHalls()
  }, [])

  const filteredHalls = useMemo(() => {
    return halls.filter((hall) => {
      const matchesSearch =
        hall.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (hall.institute?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && hall.isActive) ||
        (statusFilter === "inactive" && !hall.isActive)
      return matchesSearch && matchesStatus
    })
  }, [halls, searchQuery, statusFilter])

  const totalHalls = halls.length
  const activeHalls = halls.filter((h) => h.isActive).length
  const uniqueInstitutes = new Set(halls.map((h) => h.institute?.id).filter(Boolean)).size

  const handleViewHall = (hall: HallData) => {
    setSelectedHall(hall)
    setDetailOpen(true)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="إدارة القاعات" description="مراجعة جميع القاعات المسجلة في المنصة" />
        <div className="flex justify-center p-12">
          <p>جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="إدارة القاعات"
        description="مراجعة جميع القاعات المسجلة في المنصة"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي القاعات</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHalls}</div>
            <p className="text-xs text-muted-foreground">قاعة مسجلة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المعاهد المالكة</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueInstitutes}</div>
            <p className="text-xs text-muted-foreground">معهد يمتلك قاعات</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="البحث باسم القاعة أو المعهد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Halls Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة القاعات ({filteredHalls.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>القاعة</TableHead>
                <TableHead>المعهد</TableHead>
                <TableHead>السعة</TableHead>
                <TableHead>تاريخ الإنشاء</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHalls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    لا توجد قاعات مطابقة للبحث
                  </TableCell>
                </TableRow>
              ) : (
                filteredHalls.map((hall) => (
                  <TableRow key={hall.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          {hall.image ? (
                            <img
                              src={resolveImage(hall.image)}
                              alt={hall.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/images/course-web.png"
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Building2 className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{hall.name}</div>
                          {hall.type && (
                            <div className="text-xs text-gray-500">{hall.type}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {hall.institute?.logo && (
                          <img
                            src={resolveImage(hall.institute.logo)}
                            alt={hall.institute.name}
                            className="w-6 h-6 rounded-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none"
                            }}
                          />
                        )}
                        <span className="text-sm">{hall.institute?.name || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{hall.capacity}</span>
                      <span className="text-xs text-gray-500 mr-1">شخص</span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {hall.createdAt ? formatDate(hall.createdAt) : "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewHall(hall)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Hall Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل القاعة</DialogTitle>
          </DialogHeader>
          {selectedHall && (
            <div className="space-y-6">
              {/* Hall Image */}
              {selectedHall.image && (
                <div className="w-full h-48 rounded-xl overflow-hidden bg-gray-100">
                  <img
                    src={resolveImage(selectedHall.image)}
                    alt={selectedHall.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/images/course-web.png"
                    }}
                  />
                </div>
              )}

              {/* Basic Info */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold">{selectedHall.name}</h3>
                  {selectedHall.type && (
                    <p className="text-sm text-gray-500 mt-1">{selectedHall.type}</p>
                  )}
                </div>
                {selectedHall.institute && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    {selectedHall.institute.logo && (
                      <img
                        src={resolveImage(selectedHall.institute.logo)}
                        alt={selectedHall.institute.name}
                        className="w-8 h-8 rounded-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none"
                        }}
                      />
                    )}
                    <span>{selectedHall.institute.name}</span>
                  </div>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">السعة</p>
                  <p className="font-semibold">{selectedHall.capacity} شخص</p>
                </div>
                {selectedHall.pricePerHour != null && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">السعر / ساعة</p>
                    <p className="font-semibold">{selectedHall.pricePerHour} ر.ي</p>
                  </div>
                )}
                {selectedHall.location && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 font-medium mb-1">الموقع</p>
                    <p className="font-medium">{selectedHall.location}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">تاريخ الإنشاء</p>
                  <p className="font-medium">{selectedHall.createdAt ? formatDate(selectedHall.createdAt) : "-"}</p>
                </div>
              </div>

              {/* Description */}
              {selectedHall.description && (
                <div>
                  <h4 className="font-semibold mb-2">وصف القاعة</h4>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg text-sm leading-relaxed">
                    {selectedHall.description}
                  </p>
                </div>
              )}

              {/* Features/Facilities */}
              {((selectedHall.facilities && selectedHall.facilities.length > 0) ||
                (selectedHall.features && selectedHall.features.length > 0)) && (
                <div>
                  <h4 className="font-semibold mb-2">التجهيزات</h4>
                  <div className="flex flex-wrap gap-2">
                    {(selectedHall.facilities || selectedHall.features || []).map((item, idx) => (
                      <Badge key={idx} variant="secondary">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Courses */}
              {selectedHall.courses && selectedHall.courses.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">الدورات المرتبطة ({selectedHall.courses.length})</h4>
                  <div className="space-y-2">
                    {selectedHall.courses.slice(0, 5).map((course: any) => (
                      <div key={course.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
                        <span className="font-medium">{course.title}</span>
                        {course.status && (
                          <Badge variant="outline" className="text-xs">{course.status}</Badge>
                        )}
                      </div>
                    ))}
                    {selectedHall.courses.length > 5 && (
                      <p className="text-xs text-gray-500">
                        +{selectedHall.courses.length - 5} دورات أخرى
                      </p>
                    )}
                  </div>
                </div>
              )}

              <Button onClick={() => setDetailOpen(false)} className="w-full">
                إغلاق
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

