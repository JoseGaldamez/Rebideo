"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { onAuthStateChanged, signOut, User } from 'firebase/auth'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { auth } from '../lib/firebase'

interface AuthContextType {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true })

export const useAuth = () => useContext(AuthContext)

export default function AppShell({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState<boolean>(true)
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!auth) {
      setAuthLoading(false)
      return
    }
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setAuthLoading(false)
    })
    
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (authLoading) return

    const isAuthRoute = pathname === '/login' || pathname === '/register'

    if (!user && !isAuthRoute) {
      router.push('/login')
    } else if (user && isAuthRoute) {
      router.push('/')
    }
  }, [user, authLoading, pathname, router])

  const toggleSettings = () => {
    alert('Configuración: Estilo Rebideo Minimalista activo.')
  }

  const showPlaceholderInfo = (page: string) => {
    alert(`${page}: Funcionalidad adicional en desarrollo.`)
  }

  const handleLogout = async () => {
    try {
      setShowUserMenu(false)
      if (auth) {
        await signOut(auth)
      }
      setUser(null)
      router.push('/login')
    } catch (err) {
      console.error('Error al cerrar sesión:', err)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading: authLoading }}>
      <div className="min-h-screen bg-obsidian text-on-surface relative z-0">
        {authLoading ? (
          <div className="fixed inset-0 flex flex-col items-center justify-center bg-obsidian z-50 gap-4">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="text-white text-3xl font-bold font-sora z-10">R</div>
              <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping"></div>
            </div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest animate-pulse">Cargando Portal de Contenido...</p>
          </div>
        ) : !user ? (
          <div className="min-h-screen flex items-center justify-center bg-obsidian">
            <main className="w-full flex justify-center px-4">
              {children}
            </main>
          </div>
        ) : (
          <div className="flex min-h-screen bg-obsidian">
            <aside className="w-20 bg-sidebar border-r border-outline flex flex-col justify-between items-center py-6 h-screen fixed top-0 left-0 z-40">
              <div className="flex items-center justify-center">
                <Link href="/" className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white font-sora font-bold text-xl hover:bg-white/10 hover:border-white/20 transition-all duration-300">R</Link>
              </div>
              
              <nav className="flex flex-col gap-6 w-full items-center">
                <Link 
                  href="/" 
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${pathname === '/' ? 'text-primary bg-white/5 border border-white/10' : 'text-on-surface-variant hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5'}`}
                  title="Inicio"
                >
                  <span className="material-symbols-outlined">home</span>
                </Link>
                <Link 
                  href="/explore" 
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${pathname === '/explore' ? 'text-primary bg-white/5 border border-white/10' : 'text-on-surface-variant hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5'}`}
                  title="Explorar"
                >
                  <span className="material-symbols-outlined">explore</span>
                </Link>
                <Link 
                  href="/upload" 
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${pathname === '/upload' ? 'text-primary bg-white/5 border border-white/10' : 'text-on-surface-variant hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5'}`}
                  title="Subir Video"
                >
                  <span className="material-symbols-outlined">cloud_upload</span>
                </Link>
                <Link 
                  href="/library" 
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${pathname === '/library' ? 'text-primary bg-white/5 border border-white/10' : 'text-on-surface-variant hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5'}`}
                  title="Biblioteca"
                >
                  <span className="material-symbols-outlined">video_library</span>
                </Link>
              </nav>
              
              <div className="flex flex-col gap-6 items-center w-full">
                <Link 
                  href="/settings" 
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${pathname === '/settings' ? 'text-primary bg-white/5 border border-white/10' : 'text-on-surface-variant hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5'}`}
                  title="Configuración"
                >
                  <span className="material-symbols-outlined">settings</span>
                </Link>
                
                <div className="profile-container relative">
                  <button 
                    className="w-12 h-12 rounded-full overflow-hidden border border-white/10 flex items-center justify-center bg-white/5 hover:border-white/20 transition-all duration-300 cursor-pointer" 
                    onClick={() => setShowUserMenu(!showUserMenu)} 
                    title={user?.email || ''}
                  >
                    <div className="text-white font-bold text-sm">
                      {user?.email?.charAt(0).toUpperCase()}
                    </div>
                  </button>
                  
                  {showUserMenu && (
                    <div className="absolute bottom-0 left-16 mb-2 w-48 rounded-xl glass p-4 flex flex-col gap-3 z-50">
                      <div className="pb-2 border-b border-white/5">
                        <span className="text-xs text-on-surface-variant break-all font-bold block">{user?.email}</span>
                      </div>
                      <button 
                        onClick={handleLogout} 
                        className="w-full py-2 px-4 border border-outline hover:border-white/30 text-white rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer bg-white/[0.02]"
                      >
                        Cerrar Sesión
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </aside>

            <main className="flex-1 ml-20 min-h-screen bg-obsidian">
              {children}
            </main>
          </div>
        )}
      </div>
    </AuthContext.Provider>
  )
}
