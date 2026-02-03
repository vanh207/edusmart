'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, X, Check, ExternalLink, Calendar } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import api from '@/lib/api'

interface Notification {
    id: number
    title: string
    message: string
    type: 'info' | 'success' | 'warning' | 'error'
    link: string | null
    is_read: number
    created_at: string
}

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetchNotifications()
        const interval = setInterval(fetchNotifications, 60000) // Poll every 60s
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications')
            setNotifications(res.data)
            setUnreadCount(res.data.filter((n: Notification) => n.is_read === 0).length)
        } catch (err) {
            console.error('Error fetching notifications:', err)
        }
    }

    const markAsRead = async (id: number) => {
        try {
            await api.post(`/notifications/read/${id}`)
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n))
            setUnreadCount(prev => Math.max(0, prev - 1))
        } catch (err) {
            console.error('Error marking notification as read:', err)
        }
    }

    const getTypeStyle = (type: string) => {
        switch (type) {
            case 'success':
                return 'bg-emerald-50 text-emerald-600 border-emerald-100'
            case 'warning':
                return 'bg-amber-50 text-amber-600 border-amber-100'
            case 'error':
                return 'bg-rose-50 text-rose-600 border-rose-100'
            default:
                return 'bg-blue-50 text-blue-600 border-blue-100'
        }
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString([], { day: '2-digit', month: '2-digit' })
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-400 hover:text-blue-600 hover:bg-white hover:shadow-md transition-all group"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-bounce">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-4 w-80 md:w-96 bg-white rounded-[2rem] shadow-2xl border border-gray-100 z-[70] overflow-hidden"
                    >
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Thông báo</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Cập nhật mới nhất của bạn</p>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-gray-50 rounded-xl text-gray-400"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-10 text-center">
                                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-300">
                                        <Bell className="w-8 h-8" />
                                    </div>
                                    <p className="text-gray-400 font-bold text-sm">Chưa có thông báo nào</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {notifications.map((n) => (
                                        <div
                                            key={n.id}
                                            className={`p-5 hover:bg-blue-50/50 transition-all group/item ${n.is_read === 0 ? 'bg-blue-50/20' : ''}`}
                                        >
                                            <div className="flex gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${getTypeStyle(n.type)}`}>
                                                    <Bell className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h4 className="text-sm font-bold text-gray-900 leading-tight pr-4">{n.title}</h4>
                                                        {n.is_read === 0 && (
                                                            <button
                                                                onClick={() => markAsRead(n.id)}
                                                                className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all hover:bg-emerald-100"
                                                                title="Đánh dấu đã đọc"
                                                            >
                                                                <Check className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 font-medium leading-relaxed mb-3">
                                                        {n.message}
                                                    </p>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] text-gray-400 font-black flex items-center gap-1 uppercase tracking-widest">
                                                            <Calendar className="w-3 h-3" />
                                                            {formatTime(n.created_at)}
                                                        </span>
                                                        {n.link && (
                                                            <Link
                                                                href={n.link}
                                                                onClick={() => {
                                                                    markAsRead(n.id)
                                                                    setIsOpen(false)
                                                                }}
                                                                className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all p-1"
                                                            >
                                                                Xem ngay <ExternalLink className="w-3 h-3" />
                                                            </Link>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                            <Link
                                href="/profile"
                                onClick={() => setIsOpen(false)}
                                className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-blue-600 transition-all"
                            >
                                Quản lý tất cả thông báo
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
