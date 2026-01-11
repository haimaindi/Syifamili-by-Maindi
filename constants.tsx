
import { FamilyMember } from './types';

export const INITIAL_MEMBERS: FamilyMember[] = [
  {
    id: '1',
    name: 'Budi Santoso',
    relation: 'Father',
    gender: 'Laki-laki',
    birthDate: '1980-05-15',
    bloodType: 'O+',
    allergies: [{ id: 'a1', name: 'Kacang', reaction: 'Gatal parah dan pembengkakan' }],
    photoUrl: 'https://picsum.photos/seed/budi/200',
    isElderly: false,
    isChild: false,
    insurances: []
  },
  {
    id: '2',
    name: 'Siti Aminah',
    relation: 'Mother',
    gender: 'Perempuan',
    birthDate: '1982-11-20',
    bloodType: 'A-',
    allergies: [{ id: 'a2', name: 'Debu', reaction: 'Bersin terus-menerus' }],
    photoUrl: 'https://picsum.photos/seed/siti/200',
    isElderly: false,
    isChild: false,
    insurances: []
  },
  {
    id: '3',
    name: 'Eyang Subur',
    relation: 'Grandfather',
    gender: 'Laki-laki',
    birthDate: '1945-01-01',
    bloodType: 'B+',
    allergies: [],
    photoUrl: 'https://picsum.photos/seed/eyang/200',
    isElderly: true,
    isChild: false,
    insurances: []
  },
  {
    id: '4',
    name: 'Baby Rizky',
    relation: 'Child',
    gender: 'Laki-laki',
    birthDate: '2024-01-10',
    bloodType: 'O+',
    allergies: [],
    photoUrl: 'https://picsum.photos/seed/rizky/200',
    isElderly: false,
    isChild: true,
    insurances: []
  }
];

export const VACCINATION_SCHEDULE_IDAI = [
  { age: 'Lahir', vaccines: ['Hepatitis B (HB-0)', 'Polio 0'] },
  { age: '1 Bulan', vaccines: ['BCG'] },
  { age: '2 Bulan', vaccines: ['DPT-HB-Hib 1', 'Polio 1', 'PCV 1', 'Rotavirus 1'] },
  { age: '3 Bulan', vaccines: ['DPT-HB-Hib 2', 'Polio 2', 'Rotavirus 2'] },
  { age: '4 Bulan', vaccines: ['DPT-HB-Hib 3', 'Polio 3 (IPV 1)', 'PCV 2', 'Rotavirus 3 (Pentavalen)'] },
  { age: '6 Bulan', vaccines: ['PCV 3', 'Influenza 1'] },
  { age: '9 Bulan', vaccines: ['MR 1'] },
  { age: '12 Bulan', vaccines: ['PCV 4 (Booster)', 'Varisela 1', 'Hepatitis A 1'] },
  { age: '15 Bulan', vaccines: ['DPT-HB-Hib 4 (Booster)'] },
  { age: '18 Bulan', vaccines: ['MR 2', 'Polio 4'] },
  { age: '24 Bulan', vaccines: ['Hepatitis A 2', 'Tifoid 1'] },
  { age: '5-7 Tahun', vaccines: ['MR 3', 'DT (Booster)', 'Polio 5'] },
  { age: '10-12 Tahun', vaccines: ['Td (Booster)', 'HPV 1', 'HPV 2 (setelah 6-12 bulan)'] },
  { age: '18 Tahun', vaccines: ['Td (Booster tiap 10 thn)'] }
];

export const MILESTONES_SCHEDULE_IDAI = [
  {
    age: '0-3 Bulan',
    milestones: ["Mengangkat kepala setinggi 45 derajat", "Menggerakkan kepala dari kiri/kanan ke tengah", "Melihat dan menatap wajah anda", "Mengoceh spontan", "Suka tertawa keras", "Bereaksi terkejut terhadap suara keras"]
  },
  {
    age: '3-6 Bulan',
    milestones: ["Berbalik dari telungkup ke telentang", "Mengangkat kepala setinggi 90 derajat", "Mempertahankan posisi kepala tetap tegak", "Meraih benda yang ada dalam jangkauannya", "Mengeluarkan suara gembira bernada tinggi", "Tersenyum ketika melihat mainan/gambar"]
  },
  {
    age: '6-9 Bulan',
    milestones: ["Duduk (sikap tripoid - sendiri)", "Belajar berdiri, kedua kakinya menyangga sebagian berat badan", "Merangkak meraih mainan", "Memindahkan benda dari satu tangan ke tangan lain", "Memungut 2 benda, masing-masing tangan pegang 1", "Makan kue sendiri"]
  },
  {
    age: '9-12 Bulan',
    milestones: ["Mengangkat badannya ke posisi berdiri", "Belajar berdiri selama 30 detik s.d. 1 menit", "Dapat berjalan dengan dituntun", "Mengulurkan lengan/badan untuk meraih mainan", "Mengenggam erat pensil", "Memasukkan benda ke mulut"]
  },
  {
    age: '12-18 Bulan',
    milestones: ["Berdiri sendiri tanpa berpegangan", "Membungkuk memungut mainan kemudian berdiri kembali", "Berjalan mundur 5 langkah", "Memanggil ayah/ibu", "Menumpuk 2 kubus", "Memasukkan kubus di kotak"]
  },
  {
    age: '18-24 Bulan',
    milestones: ["Berdiri sendiri tanpa berpegangan 30 detik", "Berjalan tanpa terhuyung-huyung", "Bertepuk tangan, melambai-lambai", "Menumpuk 4 buah kubus", "Memungut benda kecil dengan ibu jari dan jari telunjuk", "Menggelindingkan bola kearah sasaran"]
  },
  {
    age: '24-36 Bulan',
    milestones: ["Jalan naik tangga sendiri", "Dapat bermain dan menendang bola kecil", "Mencoret-coret pensil pada kertas", "Bicara dengan baik, menggunakan 2 kata", "Menunjuk 1 atau lebih bagian tubuhnya", "Melihat gambar dan dapat menyebut dengan benar nama benda"]
  },
  {
    age: '36-48 Bulan',
    milestones: ["Melompat kedua kaki diangkat", "Mengayuh sepeda roda tiga", "Menggambar garis lurus", "Menumpuk 8 buah kubus", "Mengenal 2-4 warna", "Menyebut nama, umur, tempat"]
  }
];
