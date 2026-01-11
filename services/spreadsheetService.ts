
/**
 * LAYANAN DATABASE SPREADSHEET (Versi High Integrity v7.0 - Final Compatibility)
 */

// PENTING: Ganti URL di bawah ini dengan URL Web App (Exec) hasil Deploy backend.gs Anda
const SPREADSHEET_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxrlJUMn-mH9xdk1w_6hH1ELeJjL0yjqriGZZ31d1fDwPLXZi0rN-Ncaar08QKM8nXG/exec'; 

const isUrlPlaceholder = (url: string) => {
  return !url || url.includes('MASUKKAN_URL') || url === '' || url.length < 20;
};

// Helper internal untuk parsing tanggal DD/MM/YYYY
const parseDateStr = (dateStr: string) => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const cleanStr = dateStr.trim();
  const parts = cleanStr.split('/');
  if (parts.length !== 3) {
      const fallback = new Date(cleanStr);
      return isNaN(fallback.getTime()) ? null : fallback;
  }
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; 
  const year = parseInt(parts[2], 10);
  const date = new Date(year, month, day);
  return isNaN(date.getTime()) ? null : date;
};

export const spreadsheetService = {
  /**
   * Mengambil semua data dari Cloud melalui jembatan Apps Script
   */
  async fetchAllData() {
    if (isUrlPlaceholder(SPREADSHEET_WEB_APP_URL)) return null;
    
    try {
      const response = await fetch(`${SPREADSHEET_WEB_APP_URL}?t=${Date.now()}`, {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow',
        cache: 'no-cache',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.warn(`Cloud server returned status: ${response.status}`);
        return null;
      }
      
      const result = await response.json();
      return result && result.status === 'success' ? result.data : null;
    } catch (error: any) {
      console.error('Cloud Fetch failed (Network/CORS Error):', error);
      return null; 
    }
  },

  /**
   * Mengambil link image Banner berdasarkan logika baris ke-3 vs baris ke-2
   */
  async fetchBannerImage() {
    try {
      const sheetId = '1R8y4mnnq8HnmmOOPyVje5bBxT229EbRDq8-Axsm1Kmc';
      const sheetName = 'Banner';
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;

      const response = await fetch(url, { redirect: 'follow' });
      if (!response.ok) return null;
      
      const text = await response.text();
      const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
      const json = JSON.parse(jsonStr);
      const rows = json.table.rows;
      
      // rows[0] adalah baris ke-2 di spreadsheet (data pertama)
      // rows[1] adalah baris ke-3 di spreadsheet (data kedua)
      // Kolom: A:ID(0), B:Client(1), C:StarDate(2), D:Periode(3), E:EndDate(4), F:LinkImage(5)

      const today = new Date();
      today.setHours(0,0,0,0);

      const getValue = (rowIdx: number, colIdx: number) => {
        if (!rows[rowIdx] || !rows[rowIdx].c[colIdx]) return "";
        return rows[rowIdx].c[colIdx].f || (rows[rowIdx].c[colIdx].v !== null ? String(rows[rowIdx].c[colIdx].v) : "");
      };

      // Cek Baris ke-3 (Index 1)
      const idBaris3 = getValue(1, 0);
      const endDateBaris3Str = getValue(1, 4);
      const linkImageBaris3 = getValue(1, 5);
      const endDateBaris3 = parseDateStr(endDateBaris3Str);

      if (idBaris3 && endDateBaris3 && endDateBaris3 >= today) {
         return linkImageBaris3;
      }

      // Fallback ke Baris ke-2 (Index 0)
      return getValue(0, 5);
    } catch (error) {
      console.error("Gagal mengambil banner image:", error);
      return null;
    }
  },

  /**
   * Mengambil data Rekomendasi via Gviz API (Struktur Baru 33 Kolom)
   */
  async fetchRecommendations() {
    try {
      const sheetId = '1R8y4mnnq8HnmmOOPyVje5bBxT229EbRDq8-Axsm1Kmc';
      const sheetName = 'Listing';
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;

      const response = await fetch(url, { redirect: 'follow' });
      if (!response.ok) return [];
      
      const text = await response.text();
      const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
      const json = JSON.parse(jsonStr);
      const rows = json.table.rows;
      
      return rows.map((row: any) => {
        const c = row.c;
        const getValue = (idx: number) => {
          if (!c[idx]) return "";
          return c[idx].f || (c[idx].v !== null ? String(c[idx].v) : "");
        };
        
        return {
          id: getValue(0),
          priorities: getValue(1).toUpperCase() === 'TRUE',
          startDate: getValue(2),
          periodeAktif: getValue(3),
          endDate: getValue(4),
          jenis: getValue(5),
          subJenis: getValue(6),
          tenagaKesehatan: getValue(7).toUpperCase() === 'TRUE',
          nama: getValue(8),
          str: getValue(9),
          kontak: getValue(10),
          alamat: getValue(11),
          linkAlamat: getValue(12),
          tempatPraktik1: getValue(13),
          kontak1: getValue(14),
          alamat1: getValue(15),
          link1: getValue(16),
          sip1: getValue(17),
          tempatPraktik2: getValue(18),
          kontak2: getValue(19),
          alamat2: getValue(20),
          link2: getValue(21),
          sip2: getValue(22),
          tempatPraktik3: getValue(23),
          kontak3: getValue(24),
          alamat3: getValue(25),
          link3: getValue(26),
          sip3: getValue(27),
          sosmed: getValue(28),
          campaign: getValue(29),
          imageUrl: getValue(30),
          wilayahKerja: getValue(31),
          keywords: getValue(32)
        };
      });
    } catch (error) {
      console.error("Gagal mengambil data rekomendasi:", error);
      return [];
    }
  },

  /**
   * Menyimpan data utama menggunakan jembatan URL GAS (Semua modul kecuali rekomendasi)
   */
  async saveData(data: any) {
    if (isUrlPlaceholder(SPREADSHEET_WEB_APP_URL)) return false;

    try {
      const response = await fetch(SPREADSHEET_WEB_APP_URL, {
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveAll',
          payload: data
        }),
      });

      return true; 
    } catch (error) {
      console.error('Cloud Save Error:', error);
      return false;
    }
  },

  /**
   * Mengunggah file ke Google Drive via GAS Web App
   */
  async uploadFile(file: File): Promise<{ url: string; fileId: string } | null> {
    if (isUrlPlaceholder(SPREADSHEET_WEB_APP_URL)) return null;

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const response = await fetch(SPREADSHEET_WEB_APP_URL, {
            method: 'POST',
            mode: 'cors',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
            body: JSON.stringify({
              action: 'upload',
              fileName: file.name,
              mimeType: file.type,
              base64: base64
            }),
          });
          
          if (!response.ok) throw new Error('Upload error');
          const result = await response.json();
          resolve(result && result.status === 'success' ? result : null);
        } catch (error) {
          console.error('Upload failed:', error);
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }
};
