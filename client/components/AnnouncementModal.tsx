'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Bell, CheckCircle2 } from 'lucide-react'

interface AnnouncementModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (e: React.FormEvent) => void
    formData: {
        title: string
        content: string
        type: string
        target_role: string
        expires_at: string
    }
    setFormData: (data: any) => void
    loading: boolean
}

export default function AnnouncementModal({
    isOpen,
    onClose,
    onSubmit,
    formData,
    setFormData,
    loading
}: AnnouncementModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-10 max-w-2xl w-full relative border border-blue-100 dark:border-slate-800"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-8 right-8 p-3 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-2xl text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="flex items-center gap-5 mb-10">
                            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
                                <Bell className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">Đăng Thông Báo Mới</h3>
                                <p className="text-gray-400 font-medium">Gửi thông tin tới cộng đồng người dùng</p>
                            </div>
                        </div>

                        <form onSubmit={onSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Tiêu đề thông báo</label>
                                <input
                                    type="text"
                                    className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold text-foreground"
                                    placeholder="VD: Thông báo bảo trì hệ thống"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Nội dung chi tiết</label>
                                <textarea
                                    rows={4}
                                    className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-medium resize-none text-foreground"
                                    placeholder="Nhập nội dung thông báo..."
                                    value={formData.content}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Đối tượng nhận</label>
                                    <select
                                        className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl font-bold text-foreground"
                                        value={formData.target_role}
                                        onChange={e => setFormData({ ...formData, target_role: e.target.value })}
                                    >
                                        <option value="all">Tất cả người dùng</option>
                                        <option value="student">Chỉ học sinh</option>
                                        <option value="teacher">Chỉ giáo viên</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Loại thông báo</label>
                                    <select
                                        className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl font-bold text-foreground"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="info">Thông tin (Info)</option>
                                        <option value="warning">Cảnh báo (Warning)</option>
                                        <option value="error">Quan trọng (Critical)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Ngày hết hạn (Tuỳ chọn)</label>
                                <input
                                    type="date"
                                    className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl font-bold text-foreground"
                                    value={formData.expires_at}
                                    onChange={e => setFormData({ ...formData, expires_at: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-4 bg-gray-50 dark:bg-slate-800 text-gray-500 rounded-2xl font-black text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-all"
                                >
                                    HỦY BỎ
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {loading ? 'ĐANG ĐĂNG...' : (
                                        <>
                                            <CheckCircle2 className="w-6 h-6" />
                                            ĐĂNG THÔNG BÁO
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
