import React, { useState, useEffect } from 'react'
import { useAuth } from './AppShell'
import { Video } from '../types'

interface EditVideoModalProps {
  isOpen: boolean
  onClose: () => void
  video: Video
  onSaveSuccess: (updatedFields: { title: string; description: string; visibility: 'public' | 'private' }) => void
}

export default function EditVideoModal({ isOpen, onClose, video, onSaveSuccess }: EditVideoModalProps) {
  const { user } = useAuth()
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editVisibility, setEditVisibility] = useState<'public' | 'private'>('public')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (video) {
      setEditTitle(video.title)
      setEditDescription(video.description || '')
      setEditVisibility(video.visibility)
    }
  }, [video])

  const handleSaveChanges = async () => {
    if (!editTitle.trim()) return
    setSaving(true)
    setSaveError('')
    try {
      if (!user) throw new Error('Usuario no autenticado.')
      const idToken = await user.getIdToken()
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8080'
      const response = await fetch(`${apiBaseUrl}/videos/${video.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          visibility: editVisibility
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'No se pudieron guardar los cambios.')
      }

      onSaveSuccess({
        title: editTitle,
        description: editDescription,
        visibility: editVisibility
      })
      onClose()
    } catch (err: any) {
      console.error(err)
      setSaveError(err.message || 'Error al guardar los cambios.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-[540px] rounded-3xl p-8 bg-obsidian border border-white/10 flex flex-col gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        {/* Header Block */}
        <div className="flex justify-between items-center pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-lg">edit_note</span>
            </div>
            <h3 className="text-lg font-semibold text-white font-sora tracking-tight">Editar Detalles</h3>
          </div>
          <button 
            onClick={() => {
              onClose()
              setSaveError('')
            }}
            className="text-on-surface-variant hover:text-white transition-colors cursor-pointer w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {saveError && (
          <div className="p-4 rounded-xl bg-error/10 border border-error/25 text-error text-xs font-inter flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">warning</span>
            <span>{saveError}</span>
          </div>
        )}

        {/* Video Mini Preview Banner */}
        <div className="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 items-center">
          <div className="w-[100px] aspect-[16/10] bg-black border border-white/10 rounded-xl overflow-hidden relative flex-shrink-0">
            {video.thumbnail_url ? (
              <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-lg">movie</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-white/70 text-sm">edit</span>
            </div>
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[9px] font-bold text-primary uppercase tracking-widest font-inter">Editando Metadatos</span>
            <h4 className="text-xs font-semibold text-white truncate font-sora">{video.title}</h4>
            <p className="text-[10px] text-on-surface-variant truncate font-inter">ID: {video.id}</p>
          </div>
        </div>

        {/* Edit Form */}
        <div className="flex flex-col gap-4">
          {/* Title */}
          <div className="flex flex-col gap-2">
            <label htmlFor="editTitle" className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-inter">Título del Video</label>
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-base">
                subtitles
              </span>
              <input 
                type="text" 
                id="editTitle"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-white/[0.015] border border-white/[0.08] hover:border-white/15 focus:border-primary/50 focus:bg-white/[0.035] rounded-xl py-3.5 pr-4 pl-11 text-white font-inter text-sm transition-all outline-none focus:ring-1 focus:ring-primary/20 focus:shadow-[0_0_15px_rgba(208,188,255,0.06)]"
                placeholder="Título del video"
                disabled={saving}
              />
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <label htmlFor="editDescription" className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-inter">Descripción</label>
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-4 top-4 text-on-surface-variant text-base">
                description
              </span>
              <textarea 
                id="editDescription"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
                className="w-full bg-white/[0.015] border border-white/[0.08] hover:border-white/15 focus:border-primary/50 focus:bg-white/[0.035] rounded-xl py-3.5 pr-4 pl-11 text-white font-inter text-sm transition-all outline-none resize-none focus:ring-1 focus:ring-primary/20 focus:shadow-[0_0_15px_rgba(208,188,255,0.06)]"
                placeholder="Describe de qué trata tu video..."
                disabled={saving}
              />
            </div>
          </div>

          {/* Visibility custom cards */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-inter">Visibilidad</label>
            <div className="grid grid-cols-2 gap-4">
              {/* Public Card */}
              <div 
                onClick={() => !saving && setEditVisibility('public')}
                className={`p-4 rounded-2xl border transition-all flex flex-col gap-2 select-none ${
                  saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                } ${
                  editVisibility === 'public' 
                  ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(208,188,255,0.08)]' 
                  : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-md ${editVisibility === 'public' ? 'text-primary' : 'text-on-surface-variant'}`}>
                    public
                  </span>
                  <span className="text-xs font-semibold text-white font-sora">Público</span>
                </div>
                <p className="text-[10px] text-on-surface-variant leading-relaxed">
                  Cualquier persona en Rebideo podrá ver e interactuar con este video.
                </p>
              </div>

              {/* Private Card */}
              <div 
                onClick={() => !saving && setEditVisibility('private')}
                className={`p-4 rounded-2xl border transition-all flex flex-col gap-2 select-none ${
                  saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                } ${
                  editVisibility === 'private' 
                  ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(208,188,255,0.08)]' 
                  : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-md ${editVisibility === 'private' ? 'text-primary' : 'text-on-surface-variant'}`}>
                    lock
                  </span>
                  <span className="text-xs font-semibold text-white font-sora">Privado</span>
                </div>
                <p className="text-[10px] text-on-surface-variant leading-relaxed">
                  Solo tú podrás ver este video y editar sus configuraciones.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
          <button 
            onClick={() => {
              onClose()
              setSaveError('')
            }}
            className="py-2.5 px-6 font-semibold bg-transparent hover:bg-white/5 border border-outline text-white text-xs font-inter rounded-full transition-all cursor-pointer"
            disabled={saving}
          >
            Cancelar
          </button>
          <button 
            onClick={handleSaveChanges}
            className="py-2.5 px-6 font-semibold bg-gradient-to-r from-primary to-[#b89eff] hover:from-[#c2acff] hover:to-[#a78aff] text-on-primary text-xs font-inter rounded-full flex items-center justify-center gap-2 cursor-pointer transition-all hover:shadow-[0_4px_15px_rgba(208,188,255,0.35)] disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={saving || !editTitle.trim()}
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/20 border-l-white rounded-full animate-spin"></span>
                <span>Guardando...</span>
              </>
            ) : (
              <span>Guardar Cambios</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
