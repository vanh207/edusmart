'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowLeft,
    Search,
    BookOpen,
    CheckCircle,
    Clock,
    AlertCircle,
    ChevronRight,
    Filter,
    CheckCircle2,
    XCircle,
    Lightbulb,
    Sparkles,
    Book,
    Trash2
} from 'lucide-react'
import api from '@/lib/api'
import { useToast } from '@/context/ToastContext'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function SmartNotes() {
    const router = useRouter()
    const { toast } = useToast()
    const [notes, setNotes] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all') // 'all', 'pending', 'mastered'
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        fetchNotes()
    }, [])

    const fetchNotes = async () => {
        try {
            const res = await api.get('/user/smart-notes')
            setNotes(res.data)
        } catch (err) {
            console.error('Failed to fetch smart notes', err)
            toast('Không thể tải danh sách sổ tay sửa lỗi.', 'error')
        } finally {
            setLoading(false)
        }
    }

    const updateStatus = async (id: number, status: string) => {
        try {
            await api.patch(`/user/smart-notes/${id}`, { status })
            setNotes(notes.map(n => n.id === id ? { ...n, status } : n))
            if (status === 'mastered') {
                toast('Tuyệt vời! Bạn đã nắm vững kiến thức này. 🎉', 'success')
            }
        } catch (err) {
            toast('Không thể cập nhật trạng thái.', 'error')
        }
    }

    const deleteNote = async (id: number) => {
        if (!confirm('Bạn có chắc chắn muốn xóa ghi chú này?')) return
        setLoading(true)
        try {
            await api.delete(`/user/smart-notes/${id}`)
            setNotes(notes.filter(n => n.id !== id))
            toast('Đã xóa ghi chú thành công.', 'success')
        } catch (err) {
            toast('Không thể xóa ghi chú.', 'error')
        } finally {
            setLoading(false)
        }
    }

    const filteredNotes = notes.filter(n => {
        const matchesFilter = filter === 'all' || n.status === filter
        const matchesSearch = n.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (n.source_title || '').toLowerCase().includes(searchTerm.toLowerCase())
        return matchesFilter && matchesSearch
    })

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <LoadingSpinner size="lg" text="Đang mở sổ tay sửa lỗi..." />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#f8fafc]">
            {/* Header */}
            <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200 sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                            <ArrowLeft className="w-6 h-6 text-slate-600" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Sổ tay sửa lỗi 📓</h1>
                            <p className="text-sm font-medium text-slate-500">Nơi biến sai lầm thành bài học</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm lỗi sai..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                            />
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Tất cả
                            </button>
                            <button
                                onClick={() => setFilter('pending')}
                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${filter === 'pending' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Cần ôn tập
                            </button>
                            <button
                                onClick={() => setFilter('mastered')}
                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${filter === 'mastered' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Đã hiểu
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
                    {filteredNotes.length > 0 ? (
                        <AnimatePresence mode="popLayout">
                            {filteredNotes.map((note, idx) => (
                                <motion.div
                                    key={note.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden group hover:border-blue-300 transition-all"
                                >
                                    <div className="p-8">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${note.status === 'mastered' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                                    {note.status === 'mastered' ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                                                        {note.item_type === 'test' ? 'Bài kiểm tra' : 'Bài luyện tập'} • {new Date(note.created_at).toLocaleDateString()}
                                                    </p>
                                                    <h4 className="font-bold text-slate-800">{note.source_title || 'Nguồn gốc'}</h4>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {note.status === 'pending' ? (
                                                    <button
                                                        onClick={() => updateStatus(note.id, 'mastered')}
                                                        className="px-4 py-2 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-green-100 transition-colors"
                                                    >
                                                        Đã nắm vững
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => updateStatus(note.id, 'pending')}
                                                        className="px-4 py-2 bg-slate-50 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-100 transition-colors"
                                                    >
                                                        Ôn tập lại
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => deleteNote(note.id)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Xóa ghi chú"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Câu hỏi</label>
                                                <p className="font-bold text-slate-800 text-lg">{note.question_text}</p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex flex-col">
                                                    <span className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Bạn đã chọn</span>
                                                    <span className="font-black text-red-700 text-xl">{note.user_answer || '(Trống)'}</span>
                                                </div>
                                                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col">
                                                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Đáp án đúng</span>
                                                    <span className="font-black text-emerald-700 text-xl">{note.correct_answer}</span>
                                                </div>
                                            </div>

                                            {note.ai_explanation && (
                                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100 relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                                    <div className="flex gap-4">
                                                        <div className="bg-white p-3 rounded-full shadow-sm h-fit">
                                                            <Lightbulb className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h5 className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                                <Sparkles className="w-3.5 h-3.5" /> Phân tích thông minh từ AI
                                                            </h5>
                                                            <p className="text-slate-700 leading-relaxed font-medium italic">"{note.ai_explanation}"</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center py-20 px-10 bg-white rounded-[3rem] border-4 border-dashed border-slate-100"
                        >
                            <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <Book className="w-12 h-12" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 mb-2">Chưa có "Ghi chú thông minh" nào</h3>
                            <p className="text-slate-500 font-medium max-w-md mx-auto">
                                Khi bạn làm sai bài tập hoặc bài thi, hệ thống sẽ tự động lưu lại đây để bạn có thể ôn luyện một cách khoa học nhất.
                            </p>
                            <button
                                onClick={() => router.push('/tests')}
                                className="mt-8 px-10 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                            >
                                LÀM BÀI KIỂM TRA NGAY
                            </button>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    )
}
