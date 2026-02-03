'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { gradesAPI, adminAPI } from '@/lib/api'
import { BookOpen, Plus, Edit2, Trash2, Save, X, ArrowLeft, Users, BarChart3, Sparkles, GraduationCap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/context/ToastContext'

interface Student {
    id: number
    username: string
    full_name: string
    email: string
    grade_level: string
}

interface Grade {
    id: number
    student_id: number
    student_name: string
    subject: string
    semester: number
    year: string
    grade_type: string
    score: number
    note?: string
}

interface Class {
    id: number
    name: string
    grade_level: string
    teacher_id: number
    student_count: number
}

const SUBJECTS = [
    { value: 'toan', label: 'Toán học' },
    { value: 'van', label: 'Ngữ văn' },
    { value: 'anh', label: 'Tiếng Anh' },
    { value: 'ly', label: 'Vật lý' },
    { value: 'hoa', label: 'Hóa học' },
    { value: 'sinh', label: 'Sinh học' },
    { value: 'su', label: 'Lịch sử' },
    { value: 'dia', label: 'Địa lý' },
    { value: 'gdcd', label: 'GDCD' },
]

const GRADE_TYPES = [
    { value: 'oral', label: 'Điểm miệng' },
    { value: 'quiz_15', label: 'Điểm 15 phút' },
    { value: 'test_45', label: 'Điểm 1 tiết' },
    { value: 'midterm', label: 'Điểm giữa kỳ' },
    { value: 'final', label: 'Điểm cuối kỳ' },
]

export default function TeacherGradesPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [classes, setClasses] = useState<Class[]>([])
    const [students, setStudents] = useState<Student[]>([])
    const [grades, setGrades] = useState<Grade[]>([])
    const [selectedClass, setSelectedClass] = useState<Class | null>(null)
    const [subject, setSubject] = useState<string>('anh')
    const [semester, setSemester] = useState<number>(1)
    const [year, setYear] = useState<string>('2025-2026')
    const [editingGrade, setEditingGrade] = useState<number | null>(null)
    const [newGrade, setNewGrade] = useState({
        student_id: 0,
        grade_type: 'oral' as const,
        score: 0,
        semester: 1,
        year: '2025-2026',
        note: ''
    })

    useEffect(() => {
        const user = sessionStorage.getItem('user')
        if (!user) {
            router.push('/login/teacher')
            return
        }
        const userData = JSON.parse(user)
        if (userData.role !== 'teacher' && userData.role !== 'admin') {
            router.push('/dashboard')
            return
        }
        loadClasses()
    }, [router])

    const loadClasses = async () => {
        try {
            const response = await adminAPI.getClasses()
            setClasses(response.data)
        } catch (error) {
            console.error('Error loading classes:', error)
            toast('Không thể tải danh sách lớp', 'error')
        }
    }

    const loadStudents = async (classId: number) => {
        setLoading(true)
        console.log('🔍 Loading students for class:', classId)
        try {
            const response = await gradesAPI.getClassStudents(classId)
            console.log('✅ Students API response:', response.data)
            console.log('✅ Students array:', response.data.students)
            setStudents(response.data.students)
            console.log('✅ Students state updated, count:', response.data.students?.length)
        } catch (error) {
            console.error('❌ Error loading students:', error)
            toast('Không thể tải danh sách học sinh', 'error')
        } finally {
            setLoading(false)
        }
    }

    const loadGrades = async (classId: number) => {
        setLoading(true)
        try {
            const response = await gradesAPI.getClassGrades(classId, {
                subject,
                semester,
                year: year
            })
            setGrades(response.data)
        } catch (error) {
            console.error('Error loading grades:', error)
            toast('Không thể tải điểm số', 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (selectedClass) {
            loadStudents(selectedClass.id)
            loadGrades(selectedClass.id)
            // Update newGrade defaults when filters change
            setNewGrade(prev => ({
                ...prev,
                semester,
                year: year
            }))
        }
    }, [selectedClass, subject, semester, year])

    const handleCreateGrade = async () => {
        if (newGrade.student_id === 0 || newGrade.score < 0 || newGrade.score > 10) {
            toast('Vui lòng chọn học sinh và nhập điểm hợp lệ (0-10)', 'warning')
            return
        }

        if (!selectedClass) return

        try {
            await gradesAPI.createGrade({
                student_id: newGrade.student_id,
                class_id: selectedClass.id,
                subject,
                semester: newGrade.semester,
                year: newGrade.year,
                grade_type: newGrade.grade_type,
                score: newGrade.score,
                note: newGrade.note
            })
            toast('Đã nhập điểm thành công!', 'success')
            setNewGrade({
                student_id: 0,
                grade_type: 'oral',
                score: 0,
                semester: semester,
                year: year,
                note: ''
            })
            loadGrades(selectedClass.id)
        } catch (error: any) {
            console.error('Error creating grade:', error)
            toast(error.response?.data?.error || 'Không thể nhập điểm', 'error')
        }
    }

    const handleUpdateGrade = async (gradeId: number, score: number, note: string, semester: number, year: string) => {
        try {
            await gradesAPI.updateGrade(gradeId, {
                score,
                note,
                semester,
                year: year
            })
            toast('Đã cập nhật điểm!', 'success')
            setEditingGrade(null)
            if (selectedClass) loadGrades(selectedClass.id)
        } catch (error: any) {
            console.error('Error updating grade:', error)
            toast(error.response?.data?.error || 'Không thể cập nhật điểm', 'error')
        }
    }

    const handleDeleteGrade = async (gradeId: number) => {
        if (!confirm('Bạn có chắc muốn xóa điểm này?')) return

        try {
            await gradesAPI.deleteGrade(gradeId)
            toast('Đã xóa điểm!', 'success')
            if (selectedClass) loadGrades(selectedClass.id)
        } catch (error: any) {
            console.error('Error deleting grade:', error)
            toast(error.response?.data?.error || 'Không thể xóa điểm', 'error')
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header with Back Button */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <button
                        onClick={() => router.push('/admin/dashboard')}
                        className="mb-6 flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-white/50 rounded-xl transition-all group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-semibold">Quay lại Dashboard</span>
                    </button>

                    <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                                    <GraduationCap className="w-8 h-8" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 text-white/80 text-sm font-medium mb-1">
                                        <Sparkles className="w-4 h-4" />
                                        Quản lý học tập
                                    </div>
                                    <h1 className="text-4xl md:text-5xl font-black tracking-tight">Quản Lý Bảng Điểm</h1>
                                </div>
                            </div>
                            <p className="text-white/90 text-lg font-medium max-w-2xl">
                                Nhập và quản lý điểm số cho học sinh trong lớp của bạn
                            </p>

                            {selectedClass && (
                                <div className="mt-6 flex gap-4 flex-wrap">
                                    <div className="inline-flex items-center gap-3 bg-white/20 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/30">
                                        <BookOpen className="w-6 h-6" />
                                        <div>
                                            <p className="text-xs text-white/80 font-medium">Lớp đang quản lý</p>
                                            <p className="text-2xl font-black">{selectedClass.name}</p>
                                        </div>
                                    </div>
                                    <div className="inline-flex items-center gap-3 bg-white/20 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/30">
                                        <Users className="w-6 h-6" />
                                        <div>
                                            <p className="text-xs text-white/80 font-medium">Số học sinh</p>
                                            <p className="text-2xl font-black">{students.length}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Class Selection */}
                {!selectedClass ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <BookOpen className="w-6 h-6 text-blue-600" />
                                Chọn lớp học
                            </h2>
                            <p className="text-gray-600 mb-6">Vui lòng chọn một lớp để bắt đầu quản lý điểm số</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {classes.map((cls) => (
                                <motion.div
                                    key={cls.id}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setSelectedClass(cls)}
                                    className="bg-white rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all border-2 border-transparent hover:border-blue-500"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl">
                                            {cls.name.charAt(0)}
                                        </div>
                                        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold">
                                            {cls.grade_level?.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-black text-gray-900 mb-2">{cls.name}</h3>
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Users className="w-4 h-4" />
                                        <span className="text-sm font-semibold">{cls.student_count || 0} học sinh</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {classes.length === 0 && (
                            <div className="bg-white rounded-2xl shadow-lg p-16 text-center">
                                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <BookOpen className="w-12 h-12 text-blue-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">Chưa có lớp học</h3>
                                <p className="text-gray-600">Vui lòng liên hệ quản trị viên để được phân công lớp.</p>
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <>
                        {/* Filters */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-2xl shadow-lg p-6 mb-8"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-blue-600" />
                                    Bộ lọc
                                </h2>
                                <button
                                    onClick={() => setSelectedClass(null)}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all flex items-center gap-2 font-semibold"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Đổi lớp
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Môn học</label>
                                    <select
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-semibold"
                                    >
                                        {SUBJECTS.map(s => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Học kỳ</label>
                                    <select
                                        value={semester}
                                        onChange={(e) => setSemester(parseInt(e.target.value))}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-semibold"
                                    >
                                        <option value={1}>Học kỳ 1</option>
                                        <option value={2}>Học kỳ 2</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Year</label>
                                    <input
                                        type="text"
                                        value={year}
                                        onChange={(e) => setYear(e.target.value)}
                                        placeholder="2025-2026"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-semibold"
                                    />
                                </div>
                            </div>
                        </motion.div>

                        {/* Add New Grade */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 mb-8 shadow-lg"
                        >
                            <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                                <div className="p-2 bg-blue-600 text-white rounded-xl">
                                    <Plus className="w-5 h-5" />
                                </div>
                                Nhập Điểm Mới
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 ml-1">Học sinh</label>
                                    <select
                                        value={newGrade.student_id}
                                        onChange={(e) => setNewGrade({ ...newGrade, student_id: parseInt(e.target.value) })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-semibold"
                                    >
                                        <option value={0}>Chọn học sinh</option>
                                        {students.map(student => (
                                            <option key={student.id} value={student.id}>{student.full_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 ml-1">Loại điểm</label>
                                    <select
                                        value={newGrade.grade_type}
                                        onChange={(e) => setNewGrade({ ...newGrade, grade_type: e.target.value as any })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-semibold"
                                    >
                                        {GRADE_TYPES.map(gt => (
                                            <option key={gt.value} value={gt.value}>{gt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 ml-1">Điểm</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        step="0.1"
                                        value={newGrade.score}
                                        onChange={(e) => setNewGrade({ ...newGrade, score: parseFloat(e.target.value) })}
                                        placeholder="0-10"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-semibold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 ml-1">Học kỳ</label>
                                    <select
                                        value={newGrade.semester}
                                        onChange={(e) => setNewGrade({ ...newGrade, semester: parseInt(e.target.value) })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-semibold"
                                    >
                                        <option value={1}>Học kỳ 1</option>
                                        <option value={2}>Học kỳ 2</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 ml-1">Year</label>
                                    <input
                                        type="text"
                                        value={newGrade.year}
                                        onChange={(e) => setNewGrade({ ...newGrade, year: e.target.value })}
                                        placeholder="2025-2026"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-semibold"
                                    />
                                </div>
                                <div className="space-y-1 lg:col-span-1">
                                    <label className="text-xs font-bold text-gray-500 ml-1">Ghi chú</label>
                                    <input
                                        type="text"
                                        value={newGrade.note}
                                        onChange={(e) => setNewGrade({ ...newGrade, note: e.target.value })}
                                        placeholder="..."
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-semibold"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button
                                        onClick={handleCreateGrade}
                                        className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center gap-2 font-bold h-[52px]"
                                    >
                                        <Plus className="w-5 h-5" />
                                        Thêm
                                    </button>
                                </div>
                            </div>
                        </motion.div>

                        {/* Grades Table */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white rounded-2xl shadow-lg overflow-hidden"
                        >
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
                                            <th className="px-6 py-4 text-left text-sm font-black text-gray-700">Học sinh</th>
                                            <th className="px-6 py-4 text-left text-sm font-black text-gray-700">Học kỳ</th>
                                            <th className="px-6 py-4 text-left text-sm font-black text-gray-700">Year</th>
                                            <th className="px-6 py-4 text-left text-sm font-black text-gray-700">Loại điểm</th>
                                            <th className="px-6 py-4 text-left text-sm font-black text-gray-700">Điểm</th>
                                            <th className="px-6 py-4 text-left text-sm font-black text-gray-700">Ghi chú</th>
                                            <th className="px-6 py-4 text-left text-sm font-black text-gray-700">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <AnimatePresence>
                                            {grades.map((grade, index) => (
                                                <motion.tr
                                                    key={grade.id}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 20 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors"
                                                >
                                                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{grade.student_name}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                                                        {editingGrade === grade.id ? (
                                                            <select
                                                                defaultValue={grade.semester}
                                                                id={`semester-${grade.id}`}
                                                                className="px-2 py-1 border border-blue-300 rounded"
                                                            >
                                                                <option value={1}>Kỳ 1</option>
                                                                <option value={2}>Kỳ 2</option>
                                                            </select>
                                                        ) : (
                                                            `Học kỳ ${grade.semester}`
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                                                        {editingGrade === grade.id ? (
                                                            <input
                                                                type="text"
                                                                defaultValue={grade.year}
                                                                id={`year-${grade.id}`}
                                                                className="w-24 px-2 py-1 border border-blue-300 rounded"
                                                            />
                                                        ) : (
                                                            grade.year
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                                                        {GRADE_TYPES.find(gt => gt.value === grade.grade_type)?.label}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {editingGrade === grade.id ? (
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="10"
                                                                step="0.1"
                                                                defaultValue={grade.score}
                                                                id={`score-${grade.id}`}
                                                                className="w-24 px-3 py-2 border-2 border-blue-300 rounded-lg font-semibold"
                                                            />
                                                        ) : (
                                                            <span className={`inline-flex items-center justify-center w-14 h-14 rounded-xl text-lg font-black ${grade.score >= 8 ? 'bg-green-100 text-green-700' :
                                                                grade.score >= 6.5 ? 'bg-blue-100 text-blue-700' :
                                                                    grade.score >= 5 ? 'bg-yellow-100 text-yellow-700' :
                                                                        'bg-red-100 text-red-700'
                                                                }`}>
                                                                {grade.score}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {editingGrade === grade.id ? (
                                                            <input
                                                                type="text"
                                                                defaultValue={grade.note || ''}
                                                                id={`note-${grade.id}`}
                                                                className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg font-medium"
                                                            />
                                                        ) : (
                                                            <span className="text-sm text-gray-600 font-medium">{grade.note || '-'}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {editingGrade === grade.id ? (
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        const scoreInput = document.getElementById(`score-${grade.id}`) as HTMLInputElement
                                                                        const noteInput = document.getElementById(`note-${grade.id}`) as HTMLInputElement
                                                                        const semesterInput = document.getElementById(`semester-${grade.id}`) as HTMLSelectElement
                                                                        const yearInput = document.getElementById(`year-${grade.id}`) as HTMLInputElement
                                                                        handleUpdateGrade(
                                                                            grade.id,
                                                                            parseFloat(scoreInput.value),
                                                                            noteInput.value,
                                                                            parseInt(semesterInput.value),
                                                                            yearInput.value
                                                                        )
                                                                    }}
                                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                                >
                                                                    <Save className="w-5 h-5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingGrade(null)}
                                                                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                                                >
                                                                    <X className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => setEditingGrade(grade.id)}
                                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                >
                                                                    <Edit2 className="w-5 h-5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteGrade(grade.id)}
                                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                >
                                                                    <Trash2 className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                                {grades.length === 0 && (
                                    <div className="text-center py-16">
                                        <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <BookOpen className="w-12 h-12 text-blue-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-2">Chưa có điểm</h3>
                                        <p className="text-gray-600">Hãy nhập điểm cho học sinh bằng form bên trên.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </div>
        </div>
    )
}
