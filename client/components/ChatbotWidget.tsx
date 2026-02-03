'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Bot, Loader2, Sparkles, MoreHorizontal, Plus, FileText, Book, TrendingUp } from 'lucide-react'
import { aiAPI, API_URL } from '@/lib/api'
import LoadingSpinner from './LoadingSpinner'

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Array<{ role: string; content: string; id: string }>>([
    {
      role: 'assistant',
      content: 'Xin chào! 👋 Tôi là trợ lý AI EduSmart Noitru. Tôi có thể giúp gì cho việc học của bạn hôm nay?',
      id: '1'
    }
  ])
  const [input, setInput] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const userData = sessionStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  const handleSend = async () => {
    if (!input.trim() && !file) return
    if (loading) return

    const userMessage = input.trim()
    const messageId = Date.now().toString()

    // UI Update
    setMessages(prev => [...prev, {
      role: 'user',
      content: file ? `[Tệp: ${file.name}] ${userMessage}` : userMessage,
      id: messageId
    }])

    const currentFile = file
    setInput('')
    setFile(null)
    setLoading(true)

    try {
      let response;
      if (currentFile) {
        const formData = new FormData()
        formData.append('message', userMessage)
        formData.append('file', currentFile)
        response = await aiAPI.chat(formData)
      } else {
        response = await aiAPI.chat(userMessage)
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.response,
        id: (Date.now() + 1).toString()
      }])
    } catch (error: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Xin lỗi, hệ thống đang bận. Bạn vui lòng thử lại sau nhé! 🙏',
        id: (Date.now() + 1).toString()
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) {
            window.dispatchEvent(new CustomEvent('AI_ACCESS_DETECTED'));
          }
        }}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-tr from-blue-600 via-purple-600 to-pink-600 text-white rounded-full shadow-2xl flex items-center justify-center z-50 hover:shadow-blue-500/50 transition-shadow group"
      >
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></span>
        {isOpen ? <X className="w-7 h-7" /> : <MessageCircle className="w-7 h-7" />}

        {/* Tooltip */}
        {!isOpen && (
          <div className="absolute right-full mr-4 bg-white text-gray-800 px-4 py-2 rounded-xl shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-sm font-semibold">
            Hỏi AI ngay! ✨
          </div>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 right-4 md:right-6 w-[calc(100vw-2rem)] md:w-96 h-[600px] max-h-[calc(100vh-8rem)] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col z-50 overflow-hidden font-sans"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Trợ Lý EduSmart Noitru</h3>
                  <div className="flex items-center gap-1.5 opacity-90">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    <span className="text-xs font-medium">Đang hoạt động</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              <div className="text-center text-xs text-gray-400 my-4">Hôm nay</div>

              {messages.map((message) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-2 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white flex-shrink-0 mt-1 shadow-sm">
                        <Sparkles className="w-4 h-4" />
                      </div>
                    )}

                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0 mt-1 bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[10px]">
                        {user?.avatar_url ? (
                          <img
                            src={`${API_URL}${user.avatar_url}`}
                            alt="user"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          user?.username?.charAt(0).toUpperCase() || 'U'
                        )}
                      </div>
                    )}

                    <div
                      className={`rounded-2xl p-3.5 shadow-sm text-sm leading-relaxed ${message.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                        }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start gap-2"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white flex-shrink-0 mt-1 shadow-sm">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="bg-white rounded-2xl rounded-tl-none p-4 shadow-sm border border-gray-100 flex items-center gap-1">
                    <motion.span
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                      className="w-2 h-2 bg-blue-500 rounded-full"
                    />
                    <motion.span
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                      className="w-2 h-2 bg-blue-500 rounded-full"
                    />
                    <motion.span
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                      className="w-2 h-2 bg-blue-500 rounded-full"
                    />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100 space-y-3">
              {file && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="mx-2 p-2 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-2 shadow-sm"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0">
                    {file.name.endsWith('.pdf') ? <FileText className="w-4 h-4" /> :
                      file.name.match(/\.(ppt|pptx)$/) ? <TrendingUp className="w-4 h-4" /> :
                        <Book className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-blue-700 truncate">{file.name}</p>
                    <p className="text-[8px] text-blue-400 uppercase font-black">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button onClick={() => setFile(null)} className="p-1.5 hover:bg-white rounded-lg text-blue-400 hover:text-red-500 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}

              <div className="flex gap-2 items-center bg-gray-50 p-2 rounded-2xl border border-gray-200 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all shadow-sm">
                <label className="p-2 cursor-pointer hover:bg-white rounded-xl text-blue-600 transition-all active:scale-95 group">
                  <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                    className="hidden"
                    accept=".pdf,.txt,.doc,.docx,.ppt,.pptx"
                  />
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Hỏi gì đó hoặc gửi tài liệu..."
                  className="flex-1 bg-transparent px-1 py-1 outline-none text-sm text-gray-700 placeholder-gray-400"
                  disabled={loading}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={loading || (!input.trim() && !file)}
                  className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all shrink-0"
                >
                  {loading ? <LoadingSpinner size="sm" text="" noContainer /> : <Send className="w-4 h-4 ml-0.5" />}
                </motion.button>
              </div>
              <div className="text-center mt-2">
                <p className="text-[10px] text-gray-400">Được hỗ trợ bởi Google Gemini AI</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
