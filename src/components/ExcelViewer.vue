// ... existing code ...
<template>
  <div class="excel-viewer">
    <div class="excel-header">
      <h3>{{ fileName }}</h3>
      <div class="header-actions">
        <button v-if="!isEditing" class="action-button edit-button" @click="startEditing" title="Редактировать таблицу">Редактировать</button>
        <template v-else>
          <button class="action-button save-button" @click="saveChanges" :disabled="!hasChanges" title="Сохранить изменения">Сохранить</button>
          <button class="action-button cancel-button" @click="cancelEditing" title="Отменить изменения">Отмена</button>
        </template>
        <button class="close-button" @click="$emit('close')" title="Закрыть">×</button>
      </div>
    </div>
    <div class="table-stats">
      <span>Количество входов: {{ countIn }}</span>
      <span style="margin-left: 20px;">Количество выходов: {{ countOut }}</span>
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th v-for="(header, index) in headers" :key="index">{{ header }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in displayData" :key="rowIndex">
            <td v-for="(cell, cellIndex) in row" :key="cellIndex">
              <template v-if="isEditing">
                <input type="text" v-model="editableData[rowIndex][cellIndex]" @input="markAsChanged" class="cell-input" />
              </template>
              <template v-else>
                {{ cell }}
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

// ... existing code ...
<script>
import { read, utils } from 'xlsx';

export default {
  name: 'ExcelViewer',
  props: {
    file: {
      type: File,
      required: true
    }
  },
  data() {
    return {
      headers: [],
      data: [],
      editableData: [],
      fileName: '',
      isEditing: false,
      hasChanges: false,
      originalData: null,
      // Фиксированные заголовки (ваш список)
      // Можно вынести в константы, если они не меняются динамически
      targetHeadersConst: [
        'Наименование ПКО',
        'Время',
        'Номер идентификатора',
        'Направление',
        'Вид операции',
        'Содержание операции',
        'Время разрешения/Сообщения о проведенной операции'
      ]
    }
  },
  computed: {
    displayData() {
      return this.isEditing ? this.editableData : this.data;
    },
    countIn() {
      // Индекс столбца "Направление"
      const idx = this.headers.findIndex(h => h.toLowerCase().includes('направление'));
      if (idx === -1) return 0;
      return this.data.filter(row => (row[idx] || '').toString().toLowerCase().includes('вход')).length;
    },
    countOut() {
      const idx = this.headers.findIndex(h => h.toLowerCase().includes('направление'));
      if (idx === -1) return 0;
      return this.data.filter(row => (row[idx] || '').toString().toLowerCase().includes('выход')).length;
    }
  },
  emits: ['close'],
  async mounted() {
    this.headers = [...this.targetHeadersConst]; // Инициализация заголовков по умолчанию
    await this.parseExcel();
  },
  methods: {
    // ... остальной код компонента ...

    async parseExcel() {
      try {
        this.fileName = this.file.name;
        const targetHeaders = [
          'Наименование ПКО',
          'Время',
          'Номер идентификатора',
          'Направление',
          'Вид операции',
          'Содержание операции',
          'Время разрешения/Сообщения о проведенной операции'
        ];
        const normalize = s => (s || '').toString().replace(/\s+/g, '').toLowerCase();
        const normalizedTargets = targetHeaders.map(normalize);
        const buffer = await this.file.arrayBuffer();
        const workbook = read(buffer);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonDataRaw = utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        if (!jsonDataRaw || jsonDataRaw.length === 0) {
          this.headers = targetHeaders;
          this.data = [];
          this.originalData = JSON.stringify(this.data);
          alert('Файл пустой или не содержит данных');
          return;
        }

        // --- Автоопределение строк заголовков ---
        // Сканируем первые 10 строк, ищем строки, где есть хотя бы одно целевое слово
        let headerRowsCount = 0;
        const maxScanRows = Math.min(10, jsonDataRaw.length);
        for (let i = 0; i < maxScanRows; i++) {
          const row = jsonDataRaw[i] || [];
          const rowStr = row.map(normalize).join(' ');
          if (normalizedTargets.some(t => rowStr.includes(t))) {
            headerRowsCount = i + 1;
          }
        }
        if (headerRowsCount === 0) headerRowsCount = 1; // fallback: хотя бы первая строка
        const headerRows = jsonDataRaw.slice(0, headerRowsCount);
        const dataContentRows = jsonDataRaw.slice(headerRowsCount);
        // --- Конец автоопределения ---

        // Строим для каждой колонки путь из всех строк заголовков, учитывая merged cells
        const colCount = Math.max(...headerRows.map(r => r.length));
        const filledHeaders = [];
        for (let row = 0; row < headerRowsCount; row++) {
          filledHeaders[row] = [];
          for (let col = 0; col < colCount; col++) {
            if (headerRows[row][col] && headerRows[row][col].toString().trim() !== '') {
              filledHeaders[row][col] = headerRows[row][col];
            } else if (row > 0) {
              filledHeaders[row][col] = filledHeaders[row - 1][col] || '';
            } else {
              filledHeaders[row][col] = '';
            }
          }
        }
        // Для каждого столбца формируем путь из всех строк заголовков
        const columnPaths = [];
        for (let col = 0; col < colCount; col++) {
          let path = filledHeaders.map(row => row[col] || '').join(' ').trim();
          columnPaths.push(normalize(path));
        }
        // Для каждого целевого столбца ищем первый подходящий индекс (по подстроке)
        const targetIndexes = normalizedTargets.map(target => {
          let idx = columnPaths.findIndex(path => path.includes(target) || target.includes(path));
          return idx;
        });
        // Формируем данные: для каждой строки берем значения по нужным индексам, если нет — ''
        const filteredData = dataContentRows.map(row =>
          targetIndexes.map(idx => (idx !== -1 && row && row[idx] !== undefined ? row[idx] : ''))
        );
        this.headers = targetHeaders;
        this.data = filteredData;
        this.originalData = JSON.stringify(this.data);
        if (this.data.length === 0 && dataContentRows.length > 0) {
          alert("Данные были найдены в файле, но не удалось сопоставить их с целевыми столбцами. Проверьте структуру файла.");
        }
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        alert('Ошибка при чтении Excel файла. См. консоль (F12) для деталей.');
        this.headers = [
          'Наименование ПКО',
          'Время',
          'Номер идентификатора',
          'Направление',
          'Вид операции',
          'Содержание операции',
          'Время разрешения/Сообщения о проведенной операции'
        ];
        this.data = [];
        this.originalData = JSON.stringify(this.data);
      }
    },

    startEditing() {
      this.editableData = JSON.parse(JSON.stringify(this.data));
      this.isEditing = true;
      this.hasChanges = false;
    },
    cancelEditing() {
      if (confirm('Отменить все изменения?')) {
        this.isEditing = false;
        this.hasChanges = false;
        this.editableData = []; // Очищаем редактируемые данные
      }
    },
    markAsChanged() {
      this.hasChanges = JSON.stringify(this.editableData) !== this.originalData;
    },
    saveChanges() {
      this.data = JSON.parse(JSON.stringify(this.editableData));
      this.originalData = JSON.stringify(this.data); // Обновляем originalData после сохранения
      this.isEditing = false;
      this.hasChanges = false;
    }
  }
}
</script>


<style scoped>
.excel-viewer {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  font-size: 14.5px; /* уменьшено на ~15% */
}

.excel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0 13px 0; /* уменьшено */
  border-bottom: 1px solid #ddd;
  margin-bottom: 13px; /* уменьшено */
  font-size: 16px; /* уменьшено */
}

