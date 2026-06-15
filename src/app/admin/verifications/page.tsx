"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Eye, CheckCircle, XCircle, UserCheck, Building, FileText, AlertTriangle } from "lucide-react"
import { formatDate, getFileUrl } from "@/lib/utils"
import { AdminPageHeader } from "@/components/admin/page-header"
import { adminService } from "@/lib/admin-service"

// Duplicate interfaces locally as they are not exported from service
interface PendingTrainer {
    id: string;
    userId: string;
    bio: string | null;
    cvUrl: string | null;
    specialties: string[];
    certificatesUrls: string[];
    verificationStatus: string;
    user: {
        id: string;
        name: string;
        email: string;
        phone: string | null;
        createdAt: string;
    };
}

interface PendingInstitute {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    licenseNumber: string | null;
    licenseDocumentUrl: string | null;
    verificationStatus: string;
    user: {
        id: string;
        name: string;
        email: string;
        phone: string | null;
        createdAt: string;
    };
}

export default function AdminVerifications() {
    const [trainers, setTrainers] = useState<PendingTrainer[]>([])
    const [institutes, setInstitutes] = useState<PendingInstitute[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    // Dialog state
    const [viewDialog, setViewDialog] = useState<{ open: boolean; type: 'trainer' | 'institute' | null; data: any | null }>({
        open: false,
        type: null,
        data: null
    })

    const [actionDialog, setActionDialog] = useState<{ open: boolean; type: 'approve' | 'reject' | null }>({
        open: false,
        type: null
    })

    const [selectedItem, setSelectedItem] = useState<{ id: string; type: 'trainer' | 'institute'; name: string } | null>(null)
    const [rejectReason, setRejectReason] = useState("")

    useEffect(() => {
        loadVerifications()
    }, [])

    const loadVerifications = async () => {
        try {
            setLoading(true)
            const data = await adminService.getPendingVerifications()
            setTrainers(data.trainers)
            setInstitutes(data.institutes)
        } catch (err: any) {
            setError(err?.message || "فشل تحميل طلبات التحقق")
        } finally {
            setLoading(false)
        }
    }

    // View Handler
    const handleView = (item: any, type: 'trainer' | 'institute') => {
        setViewDialog({ open: true, type, data: item })
    }

    // Action Handlers
    const handleApprove = (id: string, type: 'trainer' | 'institute', name: string) => {
        setSelectedItem({ id, type, name })
        setActionDialog({ open: true, type: 'approve' })
    }

    const handleReject = (id: string, type: 'trainer' | 'institute', name: string) => {
        setSelectedItem({ id, type, name })
        setRejectReason("")
        setActionDialog({ open: true, type: 'reject' })
    }

    const executeAction = async () => {
        if (!selectedItem) return

        try {
            setError("")
            setSuccess("")

            if (actionDialog.type === 'approve') {
                if (selectedItem.type === 'trainer') {
                    await adminService.approveTrainer(selectedItem.id)
                } else {
                    await adminService.approveInstitute(selectedItem.id)
                }
                setSuccess(`تم اعتماد ${selectedItem.name} بنجاح`)
            } else {
                if (!rejectReason) {
                    setError("يرجى ذكر سبب الرفض");
                    return;
                }
                if (selectedItem.type === 'trainer') {
                    await adminService.rejectTrainer(selectedItem.id, rejectReason)
                } else {
                    await adminService.rejectInstitute(selectedItem.id, rejectReason)
                }
                setSuccess(`تم رفض طلب ${selectedItem.name}`)
            }

            // Close dialogs and reload
            setActionDialog({ open: false, type: null })
            setSelectedItem(null)
            loadVerifications()
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || "فشل تنفيذ العملية")
        }
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <AdminPageHeader
                    title="طلبات التحقق"
                    description="مراجعة واعتماد طلبات الانضمام المعلقة"
                />
                <div className="flex justify-center p-12">
                    <p>جاري التحميل...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="طلبات التحقق"
                description="مراجعة واعتماد طلبات الانضمام المعلقة للمدربين والمعاهد"
            />

            {error && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-4 text-red-800">{error}</CardContent>
                </Card>
            )}

            {success && (
                <Card className="border-green-200 bg-green-50">
                    <CardContent className="p-4 text-green-800">{success}</CardContent>
                </Card>
            )}

            <Tabs defaultValue="trainers" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="trainers" className="relative">
                        المدربين
                        {trainers.length > 0 && (
                            <Badge variant="destructive" className="mr-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                                {trainers.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="institutes" className="relative">
                        المعاهد
                        {institutes.length > 0 && (
                            <Badge variant="destructive" className="mr-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                                {institutes.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="trainers">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UserCheck className="h-5 w-5" />
                                طلبات المدربين المعلقة
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {trainers.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    لا توجد طلبات تحقق معلقة للمدربين
                                    <CheckCircle className="mx-auto h-12 w-12 text-green-500 mt-4 opacity-20" />
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>الاسم</TableHead>
                                            <TableHead>التخصصات</TableHead>
                                            <TableHead>تاريخ التسجيل</TableHead>
                                            <TableHead>الإجراءات</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {trainers.map((trainer) => (
                                            <TableRow key={trainer.id}>
                                                <TableCell>
                                                    <div className="font-medium">{trainer.user.name}</div>
                                                    <div className="text-sm text-gray-500">{trainer.user.email}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {trainer.specialties.slice(0, 2).map((s, i) => (
                                                            <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                                                        ))}
                                                        {trainer.specialties.length > 2 && (
                                                            <Badge variant="outline" className="text-xs">+{trainer.specialties.length - 2}</Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{formatDate(new Date(trainer.user.createdAt))}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Button variant="ghost" size="icon" onClick={() => handleView(trainer, 'trainer')}>
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(trainer.id, 'trainer', trainer.user.name)}>
                                                            اعتماد
                                                        </Button>
                                                        <Button size="sm" variant="destructive" onClick={() => handleReject(trainer.id, 'trainer', trainer.user.name)}>
                                                            رفض
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="institutes">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building className="h-5 w-5" />
                                طلبات المعاهد المعلقة
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {institutes.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    لا توجد طلبات تحقق معلقة للمعاهد
                                    <CheckCircle className="mx-auto h-12 w-12 text-green-500 mt-4 opacity-20" />
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>اسم المعهد</TableHead>
                                            <TableHead>رقم الترخيص</TableHead>
                                            <TableHead>تاريخ التسجيل</TableHead>
                                            <TableHead>الإجراءات</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {institutes.map((institute) => (
                                            <TableRow key={institute.id}>
                                                <TableCell>
                                                    <div className="font-medium">{institute.name}</div>
                                                    <div className="text-sm text-gray-500">{institute.email || institute.user.email}</div>
                                                </TableCell>
                                                <TableCell>{institute.licenseNumber || '-'}</TableCell>
                                                <TableCell>{formatDate(new Date(institute.user.createdAt))}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Button variant="ghost" size="icon" onClick={() => handleView(institute, 'institute')}>
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(institute.id, 'institute', institute.name)}>
                                                            اعتماد
                                                        </Button>
                                                        <Button size="sm" variant="destructive" onClick={() => handleReject(institute.id, 'institute', institute.name)}>
                                                            رفض
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* View Details Dialog */}
            <Dialog open={viewDialog.open} onOpenChange={(open) => !open && setViewDialog({ ...viewDialog, open: false })}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>
                            {viewDialog.type === 'trainer' ? 'تفاصيل المدرب' : 'تفاصيل المعهد'}
                        </DialogTitle>
                    </DialogHeader>

                    {viewDialog.data && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground">الاسم</Label>
                                    <div className="font-medium text-lg">
                                        {viewDialog.type === 'trainer' ? viewDialog.data.user.name : viewDialog.data.name}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">البريد الإلكتروني</Label>
                                    <div>{viewDialog.type === 'trainer' ? viewDialog.data.user.email : (viewDialog.data.email || viewDialog.data.user.email)}</div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">رقم الهاتف</Label>
                                    <div>{viewDialog.data.user.phone || viewDialog.data.phone || '-'}</div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">تاريخ التسجيل</Label>
                                    <div>{formatDate(new Date(viewDialog.data.user.createdAt))}</div>
                                </div>
                            </div>

                            {viewDialog.type === 'trainer' && (
                                <>
                                    <div>
                                        <Label className="text-muted-foreground">التخصصات</Label>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {viewDialog.data.specialties.map((s: string, i: number) => (
                                                <Badge key={i} variant="secondary">{s}</Badge>
                                            ))}
                                        </div>
                                    </div>

                                    {viewDialog.data.bio && (
                                        <div>
                                            <Label className="text-muted-foreground">النبذة التعريفية</Label>
                                            <p className="text-sm mt-1 bg-slate-50 p-3 rounded border">{viewDialog.data.bio}</p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                        {viewDialog.data.cvUrl && (
                                            <Button variant="outline" asChild className="w-full">
                                                <a href={getFileUrl(viewDialog.data.cvUrl)} target="_blank" rel="noopener noreferrer">
                                                    <FileText className="mr-2 h-4 w-4" />
                                                    عرض السيرة الذاتية
                                                </a>
                                            </Button>
                                        )}
                                        {viewDialog.data.certificatesUrls?.length > 0 && (
                                            <div className="col-span-2">
                                                <Label className="text-muted-foreground mb-2 block">الشهادات</Label>
                                                <div className="flex gap-2 flex-wrap">
                                                    {viewDialog.data.certificatesUrls.map((url: string, idx: number) => (
                                                        <Button key={idx} variant="outline" size="sm" asChild>
                                                            <a href={getFileUrl(url)} target="_blank" rel="noopener noreferrer">
                                                                شهادة {idx + 1}
                                                            </a>
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {viewDialog.type === 'institute' && (
                                <>
                                    {viewDialog.data.description && (
                                        <div>
                                            <Label className="text-muted-foreground">وصف المعهد</Label>
                                            <p className="text-sm mt-1 bg-slate-50 p-3 rounded border">{viewDialog.data.description}</p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-muted-foreground">العنوان</Label>
                                            <div>{viewDialog.data.address || '-'}</div>
                                        </div>
                                        <div>
                                            <Label className="text-muted-foreground">رقم الترخيص</Label>
                                            <div>{viewDialog.data.licenseNumber || '-'}</div>
                                        </div>
                                    </div>

                                    {viewDialog.data.licenseDocumentUrl && (
                                        <div className="mt-2">
                                            <Button variant="outline" asChild className="w-full">
                                                <a href={getFileUrl(viewDialog.data.licenseDocumentUrl)} target="_blank" rel="noopener noreferrer">
                                                    <FileText className="mr-2 h-4 w-4" />
                                                    عرض وثيقة الترخيص
                                                </a>
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setViewDialog({ ...viewDialog, open: false })}>إغلاق</Button>
                        {viewDialog.data && (
                            <>
                                <Button
                                    variant="destructive"
                                    onClick={() => {
                                        setViewDialog({ ...viewDialog, open: false })
                                        handleReject(
                                            viewDialog.data.id,
                                            viewDialog.type!,
                                            viewDialog.type === 'trainer' ? viewDialog.data.user.name : viewDialog.data.name
                                        )
                                    }}
                                >
                                    رفض
                                </Button>
                                <Button
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => {
                                        setViewDialog({ ...viewDialog, open: false })
                                        handleApprove(
                                            viewDialog.data.id,
                                            viewDialog.type!,
                                            viewDialog.type === 'trainer' ? viewDialog.data.user.name : viewDialog.data.name
                                        )
                                    }}
                                >
                                    اعتماد
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Action Confirmation Dialog */}
            <Dialog open={actionDialog.open} onOpenChange={(open) => !open && setActionDialog({ ...actionDialog, open: false })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {actionDialog.type === 'approve' ? 'تأكيد الاعتماد' : 'تأكيد الرفض'}
                        </DialogTitle>
                        <DialogDescription>
                            {actionDialog.type === 'approve'
                                ? `هل أنت متأكد من رغبتك في اعتماد ${selectedItem?.name}؟ سيتم تفعيل الحساب فورًا.`
                                : `هل أنت متأكد من رغبتك في رفض ${selectedItem?.name}؟`
                            }
                        </DialogDescription>
                    </DialogHeader>

                    {actionDialog.type === 'reject' && (
                        <div className="py-2">
                            <Label htmlFor="reason">سبب الرفض</Label>
                            <Textarea
                                id="reason"
                                placeholder="يرجى ذكر سبب الرفض..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                            />
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setActionDialog({ ...actionDialog, open: false })}>إغلاق</Button>
                        <Button
                            variant={actionDialog.type === 'approve' ? 'default' : 'destructive'}
                            className={actionDialog.type === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
                            onClick={executeAction}
                        >
                            {actionDialog.type === 'approve' ? 'تأكيد الاعتماد' : 'تأكيد الرفض'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

