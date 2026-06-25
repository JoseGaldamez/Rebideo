<template>
  <div class="video-player-container">
    <video ref="videoRef" controls class="video-element" playsinline></video>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import Hls from 'hls.js'

const props = defineProps({
  src: {
    type: String,
    required: true
  }
})

const videoRef = ref(null)
let hlsInstance = null

const initPlayer = () => {
  if (hlsInstance) {
    hlsInstance.destroy()
    hlsInstance = null
  }

  const video = videoRef.value
  if (!video) return

  if (Hls.isSupported()) {
    hlsInstance = new Hls({
      maxMaxBufferLength: 30
    })
    hlsInstance.loadSource(props.src)
    hlsInstance.attachMedia(video)
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    // Soporte nativo para HLS (ej: Safari o iOS browsers)
    video.src = props.src
  }
}

onMounted(() => {
  initPlayer()
})

onBeforeUnmount(() => {
  if (hlsInstance) {
    hlsInstance.destroy()
  }
})

watch(() => props.src, () => {
  initPlayer()
})
</script>

<style scoped>
.video-player-container {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  background-color: #000;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  aspect-ratio: 16 / 9;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.video-element {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
