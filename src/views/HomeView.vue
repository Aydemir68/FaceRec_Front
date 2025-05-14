<template>
  <div class="app-container">
    <aside :class="['sidebar', { collapsed }]">
      <button @click="toggleSidebar" class="toggle-button" :title="collapsed ? 'Развернуть' : 'Свернуть'">
        {{ collapsed ? '➜' : 'Свернуть' }}
      </button>

      <button
        v-if="!collapsed"
        @click="triggerFileInput"
        :disabled="videos.length >= 4 || isUploadingInProgress"
        :title="videos.length >= 4 ? 'Максимум 4 видео уже загружено' : (isUploadingInProgress ? 'Идет добавление видео...' : 'Выбрать видеофайлы')"
        class="action-button"
      >
        {{ isUploadingInProgress ? 'Добавление...' : `Выбрать видео (${videos.length}/4)` }}
      </button>

      <button
        v-if="!collapsed"
        @click="triggerFileInput"
        title="Выберите файл"
        class="action-button"
      >
        Сформировать карточку дня
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

      <div v-if="!collapsed && videos.length > 0" class="video-status-indicators">
        <div v-for="video in videos" :key="video.id" class="video-status-item" :title="video.title">
          <span class="status-dot" :class="video.status.toLowerCase()"></span>
          <span class="status-name">{{ video.title }}</span>
          <div class="video-actions">
            <button
              v-if="video.status === 'Uploaded'"
              @click="publishVideo(video.id)"
              class="action-icon"
              title="Начать обработку"
            >▶</button>
            <button
              v-if="video.status === 'Processing'"
              @click="cancelVideo(video.id)"
              class="action-icon"
              title="Отменить обработку"
            >⏹</button>
            <button
              @click="removeVideo(video.id)"
              class="action-icon"
              title="Удалить видео"
            >×</button>
          </div>
        </div>
      </div>

      <div v-if="!collapsed" class="accordion-container">
        <div class="accordion">
          <div class="accordion-header" @click="toggleObjectsAccordion">
            Распознанные объекты ({{ allRecognizedObjects.length }})
            <span class="accordion-arrow">{{ objectsAccordionOpen ? '▲' : '▼' }}</span>
          </div>
          <div v-show="objectsAccordionOpen" class="accordion-content">
            <div v-if="allRecognizedObjects.length === 0" class="item-placeholder">Нет распознанных объектов</div>
            <div v-for="obj in allRecognizedObjects" :key="obj.object_id" class="item-placeholder">
              {{ obj.label }} ({{ obj.videoName }}) - {{ obj.timestamp_formatted }}
            </div>
          </div>
        </div>
        <div class="accordion">
          <div class="accordion-header" @click="toggleViolationsAccordion">
            Нарушения ({{ allViolations.length }})
            <span class="accordion-arrow">{{ violationsAccordionOpen ? '▲' : '▼' }}</span>
          </div>
          <div v-show="violationsAccordionOpen" class="accordion-content">
            <div v-if="allViolations.length === 0" class="item-placeholder">Нет нарушений</div>
            <div v-for="viol in allViolations" :key="viol.violation_id" class="item-placeholder">
              {{ viol.type }} ({{ viol.videoName }}) - {{ viol.timestamp_formatted }}
            </div>
          </div>
        </div>
      </div>
      <input
        type="file"
        ref="fileInput"
        @change="handleFileSelect"
        multiple
        accept="video/mp4,video/x-matroska,video/quicktime,video/x-msvideo,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        style="display: none;"
      />
    </aside>

    <main class="video-container">
      <div class="video-wrapper" v-for="video in videos" :key="video.id">
        <VideoPlayer
          :video="video"
          @delete-video="removeVideo"
        />
        <div class="video-title" :title="video.title">
          <span :class="['status-indicator', video.status.toLowerCase()]" :title="`Статус: ${video.status}`">●</span>
          {{ video.title }}
          <span v-if="video.description" class="video-description">{{ video.description }}</span>
        </div>
      </div>

      <p v-if="videos.length === 0 && !isUploadingInProgress" class="no-videos-message">
        Нажмите "Выбрать видео" в боковой панели, чтобы добавить файлы (до 4)
      </p>
      <p v-if="isUploadingInProgress && videos.length === 0" class="no-videos-message">
        Добавление видео...
      </p>
    </main>

    <div v-if="showReportDialog" class="dialog-overlay" @click.self="closeReportDialog">
        <div class="dialog-box">
            <button class="dialog-close-button" @click="closeReportDialog" title="Закрыть">×</button>
            <h3>Для каких видео сформировать отчет?</h3>
            <p v-if="reportStatusMessage" class="report-status-message">{{ reportStatusMessage }}</p>
            <div class="dialog-checkbox-group">
                <div v-for="(video) in videos" :key="`chk-${video.id}`" class="checkbox-item"> <input
                      type="checkbox"
                      :id="`video-chk-${video.id}`"
                      :value="video.id" v-model="selectedVideoIdsForReport"
                      :disabled="isGeneratingReport"
                    >
                    <label :for="`video-chk-${video.id}`" :title="video.title">{{ video.title }}</label>
                </div>
                 <div v-if="videos.length === 0">
                    Нет видео для отчета.
                </div>
            </div>
            <button
              class="dialog-confirm-button"
              @click="generateReport"
              :disabled="selectedVideoIdsForReport.length === 0 || isGeneratingReport"
            >
              {{ isGeneratingReport ? 'Генерация...' : 'Готово' }}
            </button>
        </div>
    </div>

    <div v-if="showExcelViewer" class="dialog-overlay" @click.self="closeExcelViewer">
      <ExcelViewer
        :file="selectedExcelFile"
        @close="closeExcelViewer"
      />
    </div>
  </div>
