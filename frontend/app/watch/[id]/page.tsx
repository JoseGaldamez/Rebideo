"use client"

import React, { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import HlsVideoPlayer from '../../../components/HlsVideoPlayer'
import { useAuth } from '../../../components/AppShell'
import { Video } from '../../../types'

interface WatchPageProps {
  params: Promise<{ id: string }>
}

export default function WatchPage({ params }: WatchPageProps) {
  // Unwrap dynamic params promise
  const resolvedParams = use(params)
  const videoId = resolvedParams.id

  const { user } = useAuth()
  const router = useRouter()

  const [video, setVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  const fetchVideo = async () => {
    setLoading(true)
    setError('')
    try {
      const headers: Record<string, string> = {}
      if (user) {
        const idToken = await user.getIdToken()
        headers['Authorization'] = `Bearer ${idToken}`
      }

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8080'
      const response = await fetch(`${apiBaseUrl}/videos/${videoId}`, {
        headers
      })
      
      if (response.status === 401 || response.status === 403) {
        throw new Error('No tienes permisos para ver este video privado.')
      }
      if (response.status === 404) {
        throw new Error('El video solicitado no existe o ha expirado.')
      }
      if (!response.ok) {
        throw new Error('No se pudo recuperar la información del video.')
      }
      const data = await response.json()
      setVideo(data)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error de conexión con la API.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user && videoId) {
      fetchVideo()
    }
  }, [user, videoId])

  const getStatusIcon = (status: Video['status']) => {
    const map: Record<string, string> = {
      'pending': 'schedule',
      'processing': 'sync',
      'failed': 'error',
      'expired': 'auto_delete'
    }
    return map[status] || 'help'
  }

  const translateStatus = (status: Video['status']) => {
    const map: Record<string, string> = {
      'pending': 'Pendiente',
      'processing': 'Procesando...',
      'active': 'Activo',
      'failed': 'Falló',
      'expired': 'Expirado'
    }
    return map[status] || status
  }

  const getStatusMessage = (status: Video['status']) => {
    if (status === 'pending' || status === 'processing') {
      return 'Este video se está procesando actualmente y se dividirá en segmentos HLS para una reproducción óptima. Por favor, refresca el estado en unos minutos.'
    }
    if (status === 'expired') {
      return 'Este video ha expirado. Los recursos de transmisión de este portafolio se eliminan automáticamente tras 30 días.'
    }
    return 'Lo sentimos, el procesamiento de este video ha fallado. Revisa tu archivo de entrada e intenta subirlo de nuevo.'
  }

  return (
    <div className="w-full max-w-[960px] mx-auto py-8 px-4 md:px-16 flex flex-col gap-6">
      {/* Back Navigation Link */}
      <div className="mb-2">
        <Link href="/" className="text-on-surface-variant flex items-center gap-1.5 font-bold hover:text-white transition-colors text-[10px] uppercase tracking-widest font-inter">
          <span className="material-symbols-outlined text-sm font-normal normal-case">arrow_back</span>
          <span>Volver al Dashboard</span>
        </Link>
      </div>

      {/* 1. Initial Info Loading Card */}
      {loading ? (
        <div className="rounded-3xl p-16 flex flex-col items-center justify-center text-center gap-5 min-h-[400px] glass">
          <span className="w-12 h-12 border-4 border-primary/10 border-l-primary rounded-full animate-spin"></span>
          <p className="text-sm font-light text-on-surface-variant">Cargando información del video...</p>
        </div>
      ) : error ? (
        /* 2. Error Message Card */
        <div className="rounded-3xl p-16 flex flex-col items-center justify-center text-center gap-5 min-h-[400px] glass">
          <span className="material-symbols-outlined text-error text-[40px]">warning</span>
          <h3 className="text-xl font-semibold text-white font-sora">Ocurrió un error</h3>
          <p className="text-sm text-on-surface-variant max-w-[460px] leading-relaxed">{error}</p>
          <Link href="/" className="py-2.5 px-6 font-semibold bg-transparent hover:bg-white/5 border border-outline hover:border-white/30 text-white text-xs font-inter rounded-full flex items-center justify-center gap-2 cursor-pointer transition-all duration-200">Volver al inicio</Link>
        </div>
      ) : video && video.status !== 'active' ? (
        /* 3. Hold State Card */
        <div className="rounded-3xl p-16 flex flex-col items-center justify-center text-center gap-5 min-h-[400px] glass">
          <div className={`w-18 h-18 bg-white/[0.02] border rounded-full flex items-center justify-center ${
            video.status === 'pending' ? 'text-warning border-warning/20' :
            video.status === 'processing' ? 'text-secondary border-secondary/20 animate-[spin_3s_linear_infinite]' :
            video.status === 'failed' ? 'text-error border-error/20' :
            'text-on-surface-variant border-outline opacity-50'
          }`}>
            <span className="material-symbols-outlined text-3xl">
              {getStatusIcon(video.status)}
            </span>
          </div>
          <h3 className="text-xl font-semibold text-white font-sora">El video no está disponible</h3>
          <p className="text-sm text-on-surface-variant max-w-[460px] leading-relaxed">
            {getStatusMessage(video.status)}
          </p>
          
          <div className="bg-black/15 border border-outline p-6 rounded-xl text-left min-w-[320px] my-2 flex flex-col gap-2.5">
            <p className="text-xs md:text-sm text-on-surface">
              <strong className="font-semibold text-on-surface-variant mr-1">Título:</strong> {video.title}
            </p>
            <p className="text-xs md:text-sm text-on-surface">
              <strong className="font-semibold text-on-surface-variant mr-1">Estado:</strong> 
              <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider ${
                video.status === 'pending' ? 'bg-warning/10 text-warning' :
                video.status === 'processing' ? 'bg-secondary/10 text-secondary' :
                video.status === 'failed' ? 'bg-error/10 text-error' :
                'bg-white/5 text-on-surface-variant'
              }`}>
                {translateStatus(video.status)}
              </span>
            </p>
          </div>
          <button onClick={fetchVideo} className="py-2.5 px-6 font-semibold bg-transparent hover:bg-white/5 border border-outline hover:border-white/30 text-white text-xs font-inter rounded-full flex items-center justify-center gap-2 cursor-pointer transition-all duration-200">
            <span className="material-symbols-outlined text-lg">refresh</span>
            <span>Actualizar Estado</span>
          </button>
        </div>
      ) : video ? (
        /* 4. Video Player Canvas */
        <div className="flex flex-col gap-6">
          <div className="w-full rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
            <HlsVideoPlayer src={video.playlist_url || ''} poster={video.thumbnail_url} />
          </div>
          
          <div className="rounded-3xl p-8 glass">
            <div className="flex justify-between items-start gap-4 mb-2">
              <h2 className="text-2xl font-semibold text-white font-sora">{video.title}</h2>
              <span className="inline-flex items-center px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-success/10 text-success font-inter">Activo</span>
            </div>
            
            <div className="flex items-center gap-2 text-on-surface-variant text-[10px] font-bold uppercase tracking-wider font-inter mb-6">
              <span>Transmisión Adaptativa HLS</span>
              <span className="opacity-50">•</span>
              <span>{video.visibility === 'private' ? 'Privado' : 'Público'}</span>
            </div>
            
            {video.description && (
              <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line border-t border-outline pt-6">
                {video.description}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
