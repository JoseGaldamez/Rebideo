"use client"

import React, { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Video } from '../types'

interface StudioVideoListProps {
  videos?: Video[]
  onTriggerUpload: () => void
}

export default function StudioVideoList({ videos = [], onTriggerUpload }: StudioVideoListProps) {
  const router = useRouter()

  // Format date helper (matches VideoCard)
  const getFormattedDate = (created_at: any) => {
    if (!created_at) return 'Reciente'
    
    let date: Date
    if (created_at.toDate) {
      date = created_at.toDate()
    } else {
      date = new Date(created_at)
    }
    
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  // Get status badge styles
  const getStatusStyles = (status: Video['status']) => {
    const map: Record<Video['status'], { badge: string; text: string; label: string; icon: string }> = {
      'pending': {
        badge: 'bg-warning/10 text-warning border-warning/20',
        text: 'text-warning',
        label: 'Pendiente',
        icon: 'hourglass_empty'
      },
      'processing': {
        badge: 'bg-secondary/10 text-secondary border-secondary/20',
        text: 'text-secondary',
        label: 'Procesando',
        icon: 'sync'
      },
      'active': {
        badge: 'bg-success/10 text-success border-success/20',
        text: 'text-success',
        label: 'Activo',
        icon: 'check_circle'
      },
      'failed': {
        badge: 'bg-error/10 text-error border-error/20',
        text: 'text-error',
        label: 'Falló',
        icon: 'error'
      },
      'expired': {
        badge: 'bg-white/5 text-on-surface-variant border-white/10',
        text: 'text-on-surface-variant',
        label: 'Expirado',
        icon: 'history'
      }
    }
    return map[status] || { badge: 'bg-white/5 text-on-surface-variant border-white/10', text: 'text-on-surface-variant', label: status, icon: 'help' }
  }

  return (
    <div className="w-full">
      {/* Empty State Frame */}
      {!videos || videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 px-10 rounded-3xl max-w-[600px] mx-auto my-10 border border-dashed border-outline bg-zinc-950/20 glass">
          <div className="w-18 h-18 bg-white/[0.02] border border-outline rounded-full flex items-center justify-center mb-6 text-on-surface-variant">
            <span className="material-symbols-outlined text-3xl">video_library</span>
          </div>
          <h3 className="text-xl font-semibold mb-2 text-white font-sora">No hay videos en tu portal</h3>
          <p className="text-sm text-on-surface-variant max-w-[360px] mb-7 leading-relaxed font-light">Sube tu primera historia para comenzar la transmisión de contenido digital.</p>
          <button className="py-2.5 px-6 font-semibold bg-white hover:bg-zinc-100 text-black text-xs font-inter rounded-full flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-md" onClick={onTriggerUpload}>
            <span className="material-symbols-outlined text-base">add</span>
            <span>Subir Video</span>
          </button>
        </div>
      ) : (
        /* YouTube Studio-like Table Layout with Glassmorphism */
        <div className="w-full overflow-x-auto rounded-xl border border-outline bg-zinc-900/10 glass">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-outline bg-white/[0.02]">
                <th className="p-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-inter w-[40%]">Video</th>
                <th className="p-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-inter">Visibilidad</th>
                <th className="p-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-inter">Estado</th>
                <th className="p-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-inter">Fecha</th>
                <th className="p-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-inter">Vistas</th>
                <th className="p-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-inter text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((video) => {
                const isActive = video.status === 'active'
                const { badge: badgeClass, label: statusLabel, icon: statusIcon } = getStatusStyles(video.status)

                return (
                  <tr 
                    key={video.id} 
                    className={`border-b border-outline/50 transition-all duration-200 hover:bg-white/[0.02] align-middle ${
                      isActive ? '' : 'text-on-surface-variant/70'
                    }`}
                  >
                    {/* Thumbnail + Details */}
                    <td className="p-4">
                      <div className="flex gap-4 items-center">
                        {/* Miniature Thumbnail Placeholder */}
                        <div 
                          onClick={() => isActive && router.push(`/watch/${video.id}`)}
                          className={`relative w-28 aspect-video rounded-md overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-950 border border-outline flex-shrink-0 flex items-center justify-center ${
                            isActive ? 'cursor-pointer group/thumb hover:border-white/20' : 'cursor-not-allowed opacity-50'
                          }`}
                        >
                          {isActive ? (
                            <div className="bg-obsidian/60 w-8 h-8 rounded-full flex items-center justify-center border border-white/10 backdrop-blur-xs opacity-0 scale-75 group-hover/thumb:opacity-100 group-hover/thumb:scale-100 transition-all duration-200">
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor" 
                                strokeWidth="2.5" 
                                className="w-3.5 h-3.5 text-white translate-x-[0.5px]"
                              >
                                <polygon points="5 3 19 12 5 21 5 3" strokeLinejoin="round" />
                              </svg>
                            </div>
                          ) : (
                            <span className="material-symbols-outlined text-[18px] text-on-surface-variant/40">
                              {statusIcon}
                            </span>
                          )}
                        </div>

                        {/* Title & Description */}
                        <div className="flex flex-col gap-0.5 min-w-0">
                          {isActive ? (
                            <h4 
                              onClick={() => router.push(`/watch/${video.id}`)}
                              className="text-sm font-semibold text-white truncate cursor-pointer hover:text-primary transition-colors pr-2"
                              title={video.title}
                            >
                              {video.title}
                            </h4>
                          ) : (
                            <h4 
                              className="text-sm font-semibold text-zinc-400 truncate cursor-not-allowed pr-2"
                              title={`${video.title} (Procesando...)`}
                            >
                              {video.title}
                            </h4>
                          )}
                          <p className="text-xs text-on-surface-variant font-light truncate max-w-[300px] pr-2">
                            {video.description || 'Sin descripción.'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Visibility */}
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="material-symbols-outlined text-base text-on-surface-variant">
                          {video.visibility === 'private' ? 'lock' : 'public'}
                        </span>
                        <span className="font-medium text-white/90">
                          {video.visibility === 'private' ? 'Privado' : 'Público'}
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="p-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeClass}`}>
                        <span className={`material-symbols-outlined text-xs ${video.status === 'processing' ? 'animate-spin' : ''}`}>
                          {statusIcon}
                        </span>
                        <span>{statusLabel}</span>
                      </span>
                    </td>

                    {/* Date */}
                    <td className="p-4 text-xs whitespace-nowrap text-white/80 font-medium">
                      {getFormattedDate(video.created_at)}
                    </td>

                    {/* Views */}
                    <td className="p-4 text-xs whitespace-nowrap text-white/80 font-medium font-inter">
                      {video.views !== undefined ? video.views.toLocaleString('es-ES') : '0'}
                    </td>

                    {/* Action link */}
                    <td className="p-4 text-right whitespace-nowrap">
                      {isActive ? (
                        <Link 
                          href={`/watch/${video.id}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-outline hover:border-white/30 text-white hover:bg-white/[0.05] transition-all duration-200"
                          title="Ver video"
                        >
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor" 
                            strokeWidth="2.5" 
                            className="w-3.5 h-3.5 text-white translate-x-[0.5px]"
                          >
                            <polygon points="5 3 19 12 5 21 5 3" strokeLinejoin="round" />
                          </svg>
                        </Link>
                      ) : (
                        <span 
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-outline/30 text-on-surface-variant/30 bg-transparent cursor-not-allowed"
                          title="No reproducible hasta finalizar procesamiento"
                        >
                          <span className="material-symbols-outlined text-base">lock</span>
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