</template>

<script>
import VideoPlayer from "@/components/VideoPlayer.vue";
import ExcelViewer from "@/components/ExcelViewer.vue";
import * as api from "@/mockAPI.js";

export default {
  name: 'HomeView',
  components: {
    VideoPlayer,
    ExcelViewer
  },
  data() {
    return {
      collapsed: false,
      videos: [], // { id, title, description, status, created_at, blobUrl }
      objectsAccordionOpen: false,
      violationsAccordionOpen: false,
      showReportDialog: false,
      selectedVideoIdsForReport: [],
      isUploadingInProgress: false,
      isGeneratingReport: false,
      reportStatusMessage: '',
      showExcelViewer: false,
      selectedExcelFile: null
    };
  },
  computed: {
    allRecognizedObjects() {
      const items = [];
      this.videos.forEach(video => {
        if (video.objects) {
          video.objects.forEach(obj => {
            items.push({ ...obj, videoName: video.title, videoId: video.id });
          });
        }
      });
      return items.sort((a,b) => a.timestamp - b.timestamp);
    },
    allViolations() {
      const items = [];
      this.videos.forEach(video => {
        if (video.violations) {
          video.violations.forEach(viol => {
            items.push({ ...viol, videoName: video.title, videoId: video.id });
          });
        }
      });
      return items.sort((a,b) => a.timestamp - b.timestamp);
    }
  },
  methods: {
    toggleSidebar() {
      this.collapsed = !this.collapsed;
    },

    triggerFileInput() {
      if (this.videos.length >= 4) {
        alert("Уже загружено максимальное количество видео (4).");
        return;
      }
      this.$refs.fileInput.click();
    },

    async handleFileSelect(event) {
      const files = event.target.files;
      if (!files || files.length === 0) { return; }

      for (const file of Array.from(files)) {
        const filename = file.name.toLowerCase();
        if (filename.endsWith('.xls') || filename.endsWith('.xlsx')) {
          // Обработка файла Excel
          this.selectedExcelFile = file;
          this.showExcelViewer = true;
          event.target.value = null;
          return;
        }
      }

      // Обработка видео файлов
      const currentVideoCount = this.videos.length;
      const availableSlots = 4 - currentVideoCount;
      const videoFiles = Array.from(files).filter(file => {
        const filename = file.name.toLowerCase();
        return !filename.endsWith('.xls') && !filename.endsWith('.xlsx');
      });
      const filesToProcess = videoFiles.slice(0, availableSlots);

      if (videoFiles.length > filesToProcess.length && filesToProcess.length > 0) {
        alert(`Можно добавить еще ${availableSlots} видео. Будут обработаны первые ${filesToProcess.length} из выбранных.`);
      } else if (filesToProcess.length === 0 && videoFiles.length > 0) {
        alert("Уже загружено максимальное количество видео (4).");
        event.target.value = null;
        return;
      }

      this.isUploadingInProgress = true;

      for (const file of filesToProcess) {
        const blobUrl = URL.createObjectURL(file);
        try {
          const title = file.name.replace(/\.[^/.]+$/, ""); // Убираем расширение файла
          const uploadResponse = await api.uploadVideo(file, title);

          this.videos.push({
            ...uploadResponse,
            blobUrl: blobUrl,
            created_at: new Date().toISOString()
          });

          console.log(`[HomeView] Added video to list: ${title}`);
        } catch (error) {
          console.error('[HomeView] Error uploading video:', file.name, error);
          alert(`Ошибка при загрузке видео ${file.name}: ${error.error || 'Неизвестная ошибка API'}`);
          URL.revokeObjectURL(blobUrl);
        }
      }
      this.isUploadingInProgress = false;
      event.target.value = null;
    },

    async removeVideo(videoId) {
      console.log('[HomeView] removeVideo called for video ID:', videoId);
      const videoIndex = this.videos.findIndex(v => v.id === videoId);
      if (videoIndex === -1) {
        console.warn(`[HomeView] Video ID not found for deletion: ${videoId}`);
        return;
      }

      const videoToRemove = this.videos[videoIndex];

      try {
        await api.deleteVideo(videoId);
        URL.revokeObjectURL(videoToRemove.blobUrl);
        this.videos.splice(videoIndex, 1);
      } catch (error) {
        console.error(`[HomeView] Error deleting video ${videoId}:`, error);
        alert(`Ошибка при удалении видео ${videoToRemove.title}: ${error.error || 'Неизвестная ошибка API'}`);
      }
    },

    async publishVideo(videoId) {
      try {
        await api.publishVideo(videoId);
        const video = this.videos.find(v => v.id === videoId);
        if (video) {
          video.status = "Processing";
        }
      } catch (error) {
        console.error(`[HomeView] Error publishing video ${videoId}:`, error);
        alert(`Ошибка при публикации видео: ${error.error || 'Неизвестная ошибка API'}`);
      }
    },

    async cancelVideo(videoId) {
      try {
        await api.cancelVideo(videoId);
        const video = this.videos.find(v => v.id === videoId);
        if (video) {
          video.status = "Cancelled";
        }
      } catch (error) {
        console.error(`[HomeView] Error cancelling video ${videoId}:`, error);
        alert(`Ошибка при отмене обработки видео: ${error.error || 'Неизвестная ошибка API'}`);
      }
    },

    revokePreviousUrls() {
      this.videos.forEach(video => {
        if (video && video.blobUrl && video.blobUrl.startsWith('blob:')) {
          try { URL.revokeObjectURL(video.blobUrl); }
          catch (e) { console.error(`[HomeView] Error revoking Object URL ${video.blobUrl}:`, e); }
        }
      });
    },

    toggleObjectsAccordion() { this.objectsAccordionOpen = !this.objectsAccordionOpen; },
    toggleViolationsAccordion() { this.violationsAccordionOpen = !this.violationsAccordionOpen; },

    openReportDialog() {
      this.selectedVideoIdsForReport = this.videos.map(v => v.id);
      this.showReportDialog = true;
      this.reportStatusMessage = '';
    },
    closeReportDialog() {
      this.showReportDialog = false;
      this.isGeneratingReport = false;
    },
    async generateReport() {
      if (this.selectedVideoIdsForReport.length === 0 || this.isGeneratingReport) return;

      this.isGeneratingReport = true;
      this.reportStatusMessage = 'Генерация отчета...';
      console.log("[HomeView] Generating report for video API IDs:", this.selectedVideoIdsForReport);

      try {
        const reportCreationResponse = await api.createReport(this.selectedVideoIdsForReport);
        console.log("[HomeView] Report creation initiated (mock):", reportCreationResponse);

        const statusResponse = await api.getReportStatus(reportCreationResponse.report_id);
        console.log("[HomeView] Report status (mock):", statusResponse);

        if (statusResponse.status === 'completed') {
          this.reportStatusMessage = `Идет загрузка`;
          alert(`Отчет готов! Скачивание сейчас начнется`);
        } else {
           this.reportStatusMessage = `Статус отчета: ${statusResponse.status}. ${statusResponse.error_message || ''}`;
        }
      } catch (error) {
        console.error("[HomeView] Error during report generation process:", error);
        this.reportStatusMessage = `Ошибка при генерации отчета: ${error.error || 'Неизвестная ошибка API'}`;
      } finally {
        this.isGeneratingReport = false;
      }
    },
    closeExcelViewer() {
      this.showExcelViewer = false;
      this.selectedExcelFile = null;
    }
  },
  beforeUnmount() {
    console.log("[HomeView] Component unmounting, revoking remaining URLs...");
    this.revokePreviousUrls();
  },

};
</script>

