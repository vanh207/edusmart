'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { gradesAPI, adminAPI } from '@/lib/api'
import { Award, TrendingUp, BookOpen, Calendar, ArrowLeft, Sparkles, BarChart3, Users } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Grade {
    id: number
    subject: string
    semester: number
    year: string
    grade_type: string
    score: number
    note?: string
    created_at: string
}

const SUBJECTS = {
    toan: 'Toán học',
    van: 'Ngữ văn',
    anh: 'Tiếng Anh',
    ly: 'Vật lý',
    hoa: 'Hóa học',
    sinh: 'Sinh học',
    su: 'Lịch sử',
    dia: 'Địa lý',
    gdcd: 'GDCD',
}

const GRADE_TYPES = {
    oral: 'Điểm miệng',
    quiz_15: 'Điểm 15p',
    test_45: 'Điểm 1 tiết',
    midterm: 'Giữa kỳ',
    final: 'Cuối kỳ',
}

const SUBJECT_COLORS = {
    toan: 'from-blue-500 to-cyan-500',
    van: 'from-pink-500 to-rose-500',
    anh: 'from-purple-500 to-indigo-500',
    ly: 'from-orange-500 to-amber-500',
    hoa: 'from-green-500 to-emerald-500',
    sinh: 'from-teal-500 to-cyan-500',
    su: 'from-red-500 to-pink-500',
    dia: 'from-yellow-500 to-orange-500',
    gdcd: 'from-indigo-500 to-purple-500',
}

