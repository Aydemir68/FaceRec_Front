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
  props: ['src'], // src (URL видео) уже получаем как пропс
  emits: ['delete-video'], // Явно объявляем генерируемые события (хорошая практика в Vue 3)
  data() {
    return {
      isPlaying: false,
      volume: 50
    };
  },
  methods: {
    togglePlay() {
      const video = this.$refs.video;
       if (!video) return; // Добавим проверку на случай, если $ref еще не доступен
      if (video.paused) {
        video.play().catch(e => console.error("Play error:", e)); // Добавим обработку ошибок play()
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
    // Метод для запроса удаления
    requestDelete() {
      console.log('[VideoPlayer] requestDelete called for src:', this.src);
      if (!this.src) {
        console.error('[VideoPlayer] Cannot emit delete event: src is missing.');
        return;
      }
      // --- Конец Отладки ---
      this.$emit('delete-video', this.src);
    }
  },
  mounted() {
    // Устанавливаем начальную громкость при монтировании
    if (this.$refs.video) {
        this.changeVolume(); // Установить начальную громкость
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
  align-items: center; /* Выравниваем элементы управления по центру */
  gap: 10px;
  padding: 5px 0; /* Уменьшим вертикальный padding */
  background-color: rgba(0, 0, 0, 0.7);
  position: absolute; /* Позиционируем контролы внизу */
  bottom: 0;
  left: 0;
  right: 0;
  opacity: 0; /* Скрываем по умолчанию */
  transition: opacity 0.3s ease; /* Плавное появление */
}

.video-player:hover .controls {
    opacity: 1; /* Показываем при наведении на плеер */
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
    width: 80px; /* Ограничим ширину слайдера */
}

.delete-button {
  position: absolute;
  top: 5px;
  right: 5px;
  background-color: rgba(255, 0, 0, 0.6); /* Красный, полупрозрачный */
  color: white;
  border: none;
  border-radius: 50%; /* Круглая кнопка */
  width: 24px;  /* Фикс. размер */
  height: 24px; /* Фикс. размер */
  font-size: 14px; /* Размер крестика */
  line-height: 24px; /* Вертикальное выравнивание крестика */
  text-align: center;
  cursor: pointer;
  z-index: 10; /* Поверх видео */
  opacity: 0; /* Скрываем по умолчанию */
  transition: opacity 0.3s ease, background-color 0.2s ease;
}

.video-player:hover .delete-button {
    opacity: 1; /* Показываем при наведении на плеер */
}


.delete-button:hover {
  background-color: rgba(255, 0, 0, 1); /* Ярко-красный при наведении */
}
</style>