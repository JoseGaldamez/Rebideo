"use client"

import React from 'react'
import VideoCard from './VideoCard'
import { Video } from '../types'

interface VideoGridProps {
  videos?: Video[]
  onTriggerUpload: () => void
}

export default function VideoGrid({ videos = [], onTriggerUpload }: VideoGridProps) {
  return (
    <div className="w-full">
      {/* Empty state frame if list is blank */}
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
        /* Responsive video card grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 w-full">
          {videos.map((video) => (
            <VideoCard 
              key={video.id} 
              video={video} 
            />
          ))}
        </div>
      )}
    </div>
  )
}