export default function StudentGradesPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [grades, setGrades] = useState<Grade[]>([])
    const [semester, setSemester] = useState<number>(1)
    const [yearLevel, setYearLevel] = useState<string>('2025-2026')
    const [selectedSubject, setSelectedSubject] = useState<string>('all')

    const [userRole, setUserRole] = useState('')
    const [students, setStudents] = useState<any[]>([])
    const [targetStudentId, setTargetStudentId] = useState<number | null>(null)

    useEffect(() => {
        const user = sessionStorage.getItem('user')
        if (!user) {
            router.push('/login/student')
            return
        }
        const userData = JSON.parse(user)
        setUserRole(userData.role)

        if (userData.role !== 'student' && userData.role !== 'teacher' && userData.role !== 'admin') {
            router.push('/dashboard')
        }

        if (userData.role === 'admin' || userData.role === 'teacher') {
            loadStudents()
        }
    }, [router])

    const loadStudents = async () => {
        try {
            const response = await adminAPI.getUsers('student')
            setStudents(response.data)
        } catch (error) {
            console.error('Error loading students:', error)
        }
    }

    useEffect(() => {
        loadGrades()
    }, [semester, yearLevel, selectedSubject, targetStudentId])

    const loadGrades = async () => {
        setLoading(true)
        try {
            const params: any = { semester, year: yearLevel }
            if (selectedSubject !== 'all') {
                params.subject = selectedSubject
            }
            if (targetStudentId) {
                params.student_id = targetStudentId
            }
            const response = await gradesAPI.getMyGrades(params)
            setGrades(response.data)
        } catch (error) {
            console.error('Error loading grades:', error)
        } finally {
            setLoading(false)
        }
    }

    const calculateSubjectAverage = (subject: string) => {
        const subjectGrades = grades.filter(g => g.subject === subject)
        if (subjectGrades.length === 0) return null

        const oral = subjectGrades.filter(g => g.grade_type === 'oral').map(g => g.score)
        const quiz15 = subjectGrades.filter(g => g.grade_type === 'quiz_15').map(g => g.score)
        const test45 = subjectGrades.filter(g => g.grade_type === 'test_45').map(g => g.score)
        const midterm = subjectGrades.find(g => g.grade_type === 'midterm')?.score
        const final = subjectGrades.find(g => g.grade_type === 'final')?.score

        const avgOral = oral.length > 0 ? oral.reduce((a, b) => a + b, 0) / oral.length : 0
        const avgQuiz = quiz15.length > 0 ? quiz15.reduce((a, b) => a + b, 0) / quiz15.length : 0
        const avgTest = test45.length > 0 ? test45.reduce((a, b) => a + b, 0) / test45.length : 0

        const total = avgOral + (avgQuiz * 2) + (avgTest * 3) + ((midterm || 0) * 2) + ((final || 0) * 3)
        const average = total / 11

        return average.toFixed(2)
    }

    const calculateOverallAverage = () => {
        const subjects = Object.keys(groupedGrades)
        if (subjects.length === 0) return '0.00'
        const averages = subjects.map(s => parseFloat(calculateSubjectAverage(s) || '0'))
        const total = averages.reduce((a, b) => a + b, 0)
        return (total / averages.length).toFixed(2)
    }

    const groupedGrades = grades.reduce((acc, grade) => {
        if (!acc[grade.subject]) {
            acc[grade.subject] = []
        }
        acc[grade.subject].push(grade)
        return acc
    }, {} as Record<string, Grade[]>)

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header with Back Button */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="mb-6 flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-white/50 rounded-xl transition-all group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-semibold">Quay lại Dashboard</span>
                    </button>

                    <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                                    <BarChart3 className="w-8 h-8" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 text-white/80 text-sm font-medium mb-1">
                                        <Sparkles className="w-4 h-4" />
                                        Kết quả học tập
                                    </div>
                                    <h1 className="text-4xl md:text-5xl font-black tracking-tight">Bảng Điểm</h1>
                                </div>
                            </div>
                            <p className="text-white/90 text-lg font-medium max-w-2xl">
                                Theo dõi tiến trình học tập và kết quả của bạn qua từng môn học
                            </p>

                            {Object.keys(groupedGrades).length > 0 && (
                                <div className="mt-6 inline-flex items-center gap-3 bg-white/20 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/30">
                                    <Award className="w-6 h-6" />
                                    <div>
                                        <p className="text-xs text-white/80 font-medium">Điểm trung bình</p>
                                        <p className="text-2xl font-black">{calculateOverallAverage()}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Filters */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl shadow-lg p-6 mb-8"
                >
                    <div className={`grid grid-cols-1 ${userRole === 'admin' || userRole === 'teacher' ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
                        {(userRole === 'admin' || userRole === 'teacher') && (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-purple-600" />
                                    Học sinh
                                </label>
                                <select
                                    value={targetStudentId || ''}
                                    onChange={(e) => setTargetStudentId(e.target.value ? parseInt(e.target.value) : null)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-semibold"
                                >
                                    <option value="">-- Chọn học sinh --</option>
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>{s.full_name} (@{s.username})</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-purple-600" />
                                Học kỳ
                            </label>
                            <select
                                value={semester}
                                onChange={(e) => setSemester(parseInt(e.target.value))}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-semibold"
                            >
                                <option value={1}>Học kỳ 1</option>
                                <option value={2}>Học kỳ 2</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Year</label>
                            <input
                                type="text"
                                value={yearLevel}
                                onChange={(e) => setYearLevel(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-semibold"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-purple-600" />
                                Môn học
                            </label>
                            <select
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-semibold"
                            >
                                <option value="all">Tất cả môn</option>
                                {Object.entries(SUBJECTS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </motion.div>

                {/* Grades Content */}
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="bg-white rounded-2xl shadow-lg p-12 text-center"
                        >
                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
                            <p className="text-gray-600 font-semibold">Đang tải điểm...</p>
                        </motion.div>
                    ) : Object.keys(groupedGrades).length === 0 ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white rounded-[2rem] p-12 text-center shadow-xl border-2 border-dashed border-gray-200"
                        >
                            <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <BookOpen className="w-10 h-10 text-gray-300" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-2">Chưa có dữ liệu điểm số</h3>
                            <p className="text-gray-500 font-medium max-w-sm mx-auto mb-8">
                                Không tìm thấy điểm số nào cho {targetStudentId ? 'học sinh này' : 'bạn'} trong Học kỳ {semester}, năm học {yearLevel}.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <button
                                    onClick={loadGrades}
                                    className="px-8 py-4 bg-purple-600 text-white rounded-2xl font-black shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all active:scale-95"
                                >
                                    Tải lại dữ liệu
                                </button>
                                <button
                                    onClick={() => {
                                        setSemester(semester === 1 ? 2 : 1)
                                    }}
                                    className="px-8 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                                >
                                    Thử Học kỳ {semester === 1 ? '2' : '1'}
                                </button>
                            </div>

                            <div className="mt-10 p-4 bg-blue-50 rounded-2xl text-blue-700 text-sm font-bold flex items-center justify-center gap-2">
                                <Sparkles className="w-4 h-4" />
                                Mẹo: Kiểm tra xem giáo viên đã nhập đúng Học kỳ và Year chưa!
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="content"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-6"
                        >
                            {Object.entries(groupedGrades).map(([subject, subjectGrades], index) => {
                                const average = calculateSubjectAverage(subject)
                                const colorClass = SUBJECT_COLORS[subject as keyof typeof SUBJECT_COLORS] || 'from-gray-500 to-gray-600'

                                return (
                                    <motion.div
                                        key={subject}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                                    >
                                        <div className={`bg-gradient-to-r ${colorClass} px-6 py-5 flex justify-between items-center`}>
                                            <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                                                    <BookOpen className="w-6 h-6" />
                                                </div>
                                                {SUBJECTS[subject as keyof typeof SUBJECTS]}
                                            </h2>
                                            {average && (
                                                <div className="flex items-center gap-3 bg-white/20 backdrop-blur-md px-5 py-3 rounded-xl border border-white/30">
                                                    <TrendingUp className="w-5 h-5 text-white" />
                                                    <div>
                                                        <p className="text-xs text-white/80 font-medium">Trung bình</p>
                                                        <p className="text-2xl font-black text-white">{average}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b-2 border-gray-200">
                                                        <th className="px-6 py-4 text-left text-sm font-black text-gray-700">Loại điểm</th>
                                                        <th className="px-6 py-4 text-left text-sm font-black text-gray-700">Điểm</th>
                                                        <th className="px-6 py-4 text-left text-sm font-black text-gray-700">Ghi chú</th>
                                                        <th className="px-6 py-4 text-left text-sm font-black text-gray-700">Ngày nhập</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {subjectGrades.map((grade, idx) => (
                                                        <motion.tr
                                                            key={grade.id}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: idx * 0.05 }}
                                                            className="border-b border-gray-100 hover:bg-purple-50/50 transition-colors"
                                                        >
                                                            <td className="px-6 py-4 text-sm font-semibold text-gray-700">
                                                                {GRADE_TYPES[grade.grade_type as keyof typeof GRADE_TYPES]}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl text-2xl font-black ${grade.score >= 8 ? 'bg-green-100 text-green-700' :
                                                                    grade.score >= 6.5 ? 'bg-blue-100 text-blue-700' :
                                                                        grade.score >= 5 ? 'bg-yellow-100 text-yellow-700' :
                                                                            'bg-red-100 text-red-700'
                                                                    }`}>
                                                                    {grade.score}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                                                                {grade.note || '-'}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                                                                {new Date(grade.created_at).toLocaleDateString('vi-VN')}
                                                            </td>
                                                        </motion.tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
