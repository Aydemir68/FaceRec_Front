<template>
  <div class="app-container">
    <aside :class="['sidebar', { collapsed }]">
      <button @click="toggleSidebar" class="toggle-button" :title="collapsed ? 'Развернуть' : 'Свернуть'">
        {{ collapsed ? '➜' : 'Свернуть' }}
      </button>

      <button
        v-if="!collapsed"
        @click="triggerFileInput"
        :disabled="videos.length >= 4"
        :title="videos.length >= 4 ? 'Максимум 4 видео уже загружено' : 'Выбрать видеофайлы'"
        class="action-button"
      >
        Выбрать видео ({{ videos.length }}/4)
      </button>

      <button
        v-if="!collapsed"
        @click="openReportDialog"
        :disabled="videos.length === 0"
        title="Сформировать отчет по выбранным видео"
        class="action-button"
      >
        Выгрузить отчет
      </button>

      <div v-if="!collapsed" class="accordion-container">
        <div class="accordion">
          <div class="accordion-header" @click="toggleObjectsAccordion">
            Распознанные объекты
            <span class="accordion-arrow">{{ objectsAccordionOpen ? '▲' : '▼' }}</span>
          </div>
          <div v-show="objectsAccordionOpen" class="accordion-content">
            <div class="item-placeholder">Объект 1 (Видео 1) - 00:15</div>
            <div class="item-placeholder">Объект 2 (Видео 3) - 01:05</div>
          </div>
        </div>
        <div class="accordion">
          <div class="accordion-header" @click="toggleViolationsAccordion">
            Нарушения
            <span class="accordion-arrow">{{ violationsAccordionOpen ? '▲' : '▼' }}</span>
          </div>
          <div v-show="violationsAccordionOpen" class="accordion-content">
            <div class="item-placeholder">Нарушение 1 (Видео 2) - 00:42</div>
          </div>
        </div>
      </div>
      <input
        type="file"
        ref="fileInput"
        @change="handleFileSelect"
        multiple
        accept="video/*"
        style="display: none;"
      />
    </aside>

    <main class="video-container">
      <div class="video-wrapper" v-for="(video, index) in videos" :key="video.url">
          <VideoPlayer
            :src="video.url"
            @delete-video="removeVideo"
          />
          <div class="video-title" :title="video.name">{{ video.name }}</div>
      </div>

       <p v-if="videos.length === 0" class="no-videos-message">
        Нажмите "Выбрать видео" в боковой панели, чтобы добавить файлы (до 4)
      </p>
    </main>

    <div v-if="showReportDialog" class="dialog-overlay" @click.self="closeReportDialog">
        <div class="dialog-box">
            <button class="dialog-close-button" @click="closeReportDialog" title="Закрыть">×</button>
            <h3>Для каких видео сформировать отчет?</h3>
            <div class="dialog-checkbox-group">
                <div v-for="(video, index) in videos" :key="`chk-${index}`" class="checkbox-item">
                    <input
                      type="checkbox"
                      :id="`video-chk-${index}`"
                      :value="index" v-model="selectedVideosForReport"
                    >
                    <label :for="`video-chk-${index}`" :title="video.name">{{ video.name }}</label>
                </div>
            </div>
            <button
              class="dialog-confirm-button"
              @click="generateReport"
              :disabled="!isReportReady"
            >
              Готово
            </button>
        </div>
    </div>
     </div>
</template>

<script>
import VideoPlayer from "@/components/VideoPlayer.vue";

