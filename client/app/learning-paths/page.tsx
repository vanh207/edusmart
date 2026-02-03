'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { TrendingUp, BookOpen, CheckCircle, ArrowRight, ArrowLeft, GraduationCap, Compass, Zap, Star } from 'lucide-react'
import { learningPathsAPI } from '@/lib/api'
import ChatbotWidget from '@/components/ChatbotWidget'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function LearningPaths() {
  const router = useRouter()
  const [paths, setPaths] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = sessionStorage.getItem('token')
    if (!token) {
      router.push('/login/student')
      return
    }

    loadPaths()
  }, [router])

  const loadPaths = async () => {
    try {
      const response = await learningPathsAPI.getAll()
      setPaths(response.data)
    } catch (error) {
      console.error('Error loading learning paths:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Premium Nav */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4 flex items-center gap-6">
          <Link href="/dashboard" className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Chuỗi Học Tập 🗺️</h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Lộ trình chinh phục kiến thức</p>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Hero Section for Paths */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-[2.5rem] p-10 lg:p-16 mb-12 relative overflow-hidden text-white"
        >
          <div className="absolute top-0 right-0 w-1/3 h-full bg-blue-500/10 blur-3xl rounded-full"></div>
          <div className="relative z-10 lg:w-2/3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-blue-200 text-[10px] font-black uppercase tracking-widest mb-6">
              <Compass className="w-3 h-3" /> Lộ trình cá nhân hóa
            </div>
            <h2 className="text-4xl lg:text-5xl font-black mb-6 leading-tight">
              Định hướng <span className="text-blue-400">tương lai</span>,<br />
              bắt đầu từ hôm nay.
            </h2>
            <p className="text-slate-400 text-lg font-medium max-w-lg mb-0">
              Các chuỗi học tập được thiết kế bởi chuyên gia giúp bạn nắm vững kiến thức theo từng bước nhỏ.
            </p>
          </div>
          <Compass className="absolute right-10 bottom-10 w-48 h-48 text-white/5 -rotate-12 hidden lg:block" />
        </motion.div>

        {loading ? (
          <LoadingSpinner size="lg" text="Đang lập bản đồ kiến thức..." />
        ) : paths.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] p-16 text-center shadow-sm border border-slate-100">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <TrendingUp className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-xl font-black text-slate-800">Chưa có chuỗi học tập nào</h3>
            <p className="text-slate-400 mt-2 font-medium">Chúng tôi đang cập nhật các lộ trình mới, quay lại sau nhé!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {paths.map((path, idx) => (
              <motion.div
                key={path.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -8 }}
                className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all group flex flex-col"
              >
                <div className="flex items-start justify-between mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <BookOpen className="w-8 h-8" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">{path.subject}</span>
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">{path.grade_level?.replace('_', ' ')}</span>
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="text-2xl font-black text-slate-900 mb-3 group-hover:text-blue-600 transition-colors uppercase tracking-tight leading-tight">{path.title}</h3>
                  <p className="text-slate-500 font-medium leading-relaxed mb-6">{path.description}</p>

                  {path.steps && path.steps.length > 0 && (
                    <div className="space-y-3 mb-8">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                        <Zap className="w-3 h-3" /> Lộ trình học tập ({path.steps.length} bước)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {path.steps.slice(0, 3).map((step: any, sIdx: number) => (
                          <div key={sIdx} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-600">
                            <CheckCircle className="w-3.5 h-3.5 text-blue-500" /> {step.title}
                          </div>
                        ))}
                        {path.steps.length > 3 && (
                          <div className="px-3 py-1.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-400">
                            +{path.steps.length - 3} bước khác...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <Link
                  href={`/learning-paths/${path.id}`}
                  className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white py-5 rounded-2xl font-black text-sm hover:bg-blue-600 shadow-xl shadow-slate-900/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all uppercase tracking-widest"
                >
                  BẮT ĐẦU NGAY <ArrowRight className="w-5 h-5" />
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

