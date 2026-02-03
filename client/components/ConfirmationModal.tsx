'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

interface ConfirmationModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string
    confirmText: string
    cancelText: string
    icon?: LucideIcon
    variant?: 'danger' | 'warning' | 'info'
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText,
    cancelText,
    icon: Icon,
    variant = 'danger'
}: ConfirmationModalProps) {
    if (!isOpen) return null

    const colors = {
        danger: {
            bg: 'bg-rose-50 dark:bg-rose-500/10',
            icon: 'text-rose-500',
            button: 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'
        },
        warning: {
            bg: 'bg-amber-50 dark:bg-amber-500/10',
            icon: 'text-amber-500',
            button: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
        },
        info: {
            bg: 'bg-indigo-50 dark:bg-indigo-500/10',
            icon: 'text-indigo-500',
            button: 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20'
        }
    }

    const { bg, icon: iconColor, button } = colors[variant]

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden p-8 flex flex-col items-center text-center border border-white/20"
                    >
                        {/* Icon Header */}
                        <div className={`w-20 h-20 ${bg} rounded-full flex items-center justify-center mb-6`}>
                            {Icon && <Icon className={`w-10 h-10 ${iconColor}`} />}
                        </div>

                        {/* Text Content */}
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3">
                            {title}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 font-bold leading-relaxed mb-8 px-2 text-sm">
                            {message}
                        </p>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-4 w-full">
                            <button
                                onClick={onClose}
                                className="py-4 px-6 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-black rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-95 uppercase tracking-widest text-xs"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={() => {
                                    onConfirm()
                                    onClose()
                                }}
                                className={`py-4 px-6 ${button} text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 uppercase tracking-widest text-xs`}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