export default {
  name: 'HomeView', // Имя компонента
  components: {
    VideoPlayer
  },
  data() {
    return {
      collapsed: false,
      // Теперь массив объектов { url: string, name: string }
      videos: [],
      objectsAccordionOpen: false,
      violationsAccordionOpen: false,
      showReportDialog: false,
      selectedVideosForReport: [] // Массив ИНДЕКСОВ выбранных видео
    };
  },
  computed: {
      isReportReady() {
          return this.selectedVideosForReport.length > 0;
      }
  },
  methods: {
    toggleSidebar() { this.collapsed = !this.collapsed; },
    triggerFileInput() { /* ... */
        if (this.videos.length >= 4) { alert("Уже загружено максимальное количество видео (4)."); return; }
        this.$refs.fileInput.click();
    },
    handleFileSelect(event) {
        const files = event.target.files;
        if (!files || files.length === 0) { return; }
        const currentVideoCount = this.videos.length;
        if (currentVideoCount >= 4) { alert("Уже загружено максимальное количество видео (4)."); event.target.value = null; return; }
        const availableSlots = 4 - currentVideoCount;
        const filesToProcessCount = Math.min(files.length, availableSlots);
        console.log(`[HomeView] Current videos: ${currentVideoCount}, Available slots: ${availableSlots}, Files selected: ${files.length}, Will process: ${filesToProcessCount}`);
        let filesAddedCount = 0;
        for (let i = 0; i < filesToProcessCount; i++) {
            const file = files[i];
            const objectURL = URL.createObjectURL(file);
            const fileName = file.name; // Получаем имя файла
            // Добавляем объект в массив
            this.videos.push({ url: objectURL, name: fileName });
            filesAddedCount++;
            console.log(`[HomeView] Added Object URL: ${objectURL} for file: ${fileName}`);
        }
        event.target.value = null;
        if (files.length > filesToProcessCount && filesAddedCount > 0) {
            alert(`Добавлено ${filesAddedCount} видео. Еще ${files.length - filesAddedCount} не были добавлены (лимит 4).`);
        }
    },
    removeVideo(urlToDelete) {
        console.log('[HomeView] removeVideo called with URL:', urlToDelete);
        if (!urlToDelete || typeof urlToDelete !== 'string') { console.error('[HomeView] Invalid URL received for deletion:', urlToDelete); return; }
        console.log('[HomeView] Current videos before removal:', JSON.parse(JSON.stringify(this.videos)));
        // Ищем индекс по URL внутри объекта
        const indexToDelete = this.videos.findIndex(video => video.url === urlToDelete);
        console.log(`[HomeView] Found index for URL ${urlToDelete}:`, indexToDelete);
        if (indexToDelete !== -1) {
            try {
                // Отзываем URL (он передается напрямую)
                URL.revokeObjectURL(urlToDelete);
                console.log(`[HomeView] Revoked Object URL: ${urlToDelete}`);
            } catch (error) { console.error(`[HomeView] Error revoking Object URL ${urlToDelete}:`, error); }
            // Удаляем объект из массива по индексу
            this.videos.splice(indexToDelete, 1);
            console.log('[HomeView] Video removed from array. New videos:', JSON.parse(JSON.stringify(this.videos)));
            console.log('[HomeView] New videos.length:', this.videos.length);
        } else { console.warn(`[HomeView] Video URL not found in array for deletion: ${urlToDelete}`); }
    },
    revokePreviousUrls() {
        console.log("[HomeView] Revoking ALL remaining Object URLs:", this.videos);
        // Итерируем по массиву объектов
        this.videos.forEach(video => {
            // Проверяем и отзываем URL из объекта
            if (video && video.url && video.url.startsWith('blob:')) {
                try { URL.revokeObjectURL(video.url); console.log(`[HomeView] Revoked: ${video.url}`); }
                catch (error) { console.error(`[HomeView] Error revoking Object URL ${video.url} during unmount:`, error); }
            }
        });
    },

    // --- Методы для Аккордеонов ---
    toggleObjectsAccordion() { this.objectsAccordionOpen = !this.objectsAccordionOpen; },
    toggleViolationsAccordion() { this.violationsAccordionOpen = !this.violationsAccordionOpen; },

    // --- Методы для Диалога Отчета ---
    openReportDialog() {
        this.selectedVideosForReport = [];
        this.showReportDialog = true;
        console.log("[HomeView] Report dialog opened.");
    },
    closeReportDialog() {
        this.showReportDialog = false;
        console.log("[HomeView] Report dialog closed.");
    },
    generateReport() {
        // selectedVideosForReport содержит ИНДЕКСЫ
        console.log("[HomeView] Generating report for video indices:", this.selectedVideosForReport);
        // Получаем полные объекты выбранных видео
        const selectedVideoObjects = this.selectedVideosForReport.map(index => this.videos[index]);
        console.log("[HomeView] Selected video objects:", selectedVideoObjects);
        // Используем имена файлов в сообщении
        alert(`Запрошена генерация отчета для видео: ${selectedVideoObjects.map(v => v.name).join(', ')}`);
        this.closeReportDialog();
    }
  },
  beforeUnmount() {
    console.log("[HomeView] Component unmounting, revoking remaining URLs...");
    this.revokePreviousUrls();
  }
};
</script>