.excel-header h3 {
  margin: 0;
  font-size: 1.05em; /* уменьшено */
  color: #333;
}

.header-actions {
  display: flex;
  gap: 7px;
  align-items: center;
}

.action-button {
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
}
.edit-button { background-color: #2196F3; color: white; }
.edit-button:hover { background-color: #1976D2; }
.save-button { background-color: #4CAF50; color: white; }
.save-button:hover:not(:disabled) { background-color: #388E3C; }
.save-button:disabled { background-color: #cccccc; cursor: not-allowed; }
.cancel-button { background-color: #f44336; color: white; }
.cancel-button:hover { background-color: #d32f2f; }

.table-stats {
  font-size: 13px;
  margin: 8px 0 4px 0;
  color: #333;
}

.table-container {
  flex: 1;
  overflow: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14.5px; /* уменьшено */
}

table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  table-layout: fixed;
}

th, td {
  border: 1px solid #ddd;
  padding: 8.5px 5px; /* уменьшено */
  text-align: left;
  font-size: 14.5px; /* уменьшено */
  min-width: 100px; /* уменьшено */
  max-width: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

th {
  background-color: #f5f5f5;
  position: sticky;
  top: 0;
  z-index: 1;
  font-size: 15px; /* уменьшено */
}

tr:nth-child(even) { background-color: #f9f9f9; }
tr:hover { background-color: #f0f0f0; }

.cell-input {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  height: 100%;
  padding: 0 3px;
  border: none;
  background: transparent;
  font-size: inherit;
  font-family: inherit;
  box-sizing: border-box;
  outline: none;
  text-overflow: ellipsis;
}

.close-button{
  height: 1.5rem;
  border: solid 1px gray;
  border-radius: 3px;
}

.close-button:hover{
  background-color: rgb(190, 190, 190);
}

.cell-input:focus {
  border: 1px solid #2196F3;
  background: #eaf4fd;
}
</style>
