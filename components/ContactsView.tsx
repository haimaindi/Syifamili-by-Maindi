
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Phone, MapPin, ExternalLink, Plus, Search, X, Navigation, Hospital, Trash2, PhoneCall, Edit2, Eye, Info, ChevronLeft, Map, CheckCircle2, Loader2, Crosshair, Locate, AlertTriangle, StopCircle, Signal, Search as SearchIcon, Satellite, User, MousePointer2, Wifi, MessageCircle } from 'lucide-react';
import { HealthContact, Language } from '../types';
import { useTranslation } from '../translations';
import { findPlaceAttributes } from '../services/geminiService';
import ConfirmationModal from './ConfirmationModal';

// Declare Leaflet global
declare const L: any;

interface ContactsViewProps {
  contacts: HealthContact[];
  language: Language;
  onAddContact: (contact: HealthContact) => void;
  onUpdateContact: (contact: HealthContact) => void;
  onDeleteContact: (id: string) => void;
}

const ContactsView: React.FC<ContactsViewProps> = ({ contacts, language, onAddContact, onUpdateContact, onDeleteContact }) => {
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'detail'>('list');
  const [editingContact, setEditingContact] = useState<HealthContact | null>(null);
  const [viewingContact, setViewingContact] = useState<HealthContact | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [formAddress, setFormAddress] = useState('');
  const [formGmapsUrl, setFormGmapsUrl] = useState('');
  const [formLat, setFormLat] = useState<number | string>('');
  const [formLng, setFormLng] = useState<number | string>('');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<string | null>(null);
  
  // Geolocation & Map Search State
  const [isLocating, setIsLocating] = useState(false);
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  
  // User Device Location State (The "Blue Dot")
  const [userPos, setUserPos] = useState<{lat: number, lng: number, acc: number} | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  
  // Markers
  const redPinRef = useRef<any>(null); // The selected location (Target)
  const blueDotRef = useRef<any>(null); // The device location (Me)
  const blueCircleRef = useRef<any>(null); // Accuracy circle

  // Delete Confirmation
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const t = useTranslation(language);

  // Helper untuk Link WA
  const getWaLink = (phone: string) => {
    let p = phone.replace(/\D/g, '');
    if (p.startsWith('0')) {
        p = '62' + p.slice(1);
    }
    return `https://wa.me/${p}`;
  };

  // --- MAP LOGIC ---
  useEffect(() => {
    if (viewMode === 'form' && mapContainerRef.current && !mapInstanceRef.current) {
      // 1. Determine Initial Center
      // Default Jakarta Coordinates if nothing set
      let initialLat = typeof editingContact?.latitude === 'number' ? editingContact.latitude : -6.2088;
      let initialLng = typeof editingContact?.longitude === 'number' ? editingContact.longitude : 106.8456;
      let initialZoom = (typeof editingContact?.latitude === 'number') ? 16 : 12;

      // Initialize Map
      try {
        mapInstanceRef.current = L.map(mapContainerRef.current).setView([initialLat, initialLng], initialZoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapInstanceRef.current);

        // --- RED PIN (Target Location) ---
        const redIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="background-color: #ef4444; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.4); position: relative;"><div style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); width: 2px; height: 6px; background: #ef4444;"></div></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 24]
        });

        redPinRef.current = L.marker([initialLat, initialLng], { icon: redIcon, draggable: true, zIndexOffset: 1000 }).addTo(mapInstanceRef.current);

        // Drag Event
        redPinRef.current.on('dragend', function (e: any) {
          const position = redPinRef.current.getLatLng();
          updateFormLocation(position.lat, position.lng);
        });

        // Map Click Event
        mapInstanceRef.current.on('click', function(e: any) {
          redPinRef.current.setLatLng(e.latlng);
          updateFormLocation(e.latlng.lat, e.latlng.lng);
        });

        // If editing existing, populate form
        if (editingContact) {
          setFormLat(editingContact.latitude || '');
          setFormLng(editingContact.longitude || '');
        } else {
          // --- NEW: AUTO DETECT CURRENT LOCATION (HERE) FOR NEW ENTRIES ---
          startLocationWatch(true, true); // true = auto center, true = try High Accuracy first
        }

      } catch (err) {
        console.error("Map initialization failed", err);
      }
    }

    return () => {
      stopLocating(); 
      if (viewMode !== 'form' && mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        redPinRef.current = null;
        blueDotRef.current = null;
        blueCircleRef.current = null;
      }
    };
  }, [viewMode]);

  const updateFormLocation = async (lat: number, lng: number) => {
    setFormLat(lat);
    setFormLng(lng);
    setFormGmapsUrl(`https://maps.google.com/?q=${lat},${lng}`);
    
    // Auto Update Address (Reverse Geocoding)
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      if (data && data.display_name) {
        setFormAddress(data.display_name);
      }
    } catch (e) {
      console.error("Reverse geocoding failed", e);
    }
  };

  // --- DEVICE GEOLOCATION (Blue Dot) ---
  // Strategy: Try High Accuracy (GPS) with long timeout (20s). If fails, Fallback to Low Accuracy (WiFi).
  const startLocationWatch = (autoCenter: boolean = false, useHighAccuracy: boolean = true) => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation tidak didukung browser ini.");
      return;
    }

    // Reset status only on new High Accuracy attempt
    if (useHighAccuracy) {
      setIsLocating(true);
      setLocationError(null);
      setLocationAccuracy("Mencari GPS...");
    }

    // Clean up existing watch if any
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Options Strategy:
    // High Accuracy: 20s Timeout (Force GPS attempt). 
    // Low Accuracy: 10s Timeout (Quick WiFi lookup).
    const geoOptions = {
        enableHighAccuracy: useHighAccuracy,
        timeout: useHighAccuracy ? 20000 : 10000, 
        maximumAge: 0
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setUserPos({ lat: latitude, lng: longitude, acc: accuracy });

        // FIX: Always stop spinning on first data received, regardless of accuracy.
        // The watch continues in background to refine it.
        setIsLocating(false);

        // Logic Akurasi & UI Status
        let accuracyStatus = "Tinggi (GPS)";
        let zoomLevel = 18;
        
        if (accuracy > 100) {
            // Signal found but weak
            accuracyStatus = "Sinyal Lemah (Menunggu perbaikan...)";
            zoomLevel = 15;
        } else if (accuracy > 50) {
            accuracyStatus = "Sedang";
            zoomLevel = 16;
        }
        
        setLocationAccuracy(accuracyStatus);

        if (mapInstanceRef.current) {
          // Create/Update Blue Dot
          if (!blueDotRef.current) {
             const blueIcon = L.divIcon({
                className: 'user-location-icon',
                html: `<div style="width: 14px; height: 14px; background-color: #3b82f6; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);"></div>`,
                iconSize: [18, 18],
                iconAnchor: [9, 9]
             });
             blueDotRef.current = L.marker([latitude, longitude], { icon: blueIcon, zIndexOffset: 500 }).addTo(mapInstanceRef.current);
             blueDotRef.current.bindPopup(`Lokasi Anda (Akurasi ±${Math.round(accuracy)}m)`).openPopup();
          } else {
             blueDotRef.current.setLatLng([latitude, longitude]);
          }

          // Create/Update Accuracy Circle
          if (!blueCircleRef.current) {
             blueCircleRef.current = L.circle([latitude, longitude], {
                radius: accuracy,
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.1,
                weight: 1,
                dashArray: '4, 4'
             }).addTo(mapInstanceRef.current);
          } else {
             blueCircleRef.current.setLatLng([latitude, longitude]);
             blueCircleRef.current.setRadius(accuracy);
          }

          // Auto Center Logic (Only on first load or manual click)
          if (autoCenter && redPinRef.current) {
             const latLng = [latitude, longitude];
             mapInstanceRef.current.setView(latLng, zoomLevel); 
             redPinRef.current.setLatLng(latLng);
             updateFormLocation(latitude, longitude);
             
             if (accuracy > 200 && !useHighAccuracy) {
                 setLocationError("Akurasi rendah (WiFi). Geser pin manual jika perlu.");
             }
          }
        }
      },
      (err) => {
        console.warn(`Geo Watch Error (${useHighAccuracy ? 'High' : 'Low'} Acc): Code ${err.code} - ${err.message}`);
        
        // --- FALLBACK STRATEGY ---
        // Jika High Accuracy Gagal (Timeout/Unavailable), otomatis coba Low Accuracy
        // Error Code 3 = Timeout
        if (useHighAccuracy && (err.code === 3 || err.code === 2)) {
            console.log("High accuracy failed (Timeout/Unavailable), switching to Low Accuracy fallback...");
            setLocationError("GPS lemah/timeout, beralih ke Network...");
            startLocationWatch(autoCenter, false); // Recursive call with low accuracy
            return;
        }

        // Jika Low Accuracy juga gagal, atau permission ditolak, baru tampilkan error final
        if(err.code === 1) setLocationError("Izin lokasi ditolak. Aktifkan izin di browser.");
        else if(err.code === 2) setLocationError("Sinyal lokasi tidak tersedia.");
        else if(err.code === 3) setLocationError("Waktu deteksi habis (Sinyal lemah).");
        else setLocationError("Gagal mendeteksi lokasi.");
        
        setIsLocating(false);
        if (err.code === 1) stopLocating();
      },
      geoOptions
    );
  };

  const stopLocating = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsLocating(false);
  };

  // --- SNAP RED PIN TO BLUE DOT (MANUAL TRIGGER) ---
  const snapToUserLocation = () => {
    // Force re-read with High Accuracy first
    stopLocating();
    startLocationWatch(true, true);
  };

  // --- SEARCH MAP (Geocoding) ---
  const handleMapSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!mapSearchQuery.trim()) return;

    setIsSearchingMap(true);
    setLocationError(null);

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearchQuery)}&limit=1`);
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const newLat = parseFloat(lat);
        const newLng = parseFloat(lon);

        if (mapInstanceRef.current && redPinRef.current) {
          const latLng = [newLat, newLng];
          mapInstanceRef.current.setView(latLng, 17); // Zoom close for search result
          redPinRef.current.setLatLng(latLng);
          updateFormLocation(newLat, newLng);
          
          if (!formAddress) {
             setFormAddress(display_name.split(',')[0]);
          }
        }
      } else {
        setLocationError("Lokasi tidak ditemukan. Coba nama jalan atau kota.");
      }
    } catch (error) {
      setLocationError("Gagal mencari lokasi.");
    } finally {
      setIsSearchingMap(false);
    }
  };

  // ... (Standard CRUD handlers) ...
  const handleOpenForm = (contact?: HealthContact) => {
    setEditingContact(contact || null);
    setFormAddress(contact?.address || '');
    setFormGmapsUrl(contact?.gmapsUrl || '');
    setFormLat(contact?.latitude || '');
    setFormLng(contact?.longitude || '');
    setLocationError(null);
    setMapSearchQuery('');
    setUserPos(null);
    
    if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
    }
    setViewMode('form');
  };

  const handleOpenDetail = (contact: HealthContact) => {
    setViewingContact(contact);
    setViewMode('detail');
  };

  const confirmDelete = () => {
    if (deleteTargetId) {
      onDeleteContact(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  const contactTypes = [
    { value: 'Hospital', label: t.contactTypes.Hospital },
    { value: 'Clinic', label: t.contactTypes.Clinic },
    { value: 'Doctor', label: t.contactTypes.Doctor },
    { value: 'Pharmacy', label: t.contactTypes.Pharmacy },
    { value: 'Laboratory', label: t.contactTypes.Laboratory },
    { value: 'Other', label: t.contactTypes.Other }
  ];

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- FORM VIEW ---
  if (viewMode === 'form') {
    return (
      <div className="animate-fadeIn w-full mx-auto pb-24">
        <div className="flex items-center gap-4 mb-8">
           <button onClick={() => setViewMode('list')} className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors">
              <ChevronLeft size={24} className="text-slate-600" />
           </button>
           <h2 className="text-2xl font-black text-slate-800 tracking-tight">{editingContact ? 'Ubah Kontak' : 'Tambah Kontak Baru'}</h2>
        </div>

        <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
            <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const latNum = parseFloat(String(formLat));
                const lngNum = parseFloat(String(formLng));
                const contactData: HealthContact = {
                  id: editingContact?.id || Math.random().toString(36).substr(2, 9),
                  name: formData.get('name') as string,
                  type: formData.get('type') as any,
                  phone: formData.get('phone') as string,
                  address: formData.get('address') as string,
                  gmapsUrl: formData.get('gmapsUrl') as string,
                  latitude: !isNaN(latNum) ? latNum : undefined,
                  longitude: !isNaN(lngNum) ? lngNum : undefined
                };
                if (editingContact) onUpdateContact(contactData);
                else onAddContact(contactData);
                setViewMode('list');
            }} className="space-y-6">
              
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nama Faskes / Dokter</label>
                <input name="name" defaultValue={editingContact?.name} required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm shadow-sm focus:ring-4 focus:ring-blue-50 transition-all" placeholder="RS Harapan Kita" />
              </div>

              {/* MAPS INTERFACE */}
              <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 relative">
                 <div className="flex flex-col gap-3 mb-4">
                    <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2"><Map size={14} /> Tentukan Lokasi</label>
                    
                    {/* SEARCH BOX */}
                    <div className="flex gap-2 relative z-[401]">
                        <input 
                          type="text" 
                          value={mapSearchQuery} 
                          onChange={(e) => setMapSearchQuery(e.target.value)} 
                          onKeyDown={(e) => e.key === 'Enter' && handleMapSearch(e)}
                          placeholder="Cari nama gedung / jalan..." 
                          className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold shadow-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white text-slate-800 placeholder:text-slate-400"
                        />
                        <button type="button" onClick={() => handleMapSearch()} disabled={isSearchingMap} className="bg-white text-slate-500 border border-slate-200 px-3 py-2 rounded-xl hover:text-blue-600 transition-colors shadow-sm">
                           {isSearchingMap ? <Loader2 size={16} className="animate-spin"/> : <SearchIcon size={16} />}
                        </button>
                    </div>
                 </div>
                 
                 {locationError && (
                    <div className="mb-2 text-[9px] font-bold text-rose-500 flex items-center gap-1 bg-rose-50 px-3 py-2 rounded-xl border border-rose-100 animate-pulse">
                       <Wifi size={12} /> {locationError}
                    </div>
                 )}

                 <div className="w-full h-72 rounded-2xl overflow-hidden shadow-inner border border-slate-200 relative z-0 mb-4">
                    <div ref={mapContainerRef} className="w-full h-full"></div>
                    
                    {/* Floating 'Use My Location' Button */}
                    <div className="absolute bottom-4 right-4 z-[400] flex flex-col gap-2 items-end">
                       {userPos && (
                          <div className="bg-white/90 backdrop-blur px-3 py-2 rounded-xl border border-slate-200 shadow-lg mb-1 animate-fadeIn flex flex-col items-end gap-1">
                             <div className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span></span>
                                <span className="text-[9px] font-black text-slate-600 uppercase">Akurasi: ±{Math.round(userPos.acc)}m</span>
                             </div>
                             {locationAccuracy && <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${locationAccuracy.includes('GPS') ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{locationAccuracy}</span>}
                          </div>
                       )}
                       <button 
                          type="button"
                          onClick={snapToUserLocation}
                          className="bg-blue-600 text-white p-3 rounded-full shadow-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2 pr-4 border-2 border-white"
                          title="Deteksi Ulang Lokasi Saya"
                       >
                          {isLocating ? <Loader2 size={20} className="animate-spin"/> : <Locate size={20} />}
                          <span className="text-[10px] font-black uppercase tracking-widest">Lokasi Saya</span>
                       </button>
                    </div>

                    {/* Instruction Overlay */}
                    <div className="absolute top-2 left-2 right-2 flex justify-center pointer-events-none z-[400]">
                       <span className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-[8px] font-black uppercase text-slate-600 shadow-sm border border-slate-100 flex items-center gap-2">
                          <MousePointer2 size={10} /> Geser <span className="text-red-500 font-bold">Pin Merah</span> ke titik akurat
                       </span>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Latitude</label>
                       <input value={typeof formLat === 'number' ? formLat.toFixed(6) : formLat} readOnly className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none" />
                    </div>
                    <div>
                       <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Longitude</label>
                       <input value={typeof formLng === 'number' ? formLng.toFixed(6) : formLng} readOnly className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none" />
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipe</label>
                  <select name="type" defaultValue={editingContact?.type || 'Hospital'} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm shadow-sm appearance-none">
                    {contactTypes.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.phone}</label>
                  <input name="phone" defaultValue={editingContact?.phone} required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm shadow-sm" placeholder="021-xxxxxx" />
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.address}</label>
                <input name="address" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm shadow-sm" placeholder="Jl. Raya No. 123" />
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.gmapsUrl}</label>
                <input name="gmapsUrl" value={formGmapsUrl} onChange={(e) => setFormGmapsUrl(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm shadow-sm" placeholder="https://maps.google.com/..." />
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setViewMode('list')} className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs hover:bg-slate-200 transition-all">Batal</button>
                <button type="submit" className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">Simpan</button>
              </div>
            </form>
        </div>
      </div>
    );
  }

  // --- DETAIL VIEW ---
  if (viewMode === 'detail' && viewingContact) {
    return (
      <div className="animate-fadeIn w-full mx-auto space-y-8 pb-24">
        <div className="flex items-center gap-4">
           <button onClick={() => setViewMode('list')} className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors">
              <ChevronLeft size={24} className="text-slate-600" />
           </button>
           <h2 className="text-2xl font-black text-slate-800 tracking-tight">Detail Kontak</h2>
        </div>

        <div className="bg-white rounded-[3.5rem] p-10 shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-24 bg-slate-900"></div>
            
            <div className="relative pt-12 flex flex-col items-center">
                 <div className="w-24 h-24 rounded-3xl bg-white border-8 border-white shadow-2xl flex items-center justify-center text-slate-900 mb-6">
                    <Hospital size={48} />
                 </div>
                 
                 <div className="text-center mb-8">
                    <h3 className="text-3xl font-black text-slate-800 leading-tight mb-2">{viewingContact.name}</h3>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-4 py-1.5 rounded-full">{contactTypes.find(c => c.value === viewingContact.type)?.label || viewingContact.type}</span>
                 </div>

                 <div className="w-full space-y-4">
                    {/* CUSTOM PHONE ROW WITH ACTIONS */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4 shadow-inner">
                        <div className="p-3 bg-white rounded-xl shadow-sm text-slate-400 border border-slate-50"><Phone size={20} /></div>
                        <div className="flex-1">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nomor Telepon</p>
                           <p className="text-sm font-black text-slate-800 leading-relaxed mb-3">{viewingContact.phone}</p>
                           <div className="flex gap-2">
                              <a href={`tel:${viewingContact.phone}`} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-200 transition-colors">
                                 <Phone size={14} /> Panggil
                              </a>
                              <button onClick={() => window.open(getWaLink(viewingContact.phone), '_blank')} className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-200 transition-colors">
                                 <MessageCircle size={14} /> WhatsApp
                              </button>
                           </div>
                        </div>
                    </div>

                    <ContactDetail icon={MapPin} label="Alamat" value={viewingContact.address} />
                    {(typeof viewingContact.latitude === 'number' && typeof viewingContact.longitude === 'number') && (
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Peta Lokasi</p>
                           <div className="w-full h-32 bg-slate-200 rounded-xl overflow-hidden relative">
                              <iframe 
                                 width="100%" 
                                 height="100%" 
                                 frameBorder="0" 
                                 src={`https://maps.google.com/maps?q=${viewingContact.latitude},${viewingContact.longitude}&z=15&output=embed`}
                                 style={{border:0}}
                                 allowFullScreen
                              ></iframe>
                           </div>
                           <div className="flex justify-between mt-3 text-[10px] font-bold text-slate-500 uppercase">
                              <span>Lat: {viewingContact.latitude.toFixed(5)}</span>
                              <span>Lng: {viewingContact.longitude.toFixed(5)}</span>
                           </div>
                        </div>
                    )}
                 </div>

                 <div className="flex flex-col gap-3 w-full mt-8">
                    {(viewingContact.gmapsUrl || (viewingContact.latitude && viewingContact.longitude)) && (
                      <button 
                        onClick={() => {
                            let url = '';
                            if (typeof viewingContact.latitude === 'number' && typeof viewingContact.longitude === 'number') {
                                url = `https://www.google.com/maps/dir/?api=1&destination=${viewingContact.latitude},${viewingContact.longitude}`;
                            } else if (viewingContact.address) {
                                url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(viewingContact.address)}`;
                            } else {
                                url = viewingContact.gmapsUrl || '';
                            }
                            if (url) window.open(url, '_blank', 'noopener,noreferrer');
                        }} 
                        className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-blue-100 active:scale-95 transition-all"
                      >
                         <Navigation size={18} /> DIRECTION
                      </button>
                    )}
                    <button onClick={() => handleOpenForm(viewingContact)} className="w-full py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">
                       Ubah Data
                    </button>
                 </div>
            </div>
        </div>
      </div>
    );
  }

  // --- LIST VIEW ---
  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <ConfirmationModal 
        isOpen={!!deleteTargetId} 
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDelete}
        title="Hapus Kontak?"
        message="Kontak yang dihapus tidak dapat dikembalikan."
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">{t.contacts}</h2>
          <p className="text-slate-500 font-medium italic">Sentralisasi data dokter, tenaga kesehatan dan fasilitas kesehatan</p>
        </div>
        <button 
          onClick={() => handleOpenForm()}
          className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 flex items-center gap-2 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus size={20} /> {t.addContact}
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
        <input 
          type="text" 
          placeholder={language === 'ID' ? 'Cari nama faskes atau alamat...' : 'Search facility name or address...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-[2rem] shadow-sm outline-none font-medium focus:ring-4 focus:ring-blue-50 font-medium transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredContacts.length > 0 ? filteredContacts.map((contact) => (
          <div key={contact.id} className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col h-full overflow-hidden cursor-pointer" onClick={() => handleOpenDetail(contact)}>
            <div className="flex justify-between items-start mb-6">
              <div className={`p-4 rounded-3xl ${
                contact.type === 'Hospital' ? 'bg-rose-50 text-rose-600' : 
                contact.type === 'Clinic' ? 'bg-blue-50 text-blue-600' : 
                contact.type === 'Laboratory' ? 'bg-purple-50 text-purple-600' :
                'bg-emerald-50 text-emerald-600'
              }`}>
                <Hospital size={28} />
              </div>
              <div className="flex gap-2">
                <button onClick={(e) => { e.stopPropagation(); handleOpenForm(contact); }} className="p-3 text-blue-600 bg-blue-50 rounded-2xl transition-all hover:bg-blue-100"><Edit2 size={18} /></button>
                <button onClick={(e) => { e.stopPropagation(); setDeleteTargetId(contact.id); }} className="p-3 text-red-500 bg-red-50 rounded-2xl transition-all hover:bg-red-100"><Trash2 size={18} /></button>
              </div>
            </div>

            <div className="flex-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 inline-block">{contactTypes.find(c => c.value === contact.type)?.label || contact.type}</span>
              <h3 className="text-xl font-black text-slate-800 leading-tight mb-4 group-hover:text-blue-600 transition-colors">{contact.name}</h3>
              
              <div className="space-y-4 mb-8">
                <a href={`tel:${contact.phone}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-3 text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">
                  <div className="p-1.5 bg-slate-50 rounded-lg text-slate-400"><PhoneCall size={14} /></div>
                  {contact.phone}
                </a>
                <div className="flex items-start gap-3 text-sm font-medium text-slate-500 leading-relaxed">
                  <div className="p-1.5 bg-slate-50 rounded-lg text-slate-400 mt-0.5"><MapPin size={14} /></div>
                  <span className="line-clamp-2">{contact.address}</span>
                </div>
              </div>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-32 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100 flex flex-col items-center">
            <PhoneCall size={64} className="mx-auto text-slate-100 mb-6" />
            <h3 className="text-xl font-black text-slate-800">{language === 'ID' ? 'Belum Ada Kontak' : 'No Contacts Yet'}</h3>
            <p className="text-slate-400 max-w-xs mx-auto mt-2 font-medium">Tambahkan daftar fasilitas kesehatan atau dokter langganan Anda.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ContactDetail = ({ icon: Icon, label, value, isLink }: any) => (
  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4 shadow-inner">
    <div className="p-3 bg-white rounded-xl shadow-sm text-slate-400 border border-slate-50"><Icon size={20} /></div>
    <div>
       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
       {isLink ? (
         <a href={isLink} className="text-sm font-black text-blue-600 hover:underline">{value}</a>
       ) : (
         <p className="text-sm font-black text-slate-800 leading-relaxed">{value}</p>
       )}
    </div>
  </div>
);

export default ContactsView;
