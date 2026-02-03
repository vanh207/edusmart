'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import api from '@/lib/api'

interface ProctoringGuardProps {
    classId: number | null
    type: 'study' | 'test'
    children: React.ReactNode
}

// ProctoringGuard is now a pass-through component as GlobalMonitor handles all logic
// This prevents redundant socket connections and stream conflicts
export default function ProctoringGuard({ children }: ProctoringGuardProps) {
    return (
        <div className="relative">
            {children}
        </div>
    )
}
