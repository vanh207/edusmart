'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface MonitoringContextType {
    isProctoringEnabled: boolean | null
    setIsProctoringEnabled: (enabled: boolean | null) => void
    isConnected: boolean
    setIsConnected: (connected: boolean) => void
    isSharingActive: boolean
    setIsSharingActive: (active: boolean) => void
    triggerAutoSubmit: string | null
    setTriggerAutoSubmit: (reason: string | null) => void
    violationOverlay: { visible: boolean; reason: string; timestamp: string } | null
    setViolationOverlay: (overlay: { visible: boolean; reason: string; timestamp: string } | null) => void
}

const MonitoringContext = createContext<MonitoringContextType | undefined>(undefined)

export function MonitoringProvider({ children }: { children: ReactNode }) {
    const [isProctoringEnabled, setIsProctoringEnabled] = useState<boolean | null>(false)
    const [isConnected, setIsConnected] = useState(false)
    const [isSharingActive, setIsSharingActive] = useState(false)
    const [triggerAutoSubmit, setTriggerAutoSubmit] = useState<string | null>(null)
    const [violationOverlay, setViolationOverlay] = useState<{ visible: boolean; reason: string; timestamp: string } | null>(null)

    return (
        <MonitoringContext.Provider value={{
            isProctoringEnabled,
            setIsProctoringEnabled,
            isConnected,
            setIsConnected,
            isSharingActive,
            setIsSharingActive,
            triggerAutoSubmit,
            setTriggerAutoSubmit,
            violationOverlay,
            setViolationOverlay
        }}>
            {children}
        </MonitoringContext.Provider>
    )
}

export function useMonitoring() {
    const context = useContext(MonitoringContext)
    if (context === undefined) {
        throw new Error('useMonitoring must be used within a MonitoringProvider')
    }
    return context
}
