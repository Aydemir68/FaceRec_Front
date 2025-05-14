<template>
  <div class="excel-viewer">
    <div class="excel-header">
      <h3>{{ fileName }}</h3>
      <button class="close-button" @click="$emit('close')" title="Закрыть">×</button>
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th v-for="(header, index) in headers" :key="index">{{ header }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in data" :key="rowIndex">
            <td v-for="(cell, cellIndex) in row" :key="cellIndex">{{ cell }}</td>
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
      fileName: ''
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
        }
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        alert('Ошибка при чтении Excel файла');
      }
    }
  }
}
</script>

<style scoped>
.excel-viewer {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  width: 90%;
  max-width: 1200px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.excel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.excel-header h3 {
  margin: 0;
  font-size: 1.2em;
  color: #333;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0 5px;
}

.close-button:hover {
  color: #000;
}

.table-container {
  overflow: auto;
  max-height: calc(90vh - 100px);
}

table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

th, td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

th {
  background-color: #f5f5f5;
  position: sticky;
  top: 0;
  z-index: 1;
}

tr:nth-child(even) {
  background-color: #f9f9f9;
}

tr:hover {
  background-color: #f0f0f0;
}
</style> 