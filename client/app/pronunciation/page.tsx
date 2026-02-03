'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Volume2, CheckCircle, XCircle, ArrowRight, Loader2 } from 'lucide-react'
import { vocabularyAPI, pronunciationAPI } from '@/lib/api'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function Pronunciation() {
  const router = useRouter()
  const [vocabulary, setVocabulary] = useState<any[]>([])
  const [currentWord, setCurrentWord] = useState<any>(null)
  const [userInput, setUserInput] = useState('')
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    const token = sessionStorage.getItem('token')
    if (!token) {
      router.push('/login/student')
      return
    }

    loadVocabulary()
  }, [router])

  const loadVocabulary = async () => {
    try {
      const response = await vocabularyAPI.getAll({ subject: 'english' })
      setVocabulary(response.data)
      if (response.data.length > 0) {
        setCurrentWord(response.data[Math.floor(Math.random() * response.data.length)])
      }
    } catch (error) {
      console.error('Error loading vocabulary:', error)
    } finally {
      setLoading(false)
    }
  }

  const speakWord = (word: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(word)
      utterance.lang = 'en-US'
      utterance.rate = 0.8
      utterance.pitch = 1
      window.speechSynthesis.speak(utterance)
    }
  }

  const checkAnswer = async () => {
    if (!currentWord || !userInput.trim()) return

    setChecking(true)
    setShowResult(false)

    try {
      // Use AI to check pronunciation
      const response = await pronunciationAPI.checkPronunciation(currentWord.word, userInput.trim())
      setResult(response.data)
      setShowResult(true)
      setTotal(total + 1)

      if (response.data.correct) {
        setScore(score + 1)
      }
    } catch (error) {
      // Fallback to simple check
      const isCorrect = userInput.toLowerCase().trim() === currentWord.word.toLowerCase().trim()
      setResult({
        correct: isCorrect,
        feedback: isCorrect ? 'Chính xác! 🎉' : `Sai rồi! Đáp án đúng là: ${currentWord.word}`,
        score: isCorrect ? 100 : 0
      })
      setShowResult(true)
      setTotal(total + 1)
      if (isCorrect) {
        setScore(score + 1)
      }
    } finally {
      setChecking(false)
    }
  }

  const nextWord = () => {
    if (vocabulary.length > 0) {
      setCurrentWord(vocabulary[Math.floor(Math.random() * vocabulary.length)])
      setUserInput('')
      setResult(null)
      setShowResult(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" text="Đang chuẩn bị âm thanh..." />
      </div>
    )
  }

  if (!currentWord) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Chưa có từ vựng để luyện phát âm.</p>
          <Link href="/vocabulary" className="text-blue-600 hover:text-blue-800">
            Thêm từ vựng
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 flex items-center gap-2 transition-colors">
            <span>←</span> Về Dashboard
          </Link>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Luyện Phát Âm
          </h1>
          <div className="flex items-center gap-2 text-green-600 font-semibold">
            <CheckCircle className="w-5 h-5" />
            <span>{score}/{total}</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-8 text-center border border-gray-200"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="mb-8"
            >
              <button
                onClick={() => speakWord(currentWord.word)}
                className="text-8xl mb-4 hover:scale-110 transition-transform cursor-pointer"
                title="Nghe phát âm"
              >
                🔊
              </button>
            </motion.div>

            <p className="text-gray-600 mb-6 text-lg">Nghe và viết từ bạn nghe được</p>

            <div className="mb-6">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !checking && checkAnswer()}
                placeholder="Nhập từ bạn nghe được..."
                className="w-full px-6 py-4 border-2 border-gray-300 rounded-xl text-xl text-center focus:ring-2 focus:ring-green-500 focus:border-transparent font-semibold"
                autoFocus
                disabled={checking}
              />
            </div>

            <AnimatePresence>
              {showResult && result && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`mb-6 p-6 rounded-xl ${result.correct
                    ? 'bg-green-100 border-2 border-green-500'
                    : 'bg-red-100 border-2 border-red-500'
                    }`}
                >
                  <div className="flex items-center justify-center gap-3 mb-2">
                    {result.correct ? (
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    ) : (
                      <XCircle className="w-8 h-8 text-red-600" />
                    )}
                    <span className={`text-2xl font-bold ${result.correct ? 'text-green-700' : 'text-red-700'}`}>
                      {result.correct ? 'Chính xác! 🎉' : 'Sai rồi!'}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-2">{result.feedback}</p>
                  <div className="text-lg font-semibold text-gray-800">
                    Điểm: {result.score}/100
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={checkAnswer}
                disabled={checking || !userInput.trim()}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:to-emerald-700 text-lg font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {checking ? (
                  <>
                    <LoadingSpinner size="sm" text="" noContainer />
                    Đang kiểm tra...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Kiểm tra
                  </>
                )}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={nextWord}
                className="bg-gray-600 text-white px-8 py-4 rounded-xl hover:bg-gray-700 text-lg font-semibold shadow-lg flex items-center gap-2"
              >
                <ArrowRight className="w-5 h-5" />
                Bỏ qua
              </motion.button>
            </div>

            <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-gray-200">
              <p className="text-sm text-gray-600 mb-2 font-semibold">Gợi ý:</p>
              <p className="text-gray-700 text-lg mb-2">{currentWord.meaning}</p>
              {currentWord.example && (
                <p className="text-sm text-gray-600 italic">VD: {currentWord.example}</p>
              )}
              {currentWord.pronunciation && (
                <p className="text-sm text-gray-500 mt-2">Phát âm: /{currentWord.pronunciation}/</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
