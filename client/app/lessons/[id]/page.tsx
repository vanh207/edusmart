'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ChevronLeft,
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  Target,
  Sparkles,
  PlayCircle,
  Download,
  Share2,
  CheckCircle2,
  Timer,
  ChevronRight
} from 'lucide-react'
import { lessonsAPI, exercisesAPI, userAPI, learningPathsAPI, API_URL } from '@/lib/api'
import ChatbotWidget from '@/components/ChatbotWidget'
import ThemeToggle from '@/components/ThemeToggle'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function LessonDetail() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const [lesson, setLesson] = useState<any>(null)
  const [exercises, setExercises] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [studyTime, setStudyTime] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const studyTimeRef = useRef(0)

  useEffect(() => {
    const token = sessionStorage.getItem('token')
    if (!token) {
      router.push('/login/student')
      return
    }

    loadLesson()
    loadExercises()

    // Learning Path Progress logic
    const pathId = searchParams.get('pathId')
    const stepId = searchParams.get('stepId')
    if (pathId && stepId) {
      learningPathsAPI.updateProgress(Number(pathId), Number(stepId), true)
    }

    // Timer logic
    timerRef.current = setInterval(() => {
      setStudyTime(prev => {
        studyTimeRef.current = prev + 1
        return prev + 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      // Save study time on unmount
      if (studyTimeRef.current > 0) {
        userAPI.logStudyTime(Number(params.id), studyTimeRef.current)
      }
    }
  }, [params.id, router, searchParams])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const loadLesson = async () => {
    try {
      const response = await lessonsAPI.getById(Number(params.id))
      setLesson(response.data)
    } catch (error) {
      console.error('Error loading lesson:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadExercises = async () => {
    try {
      const response = await exercisesAPI.getByLesson(Number(params.id))
      setExercises(response.data)
    } catch (error) {
      console.error('Error loading exercises:', error)
    }
  }

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
    const match = url.match(regExp)
    return (match && match[2].length === 11) ? match[2] : null
  }

  const renderMaterial = () => {
    if (lesson.material_type === 'video' && lesson.material_link) {
      const ytId = getYouTubeId(lesson.material_link)
      if (ytId) {
        return (
          <div className="mt-12 overflow-hidden rounded-[2.5rem] shadow-2xl border-8 border-white">
            <div className="aspect-video">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${ytId}?controls=0&modestbranding=1&rel=0&disablekb=1`}
                title="Lesson Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <div className="p-4 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest text-center">
              Chế độ xem hạn chế - Không cho phép tua video
            </div>
          </div>
        )
      }
    }

    if (lesson.material_type === 'book' && lesson.material_link) {
      return (
        <div className="mt-12 overflow-hidden rounded-[2.5rem] shadow-2xl border-8 border-white">
          <div className="h-[600px]">
            <iframe
              src={lesson.material_link}
              className="w-full h-full border-0"
              title="External Material"
            />
          </div>
          <div className="p-4 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest text-center">
            Tài liệu tham khảo / Sách giáo khoa điện tử
          </div>
        </div>
      )
    }

    if (lesson.file_path) {
      return (
        <div className="mt-16 p-8 bg-blue-600 rounded-[2rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-blue-500/20">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30">
              <PlayCircle className="w-10 h-10" />
            </div>
            <div>
              <h4 className="text-xl font-black">Tài liệu đính kèm</h4>
              <p className="text-blue-100 font-medium">{lesson.file_type || 'Bấm để tải về và xem'}</p>
            </div>
          </div>
          <a
            href={`${API_URL}${lesson.file_path}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3 bg-white text-blue-600 font-black rounded-xl hover:bg-blue-50 transition-all whitespace-nowrap"
          >
            TẢI VỀ NGAY
          </a>
        </div>
      )
    }

    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" text="Đang chuẩn bị bài giảng..." />
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6 text-muted-foreground">
            <BookOpen className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-foreground mb-2">Không tìm thấy bài học</h2>
          <Link href="/lessons" className="text-blue-600 font-bold hover:underline">Quay lại danh sách</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 transition-colors duration-300">
      <nav className="bg-card/80 backdrop-blur-md sticky top-0 z-30 border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="p-3 text-muted-foreground hover:text-foreground hover:bg-muted rounded-2xl transition-all group" title="Trang chủ">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="h-6 w-[1px] bg-border mx-1"></div>
            <Link href="/lessons" className="text-muted-foreground hover:text-foreground flex items-center gap-2 font-bold p-3 hover:bg-muted rounded-2xl transition-all">
              <ChevronLeft className="w-5 h-5 text-blue-600" />
              Thoát bài học
            </Link>
          </div>
          <div className="hidden lg:block flex-1 px-6">
            <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-0.5">Đang học bài giảng</h4>
            <h1 className="text-lg font-black text-foreground truncate max-w-md">{lesson.title}</h1>
          </div>
          <div className="flex gap-2 items-center">
            <ThemeToggle />
            <button className="p-3 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-2xl transition-all"><Share2 className="w-5 h-5" /></button>
            <button className="p-3 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-2xl transition-all"><Download className="w-5 h-5" /></button>
          </div>
          <div className="ml-4 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center gap-2">
            <Timer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-black text-blue-700 dark:text-blue-300 tabular-nums">{formatTime(studyTime)}</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-[2.5rem] shadow-xl border border-border overflow-hidden"
            >
              {/* Lesson Header Area */}
              <div className="p-10 border-b border-border bg-gradient-to-br from-card to-muted/30">
                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <span className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-800">
                    {lesson.subject === 'anh' ? 'TIẾNG ANH' :
                      lesson.subject === 'toan' ? 'TOÁN HỌC' :
                        lesson.subject === 'van' ? 'NGỮ VĂN' : lesson.subject?.toUpperCase()}
                  </span>
                  <span className="px-4 py-1.5 bg-muted text-muted-foreground rounded-full text-[10px] font-black uppercase tracking-widest border border-border">
                    LỚP {lesson.grade_level?.split('_')[1] || '--'}
                  </span>
                </div>

                <h2 className="text-4xl font-black text-foreground leading-tight mb-8">{lesson.title}</h2>

                <div className="flex flex-wrap items-center gap-8 text-muted-foreground text-xs font-bold border-t border-border pt-8">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" /> 15 phút học
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Đăng tải {new Date(lesson.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" /> +50 XP khi hoàn thành
                  </div>
                </div>
              </div>

              {/* Content Section */}
              <div className="p-10 lg:p-16">
                <div className="prose dark:prose-invert max-w-none prose-headings:font-black prose-headings:text-foreground prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:text-lg">
                  <div className="whitespace-pre-wrap leading-relaxed text-foreground">{lesson.content}</div>
                </div>

                {renderMaterial()}
              </div>
            </motion.div>
          </div>

          {/* Sidebar / Quiz Access */}
          <div className="w-full lg:w-80 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-[2.5rem] p-8 shadow-xl border border-border"
            >
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-500 mb-6">
                <Target className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-foreground mb-2">Kiểm tra kiến thức</h3>
              <p className="text-muted-foreground font-medium text-sm leading-relaxed mb-8">
                Hoàn thành bài tập để nhận được điểm thưởng XP và kiểm tra mức độ hiểu bài của bạn.
              </p>

              {exercises.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm font-bold text-muted-foreground bg-muted p-4 rounded-2xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" /> {exercises.length} câu hỏi trắc nghiệm
                  </div>
                  {exercises.length > 0 && (
                    <Link
                      href={`/practice/${exercises[0].id}`}
                      className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all text-center flex items-center justify-center gap-3"
                    >
                      BẮT ĐẦU LUYỆN TẬP <ChevronRight className="w-5 h-5" />
                    </Link>
                  )}
                </div>
              ) : (
                <div className="p-6 bg-muted border border-dashed border-border rounded-3xl text-center">
                  <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Chưa có bài tập</p>
                </div>
              )}
            </motion.div>

            {/* Quick Tips */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2.5rem] p-8 text-white">
              <h4 className="font-black mb-4 flex items-center gap-2">
                <span className="text-amber-400 italic">Pro Tips!</span> 💡
              </h4>
              <ul className="space-y-4 text-xs font-medium text-slate-400">
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1 flex-shrink-0"></div>
                  Ghi chú lại những ý chính để nhớ lâu hơn.
                </li>
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1 flex-shrink-0"></div>
                  Sử dụng AI Chatbot nếu bạn có thắc mắc.
                </li>
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1 flex-shrink-0"></div>
                  Học đi học lại nhiều lần để thành thạo.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <ChatbotWidget />
    </div>
  )
}
