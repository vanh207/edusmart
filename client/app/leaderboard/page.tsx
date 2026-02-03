'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Trophy,
  ArrowLeft,
  ChevronRight,
  Medal,
  Star,
  TrendingUp,
  Target,
  Award,
  GraduationCap
} from 'lucide-react'
import { leaderboardAPI, API_URL } from '@/lib/api'
import ChatbotWidget from '@/components/ChatbotWidget'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function Leaderboard() {
  const router = useRouter()
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    const token = sessionStorage.getItem('token')
    if (!token) {
      router.push('/login/student')
      return
    }

    const userData = sessionStorage.getItem('user')
    if (userData) {
      setCurrentUser(JSON.parse(userData))
    }

    loadLeaderboard()
  }, [router])

  const loadLeaderboard = async () => {
    try {
      const response = await leaderboardAPI.get()
      setLeaderboard(response.data)
    } catch (error) {
      console.error('Error loading leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRankStyle = (index: number) => {
    if (index === 0) return 'bg-amber-100 text-amber-600 border-amber-200'
    if (index === 1) return 'bg-slate-100 text-slate-500 border-slate-200'
    if (index === 2) return 'bg-orange-100 text-orange-600 border-orange-200'
    return 'bg-blue-50 text-blue-600 border-blue-100'
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4 flex items-center gap-6">
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Bảng Xếp Hạng Toàn Cầu 🌍</h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Những chiến binh học tập xuất sắc nhất</p>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <LoadingSpinner size="lg" text="Đang tải danh sách anh tài..." />
        ) : leaderboard.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] p-16 text-center shadow-sm border border-slate-100">
            <Trophy className="w-20 h-20 text-slate-200 mx-auto mb-6" />
            <h3 className="text-xl font-black text-slate-800">Chưa có bảng xếp hạng</h3>
            <p className="text-slate-400 mt-2 font-medium">Bắt đầu học ngay để ghi danh bảng vàng nhé!</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Top 3 Profile Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 0, 2].map((rankIdx) => {
                const student = leaderboard[rankIdx]
                if (!student) return null;
                return (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: rankIdx * 0.1 }}
                    className={`relative rounded-[2.5rem] p-8 border text-center shadow-lg transition-all hover:scale-105 ${rankIdx === 0 ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white border-amber-400 md:order-2 md:-mt-8 shadow-amber-500/20' :
                      rankIdx === 1 ? 'bg-white border-slate-100 text-slate-900 md:order-1' :
                        'bg-white border-slate-100 text-slate-900 md:order-3'
                      }`}
                  >
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md">
                      <span className="text-xl">{rankIdx === 0 ? '🥇' : rankIdx === 1 ? '🥈' : '🥉'}</span>
                    </div>

                    <div className={`w-24 h-24 rounded-[2rem] mx-auto mb-6 overflow-hidden border-4 ${rankIdx === 0 ? 'border-white/30' : 'border-slate-50'}`}>
                      <img
                        src={student.avatar_url ? `${API_URL}${student.avatar_url}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.username}`}
                        alt={student.username}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <h3 className="font-black text-xl mb-1 truncate">{student.full_name || student.username}</h3>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-6 ${rankIdx === 0 ? 'text-white/70' : 'text-slate-400'}`}>
                      Lớp {student.grade_level?.split('_')[1] || '--'}
                    </p>

                    <div className={`p-4 rounded-3xl ${rankIdx === 0 ? 'bg-white/10' : 'bg-slate-50'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Tổng điểm</p>
                      <p className="text-2xl font-black">{student.total_points || 0} XP</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Rest of the List */}
            <div className="bg-white rounded-[2.75rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
                  <Medal className="w-6 h-6 text-blue-600" />
                  Chi tiết bảng xếp hạng
                </h3>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <div className="w-3 h-3 rounded-full bg-emerald-400"></div> Online
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-50">
                {leaderboard.slice(3, 100).map((student, index) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`p-6 flex items-center gap-6 transition-all hover:bg-slate-50 relative ${currentUser?.id === student.id ? 'bg-blue-50/50' : ''
                      }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg border-2 ${getRankStyle(index + 3)}`}>
                      {index + 4}
                    </div>

                    <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                      <img
                        src={student.avatar_url ? `${API_URL}${student.avatar_url}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.username}`}
                        alt={student.username}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1">
                      <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        {student.full_name || student.username}
                        {currentUser?.id === student.id && (
                          <span className="text-[9px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">Bạn</span>
                        )}
                      </h4>
                      <div className="flex items-center gap-4 text-xs font-bold text-slate-400 mt-1">
                        <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> Lớp {student.grade_level?.split('_')[1] || '--'}</span>
                        <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5" /> {student.lessons_completed || 0} bài học</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1.5 justify-end text-blue-600">
                        <Star className="w-4 h-4 fill-blue-600" />
                        <span className="text-xl font-black">{student.total_points || 0}</span>
                      </div>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Tích lũy</p>
                    </div>

                    {currentUser?.id === student.id && (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600 rounded-r-full"></div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* User Personal Stats Banner */}
            {currentUser && !leaderboard.slice(0, 100).find(s => s.id === currentUser.id) && (
              <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white flex items-center justify-between shadow-2xl">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-blue-600 flex items-center justify-center font-black text-2xl">
                    #?
                  </div>
                  <div>
                    <h4 className="text-xl font-black">Hạng của bạn đang cập nhật...</h4>
                    <p className="text-slate-400 font-medium tracking-tight">Cố gắng thêm chút nữa để lọt top 100 nhé! 🔥</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-blue-400">{currentUser.points || 0} XP</p>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Số điểm hiện tại</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <ChatbotWidget />
    </div>
  )
}
