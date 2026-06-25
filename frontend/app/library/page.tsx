"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { collection, query, onSnapshot, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../components/AppShell'
import VideoGrid from '../../components/VideoGrid'
import { Video } from '../../types'

export default function LibraryPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'processing' | 'others'>('all')

  useEffect(() => {
    if (!user || !db) return

    // Query all videos created by the current user
    const q = query(
      collection(db, 'videos'),
      where('user_id', '==', user.uid)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedVideos: Video[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        loadedVideos.push({
          id: doc.id,
          title: data.title || '',
          description: data.description,
          status: data.status || 'pending',
          created_at: data.created_at,
          visibility: data.visibility || 'public',
          video_url: data.video_url,
          duration: data.duration,
          views: data.views,
          user_id: data.user_id
        })
      })

      // Sort by created_at desc
      loadedVideos.sort((a, b) => {
        const timeA = a.created_at?.toDate ? a.created_at.toDate().getTime() : new Date(a.created_at).getTime()
        const timeB = b.created_at?.toDate ? b.created_at.toDate().getTime() : new Date(b.created_at).getTime()
        return timeB - timeA
      })

      setVideos(loadedVideos)
      setLoading(false)
    }, (err) => {
      console.error('Error al escuchar videos de biblioteca:', err)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const navigateToUpload = () => {
    router.push('/upload')
  }

  // Calculated Stats
  const stats = useMemo(() => {
    let total = videos.length
    let active = videos.filter(v => v.status === 'active').length
    let processing = videos.filter(v => v.status === 'processing' || v.status === 'pending').length
    let others = videos.filter(v => v.status === 'failed' || v.status === 'expired').length
    return { total, active, processing, others }
  }, [videos])

  // Filtered List
  const filteredVideos = useMemo(() => {
    if (activeTab === 'active') return videos.filter(v => v.status === 'active')
    if (activeTab === 'processing') return videos.filter(v => v.status === 'processing' || v.status === 'pending')
    if (activeTab === 'others') return videos.filter(v => v.status === 'failed' || v.status === 'expired')
    return videos
  }, [videos, activeTab])

  return (
    <div className="w-full max-w-[1300px] mx-auto py-8 px-4 md:px-16">
      <div className="w-full flex flex-col gap-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold font-sora text-white mb-1">Biblioteca</h1>
            <p className="text-xs text-on-surface-variant font-light">Administra tu contenido, monitorea la transcodificación y revisa tus estadísticas.</p>
          </div>
          <Link href="/upload" className="bg-white hover:bg-zinc-100 text-black flex items-center gap-2 py-2.5 px-6 rounded-full font-semibold text-xs font-inter cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-md self-end md:self-auto">
            <span className="material-symbols-outlined text-base">add</span>
            <span>Subir Video</span>
          </Link>
        </header>

        {/* Stats Grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass p-6 rounded-2xl flex flex-col gap-2 bg-zinc-900/30">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-inter">Total Historias</span>
            <span className="text-3xl font-bold text-white font-sora">{stats.total}</span>
          </div>
          <div className="glass p-6 rounded-2xl flex flex-col gap-2 bg-zinc-900/30">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-inter">Activos / Listos</span>
            <span className="text-3xl font-bold text-success font-sora">{stats.active}</span>
          </div>
          <div className="glass p-6 rounded-2xl flex flex-col gap-2 bg-zinc-900/30">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-inter">En Proceso</span>
            <span className="text-3xl font-bold text-secondary font-sora">{stats.processing}</span>
          </div>
          <div className="glass p-6 rounded-2xl flex flex-col gap-2 bg-zinc-900/30">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-inter">No Disponibles</span>
            <span className="text-3xl font-bold text-error font-sora">{stats.others}</span>
          </div>
        </section>

        {/* Status Tabs */}
        <div className="flex border-b border-outline pb-2 gap-6">
          <button 
            className={`pb-2 px-1 text-xs uppercase font-bold tracking-widest font-inter transition-all cursor-pointer border-b-2 ${
              activeTab === 'all' 
              ? 'text-white border-primary' 
              : 'text-on-surface-variant border-transparent hover:text-white'
            }`}
            onClick={() => setActiveTab('all')}
          >
            Todos ({stats.total})
          </button>
          <button 
            className={`pb-2 px-1 text-xs uppercase font-bold tracking-widest font-inter transition-all cursor-pointer border-b-2 ${
              activeTab === 'active' 
              ? 'text-white border-primary' 
              : 'text-on-surface-variant border-transparent hover:text-white'
            }`}
            onClick={() => setActiveTab('active')}
          >
            Activos ({stats.active})
          </button>
          <button 
            className={`pb-2 px-1 text-xs uppercase font-bold tracking-widest font-inter transition-all cursor-pointer border-b-2 ${
              activeTab === 'processing' 
              ? 'text-white border-primary' 
              : 'text-on-surface-variant border-transparent hover:text-white'
            }`}
            onClick={() => setActiveTab('processing')}
          >
            Procesando ({stats.processing})
          </button>
          <button 
            className={`pb-2 px-1 text-xs uppercase font-bold tracking-widest font-inter transition-all cursor-pointer border-b-2 ${
              activeTab === 'others' 
              ? 'text-white border-primary' 
              : 'text-on-surface-variant border-transparent hover:text-white'
            }`}
            onClick={() => setActiveTab('others')}
          >
            Inactivos ({stats.others})
          </button>
        </div>

        {/* Video List */}
        <section>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <span className="w-10 h-10 border-4 border-primary/10 border-l-primary rounded-full animate-spin"></span>
              <p className="text-sm font-light text-on-surface-variant">Cargando biblioteca...</p>
            </div>
          ) : (
            <VideoGrid 
              videos={filteredVideos} 
              onTriggerUpload={navigateToUpload} 
            />
          )}
        </section>
      </div>
    </div>
  )
}
