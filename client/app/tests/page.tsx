'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ClipboardList, Clock, Award, ArrowRight, ArrowLeft, Zap, Sparkles, Target, GraduationCap } from 'lucide-react'
import { testsAPI, userAPI, API_URL } from '@/lib/api'
import StudentStatusHeader from '@/components/StudentStatusHeader'
import NotificationBell from '@/components/NotificationBell'
import ThemeToggle from '@/components/ThemeToggle'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Flame } from 'lucide-react'

export default function Tests() {
  const router = useRouter()
  const [tests, setTests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const token = sessionStorage.getItem('token')
    if (!token) {
      router.push('/login/student')
      return
    }

    const fetchData = async () => {
      try {
        const [profileRes, testsRes] = await Promise.all([
          userAPI.getProfile(),
          testsAPI.getAll()
        ])
        setUser(profileRes.data)
        setTests(testsRes.data)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  return (
    <div className="min-h-screen bg-[#f8fafc] text-foreground transition-colors duration-300">
      {/* Premium Nav */}
      <nav className="bg-card border-b border-border sticky top-0 z-30">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 hover:bg-muted rounded-xl transition-colors">
              <ArrowLeft className="w-6 h-6 text-muted-foreground" />
            </Link>
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-foreground tracking-tight leading-none mb-1">Bài Kiểm Tra 📝</h1>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none">Đánh giá năng lực của bạn</p>
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
        {/* Hero Section for Tests */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-[2.5rem] p-10 lg:p-16 mb-12 relative overflow-hidden text-white"
        >
          <div className="absolute top-0 right-0 w-1/3 h-full bg-blue-500/10 blur-3xl rounded-full"></div>
          <div className="relative z-10 lg:w-2/3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-blue-200 text-[10px] font-black uppercase tracking-widest mb-6">
              <Target className="w-3 h-3" /> Kiểm tra & Đánh giá
            </div>
            <h2 className="text-4xl lg:text-5xl font-black mb-6 leading-tight">
              Sẵn sàng <br />
              <span className="text-blue-400">bứt phá</span> giới hạn?
            </h2>
            <p className="text-slate-400 text-lg font-medium max-w-lg mb-0">
              Hệ thống bài kiểm tra thông minh giúp bạn nhận diện điểm mạnh và điểm cần cải thiện một cách chính xác.
            </p>
          </div>
          <ClipboardList className="absolute right-10 bottom-10 w-48 h-48 text-white/5 -rotate-12 hidden lg:block" />
        </motion.div>

        {loading ? (
          <LoadingSpinner size="lg" text="Đang chuẩn bị đề thi..." />
        ) : tests.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] p-16 text-center shadow-sm border border-slate-100">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <ClipboardList className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-xl font-black text-slate-800">Chưa có bài kiểm tra nào</h3>
            <p className="text-slate-400 mt-2 font-medium">Chúng tôi đang cập nhật các bộ đề mới, hãy ghé lại sau nhé!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tests.map((test, idx) => (
              <motion.div
                key={test.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -8 }}
                className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all group flex flex-col"
              >
                <div className="flex items-start justify-between mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <ClipboardList className="w-8 h-8" />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">{test.subject || 'Lắp ghép'}</span>
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">{test.grade_level?.replace('_', ' ')}</span>
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="text-2xl font-black text-slate-900 mb-3 group-hover:text-blue-600 transition-colors uppercase tracking-tight leading-tight">{test.title}</h3>
                  <p className="text-slate-500 font-medium leading-relaxed mb-6">{test.description}</p>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Clock className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Thời gian</span>
                      </div>
                      <span className="text-lg font-black text-slate-800">{test.duration} phút</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Award className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Tổng điểm</span>
                      </div>
                      <span className="text-lg font-black text-slate-800">{test.total_points} điểm</span>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/tests/${test.id}`}
                  className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white py-5 rounded-2xl font-black text-sm hover:bg-blue-600 shadow-xl shadow-slate-900/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all uppercase tracking-widest"
                >
                  BẮT ĐẦU LÀM BÀI <ArrowRight className="w-5 h-5" />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

