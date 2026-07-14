import React, { useState } from 'react'
import { useAuth } from './AppShell'

interface DeleteVideoModalProps {
  isOpen: boolean
  onClose: () => void
  videoId: string
  onDeleteSuccess: () => void
}

export default function DeleteVideoModal({ isOpen, onClose, videoId, onDeleteSuccess }: DeleteVideoModalProps) {
  const { user } = useAuth()
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const handleDeleteVideo = async () => {
    setDeleting(true)
    setDeleteError('')
    try {
      if (!user) throw new Error('Usuario no autenticado.')
      const idToken = await user.getIdToken()
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8080'
      const response = await fetch(`${apiBaseUrl}/videos/${videoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'No se pudo eliminar el video.')
      }

      onDeleteSuccess()
    } catch (err: any) {
      console.error(err)
      setDeleteError(err.message || 'Error al eliminar el video.')
    } finally {
      setDeleting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-[440px] rounded-3xl p-8 bg-obsidian border border-error/10 flex flex-col gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-error/10 border border-error/20 flex items-center justify-center text-error animate-pulse">
            <span className="material-symbols-outlined text-3xl">delete_forever</span>
          </div>
          <h3 className="text-xl font-semibold text-white font-sora">¿Eliminar este video?</h3>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Esta acción es **permanente**. Se eliminarán todos los archivos de transmisión HLS y la información del video en la base de datos de manera definitiva.
          </p>
        </div>

        {deleteError && (
          <div className="p-4 rounded-xl bg-error/15 border border-error/25 text-error text-xs font-inter flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">warning</span>
            <span>{deleteError}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center pt-2">
          <button 
            onClick={() => {
              onClose()
              setDeleteError('')
            }}
            className="py-2.5 px-6 font-semibold bg-transparent hover:bg-white/5 border border-outline text-white text-xs font-inter rounded-full transition-all cursor-pointer flex-1"
            disabled={deleting}
          >
            Cancelar
          </button>
          <button 
            onClick={handleDeleteVideo}
            className="py-2.5 px-6 font-semibold bg-error hover:bg-error-hover text-white text-xs font-inter rounded-full flex items-center justify-center gap-2 cursor-pointer transition-all flex-1"
            disabled={deleting}
          >
            {deleting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/20 border-l-white rounded-full animate-spin"></span>
                <span>Eliminando...</span>
              </>
            ) : (
              <span>Eliminar</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