<style scoped>
/* --- Основные стили --- */
.app-container { display: flex; height: 100vh; overflow: hidden; background-color: #f4f4f4; }

/* --- Стили Сайдбара --- */
.sidebar { /* ... (без изменений) ... */ background: white; padding: 10px; width: 250px; transition: width 0.3s ease; flex-shrink: 0; overflow-x: hidden; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; border-right: 1px solid #ccc; }
.sidebar.collapsed { /* ... (без изменений) ... */ width: 50px; padding: 10px 0; align-items: center; overflow-y: hidden; }
.sidebar .action-button, .sidebar .toggle-button { /* ... (без изменений) ... */ padding: 8px 12px; cursor: pointer; border: 1px solid #ccc; background-color: #e9e9e9; border-radius: 4px; white-space: nowrap; text-align: left; width: 100%; }
.sidebar .action-button:hover:not(:disabled) { background-color: #dcdcdc; }
.sidebar .action-button:disabled { cursor: not-allowed; opacity: 0.6; }
.sidebar.collapsed .toggle-button { width: 30px; padding: 8px 0; text-align: center; }
.sidebar.collapsed .action-button, .sidebar.collapsed .accordion-container { display: none; }

/* --- Стили Аккордеонов --- */
.accordion-container { /* ... (без изменений) ... */ margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px; }
.accordion { /* ... (без изменений) ... */ border-bottom: 1px solid #eee; }
.accordion-header { /* ... (без изменений) ... */ padding: 10px 5px; cursor: pointer; background-color: #f9f9f9; display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: 0.9em; }
.accordion-header:hover { background-color: #f0f0f0; }
.accordion-arrow { /* ... (без изменений) ... */ font-size: 0.8em; }
.accordion-content { /* ... (без изменений) ... */ padding: 10px; font-size: 0.85em; background-color: #fff; border-top: 1px solid #eee; }
.item-placeholder { /* ... (без изменений) ... */ padding: 5px; margin-top: 5px; background-color: #fafafa; border: 1px dashed #ddd; font-size: 0.9em; color: #555; }

/* --- Стили Видео Контейнера --- */
.video-container {
    flex: 1;
    display: grid;
    background-color: #6c6c6c;
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(2, 1fr);
    gap: 15px; /* Немного увеличим зазор для названий */
    padding: 15px; /* Немного увеличим отступы */
    overflow: auto;
    position: relative;
}
.video-wrapper { /* Новый контейнер для плеера и названия */
    display: flex;
    flex-direction: column; /* Плеер сверху, название снизу */
    background-color: black; /* Фон обертки */
    border-radius: 4px; /* Скругление для обертки */
    overflow: hidden; /* Обрезаем все, что выходит за рамки */
    position: relative; /* Для позиционирования плеера и названия */
    height: 100%; /* Занимаем всю высоту ячейки сетки */
}
.video-title { /* Стиль для названия файла */
    padding: 5px 8px;
    background-color: rgba(0, 0, 0, 0.7); /* Полупрозрачный фон */
    color: white;
    font-size: 0.8em;
    text-align: center;
    white-space: nowrap; /* Предотвращаем перенос */
    overflow: hidden; /* Скрываем то, что не помещается */
    text-overflow: ellipsis; /* Добавляем троеточие */
    flex-shrink: 0; /* Не позволяем сжиматься */
}
.no-videos-message { /* ... (без изменений) ... */ position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #ffffff; font-size: 1.2em; text-align: center; grid-column: 1 / -1; grid-row: 1 / -1; display: flex; align-items: center; justify-content: center; padding: 20px; background-color: rgba(0, 0, 0, 0.5); border-radius: 8px; pointer-events: none; }

/* --- Стили Диалогового окна --- */
.dialog-overlay { /* ... (без изменений) ... */ position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.dialog-box { /* ... (без изменений) ... */ background-color: white; padding: 25px 30px; border-radius: 8px; box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3); min-width: 300px; max-width: 90%; position: relative; }
.dialog-close-button { /* ... (без изменений) ... */ position: absolute; top: 10px; right: 10px; background: none; border: none; font-size: 1.5em; cursor: pointer; color: #aaa; line-height: 1; }
.dialog-close-button:hover { color: #333; }
.dialog-box h3 { /* ... (без изменений) ... */ margin-top: 0; margin-bottom: 20px; text-align: center; }
.dialog-checkbox-group { /* ... (без изменений) ... */ margin-bottom: 25px; max-height: 200px; overflow-y: auto; }
.checkbox-item { /* ... (без изменений) ... */ display: block; margin-bottom: 10px; }
.checkbox-item input[type="checkbox"] { margin-right: 8px; }
.checkbox-item label {
    cursor: pointer;
    /* Добавим стили для обрезки длинных имен файлов */
    display: inline-block; /* Нужно для text-overflow */
    vertical-align: middle; /* Выравнивание с чекбоксом */
    max-width: calc(100% - 25px); /* Ограничим ширину метки */
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.dialog-confirm-button { /* ... (без изменений) ... */ display: block; width: 100%; padding: 10px 15px; border: none; background-color: #007bff; color: white; border-radius: 5px; cursor: pointer; font-size: 1em; transition: background-color 0.2s ease; }
.dialog-confirm-button:hover:not(:disabled) { background-color: #0056b3; }
.dialog-confirm-button:disabled { background-color: #cccccc; cursor: not-allowed; }

/* --- Стили VideoPlayer через :deep --- */
/* Стилизация дочернего компонента остается без изменений, но теперь она применяется к плееру внутри .video-wrapper */
:deep(.video-player) {
    width: 100%;
    /* Убрали height: 100%, т.к. .video-wrapper теперь управляет высотой */
    flex-grow: 1; /* Плеер занимает доступное место над названием */
    background-color: black;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    /* Убрали border-radius, он теперь на .video-wrapper */
    position: relative; /* Для позиционирования контролов и кнопки удаления */
}

:deep(.video-player video) {
  flex-grow: 1; width: 100%; 
  object-fit: cover;
  min-height: 0;
}

:deep(.video-player .controls) {
  flex-shrink: 0; padding: 5px 0;
  background-color: rgba(0, 0, 0, 0.7);
  position: absolute; bottom: 0;
  left: 0;
  right: 0;
  opacity: 0;
  transition: opacity 0.3s ease;
}
:deep(.video-player:hover .controls) { 
  opacity: 1;
}
:deep(.video-player .delete-button) {
  position: absolute; top: 5px;
  right: 5px;
  background-color: rgba(255, 0, 0, 0.6);
  color: white; border: none; border-radius: 50%;
  width: 24px;
  height: 24px;
  font-size: 14px;
  line-height: 24px;
  text-align: center;
  cursor: pointer; z-index: 10; opacity: 0;
  transition: opacity 0.3s ease, background-color 0.2s ease; 
}

:deep(.video-player:hover .delete-button) {
  opacity: 1;
}

:deep(.video-player .delete-button:hover) {
  background-color: rgba(255, 0, 0, 1);
}

</style>