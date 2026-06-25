"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { collection, query, onSnapshot, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../components/AppShell'
import VideoGrid from '../../components/VideoGrid'
import { Video } from '../../types'

export default function ExplorePage() {
  const { user } = useAuth()
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('Todo')
  const categories = ['Todo', 'Cinematografía', 'Diseño Minimalista', 'Arquitectura', 'Documentales', 'Tecnología']

  const [publicVideos, setPublicVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    if (!db) return

    // Query all active public videos
    const q = query(
      collection(db, 'videos'),
      where('visibility', '==', 'public'),
      where('status', '==', 'active')
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

      setPublicVideos(loadedVideos)
      setLoading(false)
    }, (err) => {
      console.error('Error al escuchar videos públicos:', err)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const navigateToUpload = () => {
    router.push('/upload')
  }

  const resetFilters = () => {
    setSearchQuery('')
    setActiveCategory('Todo')
  }

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

  const filteredVideos = useMemo(() => {
    return publicVideos.filter(video => {
      const titleMatch = video.title.toLowerCase().includes(searchQuery.toLowerCase())
      const descMatch = (video.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchesSearch = titleMatch || descMatch

      const videoCat = getVideoCategory(video)
      const matchesCategory = activeCategory === 'Todo' || videoCat === activeCategory

      return matchesSearch && matchesCategory
    })
  }, [publicVideos, searchQuery, activeCategory])

  return (
    <div className="w-full max-w-[1300px] mx-auto py-8 px-4 md:px-16">
      <div className="w-full flex flex-col gap-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold font-sora text-white mb-1">Explorar</h1>
            <p className="text-xs text-on-surface-variant font-light">Descubre producciones cinematográficas públicas de creadores en Rebideo.</p>
          </div>
          <div className="relative flex-grow max-w-[400px]">
            <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">search</span>
            <input 
              type="text" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar contenido público..." 
              className="w-full bg-white/[0.02] border border-outline focus:border-primary rounded-full py-3 pr-4 pl-[54px] text-white font-inter text-sm transition-all outline-none"
            />
          </div>
        </header>

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

        {/* Explore Feed Grid */}
        <section className="flex flex-col gap-6">
          <div className="flex justify-between items-end border-b border-outline pb-4 mb-2">
            <div>
              <h3 className="text-xl font-semibold mb-1 text-white font-sora">Historias Públicas</h3>
              <p className="text-xs text-on-surface-variant font-light">Contenido adaptativo HLS transmitido en vivo.</p>
            </div>
            <a href="#" className="text-xs text-on-surface-variant font-bold flex items-center gap-1 hover:text-white transition-colors" onClick={(e) => { e.preventDefault(); resetFilters(); }}>
              <span>Limpiar filtros</span>
              <span className="material-symbols-outlined text-xs">refresh</span>
            </a>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <span className="w-10 h-10 border-4 border-primary/10 border-l-primary rounded-full animate-spin"></span>
              <p className="text-sm font-light text-on-surface-variant">Buscando videos públicos...</p>
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
