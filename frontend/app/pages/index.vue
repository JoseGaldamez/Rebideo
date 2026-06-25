<template>
  <div class="container">
    <!-- Si el usuario no está autenticado, mostrar formulario de Login/Registro -->
    <div v-if="!user" class="auth-card glass">
      <h2>Comienza con Rebideo</h2>
      <p class="subtitle">Inicia sesión o crea una cuenta para subir videos</p>

      <form @submit.prevent="handleAuth" class="auth-form">
        <div class="form-group">
          <label for="email">Correo Electrónico</label>
          <input 
            type="email" 
            id="email" 
            v-model="email" 
            required 
            placeholder="tu@correo.com"
          />
        </div>
        <div class="form-group">
          <label for="password">Contraseña</label>
          <input 
            type="password" 
            id="password" 
            v-model="password" 
            required 
            placeholder="••••••••"
          />
        </div>

        <div v-if="authError" class="error-msg">
          {{ authError }}
        </div>

        <button type="submit" class="btn btn-primary w-full" :disabled="authLoading">
          {{ authLoading ? 'Cargando...' : (isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión') }}
        </button>
      </form>

      <div class="auth-toggle">
        <a href="#" @click.prevent="isSignUp = !isSignUp">
          {{ isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate' }}
        </a>
      </div>
    </div>

    <!-- Panel principal si el usuario está autenticado -->
    <div v-else class="dashboard">
      <section class="upload-section glass">
        <h3>Subir Nuevo Video</h3>
        <p class="upload-limit">Tamaño máximo de archivo: 100MB (Formatos MP4/WebM)</p>
        
        <form @submit.prevent="handleUpload" class="upload-form">
          <div class="form-group">
            <label for="videoTitle">Título del Video</label>
            <input 
              type="text" 
              id="videoTitle" 
              v-model="videoTitle" 
              required 
              placeholder="Ej: Mi viaje a la playa"
              :disabled="uploading"
            />
          </div>

          <div class="form-group">
            <label for="videoDescription">Descripción</label>
            <textarea 
              id="videoDescription" 
              v-model="videoDescription" 
              placeholder="Describe de qué trata tu video..."
              :disabled="uploading"
              rows="3"
            ></textarea>
          </div>

          <div class="form-group">
            <label for="videoVisibility">Visibilidad</label>
            <select 
              id="videoVisibility" 
              v-model="videoVisibility" 
              :disabled="uploading"
            >
              <option value="public">Público (cualquiera puede verlo)</option>
              <option value="private">Privado (solo tú puedes verlo)</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="videoFile">Seleccionar Archivo</label>
            <div class="file-input-wrapper">
              <input 
                type="file" 
                id="videoFile" 
                ref="fileInputRef" 
                accept="video/mp4,video/webm" 
                required 
                @change="onFileSelected"
                :disabled="uploading"
              />
              <div class="file-placeholder">
                <span class="file-icon">📁</span>
                <span class="file-text">{{ selectedFile ? selectedFile.name : 'Arrastra o selecciona un archivo' }}</span>
              </div>
            </div>
          </div>

          <div v-if="uploadError" class="error-msg">
            {{ uploadError }}
          </div>

          <!-- Barra de Progreso de Subida -->
          <div v-if="uploading" class="progress-container">
            <div class="progress-bar-wrapper">
              <div class="progress-bar-fill" :style="{ width: uploadProgress + '%' }"></div>
            </div>
            <div class="progress-status">
              <span>{{ uploadStatusMessage }}</span>
              <span>{{ uploadProgress }}%</span>
            </div>
          </div>

          <button type="submit" class="btn btn-primary" :disabled="uploading">
            {{ uploading ? 'Subiendo...' : 'Iniciar Subida' }}
          </button>
        </form>
      </section>

      <section class="videos-section">
        <h3>Tus Videos</h3>
        
        <div v-if="videos.length === 0" class="empty-state glass">
          <span class="empty-icon">📺</span>
          <p>No tienes ningún video aún. ¡Sube el primero arriba!</p>
        </div>

        <div v-else class="video-grid">
          <div v-for="video in videos" :key="video.id" class="video-card glass">
            <div class="video-thumbnail-placeholder">
              <span class="video-play-btn">▶</span>
            </div>
            <div class="video-info">
              <h4>{{ video.title }}</h4>
              <div class="video-meta">
                <span class="status-badge" :class="video.status">
                  {{ translateStatus(video.status) }}
                </span>
                <span class="date">{{ formatDate(video.created_at) }}</span>
              </div>
              <NuxtLink 
                :to="`/watch/${video.id}`" 
                class="btn btn-outline btn-sm watch-btn"
                :class="{ disabled: video.status !== 'active' }"
                :aria-disabled="video.status !== 'active'"
              >
                Ver Video
              </NuxtLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged 
} from 'firebase/auth'
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore'

const { $firebaseAuth, $firebaseDb } = useNuxtApp()
const config = useRuntimeConfig()

// Auth State
const user = ref(null)
const email = ref('')
const password = ref('')
const isSignUp = ref(false)
const authError = ref('')
const authLoading = ref(false)

// Upload State
const videoTitle = ref('')
const videoDescription = ref('')
const videoVisibility = ref('public')
const selectedFile = ref(null)
const fileInputRef = ref(null)
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadStatusMessage = ref('')
const uploadError = ref('')

// Videos State
const videos = ref([])
let unsubscribeVideos = null

onMounted(() => {
  onAuthStateChanged($firebaseAuth, (currentUser) => {
    user.value = currentUser
    if (currentUser) {
      subscribeToVideos()
    } else {
      videos.value = []
      if (unsubscribeVideos) unsubscribeVideos()
    }
  })
})

onBeforeUnmount(() => {
  if (unsubscribeVideos) unsubscribeVideos()
})

// Manejar Login / Registro
const handleAuth = async () => {
  authError.value = ''
  authLoading.value = true
  try {
    if (isSignUp.value) {
      await createUserWithEmailAndPassword($firebaseAuth, email.value, password.value)
    } else {
      await signInWithEmailAndPassword($firebaseAuth, email.value, password.value)
    }
    email.value = ''
    password.value = ''
  } catch (err) {
    console.error(err)
    if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
      authError.value = 'Correo o contraseña incorrectos.'
    } else if (err.code === 'auth/email-already-in-use') {
      authError.value = 'El correo ya está registrado.'
    } else if (err.code === 'auth/weak-password') {
      authError.value = 'La contraseña debe tener al menos 6 caracteres.'
    } else {
      authError.value = 'Error de autenticación. Revisa los datos.'
    }
  } finally {
    authLoading.value = false
  }
}

// Selección de Archivo
const onFileSelected = (event) => {
  const files = event.target.files
  if (files && files[0]) {
    const file = files[0]
    if (file.size > 100 * 1024 * 1024) {
      uploadError.value = 'El archivo supera el límite de 100MB.'
      selectedFile.value = null
      event.target.value = ''
      return
    }
    selectedFile.value = file
    uploadError.value = ''
  }
}

// Proceso de Subida
const handleUpload = async () => {
  if (!selectedFile.value || !user.value) return

  uploading.value = true
  uploadProgress.value = 0
  uploadStatusMessage.value = 'Solicitando autorización...'
  uploadError.value = ''

  try {
    const idToken = await user.value.getIdToken()
    
    // 1. Obtener URL firmada desde el Backend
    const response = await fetch(`${config.public.apiBaseUrl}/upload-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        title: videoTitle.value,
        filename: selectedFile.value.name,
        content_type: selectedFile.value.type,
        description: videoDescription.value,
        visibility: videoVisibility.value
      })
    })

    if (!response.ok) {
      throw new Error('No se pudo generar el token de subida en la API.')
    }

    const { signed_url } = await response.json()

    // 2. Subir directamente el archivo binario a GCS/Storage
    uploadStatusMessage.value = 'Subiendo archivo...'
    await uploadToSignedUrl(signed_url, selectedFile.value)

    uploadStatusMessage.value = 'Completado con éxito'
    uploadProgress.value = 100

    // Resetear formulario
    videoTitle.value = ''
    videoDescription.value = ''
    videoVisibility.value = 'public'
    selectedFile.value = null
    if (fileInputRef.value) fileInputRef.value.value = ''
    
    // Cerrar estado de carga tras un momento
    setTimeout(() => {
      uploading.value = false
    }, 1500)

  } catch (err) {
    console.error(err)
    uploadError.value = err.message || 'Error en el proceso de subida.'
    uploading.value = false
  }
}

// Subida a URL Firmada usando XMLHttpRequest para monitorear el progreso
const uploadToSignedUrl = (url, file) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url, true)
    xhr.setRequestHeader('Content-Type', file.type)
    
    // Solo enviar cabecera de rango si estamos en producción (GCS real),
    // ya que el emulador local fake-gcs-server no la reconoce y devuelve 400.
    if (url.includes('storage.googleapis.com')) {
      xhr.setRequestHeader('x-goog-content-length-range', '1,104857600')
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100)
        uploadProgress.value = percentComplete
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

// Escuchar cambios en Firestore en tiempo real (Real-time updates)
const subscribeToVideos = () => {
  if (unsubscribeVideos) unsubscribeVideos()

  const q = query(
    collection($firebaseDb, 'videos'),
    where('user_id', '==', user.value.uid)
  )  

  unsubscribeVideos = onSnapshot(q, (snapshot) => {
    const loadedVideos = []


    snapshot.forEach((doc) => {     

      const data = doc.data()
      loadedVideos.push({
        id: doc.id,
        ...data
      })
    })

    // Ordenar por created_at desc en memoria para evitar requerir índices compuestos en Firestore
    loadedVideos.sort((a, b) => {
      const timeA = a.created_at?.toDate ? a.created_at.toDate().getTime() : new Date(a.created_at).getTime()
      const timeB = b.created_at?.toDate ? b.created_at.toDate().getTime() : new Date(b.created_at).getTime()
      return timeB - timeA
    })

    videos.value = loadedVideos
  }, (err) => {
    console.error('Error al escuchar videos:', err)
  })
}

// Helpers
const translateStatus = (status) => {
  const map = {
    'pending': 'Pendiente',
    'processing': 'Procesando...',
    'active': 'Activo',
    'failed': 'Falló',
    'expired': 'Expirado (30d)'
  }
  return map[status] || status
}

const formatDate = (timestamp) => {
  if (!timestamp) return ''
  // Firestore timestamp to date
  let date = timestamp
  if (timestamp.toDate) {
    date = timestamp.toDate()
  } else if (typeof timestamp === 'string') {
    date = new Date(timestamp)
  }
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
}

.glass {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 2rem;
}

/* Auth Card */
.auth-card {
  max-width: 450px;
  margin: 4rem auto;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.auth-card h2 {
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, #a78bfa 0%, #818cf8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  color: #9ca3af;
  font-size: 0.95rem;
  margin-bottom: 2rem;
}

.auth-form {
  text-align: left;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  color: #d1d5db;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input[type="text"],
.form-group input[type="email"],
.form-group input[type="password"],
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  border-color: #6366f1;
  background: rgba(0, 0, 0, 0.3);
}

.form-group select option {
  background: #111;
  color: white;
}

.w-full {
  width: 100%;
}

.error-msg {
  background: rgba(ef, 44, 44, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  padding: 0.75rem;
  border-radius: 8px;
  margin-bottom: 1.25rem;
  font-size: 0.875rem;
  text-align: center;
}

.auth-toggle {
  margin-top: 1.5rem;
  font-size: 0.875rem;
}

.auth-toggle a {
  color: #818cf8;
  text-decoration: none;
  transition: color 0.2s;
}

.auth-toggle a:hover {
  color: #a78bfa;
}

/* Dashboard */
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.upload-section h3,
.videos-section h3 {
  font-size: 1.35rem;
  margin-bottom: 1.5rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.upload-limit {
  font-size: 0.85rem;
  color: #9ca3af;
  margin-bottom: 1.5rem;
  margin-top: -1rem;
}

/* File Input Wrapper */
.file-input-wrapper {
  position: relative;
  width: 100%;
  height: 100px;
  border: 2px dashed rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s;
}

.file-input-wrapper:hover {
  border-color: #6366f1;
}

.file-input-wrapper input[type="file"] {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 10;
}

.file-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: #9ca3af;
}

.file-icon {
  font-size: 1.8rem;
}

.file-text {
  font-size: 0.9rem;
}

/* Progress Container */
.progress-container {
  margin: 1.5rem 0;
}

.progress-bar-wrapper {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #a78bfa);
  border-radius: 4px;
  transition: width 0.1s ease-out;
}

.progress-status {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #9ca3af;
  margin-top: 0.5rem;
}

/* Videos List */
.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: #9ca3af;
}

.empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
  opacity: 0.4;
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.5rem;
}

.video-card {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s, box-shadow 0.2s;
}

.video-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.video-thumbnail-placeholder {
  aspect-ratio: 16 / 9;
  background: linear-gradient(135deg, #1e1b4b 0%, #311042 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.video-play-btn {
  font-size: 1.5rem;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(0, 0, 0, 0.4);
  width: 45px;
  height: 45px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-left: 4px; /* Centrar icono de play */
  transition: background 0.2s, transform 0.2s;
}

.video-card:hover .video-play-btn {
  background: #6366f1;
  color: white;
  transform: scale(1.1);
}

.video-info {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex-grow: 1;
}

.video-info h4 {
  font-size: 1rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.video-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
}

.status-badge {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.pending {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.status-badge.processing {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
}

.status-badge.active {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.status-badge.failed {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
}

.status-badge.expired {
  background: rgba(107, 114, 128, 0.15);
  color: #d1d5db;
}

.date {
  color: #9ca3af;
}

.watch-btn {
  margin-top: auto;
  text-align: center;
}

.watch-btn.disabled {
  pointer-events: none;
  opacity: 0.4;
}
</style>
