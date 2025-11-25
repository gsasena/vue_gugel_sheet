<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from "vue"; // <-- Import onBeforeUnmount
import { getSheetData } from "../services/gsheetApi";
import DataChart from './DataChart.vue'; // <-- Import komponen grafik

const data = ref([]);
const headers = ref([]);
let dataInterval = null; // Variabel untuk menyimpan ID interval

// --- STATE DINAMIS BARU UNTUK GRAFIK ---
const chartLabelKey = ref(''); // Menentukan kolom mana yang menjadi Label (cth: 'NAMA')
const chartValueKey = ref(''); // Menentukan kolom mana yang menjadi Nilai (cth: 'USIA' atau 'NILAI')
// ----------------------------------------

// --- STATE BARU UNTUK FILTER DAN PAGINATION ---
const searchTerm = ref('');
const currentPage = ref(1);
const itemsPerPage = 10; // Jumlah baris per halaman
// ---------------------------------------------

// --- COMPUTED PROPERTY UNTUK FILTER HEADER ANGKA ---
const numericHeaders = computed(() => {
    // 1. Jika data kosong, kembalikan array kosong
    if (data.value.length === 0) return [];

    // 2. Ambil sampel baris pertama untuk pengecekan tipe data
    const sampleRow = data.value[0];

    // 3. Filter header yang ada
    return headers.value.filter(header => {
        // (Opsional) Kecualikan kolom 'NO' karena biasanya bukan data statistik
        if (header.toUpperCase() === 'NO') return false;

        const value = sampleRow[header];
        
        // Cek apakah nilai bisa dikonversi jadi angka yang valid
        // !isNaN(parseFloat(value)) berarti "Bukan Not-a-Number" (artinya Angka)
        // isFinite memastikan bukan infinity
        return !isNaN(parseFloat(value)) && isFinite(value);
    });
});
// ---------------------------------------------------

// --- COMPUTED PROPERTY BARU: FILTER HEADER TEKS ---
const textHeaders = computed(() => {
    // 1. Jika data kosong, kembalikan array kosong
    if (data.value.length === 0) return [];

    // 2. Ambil sampel baris pertama
    const sampleRow = data.value[0];

    // 3. Filter header
    return headers.value.filter(header => {
        const value = sampleRow[header];
        
        // Logika Kebalikan:
        // Jika parseFloat menghasilkan NaN (Not-a-Number), berarti itu adalah TEKS
        // Kita juga cek agar nilainya tidak kosong/undefined
        return isNaN(parseFloat(value)) && value !== undefined;
    });
});
// ---------------------------------------------------


// Fungsi untuk mengambil dan memproses data
async function fetchData() {
    try {
        const rows = await getSheetData();
        data.value = rows;
        
        // // Perbarui header hanya jika data tersedia dan header belum terisi
        // if (rows.length > 0 && headers.value.length === 0) {
        //     headers.value = Object.keys(rows[0]);
        // }
        // console.log("Data diperbarui melalui polling.");

        // --- LOGIKA OTOMATIS (AUTO-SET) ---
            // if (chartLabelKey.value === '') {
            //     // Setel Label ke kolom pertama yang bukan 'NO'
            //     chartLabelKey.value = currentHeaders.find(h => h.toUpperCase() !== 'NO') || currentHeaders[0];
            // }
            // if (chartValueKey.value === '') {
            //     // Setel Value ke kolom numerik pertama yang ditemukan (misal: 'USIA' atau 'NILAI')
            //     // Untuk contoh sederhana, kita ambil kolom ketiga atau kolom kedua (index 2 atau 1)
            //     chartValueKey.value = currentHeaders.length > 2 ? currentHeaders[2] : currentHeaders[1];
            // }
        // ------------------------------------

        // if (rows.length > 0) {
        //     const currentHeaders = Object.keys(rows[0]);
        //     headers.value = currentHeaders; // Update ref headers

        //     // --- Logika Auto-Set (PENTING) ---
        //     if (chartLabelKey.value === '' && currentHeaders.length > 0) {
        //         // Setel default: kolom kedua ('NAMA') atau yang pertama
        //         chartLabelKey.value = currentHeaders.find(h => h.toUpperCase() !== 'NO') || currentHeaders[0];
        //     }
        //     if (chartValueKey.value === '' && currentHeaders.length > 1) {
        //         // Setel default: kolom numerik yang dicari
        //         const defaultNumericKey = currentHeaders.find(h => 
        //             h.toUpperCase().includes('USIA') || h.toUpperCase().includes('NILAI')
        //         ) || currentHeaders[1];
        //         chartValueKey.value = defaultNumericKey;
        //     }
        //     // ------------------------------------
        // }

        if (rows.length > 0) {
            const currentHeaders = Object.keys(rows[0]);
            headers.value = currentHeaders;

            // --- AUTO-SET LOGIC ---
           // 1. Auto-set Label (Sumbu X) -> Ambil dari textHeaders
            // Kita harus hitung manual sebentar karena computed belum update saat fungsi ini jalan
            const textCols = currentHeaders.filter(h => isNaN(parseFloat(rows[0][h])));
            
            if (chartLabelKey.value === '' || !textCols.includes(chartLabelKey.value)) {
                // Ambil kolom teks pertama sebagai default
                chartLabelKey.value = textCols.length > 0 ? textCols[0] : currentHeaders[0];
            }
            
            // 2. Auto-set Value (Sumbu Y) -> Tetap ambil dari kolom angka (seperti sebelumnya)
            const numericCols = currentHeaders.filter(h => !isNaN(parseFloat(rows[0][h])) && h.toUpperCase() !== 'NO');
            
            if (chartValueKey.value === '' || !numericCols.includes(chartValueKey.value)) {
                chartValueKey.value = numericCols.length > 0 ? numericCols[0] : currentHeaders[1];
            }
        }

    } catch (error) {
        console.error("Gagal mengambil data dari Google Sheets:", error);
    }
}

