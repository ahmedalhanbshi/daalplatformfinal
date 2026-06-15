"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Star, TrendingUp, MessageSquare, Users, BarChart3, BookOpen } from "lucide-react"
import { useState } from "react"
import { Review } from "@/types"
import { formatDate } from "@/lib/utils"

// Mock data
const mockCourses = [
  { id: "course1", title: "دورة البرمجة الأساسية", averageRating: 4.5, totalReviews: 12 },
  { id: "course2", title: "دورة تطوير التطبيقات", averageRating: 4.8, totalReviews: 8 },
  { id: "course3", title: "دورة إدارة المشاريع", averageRating: 4.2, totalReviews: 6 }
]

const mockReviews: Review[] = [
  {
    id: "1",
    courseId: "course1",
    studentId: "student1",
    rating: 5,
    comment: "دورة ممتازة! المدربة توضح المفاهيم بشكل واضح جداً والأمثلة عملية ومفيدة",
    createdAt: new Date("2024-01-10")
  },
  {
    id: "2",
    courseId: "course1",
    studentId: "student2",
    rating: 4,
    comment: "محتوى الدورة جيد لكن أتمنى لو كان هناك المزيد من التمارين العملية",
    createdAt: new Date("2024-01-08")
  },
  {
    id: "3",
    courseId: "course2",
    studentId: "student3",
    rating: 5,
    comment: "أفضل دورة تطوير تطبيقات درستها! شرح مفصل ومشاريع عملية رائعة",
    createdAt: new Date("2024-01-05")
  },
  {
    id: "4",
    courseId: "course2",
    studentId: "student4",
    rating: 4,
    comment: "الدورة مفيدة جداً، لكن بعض المواضيع تحتاج إلى شرح أكثر تفصيلاً",
    createdAt: new Date("2024-01-03")
  },
  {
    id: "5",
    courseId: "course3",
    studentId: "student5",
    rating: 4,
    comment: "دورة جيدة في إدارة المشاريع، تعلمت أدوات ومنهجيات مفيدة",
    createdAt: new Date("2024-01-01")
  }
]

export default function TrainerReviews() {
  const [selectedCourse, setSelectedCourse] = useState<string>("all")
  const [selectedRating, setSelectedRating] = useState<string>("all")

  const filteredReviews = mockReviews.filter(review => {
    const matchesCourse = selectedCourse === "all" || review.courseId === selectedCourse
    const matchesRating = selectedRating === "all" || review.rating.toString() === selectedRating
    return matchesCourse && matchesRating
  })

  const getCourseTitle = (courseId: string) => {
    return mockCourses.find(c => c.id === courseId)?.title || "دورة غير محددة"
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
              }`}
          />
        ))}
        <span className="text-sm text-gray-600 mr-2">({rating})</span>
      </div>
    )
  }

  const getRatingDistribution = () => {
    const distribution = [0, 0, 0, 0, 0] // 1-5 stars
    mockReviews.forEach(review => {
      distribution[review.rating - 1]++
    })
    return distribution.reverse() // 5-1 for display
  }

  const ratingDistribution = getRatingDistribution()
  const totalReviews = mockReviews.length
  const averageRating = mockReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">التقييمات والتغذية الراجعة</h1>
        <p className="text-gray-600 mt-2">عرض وتحليل تقييمات دوراتك</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط التقييم</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageRating.toFixed(1)}</div>
            <div className="flex items-center mt-1">
              {renderStars(Math.round(averageRating))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي التقييمات</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReviews}</div>
            <p className="text-xs text-muted-foreground">تقييم من الطلاب</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">عدد الدورات</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockCourses.length}</div>
            <p className="text-xs text-muted-foreground">دورة نشطة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">نموذج الشهر</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+12%</div>
            <p className="text-xs text-muted-foreground">مقارنة بالشهر الماضي</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              توزيع التقييمات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((rating, index) => (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-12">
                    <span className="text-sm">{rating}</span>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full"
                      style={{ width: `${(ratingDistribution[index] / totalReviews) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-8">{ratingDistribution[index]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Course Performance */}
        <Card>
          <CardHeader>
            <CardTitle>أداء الدورات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockCourses.map((course) => (
                <div key={course.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{course.title}</span>
                    <Badge variant="outline">{course.totalReviews} تقييم</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderStars(Math.round(course.averageRating))}
                    <span className="text-sm text-gray-600">
                      ({course.averageRating.toFixed(1)})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>تصفية التقييمات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">الدورة</label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع الدورات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الدورات</SelectItem>
                  {mockCourses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">التقييم</label>
              <Select value={selectedRating} onValueChange={setSelectedRating}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع التقييمات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع التقييمات</SelectItem>
                  <SelectItem value="5">5 نجوم</SelectItem>
                  <SelectItem value="4">4 نجوم</SelectItem>
                  <SelectItem value="3">3 نجوم</SelectItem>
                  <SelectItem value="2">2 نجوم</SelectItem>
                  <SelectItem value="1">نجمة واحدة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reviews Table */}
      <Card>
        <CardHeader>
          <CardTitle>التقييمات التفصيلية</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الطالب</TableHead>
                <TableHead>الدورة</TableHead>
                <TableHead>التقييم</TableHead>
                <TableHead>التعليق</TableHead>
                <TableHead>التاريخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell className="font-medium">
                    الطالب {review.studentId.replace('student', '')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getCourseTitle(review.courseId)}
                    </Badge>
                  </TableCell>
                  <TableCell>{renderStars(review.rating)}</TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate" title={review.comment}>
                      {review.comment}
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatDate(review.createdAt)}
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