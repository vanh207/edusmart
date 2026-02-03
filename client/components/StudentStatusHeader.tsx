'use client'

import React from 'react'
import { useMonitoring } from '@/context/MonitoringContext'
import AIStatusBadge from './AIStatusBadge'

export default function StudentStatusHeader() {
    const { isProctoringEnabled, isConnected } = useMonitoring()

    return (
        <div className="flex items-center gap-4">


            {/* AI Status Badge */}
            {isProctoringEnabled && (
                <AIStatusBadge
                    isProctoringEnabled={isProctoringEnabled}
                    isConnected={isConnected}
                    compact={true}
                />
            )}
        </div>
    )
}