// --- LOGIKA FILTERING (Pencarian Real-Time) ---
const filteredData = computed(() => {
    if (!searchTerm.value) {
        return data.value;
    }

    const term = searchTerm.value.toLowerCase();
    
    // Filter setiap baris
    return data.value.filter(row => {
        // Cek setiap nilai di baris (semua kolom)
        return Object.values(row).some(value => {
            // Pastikan nilai diubah ke string sebelum dicari
            return String(value).toLowerCase().includes(term);
        });
    });
});
// ---------------------------------------------

// --- LOGIKA PAGINATION ---

// 1. Hitung jumlah halaman
const totalPages = computed(() => {
    return Math.ceil(filteredData.value.length / itemsPerPage);
});

// 2. Ambil data yang ditampilkan di halaman saat ini
const paginatedData = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredData.value.slice(start, end);
});

// 3. Fungsi navigasi halaman
function goToPage(page) {
    if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page;
    }
}
// -------------------------


// Tambahkan watch untuk mereset Value Key jika Label Key berubah ke kolom yang sama
watch(chartLabelKey, (newVal) => {
    if (newVal === chartValueKey.value) {
        // Cari kolom lain yang bisa dijadikan Value Key
        const otherKey = headers.value.find(h => h !== newVal && h.toUpperCase() !== 'NO');
        if (otherKey) {
            chartValueKey.value = otherKey;
        }
    }
});


onMounted(() => {
    // 1. Panggil fungsi pengambilan data pertama kali
    fetchData();

    // 2. Setel Polling: Ambil data setiap 30 detik (30000 ms)
    // Anda bisa menyesuaikan angka ini sesuai kebutuhan
    const POLLING_INTERVAL = 10000; 
    dataInterval = setInterval(fetchData, POLLING_INTERVAL);
    console.log(`Polling dimulai. Interval: ${POLLING_INTERVAL / 1000} detik.`);
});

onBeforeUnmount(() => {
    // 3. Hentikan Polling saat komponen akan dihancurkan (mencegah memory leak)
    if (dataInterval) {
        clearInterval(dataInterval);
        console.log("Polling dihentikan.");
    }
});

