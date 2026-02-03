'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, CheckCircle, XCircle, ArrowLeft, Target, Lightbulb, Sparkles, ShieldAlert, Monitor, Shield, Headphones } from 'lucide-react'
import api, { testsAPI, userAPI, API_URL } from '@/lib/api'
import { useToast } from '@/context/ToastContext'
import confetti from 'canvas-confetti'
import ProctoringGuard from '@/components/ProctoringGuard'
import { useMonitoring } from '@/context/MonitoringContext'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function TestDetail() {
  const router = useRouter()
  const { toast } = useToast()
  const params = useParams()
  const [test, setTest] = useState<any>(null)
  const [answers, setAnswers] = useState<{ [key: number]: string }>({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [started, setStarted] = useState(false)
  const [monitoringStatus, setMonitoringStatus] = useState<'idle' | 'sharing' | 'active'>('idle')
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false)
  const [violationMessage, setViolationMessage] = useState<string | null>(null)
  const [startTime, setStartTime] = useState<string | null>(null)
  const [explainingQuestionId, setExplainingQuestionId] = useState<number | null>(null)
  const [explanations, setExplanations] = useState<{ [key: number]: string }>({})
  const [user, setUser] = useState<any>(null)
  const violationTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleExplain = async (resultItem: any, index: number) => {
    if (explanations[index]) return

    setExplainingQuestionId(index)
    try {
      const originalQuestion = test.questions[index]
      const options = typeof originalQuestion.options === 'string'
        ? JSON.parse(originalQuestion.options)
        : (originalQuestion.options || [])

      const res = await api.post('/ai/explain', {
        question: resultItem.question,
        userAnswer: resultItem.userAnswer,
        correctAnswer: resultItem.correctAnswer,
        options: options
      })
      setExplanations(prev => ({ ...prev, [index]: res.data.explanation }))
    } catch (error) {
      toast('Không thể tạo lời giải thích lúc này', 'error')
    } finally {
      setExplainingQuestionId(null)
    }
  }

  useEffect(() => {
    const token = sessionStorage.getItem('token')
    if (!token) {
      router.push('/login/student')
      return
    }

    const u = sessionStorage.getItem('user')
    if (u) setUser(JSON.parse(u))


    loadTest()
  }, [params.id, router])

  useEffect(() => {
    if (started && timeLeft > 0 && !submitted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (started && timeLeft === 0 && !submitted) {
      handleSubmit()
    }
  }, [started, timeLeft, submitted])

  const { triggerAutoSubmit, setTriggerAutoSubmit, isProctoringEnabled, isSharingActive } = useMonitoring()

  useEffect(() => {
    if (triggerAutoSubmit && started && !submitted) {
      handleStrictViolation(triggerAutoSubmit)
      // Reset trigger after use to avoid loops
      setTriggerAutoSubmit(null)
    }
  }, [triggerAutoSubmit, started, submitted])

  useEffect(() => {
    // Simplified monitoring setup: ProctoringGuard handles visibility and streaming
    // We only keep the paste detection and AI access detection for strictness
    const handlePaste = (e: ClipboardEvent) => {
      if (started && !submitted && isProctoringEnabled) {
        setViolationMessage('CẢNH BÁO: Phát hiện hành vi sử dụng Paste!')
        setTimeout(() => setViolationMessage(null), 5000)
        // Signal GlobalMonitor via context if needed, or rely on its own detection
        setTriggerAutoSubmit('Sử dụng phím tắt Paste (Nghi ngờ sao chép)')
      }
    }

    window.addEventListener('paste', handlePaste)

    return () => {
      window.removeEventListener('paste', handlePaste)
    }
  }, [started, submitted, isProctoringEnabled])

  const handleStrictViolation = async (violationType: string) => {
    if (submitted) return;
    setViolationMessage(`CẢNH BÁO VI PHẠM: ${violationType}. ĐANG TỰ ĐỘNG NỘP BÀI...`)

    // Crucial: Call handleSubmit to end the test session
    await handleSubmit()
  }

  const loadTest = async () => {
    try {
      const response = await testsAPI.getById(Number(params.id))
      setTest(response.data)
      setTimeLeft(response.data.duration * 60)
    } catch (error) {
      console.error('Error loading test:', error)
    } finally {
      setLoading(false)
    }
  }

  const startTest = async () => {
    if (test.max_attempts > 0 && test.current_attempts >= test.max_attempts) {
      toast('Bạn đã hết lượt làm bài thi cho bài này', 'error')
      return
    }

    // Proctoring is now handled by ProctoringGuard component wrapping the test
    // Request for Fullscreen is still handled here during start

    if (isProctoringEnabled && !isSharingActive) {
      toast('Vui lòng bật chia sẻ màn hình trước khi bắt đầu bài thi', 'error')
      return
    }

    setStarted(true)
    setStartTime(new Date().toISOString())

    // Set test start time for grace period (prevent false violations during startup)
    if (typeof window !== 'undefined') {
      (window as any).__testStartTime = Date.now()
    }

    if (isProctoringEnabled) {
      try {
        // Request fullscreen to hide browser UI
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen()
          setIsFullScreen(true)

          // Hide browser notification bar hint (show message after fullscreen)
          setTimeout(() => {
            // In fullscreen mode, browser notification bar should be less intrusive
            // Show a subtle hint to minimize the notification
            const hint = document.createElement('div')
            hint.id = 'screen-share-hint'
            hint.style.cssText = `
              position: fixed;
              top: 10px;
              right: 10px;
              background: rgba(0, 0, 0, 0.8);
              color: white;
              padding: 8px 12px;
              border-radius: 6px;
              font-size: 12px;
              z-index: 999999;
              pointer-events: none;
              opacity: 0;
              transition: opacity 0.3s;
            `
            hint.textContent = '💡 Tip: Bạn có thể ẩn thanh thông báo của trình duyệt bằng cách click "Hide"'
            document.body.appendChild(hint)
            setTimeout(() => {
              hint.style.opacity = '1'
            }, 100)
            setTimeout(() => {
              hint.style.opacity = '0'
              setTimeout(() => hint.remove(), 300)
            }, 5000)
          }, 1000)
        }
      } catch (err) {
        console.warn('Fullscreen request failed:', err)
      }
    }
  }

  const handleSubmit = async () => {
    if (!test || submitted) return

    const answerArray = test.questions.map((q: any) => answers[q.id] || '')

    try {
      const response = await (testsAPI as any).submit(test.id, answerArray, startTime)
      setResult(response.data)
      setSubmitted(true)

      // Celebrate if score is high (>= 80%)
      if (response.data.percentage >= 80) {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function () {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 50 * (timeLeft / duration);
          // since particles fall down, start a bit higher than random
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
      }

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => { });
      }
    } catch (error) {
      console.error('Error submitting test:', error)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" text="Đang đồng bộ đề thi..." />
      </div>
    )
  }

  if (!test) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Không tìm thấy bài kiểm tra</div>
      </div>
    )
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200">
          <div className="container mx-auto px-4 py-4">
            <Link href="/tests" className="text-blue-600 hover:text-blue-800 flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Về danh sách bài kiểm tra
            </Link>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
            <h1 className="text-3xl font-bold mb-4">{test.title}</h1>
            <p className="text-gray-600 mb-6">{test.description}</p>
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-2 text-gray-700">
                <Clock className="w-5 h-5" />
                <span>Thời gian: {test.duration} phút</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <span>📝</span>
                <span>Số câu hỏi: {test.questions?.length || 0}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <span>🎯</span>
                <span>Tổng điểm: {test.total_points} điểm</span>
              </div>
            </div>
            {test.max_attempts > 0 && (
              <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lượt làm bài</p>
                  <p className="font-black text-blue-600">{test.current_attempts} / {test.max_attempts}</p>
                </div>
                {test.current_attempts >= test.max_attempts && (
                  <span className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-[10px] font-black uppercase tracking-widest">Đã hết lượt</span>
                )}
              </div>
            )}
            {isProctoringEnabled && !isSharingActive ? (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col items-center text-center gap-3 text-amber-700 shadow-sm border-b-4 border-b-amber-300">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-1">
                    <Monitor className="w-6 h-6 text-amber-600" />
                  </div>
                  <h4 className="font-black uppercase tracking-wider">Yêu cầu chia sẻ màn hình</h4>
                  <p className="text-xs font-bold leading-relaxed opacity-80">
                    Hệ thống cần bạn chia sẻ <b>Toàn bộ màn hình</b> để đảm bảo tính minh bạch. Vui lòng bật chia sẻ để nút "Bắt đầu" hiện lên.
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Gợi ý: Nhấn vào Banner đỏ ở phía trên hoặc thanh công cụ để bật chia sẻ</p>
                </div>
              </div>
            ) : (
              <motion.button
                whileHover={!(test.max_attempts > 0 && test.current_attempts >= test.max_attempts) ? { scale: 1.05 } : {}}
                whileTap={!(test.max_attempts > 0 && test.current_attempts >= test.max_attempts) ? { scale: 0.95 } : {}}
                onClick={startTest}
                disabled={test.max_attempts > 0 && test.current_attempts >= test.max_attempts}
                className={`w-full py-4 px-6 rounded-2xl font-black text-xl shadow-xl uppercase tracking-widest transition-all ${test.max_attempts > 0 && test.current_attempts >= test.max_attempts
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border-b-0'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20 shadow-b-4 shadow-b-blue-800'
                  }`}
              >
                {test.max_attempts > 0 && test.current_attempts >= test.max_attempts ? 'Hết lượt làm bài' : 'Bắt đầu làm bài'}
              </motion.button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <ProctoringGuard
      classId={user?.current_class_id || null}
      type="test"
    >
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/tests" className="text-blue-600 hover:text-blue-800 flex items-center gap-2 font-bold">
              <ArrowLeft className="w-4 h-4" />
              Thoát bài thi
            </Link>
            <div className="flex items-center gap-3">
              {isProctoringEnabled && isSharingActive && (
                <div className="flex items-center gap-2 bg-red-100 px-3 py-1.5 rounded-full border border-red-300">
                  <Monitor className="w-4 h-4 text-red-600" />
                  <Shield className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-semibold text-red-600">GIÁM SÁT: ĐANG CHIA SẺ</span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-red-100 px-4 py-2 rounded-xl border border-red-200 shadow-sm">
                <Clock className="w-5 h-5 text-red-600" />
                <span className="font-black text-red-600 tabular-nums">{formatTime(timeLeft)}</span>
              </div>
            </div>
          </div>
          {violationMessage && (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl font-black text-sm uppercase tracking-widest z-[60] flex items-center gap-3 border-4 border-white/20"
            >
              <XCircle className="w-5 h-5" />
              {violationMessage}
            </motion.div>
          )}
        </nav>

        <div className="container mx-auto px-4 py-8">
          {submitted && result ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8 text-center"
            >
              <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${result.percentage >= 50 ? 'bg-green-100' : 'bg-red-100'
                }`}>
                {result.percentage >= 50 ? (
                  <CheckCircle className="w-12 h-12 text-green-600" />
                ) : (
                  <XCircle className="w-12 h-12 text-red-600" />
                )}
              </div>
              <h2 className="text-3xl font-bold mb-4">
                {result.percentage >= 50 ? 'Chúc mừng! 🎉' : 'Cần cố gắng thêm!'}
              </h2>
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {result.score}/{result.totalScore}
              </div>
              <div className="text-2xl font-semibold text-gray-700 mb-6">
                {result.percentage.toFixed(1)}%
              </div>
              <Link
                href="/tests"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 mb-8"
              >
                Về danh sách bài kiểm tra
              </Link>

              <div className="mt-8 text-left border-t pt-8">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  Chi tiết bài làm
                </h3>
                <div className="space-y-6">
                  {result.results.map((res: any, idx: number) => (
                    <div key={idx} className={`p-6 rounded-2xl border-2 ${res.isCorrect ? 'border-green-100 bg-green-50/30' : 'border-red-100 bg-red-50/30'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-slate-800 leading-tight flex-1 pr-4">
                          Câu {idx + 1}: {res.question}
                        </h4>
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${res.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {res.isCorrect ? `+${res.points} ĐIỂM` : '0 ĐIỂM'}
                        </span>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div className={`flex items-center gap-4 p-4 rounded-xl ${res.isCorrect ? 'bg-green-100/50' : 'bg-red-100/50'}`}>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 w-16">Bạn chọn</span>
                          <div className="flex items-center gap-2">
                            <span className={`font-black text-lg ${res.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                              {res.userAnswer || '(Bỏ trống)'}
                            </span>
                            {res.isCorrect ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                          </div>
                        </div>
                        {!res.isCorrect && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100 shadow-sm">
                              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 w-16">Đáp án đúng</span>
                              <span className="text-emerald-700 font-black text-lg">{res.correctAnswer}</span>
                            </div>

                            {/* AI Explain Button */}
                            <div className="pt-2">
                              {!explanations[idx] ? (
                                <button
                                  onClick={() => handleExplain(res, idx)}
                                  disabled={explainingQuestionId === idx}
                                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-2 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors border border-blue-200"
                                >
                                  {explainingQuestionId === idx ? (
                                    <>
                                      <LoadingSpinner size="sm" text="" noContainer />
                                      ĐANG PHÂN TÍCH...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="w-4 h-4" />
                                      GIẢI THÍCH LỖI SAI (AI)
                                    </>
                                  )}
                                </button>
                              ) : (
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 relative overflow-hidden"
                                >
                                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                  <div className="flex gap-3">
                                    <div className="bg-white p-2 rounded-full shadow-sm h-fit">
                                      <Lightbulb className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                    </div>
                                    <div className="flex-1">
                                      <h5 className="text-xs font-black text-blue-800 uppercase tracking-widest mb-1">Góc thầy giáo AI</h5>
                                      <p className="text-sm text-slate-700 leading-relaxed italic">"{explanations[idx]}"</p>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="max-w-3xl mx-auto">
              {/* Redundant violation warning removed, handled by GlobalMonitor overlay */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h1 className="text-2xl font-bold mb-6">{test.title}</h1>
                <div className="space-y-6">
                  {test.questions?.map((question: any, index: number) => {
                    const options = Array.isArray(question.options) ? question.options : JSON.parse(question.options || '[]')
                    return (
                      <div key={question.id} className="border-b pb-6 last:border-0">
                        <h3 className="text-lg font-semibold mb-4">
                          Câu {index + 1}: {question.question}
                        </h3>
                        {question.audio_url && (
                          <div className="mb-6">
                            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 flex items-center gap-4">
                              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                <Headphones className="w-5 h-5" />
                              </div>
                              <audio
                                src={`${API_URL}${question.audio_url}`}
                                controls
                                className="flex-1 h-10 custom-audio-player"
                              />
                            </div>
                          </div>
                        )}
                        {
                          question.type === 'essay' ? (
                            <textarea
                              placeholder="Nhập câu trả lời tự luận của bạn..."
                              rows={4}
                              className="w-full p-4 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all font-medium"
                              value={answers[question.id] || ''}
                              onChange={(e) =>
                                setAnswers({ ...answers, [question.id]: e.target.value })
                              }
                              disabled={submitted || timeLeft === 0}
                            />
                          ) : (
                            <div className="space-y-2">
                              {options.map((option: string, optIndex: number) => {
                                const letter = String.fromCharCode(65 + optIndex)
                                return (
                                  <label
                                    key={optIndex}
                                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${answers[question.id] === letter ? 'bg-blue-50 border-blue-200 shadow-sm' : 'hover:bg-gray-50'}`}
                                  >
                                    <input
                                      type="radio"
                                      name={`question-${question.id}`}
                                      value={letter}
                                      checked={answers[question.id] === letter}
                                      onChange={(e) =>
                                        setAnswers({ ...answers, [question.id]: e.target.value })
                                      }
                                      disabled={submitted || timeLeft === 0}
                                      className="mr-3"
                                    />
                                    <span className={answers[question.id] === letter ? 'font-black text-blue-700' : 'font-bold text-gray-700'}>
                                      {letter}. {option}
                                    </span>
                                  </label>
                                )
                              })}
                            </div>
                          )
                        }
                      </div>
                    )
                  })}
                </div>
                <div className="mt-8">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowConfirmSubmit(true)}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-2xl hover:from-blue-700 hover:to-purple-700 font-black text-xl shadow-xl shadow-blue-500/20 uppercase tracking-widest"
                  >
                    Nộp bài thi ngay
                  </motion.button>
                </div>

                <AnimatePresence>
                  {showConfirmSubmit && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    >
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.9 }}
                        className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-blue-50"
                      >
                        <h3 className="text-2xl font-black text-slate-800 mb-4 leading-tight">Xác nhận nộp bài?</h3>
                        <p className="text-slate-500 font-bold mb-8 italic">Vui lòng kiểm tra lại tất cả các câu trả lời trước khi nộp. Bạn không thể thay đổi sau khi gửi.</p>
                        <div className="flex gap-4">
                          <button
                            onClick={() => setShowConfirmSubmit(false)}
                            className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm uppercase"
                          >
                            Hủy
                          </button>
                          <button
                            onClick={() => {
                              setShowConfirmSubmit(false)
                              handleSubmit()
                            }}
                            className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase shadow-lg shadow-blue-500/20"
                          >
                            Nộp bài
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProctoringGuard >
  )
}

