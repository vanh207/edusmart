'use client'

import { ShieldCheck, ShieldAlert, Wifi, WifiOff } from 'lucide-react'

interface AIStatusBadgeProps {
    isProctoringEnabled: boolean | null
    isConnected: boolean
    compact?: boolean
}

export default function AIStatusBadge({ isProctoringEnabled, isConnected, compact = false }: AIStatusBadgeProps) {
    // Determine status text and colors based on 3-state requirement
    let statusText = 'Đang kết nối'
    let statusColor = 'bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-400'
    let Icon = WifiOff

    if (isConnected) {
        statusText = 'Kết nối'
        statusColor = 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400'
        Icon = Wifi
    } else {
        // Not connected can be 'Đang kết nối' or 'Không kết nối'
        // If we have an error or it's been idle, we show 'Không kết nối'
        // For simplicity, we'll use isConnected as the primary driver
        statusText = 'Không kết nối'
        statusColor = 'bg-red-50 border-red-100 text-red-600 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400'
        Icon = ShieldAlert
    }

    // Overwrite for 'Đang kết nối' if it's explicitly in that state (e.g., socket connecting)
    // We'll use a local state or just infer from isConnected = false but no error
    // For now, let's keep it simple: 
    // isConnected ? 'Kết nối' : 'Không kết nối'
    // We'll add 'Đang kết nối' during the initial load
    if (!isConnected && isProctoringEnabled === null) {
        statusText = 'Đang kết nối'
        statusColor = 'bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-400'
        Icon = WifiOff
    }

    if (compact) {
        return (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-500 ${statusColor}`}>
                <Icon className={`w-3.5 h-3.5 ${isConnected ? 'animate-pulse' : ''}`} />
                <span className="text-[10px] font-black uppercase tracking-tight">
                    {statusText}
                </span>
            </div>
        )
    }

    return (
        <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all duration-500 ${statusColor}`}>
            <div className="relative">
                <Icon className={`w-4 h-4 ${isConnected ? 'animate-pulse' : ''}`} />
                {isConnected && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                )}
            </div>

            <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-tighter leading-none opacity-70">
                    Giám sát AI
                </span>
                <span className="text-[11px] font-bold leading-none mt-1">
                    {statusText}
                </span>
            </div>
        </div>
    )
}
