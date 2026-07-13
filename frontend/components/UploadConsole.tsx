"use client"

import React, { useState, useRef, useEffect } from 'react'
import { User } from 'firebase/auth'

interface UploadConsoleProps {
  user: User | null
  onCancel: () => void
  onUploadSuccess?: () => void
}

export default function UploadConsole({ user, onCancel, onUploadSuccess }: UploadConsoleProps) {
  const [videoTitle, setVideoTitle] = useState<string>('')
  const [videoDescription, setVideoDescription] = useState<string>('')
  const [videoCategory, setVideoCategory] = useState<string>('Cinematografía')
  const [videoVisibility, setVideoVisibility] = useState<string>('public')
  const [tags, setTags] = useState<string[]>(['CREATIVE'])

  // File and Drag States
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Upload Progress States
  const [uploading, setUploading] = useState<boolean>(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [uploadStatusMessage, setUploadStatusMessage] = useState<string>('')
  const [uploadError, setUploadError] = useState<string>('')
  const [videoSrc, setVideoSrc] = useState<string>('')

  // Tag Modal States
  const [showTagModal, setShowTagModal] = useState<boolean>(false)
  const [newTagInput, setNewTagInput] = useState<string>('')

  // Manage Local Video Object URL to avoid leaks
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile)
      setVideoSrc(url)
      return () => {
        URL.revokeObjectURL(url)
      }
    } else {
      setVideoSrc('')
    }
  }, [selectedFile])

  const handleClearFile = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (uploading) return
    setIsDragging(true)
  }

  const onDragLeave = () => {
    setIsDragging(false)
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (uploading) return
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files && files[0]) {
      validateAndAssignFile(files[0])
    }
  }

  const triggerFileSelect = () => {
    if (uploading) return
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      validateAndAssignFile(files[0])
    }
  }

  const validateAndAssignFile = (file: File) => {
    const isVideo = file.type === 'video/mp4' || file.type === 'video/webm'
    if (!isVideo) {
      setUploadError('Formato no soportado. Debe ser un video MP4 o WebM.')
      setSelectedFile(null)
      return
    }
    
    // Limit to 100MB
    if (file.size > 100 * 1024 * 1024) {
      setUploadError('El archivo supera el límite de 100MB.')
      setSelectedFile(null)
      return
    }
    
    setSelectedFile(file)
    setUploadError('')
  }

  const addTag = () => {
    setNewTagInput('')
    setShowTagModal(true)
  }

  const handleConfirmAddTag = () => {
    const sanitized = newTagInput.trim().replace('#', '').toUpperCase()
    if (sanitized) {
      if (!tags.includes(sanitized)) {
        setTags([...tags, sanitized])
      }
      setNewTagInput('')
      setShowTagModal(false)
    }
  }

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index))
  }

  const saveDraft = () => {
    alert('Borrador guardado localmente (Simulado).')
  }

  const handlePublish = async () => {
    if (!selectedFile || !user) return

    setUploading(true)
    setUploadProgress(0)
    setUploadStatusMessage('Solicitando autorización...')
    setUploadError('')

    try {
      const idToken = await user.getIdToken()
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8080'
      
      // 1. Get Signed URL from Backend
      const response = await fetch(`${apiBaseUrl}/upload-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          title: videoTitle,
          filename: selectedFile.name,
          content_type: selectedFile.type,
          description: videoDescription,
          visibility: videoVisibility
        })
      })

      if (!response.ok) {
        throw new Error('No se pudo generar el token de subida en la API.')
      }

      const { signed_url } = await response.json()

      // 2. Perform direct binary PUT stream to GCS
      setUploadStatusMessage('Subiendo archivo...')
      await uploadToSignedUrl(signed_url, selectedFile)

      setUploadStatusMessage('Completado con éxito')
      setUploadProgress(100)

      // Reset
      setVideoTitle('')
      setVideoDescription('')
      setVideoCategory('Cinematografía')
      setVideoVisibility('public')
      setTags(['CREATIVE'])
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      
      if (onUploadSuccess) {
        onUploadSuccess()
      }
    } catch (err: any) {
      console.error(err)
      setUploadError(err.message || 'Error en el proceso de subida.')
    } finally {
      setTimeout(() => {
        setUploading(false)
      }, 1000)
    }
  }

  const uploadToSignedUrl = (url: string, file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', url, true)
      xhr.setRequestHeader('Content-Type', file.type)
      
      if (url.includes('storage.googleapis.com')) {
        xhr.setRequestHeader('x-goog-content-length-range', '1,104857600')
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(percentComplete)
        }
      }

      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
          resolve()
        } else {
          reject(new Error(`Error al subir archivo a Storage. Estado: ${xhr.status}`))
        }
      }

      xhr.onerror = () => {
        reject(new Error('Fallo de red en la subida al Storage.'))
      }

      xhr.send(file)
    })
  }

  return (
    <div className="w-full flex flex-col gap-6 mt-3">
      {/* Header Area */}
      <header className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-3xl font-bold font-sora text-white mb-1">Upload Console</h2>
          <p className="text-xs text-on-surface-variant font-light">Prepara tu contenido para la comunidad global de Rebideo.</p>
        </div>
        <div className="flex items-center gap-4">
          <button className="bg-transparent border-none text-on-surface-variant hover:text-white cursor-pointer flex items-center justify-center p-2.5 rounded-full transition-all duration-200 hover:bg-white/5" title="Notificaciones">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="py-2 px-4 rounded-full text-xs font-semibold bg-white/[0.02] border border-outline hover:border-white/30 hover:bg-white/5 text-white transition-all cursor-pointer" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-col lg:flex-row gap-8 p-10 rounded-3xl glass">
        {/* Left Column: Media Zone & Core Settings */}
        <div className="flex-[4] flex flex-col gap-6">
          {/* Drag & Drop / Video Preview Zone */}
          <div 
            className={`group border rounded-3xl aspect-[16/10] overflow-hidden flex items-center justify-center transition-all duration-200 relative ${
              uploading ? 'pointer-events-none' : ''
            } ${
              selectedFile ? 'border-outline bg-black' :
              isDragging ? 'border-2 border-dashed border-secondary bg-secondary/5 scale-[0.99] cursor-pointer p-6' :
              'border-2 border-dashed border-outline bg-white/[0.01] hover:border-primary hover:bg-primary/[0.02] cursor-pointer p-6'
            }`}
            onDragOver={!selectedFile ? onDragOver : undefined}
            onDragLeave={!selectedFile ? onDragLeave : undefined}
            onDrop={!selectedFile ? onDrop : undefined}
            onClick={!selectedFile ? triggerFileSelect : undefined}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="video/mp4,video/webm" 
              className="hidden"
              onChange={onFileSelected}
              disabled={uploading}
            />
            
            {selectedFile ? (
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Clear / Select another video button */}
                <button 
                  type="button" 
                  onClick={handleClearFile}
                  className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-obsidian/85 hover:bg-black border border-white/10 hover:border-white/30 text-white flex items-center justify-center cursor-pointer transition-all duration-200 shadow-md backdrop-blur-xs"
                  title="Cambiar video"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
                
                {/* Video Player */}
                <video 
                  src={videoSrc}
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-contain outline-none"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 bg-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-4 text-primary transition-all duration-200 group-hover:translate-y-[-4px] group-hover:bg-primary/10 group-hover:text-white">
                  <span className="material-symbols-outlined text-3xl">upload</span>
                </div>
                <h4 className="text-lg font-semibold mb-1 text-white font-sora">Selecciona un video</h4>
                <p className="text-xs text-on-surface-variant mb-2">Arrastra tus archivos MP4 o WebM</p>
                <p className="text-[10px] text-on-surface-variant opacity-60 font-bold uppercase tracking-wider font-inter">Máx 100MB</p>
              </div>
            )}
          </div>

          {/* Category & Visibility Row */}
          <div className="flex flex-col sm:flex-row gap-5">
            {/* Category Select */}
            <div className="flex flex-col gap-3 flex-1">
              <label htmlFor="videoCategory" className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-inter">Categoría</label>
              <select 
                id="videoCategory" 
                value={videoCategory} 
                onChange={(e) => setVideoCategory(e.target.value)}
                className="w-full bg-white/[0.03] border border-outline focus:border-primary rounded-full py-3 px-4 pr-12 text-white font-inter text-sm transition-all outline-none appearance-none cursor-pointer bg-[image:var(--tw-select-bg)] bg-[size:16px] bg-[position:right_16px_center] bg-no-repeat"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`
                }}
                disabled={uploading}
              >
                <option value="Cinematografía" className="bg-obsidian">Cinematografía</option>
                <option value="Diseño Minimalista" className="bg-obsidian">Diseño Minimalista</option>
                <option value="Arquitectura & Espacios" className="bg-obsidian">Arquitectura & Espacios</option>
                <option value="Documentales" className="bg-obsidian">Documentales</option>
                <option value="Tecnología & Futuro" className="bg-obsidian">Tecnología & Futuro</option>
                <option value="Arte Digital" className="bg-obsidian">Arte Digital</option>
                <option value="Música & Sonido" className="bg-obsidian">Música & Sonido</option>
                <option value="Viajes & Naturaleza" className="bg-obsidian">Viajes & Naturaleza</option>
                <option value="Animación & Motion Design" className="bg-obsidian">Animación & Motion Design</option>
                <option value="Otra" className="bg-obsidian">Otra</option>
              </select>
            </div>

            {/* Visibility Select */}
            <div className="flex flex-col gap-3 flex-1">
              <label htmlFor="videoVisibility" className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-inter">Visibilidad</label>
              <select 
                id="videoVisibility" 
                value={videoVisibility} 
                onChange={(e) => setVideoVisibility(e.target.value)}
                className="w-full bg-white/[0.03] border border-outline focus:border-primary rounded-full py-3 px-4 pr-12 text-white font-inter text-sm transition-all outline-none appearance-none cursor-pointer bg-[image:var(--tw-select-bg)] bg-[size:16px] bg-[position:right_16px_center] bg-no-repeat"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`
                }}
                disabled={uploading}
              >
                <option value="public" className="bg-obsidian">Público (abierto)</option>
                <option value="private" className="bg-obsidian">Privado (solo tú)</option>
              </select>
            </div>
          </div>

          {/* Tags Select */}
          <div className="flex flex-col gap-3 w-full">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-inter">Etiquetas</label>
            <div className="flex flex-wrap gap-2 items-center py-2">
              {tags.map((tag, idx) => (
                <div key={idx} className="inline-flex items-center gap-1.5 bg-primary/8 border border-primary/15 text-primary py-1.5 px-3.5 rounded-full text-xs font-bold font-inter uppercase">
                  #{tag}
                  <span className="material-symbols-outlined text-sm cursor-pointer opacity-70 hover:opacity-100 transition-opacity" onClick={() => removeTag(idx)}>close</span>
                </div>
              ))}
              <button type="button" className="bg-white/[0.03] border border-dashed border-outline hover:bg-white/8 hover:border-on-surface-variant text-white py-1.5 px-3.5 rounded-full text-xs font-bold cursor-pointer transition-all duration-200" onClick={addTag}>
                + Add
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Metadata Form */}
        <div className="flex-[6] flex flex-col gap-6">
          {/* Title Input */}
          <div className="flex flex-col gap-3 w-full">
            <label htmlFor="videoTitle" className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-inter">Título del Video</label>
            <input 
              type="text" 
              id="videoTitle" 
              value={videoTitle} 
              onChange={(e) => setVideoTitle(e.target.value)}
              required 
              placeholder="Escribe un título impactante..."
              className="w-full bg-transparent border-0 border-b border-outline focus:border-b-primary py-3 text-white text-xl font-medium transition-all outline-none"
              disabled={uploading}
            />
          </div>

          {/* Description Textarea */}
          <div className="flex flex-col gap-3 w-full flex-grow">
            <label htmlFor="videoDescription" className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-inter">Descripción</label>
            <textarea 
              id="videoDescription" 
              value={videoDescription} 
              onChange={(e) => setVideoDescription(e.target.value)}
              placeholder="Cuéntanos la historia detrás de este video..."
              className="w-full bg-white/[0.03] border border-outline focus:border-primary rounded-2xl p-4 text-white font-inter text-sm transition-all outline-none resize-none flex-grow min-h-[220px]"
              disabled={uploading}
              rows={10}
            ></textarea>
          </div>

          {/* Error Panel */}
          {uploadError && (
            <div className="bg-error/8 border border-error/20 text-error p-3 rounded-lg flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined text-lg">error</span>
              <span>{uploadError}</span>
            </div>
          )}

          {/* Progress Panel */}
          {uploading && (
            <div className="mt-3 bg-white/[0.01] border border-outline rounded-lg p-4">
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-primary rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              <div className="flex justify-between text-on-surface-variant text-[10px] font-bold uppercase tracking-wider font-inter">
                <span>{uploadStatusMessage}</span>
                <span>{uploadProgress}%</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-4 mt-auto pt-6 border-t border-outline">
            <button 
              type="button" 
              className="bg-white/[0.02] border border-outline hover:border-white/30 hover:bg-white/5 text-white rounded-full text-xs font-semibold py-2.5 px-5 transition-all duration-200 cursor-pointer" 
              onClick={saveDraft}
              disabled={uploading}
            >
              Guardar Borrador
            </button>
            
            <button 
              type="button" 
              className="min-w-[160px] py-2.5 px-6 font-semibold bg-primary hover:bg-[#e9ddff] text-on-primary text-xs font-inter rounded-full flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-md shadow-primary/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none" 
              onClick={handlePublish}
              disabled={uploading || !videoTitle || !selectedFile}
            >
              {uploading ? 'Publicando...' : 'Publicar Historia'}
            </button>
          </div>
        </div>
      </div>

      {/* Tag Dialog Modal */}
      {showTagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in p-4">
          <div className="bg-obsidian border border-white/10 rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4 shadow-2xl relative">
            <button 
              type="button" 
              onClick={() => setShowTagModal(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-white bg-transparent border-none cursor-pointer flex items-center justify-center p-1 rounded-full hover:bg-white/5 transition-all"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
            
            <div>
              <h3 className="text-lg font-bold text-white font-sora mb-1">Añadir etiqueta</h3>
              <p className="text-xs text-on-surface-variant">Introduce una etiqueta para tu video (ej: TECH, MINIMAL)</p>
            </div>
            
            <input 
              type="text"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              placeholder="ETIQUETA..."
              className="w-full bg-white/[0.03] border border-outline focus:border-primary rounded-xl px-4 py-2.5 text-white uppercase text-sm font-semibold tracking-wider transition-all outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleConfirmAddTag()
                }
              }}
            />
            
            <div className="flex justify-end gap-3 mt-2">
              <button 
                type="button"
                onClick={() => setShowTagModal(false)}
                className="py-2 px-4 rounded-full text-xs font-semibold bg-transparent hover:bg-white/5 border border-transparent text-on-surface-variant hover:text-white cursor-pointer transition-all"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleConfirmAddTag}
                disabled={!newTagInput.trim()}
                className="py-2 px-5 rounded-full text-xs font-semibold bg-primary hover:bg-[#e9ddff] text-on-primary cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
