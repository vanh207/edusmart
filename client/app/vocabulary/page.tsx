'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Book, Search, ArrowLeft, Volume2, X, Sparkles, GraduationCap, ChevronRight, Mic, Flame } from 'lucide-react'
import { vocabularyAPI, userAPI, API_URL } from '@/lib/api'
import ChatbotWidget from '@/components/ChatbotWidget'
import FilterBar from '@/components/FilterBar'
import StudentStatusHeader from '@/components/StudentStatusHeader'
import NotificationBell from '@/components/NotificationBell'
import ThemeToggle from '@/components/ThemeToggle'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useToast } from '@/context/ToastContext'

// Định nghĩa interface cho Typescript
interface VocabularyWord {
  id: number | string;
  word: string;
  meaning: string;
  type: string;
  pronunciation?: string;
  phonetic?: string;
  example?: string;
  grade_level?: string;
}

interface PronunciationResult {
  text: string;
  score: number;
  match: boolean;
  feedback: string;
}

interface WritingResult {
  correct: boolean;
  feedback: string;
}

export default function Vocabulary() {
  const router = useRouter()
  const { toast } = useToast()
  const [vocabulary, setVocabulary] = useState<VocabularyWord[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  // Các state hỗ trợ luyện tập
  const [selectedWord, setSelectedWord] = useState<VocabularyWord | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [pronunciationResult, setPronunciationResult] = useState<PronunciationResult | null>(null)
  const [writingInput, setWritingInput] = useState('')
  const [writingResult, setWritingResult] = useState<WritingResult | null>(null)

  const [filters, setFilters] = useState({
    grade_level: '',
    subject: '',
    search: '',
    type: 'speaking'
  })

  useEffect(() => {
    const token = sessionStorage.getItem('token')
    if (!token) {
      router.push('/login/student')
      return
    }

    const fetchData = async () => {
      try {
        const [profileRes, vocabRes] = await Promise.all([
          userAPI.getProfile(),
          vocabularyAPI.getAll(filters)
        ])
        setUser(profileRes.data)

        let data = vocabRes.data
        if (filters.search) {
          data = data.filter((v: any) =>
            v.word.toLowerCase().includes(filters.search.toLowerCase()) ||
            v.meaning.toLowerCase().includes(filters.search.toLowerCase())
          )
        }
        if (filters.type) {
          data = data.filter((v: any) => filters.type === 'speaking' ? (v.type === 'reading' || v.type === 'speaking') : v.type === filters.type)
        }
        setVocabulary(data)
      } catch (err) {
        console.error('Failed to load data', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [filters, router])

  // 1. Hàm đọc từ (Text to Speech)
  const speakWord = (text: string) => {
    if ('speechSynthesis' in window) {
      // Hủy các lần đọc trước đó để tránh dồn toa
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } else {
      toast?.("Trình duyệt của bạn không hỗ trợ đọc văn bản.", "error");
    }
  }

  // 2. Hàm xử lý thu âm (Web Speech API)
  const startListening = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast?.("Trình duyệt không hỗ trợ nhận diện giọng nói.", "error");
      return;
    }

    try {
      // Yêu cầu quyền truy cập Micro của hệ thống một cách tường minh
      console.log("🎤 Requesting microphone permission...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Sau khi được cấp quyền, ta có thể dừng stream này ngay để SpeechRecognition tự quản lý
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.error("Mic permission denied:", err);
      toast?.("Vui lòng cho phép trình duyệt truy cập Micro để sử dụng tính năng này.", "error");
      return;
    }

    setIsListening(true);
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();

    recognition.onresult = (event: any) => {
      const speechResult = event.results[0][0].transcript;
      const confidence = event.results[0][0].confidence;

      const isMatch = speechResult.toLowerCase().includes(selectedWord?.word.toLowerCase() || '');
      const score = Math.round(confidence * 100);

      setPronunciationResult({
        text: speechResult,
        score: isMatch ? (score < 80 ? 85 : score) : score,
        match: isMatch,
        feedback: isMatch ? "Phát âm rất tốt! Bạn đã nói đúng từ này." : "Hãy thử lại, chú ý cách phát âm các âm tiết nhé."
      });
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error(event.error);
      setIsListening(false);
      toast?.("Không thể nhận diện giọng nói. Hãy kiểm tra Micro của bạn.", "error");
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  }

  // 3. Hàm kiểm tra bài viết (Writing)
  const handleCheckWriting = () => {
    if (!selectedWord) return;

    const isCorrect = writingInput.trim().toLowerCase() === selectedWord.word.toLowerCase();

    setWritingResult({
      correct: isCorrect,
      feedback: isCorrect
        ? "Xuất sắc! Bạn đã nhớ chính xác từ vựng."
        : `Rất tiếc, từ đúng phải là "${selectedWord.word}". Hãy thử lại nhé!`
    });
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-foreground transition-colors duration-300">
      {/* Nav */}
      <nav className="bg-card border-b border-border sticky top-0 z-30">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 hover:bg-muted rounded-xl transition-colors">
              <ArrowLeft className="w-6 h-6 text-muted-foreground" />
            </Link>
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-foreground tracking-tight leading-none mb-1">Kho Từ Vựng 🔤</h1>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none">Mở rộng vốn từ mỗi ngày</p>
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
        <FilterBar onFilterChange={(newFilters: any) => setFilters(prev => ({ ...prev, ...newFilters }))} initialFilters={{ subject: '' }} />

        <div className="flex justify-center gap-4 mb-12">
          {/* Content Type Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setFilters({ ...filters, type: 'speaking' })
                setSelectedWord(null)
              }}
              className={`px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${filters.type === 'speaking'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
                }`}
            >
              <Volume2 className="w-4 h-4" />
              Luyện Nói
            </button>
            <button
              onClick={() => {
                setFilters({ ...filters, type: 'writing' })
                setSelectedWord(null)
              }}
              className={`px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${filters.type === 'writing'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
                }`}
            >
              <Book className="w-4 h-4" />
              Luyện Viết
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner size="lg" text="Đang sắp xếp thẻ từ vựng..." />
        ) : vocabulary.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] p-16 text-center shadow-sm border border-slate-100">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-xl font-black text-slate-800">Chưa có từ vựng nào</h3>
            <p className="text-slate-400 mt-2 font-medium">Hãy thử lọc theo khối lớp khác bài học nhé.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {vocabulary.map((word, idx) => (
              <motion.div
                key={word.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.03 }}
                whileHover={{ y: -5 }}
                className="bg-white rounded-[2rem] p-6 border border-slate-100 cursor-pointer group transition-all shadow-sm hover:shadow-xl hover:shadow-blue-500/5"
                onClick={() => {
                  setSelectedWord(word)
                  setPronunciationResult(null)
                  setWritingResult(null)
                  setWritingInput('')
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Book className="w-6 h-6" />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      speakWord(word.word)
                    }}
                    className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                    title="Phát âm"
                  >
                    <Volume2 className="w-6 h-6" />
                  </button>
                </div>

                <h3 className="text-2xl font-black text-slate-900 mb-1 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{word.word}</h3>
                {(word.pronunciation || word.phonetic) && (
                  <p className="text-slate-400 text-sm font-bold mb-4 italic">
                    {(() => {
                      const ipa = (word.pronunciation || word.phonetic || '').trim();
                      if (ipa.startsWith('/') && ipa.endsWith('/')) return ipa;
                      return `/${ipa}/`;
                    })()}
                  </p>
                )}

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-50 group-hover:bg-white group-hover:border-blue-100 transition-all">
                  <p className="text-slate-700 font-bold">{word.meaning}</p>
                  {word.example && (
                    <p className="text-[11px] text-slate-400 font-medium mt-2 leading-relaxed italic line-clamp-2">
                      VD: {word.example}
                    </p>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                    <GraduationCap className="w-3 h-3" /> {word.grade_level?.replace('_', ' ')}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-blue-500 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Modal Chi tiết Word & AI Pronunciation */}
        <AnimatePresence>
          {selectedWord && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => setSelectedWord(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                className="bg-white rounded-[3rem] p-10 max-w-lg w-full relative shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Decorative Elements */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/5 rounded-full blur-2xl"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl"></div>

                <button
                  onClick={() => setSelectedWord(null)}
                  className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="relative z-10">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest mb-6 ${filters.type === 'writing' ? 'bg-purple-50 border-purple-100 text-purple-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                    <Sparkles className="w-3 h-3" /> {filters.type === 'writing' ? 'Writing Practice' : 'AI Pronunciation'}
                  </div>

                  {filters.type === 'writing' ? (
                    // WRITING MODE UI
                    <div className="space-y-6">
                      <div className="text-center">
                        <label className="block text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-3">Ý nghĩa từ vựng</label>
                        <h2 className="text-3xl font-black text-slate-800 leading-tight mb-2">{selectedWord.meaning}</h2>
                        {(selectedWord.pronunciation || selectedWord.phonetic) && (
                          <p className="text-blue-600/50 font-medium italic text-lg">
                            {(() => {
                              const ipa = (selectedWord.pronunciation || selectedWord.phonetic || '').trim();
                              if (ipa.startsWith('/') && ipa.endsWith('/')) return ipa;
                              return `/${ipa}/`;
                            })()}
                          </p>
                        )}

                        {/* Reveal Word if Correct or checking */}
                        {writingResult && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                            <p className={`text-4xl font-black uppercase tracking-wider ${writingResult.correct ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {selectedWord.word}
                            </p>
                          </motion.div>
                        )}

                        {!writingResult ? (
                          <div className="relative">
                            <input
                              type="text"
                              value={writingInput}
                              onChange={(e) => setWritingInput(e.target.value)}
                              placeholder="Nhập từ tiếng Anh..."
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-center text-xl font-bold focus:border-purple-500 focus:outline-none transition-all placeholder:text-slate-300 uppercase"
                              onKeyDown={(e) => e.key === 'Enter' && handleCheckWriting()}
                            />
                          </div>
                        ) : (
                          <div className={`p-4 rounded-2xl border ${writingResult.correct ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                            <p className="font-bold text-lg">{writingResult.correct ? 'Chính xác! 🎉' : 'Chưa chính xác'}</p>
                            <p className="text-sm mt-1">{writingResult.feedback}</p>
                          </div>
                        )}
                      </div>

                      {!writingResult ? (
                        <button
                          onClick={handleCheckWriting}
                          disabled={!writingInput.trim() || loading}
                          className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black text-lg hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                        >
                          {loading ? 'Đang kiểm tra...' : 'KIỂM TRA'}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setWritingInput('')
                            setWritingResult(null)
                          }}
                          className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-lg hover:bg-slate-200 transition-all active:scale-95"
                        >
                          THỬ LẠI
                        </button>
                      )}
                    </div>
                  ) : (
                    // READING/SPEAKING MODE UI
                    <>
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h2 className="text-5xl font-black text-slate-900 tracking-tighter uppercase">{selectedWord.word}</h2>
                          {(selectedWord.pronunciation || selectedWord.phonetic) && (
                            <p className="text-xl text-slate-400 font-bold italic mt-2">
                              {(() => {
                                const ipa = (selectedWord.pronunciation || selectedWord.phonetic || '').trim();
                                if (ipa.startsWith('/') && ipa.endsWith('/')) return ipa;
                                return `/${ipa}/`;
                              })()}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => speakWord(selectedWord.word)}
                          className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-700 rounded-3xl text-white flex items-center justify-center shadow-xl shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all"
                        >
                          <Volume2 className="w-10 h-10" />
                        </button>
                      </div>

                      {pronunciationResult && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`mb-8 p-6 rounded-[2rem] border ${pronunciationResult.match
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                            : 'bg-red-50 border-red-100 text-red-700'
                            }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest">Bạn đã nói:</span>
                            <span className={`text-xl font-black ${pronunciationResult.score >= 80 ? 'text-emerald-600' : 'text-red-500'}`}>{pronunciationResult.score}/100</span>
                          </div>
                          <p className="text-2xl font-black">"{pronunciationResult.text}"</p>
                          <div className="mt-4 p-4 bg-white/50 rounded-xl">
                            <p className="text-sm font-bold opacity-90 flex gap-2">
                              <Sparkles className="w-4 h-4 mt-0.5" />
                              <span>{pronunciationResult.feedback}</span>
                            </p>
                          </div>
                        </motion.div>
                      )}

                      <div className="space-y-8">
                        <button
                          onClick={startListening}
                          disabled={isListening}
                          className={`w-full py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-4 transition-all shadow-xl ${isListening
                            ? 'bg-rose-500 text-white animate-pulse'
                            : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20 active:scale-95'
                            }`}
                        >
                          {isListening ? (
                            <>
                              <Mic className="w-8 h-8 animate-bounce" />
                              <span>Đang lắng nghe...</span>
                            </>
                          ) : (
                            <>
                              <Mic className="w-8 h-8" />
                              <span>BẬT MIC ĐỂ LUYỆN NÓI</span>
                            </>
                          )}
                        </button>

                        <div>
                          <label className="block text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-3">Ý nghĩa chính</label>
                          <p className="text-2xl font-black text-slate-800 leading-tight">{selectedWord.meaning}</p>
                        </div>

                        {selectedWord.example && (
                          <div>
                            <label className="block text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-3">Ví dụ minh họa</label>
                            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 italic relative group">
                              <p className="text-slate-600 text-lg font-medium leading-relaxed">"{selectedWord.example}"</p>
                              <div className="w-1 h-0 group-hover:h-full bg-blue-500 absolute left-0 top-0 transition-all rounded-full"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <ChatbotWidget />
    </div>
  )
}
