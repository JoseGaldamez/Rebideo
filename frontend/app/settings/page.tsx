"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../components/AppShell'

type SettingsTab = 'profile' | 'api' | 'player' | 'backend'

export default function SettingsPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [apiKey, setApiKey] = useState<string>('rbd_live_7a3d9f8c2e1b4096e5d8a0c2')
  const [isCopied, setIsCopied] = useState<boolean>(false)
  
  // Playback settings
  const [autoplay, setAutoplay] = useState<boolean>(true)
  const [defaultMuted, setDefaultMuted] = useState<boolean>(false)
  const [playbackQuality, setPlaybackQuality] = useState<string>('auto')

  // Backend test settings
  const [backendUrl, setBackendUrl] = useState<string>('')
  const [testingConnection, setTestingConnection] = useState<boolean>(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'failed'>('idle')

  useEffect(() => {
    setBackendUrl(process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8080')
  }, [])

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const generateNewKey = () => {
    const randomHex = Array.from({ length: 24 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('')
    setApiKey(`rbd_live_${randomHex}`)
    alert('Nueva llave API de creador generada exitosamente.')
  }

  const testBackendConnection = async () => {
    setTestingConnection(true)
    setConnectionStatus('idle')
    try {
      // Fetch health check or upload-token endpoint to check connectivity
      const response = await fetch(`${backendUrl}/health`, { method: 'GET' }).catch(() => null)
      
      // If /health doesn't exist, try root
      if (response && response.ok) {
        setConnectionStatus('success')
      } else {
        // Fallback check
        const rawRes = await fetch(`${backendUrl}/videos/check-status-endpoint-stub`).catch(() => null)
        if (rawRes) {
          setConnectionStatus('success')
        } else {
          setConnectionStatus('failed')
        }
      }
    } catch {
      setConnectionStatus('failed')
    } finally {
      setTestingConnection(false)
    }
  }

  const saveSettings = () => {
    alert('Preferencias guardadas localmente en la sesión.')
  }

  return (
    <div className="w-full max-w-[1100px] mx-auto py-8 px-4 md:px-16">
      <div className="w-full flex flex-col gap-10">
        {/* Header */}
        <header className="border-b border-outline pb-6">
          <h1 className="text-3xl font-bold font-sora text-white mb-1">Configuración</h1>
          <p className="text-xs text-on-surface-variant font-light">Personaliza tu portal de streaming, credenciales API de integración y endpoints de conexión.</p>
        </header>

        {/* Main Panel layout */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Side Menu */}
          <aside className="w-full md:w-64 flex flex-col gap-1">
            <button 
              className={`w-full text-left py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest font-inter transition-all cursor-pointer flex items-center gap-3 ${
                activeTab === 'profile' 
                ? 'bg-white/5 border border-outline text-white' 
                : 'text-on-surface-variant hover:text-white hover:bg-white/[0.02] border border-transparent'
              }`}
              onClick={() => setActiveTab('profile')}
            >
              <span className="material-symbols-outlined text-lg">person</span>
              <span>Perfil</span>
            </button>
            <button 
              className={`w-full text-left py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest font-inter transition-all cursor-pointer flex items-center gap-3 ${
                activeTab === 'api' 
                ? 'bg-white/5 border border-outline text-white' 
                : 'text-on-surface-variant hover:text-white hover:bg-white/[0.02] border border-transparent'
              }`}
              onClick={() => setActiveTab('api')}
            >
              <span className="material-symbols-outlined text-lg">key</span>
              <span>API & Llaves</span>
            </button>
            <button 
              className={`w-full text-left py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest font-inter transition-all cursor-pointer flex items-center gap-3 ${
                activeTab === 'player' 
                ? 'bg-white/5 border border-outline text-white' 
                : 'text-on-surface-variant hover:text-white hover:bg-white/[0.02] border border-transparent'
              }`}
              onClick={() => setActiveTab('player')}
            >
              <span className="material-symbols-outlined text-lg">play_circle</span>
              <span>Reproductor</span>
            </button>
            <button 
              className={`w-full text-left py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest font-inter transition-all cursor-pointer flex items-center gap-3 ${
                activeTab === 'backend' 
                ? 'bg-white/5 border border-outline text-white' 
                : 'text-on-surface-variant hover:text-white hover:bg-white/[0.02] border border-transparent'
              }`}
              onClick={() => setActiveTab('backend')}
            >
              <span className="material-symbols-outlined text-lg">settings_ethernet</span>
              <span>Servidor Local</span>
            </button>
          </aside>

          {/* Form Content Panel */}
          <main className="flex-1 w-full glass rounded-3xl p-8 md:p-10 flex flex-col gap-6">
            {/* Tab: Profile */}
            {activeTab === 'profile' && (
              <div className="flex flex-col gap-6 w-full animate-[fadeIn_0.2s_ease-out]">
                <h3 className="text-lg font-semibold text-white font-sora border-b border-outline pb-3">Detalles del Perfil</h3>
                
                <div className="flex items-center gap-6 pb-4">
                  <div className="w-20 h-20 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center text-white text-3xl font-bold font-sora">
                    {user?.email?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-white leading-snug">{user?.email}</h4>
                    <span className="inline-flex items-center px-2 py-0.5 mt-1.5 rounded-sm text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/15">Creador Pro</span>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-inter">Identificador Único Creador</label>
                    <input 
                      type="text" 
                      value={user?.uid || 'no-id'} 
                      readOnly 
                      className="w-full bg-white/[0.01] border border-outline rounded-xl py-3 px-4 text-on-surface-variant font-mono text-xs outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-inter">Correo Electrónico</label>
                    <input 
                      type="text" 
                      value={user?.email || ''} 
                      readOnly 
                      className="w-full bg-white/[0.01] border border-outline rounded-xl py-3 px-4 text-on-surface-variant font-inter text-sm outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab: API & Keys */}
            {activeTab === 'api' && (
              <div className="flex flex-col gap-6 w-full animate-[fadeIn_0.2s_ease-out]">
                <h3 className="text-lg font-semibold text-white font-sora border-b border-outline pb-3">Credenciales de Integración</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">Usa estas llaves para autenticar tus cargas a la API de Rebideo desde tu consola de comandos (CLI) o scripts automatizados de ingesta.</p>
                
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-inter">Llave Secreta API (Live)</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={apiKey} 
                        readOnly 
                        className="flex-grow bg-black/20 border border-outline rounded-xl py-3 px-4 text-white font-mono text-xs outline-none"
                      />
                      <button 
                        onClick={copyApiKey} 
                        className="py-2.5 px-4 rounded-xl border border-outline hover:border-white/30 text-white font-semibold text-xs cursor-pointer bg-white/[0.02] flex items-center gap-1 transition-all duration-200"
                      >
                        <span className="material-symbols-outlined text-base">
                          {isCopied ? 'check' : 'content_copy'}
                        </span>
                        <span>{isCopied ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-2">
                    <button 
                      onClick={generateNewKey} 
                      className="py-2.5 px-5 font-semibold bg-white hover:bg-zinc-100 text-black text-xs font-inter rounded-full flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-md"
                    >
                      Regenerar Llave API
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Player Settings */}
            {activeTab === 'player' && (
              <div className="flex flex-col gap-6 w-full animate-[fadeIn_0.2s_ease-out]">
                <h3 className="text-lg font-semibold text-white font-sora border-b border-outline pb-3">Ajustes del Reproductor HLS</h3>
                
                <div className="flex flex-col gap-5">
                  <div className="flex items-center justify-between py-2 border-b border-white/[0.03]">
                    <div>
                      <h4 className="text-sm font-semibold text-white leading-normal">Reproducción Automática</h4>
                      <p className="text-xs text-on-surface-variant font-light">Iniciar video de manera automática al abrir la pantalla de watch.</p>
                    </div>
                    <button 
                      onClick={() => setAutoplay(!autoplay)} 
                      className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200 flex items-center ${
                        autoplay ? 'bg-primary justify-end' : 'bg-zinc-800 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 bg-obsidian rounded-full"></div>
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-white/[0.03]">
                    <div>
                      <h4 className="text-sm font-semibold text-white leading-normal">Silenciar por Defecto</h4>
                      <p className="text-xs text-on-surface-variant font-light">Iniciar videos silenciados para cumplir con las directivas de reproducción web.</p>
                    </div>
                    <button 
                      onClick={() => setDefaultMuted(!defaultMuted)} 
                      className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200 flex items-center ${
                        defaultMuted ? 'bg-primary justify-end' : 'bg-zinc-800 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 bg-obsidian rounded-full"></div>
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="playbackQuality" className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-inter">Calidad de Video HLS Inicial</label>
                    <select 
                      id="playbackQuality" 
                      value={playbackQuality} 
                      onChange={(e) => setPlaybackQuality(e.target.value)}
                      className="w-full max-w-[320px] bg-white/[0.03] border border-outline focus:border-primary rounded-full py-3 px-4 pr-12 text-white font-inter text-sm transition-all outline-none appearance-none cursor-pointer bg-[image:var(--tw-select-bg)] bg-[size:16px] bg-[position:right_16px_center] bg-no-repeat"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`
                      }}
                    >
                      <option value="auto" className="bg-obsidian">Auto (ABR Adaptativo)</option>
                      <option value="1080p" className="bg-obsidian">1080p HD (Alta prioridad)</option>
                      <option value="720p" className="bg-obsidian">720p (Balanceado)</option>
                      <option value="480p" className="bg-obsidian">480p (Ahorro de datos)</option>
                    </select>
                  </div>

                  <div className="pt-4 flex">
                    <button 
                      onClick={saveSettings} 
                      className="py-2.5 px-6 font-semibold bg-white hover:bg-zinc-100 text-black text-xs font-inter rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-md"
                    >
                      Guardar Preferencias
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Local Server & Connection Check */}
            {activeTab === 'backend' && (
              <div className="flex flex-col gap-6 w-full animate-[fadeIn_0.2s_ease-out]">
                <h3 className="text-lg font-semibold text-white font-sora border-b border-outline pb-3">Servidor de API Backend</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">Verifica el estado de comunicación del portal frontend con la API de procesamiento transcodificador escrita en Go.</p>
                
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-inter">Endpoint API Base</label>
                    <input 
                      type="text" 
                      value={backendUrl} 
                      onChange={(e) => setBackendUrl(e.target.value)}
                      className="w-full bg-white/[0.03] border border-outline focus:border-primary rounded-xl py-3 px-4 text-white font-mono text-sm outline-none"
                    />
                  </div>

                  {connectionStatus !== 'idle' && (
                    <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm ${
                      connectionStatus === 'success' 
                      ? 'bg-success/8 border-success/20 text-success' 
                      : 'bg-error/8 border-error/20 text-error'
                    }`}>
                      <span className="material-symbols-outlined text-lg">
                        {connectionStatus === 'success' ? 'check_circle' : 'error'}
                      </span>
                      <span>
                        {connectionStatus === 'success' 
                          ? 'Conexión con el servidor backend Go establecida con éxito.' 
                          : 'No se pudo conectar con el backend. Asegúrate de iniciar la API de Go.'}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 flex gap-4">
                    <button 
                      onClick={testBackendConnection} 
                      disabled={testingConnection}
                      className="py-2.5 px-6 font-semibold bg-white hover:bg-zinc-100 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-black text-xs font-inter rounded-full flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-md"
                    >
                      {testingConnection ? (
                        <>
                          <span className="w-4 h-4 border-2 border-zinc-600 border-l-black rounded-full animate-spin"></span>
                          <span>Comprobando...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-base">wifi</span>
                          <span>Comprobar Conexión</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
