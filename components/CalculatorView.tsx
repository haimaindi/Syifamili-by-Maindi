
import React, { useState } from 'react';
import { Calculator, Scale, Activity, Droplets, HeartPulse, Brain, ChevronLeft, Info, Calendar, ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Language } from '../types';

interface CalculatorViewProps {
  language: Language;
}

type ToolType = 'menu' | 'bmi' | 'bmr' | 'period' | 'water' | 'ascvd' | 'phq9';

const CalculatorView: React.FC<CalculatorViewProps> = ({ language }) => {
  const [activeTool, setActiveTool] = useState<ToolType>('menu');

  const [bmiWeight, setBmiWeight] = useState('');
  const [bmiHeight, setBmiHeight] = useState('');
  const [bmiResult, setBmiResult] = useState<{value: number, category: string, color: string, recommendation: string} | null>(null);

  const [bmrGender, setBmrGender] = useState<'male' | 'female'>('male');
  const [bmrWeight, setBmrWeight] = useState('');
  const [bmrHeight, setBmrHeight] = useState('');
  const [bmrAge, setBmrAge] = useState('');
  const [bmrActivity, setBmrActivity] = useState('1.2');
  const [bmrResult, setBmrResult] = useState<{bmr: number, tdee: number, interpretation: string} | null>(null);

  const [periodLastDate, setPeriodLastDate] = useState('');
  const [periodCycle, setPeriodCycle] = useState('28');
  const [periodResult, setPeriodResult] = useState<{nextPeriod: string, fertileStart: string, fertileEnd: string, ovulation: string} | null>(null);

  const [waterWeight, setWaterWeight] = useState('');
  const [waterActivity, setWaterActivity] = useState('');
  const [waterResult, setWaterResult] = useState<number | null>(null);

  const [heartAge, setHeartAge] = useState('');
  const [heartGender, setHeartGender] = useState<'male' | 'female'>('male');
  const [heartRace, setHeartRace] = useState<'other' | 'aa'>('other'); 
  const [heartSmoker, setHeartSmoker] = useState(false);
  const [heartDiabetes, setHeartDiabetes] = useState(false);
  const [heartTreated, setHeartTreated] = useState(false); 
  const [heartBP, setHeartBP] = useState(''); 
  const [heartChol, setHeartChol] = useState(''); 
  const [heartHDL, setHeartHDL] = useState(''); 
  const [heartResult, setHeartResult] = useState<{risk: number, category: string, color: string, recommendation: string} | null>(null);

  const [phq9Answers, setPhq9Answers] = useState<number[]>(Array(9).fill(0));
  const [phq9Result, setPhq9Result] = useState<{score: number, severity: string, color: string, recommendation: string} | null>(null);

  const handleBackToMenu = () => {
    setActiveTool('menu');
    setBmiWeight('');
    setBmiHeight('');
    setBmiResult(null);
    setBmrGender('male');
    setBmrWeight('');
    setBmrHeight('');
    setBmrAge('');
    setBmrActivity('1.2');
    setBmrResult(null);
    setPeriodLastDate('');
    setPeriodCycle('28');
    setPeriodResult(null);
    setWaterWeight('');
    setWaterActivity('');
    setWaterResult(null);
    setHeartAge('');
    setHeartGender('male');
    setHeartRace('other');
    setHeartSmoker(false);
    setHeartDiabetes(false);
    setHeartTreated(false);
    setHeartBP('');
    setHeartChol('');
    setHeartHDL('');
    setHeartResult(null);
    setPhq9Answers(Array(9).fill(0));
    setPhq9Result(null);
  };

  const Disclaimer = () => (
    <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
        <Info className="text-amber-500 shrink-0 mt-0.5" size={16} />
        <p className="text-[10px] font-bold text-amber-700 leading-relaxed italic">
            Disclaimer: Hasil kalkulasi ini hanyalah estimasi matematis dan mungkin tidak akurat. Selalu konsultasikan dengan dokter atau tenaga kesehatan profesional untuk diagnosis dan saran medis yang tepat.
        </p>
    </div>
  );

  const calculateBMI = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(bmiWeight);
    const h = parseFloat(bmiHeight) / 100; 
    if (w && h) {
        const bmi = w / (h * h);
        let cat = '', col = '', rec = '';
        
        if (bmi < 18.5) { 
            cat = 'Kekurangan Berat Badan (Underweight)'; 
            col = 'text-blue-600 bg-blue-50'; 
            rec = 'Tingkatkan asupan kalori dengan makanan padat nutrisi (protein, lemak sehat). Makan lebih sering dalam porsi kecil dan tambahkan latihan kekuatan otot.';
        } else if (bmi < 25) { 
            cat = 'Normal (Ideal)'; 
            col = 'text-emerald-600 bg-emerald-50'; 
            rec = 'Pertahankan pola makan gizi seimbang dan rutin berolahraga minimal 150 menit per minggu untuk menjaga kesehatan jantung dan metabolisme.';
        } else if (bmi < 30) { 
            cat = 'Kelebihan Berat Badan (Overweight)'; 
            col = 'text-orange-600 bg-orange-50'; 
            rec = 'Disarankan menurunkan berat badan secara bertahap. Kurangi asupan gula dan lemak jenuh, serta tingkatkan aktivitas kardiovaskular (jalan cepat, lari, renang).';
        } else { 
            cat = 'Obesitas'; 
            col = 'text-red-600 bg-red-50'; 
            rec = 'Sangat disarankan berkonsultasi dengan dokter gizi. Fokus pada defisit kalori terukur dan olahraga low-impact (sepeda, berenang) untuk melindungi sendi.';
        }
        setBmiResult({ value: bmi, category: cat, color: col, recommendation: rec });
    }
  };

  const calculateBMR = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(bmrWeight);
    const h = parseFloat(bmrHeight);
    const a = parseFloat(bmrAge);
    const act = parseFloat(bmrActivity);
    
    if (w && h && a) {
        let base = (10 * w) + (6.25 * h) - (5 * a);
        if (bmrGender === 'male') base += 5;
        else base -= 161;
        
        const tdee = Math.round(base * act);
        const bmr = Math.round(base);

        const interpret = `
          <b>BMR (${bmr} kkal):</b> Energi minimal yang dibakar tubuh Anda hanya untuk bernapas dan fungsi organ vital (tidur seharian).<br/><br/>
          <b>TDEE (${tdee} kkal):</b> Estimasi total energi yang Anda bakar sehari-hari dengan tingkat aktivitas saat ini. Ini adalah batas kalori untuk <b>mempertahankan</b> berat badan.<br/><br/>
          <b>Rekomendasi:</b><br/>
          • Turun Berat: Targetkan ~${tdee - 500} kkal/hari.<br/>
          • Naik Berat: Targetkan ~${tdee + 500} kkal/hari.
        `;

        setBmrResult({ bmr, tdee, interpretation: interpret });
    }
  };

  const calculatePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (periodLastDate && periodCycle) {
        const last = new Date(periodLastDate);
        const cycle = parseInt(periodCycle);
        const next = new Date(last);
        next.setDate(last.getDate() + cycle);
        const ovulation = new Date(next);
        ovulation.setDate(next.getDate() - 14);
        const fertileStart = new Date(ovulation);
        fertileStart.setDate(ovulation.getDate() - 5);
        const fertileEnd = new Date(ovulation);
        fertileEnd.setDate(ovulation.getDate() + 1); 
        const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
        const langCode = language === 'ID' ? 'id-ID' : 'en-US';
        setPeriodResult({
            nextPeriod: next.toLocaleDateString(langCode, opts),
            ovulation: ovulation.toLocaleDateString(langCode, opts),
            fertileStart: fertileStart.toLocaleDateString(langCode, opts),
            fertileEnd: fertileEnd.toLocaleDateString(langCode, opts)
        });
    }
  };

  const calculateWater = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(waterWeight);
    const act = parseFloat(waterActivity) || 0;
    if (w) {
        let liters = (w * 0.033) + ((act / 30) * 0.35);
        setWaterResult(parseFloat(liters.toFixed(2)));
    }
  };

  const calculateASCVD = (e: React.FormEvent) => {
    e.preventDefault();
    const age = parseInt(heartAge);
    const totChol = parseFloat(heartChol);
    const hdl = parseFloat(heartHDL);
    const sysBP = parseFloat(heartBP);
    const isMale = heartGender === 'male';
    const isAA = heartRace === 'aa'; 
    if (!age || !totChol || !hdl || !sysBP) return;
    if (age < 20 || age > 99) {
        alert("Kalkulator ASCVD pada aplikasi ini mendukung rentang usia 20 - 99 tahun.");
        return;
    }
    const lnAge = Math.log(age);
    const lnTot = Math.log(totChol);
    const lnHdl = Math.log(hdl);
    const lnSbp = Math.log(sysBP);
    let sum = 0;
    if (isAA) {
        if (!isMale) { 
            const coeffs = {
                lnAge: 17.114, lnAgeSq: 0, lnTot: 0.940, lnAgeTot: 0, 
                lnHdl: -18.920, lnAgeHdl: 4.475, lnSbpTrt: 29.291, lnSbpTrtAge: -6.432,
                lnSbpUntrt: 27.820, lnSbpUntrtAge: -6.087, smoker: 0.691, diabetes: 0.874,
                mean: 86.61, baseline: 0.9533
            };
            sum = (coeffs.lnAge * lnAge) + (coeffs.lnTot * lnTot) + (coeffs.lnHdl * lnHdl) + (coeffs.lnAgeHdl * lnAge * lnHdl);
            if (heartTreated) sum += (coeffs.lnSbpTrt * lnSbp) + (coeffs.lnSbpTrtAge * lnSbp * lnAge);
            else sum += (coeffs.lnSbpUntrt * lnSbp) + (coeffs.lnSbpUntrtAge * lnSbp * lnAge);
            if (heartSmoker) sum += coeffs.smoker;
            if (heartDiabetes) sum += coeffs.diabetes;
            sum = sum - coeffs.mean; 
            const risk = 1 - Math.pow(coeffs.baseline, Math.exp(sum));
            setHeartResult(processRisk(risk * 100, age));
        } else { 
            const coeffs = {
                lnAge: 2.469, lnTot: 0.302, lnHdl: -0.307, lnSbpTrt: 1.916, lnSbpUntrt: 1.809,
                smoker: 0.549, diabetes: 0.645, mean: 19.54, baseline: 0.8954
            };
            sum = (coeffs.lnAge * lnAge) + (coeffs.lnTot * lnTot) + (coeffs.lnHdl * lnHdl);
            if (heartTreated) sum += (coeffs.lnSbpTrt * lnSbp);
            else sum += (coeffs.lnSbpUntrt * lnSbp);
            if (heartSmoker) sum += coeffs.smoker;
            if (heartDiabetes) sum += coeffs.diabetes;
            sum = sum - coeffs.mean;
            const risk = 1 - Math.pow(coeffs.baseline, Math.exp(sum));
            setHeartResult(processRisk(risk * 100, age));
        }
    } else { 
        if (!isMale) { 
            const coeffs = {
                lnAge: -29.799, lnAgeSq: 4.884, lnTot: 13.540, lnAgeTot: -3.114,
                lnHdl: -13.578, lnAgeHdl: 3.149, lnSbpTrt: 2.019, lnSbpUntrt: 1.957,
                smoker: 7.574, lnAgeSmoker: -1.665, diabetes: 0.661,
                mean: -29.18, baseline: 0.9665
            };
            sum = (coeffs.lnAge * lnAge) + (coeffs.lnAgeSq * Math.pow(lnAge, 2)) + (coeffs.lnTot * lnTot) + (coeffs.lnAgeTot * lnAge * lnTot) +
                  (coeffs.lnHdl * lnHdl) + (coeffs.lnAgeHdl * lnAge * lnHdl);
            if (heartTreated) sum += (coeffs.lnSbpTrt * lnSbp);
            else sum += (coeffs.lnSbpUntrt * lnSbp);
            if (heartSmoker) sum += (coeffs.smoker + (coeffs.lnAgeSmoker * lnAge));
            if (heartDiabetes) sum += coeffs.diabetes;
            sum = sum - coeffs.mean;
            const risk = 1 - Math.pow(coeffs.baseline, Math.exp(sum));
            setHeartResult(processRisk(risk * 100, age));
        } else { 
            const coeffs = {
                lnAge: 12.344, lnTot: 11.853, lnAgeTot: -2.664, lnHdl: -7.990, lnAgeHdl: 1.769,
                lnSbpTrt: 1.797, lnSbpUntrt: 1.764, smoker: 7.837, lnAgeSmoker: -1.795, diabetes: 0.658,
                mean: 61.18, baseline: 0.9144
            };
            sum = (coeffs.lnAge * lnAge) + (coeffs.lnTot * lnTot) + (coeffs.lnAgeTot * lnAge * lnTot) +
                  (coeffs.lnHdl * lnHdl) + (coeffs.lnAgeHdl * lnAge * lnHdl);
            if (heartTreated) sum += (coeffs.lnSbpTrt * lnSbp);
            else sum += (coeffs.lnSbpUntrt * lnSbp);
            if (heartSmoker) sum += (coeffs.smoker + (coeffs.lnAgeSmoker * lnAge));
            if (heartDiabetes) sum += coeffs.diabetes;
            sum = sum - coeffs.mean;
            const risk = 1 - Math.pow(coeffs.baseline, Math.exp(sum));
            setHeartResult(processRisk(risk * 100, age));
        }
    }
  };

  const processRisk = (risk: number, age: number) => {
    let cat = '', col = '', rec = '';
    if (risk < 5) { 
        cat = 'Risiko Rendah (<5%)'; 
        col = 'text-emerald-600 bg-emerald-50'; 
        rec = 'Gaya hidup sehat adalah kunci. Evaluasi ulang risiko setiap 4-6 tahun.';
    } else if (risk < 7.5) { 
        cat = 'Risiko Batas (5-7.4%)'; 
        col = 'text-blue-600 bg-blue-50'; 
        rec = 'Pertimbangkan perubahan gaya hidup moderat. Diskusikan dengan dokter mengenai manfaat statin intensitas sedang jika ada faktor risiko lain.';
    } else if (risk < 20) { 
        cat = 'Risiko Menengah (7.5-19.9%)'; 
        col = 'text-orange-600 bg-orange-50'; 
        rec = 'Rekomendasi kuat untuk inisiasi statin intensitas sedang. Perbaiki pola makan dan olahraga rutin untuk menurunkan risiko.';
    } else { 
        cat = 'Risiko Tinggi (≥20%)'; 
        col = 'text-red-600 bg-red-50'; 
        rec = 'Sangat disarankan inisiasi statin intensitas tinggi. Kontrol ketat tekanan darah dan kolesterol diperlukan. Konsultasi dokter segera.';
    }
    if (age < 40) {
        rec = `<b>Catatan Usia Muda (${age} Thn):</b> Untuk usia < 40 tahun, skor ini mungkin meremehkan risiko seumur hidup (Lifetime Risk). Fokuslah pada pencegahan dini dan gaya hidup sehat.<br/><br/>` + rec;
    } else if (age > 79) {
        rec = `<b>Catatan Usia Lanjut (${age} Thn):</b> Untuk usia > 79 tahun, keputusan pengobatan harus mempertimbangkan kondisi kesehatan secara menyeluruh (komorbiditas), bukan hanya skor ini.<br/><br/>` + rec;
    }
    return { risk: parseFloat(risk.toFixed(1)), category: cat, color: col, recommendation: rec };
  };

  const calculatePHQ9 = () => {
    const score = phq9Answers.reduce((a, b) => a + b, 0);
    let severity = '', col = '', rec = '';
    if (score <= 4) { 
        severity = 'Minimal / Tidak Ada Depresi'; 
        col = 'text-emerald-600 bg-emerald-50'; 
        rec = 'Kondisi mental stabil. Jaga kesehatan mental dengan istirahat cukup dan manajemen stres.';
    } else if (score <= 9) { 
        severity = 'Depresi Ringan'; 
        col = 'text-blue-600 bg-blue-50'; 
        rec = 'Pantau gejala Anda. Lakukan aktivitas yang menyenangkan (self-care) dan olahraga.';
    } else if (score <= 14) { 
        severity = 'Depresi Sedang'; 
        col = 'text-orange-600 bg-orange-50'; 
        rec = 'Pertimbangkan untuk berkonsultasi dengan psikolog/konselor jika gejala mengganggu aktivitas harian.';
    } else if (score <= 19) { 
        severity = 'Depresi Sedang Berat'; 
        col = 'text-rose-600 bg-rose-50'; 
        rec = 'Disarankan segera mencari bantuan profesional (Psikiater/Psikolog) untuk evaluasi lebih lanjut.';
    } else { 
        severity = 'Depresi Berat'; 
        col = 'text-red-600 bg-red-50'; 
        rec = 'Sangat disarankan segera ke fasilitas kesehatan mental atau profesional terdekat.';
    }
    setPhq9Result({ score, severity, color: col, recommendation: rec });
  };

  const CalculatorCard = ({ id, icon: Icon, title, desc, color }: any) => (
    <button onClick={() => setActiveTool(id)} className="group p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left flex flex-col items-start h-full">
        <div className={`p-4 rounded-2xl mb-4 ${color} transition-colors group-hover:scale-110`}>
            <Icon size={32} />
        </div>
        <h3 className="text-lg font-black text-slate-800 mb-2 leading-tight">{title}</h3>
        <p className="text-xs font-medium text-slate-400">{desc}</p>
        <div className="mt-auto pt-6 w-full flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-300 group-hover:text-blue-600 transition-colors">
            <span>Buka Alat</span>
            <ArrowRight size={14} />
        </div>
    </button>
  );

  const Header = ({ title }: { title: string }) => (
    <div className="flex items-center gap-4 mb-8">
        <button onClick={handleBackToMenu} className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors">
            <ChevronLeft size={24} className="text-slate-600" />
        </button>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{title}</h2>
    </div>
  );

  const ResultBox = ({ children, colorClass }: any) => (
    <div className={`mt-8 p-8 rounded-[2rem] text-center animate-fadeIn ${colorClass}`}>
        {children}
    </div>
  );

  if (activeTool === 'menu') {
    return (
        <div className="animate-fadeIn pb-24">
            <div className="mb-8">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Kalkulator Kesehatan</h2>
                <p className="text-slate-500 font-medium italic mt-1">Alat bantu hitung kesehatan</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <CalculatorCard id="bmi" icon={Scale} title="Indeks Massa Tubuh (BMI)" desc="Cek status berat badan & rekomendasi diet." color="bg-blue-50 text-blue-600" />
                <CalculatorCard id="bmr" icon={Activity} title="Kalori Harian (BMR & TDEE)" desc="Hitung kebutuhan energi untuk target BB." color="bg-orange-50 text-orange-600" />
                <CalculatorCard id="period" icon={Calendar} title="Siklus Menstruasi" desc="Estimasi haid berikutnya & masa subur." color="bg-rose-50 text-rose-600" />
                <CalculatorCard id="water" icon={Droplets} title="Kebutuhan Air (Hidrasi)" desc="Target minum harian berdasarkan berat." color="bg-cyan-50 text-cyan-600" />
                <CalculatorCard id="ascvd" icon={HeartPulse} title="Risiko Jantung ASCVD" desc="PCE Score (Akurasi Tinggi) risiko 10 tahun." color="bg-red-50 text-red-600" />
                <CalculatorCard id="phq9" icon={Brain} title="Skrining Depresi (PHQ-9)" desc="Kuesioner standar deteksi kecemasan." color="bg-indigo-50 text-indigo-600" />
            </div>
        </div>
    );
  }

  if (activeTool === 'bmi') {
      return (
          <div className="max-w-lg mx-auto animate-fadeIn pb-24">
              <Header title="Kalkulator BMI" />
              <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
                  <form onSubmit={calculateBMI} className="space-y-6">
                      <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Berat Badan (kg)</label><input type="number" value={bmiWeight} onChange={(e) => setBmiWeight(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" placeholder="Mis: 65" required /></div>
                      <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tinggi Badan (cm)</label><input type="number" value={bmiHeight} onChange={(e) => setBmiHeight(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" placeholder="Mis: 170" required /></div>
                      <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Hitung BMI</button>
                  </form>
                  {bmiResult && (
                      <div className="mt-8 space-y-4">
                          <ResultBox colorClass={bmiResult.color}>
                              <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-2">Hasil BMI Anda</p>
                              <p className="text-5xl font-black mb-2">{bmiResult.value.toFixed(1)}</p>
                              <p className="text-lg font-bold">{bmiResult.category}</p>
                          </ResultBox>
                          <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 text-slate-600 text-sm font-medium leading-relaxed">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Rekomendasi Medis</p>
                              {bmiResult.recommendation}
                          </div>
                      </div>
                  )}
                  <Disclaimer />
              </div>
          </div>
      );
  }

  if (activeTool === 'bmr') {
      return (
          <div className="max-w-lg mx-auto animate-fadeIn pb-24">
              <Header title="Kalkulator BMR & TDEE" />
              <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
                  <form onSubmit={calculateBMR} className="space-y-6">
                      <div className="flex gap-4 p-1 bg-slate-100 rounded-2xl">
                          {['male', 'female'].map(g => (
                              <button key={g} type="button" onClick={() => setBmrGender(g as any)} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase ${bmrGender === g ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>{g === 'male' ? 'Laki-laki' : 'Perempuan'}</button>
                          ))}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Usia</label><input type="number" value={bmrAge} onChange={(e) => setBmrAge(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-center" required /></div>
                          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Berat (kg)</label><input type="number" value={bmrWeight} onChange={(e) => setBmrWeight(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-center" required /></div>
                      </div>
                      <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Tinggi (cm)</label><input type="number" value={bmrHeight} onChange={(e) => setBmrHeight(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-center" required /></div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Aktivitas Fisik</label>
                          <select value={bmrActivity} onChange={(e) => setBmrActivity(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm">
                              <option value="1.2">Sedenter (Jarang Olahraga)</option>
                              <option value="1.375">Ringan (1-3x seminggu)</option>
                              <option value="1.55">Sedang (3-5x seminggu)</option>
                              <option value="1.725">Berat (6-7x seminggu)</option>
                              <option value="1.9">Ekstra (Fisik Berat/Atlet)</option>
                          </select>
                      </div>
                      <button type="submit" className="w-full py-5 bg-orange-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Hitung Kalori</button>
                  </form>
                  {bmrResult && (
                      <div className="mt-8 space-y-4">
                          <ResultBox colorClass="bg-orange-50 text-orange-800">
                              <div className="grid grid-cols-2 gap-8">
                                  <div>
                                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">BMR (Basal)</p>
                                      <p className="text-3xl font-black">{bmrResult.bmr}</p>
                                      <p className="text-[10px] font-bold">kkal/hari</p>
                                  </div>
                                  <div>
                                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">TDEE (Total)</p>
                                      <p className="text-3xl font-black">{bmrResult.tdee}</p>
                                      <p className="text-[10px] font-bold">kkal/hari</p>
                                  </div>
                              </div>
                          </ResultBox>
                          <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 text-slate-600 text-sm font-medium leading-relaxed">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Interpretasi & Saran</p>
                              <div dangerouslySetInnerHTML={{ __html: bmrResult.interpretation }} />
                          </div>
                      </div>
                  )}
                  <Disclaimer />
              </div>
          </div>
      );
  }

  if (activeTool === 'period') {
      return (
          <div className="max-w-lg mx-auto animate-fadeIn pb-24">
              <Header title="Kalkulator Haid" />
              <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
                  <form onSubmit={calculatePeriod} className="space-y-6">
                      <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Hari Pertama Haid Terakhir</label><input type="date" value={periodLastDate} onChange={(e) => setPeriodLastDate(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" required /></div>
                      <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Rata-rata Siklus (Hari)</label><input type="number" value={periodCycle} onChange={(e) => setPeriodCycle(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" placeholder="28" required /></div>
                      <button type="submit" className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Hitung Siklus</button>
                  </form>
                  {periodResult && (
                      <div className="mt-8 space-y-4">
                          <div className="p-6 bg-rose-50 rounded-3xl border border-rose-100 text-center">
                              <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">Haid Berikutnya</p>
                              <p className="text-2xl font-black text-rose-700">{periodResult.nextPeriod}</p>
                          </div>
                          <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100 text-center">
                              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Masa Subur</p>
                              <p className="text-lg font-black text-indigo-700">{periodResult.fertileStart} - {periodResult.fertileEnd}</p>
                              <p className="text-xs font-bold text-indigo-500 mt-1">Ovulasi: {periodResult.ovulation}</p>
                          </div>
                      </div>
                  )}
                  <Disclaimer />
              </div>
          </div>
      );
  }

  if (activeTool === 'water') {
      return (
          <div className="max-w-lg mx-auto animate-fadeIn pb-24">
              <Header title="Kalkulator Hidrasi" />
              <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
                  <form onSubmit={calculateWater} className="space-y-6">
                      <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Berat Badan (kg)</label><input type="number" value={waterWeight} onChange={(e) => setWaterWeight(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" required /></div>
                      <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Durasi Olahraga (Menit)</label><input type="number" value={waterActivity} onChange={(e) => setWaterActivity(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" placeholder="0" /></div>
                      <button type="submit" className="w-full py-5 bg-cyan-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Hitung Kebutuhan Air</button>
                  </form>
                  {waterResult && (
                      <ResultBox colorClass="bg-cyan-50 text-cyan-700">
                          <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-2">Target Harian</p>
                          <p className="text-5xl font-black mb-2">{waterResult} <span className="text-lg">Liter</span></p>
                          <p className="text-xs font-bold">Atau setara ±{Math.round(waterResult * 4.2)} gelas air (240ml)</p>
                      </ResultBox>
                  )}
                  <Disclaimer />
              </div>
          </div>
      );
  }

  if (activeTool === 'ascvd') {
      return (
          <div className="max-w-lg mx-auto animate-fadeIn pb-24">
              <Header title="Estimasi Risiko Jantung (ASCVD)" />
              <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
                  <div className="mb-6 p-4 bg-blue-50 rounded-2xl text-[10px] font-bold text-blue-700 leading-relaxed">
                     Metode: Pooled Cohort Equations (2013 ACC/AHA). Akurasi standar medis untuk estimasi risiko 10 tahun (Stroke/Serangan Jantung).
                  </div>
                  <form onSubmit={calculateASCVD} className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Jenis Kelamin</label>
                              <select value={heartGender} onChange={(e) => setHeartGender(e.target.value as any)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm">
                                  <option value="male">Laki-laki</option>
                                  <option value="female">Perempuan</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Ras</label>
                              <select value={heartRace} onChange={(e) => setHeartRace(e.target.value as any)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm">
                                  <option value="other">Asia / Lainnya / White</option>
                                  <option value="aa">Afrika Amerika</option>
                              </select>
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Usia (20-99)</label><input type="number" value={heartAge} onChange={(e) => setHeartAge(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold" required /></div>
                          <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Sistolik (mmHg)</label><input type="number" value={heartBP} onChange={(e) => setHeartBP(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold" placeholder="120" required /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Total Kolesterol</label><input type="number" value={heartChol} onChange={(e) => setHeartChol(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold" placeholder="mg/dL" required /></div>
                          <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-2">HDL Kolesterol</label><input type="number" value={heartHDL} onChange={(e) => setHeartHDL(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold" placeholder="mg/dL" required /></div>
                      </div>
                      <div className="flex flex-col gap-3 pt-2">
                          <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                              <input type="checkbox" checked={heartTreated} onChange={(e) => setHeartTreated(e.target.checked)} className="w-5 h-5 rounded text-blue-600 focus:ring-0" />
                              <span className="text-xs font-bold text-slate-700">Sedang Pengobatan Hipertensi?</span>
                          </label>
                          <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                              <input type="checkbox" checked={heartSmoker} onChange={(e) => setHeartSmoker(e.target.checked)} className="w-5 h-5 rounded text-red-600 focus:ring-0" />
                              <span className="text-xs font-bold text-slate-700">Perokok Aktif?</span>
                          </label>
                          <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                              <input type="checkbox" checked={heartDiabetes} onChange={(e) => setHeartDiabetes(e.target.checked)} className="w-5 h-5 rounded text-red-600 focus:ring-0" />
                              <span className="text-xs font-bold text-slate-700">Diabetes?</span>
                          </label>
                      </div>
                      <button type="submit" className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Estimasi Risiko</button>
                  </form>
                  {heartResult && (
                      <div className="mt-8 space-y-4">
                          <ResultBox colorClass={heartResult.color}>
                              <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-2">Risiko 10 Tahun</p>
                              <p className="text-5xl font-black mb-2">{heartResult.risk}%</p>
                              <p className="text-lg font-bold">{heartResult.category}</p>
                          </ResultBox>
                          <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 text-slate-600 text-sm font-medium leading-relaxed">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Rekomendasi Medis (ACC/AHA)</p>
                              <div dangerouslySetInnerHTML={{ __html: heartResult.recommendation }} />
                          </div>
                      </div>
                  )}
                  <Disclaimer />
              </div>
          </div>
      );
  }

  if (activeTool === 'phq9') {
      const questions = [
          "Kurang berminat atau bergairah dalam melakukan apapun",
          "Merasa murung, sedih, atau putus asa",
          "Sulit tidur/mudah terbangun, atau terlalu banyak tidur",
          "Merasa lelah atau kurang bertenaga",
          "Kurang nafsu makan atau terlalu banyak makan",
          "Kurang percaya diri — merasa diri buruk atau mengecewakan",
          "Sulit berkonsentrasi pada sesuatu, misalnya membaca koran/menonton TV",
          "Bergerak/berbicara sangat lambat atau sebaliknya sangat gelisah",
          "Pemikiran untuk menyakiti diri sendiri atau ingin mati"
      ];

      return (
          <div className="max-w-2xl mx-auto animate-fadeIn pb-24">
              <Header title="Skrining Depresi (PHQ-9)" />
              <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-sm border border-slate-100">
                  <div className="mb-8 text-center">
                      <p className="text-sm text-slate-500 font-medium">Dalam 2 minggu terakhir, seberapa sering Anda terganggu oleh masalah berikut?</p>
                  </div>
                  
                  <div className="space-y-8">
                      {questions.map((q, idx) => (
                          <div key={idx} className="space-y-3">
                              <p className="font-bold text-slate-800 text-sm">{idx + 1}. {q}</p>
                              <div className="grid grid-cols-4 gap-2">
                                  {[0, 1, 2, 3].map(val => (
                                      <button 
                                          key={val}
                                          onClick={() => {
                                              const newAnswers = [...phq9Answers];
                                              newAnswers[idx] = val;
                                              setPhq9Answers(newAnswers);
                                          }}
                                          className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
                                              phq9Answers[idx] === val 
                                              ? 'bg-indigo-600 text-white shadow-lg' 
                                              : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                          }`}
                                      >
                                          {val === 0 ? 'Tidak' : val === 1 ? 'Beberapa Hari' : val === 2 ? '> Separuh Waktu' : 'Hampir Setiap Hari'}
                                      </button>
                                  ))}
                              </div>
                          </div>
                      ))}
                  </div>
                  <button onClick={calculatePHQ9} className="w-full mt-10 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Lihat Hasil Skrining</button>
                  {phq9Result && (
                      <div className="mt-8 space-y-4">
                          <ResultBox colorClass={phq9Result.color}>
                              <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-2">Skor PHQ-9</p>
                              <p className="text-5xl font-black mb-2">{phq9Result.score}</p>
                              <p className="text-lg font-bold">{phq9Result.severity}</p>
                          </ResultBox>
                          <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 text-slate-600 text-sm font-medium leading-relaxed">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Rekomendasi</p>
                              {phq9Result.recommendation}
                          </div>
                      </div>
                  )}
                  <Disclaimer />
              </div>
          </div>
      );
  }
  return null;
};

export default CalculatorView;
