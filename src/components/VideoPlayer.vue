<template>
  <div class="video-player">
    <button class="delete-button" @click="requestDelete" title="Удалить видео">×</button>

    <video ref="video" :src="src" controls></video>
    <div class="controls">
    </div>
  </div>
</template>

<script>
export default {
  props: ['src'],
  emits: ['delete-video'],
  data() {
    return {
      isPlaying: false,
      volume: 50
    };
  },
  methods: {
    togglePlay() {
      const video = this.$refs.video;
       if (!video) return; 
      if (video.paused) {
        video.play().catch(e => console.error("Play error:", e));
        this.isPlaying = true;
      } else {
        video.pause();
        this.isPlaying = false;
      }
    },
    changeVolume() {
       if (!this.$refs.video) return;
      this.$refs.video.volume = this.volume / 100;
    },
    requestDelete() {
      console.log('[VideoPlayer] requestDelete called for src:', this.src);
      if (!this.src) {
        console.error('[VideoPlayer] Cannot emit delete event: src is missing.');
        return;
      }
      this.$emit('delete-video', this.src);
    }
  },
  mounted() {
    if (this.$refs.video) {
        this.changeVolume();
        // Слушатель для обновления isPlaying, если пользователь нажимает паузу/плей на самом видео
        this.$refs.video.onplay = () => this.isPlaying = true;
        this.$refs.video.onpause = () => this.isPlaying = false;
    }
  }
};
</script>

<style scoped>
.video-player {
  background: black;
  /* Убрали padding, чтобы кнопка была строго в углу */
  text-align: center;
  position: relative; /* Необходимо для абсолютного позиционирования кнопки */
   width: 100%;
   height: 100%;
   display: flex;
   flex-direction: column;
   overflow: hidden;
   border-radius: 4px;
}

video {
    flex-grow: 1;
    width: 100%;
    object-fit: cover;
    min-height: 0;
}


.controls {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center; 
  gap: 10px;
  padding: 5px 0; 
  background-color: rgba(0, 0, 0, 0.7);
  position: absolute; 
  bottom: 0;
  left: 0;
  right: 0;
  opacity: 0; 
  transition: opacity 0.3s ease; 
}

.video-player:hover .controls {
    opacity: 1; 
}

.controls button {
    background: none;
    border: none;
    color: white;
    font-size: 1.2em;
    cursor: pointer;
    padding: 2px 5px;
}
.controls input[type="range"] {
    cursor: pointer;
    width: 80px;
}

.delete-button {
  position: absolute;
  top: 5px;
  right: 5px;
  background-color: rgba(255, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: 50%; 
  width: 24px;  
  height: 24px;
  font-size: 14px;
  line-height: 24px; 
  text-align: center;
  cursor: pointer;
  z-index: 10; 
  opacity: 0; 
  transition: opacity 0.3s ease, background-color 0.2s ease;
}

.video-player:hover .delete-button {
    opacity: 1;
}


.delete-button:hover {
  background-color: rgba(255, 0, 0, 1); 
}
</style>