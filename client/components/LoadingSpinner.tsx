'use client'

import { motion } from 'framer-motion'

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg' | 'xl'
    color?: string
    text?: string
    className?: string
    noContainer?: boolean
}

export default function LoadingSpinner({
    size = 'md',
    color = 'blue',
    text = 'Đang tải dữ liệu...',
    className = '',
    noContainer = false
}: LoadingSpinnerProps) {
    const sizeMap = {
        sm: 'w-6 h-6',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
        xl: 'w-24 h-24'
    }

    const borderMap = {
        sm: 'border-2',
        md: 'border-4',
        lg: 'border-4',
        xl: 'border-8'
    }

    const spinnerContent = (
        <div className={`relative ${sizeMap[size]} ${className}`}>
            {/* outer ring */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className={`absolute inset-0 rounded-full ${borderMap[size]} border-transparent border-t-${color}-500 border-l-${color}-500/30 opacity-80`}
            />

            {/* inner ring - reverse rotation */}
            <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className={`absolute inset-2 rounded-full ${borderMap[size]} border-transparent border-b-purple-500 border-r-purple-500/30 opacity-60`}
            />

            {/* glowing core */}
            <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className={`absolute inset-0 rounded-full bg-${color}-500/10 blur-xl`}
            />
        </div>
    )

    if (noContainer) return spinnerContent

    return (
        <div className="flex flex-col items-center justify-center gap-4 py-10">
            {spinnerContent}

            {text && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em]"
                >
                    {text}
                </motion.p>
            )}
        </div>
    )
}
