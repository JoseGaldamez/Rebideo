<template>
  <div class="watch-container">
    <div class="back-nav">
      <NuxtLink to="/" class="back-link">← Volver al Dashboard</NuxtLink>
    </div>

    <!-- Carga inicial -->
    <div v-if="loading" class="state-card glass">
      <div class="spinner"></div>
      <p>Cargando información del video...</p>
    </div>

    <!-- Errores -->
    <div v-else-if="error" class="state-card glass error">
      <span class="state-icon">⚠️</span>
      <h3>Ocurrió un error</h3>
      <p>{{ error }}</p>
      <NuxtLink to="/" class="btn btn-outline btn-sm">Volver al inicio</NuxtLink>
    </div>

    <!-- Video no activo (Procesando, Fallido, etc.) -->
    <div v-else-if="video && video.status !== 'active'" class="state-card glass status-hold">
      <span class="state-icon" :class="video.status">
        {{ video.status === 'processing' || video.status === 'pending' ? '⏳' : '❌' }}
      </span>
      <h3>El video no está disponible</h3>
      <p class="status-explanation">
        {{ getStatusMessage(video.status) }}
      </p>
      <div class="video-details">
        <p><strong>Título:</strong> {{ video.title }}</p>
        <p><strong>Estado:</strong> <span class="status-text" :class="video.status">{{ translateStatus(video.status) }}</span></p>
      </div>
      <button @click="fetchVideo" class="btn btn-outline btn-sm">Actualizar Estado</button>
    </div>

    <!-- Reproductor si el video está activo -->
    <div v-else-if="video && video.status === 'active'" class="video-content">
      <div class="player-wrapper">
        <HlsVideoPlayer :src="video.playlist_url" />
      </div>
      <div class="video-header">
        <h2>{{ video.title }}</h2>
        <div class="video-meta">
          <span class="status-badge active">Activo</span>
          <span class="info-label">Listo para transmisión adaptativa (HLS)</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const config = useRuntimeConfig()

const videoId = route.params.id
const video = ref(null)
const loading = ref(true)
const error = ref('')

const fetchVideo = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await fetch(`${config.public.apiBaseUrl}/videos/${videoId}`)
    if (response.status === 404) {
      throw new Error('El video solicitado no existe o ha expirado.')
    }
    if (!response.ok) {
      throw new Error('No se pudo recuperar la información del video.')
    }
    const data = await response.json()
    video.value = data
  } catch (err) {
    console.error(err)
    error.value = err.message || 'Error de conexión con la API.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchVideo()
})

// Helpers
const translateStatus = (status) => {
  const map = {
    'pending': 'Pendiente',
    'processing': 'Procesando...',
    'active': 'Activo',
    'failed': 'Falló',
    'expired': 'Expirado'
  }
  return map[status] || status
}

const getStatusMessage = (status) => {
  if (status === 'pending' || status === 'processing') {
    return 'Este video se está procesando actualmente y se dividirá en segmentos HLS para una reproducción óptima. Por favor, refresca la página en unos minutos.'
  }
  if (status === 'expired') {
    return 'Este video ha expirado. Los recursos de transmisión de este portafolio se eliminan automáticamente tras 30 días.'
  }
  return 'Lo sentimos, el procesamiento de este video ha fallado. Intenta subirlo de nuevo.'
}
</script>

<style scoped>
.watch-container {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.back-nav {
  margin-bottom: 0.5rem;
}

.back-link {
  color: #9ca3af;
  text-decoration: none;
  font-size: 0.95rem;
  transition: color 0.2s;
}

.back-link:hover {
  color: #818cf8;
}

.glass {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 3rem 2rem;
}

/* State Cards (Loading, Error, Hold) */
.state-card {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  min-height: 350px;
}

.state-icon {
  font-size: 3.5rem;
}

.state-icon.processing,
.state-icon.pending {
  animation: pulse 2s infinite ease-in-out;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; transform: scale(0.95); }
  50% { opacity: 1; transform: scale(1.05); }
}

.status-explanation {
  color: #9ca3af;
  max-width: 500px;
  font-size: 0.95rem;
  line-height: 1.5;
}

.video-details {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 1rem 1.5rem;
  text-align: left;
  min-width: 280px;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.video-details p {
  margin-bottom: 0.5rem;
}

.video-details p:last-child {
  margin-bottom: 0;
}

.status-text {
  font-weight: 600;
  text-transform: uppercase;
}

.status-text.pending { color: #fbbf24; }
.status-text.processing { color: #60a5fa; }
.status-text.failed { color: #fca5a5; }
.status-text.expired { color: #d1d5db; }

/* Spinner */
.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-left-color: #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Video Content */
.video-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.player-wrapper {
  width: 100%;
}

.video-header {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1.5rem;
}

.video-header h2 {
  font-size: 1.6rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  letter-spacing: -0.02em;
}

.video-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.85rem;
}

.status-badge {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.active {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.info-label {
  color: #9ca3af;
}
</style>
