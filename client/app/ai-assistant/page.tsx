'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import { aiAPI } from '@/lib/api'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function AIAssistant() {
  const router = useRouter()
  const [messages, setMessages] = useState<Array<{ role: string; content: string; id: string }>>([
    {
      role: 'assistant',
      content: 'Xin chào! 👋 Tôi là trợ lý AI của bạn. Tôi có thể giúp bạn học tập, giải thích bài học, làm bài tập và nhiều hơn nữa. Hãy đặt câu hỏi cho tôi!',
      id: '1'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const token = sessionStorage.getItem('token')
    if (!token) {
      router.push('/login/student')
      return
    }
  }, [router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    const messageId = Date.now().toString()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage, id: messageId }])
    setLoading(true)

    try {
      const response = await aiAPI.chat(userMessage)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.response,
        id: (Date.now() + 1).toString()
      }])
    } catch (error: any) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: error.response?.data?.error || 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau hoặc kiểm tra kết nối mạng.',
        id: (Date.now() + 1).toString()
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col">
      <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 flex items-center gap-2 transition-colors">
            <span>←</span> Về Dashboard
          </Link>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AI Hỗ Trợ Học Tập
          </h1>
          <div className="w-24"></div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6 flex-1 flex flex-col max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-6 mb-4 border border-gray-200"
        >
          <div className="flex items-center gap-3 mb-2">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Bot className="w-8 h-8 text-blue-600" />
            </motion.div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Trợ lý AI thông minh</h2>
              <p className="text-sm text-gray-600">Đặt câu hỏi và nhận được câu trả lời từ AI</p>
            </div>
          </div>
        </motion.div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg flex-1 flex flex-col border border-gray-200 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                      }`}>
                      {message.role === 'user' ? (
                        <User className="w-5 h-5" />
                      ) : (
                        <Bot className="w-5 h-5" />
                      )}
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-3 ${message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-tr-none'
                        : 'bg-gray-100 text-gray-800 rounded-tl-none border border-gray-200'
                        }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-3 border border-gray-200">
                    <div className="flex items-center gap-2">
                      <LoadingSpinner size="sm" text="" noContainer />
                      <span className="text-gray-600 font-bold uppercase tracking-widest text-[10px]">Đang suy nghĩ...</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50/50">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Nhập câu hỏi của bạn..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                disabled={loading}
              />
              <motion.button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold shadow-lg"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Gửi
                  </>
                )}
              </motion.button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Nhấn Enter để gửi, Shift+Enter để xuống dòng
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
