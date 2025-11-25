<script setup>
import { ref, watch, computed } from 'vue';
import { DoughnutChart, BarChart } from 'vue-chart-3';
import { Chart, registerables } from 'chart.js';

// Daftarkan semua komponen Chart.js yang diperlukan
Chart.register(...registerables);

// --- 1. Definisi Props ---
const props = defineProps({
    // ... (props definition tetap sama)
    chartData: {
        type: Array,
        required: true,
    },
    labelKey: {
        type: String,
        required: true,
    },
    valueKey: {
        type: String,
        required: true,
    },
    chartType: {
        type: String,
        default: 'bar',
    },
});

// --- 2. Computed untuk Data Grafik ---
const chartDataset = computed(() => {
    // Tambahkan validasi agar data tidak NaN (Not a Number)
    if (!props.chartData || props.chartData.length === 0) {
        return { labels: [], datasets: [] };
    }

    const labels = props.chartData.map(row => row[props.labelKey]);
    
    // Pastikan nilai diubah ke float, dan jika gagal (misal: baris kosong), gunakan 0
    const dataValues = props.chartData.map(row => {
        const val = parseFloat(row[props.valueKey]);
        return isNaN(val) ? 0 : val;
    });

    const backgroundColor = props.chartData.map(() => `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`);
    const borderColor = backgroundColor.map(color => color.replace('0.6', '1'));

    return {
        labels: labels,
        datasets: [
            {
                label: props.valueKey,
                data: dataValues,
                backgroundColor: backgroundColor,
                borderColor: borderColor,
                borderWidth: 1,
            },
        ],
    };
});

// --- COMPUTED BARU UNTUK MENGHITUNG SKALA DINAMIS ---
const dynamicYScale = computed(() => {
    // 1. Validasi awal
    if (!props.chartData || props.chartData.length === 0 || !props.valueKey) {
        return { min: 0, max: 10 }; // Nilai default aman
    }

    // Ambil semua nilai (sudah diconvert ke number, atau 0 jika gagal)
    const values = props.chartData.map(row => {
        const val = parseFloat(row[props.valueKey]);
        return isNaN(val) ? 0 : val;
    });

    if (values.length === 0) {
        return { min: 0, max: 10 }; // Tidak ada data
    }
    
    // --- PENANGANAN KASUS 1 DATA (PENTING!) ---
    if (values.length === 1) {
        const singleValue = values[0];
        // Atur rentang di sekitar nilai tunggal tersebut
        return { 
            min: Math.max(0, singleValue * 0.9), // 90% dari nilai
            max: singleValue * 1.1               // 110% dari nilai
        };
    }
    
    // --- PENANGANAN KASUS BANYAK DATA (Logika yang sebelumnya sudah ada) ---
    // Pastikan spread operator (...) digunakan dengan benar
    const dataMin = Math.min(...values); 
    const dataMax = Math.max(...values);
    
    // Tambahkan padding/buffer (misalnya 10%)
    const buffer = (dataMax - dataMin) * 0.1; 
    
    // Atur nilai minimum dan maksimum akhir
    const finalMin = dataMin > 0 && dataMin < 5 ? 0 : Math.floor(dataMin - buffer);
    const finalMax = Math.ceil(dataMax + buffer);
    
    return { 
        min: Math.max(0, finalMin), 
        max: finalMax 
    };
});
// -----------------------------------------------------


// Opsi konfigurasi Chart.js (Ubah dari statis menjadi dinamis)
const chartOptions = computed(() => { // UBAH MENJADI computed
    const { min, max } = dynamicYScale.value;
    
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false // Mengatur legenda (simbol & keterangan 'value') agar tidak ditampilkan
            },
            tooltip: {
                enabled: true // (Opsional) Tetap aktifkan tooltip saat hover
            }
        },
        scales: {
            y: {
                type: 'linear',  
                // Gunakan nilai dinamis dari computed property
                min: min, 
                max: max,
                // Hilangkan beginAtZero: true (karena sudah ditangani di finalMin)
                // Jika Anda ingin langkah (step) dinamis, gunakan:
                // ticks: { stepSize: Math.max(1, Math.ceil((max - min) / 5)) } 
            },
            x: {
                 type: 'category', 
            }
        },
    };
});

// // Opsi konfigurasi Chart.js
// const chartOptions = ref({
//     responsive: true,
//     maintainAspectRatio: false,
//     scales: {
//         y: {
//             // --- PERBAIKAN INI PENTING ---
//             type: 'linear',  // Tetapkan tipe skala sebagai linear (nilai numerik absolut)
//             beginAtZero: true,
//             // Tambahkan batas minimum dan maksimum untuk tampilan yang lebih baik (Opsional)
//             min: 0, 
//             max: 60, // Atur maksimum lebih tinggi dari nilai usia tertinggi (50)
//         },
//         x: {
//              // Jika Anda ingin memastikan sumbu X adalah kategori (label usia)
//              type: 'category', 
//         }
//     },
// });
</script>

<template>
    <div class="chart-container">
        <h3>{{ props.chartType === 'bar' ? 'Bar Chart' : 'Doughnut Chart' }} Berdasarkan {{ props.labelKey }}</h3>

        <BarChart 
            v-if="props.chartType === 'bar'"
            :chartData="chartDataset" 
            :options="chartOptions" 
            class="chart-size"
        />

        <DoughnutChart 
            v-else-if="props.chartType === 'doughnut'"
            :chartData="chartDataset" 
            :options="{ responsive: true, maintainAspectRatio: false }" 
            class="chart-size-doughnut"
        />

        <p v-else>Tipe grafik tidak didukung.</p>
        
        <div v-if="props.chartData.length === 0">Memuat data atau data kosong...</div>
    </div>
</template>

<style scoped>
/* ... (style tetap sama) */
.chart-container {
    max-width: 600px;
    margin: 20px auto;
    padding: 20px;
    border: 1px solid #ccc;
    border-radius: 8px;
}
.chart-size {
    height: 400px; /* Atur tinggi untuk Bar Chart */
}
.chart-size-doughnut {
    max-height: 400px; /* Atur tinggi maksimum untuk Doughnut Chart */
}
</style>