const aggregatedData = computed(() => {
    // 1. Ambil data yang sudah difilter
    const sourceData = filteredData.value;
    const labelKey = chartLabelKey.value; 
    const valueKey = chartValueKey.value; 

    if (!labelKey || !valueKey || sourceData.length === 0) {
        return [];
    }

    const aggregated = {};

    sourceData.forEach(row => {
        const label = row[labelKey];
        // 2. Pastikan nilai (value) diubah menjadi angka sebelum penjumlahan
        const value = parseFloat(row[valueKey]) || 0; 
        
        if (label in aggregated) {
            // Jika label (misal: "Getasan") sudah ada, tambahkan nilainya
            aggregated[label] += value;
        } else {
            // Jika belum ada, inisialisasi
            aggregated[label] = value;
        }
    });

    // 3. Ubah hasil objek agregasi menjadi array
    const result = Object.keys(aggregated).map(key => ({
        label: key, // Nama Kecamatan
        value: aggregated[key] // Total Jumlah Balita
    }));
    
    // 4. Terapkan pagination pada hasil agregasi (agar konsisten dengan tabel)
    const start = (currentPage.value - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return result.slice(start, end);
});


const CHART_LABEL_KEY = 'NAMA'; 
const CHART_VALUE_KEY = 'USIA';

</script>

<template>
  <div>
    <h2>Data dari Google Sheets (Otomatis Diperbarui)</h2>

        <div class="chart-controls" v-if="headers.length > 0">
            <label>Label Grafik (Sumbu X):</label>
            <select v-model="chartLabelKey">
                <option v-for="h in textHeaders" :key="h + '_l'" :value="h">
                    {{ h }}
                </option>
            </select>

            <label style="margin-left: 20px;">Nilai Grafik (Sumbu Y):</label>
            <select v-model="chartValueKey">
                <option v-for="h in numericHeaders" :key="h + '_v'" :value="h">
                    {{ h }}
                </option>
            </select>
        </div>
        
      <DataChart 
        :chartData="aggregatedData"   :labelKey="'label'"            
        :valueKey="'value'"           
        chartType="bar" 
      />


    <div class="filter-controls">
        <input 
            type="text" 
            v-model="searchTerm" 
            placeholder="Cari data (semua kolom)..."
            @input="currentPage = 1" 
            class="search-input"
        />
        <p v-if="searchTerm && filteredData.length > 0" class="search-info">
            Menampilkan {{ filteredData.length }} hasil dari total {{ data.length }} baris.
        </p>
    </div>

    <!-- <DataChart 
      :chartData="paginatedData" 
      :labelKey="CHART_LABEL_KEY" 
      :valueKey="CHART_VALUE_KEY" 
      chartType="bar" 
    /> -->

    <center>
        <table border="1" cellpadding="5">
            <thead>
                <tr>
                <th v-if="headers.length === 0" colspan="100%">Memuat data...</th>
                <th v-for="(h, i) in headers" :key="i">{{ h }}</th>
                </tr>
            </thead>

            <tbody>
                <!-- <tr v-if="data.length === 0 && headers.length > 0">
                    <td :colspan="headers.length" style="text-align: center;">Tidak ada data ditemukan.</td>
                </tr>
                <tr v-for="(row, i) in data" :key="i">
                <td v-for="(h, j) in headers" :key="j">
                    {{ row[h] }}
                </td>
                </tr> -->
                <tr v-if="paginatedData.length === 0">
                    <td :colspan="headers.length" style="text-align: center;">
                        {{ searchTerm ? 'Tidak ada data yang cocok.' : 'Tidak ada data ditemukan.' }}
                    </td>
                </tr>
                <tr v-for="(row, i) in paginatedData" :key="i">
                <td v-for="(h, j) in headers" :key="j">
                    {{ row[h] }}
                </td>
                </tr>
            </tbody>
        </table>
    </center>


    <div class="pagination-controls" v-if="totalPages > 1">
        <button 
            @click="goToPage(currentPage - 1)" 
            :disabled="currentPage === 1"
        >
            &laquo;
        </button>
        
        <span class="page-info">
            {{ currentPage }} up {{ totalPages }}
        </span>

        <button 
            @click="goToPage(currentPage + 1)" 
            :disabled="currentPage === totalPages"
        >
            &raquo;
        </button>
    </div>

    <!-- TAMBAHAN  -->
    <div>
        <!-- <DataChart 
        :chartData="paginatedData"   
        :labelKey="chartLabelKey"   :valueKey="chartValueKey"    chartType="bar" 
        /> -->

        <DataChart 
            :chartData="aggregatedData"   :labelKey="'label'"            
            :valueKey="'value'"           
            chartType="bar" 
        />
    </div>

    


  </div>
</template>

<style scoped>
.filter-controls, .pagination-controls {
    margin: 15px 0;
    text-align: center;
}
.search-input {
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    width: 300px;
}
.search-info {
    font-size: 0.9em;
    color: #666;
    margin-top: 5px;
}
.pagination-controls button {
    padding: 8px 15px;
    margin: 0 5px;
    cursor: pointer;
    border: 1px solid #ccc;
    background: #f4f4f4;
    border-radius: 4px;
}
.pagination-controls button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
}
.page-info {
    margin: 0 10px;
    font-weight: bold;
}

.chart-controls {
    margin-bottom: 20px;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #f9f9f9;
    display: flex;
    justify-content: center;
    align-items: center;
}
.chart-controls label, .chart-controls select {
    margin-right: 10px;
}

table {
  width: 600px;
  border-collapse: collapse;
}
th {
  background: #eee;
  text-align: left;
  padding: 8px;
}
td {
    padding: 8px;
}
</style>

<!-- <script setup>
import { ref, onMounted } from "vue";
import { getSheetData } from "../services/gsheetApi";

const data = ref([]);
const headers = ref([]);

onMounted(async () => {
  const rows = await getSheetData();
  data.value = rows;
  if (rows.length > 0) {
    headers.value = Object.keys(rows[0]);
  }
});
</script>

<template>
  <div>
    <h2>Data dari Google Sheets</h2>

    <table border="1" cellpadding="5">
      <thead>
        <tr>
          <th v-for="(h, i) in headers" :key="i">{{ h }}</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="(row, i) in data" :key="i">
          <td v-for="(h, j) in headers" :key="j">
            {{ row[h] }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
}
th {
  background: #eee;
}
</style> -->
