"use client"

import React, { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Video } from '../types'

interface VideoCardProps {
  video: Video
}

export default function VideoCard({ video }: VideoCardProps) {
  const router = useRouter()

  const badgeClass = useMemo(() => {
    const map: Record<string, string> = {
      'pending': 'bg-warning/10 text-warning',
      'processing': 'bg-secondary/10 text-secondary',
      'active': 'bg-success/10 text-success',
      'failed': 'bg-error/10 text-error',
      'expired': 'bg-white/5 text-on-surface-variant'
    }
    return map[video.status] || 'bg-white/5 text-on-surface-variant'
  }, [video.status])

  const translatedStatus = useMemo(() => {
    const map: Record<string, string> = {
      'pending': 'Pendiente',
      'processing': 'Procesando',
      'active': 'Activo',
      'failed': 'Falló',
      'expired': 'Expirado'
    }
    return map[video.status] || video.status
  }, [video.status])

  const formattedDate = useMemo(() => {
    if (!video.created_at) return 'Reciente'
    
    let date: Date
    if (video.created_at.toDate) {
      date = video.created_at.toDate()
    } else {
      date = new Date(video.created_at)
    }
    
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }, [video.created_at])

  const navigateToVideo = () => {
    if (video.status === 'active') {
      router.push(`/watch/${video.id}`)
    }
  }

  return (
    <div className={`group rounded-xl overflow-hidden flex flex-col transition-all duration-300 bg-zinc-900/40 border border-outline hover:-translate-y-1.5 hover:border-white/15 hover:shadow-[0_16px_36px_rgba(0,0,0,0.6)] ${video.status === 'active' ? 'card-active' : ''}`}>
      {/* Thumbnail */}
      <div className="relative w-full aspect-video overflow-hidden cursor-pointer bg-gradient-to-br from-zinc-900 to-zinc-950" onClick={navigateToVideo}>
        {video.thumbnail_url ? (
          <img 
            src={video.thumbnail_url} 
            alt={video.title} 
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 animate-fade-in"
          />
        ) : null}
        <div className="w-full h-full flex items-center justify-center relative transition-transform duration-500 group-hover:scale-105 before:content-[''] before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_center,rgba(208,188,255,0.05)_0%,transparent_80%)] before:z-1 before:pointer-events-none">
          <div className="bg-obsidian/60 w-14 h-14 rounded-full flex items-center justify-center border border-white/10 backdrop-blur-sm opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 z-10">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth="2" 
              className="w-6 h-6 text-on-surface-variant translate-x-[1px]"
            >
              <polygon points="5 3 19 12 5 21 5 3" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <div className="absolute top-3 left-3 z-10">
          <span className={`inline-flex items-center px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
            {translatedStatus}
          </span>
        </div>
      </div>

      {/* Metadata Details */}
      <div className="p-5 flex flex-col gap-2 flex-grow">
        <h4 className="text-base font-semibold text-white leading-snug truncate cursor-pointer hover:text-primary transition-colors" title={video.title} onClick={navigateToVideo}>
          {video.title}
        </h4>
        
        <div className="flex items-center gap-1.5 text-on-surface-variant text-[10px] font-bold uppercase tracking-wider font-inter">
          <span>{formattedDate}</span>
          <span className="opacity-50">•</span>
          <span>{video.visibility === 'private' ? 'Privado' : 'Público'}</span>
        </div>

        <Link 
          href={`/watch/${video.id}`}
          className={`mt-3 w-full rounded-lg py-2.5 px-4 text-xs bg-white/[0.01] border border-outline hover:border-white/30 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 ${video.status !== 'active' ? 'opacity-25 cursor-not-allowed hover:bg-transparent hover:border-outline' : 'hover:bg-white/[0.05]'}`}
          aria-disabled={video.status !== 'active'}
          onClick={(e) => { if (video.status !== 'active') e.preventDefault(); }}
        >
          <span>Ver Video</span>
          <span className="material-symbols-outlined text-base transition-transform group-hover:translate-x-1 duration-200">arrow_forward</span>
        </Link>
      </div>
    </div>
  )
}
