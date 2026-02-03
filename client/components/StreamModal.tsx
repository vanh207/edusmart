'use client'

import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Maximize2, Minimize2, Monitor, User, Info, AlertTriangle, ShieldAlert } from 'lucide-react'
import { API_URL } from '@/lib/api'

interface StreamModalProps {
    isOpen: boolean
    onClose: () => void
    student: any
    lastFrame: string | null
    violations: any[]
}

export default function StreamModal({ isOpen, onClose, student, lastFrame, violations }: StreamModalProps) {
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [imageLoaded, setImageLoaded] = useState(false)

    if (!isOpen || !student) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-950/90 backdrop-blur-xl"
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className={`bg-white rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col relative ${isFullscreen ? 'w-full h-full' : 'max-w-6xl w-full aspect-video md:h-[85vh]'
                        }`}
                >
                    {/* Header */}
                    <div className="bg-white border-b border-slate-100 p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                                <User className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800">{student.username}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                        Livestream trực tiếp • {student.os_info || 'Unknown OS'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsFullscreen(!isFullscreen)}
                                className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-all"
                            >
                                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                            </button>
                            <button
                                onClick={onClose}
                                className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all font-black"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Stream Area */}
                    <div className="flex-1 bg-slate-900 relative overflow-hidden flex items-center justify-center">
                        {lastFrame ? (
                            <img
                                src={lastFrame}
                                className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                                alt={`Screen of ${student.username}`}
                                onLoad={() => setImageLoaded(true)}
                            />
                        ) : (
                            <div className="text-center space-y-4">
                                <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto animate-pulse">
                                    <Monitor className="w-10 h-10 text-slate-700" />
                                </div>
                                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Đang đợi tín hiệu hình ảnh...</p>
                            </div>
                        )}

                        {/* Overlay Info */}
                        <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end pointer-events-none">
                            <div className="bg-slate-950/60 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-white space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Trạng thái tham gia</p>
                                <p className="font-bold text-sm flex items-center gap-2">
                                    {student.participation_status || 'Không hoạt động'}
                                </p>
                            </div>

                            <div className="bg-slate-950/60 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-white space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-orange-400">Địa chỉ IP</p>
                                <p className="font-bold text-sm">{student.ip_address || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Footer / System Details & Violations */}
                    <div className="bg-slate-50 p-6 flex flex-col md:flex-row gap-8 overflow-x-auto min-h-[120px]">
                        <div className="flex-1 flex gap-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-xl shadow-sm">
                                    <Info className="w-4 h-4 text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trình duyệt</p>
                                    <p className="text-xs font-bold text-slate-600">{student.browser_info || 'Unknown'}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-xl shadow-sm">
                                    <AlertTriangle className="w-4 h-4 text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lớp học</p>
                                    <p className="text-xs font-bold text-slate-600">{student.class_name || 'Chưa phân lớp'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Violation History List */}
                        <div className="flex-[2] border-l border-slate-200 pl-8 overflow-y-auto max-h-[150px] scrollbar-hide">
                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <ShieldAlert className="w-3.5 h-3.5" /> Lịch sử vi phạm gần đây ({violations.length})
                            </p>
                            <div className="space-y-2">
                                {violations.length === 0 ? (
                                    <p className="text-xs text-slate-400 font-medium">Chưa ghi nhận vi phạm nào.</p>
                                ) : (
                                    violations.map((v, idx) => (
                                        <div key={v.id || idx} className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-100 shadow-sm transition-all hover:border-red-200">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500 text-[10px] font-black">
                                                    #{v.id || violations.length - idx}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-700">{v.violation_type}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(v.created_at).toLocaleTimeString()}</p>
                                                </div>
                                            </div>
                                            {v.evidence_url && (
                                                <a
                                                    href={`${API_URL}${v.evidence_url}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-tighter hover:bg-blue-100"
                                                >
                                                    Xem Ảnh
                                                </a>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
