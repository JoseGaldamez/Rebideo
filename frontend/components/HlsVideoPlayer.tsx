"use client"

import React, { useEffect, useRef } from 'react'
import Hls from 'hls.js'

interface HlsVideoPlayerProps {
  src: string
}

export default function HlsVideoPlayer({ src }: HlsVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const hlsRef = useRef<Hls | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Clean up previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        maxMaxBufferLength: 30,
        enableWorker: true,
        lowLatencyMode: true
      })
      hls.loadSource(src)
      hls.attachMedia(video)
      hlsRef.current = hls
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari/iOS native support
      video.src = src
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [src])

  return (
    <div className="w-full rounded-3xl overflow-hidden bg-black shadow-[0_20px_50px_rgba(0,0,0,0.7)] aspect-video flex items-center justify-center border border-outline relative">
      <video 
        ref={videoRef} 
        controls 
        className="w-full h-full object-contain outline-none" 
        playsInline
        crossOrigin="anonymous"
      ></video>
    </div>
  )
}
