
export type Relation = 'Father' | 'Mother' | 'Child' | 'Grandfather' | 'Grandmother' | 'Other';
export type Language = 'ID' | 'EN'; 
export type Gender = 'Laki-laki' | 'Perempuan';

export interface AllergyDetail {
  id: string;
  name: string;
  reaction: string;
  photoUrl?: string;
}

export interface FileAttachment {
  url: string;
  name: string;
}

export interface Insurance {
  id: string;
  providerName: string;
  number: string;
  cardUrl?: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  relation: Relation;
  gender?: Gender;
  birthDate: string;
  bloodType: string;
  allergies: AllergyDetail[];
  photoUrl: string;
  isElderly: boolean;
  isChild: boolean;
  nik?: string;
  insurances: Insurance[]; 
  aiGrowthAnalysis?: string; 
  aiImmunizationAnalysis?: string;
  aiDevelopmentAnalysis?: string; 
  developmentChecklist?: string; 
  immunizationChecklist?: string;
}

export interface InvestigationEntry {
  id: string;
  note: string;
  files: FileAttachment[];
}

export interface MedicalRecord {
  id: string;
  memberId: string;
  title: string;
  dateTime: string;
  type: 'Lab' | 'Consultation' | 'Vaccination' | 'Prescription' | 'Clinical Photo' | 'Imaging' | 'Other';
  description: string;
  diagnosis?: string;
  saran?: string;
  obat?: string;
  doctorName?: string;
  facility?: string;
  files: FileAttachment[];
  investigations?: InvestigationEntry[];
  aiAnalysis?: string; 
  temperature?: number;
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  oxygen?: number;
  respiratoryRate?: number;
}

export interface Appointment {
  id: string;
  memberId: string;
  title: string;
  dateTime: string;
  doctor: string;
  location: string;
  reminded: boolean;
}

export interface Medication {
  id: string;
  memberId: string;
  name: string;
  dosage: string;
  frequency: string; 
  instructions: string; 
  nextTime: string;
  active: boolean;
  fileUrl?: string;
  fileName?: string;
  aiAnalysis?: string; 
  consumptionHistory?: string[]; 
}

export interface HealthContact {
  id: string;
  name: string;
  type: 'Hospital' | 'Clinic' | 'Doctor' | 'Pharmacy' | 'Laboratory' | 'Other';
  phone: string;
  address: string;
  gmapsUrl?: string;
  latitude?: number;
  longitude?: number;
}

export interface GrowthLog {
  id: string;
  memberId: string;
  dateTime: string;
  weight: number; 
  height: number; 
  headCircumference?: number; 
}

export interface VitalLog {
  id: string;
  memberId: string;
  dateTime: string;
  heartRate?: number;
  systolic?: number;
  diastolic?: number;
  temperature?: number;
  oxygen?: number;
  respiratoryRate?: number; 
}

export interface HomeCareLog {
  id: string;
  memberId: string;
  title: string;
  createdTime: string; 
  entries: HomeCareEntry[];
  active: boolean;
  aiAnalysis?: string;
}

export interface HomeCareEntry {
  id: string;
  dateTime: string;
  symptom: string;
  temperature?: number;
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  oxygen?: number;
  note: string;
  files?: FileAttachment[];
}

export interface CaregiverNote {
  id: string;
  memberId: string;
  date: string;
  dateTime: string;
  text: string;
  type: 'mobility' | 'diet' | 'sleep' | 'general';
  mood?: string;      
  activity?: string;  
  meals?: string;     
  fluids?: string;    
  hygiene?: boolean;
  bab?: string;
  bak?: string;
}

export interface HealthInsight {
  title: string;
  content: string;
  source: 'AI' | 'WHO' | 'IDAI';
  type: 'info' | 'warning' | 'success';
}

export interface Recommendation {
  id: string;
  priorities: boolean;
  startDate: string;
  periodeAktif: string;
  endDate: string;
  jenis: string;
  subJenis: string;
  tenagaKesehatan: boolean;
  nama: string;
  str: string;
  kontak: string;
  alamat: string;
  linkAlamat: string;
  tempatPraktik1: string;
  kontak1: string;
  alamat1: string;
  link1: string;
  sip1: string;
  tempatPraktik2: string;
  kontak2: string;
  alamat2: string;
  link2: string;
  sip2: string;
  tempatPraktik3: string;
  kontak3: string;
  alamat3: string;
  link3: string;
  sip3: string;
  sosmed: string;
  campaign: string;
  imageUrl: string;
  wilayahKerja: string;
  keywords: string;
}
