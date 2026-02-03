'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Target, ArrowLeft, ChevronRight, GraduationCap, Clock, Award, CheckCircle2, Search, BookOpen } from 'lucide-react'
import { exercisesAPI, lessonsAPI, userAPI, API_URL } from '@/lib/api'
import ChatbotWidget from '@/components/ChatbotWidget'
import FilterBar from '@/components/FilterBar'
import ThemeToggle from '@/components/ThemeToggle'
import StudentStatusHeader from '@/components/StudentStatusHeader'
import NotificationBell from '@/components/NotificationBell'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Flame } from 'lucide-react'

export default function Practice() {
    const router = useRouter()
    const [exercises, setExercises] = useState<any[]>([])
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState({
        grade_level: '',
        subject: '',
        search: ''
    })

    useEffect(() => {
        const token = sessionStorage.getItem('token')
        if (!token) {
            router.push('/login/student')
            return
        }

        const fetchData = async () => {
            try {
                setLoading(true)
                const [exercisesRes, profileRes] = await Promise.all([
                    exercisesAPI.getAll(filters),
                    userAPI.getProfile()
                ])
                setExercises(exercisesRes.data)
                setUser(profileRes.data)
            } catch (error) {
                console.error('Error loading data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [filters, router])

    return (
        <div className="min-h-screen bg-[#f8fafc] text-foreground transition-colors duration-300">
            {/* Nav */}
            <nav className="bg-card border-b border-border sticky top-0 z-30">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="p-2 hover:bg-muted rounded-xl transition-colors">
                            <ArrowLeft className="w-6 h-6 text-muted-foreground" />
                        </Link>
                        <div className="flex flex-col">
                            <h1 className="text-xl font-black text-foreground tracking-tight leading-none mb-1">Trung Tâm Luyện Tập 🎯</h1>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none">Luyện tập để nắm vững kiến thức</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <ThemeToggle />

                        <div className="hidden md:flex bg-card px-4 py-1.5 rounded-xl border border-border items-center gap-3 shadow-sm">
                            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-xs">
                                {user?.points || 0}
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Points</span>
                        </div>

                        <div className="hidden md:flex bg-card px-4 py-1.5 rounded-xl border border-border items-center gap-3 shadow-sm">
                            <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold">
                                <Flame className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-orange-600 uppercase tracking-tight leading-none">STREAK</span>
                                <span className="text-[10px] font-bold text-muted-foreground leading-none mt-0.5">{user?.study_streak || 0} ngày</span>
                            </div>
                        </div>

                        <StudentStatusHeader />

                        <NotificationBell />

                        <Link href="/profile" className="flex items-center gap-3 group">
                            <div className="w-10 h-10 rounded-xl bg-slate-200 border-2 border-white shadow-md overflow-hidden relative transition-transform group-hover:scale-105">
                                <img
                                    src={user?.avatar_url ? `${API_URL}${user.avatar_url}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
                                    alt="avatar"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="container mx-auto px-4 py-8">
                <FilterBar onFilterChange={(newFilters) => setFilters(prev => ({ ...prev, ...newFilters }))} />

                {loading ? (
                    <LoadingSpinner size="lg" text="Đang tìm kiếm bài tập phù hợp..." />
                ) : exercises.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] p-16 text-center shadow-sm border border-slate-100">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Target className="w-10 h-10 text-slate-200" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800">Chưa có bài tập cho lựa chọn này</h3>
                        <p className="text-slate-400 mt-2 font-medium">Bạn hãy thử chọn khối lớp hoặc môn học khác nhé.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {exercises.map((exercise, idx) => {
                            const score = exercise.latest_score

                            return (
                                <motion.div
                                    key={exercise.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.05 }}
                                    whileHover={{ y: -5 }}
                                    className="group"
                                >
                                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 overflow-hidden flex flex-col h-full relative">
                                        {score !== undefined && score !== null && (
                                            <div className="absolute top-6 right-6 z-10">
                                                <div className="bg-emerald-500 text-white px-4 py-2 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center gap-2">
                                                    <Award className="w-4 h-4" />
                                                    <span className="text-sm font-black">{score} ĐIỂM</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="p-8 pb-5 flex-1">
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                                                        <Target className="w-5 h-5" />
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">Vận dụng kiến thức</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${exercise.subject === 'anh' ? 'bg-orange-100 text-orange-600' :
                                                        exercise.subject === 'toan' ? 'bg-blue-100 text-blue-600' :
                                                            'bg-indigo-100 text-indigo-600'
                                                        }`}>
                                                        {exercise.subject === 'anh' ? 'Tiếng Anh' :
                                                            exercise.subject === 'toan' ? 'Toán học' :
                                                                exercise.subject === 'van' ? 'Ngữ văn' :
                                                                    exercise.subject === 'vat_ly' ? 'Vật lý' :
                                                                        exercise.subject === 'hoa_hoc' ? 'Hóa học' :
                                                                            exercise.subject === 'sinh_hoc' ? 'Sinh học' :
                                                                                exercise.subject === 'su' ? 'Lịch sử' :
                                                                                    exercise.subject === 'dia' ? 'Địa lý' : exercise.subject}
                                                    </span>
                                                    <span className="px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                                        {(exercise.grade_level || 'Chưa rõ')?.replace('_', ' ')}
                                                    </span>
                                                </div>
                                            </div>

                                            <h3 className="text-xl font-black text-slate-900 mb-2 group-hover:text-purple-600 transition-colors pr-20">
                                                {exercise.title || 'Bài luyện tập không tên'}
                                            </h3>
                                            {exercise.lesson_title && (
                                                <p className="text-purple-600 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-1">
                                                    <BookOpen className="w-3 h-3" /> Bài học: {exercise.lesson_title}
                                                </p>
                                            )}
                                            <p className="text-slate-500 text-sm font-medium mb-6 line-clamp-2">
                                                {exercise.description || 'Củng cố kiến thức đã học qua bộ câu hỏi trắc nghiệm và tự luận từ giáo viên.'}
                                            </p>

                                            <div className="flex gap-3 mb-8">
                                                <div className="flex-1 p-3 bg-purple-50/50 rounded-2xl border border-purple-100/50 text-center">
                                                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">Thời gian</p>
                                                    <p className="text-sm font-black text-purple-700">{exercise.duration || 15} Phút</p>
                                                </div>
                                                <div className="flex-1 p-3 bg-amber-50/50 rounded-2xl border border-amber-100/50 text-center">
                                                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Câu hỏi</p>
                                                    <p className="text-sm font-black text-amber-700">{exercise.total_questions || 0} Câu</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-slate-50/50 border-t border-slate-50 flex gap-4">
                                            <Link
                                                href={`/practice/${exercise.id}`}
                                                className={`flex-1 py-3 text-white text-center rounded-xl font-black text-sm shadow-lg transition-all active:scale-95 ${score !== undefined && score !== null ? 'bg-emerald-600 shadow-emerald-500/20 hover:bg-emerald-700' : 'bg-purple-600 shadow-purple-500/20 hover:bg-purple-700'}`}
                                            >
                                                {score !== undefined && score !== null ? 'LUYỆN TẬP LẠI' : 'BẮT ĐẦU NGAY'}
                                            </Link>
                                            {exercise.lesson_id && (
                                                <Link
                                                    href={`/lessons/${exercise.lesson_id}`}
                                                    className="p-3 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-slate-600 transition-all"
                                                    title="Xem bài giảng liên kết"
                                                >
                                                    <BookOpen className="w-5 h-5" />
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                )
                }
            </div>
            <ChatbotWidget />
        </div>
    )
}
