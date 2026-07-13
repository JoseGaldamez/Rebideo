"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { collection, query, onSnapshot, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../components/AppShell'
import VideoGrid from '../components/VideoGrid'
import { Video } from '../types'

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('Todo')
  const categories = ['Todo', 'Cinematografía', 'Diseño Minimalista', 'Arquitectura', 'Documentales', 'Tecnología']

  // Videos Snapshots
  const [videos, setVideos] = useState<Video[]>([])

  useEffect(() => {
    if (!user || !db) return

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
          thumbnail_url: data.thumbnail_url,
          processing_attempts: data.processing_attempts,
          error_message: data.error_message,
          duration: data.duration,
          views: data.views,
          user_id: data.user_id
        })
      })

      // Sort by created_at desc in memory
      loadedVideos.sort((a, b) => {
        const timeA = a.created_at?.toDate ? a.created_at.toDate().getTime() : new Date(a.created_at).getTime()
        const timeB = b.created_at?.toDate ? b.created_at.toDate().getTime() : new Date(b.created_at).getTime()
        return timeB - timeA
      })

      setVideos(loadedVideos)
    }, (err) => {
      console.error('Error al escuchar videos:', err)
    })

    return () => unsubscribe()
  }, [user])

  const navigateToUpload = () => {
    router.push('/upload')
  }

  const resetFilters = () => {
    setSearchQuery('')
    setActiveCategory('Todo')
  }

  const watchFeatured = () => {
    const activeVideo = videos.find(v => v.status === 'active')
    if (activeVideo) {
      router.push(`/watch/${activeVideo.id}`)
    } else {
      alert('Sube tu primer video para probar la reproducción HLS.')
    }
  }

  const saveFeatured = () => {
    alert('Se ha guardado en tu biblioteca.')
  }

  // Stable dynamic category hashing (since category field isn't saved directly in DB)
  const getVideoCategory = (video: Video) => {
    const choices = ['Cinematografía', 'Diseño Minimalista', 'Arquitectura', 'Documentales', 'Tecnología']
    const stringToHash = video.id || video.title || ''
    let hashValue = 0
    for (let i = 0; i < stringToHash.length; i++) {
      hashValue = stringToHash.charCodeAt(i) + ((hashValue << 5) - hashValue)
    }
    const index = Math.abs(hashValue) % choices.length
    return choices[index]
  }

  // Filtered List
  const filteredVideos = useMemo(() => {
    return videos.filter(video => {
      const titleMatch = video.title.toLowerCase().includes(searchQuery.toLowerCase())
      const descMatch = (video.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchesSearch = titleMatch || descMatch

      const videoCat = getVideoCategory(video)
      const matchesCategory = activeCategory === 'Todo' || videoCat === activeCategory

      return matchesSearch && matchesCategory
    })
  }, [videos, searchQuery, activeCategory])

  return (
    <div className="w-full max-w-[1300px] mx-auto py-8 px-4 md:px-16">
      <div className="w-full flex flex-col gap-12">
        {/* Top bar search & action row */}
        <header className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-6">
          <div className="relative flex-grow max-w-[500px]">
            <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">search</span>
            <input 
              type="text" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar historias..." 
              className="w-full bg-white/[0.02] border border-outline focus:border-primary rounded-full py-3.5 pr-4 pl-[54px] text-white font-inter text-sm transition-all outline-none"
            />
          </div>
          <div className="flex items-center justify-end gap-4">
            <button className="bg-transparent border-none text-on-surface-variant hover:text-white cursor-pointer flex items-center justify-center p-2.5 rounded-full transition-all duration-200 hover:bg-white/5" title="Notificaciones">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <Link href="/upload" className="bg-white hover:bg-zinc-100 text-black flex items-center gap-2 py-2.5 px-6 rounded-full font-semibold text-xs font-inter cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-md">
              <span className="material-symbols-outlined text-base">add</span>
              <span>Subir Video</span>
            </Link>
          </div>
        </header>

        {/* Dynamic Hero Banner */}
        {!searchQuery && activeCategory === 'Todo' && (
          <section className="w-full aspect-[1.5/1] md:aspect-[2.3/1] rounded-3xl overflow-hidden relative flex items-center border border-outline bg-[radial-gradient(circle_at_center,rgba(208,188,255,0.05)_0%,transparent_80%)] bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(10, 12, 16, 0.9) 25%, rgba(10, 12, 16, 0.1) 100%), url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop')`
            }}
          >
            <div className="py-8 px-6 md:py-12 md:px-16 max-w-[600px] flex flex-col gap-3">
              <span className="bg-white/10 text-white self-start rounded-md px-2.5 py-1 border border-white/15 text-[10px] font-bold uppercase tracking-wider font-inter">Destacado</span>
              <h1 className="text-2xl md:text-[36px] font-bold leading-tight text-white font-sora">La nueva era del contenido digital.</h1>
              <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed font-light">
                Explora una curaduría excepcional de los creadores más influyentes del momento en un espacio diseñado para la visualización pura.
              </p>
              <div className="flex gap-4 mt-3">
                <button className="py-2.5 px-6 font-semibold bg-white hover:bg-zinc-100 text-black text-xs font-inter rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-md" onClick={watchFeatured}>Ver Ahora</button>
                <button className="py-2.5 px-6 font-semibold bg-transparent hover:bg-white/5 border border-outline hover:border-white/30 text-white text-xs font-inter rounded-full flex items-center justify-center cursor-pointer transition-all duration-200" onClick={saveFeatured}>Guardar</button>
              </div>
            </div>
          </section>
        )}

        {/* Category Filters */}
        <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((cat) => (
            <button 
              key={cat}
              className={`py-2 px-5 rounded-full cursor-pointer font-semibold text-xs font-inter transition-all duration-200 whitespace-nowrap ${
                activeCategory === cat 
                ? 'bg-white text-black border border-white' 
                : 'bg-white/[0.02] border border-outline text-on-surface-variant hover:bg-white/6 hover:text-white hover:border-white/20'
              }`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Video Grid Section */}
        <section className="flex flex-col gap-6">
          <div className="flex justify-between items-end border-b border-outline pb-4 mb-2">
            <div>
              <h3 className="text-xl font-semibold mb-1 text-white font-sora">Historias Recientes</h3>
              <p className="text-xs text-on-surface-variant font-light">Descubre lo que la comunidad está creando hoy.</p>
            </div>
            <a href="#" className="text-xs text-on-surface-variant font-bold flex items-center gap-1 hover:text-white transition-colors" onClick={(e) => { e.preventDefault(); resetFilters(); }}>
              <span>Ver Todo</span>
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </a>
          </div>

          <VideoGrid 
            videos={filteredVideos} 
            onTriggerUpload={navigateToUpload} 
          />
        </section>
      </div>
    </div>
  )
}
