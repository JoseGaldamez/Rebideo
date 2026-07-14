"use client"

import React, { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import HlsVideoPlayer from '../../../components/HlsVideoPlayer'
import EditVideoModal from '../../../components/EditVideoModal'
import DeleteVideoModal from '../../../components/DeleteVideoModal'
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
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([])

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

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

  // Fetch video on load
  useEffect(() => {
    if (videoId) {
      fetchVideo()
    }
  }, [user, videoId])

  // Fetch related active videos
  useEffect(() => {
    if (video && db) {
      const fetchRelated = async () => {
        try {
          const q = query(
            collection(db, 'videos'),
            where('status', '==', 'active')
          )
          const querySnapshot = await getDocs(q)
          const loaded: Video[] = []
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data()
            if (docSnap.id !== video.id) {
              loaded.push({
                id: docSnap.id,
                title: data.title || '',
                description: data.description,
                status: data.status || 'pending',
                created_at: data.created_at,
                visibility: data.visibility || 'public',
                video_url: data.video_url,
                playlist_url: data.playlist_url,
                thumbnail_url: data.thumbnail_url,
                user_id: data.user_id
              })
            }
          })

          // Prioritize videos from the same creator, then sort the rest by created_at desc
          loaded.sort((a, b) => {
            const isSameCreatorA = a.user_id === video.user_id ? 1 : 0
            const isSameCreatorB = b.user_id === video.user_id ? 1 : 0
            if (isSameCreatorA !== isSameCreatorB) {
              return isSameCreatorB - isSameCreatorA
            }
            const timeA = a.created_at?.toDate ? a.created_at.toDate().getTime() : new Date(a.created_at).getTime()
            const timeB = b.created_at?.toDate ? b.created_at.toDate().getTime() : new Date(b.created_at).getTime()
            return timeB - timeA
          })

          setRelatedVideos(loaded.slice(0, 6)) // Limit to 6 recommendations
        } catch (err) {
          console.error('Error fetching related videos:', err)
        }
      }
      fetchRelated()
    }
  }, [video])

  const handleSaveSuccess = (updatedFields: { title: string; description: string; visibility: 'public' | 'private' }) => {
    if (video) {
      setVideo({
        ...video,
        ...updatedFields
      })
    }
  }

  const handleDeleteSuccess = () => {
    router.push('/')
  }

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

  const isOwner = !!(user && video && user.uid === video.user_id)

  return (
    <div className="w-full max-w-[1300px] mx-auto py-8 px-4 md:px-8 lg:px-12 flex flex-col gap-6">
      {/* Back Navigation Link */}
      <div className="mb-2">
        <Link href="/" className="text-on-surface-variant flex items-center gap-1.5 font-bold hover:text-white transition-colors text-[10px] uppercase tracking-widest font-inter">
          <span className="material-symbols-outlined text-sm font-normal normal-case">arrow_back</span>
          <span>Volver al Dashboard</span>
        </Link>
      </div>

      <div className="w-full flex flex-col lg:flex-row gap-8 items-stretch">
        {/* Left Column: Video & Metadata (8/12 width) */}
        <div className="flex-[8] flex flex-col gap-6 min-w-0">
          {loading ? (
            /* 1. Initial Info Loading Card */
            <div className="rounded-3xl p-16 flex flex-col items-center justify-center text-center gap-5 min-h-[400px] bg-surface-container border border-outline shadow-xl">
              <span className="w-12 h-12 border-4 border-primary/10 border-l-primary rounded-full animate-spin"></span>
              <p className="text-sm font-light text-on-surface-variant">Cargando información del video...</p>
            </div>
          ) : error ? (
            /* 2. Error Message Card */
            <div className="rounded-3xl p-16 flex flex-col items-center justify-center text-center gap-5 min-h-[400px] bg-surface-container border border-outline shadow-xl">
              <span className="material-symbols-outlined text-error text-[40px]">warning</span>
              <h3 className="text-xl font-semibold text-white font-sora">Ocurrió un error</h3>
              <p className="text-sm text-on-surface-variant max-w-[460px] leading-relaxed">{error}</p>
              <Link href="/" className="py-2.5 px-6 font-semibold bg-transparent hover:bg-white/5 border border-outline hover:border-white/30 text-white text-xs font-inter rounded-full flex items-center justify-center gap-2 cursor-pointer transition-all duration-200">Volver al inicio</Link>
            </div>
          ) : video && video.status !== 'active' ? (
            /* 3. Hold State Card */
            <div className="rounded-3xl p-16 flex flex-col items-center justify-center text-center gap-5 min-h-[400px] bg-surface-container border border-outline shadow-xl">
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
              
              <div className="bg-black/15 border border-outline p-6 rounded-xl text-left min-w-[320px] my-2 flex flex-col gap-2.5 font-inter">
                <p className="text-xs md:text-sm text-on-surface">
                  <strong className="font-semibold text-on-surface-variant mr-1 font-sora">Título:</strong> {video.title}
                </p>
                <p className="text-xs md:text-sm text-on-surface">
                  <strong className="font-semibold text-on-surface-variant mr-1 font-sora">Estado:</strong> 
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
              <div className="flex flex-wrap gap-3 justify-center items-center">
                <button onClick={fetchVideo} className="py-2.5 px-6 font-semibold bg-transparent hover:bg-white/5 border border-outline hover:border-white/30 text-white text-xs font-inter rounded-full flex items-center justify-center gap-2 cursor-pointer transition-all duration-200">
                  <span className="material-symbols-outlined text-lg">refresh</span>
                  <span>Actualizar Estado</span>
                </button>
                {isOwner && (
                  <>
                    <button 
                      onClick={() => setIsEditOpen(true)}
                      className="py-2.5 px-6 font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-inter rounded-full flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                      <span>Editar Detalles</span>
                    </button>
                    <button 
                      onClick={() => setIsDeleteOpen(true)}
                      className="py-2.5 px-6 font-semibold bg-error/10 hover:bg-error/25 border border-error/20 text-error text-xs font-inter rounded-full flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                      <span>Eliminar Video</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : video ? (
            /* 4. Video Player Canvas */
            <div className="flex flex-col gap-4">
              <HlsVideoPlayer src={video.playlist_url || ''} poster={video.thumbnail_url} />
              
              <h1 className="text-2xl font-semibold text-white font-sora mt-2 tracking-tight">
                {video.title}
              </h1>

              {/* Creator & Action Row (YouTube style!) */}
              <div className="flex flex-wrap justify-between items-center gap-4 py-2 border-b border-outline pb-4">
                {/* Left: Creator Profile */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-sora font-semibold">
                    {user?.email ? user.email[0].toUpperCase() : 'C'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white font-sora">{user?.email?.split('@')[0] || 'Creador'}</span>
                    <span className="text-[10px] text-on-surface-variant">Creador verificado</span>
                  </div>
                  <button className="ml-4 py-1.5 px-4 bg-white hover:bg-zinc-200 text-black font-semibold text-xs font-inter rounded-full transition-all duration-200 cursor-pointer">
                    Seguir
                  </button>
                </div>

                {/* Right: Owner Actions */}
                {isOwner && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsEditOpen(true)}
                      className="flex items-center gap-1.5 py-2 px-4 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-semibold font-inter transition-all border border-white/10 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                      <span>Editar Detalles</span>
                    </button>
                    <button 
                      onClick={() => setIsDeleteOpen(true)}
                      className="flex items-center gap-1.5 py-2 px-4 rounded-full bg-error/10 hover:bg-error/20 text-error text-xs font-semibold font-inter transition-all border border-error/20 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                      <span>Eliminar Video</span>
                    </button>
                  </div>
                )}
              </div>
              
              {/* Description Box */}
              <div className="bg-white/[0.03] border border-outline rounded-2xl p-5 flex flex-col gap-3 font-inter shadow-inner">
                <div className="flex items-center gap-3 text-xs font-semibold text-white">
                  <span>Transmisión Adaptativa HLS</span>
                  <span className="opacity-40">•</span>
                  <span className="text-primary font-bold uppercase tracking-wider">{video.visibility === 'private' ? 'Privado' : 'Público'}</span>
                </div>
                {video.description ? (
                  <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">
                    {video.description}
                  </p>
                ) : (
                  <p className="text-xs text-on-surface-variant italic font-light">Sin descripción disponible.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Right Column: Recommended Videos (4/12 width) */}
        {!loading && !error && video && (
          <div className="flex-[4] lg:max-w-[340px] xl:max-w-[380px] w-full flex flex-col gap-6 lg:border-l lg:border-outline lg:pl-8">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest font-inter mb-1">Videos Recomendados</h3>
            
            <div className="flex flex-col gap-5">
              {relatedVideos.length > 0 ? (
                relatedVideos.map((rv) => (
                  <Link key={rv.id} href={`/watch/${rv.id}`} className="flex gap-3 group cursor-pointer">
                    {/* Thumbnail Container */}
                    <div className="w-[120px] aspect-[16/10] bg-white/[0.02] border border-outline rounded-xl overflow-hidden relative flex-shrink-0 transition-transform duration-200 group-hover:scale-[1.02]">
                      {rv.thumbnail_url ? (
                        <img src={rv.thumbnail_url} alt={rv.title} className="w-full h-full object-cover animate-fade-in" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                          <span className="material-symbols-outlined text-lg">movie</span>
                        </div>
                      )}
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-md">play_arrow</span>
                      </div>
                    </div>

                    {/* Text Meta Info */}
                    <div className="flex flex-col gap-1 min-w-0 justify-center">
                      <h4 className="text-xs font-semibold text-white group-hover:text-primary transition-colors font-sora line-clamp-2 leading-tight">
                        {rv.title}
                      </h4>
                      <p className="text-[10px] text-on-surface-variant opacity-80 truncate font-inter">
                        {rv.user_id === video.user_id ? 'Del mismo creador' : 'Recomendado'}
                      </p>
                      <span className="inline-flex self-start px-1.5 py-0.5 rounded-sm text-[8px] font-bold uppercase tracking-wider bg-white/5 text-on-surface-variant font-inter">
                        {rv.visibility === 'private' ? 'Privado' : 'Público'}
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-xs text-on-surface-variant font-light italic">No hay otros videos recomendados en este momento.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {video && (
        <EditVideoModal 
          isOpen={isEditOpen} 
          onClose={() => setIsEditOpen(false)} 
          video={video} 
          onSaveSuccess={handleSaveSuccess} 
        />
      )}

      <DeleteVideoModal 
        isOpen={isDeleteOpen} 
        onClose={() => setIsDeleteOpen(false)} 
        videoId={videoId} 
        onDeleteSuccess={handleDeleteSuccess} 
      />
    </div>
  )
}
