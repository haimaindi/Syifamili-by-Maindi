
/**
 * Syifamili Backend v23.0 - PERSISTENT DATA CLOUD
 * Simpan kode ini di menu "Extensions" -> "Apps Script" pada Spreadsheet Anda.
 */

const DRIVE_FOLDER_ID = '1Xy-mXJm0Xy-mXJm0Xy-mXJm0Xy-mXJm'; // Ganti dengan ID folder Google Drive Anda untuk upload gambar

// Struktur kolom untuk setiap sheet agar data tetap konsisten saat sinkronisasi
const DATABASE_SCHEMA = {
  'members': [
    'id', 'name', 'relation', 'gender', 'birthDate', 'bloodType', 'photoUrl', 
    'isElderly', 'isChild', 'nik', 'insurances', 'allergies', 
    'aiGrowthAnalysis', 'aiImmunizationAnalysis', 'aiDevelopmentAnalysis', 
    'developmentChecklist', 'immunizationChecklist'
  ],
  'records': [
    'id', 'memberId', 'title', 'dateTime', 'type', 'description', 'diagnosis', 
    'saran', 'obat', 'doctorName', 'facility', 'files', 'temperature', 
    'systolic', 'diastolic', 'heartRate', 'oxygen', 'respiratoryRate', 
    'investigations', 'aiAnalysis'
  ], 
  'appointments': [
    'id', 'memberId', 'title', 'dateTime', 'doctor', 'location', 'reminded'
  ],
  'meds': [
    'id', 'memberId', 'name', 'dosage', 'frequency', 'instructions', 'nextTime', 
    'active', 'fileUrl', 'fileName', 'aiAnalysis', 'consumptionHistory'
  ],
  'growthLogs': [
    'id', 'memberId', 'dateTime', 'weight', 'height', 'headCircumference'
  ],
  'vitalLogs': [
    'id', 'memberId', 'dateTime', 'heartRate', 'systolic', 'diastolic', 
    'temperature', 'oxygen', 'respiratoryRate'
  ],
  'homeCareLogs': [
    'id', 'memberId', 'title', 'active', 'entries', 'createdTime', 'aiAnalysis'
  ], 
  'notes': [
    'id', 'memberId', 'date', 'dateTime', 'text', 'type', 'mood', 'activity', 
    'meals', 'fluids', 'hygiene', 'bab', 'bak'
  ],
  'contacts': [
    'id', 'name', 'type', 'phone', 'address', 'gmapsUrl', 'latitude', 'longitude'
  ],
  // Sheet Listing dan Banner dikelola manual/read-only via app, tapi didaftarkan di sini agar struktur terjaga
  'Listing': [
    'id', 'priorities', 'startDate', 'periodeAktif', 'endDate', 'jenis', 'subJenis', 
    'tenagaKesehatan', 'nama', 'str', 'kontak', 'alamat', 'linkAlamat', 
    'tempatPraktik1', 'kontak1', 'alamat1', 'link1', 'sip1', 
    'tempatPraktik2', 'kontak2', 'alamat2', 'link2', 'sip2', 
    'tempatPraktik3', 'kontak3', 'alamat3', 'link3', 'sip3', 
    'sosmed', 'campaign', 'imageUrl', 'wilayahKerja', 'keywords'
  ],
  'Banner': [
    'ID', 'Client', 'StartDate', 'Periode', 'EndDate', 'LinkImage'
  ]
};

/**
 * Endpoint GET: Mengambil semua data dari spreadsheet
 */
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const result = {};
  
  Object.keys(DATABASE_SCHEMA).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      result[sheetName] = [];
      return;
    }
    const values = sheet.getDataRange().getDisplayValues(); 
    if (values.length <= 1) {
      result[sheetName] = [];
      return;
    }
    const headers = values[0];
    result[sheetName] = values.slice(1).map(row => {
      let obj = {};
      headers.forEach((header, index) => {
        let val = row[index];
        // Deteksi string JSON secara otomatis (untuk array/objek seperti asuransi, alergi, penunjang)
        if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
          try { 
            val = JSON.parse(val); 
          } catch(err) { 
            // biarkan sebagai string jika gagal parse
          }
        }
        obj[header] = val;
      });
      return obj;
    });
  });
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: result }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Endpoint POST: Menyimpan data (Save All) atau Mengunggah file
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    if (lock.tryLock(30000)) {
      const request = JSON.parse(e.postData.contents);
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      
      if (request.action === 'saveAll') {
        const payload = request.payload;
        
        Object.keys(DATABASE_SCHEMA).forEach(sheetName => {
          // Hanya update sheet yang dikirimkan di payload (biasanya data utama user)
          if (payload.hasOwnProperty(sheetName)) {
            let sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
            const headers = DATABASE_SCHEMA[sheetName];
            const dataRows = payload[sheetName] || [];
            
            sheet.clearContents();
            // Tulis Header
            sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
            
            if (dataRows.length > 0) {
              const formattedRows = dataRows.map(item => headers.map(h => {
                let val = item[h];
                if (val === undefined || val === null) return '';
                
                // Konversi objek/array ke string JSON untuk disimpan di cell
                let s = (typeof val === 'object') ? JSON.stringify(val) : val.toString();
                
                // Gunakan petik tunggal di awal agar Google Sheets menganggapnya plain text (mencegah format otomatis error)
                return "'" + s; 
              }));
              sheet.getRange(2, 1, formattedRows.length, headers.length).setValues(formattedRows);
            }
          }
        });
        
        SpreadsheetApp.flush();
        return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      if (request.action === 'upload') {
        const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
        const blob = Utilities.newBlob(Utilities.base64Decode(request.base64), request.mimeType, request.fileName);
        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        return ContentService.createTextOutput(JSON.stringify({ 
          status: 'success', 
          url: 'https://lh3.googleusercontent.com/d/' + file.getId(),
          fileId: file.getId()
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Action not found' }))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Sync lock error' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
