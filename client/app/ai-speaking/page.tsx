'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Mic,
    Volume2,
    ArrowLeft,
    Sparkles,
    CheckCircle2,
    AlertCircle,
    RotateCcw,
    StopCircle,
    Globe,
    Languages
} from 'lucide-react'
import api from '@/lib/api'
import ThemeToggle from '@/components/ThemeToggle'
import LoadingSpinner from '@/components/LoadingSpinner'

// Types for Web Speech API
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
}

export default function AISpeakingPage() {
    const router = useRouter()

    // --- STATE QUẢN LÝ ---
    const [isListening, setIsListening] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)

    const [transcript, setTranscript] = useState('')
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', content: string }[]>([])
    const [feedback, setFeedback] = useState<{ text: string, corrected: string } | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Voice & Language State
    const [recognitionLang, setRecognitionLang] = useState<'vi-VN' | 'en-US'>('vi-VN')
    const [voiceVN, setVoiceVN] = useState<SpeechSynthesisVoice | null>(null)
    const [voiceEN, setVoiceEN] = useState<SpeechSynthesisVoice | null>(null)

    // Refs
    const recognitionRef = useRef<any>(null)
    const synthesisRef = useRef<SpeechSynthesis | null>(null)
    const chatHistoryRef = useRef(chatHistory)
    const isListeningRef = useRef(isListening)

    // Sync refs
    useEffect(() => { chatHistoryRef.current = chatHistory }, [chatHistory])
    useEffect(() => { isListeningRef.current = isListening }, [isListening])

    // --- HELPER: DETECT VIETNAMESE ---
    const isVietnameseText = (text: string) => {
        // Kiểm tra các ký tự đặc trưng của tiếng Việt
        const vietnameseRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
        return vietnameseRegex.test(text);
    }

    // --- KHỞI TẠO ---
    useEffect(() => {
        // 1. Setup Speech Recognition
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition()
            recognitionRef.current.continuous = false
            recognitionRef.current.interimResults = true
            recognitionRef.current.maxAlternatives = 1

            recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
                const current = event.resultIndex
                const result = event.results[current][0].transcript
                setTranscript(result)

                if (event.results[current].isFinal) {
                    stopListening(false) // Tắt mic tạm thời để xử lý
                    processVoiceInput(result)
                }
            }

            recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
                if (event.error === 'no-speech' || event.error === 'aborted') {
                    if (event.error === 'no-speech' && isListeningRef.current) {
                        stopListening(true)
                    }
                    return;
                }
                console.error('Mic Error:', event.error)
                setError('Không nghe rõ. Hãy thử lại gần mic hơn.')
                setIsListening(false)
            }

            recognitionRef.current.onend = () => {
                setIsListening(false)
            }
        }

        // 2. Setup Speech Synthesis (TTS)
        synthesisRef.current = window.speechSynthesis

        const loadVoices = () => {
            if (!synthesisRef.current) return
            const allVoices = synthesisRef.current.getVoices()

            if (allVoices.length > 0) {
                // Tìm giọng Việt Nam tốt nhất (Ưu tiên Google -> Microsoft -> Bất kỳ)
                const vn = allVoices.find(v => v.lang.includes('vi') && v.name.includes('Google')) ||
                    allVoices.find(v => v.lang.includes('vi')) ||
                    null;

                // Tìm giọng Anh Mỹ tốt nhất (Ưu tiên Google US -> Microsoft US -> Bất kỳ EN)
                const en = allVoices.find(v => v.lang === 'en-US' && v.name.includes('Google')) ||
                    allVoices.find(v => v.lang.includes('en-US')) ||
                    allVoices.find(v => v.lang.includes('en')) ||
                    null;

                setVoiceVN(vn)
                setVoiceEN(en)
            }
        }

        loadVoices()
        if (synthesisRef.current.onvoiceschanged !== undefined) {
            synthesisRef.current.onvoiceschanged = loadVoices
        }

        return () => {
            if (recognitionRef.current) recognitionRef.current.abort()
            if (synthesisRef.current) synthesisRef.current.cancel()
        }
    }, [])

    // Update Mic Lang
    useEffect(() => {
        if (recognitionRef.current) {
            recognitionRef.current.lang = recognitionLang
        }
    }, [recognitionLang])

    // --- ACTION HANDLERS ---

    const startListening = () => {
        if (!recognitionRef.current) {
            setError('Trình duyệt không hỗ trợ.')
            return
        }

        if (synthesisRef.current?.speaking) {
            synthesisRef.current.cancel()
            setIsSpeaking(false)
        }

        setError(null)
        setTranscript('')
        setFeedback(null)

        try {
            recognitionRef.current.start()
            setIsListening(true)
        } catch (e) {
            // Ignore if already started
        }
    }

    const stopListening = (manual: boolean = true) => {
        setIsListening(false)
        if (recognitionRef.current) {
            try { recognitionRef.current.stop() } catch (e) { }
        }
    }

    const processVoiceInput = async (text: string) => {
        if (!text.trim()) return
        setIsProcessing(true)

        try {
            const response = await api.post('/ai/speaking-chat', {
                message: text,
                conversation_history: chatHistoryRef.current
            })

            const data = response.data

            setChatHistory(prev => [
                ...prev,
                { role: 'user', content: text },
                { role: 'ai', content: data.ai_response }
            ])

            if (data.feedback || data.corrected_text) {
                setFeedback({
                    text: data.feedback,
                    corrected: data.corrected_text
                })
            }

            // AI SPEAK: Tự động chọn ngôn ngữ dựa trên nội dung trả về
            speak(data.ai_response)

        } catch (err: any) {
            console.error('API Error:', err)
            setError('Lỗi kết nối AI.')
        } finally {
            setIsProcessing(false)
        }
    }

    const speak = (text: string) => {
        if (!text || !synthesisRef.current) return

        synthesisRef.current.cancel()
        const utterance = new SpeechSynthesisUtterance(text)

        // AUTO-SWITCH VOICE LOGIC
        // Nếu văn bản có ký tự tiếng Việt -> Dùng giọng VN. Ngược lại dùng giọng Anh.
        const isVN = isVietnameseText(text);
        const targetVoice = isVN ? voiceVN : voiceEN;

        if (targetVoice) {
            utterance.voice = targetVoice;
            // Tinh chỉnh tốc độ: Tiếng Việt đọc nhanh hơn chút cho tự nhiên
            utterance.rate = isVN ? 1.1 : 1.0;
            utterance.pitch = 1.0;
        }

        utterance.onstart = () => setIsSpeaking(true)

        utterance.onend = () => {
            setIsSpeaking(false)
            // Tự động bật lại mic sau 0.5s để hội thoại liên tục
            setTimeout(() => {
                startListening()
            }, 500)
        }

        utterance.onerror = () => setIsSpeaking(false)

        synthesisRef.current.speak(utterance)
    }

    const resetConversation = () => {
        setChatHistory([])
        setTranscript('')
        setFeedback(null)
        setError(null)
        if (synthesisRef.current) synthesisRef.current.cancel()
        stopListening(true)
    }

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-blue-500/30">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
                <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-3 hover:bg-muted rounded-2xl transition-all active:scale-95 group"
                        >
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div className="flex flex-col">
                            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-blue-500 fill-blue-500/20" />
                                Giáo viên AI
                            </h1>
                            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground mt-1">
                                <Languages className="w-3 h-3" />
                                <span>{voiceVN ? 'VN Voice Ready' : ''} {voiceVN && voiceEN ? '•' : ''} {voiceEN ? 'EN Voice Ready' : ''}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Language Toggle for MIC */}
                        <button
                            onClick={() => setRecognitionLang(prev => prev === 'vi-VN' ? 'en-US' : 'vi-VN')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border ${recognitionLang === 'vi-VN'
                                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                }`}
                            title="Ngôn ngữ bạn sẽ nói"
                        >
                            <Globe className="w-3 h-3" />
                            {recognitionLang === 'vi-VN' ? 'MIC: Tiếng Việt' : 'MIC: English'}
                        </button>

                        <ThemeToggle />
                        <button onClick={resetConversation} className="p-3 hover:bg-muted rounded-2xl transition-all"><RotateCcw className="w-5 h-5" /></button>
                    </div>
                </div>
            </header>

            <main className="pt-32 pb-40 px-4 max-w-4xl mx-auto">
                {/* Visualizer */}
                <div className="relative aspect-[16/9] md:aspect-[21/9] bg-muted/30 border border-border/50 rounded-[2.5rem] overflow-hidden mb-12 flex items-center justify-center group shadow-2xl shadow-blue-500/5 transition-all">
                    {/* Ripple */}
                    <AnimatePresence>
                        {(isListening || isSpeaking || isProcessing) && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 2.5, opacity: 0.8 }}
                                    exit={{ scale: 3, opacity: 0 }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                                    className={`absolute w-32 h-32 rounded-full border ${isListening ? (recognitionLang === 'vi-VN' ? 'border-red-500/30 bg-red-500/5' : 'border-blue-500/30 bg-blue-500/5') :
                                        isProcessing ? 'border-yellow-500/30 bg-yellow-500/5' :
                                            'border-purple-500/30 bg-purple-500/5'}`}
                                />
                            </div>
                        )}
                    </AnimatePresence>

                    {/* Status Icon & Text */}
                    <div className="relative z-10 flex flex-col items-center">
                        <motion.div
                            animate={(isSpeaking || isProcessing) ? { scale: [1, 1.1, 1] } : {}}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 ${isListening ? (recognitionLang === 'vi-VN' ? 'bg-red-500 text-white' : 'bg-blue-600 text-white') :
                                isSpeaking ? 'bg-purple-600 text-white' :
                                    isProcessing ? 'bg-yellow-500 text-white' :
                                        'bg-muted text-muted-foreground'
                                }`}
                        >
                            {isListening ? <Mic className="w-10 h-10" /> :
                                isSpeaking ? <Volume2 className="w-10 h-10" /> :
                                    isProcessing ? <Sparkles className="w-10 h-10 animate-pulse text-yellow-200" /> :
                                        <Mic className="w-10 h-10 opacity-50" />}
                        </motion.div>

                        <div className="mt-8 text-center space-y-2">
                            {isProcessing && <div className="mb-4 flex justify-center"><LoadingSpinner size="sm" text="" noContainer /></div>}
                            <p className="font-black uppercase tracking-widest text-sm">
                                {isListening ? `Đang nghe (${recognitionLang === 'vi-VN' ? 'Tiếng Việt' : 'English'})` :
                                    isProcessing ? 'Đang suy nghĩ...' :
                                        isSpeaking ? 'AI đang nói...' : 'Sẵn sàng'}
                            </p>
                            {/* Hiển thị transcript thời gian thực */}
                            <AnimatePresence>
                                {isListening && transcript && (
                                    <motion.p
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="text-lg font-medium text-foreground/80 max-w-md mx-auto line-clamp-1"
                                    >
                                        "{transcript}"
                                    </motion.p>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Chat Interface */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                    <div className="md:col-span-2 space-y-6">
                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-hide pb-20">
                            <AnimatePresence mode="popLayout">
                                {chatHistory.length === 0 ? (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 bg-muted/20 border border-dashed border-border rounded-3xl">
                                        <p className="text-muted-foreground font-bold">Nhấn mic và nói "Hello" hoặc "Xin chào"!</p>
                                    </motion.div>
                                ) : (
                                    chatHistory.map((msg, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`max-w-[85%] p-4 px-6 rounded-[2rem] font-medium leading-relaxed shadow-sm ${msg.role === 'user'
                                                ? 'bg-primary text-primary-foreground rounded-tr-none'
                                                : 'bg-card border border-border rounded-tl-none'
                                                }`}>
                                                {msg.content}
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <AnimatePresence mode="wait">
                            {feedback && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-card border border-border rounded-[2rem] p-6 shadow-lg"
                                >
                                    <div className="flex gap-3 mb-3">
                                        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl h-fit"><Sparkles className="w-5 h-5" /></div>
                                        <div>
                                            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-1">Góp ý</h3>
                                            <p className="text-sm font-medium">{feedback.text}</p>
                                        </div>
                                    </div>
                                    {feedback.corrected && (
                                        <div className="mt-3 p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                                            <p className="text-xs font-black uppercase text-green-600 mb-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Câu chuẩn</p>
                                            <p className="text-sm font-bold text-green-700 dark:text-green-400">"{feedback.corrected}"</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {error && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-xs font-bold text-center">{error}</div>}
                    </div>
                </div>
            </main>

            {/* Bottom Controls */}
            <div className="fixed bottom-0 left-0 right-0 p-6 z-50 pointer-events-none">
                <div className="flex justify-center pointer-events-auto">
                    <button
                        onClick={isListening ? () => stopListening(true) : startListening}
                        disabled={isProcessing}
                        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-2xl active:scale-95 ${isListening ? 'bg-red-500 text-white hover:bg-red-600 ring-4 ring-red-500/30' :
                            isProcessing ? 'bg-muted text-muted-foreground' :
                                'bg-blue-600 text-white hover:bg-blue-700 ring-4 ring-blue-500/30'
                            }`}
                    >
                        {isListening ? <StopCircle className="w-8 h-8" /> :
                            isProcessing ? <Sparkles className="w-8 h-8 animate-pulse" /> :
                                <Mic className="w-8 h-8" />}
                    </button>
                </div>
            </div>

            <style jsx global>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    )
}
