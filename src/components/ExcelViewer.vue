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
      originalData: null
    }
  },
  computed: {
    displayData() {
      return this.isEditing ? this.editableData : this.data;
    }
  },
  emits: ['close'],
  async mounted() {
    await this.parseExcel();
  },
  methods: {
    async parseExcel() {
      try {
        this.fileName = this.file.name;
        const buffer = await this.file.arrayBuffer();
        const workbook = read(buffer);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = utils.sheet_to_json(worksheet, { header: 1 });
        if (jsonData.length > 0) {
          this.headers = jsonData[0];
          this.data = jsonData.slice(1);
          this.originalData = JSON.stringify(this.data);
        }
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        alert('Ошибка при чтении Excel файла');
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
        this.editableData = [];
      }
    },
    markAsChanged() {
      this.hasChanges = JSON.stringify(this.editableData) !== this.originalData;
    },
    saveChanges() {
      this.data = JSON.parse(JSON.stringify(this.editableData));
      this.originalData = JSON.stringify(this.data);
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
  font-size: 17px;
}

.excel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0 15px 0;
  border-bottom: 1px solid #ddd;
  margin-bottom: 15px;
  font-size: 19px;
}

.excel-header h3 {
  margin: 0;
  font-size: 1.2em;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.action-button {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}
.edit-button { background-color: #2196F3; color: white; }
.edit-button:hover { background-color: #1976D2; }
.save-button { background-color: #4CAF50; color: white; }
.save-button:hover:not(:disabled) { background-color: #388E3C; }
.save-button:disabled { background-color: #cccccc; cursor: not-allowed; }
.cancel-button { background-color: #f44336; color: white; }
.cancel-button:hover { background-color: #d32f2f; }

.table-container {
  flex: 1;
  overflow: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 17px;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  table-layout: fixed;
}

th, td {
  border: 1px solid #ddd;
  padding: 10px 6px;
  text-align: left;
  font-size: 17px;
  min-width: 120px;
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
  font-size: 18px;
}

tr:nth-child(even) { background-color: #f9f9f9; }
tr:hover { background-color: #f0f0f0; }

.cell-input {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  height: 100%;
  padding: 0 4px;
  border: none;
  background: transparent;
  font-size: inherit;
  font-family: inherit;
  box-sizing: border-box;
  outline: none;
  text-overflow: ellipsis;
}

.cell-input:focus {
  border: 1px solid #2196F3;
  background: #eaf4fd;
}
</style>
