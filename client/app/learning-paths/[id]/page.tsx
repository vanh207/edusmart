'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle, BookOpen, Compass, Sparkles, ChevronRight } from 'lucide-react'
import { learningPathsAPI } from '@/lib/api'
import ChatbotWidget from '@/components/ChatbotWidget'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function LearningPathDetail() {
  const router = useRouter()
  const params = useParams()
  const [path, setPath] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = sessionStorage.getItem('token')
    if (!token) {
      router.push('/login/student')
      return
    }

    loadPath()
  }, [params.id, router])

  const loadPath = async () => {
    try {
      const response = await learningPathsAPI.getById(Number(params.id))
      setPath(response.data)
    } catch (error) {
      console.error('Error loading learning path:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" text="Đang khớp nối lộ trình..." />
      </div>
    )
  }

  if (!path) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
            <Compass className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Không tìm thấy chuỗi học tập</h2>
          <Link href="/learning-paths" className="text-blue-600 font-bold hover:underline">Quay lại danh sách</Link>
        </div>
      </div>
    )
  }

  const completedSteps = path.steps?.filter((s: any) => s.completed).length || 0
  const totalSteps = path.steps?.length || 0
  const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-gray-100">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/learning-paths" className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-900">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex-1 px-6 text-center">
            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-0.5">Chi tiết lộ trình</h4>
            <h1 className="text-lg font-black text-slate-900 truncate max-w-md mx-auto">{path.title}</h1>
          </div>
          <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-tight">Tiến độ</span>
              <span className="text-xs font-black text-blue-800">{completedSteps}/{totalSteps} bước</span>
            </div>
            <div className="w-12 h-12 rounded-full border-2 border-blue-100 flex items-center justify-center relative">
              <span className="text-[10px] font-black text-blue-600">{Math.round(progressPercent)}%</span>
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="24" cy="24" r="22"
                  fill="none" stroke="currentColor"
                  strokeWidth="2"
                  className="text-blue-600"
                  strokeDasharray={`${progressPercent * 1.38}, 138`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2.5rem] p-10 lg:p-16 mb-12 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-3xl rounded-full -translate-y-12 translate-x-12"></div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                  {path.subject || 'ĐA MÔN'}
                </span>
                <span className="px-4 py-1.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200">
                  LỚP {path.grade_level?.split('_')[1] || '--'}
                </span>
              </div>

              <h2 className="text-4xl lg:text-5xl font-black text-slate-900 leading-tight mb-6">{path.title}</h2>
              <p className="text-slate-500 text-lg font-medium leading-relaxed max-w-2xl">{path.description}</p>
            </div>
          </motion.div>

          {/* Steps Timeline */}
          <div className="relative space-y-12 pl-8 lg:pl-16">
            {/* Timeline Line */}
            <div className="absolute left-[3.5rem] top-0 bottom-0 w-1 bg-slate-100 rounded-full">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${progressPercent}%` }}
                className="w-full bg-blue-600 rounded-full"
              />
            </div>

            {path.steps?.map((step: any, index: number) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative group"
              >
                {/* Step Node */}
                <div className={`absolute -left-12 lg:-left-20 w-12 h-12 rounded-2xl flex items-center justify-center z-10 transition-all duration-500 border-4 border-[#f8fafc] ${step.completed
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-white text-slate-300 shadow-md border-slate-100'
                  }`}>
                  {step.completed ? <CheckCircle className="w-6 h-6" /> : <span className="font-black text-lg">{index + 1}</span>}
                </div>

                {/* Step Card */}
                <div className={`bg-white rounded-[2rem] p-8 shadow-sm border transition-all duration-300 ${step.completed
                  ? 'border-blue-100 bg-blue-50/10'
                  : 'border-slate-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5'
                  }`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${step.completed ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                          }`}>
                          BƯỚC {index + 1}
                        </span>
                        {step.completed && (
                          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Hoàn thành
                          </span>
                        )}
                      </div>
                      <h3 className={`text-2xl font-black mb-3 ${step.completed ? 'text-blue-900' : 'text-slate-800'}`}>
                        {step.title}
                      </h3>
                      <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-xl">
                        {step.description || 'Tham gia bài học này để tiến gần hơn đến mục tiêu của bạn.'}
                      </p>
                    </div>

                    <div className="flex-shrink-0">
                      {step.lesson_id ? (
                        <Link
                          href={`/lessons/${step.lesson_id}?pathId=${path.id}&stepId=${step.id}`}
                          className={`flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-sm transition-all uppercase tracking-widest active:scale-[0.98] ${step.completed
                            ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-500/20'
                            }`}
                        >
                          {step.completed ? 'XEM LẠI' : 'HỌC NGAY'}
                          <ChevronRight className="w-5 h-5" />
                        </Link>
                      ) : (
                        <span className="text-slate-300 font-black text-xs uppercase tracking-widest bg-slate-50 px-6 py-4 rounded-2xl border border-dashed border-slate-200">
                          Chưa có nội dung
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {!path.steps || path.steps.length === 0 && (
            <div className="bg-white rounded-[2.5rem] p-16 text-center shadow-sm border border-slate-100">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Compass className="w-10 h-10 text-slate-200" />
              </div>
              <h3 className="text-xl font-black text-slate-800">Chu kỳ đang được cập nhật</h3>
              <p className="text-slate-400 mt-2 font-medium">Lộ trình này chưa có bài học cụ thể. Vui lòng quay lại sau!</p>
            </div>
          )}
        </div>
      </div>
      <ChatbotWidget />
    </div>
  )
}