<style scoped>
.app-container { display: flex; height: 100vh; overflow: hidden; background-color: #f4f4f4; }
.sidebar { background: white; padding: 10px; width: 250px; transition: width 0.3s ease; flex-shrink: 0; overflow-x: hidden; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; border-right: 1px solid #ccc; }
.sidebar.collapsed { width: 50px; padding: 10px 0; align-items: center; overflow-y: hidden; }
.sidebar .action-button, .sidebar .toggle-button { padding: 8px 12px; cursor: pointer; border: 1px solid #ccc; background-color: #e9e9e9; border-radius: 4px; white-space: nowrap; text-align: left; width: 100%; }
.sidebar .action-button:hover:not(:disabled) { background-color: #dcdcdc; }
.sidebar .action-button:disabled { cursor: not-allowed; opacity: 0.6; }
.sidebar.collapsed .toggle-button { width: 30px; padding: 8px 0; text-align: center; }
.sidebar.collapsed .action-button, .sidebar.collapsed .accordion-container, .sidebar.collapsed .video-status-indicators { display: none; }

/* --- Индикаторы статуса видео в сайдбаре --- */
.video-status-indicators {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #eee;
  font-size: 0.8em;
}
.video-status-item {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 6px;
  flex-shrink: 0;
}
/* Убраны uploading, processing, т.к. статус почти всегда ready или error */
.status-dot.ready { background-color: #4CAF50; /* Зеленый */ }
.status-dot.error { background-color: #F44336; /* Красный */ }
.status-name {
  overflow: hidden;
  text-overflow: ellipsis;
}


/* --- Стили Аккордеонов --- */
.accordion-container { margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px; }
.accordion { border-bottom: 1px solid #eee; }
.accordion-header { padding: 10px 5px; cursor: pointer; background-color: #f9f9f9; display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: 0.9em; }
.accordion-header:hover { background-color: #f0f0f0; }
.accordion-arrow { font-size: 0.8em; }
.accordion-content { padding: 10px; font-size: 0.85em; background-color: #fff; border-top: 1px solid #eee; max-height: 200px; overflow-y: auto;}
.item-placeholder { padding: 5px; margin-top: 5px; background-color: #fafafa; border: 1px dashed #ddd; font-size: 0.9em; color: #555; }

/* --- Стили Видео Контейнера --- */
.video-container {
    flex: 1;
    display: grid;
    background-color: #6c6c6c;
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(2, 1fr);
    gap: 15px;
    padding: 15px;
    overflow: auto;
    position: relative;
}
.video-wrapper {
    display: flex;
    flex-direction: column;
    background-color: black;
    border-radius: 4px;
    overflow: hidden;
    position: relative;
    height: 100%;
}
.video-title {
    padding: 5px 8px;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    font-size: 0.8em;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-shrink: 0;
    display: flex;
    align-items: center;
}
.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
  display: inline-block;
  flex-shrink: 0;
}

.status-indicator.ready { background-color: #4CAF50; /* Зеленый */ }
.status-indicator.error { background-color: #F44336; /* Красный */ }


.no-videos-message { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #ffffff; font-size: 1.2em; text-align: center; grid-column: 1 / -1; grid-row: 1 / -1; display: flex; align-items: center; justify-content: center; padding: 20px; background-color: rgba(0, 0, 0, 0.5); border-radius: 8px; pointer-events: none; }

.dialog-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.dialog-box { background-color: white; padding: 25px 30px; border-radius: 8px; box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3); min-width: 350px; max-width: 90%; position: relative; }
.dialog-close-button { position: absolute; top: 10px; right: 10px; background: none; border: none; font-size: 1.5em; cursor: pointer; color: #aaa; line-height: 1; }
.dialog-close-button:hover { color: #333; }
.dialog-box h3 { margin-top: 0; margin-bottom: 15px; text-align: center; }
.report-status-message {
    font-size: 0.9em;
    color: #333;
    text-align: center;
    margin-bottom: 15px;
    padding: 8px;
    background-color: #f0f0f0;
    border-radius: 4px;
}
.dialog-checkbox-group { margin-bottom: 25px; max-height: 200px; overflow-y: auto; }
.checkbox-item { display: block; margin-bottom: 10px; }
.checkbox-item input[type="checkbox"] { margin-right: 8px; }
.checkbox-item label {
    cursor: pointer;
    display: inline-block;
    vertical-align: middle;
    max-width: calc(100% - 30px);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.checkbox-item input[type="checkbox"]:disabled + label {
    cursor: not-allowed;
    opacity: 0.7;
}
.dialog-confirm-button { display: block; width: 100%; padding: 10px 15px; border: none; background-color: #007bff; color: white; border-radius: 5px; cursor: pointer; font-size: 1em; transition: background-color 0.2s ease; }
.dialog-confirm-button:hover:not(:disabled) { background-color: #0056b3; }
.dialog-confirm-button:disabled { background-color: #cccccc; cursor: not-allowed; }

:deep(.video-player) {
    width: 100%;
    flex-grow: 1;
    background-color: black;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
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
  display: flex;
  justify-content: center;
  align-items: center;
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
/* Стили для спиннера в VideoPlayer.vue остаются актуальными, если он используется */
:deep(.video-player .status-overlay) {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  z-index: 5;
}

:deep(.video-player .spinner) {
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 4px solid #fff;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.video-actions {
  display: flex;
  gap: 4px;
  margin-left: auto;
}

.action-icon {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 4px;
  border-radius: 3px;
}

.action-icon:hover {
  background-color: #eee;
  color: #000;
}

.video-description {
  font-size: 0.8em;
  color: #666;
  margin-left: 8px;
}

/* Обновляем стили для статусов */
.status-dot.uploaded,
.status-indicator.uploaded { background-color: #2196F3; }

.status-dot.processing,
.status-indicator.processing { background-color: #FFC107; }

.status-dot.completed,
.status-indicator.completed { background-color: #4CAF50; }

.status-dot.failed,
.status-indicator.failed { background-color: #F44336; }

.status-dot.cancelled,
.status-indicator.cancelled { background-color: #9E9E9E; }
</style>
