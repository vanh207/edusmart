'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Send,
  CheckCircle2,
  AlertCircle,
  Timer,
  Trophy,
  RotateCcw,
  Sparkles,
  Lightbulb,
  Target,
  FileUp,
  X,
  ShieldCheck,
  Search,
  Users,
  Headphones
} from 'lucide-react'
import api, { exercisesAPI, userAPI, adminAPI, API_URL } from '@/lib/api'
import { useToast } from '@/context/ToastContext'
import ProctoringGuard from '@/components/ProctoringGuard'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function PracticeDetail() {
  const router = useRouter()
  const { toast } = useToast()
  const params = useParams()
  const [exercises, setExercises] = useState<any[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<{ [key: number]: string }>({})
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [totalScore, setTotalScore] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [studyTime, setStudyTime] = useState(0)
  const [isProctoring, setIsProctoring] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [started, setStarted] = useState(false)
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false)
  const [startTime, setStartTime] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [selectedFiles, setSelectedFiles] = useState<{ [key: number]: File | null }>({})
  const [user, setUser] = useState<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentExercise = exercises[currentQuestionIndex]

  useEffect(() => {
    const token = sessionStorage.getItem('token')
    if (!token) {
      router.push('/login/student')
      return
    }

    const u = sessionStorage.getItem('user')
    if (u) setUser(JSON.parse(u))

    loadExercises()

    const timer = setInterval(() => {
      setStudyTime(prev => prev + 1)
    }, 1000)

    return () => {
      clearInterval(timer)
    }
  }, [params.lessonId, router, isProctoring])


  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const loadExercises = async () => {
    try {
      setLoading(true)
      const exercisesRes = await exercisesAPI.getQuestions(Number(params.lessonId))
      const data = exercisesRes.data
      setExercises(data)
      if (data.length > 0) {
        setTimeLeft((data[0].duration || 30) * 60)
      }

      // Check Global Proctoring Setting
      let globalProctoring = true
      try {
        const settingsRes = await adminAPI.getProctoringStatus()
        globalProctoring = !!settingsRes.data.enabled
      } catch (err) {
        console.warn('Failed to fetch global proctoring setting, defaulting to ON')
      }

      if (!globalProctoring) {
        console.log('AI Proctoring is disabled globally by Admin.')
        setIsProctoring(false)
      } else {
        // Try to load lesson data for proctoring settings, but don't fail if it's missing
        try {
          const lessonRes = data[0]?.lesson_id ? await api.get(`/lessons/${data[0].lesson_id}`) : null
          if (lessonRes && lessonRes.data && lessonRes.data.ai_proctoring) {
            setIsProctoring(true)
          }
        } catch (lessonErr) {
          console.warn('Lesson data not found for proctoring settings, continuing without proctoring.')
        }
      }
    } catch (err: any) {
      console.error('Error loading exercises:', err)
      setError('Không thể tải bài tập. Vui lòng thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let interval: any
    if (started && timeLeft > 0 && !submitted) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
    } else if (started && timeLeft === 0 && !submitted) {
      handleSubmit()
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [started, timeLeft, submitted])

  const startPractice = () => {
    setStarted(true)
    setStartTime(new Date().toISOString())
    if (isProctoring) {
      try {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen()
        }
      } catch (err) {
        console.warn('Fullscreen request failed:', err)
      }
    }
  }

  const handleAnswerSelect = (exerciseId: number, option: string) => {
    if (submitted) return
    setAnswers({ ...answers, [exerciseId]: option })
  }

  const handleFileChange = (exerciseId: number, file: File | null) => {
    if (submitted) return
    setSelectedFiles({ ...selectedFiles, [exerciseId]: file })
  }

  const handleSubmit = async () => {
    if (exercises.length === 0 || submitted) return

    setLoading(true)
    try {
      // Handle file uploads first
      const fileUrls: { [key: number]: string } = {}
      for (const ex of exercises) {
        const file = selectedFiles[ex.id]
        if (file) {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('item_id', ex.id.toString())
          formData.append('item_type', 'exercise')
          try {
            const uploadRes = await userAPI.uploadSubmissionFile(formData)
            fileUrls[ex.id] = uploadRes.data.file_url
          } catch (e) {
            console.error('File upload failed', e)
          }
        }
      }

      const answerArray = exercises.map((ex) => answers[ex.id] || '')
      const firstSetId = exercises[0]?.exercise_id

      const response = await exercisesAPI.submit({
        exercise_id: firstSetId,
        answers: answerArray,
        study_time: studyTime,
        start_time: startTime,
        file_url: Object.values(fileUrls)[0] || undefined
      })

      setResult(response.data)
      setSubmitted(true)
    } catch (err: any) {
      console.error('Error submitting practice:', err)
    } finally {
      setLoading(false)
    }
  }

  const resetQuiz = () => {
    setStarted(false)
    setSubmitted(false)
    setAnswers({})
    setSelectedFiles({})
    setResult(null)
    setStudyTime(0)
    loadExercises()
  }

  if (loading && exercises.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" text="Đang chuẩn bị bộ câu hỏi..." />
      </div>
    )
  }

  if (exercises.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-12 rounded-3xl shadow-sm text-center max-w-lg border border-gray-100">
          <Lightbulb className="w-16 h-16 text-yellow-400 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-slate-800 mb-2">Chưa có bài tập nào!</h2>
          <p className="text-slate-400 font-medium mb-10">Bài giảng này hiện chưa có bài tập luyện tập. Bạn hãy quay lại sau nhé!</p>
          <Link href="/practice" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-2xl font-black">QUAY LẠI TRUNG TÂM</Link>
        </div>
      </div>
    )
  }

  const firstEx = exercises[0]

  if (!started) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200">
          <div className="container mx-auto px-4 py-4">
            <Link href="/practice" className="text-blue-600 hover:text-blue-800 flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" />
              Về danh sách luyện tập
            </Link>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto bg-white rounded-[2.5rem] shadow-xl p-10 border border-white">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Target className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-slate-900">{firstEx.set_title}</h1>
                <p className="text-blue-600 font-bold uppercase text-[10px] tracking-widest mt-1">BÀI LUYỆN TẬP</p>
              </div>
            </div>

            <p className="text-slate-500 font-medium mb-10 leading-relaxed text-lg italic">
              {firstEx.description || 'Hoàn thành bài luyện tập này để củng cố kiến thức đã học. Điểm số của bạn sẽ được ghi lại.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Thời gian</p>
                <p className="text-lg font-black text-slate-700">{firstEx.duration || 30} phút</p>
              </div>
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Số câu hỏi</p>
                <p className="text-lg font-black text-slate-700">{exercises.length} câu</p>
              </div>
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Điểm tối đa</p>
                <p className="text-lg font-black text-slate-700">{exercises.reduce((sum, e) => sum + e.points, 0)}</p>
              </div>
            </div>

            {isProctoring && (
              <div className="mb-8 p-6 bg-amber-50 rounded-3xl border border-amber-100 flex gap-4">
                <ShieldCheck className="w-8 h-8 text-amber-600 flex-shrink-0" />
                <div>
                  <h4 className="font-black text-amber-800 text-sm uppercase tracking-widest mb-1">AI Proctoring Enabled</h4>
                  <p className="text-amber-700/70 text-sm font-medium">Hệ thống sẽ giám sát tab chuyển đổi và hành vi gian lận để đảm bảo tính công bằng.</p>
                </div>
              </div>
            )}

            {exercises[0] && exercises[0].max_attempts > 0 && (
              <div className="mb-6 flex flex-col items-center gap-2">
                <div className="px-6 py-2 bg-slate-100 rounded-full border border-slate-200">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    Lượt làm bài: <span className="text-blue-600">{exercises[0].current_attempts} / {exercises[0].max_attempts}</span>
                  </p>
                </div>
                {exercises[0].current_attempts >= exercises[0].max_attempts && (
                  <p className="text-sm font-black text-rose-500 uppercase tracking-tight">Bạn đã hết lượt luyện tập cho bài này</p>
                )}
              </div>
            )}

            <motion.button
              whileHover={!(exercises[0] && exercises[0].max_attempts > 0 && exercises[0].current_attempts >= exercises[0].max_attempts) ? { scale: 1.02 } : {}}
              whileTap={!(exercises[0] && exercises[0].max_attempts > 0 && exercises[0].current_attempts >= exercises[0].max_attempts) ? { scale: 0.98 } : {}}
              onClick={startPractice}
              disabled={exercises[0] && exercises[0].max_attempts > 0 && exercises[0].current_attempts >= exercises[0].max_attempts}
              className={`w-full py-5 px-6 rounded-3xl font-black text-xl shadow-xl uppercase tracking-[0.1em] transition-all ${exercises[0] && exercises[0].max_attempts > 0 && exercises[0].current_attempts >= exercises[0].max_attempts
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20'
                }`}
            >
              {exercises[0] && exercises[0].max_attempts > 0 && exercises[0].current_attempts >= exercises[0].max_attempts ? 'Hết lượt làm bài' : 'Bắt đầu luyện tập ngay'}
            </motion.button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ProctoringGuard
      classId={user?.current_class_id || null}
      type="study"
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
        <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200 sticky top-0 z-50">
          <div className="container mx-auto px-4 h-20 flex justify-between items-center">
            <Link href="/practice" className="text-blue-600 hover:text-blue-800 flex items-center gap-2 font-bold p-3 hover:bg-blue-50 rounded-2xl transition-all">
              <ChevronLeft className="w-5 h-5" />
              Thoát luyện tập
            </Link>
            <div className="flex items-center gap-4">
              {isProctoring && (
                null
              )}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border shadow-sm ${timeLeft < 60 ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 'bg-blue-600 border-blue-700 text-white'}`}>
                <Timer className="w-5 h-5" />
                <span className="font-black tabular-nums">{formatTime(timeLeft)}</span>
              </div>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-8">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-3xl mx-auto bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden"
            >
              <div className="bg-gradient-to-br from-blue-600 to-indigo-800 p-12 text-center text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                <div className="relative z-10">
                  <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 border border-white/30 shadow-2xl">
                    <Trophy className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-4xl font-black mb-2 tracking-tight">Tuyệt vời! 🔥</h2>
                  <p className="text-blue-100 font-bold mb-10 text-lg">Bạn đã chinh phục bộ câu hỏi luyện tập.</p>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
                      <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-2">Điểm số</p>
                      <p className="text-4xl font-black">{result?.score || 0}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
                      <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-2">Hoàn thành</p>
                      <p className="text-4xl font-black">{result?.percentage?.toFixed(0)}%</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 md:block hidden">
                      <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-2">XP</p>
                      <p className="text-4xl font-black text-amber-300">+{result?.score * 10}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-12 space-y-8">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                  <Target className="w-6 h-6 text-blue-600" />
                  Chi tiết bài đã nộp
                </h3>
                <div className="space-y-6">
                  {(result?.results || []).map((res: any, idx: number) => {
                    const isEssay = res.type === 'essay'
                    return (
                      <div key={idx} className={`p-8 rounded-[2rem] border-2 transition-all ${isEssay ? 'border-purple-100 bg-purple-50/50' : res.isCorrect ? 'border-emerald-100 bg-emerald-50/50' : 'border-red-100 bg-red-50/50'}`}>
                        <div className="flex justify-between items-start mb-6">
                          <h4 className="font-black text-slate-800 text-lg leading-tight flex-1 pr-6">
                            Câu {idx + 1}: {res.question}
                          </h4>
                          <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm ${isEssay ? 'bg-purple-500 text-white' : res.isCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                            {isEssay ? 'Đã ghi nhận' : res.isCorrect ? 'Chính xác' : 'Chưa đúng'}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-bold">
                          <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2 font-black">Lựa chọn của bạn</p>
                            <p className={`text-lg font-black whitespace-pre-wrap ${isEssay ? 'text-slate-700' : res.isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>{res.userAnswer || '(Bỏ trống)'}</p>
                          </div>
                          {!isEssay && !res.isCorrect && (
                            <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm">
                              <p className="text-[10px] text-emerald-400 uppercase tracking-widest mb-2 font-black">Đáp án chính xác</p>
                              <p className="text-lg font-black text-emerald-600">{res.correctAnswer}</p>
                            </div>
                          )}
                          {isEssay && (
                            <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 shadow-sm flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                                <Target className="w-5 h-5" />
                              </div>
                              <p className="text-xs text-blue-700 font-bold leading-tight">Bài làm của bạn đã được lưu lại. Giáo viên sẽ sớm xem xét và chấm điểm cho bạn!</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="pt-12 flex flex-col md:flex-row gap-4">
                  <button
                    onClick={resetQuiz}
                    className="flex-1 py-6 bg-slate-100 text-slate-600 font-black rounded-3xl hover:bg-slate-200 transition-all flex items-center justify-center gap-3 uppercase tracking-widest"
                  >
                    <RotateCcw className="w-6 h-6" /> Thử lại
                  </button>
                  <Link
                    href="/practice"
                    className="flex-[2] py-6 bg-blue-600 text-white font-black rounded-3xl hover:bg-blue-700 shadow-2xl shadow-blue-500/30 transition-all text-center flex items-center justify-center gap-3 uppercase tracking-widest"
                  >
                    Quay lại khóa học <Target className="w-6 h-6" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="max-w-3xl mx-auto pb-20">
              <div className="bg-white rounded-[3rem] shadow-xl p-10 md:p-14 border border-white">
                <h2 className="text-3xl font-black text-slate-900 mb-10 pb-6 border-b border-slate-50">{firstEx.set_title}</h2>

                <div className="space-y-12">
                  {exercises.map((ex, idx) => (
                    <div key={ex.id} className="pb-12 last:pb-0 border-b last:border-0 border-slate-50">
                      <div className="flex items-start gap-5 mb-8">
                        <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black flex-shrink-0 mt-1 shadow-lg">
                          {idx + 1}
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 leading-relaxed">
                          {ex.question}
                        </h3>
                      </div>

                      {ex.audio_url && (
                        <div className="mb-6 pl-14">
                          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                              <Headphones className="w-5 h-5" />
                            </div>
                            <audio
                              src={`${API_URL}${ex.audio_url}`}
                              controls
                              className="flex-1 h-10 custom-audio-player"
                            />
                          </div>
                        </div>
                      )}

                      {ex.type === 'essay' ? (
                        <div className="space-y-6 pl-14">
                          <textarea
                            placeholder="Viết nội dung câu trả lời của bạn..."
                            rows={6}
                            className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] outline-none focus:border-blue-500 focus:bg-white transition-all font-medium text-lg"
                            value={answers[ex.id] || ''}
                            onChange={(e) => setAnswers({ ...answers, [ex.id]: e.target.value })}
                          />
                          <div className="flex items-center gap-4">
                            <label className={`flex-1 flex items-center justify-center gap-3 p-6 border-2 border-dashed rounded-[2rem] cursor-pointer transition-all ${selectedFiles[ex.id] ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-blue-50'}`}>
                              <FileUp className="w-6 h-6" />
                              <span className="font-bold">{selectedFiles[ex.id] ? (selectedFiles[ex.id] as any).name : 'Tải lên hình ảnh / tài liệu (Tùy chọn)'}</span>
                              <input type="file" className="hidden" onChange={(e) => handleFileChange(ex.id, e.target.files ? e.target.files[0] : null)} />
                            </label>
                            {selectedFiles[ex.id] && (
                              <button onClick={() => handleFileChange(ex.id, null)} className="p-6 bg-red-50 text-red-500 rounded-[2rem] hover:bg-red-100 transition-all">
                                <X className="w-6 h-6" />
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-14">
                          {(Array.isArray(ex.options) ? ex.options : JSON.parse(ex.options || '[]')).map((opt: string, optIdx: number) => {
                            const letter = String.fromCharCode(65 + optIdx)
                            const isSelected = answers[ex.id] === letter
                            return (
                              <button
                                key={optIdx}
                                onClick={() => handleAnswerSelect(ex.id, letter)}
                                className={`p-6 text-left rounded-[1.75rem] border-2 transition-all group flex items-start gap-4 ${isSelected ? 'bg-blue-600 border-blue-600 shadow-xl shadow-blue-500/20' : 'bg-white border-slate-100 hover:border-blue-200'}`}
                              >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs border-2 ${isSelected ? 'bg-white/20 border-white/30 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                                  {letter}
                                </div>
                                <span className={`font-bold mt-1 ${isSelected ? 'text-white' : 'text-slate-700'}`}>{opt}</span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-16 pt-10 border-t border-slate-50">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowConfirmSubmit(true)}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-6 rounded-3xl font-black text-xl shadow-2xl shadow-blue-500/40 uppercase tracking-[0.2em]"
                  >
                    Hoàn thành bài luyện tập
                  </motion.button>
                </div>
              </div>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showConfirmSubmit && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-[3rem] p-12 max-w-sm w-full shadow-2xl text-center border-4 border-white/20"
              >
                <div className="w-20 h-20 bg-blue-100 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-blue-600">
                  <Target className="w-10 h-10" />
                </div>
                <h3 className="text-3xl font-black text-slate-800 mb-4 leading-tight">Nộp bài ngay?</h3>
                <p className="text-slate-400 font-bold mb-10 italic">Hãy chắc chắn rằng bạn đã kiểm tra kỹ các câu trả lời của mình!</p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowConfirmSubmit(false)}
                    className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-100 transition-all"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmSubmit(false)
                      handleSubmit()
                    }}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
                  >
                    Nộp bài
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </ProctoringGuard>
  )
}
