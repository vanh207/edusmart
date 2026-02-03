'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Book, Clock, Calendar, ChevronRight, GraduationCap, ArrowLeft } from 'lucide-react'
import { lessonsAPI, userAPI, API_URL } from '@/lib/api'
import ChatbotWidget from '@/components/ChatbotWidget'
import FilterBar from '@/components/FilterBar'
import ThemeToggle from '@/components/ThemeToggle'
import StudentStatusHeader from '@/components/StudentStatusHeader'
import NotificationBell from '@/components/NotificationBell'
import { Flame } from 'lucide-react'

export default function Lessons() {
  const router = useRouter()
  const [lessons, setLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
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
        const [profileRes, lessonsRes] = await Promise.all([
          userAPI.getProfile(),
          lessonsAPI.getAll(filters)
        ])
        setUser(profileRes.data)
        setLessons(lessonsRes.data)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [filters, router])

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <div className="bg-card border-b border-border sticky top-0 z-30">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-accent transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </div>
              <span className="font-bold hidden sm:inline">Trang chủ</span>
            </button>
            <div className="h-6 w-[1px] bg-border mx-2"></div>
            <h1 className="text-xl font-black tracking-tight hidden md:block">Bài học SGK</h1>
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
      </div>

      <FilterBar onFilterChange={setFilters} initialFilters={filters} />

      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-[2rem] h-64 animate-pulse border border-slate-100"></div>
            ))}
          </div>
        ) : lessons.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card rounded-[2.5rem] border border-dashed border-border p-16 text-center shadow-sm"
          >
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
              <Book className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Chưa tìm thấy bài học phù hợp</h2>
            <p className="text-slate-400 font-medium mb-8">Thử thay đổi bộ lọc hoặc tìm kiếm theo từ khóa khác nhé.</p>
            <button
              onClick={() => setFilters({ grade_level: '', subject: '', search: '' })}
              className="px-8 py-3 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
            >
              LÀM MỚI BỘ LỌC
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {lessons.map((lesson, idx) => (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ y: -8 }}
                className="group relative"
              >
                <Link href={`/lessons/${lesson.id}`}>
                  <div className="bg-card rounded-[2rem] border border-border shadow-md hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 overflow-hidden h-full flex flex-col p-6 group">
                    {/* Badge & Meta */}
                    <div className="flex items-center justify-between mb-6">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${lesson.subject === 'anh' ? 'bg-orange-100 text-orange-600 border border-orange-200 dark:bg-orange-950/30 dark:border-orange-900/50 dark:text-orange-400' :
                        lesson.subject === 'toan' ? 'bg-blue-100 text-blue-600 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/50 dark:text-blue-400' :
                          'bg-indigo-100 text-indigo-600 border border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-900/50 dark:text-indigo-400'
                        }`}>
                        {lesson.subject === 'anh' ? 'Tiếng Anh' :
                          lesson.subject === 'toan' ? 'Toán học' :
                            lesson.subject === 'van' ? 'Ngữ văn' :
                              lesson.subject === 'vat_ly' ? 'Vật lý' :
                                lesson.subject === 'hoa_hoc' ? 'Hóa học' :
                                  lesson.subject === 'sinh_hoc' ? 'Sinh học' :
                                    lesson.subject === 'su' ? 'Lịch sử' :
                                      lesson.subject === 'dia' ? 'Địa lý' : lesson.subject}
                      </span>
                      <div className="flex items-center gap-1.5 text-muted-foreground font-bold text-[10px] uppercase tracking-wider">
                        <GraduationCap className="w-3.5 h-3.5" /> {(lesson.grade_level || 'Chưa rõ')?.replace('_', ' ')}
                      </div>
                    </div>

                    <h3 className="text-xl font-black text-foreground mb-4 group-hover:text-blue-600 transition-colors leading-tight">
                      {lesson.title}
                    </h3>

                    <p className="text-muted-foreground text-sm font-medium leading-relaxed line-clamp-3 mb-8 flex-1">
                      {(lesson.content || 'Nội dung đang được cập nhật...').replace(/<[^>]*>?/gm, '').substring(0, 160)}...
                    </p>

                    <div className="flex items-center justify-between pt-6 border-t border-border">
                      <div className="flex items-center gap-4 text-muted-foreground text-xs font-bold">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> 15m
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> {lesson.created_at ? new Date(lesson.created_at).toLocaleDateString() : 'Vừa xong'}
                        </div>
                      </div>
                      <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-muted-foreground group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                        <ChevronRight className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <ChatbotWidget />
    </div>
  )
}
