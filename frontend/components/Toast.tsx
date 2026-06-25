"use client"

import React, { useEffect } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  duration?: number
  onClose: () => void
}

export default function Toast({ message, type = 'info', duration = 4000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  const icon = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'
  const iconColor = type === 'success' ? 'text-success' : type === 'error' ? 'text-error' : 'text-primary'

  return (
    <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-zinc-900/90 backdrop-blur-xl border border-outline rounded-2xl p-4 shadow-[0_20px_40px_rgba(0,0,0,0.5)] min-w-[320px] max-w-[400px] animate-[slideIn_0.3s_cubic-bezier(0.16,1,0.3,1)_forwards] overflow-hidden">
      <span className={`material-symbols-outlined ${iconColor} text-2xl`}>{icon}</span>
      <div className="flex-1">
        <p className="text-xs text-on-surface font-semibold font-inter normal-case tracking-normal">{message}</p>
      </div>
      <button 
        onClick={onClose} 
        className="text-on-surface-variant hover:text-white cursor-pointer transition-colors p-1"
      >
        <span className="material-symbols-outlined text-lg">close</span>
      </button>

      {/* Progress Bar Animation */}
      <div 
        className={`absolute bottom-0 left-0 h-1 ${type === 'success' ? 'bg-success' : type === 'error' ? 'bg-error' : 'bg-primary'} opacity-70 animate-[shrinkProgress_linear_forwards]`}
        style={{
          width: '100%',
          animationDuration: `${duration}ms`
        }}
      />
    </div>
  )
}
