'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface AnimatedIconProps {
  children: ReactNode
  delay?: number
  className?: string
}

export default function AnimatedIcon({ children, delay = 0, className = '' }: AnimatedIconProps) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay
      }}
      whileHover={{ scale: 1.1, rotate: 5 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

