import React, { useState, useEffect } from 'react';
import { useAppContext } from '../store';
import { GroupType, Transaction, Room } from '../types';
import { getRealTodayDate, formatIndonesianDate, addDaysToDateStr, checkMeetingRoomAvailability } from '../lib/utils';
import { useBodyScrollLock } from '../lib/scrollLock';

interface GroupRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultGroupType?: GroupType;
  initialGroupName?: string;
  initialPicName?: string;
  initialPicPhone?: string;
  initialMembers?: number;
  isEdit?: boolean;
  editGroupId?: string;
  initialStartDate?: string;
  initialDuration?: number;
  initialRoomIds?: string[];
  initialAgencyOrDocument?: string;
  initialCateringPackage?: 'SARAPAN' | 'FULLBOARD' | 'SNACK_AULA' | 'TIDAK';
  initialIncludeBreakfast?: boolean;
  initialBreakfastPortions?: number;
  initialIncludeAula?: boolean;
  initialMeetingRoomId?: string;
  initialMeetingRoomSession?: string;
  initialMeetingRoomDays?: number;
  initialStatusMode?: 'TERISI' | 'BOOKED';
}

export function GroupRegistrationModal({ 
  isOpen, 
  onClose, 
  defaultGroupType = 'INSTANSI',
  initialGroupName = '',
  initialPicName = '',
  initialPicPhone = '',
  initialMembers = 0,
  isEdit = false,
  editGroupId,
  initialStartDate,
  initialDuration,
  initialRoomIds = [],
  initialAgencyOrDocument = '',
  initialCateringPackage = 'TIDAK',
  initialIncludeBreakfast = false,
  initialBreakfastPortions = 0,
  initialIncludeAula = false,
  initialMeetingRoomId = '',
  initialMeetingRoomSession = 'Reguler 8 Jam',
  initialMeetingRoomDays = 1,
  initialStatusMode = 'TERISI'
}: GroupRegistrationModalProps) {
  const { rooms, currentUser, addGroupBooking, updateGroupBooking, showToast, breakfastMenuItems = [], transactions } = useAppContext();

  useBodyScrollLock(isOpen);

  const [groupType, setGroupType] = useState<GroupType>(defaultGroupType);
  const [groupName, setGroupName] = useState(initialGroupName);
  const [picName, setPicName] = useState(initialPicName);
  const [picPhone, setPicPhone] = useState(initialPicPhone);
  const [agencyOrDocument, setAgencyOrDocument] = useState('');
  const [estimatedMembers, setEstimatedMembers] = useState<number>(initialMembers || 0);
  const [startDate, setStartDate] = useState(getRealTodayDate());
  const [duration, setDuration] = useState<number>(0);
  const [statusMode, setStatusMode] = useState<'TERISI' | 'BOOKED'>('TERISI');

  useEffect(() => {
    if (isOpen) {
      setGroupType(defaultGroupType);
      setGroupName(initialGroupName || '');
      setPicName(initialPicName || '');
      setPicPhone(initialPicPhone || '');
      setAgencyOrDocument(initialAgencyOrDocument || (defaultGroupType === 'JEMAAH_HAJI' ? 'JKG-' : ''));
      setEstimatedMembers(initialMembers || 0);
      setStartDate(initialStartDate || getRealTodayDate());
      setDuration(initialDuration || 1);
      setSelectedRoomIds(initialRoomIds || []);
      setCateringPackage(initialCateringPackage || 'TIDAK');
      setIncludeBreakfast(initialIncludeBreakfast || false);
      setBreakfastPortions(initialBreakfastPortions || 0);
      setIncludeAula(initialIncludeAula || false);
      setSelectedMeetingRoomId(initialMeetingRoomId || '');
      setMeetingRoomSession(initialMeetingRoomSession || 'Reguler 8 Jam');
      setMeetingRoomDays(initialMeetingRoomDays || 1);
      setStatusMode(initialStatusMode || 'TERISI');
    }
  }, [isOpen, editGroupId]);

  // Facilities allocation
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState<string>('ALL');
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);

  // Additional services & Packs
  const [cateringPackage, setCateringPackage] = useState<'SARAPAN' | 'FULLBOARD' | 'SNACK_AULA' | 'TIDAK'>('TIDAK');
  const [includeBreakfast, setIncludeBreakfast] = useState(false);
  const [breakfastMenu, setBreakfastMenu] = useState('Nasi Goreng Spesial & Telur Ceplok');
  const [breakfastPortions, setBreakfastPortions] = useState<number>(0);
  const [includeAula, setIncludeAula] = useState(false);
  const [selectedMeetingRoomId, setSelectedMeetingRoomId] = useState<string>('');
  const [meetingRoomSession, setMeetingRoomSession] = useState<string>('Reguler 8 Jam');
  const [meetingRoomDuration, setMeetingRoomDuration] = useState<number>(8);
  const [meetingRoomDays, setMeetingRoomDays] = useState<number>(1);
  const [meetingRoomPurpose, setMeetingRoomPurpose] = useState<string>('Koordinasi & Pertemuan Rombongan');
  const [includeExtraBed, setIncludeExtraBed] = useState(false);
  const [extraBedCount, setExtraBedCount] = useState<number>(4);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  // Filter available rooms (only empty and verified LOLOS QC)
  const emptyRooms = rooms.filter(r => r.building !== 'Ruang Pertemuan' && r.status === 'KOSONG' && (r.qcStatus === 'LOLOS_QC' || !r.qcStatus));
  const emptyMeetingRooms = rooms.filter(r => r.building === 'Ruang Pertemuan' && r.status === 'KOSONG' && (r.qcStatus === 'LOLOS_QC' || !r.qcStatus));

  const filteredAvailableRooms = emptyRooms.filter(r => {
    if (selectedBuildingFilter === 'ALL') return true;
    return r.building.includes(selectedBuildingFilter);
  });

  const buildings = [
    { id: 'ALL', label: 'Semua Gedung' },
    { id: 'Gedung A', label: 'Gedung A (Arafah)' },
    { id: 'Gedung B', label: 'Gedung B (Mina)' },
    { id: 'Gedung C', label: 'Gedung C (Muzdalifah)' },
    { id: 'Gedung D', label: 'Gedung D (Madinah)' },
  ];

  const toggleRoomSelection = (roomId: string) => {
    setSelectedRoomIds(prev => 
      prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
    );
  };

  const handleSelectAllInBuilding = () => {
    const idsInFilter = filteredAvailableRooms.map(r => r.id);
    const allSelected = idsInFilter.every(id => selectedRoomIds.includes(id));
    if (allSelected) {
      setSelectedRoomIds(prev => prev.filter(id => !idsInFilter.includes(id)));
    } else {
      setSelectedRoomIds(prev => Array.from(new Set([...prev, ...idsInFilter])));
    }
  };

  const handleQuickAutoSelect = (count: number) => {
    const toPick = filteredAvailableRooms.slice(0, count).map(r => r.id);
    setSelectedRoomIds(toPick);
    if (estimatedMembers === 0) {
      setEstimatedMembers(toPick.length * 4);
    }
  };

  const calculateTotalBeds = () => {
    const selected = rooms.filter(r => selectedRoomIds.includes(r.id));
    return selected.reduce((sum, r) => {
      const cap = parseInt(r.capacity) || 4;
      return sum + cap;
    }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!groupName.trim()) {
      showToast('Mohon isi nama rombongan atau instansi!', 'warning');
      return;
    }

    if (!picName.trim()) {
      showToast('Mohon isi nama PIC / Koordinator rombongan!', 'warning');
      return;
    }

    if (selectedRoomIds.length === 0 && !selectedMeetingRoomId) {
      showToast('Mohon pilih minimal 1 kamar atau 1 ruang pertemuan untuk rombongan!', 'warning');
      return;
    }

    const groupId = isEdit && editGroupId ? editGroupId : `GRP-${Date.now().toString().slice(-5)}`;
    const newTransactions: Transaction[] = [];

    const selectedRooms = rooms.filter(r => selectedRoomIds.includes(r.id));
    const allocatedRoomNumbers = selectedRooms.map(r => r.roomNumber);
    const meetingObj = (includeAula && selectedMeetingRoomId)
      ? rooms.find(r => r.id === selectedMeetingRoomId)
      : null;

    if (includeAula && meetingObj) {
      const aulaDurationVal = meetingRoomDays > 1 ? meetingRoomDays : meetingRoomDuration;
      const aulaDurationUnit = meetingRoomDays > 1 ? 'Hari' : (meetingRoomDuration >= 24 ? 'Hari' : 'Jam');
      const checkAula = checkMeetingRoomAvailability(
        meetingObj.id,
        startDate,
        aulaDurationVal,
        transactions,
        undefined,
        aulaDurationUnit
      );
      if (!checkAula.isValid) {
        showToast(checkAula.message || 'Ruang pertemuan tidak tersedia pada rentang tanggal tersebut.', 'error');
        return;
      }
    }

    const hasActiveCatering = cateringPackage !== 'TIDAK' && breakfastPortions > 0;

    // Create transactions for each room
    selectedRoomIds.forEach((rId, idx) => {
      const roomObj = rooms.find(r => r.id === rId);
      if (!roomObj) return;

      const txId = `TRX-${Date.now().toString().slice(-4)}${idx + 1}`;
      newTransactions.push({
        id: txId,
        roomId: roomObj.id,
        building: roomObj.building,
        roomNumber: roomObj.roomNumber,
        category: groupType === 'JEMAAH_HAJI' ? 'JEMAAH' : 'UMUM',
        guestType: 'ROMBONGAN',
        isGroup: true,
        guestName: groupName,
        kloter: groupType === 'JEMAAH_HAJI' ? (agencyOrDocument || 'Haji') : (agencyOrDocument || '-'),
        startDate,
        duration,
        durationUnit: duration === 0 ? 'Hari' : 'Malam',
        phone: picPhone,
        notes: `[Rombongan: ${groupName}] PIC: ${picName} (${picPhone}). ${notes ? 'Catatan: ' + notes : ''}`,
        status: statusMode,
        createdUser: currentUser?.username || 'admin',
        groupType,
        groupName,
        groupPic: picName,
        groupPicPhone: picPhone,
        groupId,
        totalPax: estimatedMembers,
        includeAula: includeAula && !!meetingObj,
        rentAulaId: meetingObj ? meetingObj.id : undefined,
        rentAulaName: meetingObj ? meetingObj.roomNumber : undefined,
        rentAulaDuration: meetingObj ? meetingRoomDuration : undefined,
        rentAulaSession: meetingObj ? meetingRoomSession : undefined,
        cateringPackage: cateringPackage,
        cateringPaxCount: breakfastPortions,
        spkNumber: agencyOrDocument,
        allocatedRoomNumbers,
        allocatedRoomsCount: selectedRoomIds.length,
        breakfast: hasActiveCatering,
        breakfastMenu: hasActiveCatering ? breakfastMenu : undefined,
        breakfastPortions: hasActiveCatering ? Math.max(1, Math.round(breakfastPortions / Math.max(1, selectedRoomIds.length))) : 0,
        breakfastDays: hasActiveCatering ? Math.max(1, duration) : undefined,
        breakfastStatus: hasActiveCatering ? 'MENUNGGU' : undefined,
        extraBed: includeExtraBed,
        extraBedCount: includeExtraBed ? Math.ceil(extraBedCount / Math.max(1, selectedRoomIds.length)) : undefined,
      });
    });

    // If meeting room is selected as well
    if (includeAula && meetingObj) {
      const meetingTxId = `TRX-AULA-${Date.now().toString().slice(-4)}`;
      newTransactions.push({
        id: meetingTxId,
        roomId: meetingObj.id,
        building: meetingObj.building,
        roomNumber: meetingObj.roomNumber,
        category: 'UMUM',
        guestType: 'ROMBONGAN',
        isGroup: true,
        guestName: `${groupName} (Sewa Ruang Pertemuan / Aula)`,
        kloter: agencyOrDocument || '-',
        startDate,
        duration: meetingRoomDays > 1 ? meetingRoomDays : meetingRoomDuration,
        durationUnit: meetingRoomDays > 1 ? 'Hari' : (meetingRoomDuration >= 24 ? 'Hari' : 'Jam'),
        phone: picPhone,
        notes: `[Sewa Aula Rombongan: ${groupName}] Sesi: ${meetingRoomSession}, Durasi: ${meetingRoomDays} Hari (${meetingRoomDuration} Jam). Keperluan: ${meetingRoomPurpose}. PIC: ${picName}. ${notes}`,
        status: statusMode,
        createdUser: currentUser?.username || 'admin',
        groupType,
        groupName,
        groupPic: picName,
        groupPicPhone: picPhone,
        groupId,
        totalPax: estimatedMembers,
        includeAula: true,
        rentAulaId: meetingObj.id,
        rentAulaName: meetingObj.roomNumber,
        rentAulaDuration: meetingRoomDuration,
        rentAulaDurationDays: meetingRoomDays,
        rentAulaSession: meetingRoomSession,
        cateringPackage: cateringPackage,
        cateringPaxCount: breakfastPortions,
        spkNumber: agencyOrDocument,
        allocatedRoomNumbers,
        allocatedRoomsCount: selectedRoomIds.length,
      });
    }

    if (isEdit && editGroupId) {
      updateGroupBooking(editGroupId, newTransactions, groupName);
    } else {
      addGroupBooking(newTransactions, groupName);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[94vh] my-auto animate-in fade-in zoom-in duration-150">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-hajj-900 via-hajj-800 to-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0 border-b border-gold-500/30">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gold-500 text-slate-950 flex items-center justify-center text-lg font-black shadow-md border border-gold-400">
              <i className="fa-solid fa-users-rectangle"></i>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base tracking-wide text-white">
                  {isEdit ? 'Sesuaikan Data Rombongan' : 'Pendaftaran Data Rombongan Baru'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gold-400 text-slate-950">
                  Kolektif
                </span>
              </div>
              <p className="text-xs text-gold-200">
                Registrasi pemesanan untuk Jemaah Haji, Instansi/Kementerian, atau Tamu Umum Rombongan
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/70 hover:text-white text-lg p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs overflow-y-auto flex-1 custom-scrollbar bg-slate-50/50">
          
          {/* 1. Pilih Tipe Rombongan */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              1. Pilih Kategori Rombongan <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option: Jemaah Haji / Umrah */}
              <div
                onClick={() => {
                  setGroupType('JEMAAH_HAJI');
                  if (!agencyOrDocument) setAgencyOrDocument('JKG-');
                }}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  groupType === 'JEMAAH_HAJI'
                    ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2.5 mb-1.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                    groupType === 'JEMAAH_HAJI' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <i className="fa-solid fa-kaaba"></i>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Jemaah Haji / Umrah</h4>
                    <span className="text-[10px] text-slate-500">Kloter, KBIHU, Biro Travel</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-2">
                  Alokasi rombongan transit embarkasi, kepulangan jemaah haji, atau pembinaan manasik.
                </p>
              </div>

              {/* Option: Instansi / Kementerian / Lembaga */}
              <div
                onClick={() => setGroupType('INSTANSI')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  groupType === 'INSTANSI'
                    ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2.5 mb-1.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                    groupType === 'INSTANSI' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <i className="fa-solid fa-building-columns"></i>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Instansi / Lembaga</h4>
                    <span className="text-[10px] text-slate-500">Kementerian, BUMN, Pemda</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-2">
                  Kegiatan kedinasan, diklat kementerian, rapat kerja lembaga, atau seminar instansi.
                </p>
              </div>

              {/* Option: Tamu Umum Rombongan */}
              <div
                onClick={() => setGroupType('UMUM')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  groupType === 'UMUM'
                    ? 'border-amber-600 bg-amber-50/80 ring-2 ring-amber-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2.5 mb-1.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                    groupType === 'UMUM' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <i className="fa-solid fa-people-group"></i>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Tamu Umum Rombongan</h4>
                    <span className="text-[10px] text-slate-500">Keluarga, Majelis, Komunitas</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-2">
                  Pemesanan rombongan keluarga besar, wisata religi, reuni alumni, atau ziarah.
                </p>
              </div>
            </div>
          </div>

          {/* 2. Informasi Utama Rombongan */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-100 pb-2">
              <i className="fa-solid fa-id-card text-hajj-700"></i>
              <span>2. Informasi Identitas & Penanggung Jawab Rombongan</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Rombongan / Nama Instansi <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder={
                    groupType === 'JEMAAH_HAJI' 
                      ? 'Contoh: KBIHU Al-Mabruur Kloter JKG-04' 
                      : groupType === 'INSTANSI'
                      ? 'Contoh: Pusdiklat Balai Litbang Kemenag RI'
                      : 'Contoh: Rombongan Keluarga Besar H. Abdullah'
                  }
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-hajj-600 focus:bg-white outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama PIC / Ketua Rombongan / Kontak <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={picName}
                  onChange={(e) => setPicName(e.target.value)}
                  placeholder="Contoh: Drs. H. Ahmad Fauzi, M.Pd"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-hajj-600 focus:bg-white outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nomor HP / WhatsApp PIC <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="tel" 
                  value={picPhone}
                  onChange={(e) => setPicPhone(e.target.value)}
                  placeholder="Contoh: 0812-3456-7890"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-hajj-600 focus:bg-white outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {groupType === 'JEMAAH_HAJI' ? 'No. Kloter / Kode Rombongan' : 'No. Surat Tugas / Dokumen Resmi (Opsional)'}
                </label>
                <input 
                  type="text" 
                  value={agencyOrDocument}
                  onChange={(e) => setAgencyOrDocument(e.target.value)}
                  placeholder={groupType === 'JEMAAH_HAJI' ? 'Contoh: JKG-04' : 'Contoh: B-1044/DJ.I/HM.01/05/2026'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-hajj-600 focus:bg-white outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Estimasi Jumlah Peserta / Jemaah (Orang)
                </label>
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = Math.max(0, estimatedMembers - (estimatedMembers > 10 ? 5 : 1));
                      setEstimatedMembers(nextVal);
                      if (includeBreakfast && breakfastPortions > 0) setBreakfastPortions(nextVal);
                    }}
                    className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-black text-sm flex items-center justify-center transition cursor-pointer shrink-0 shadow-2xs"
                    title="Kurangi 1 atau 5 orang"
                  >
                    -
                  </button>
                  <div className="relative flex-1">
                    <input 
                      type="number" 
                      min={0}
                      value={estimatedMembers}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        setEstimatedMembers(val);
                        if (includeBreakfast && breakfastPortions > 0) setBreakfastPortions(val);
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-hajj-600 focus:bg-white outline-none font-bold text-center text-sm"
                    />
                    <span className="absolute right-3 top-2 text-slate-400 text-xs pointer-events-none">Orang</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = estimatedMembers + (estimatedMembers >= 10 ? 5 : 1);
                      setEstimatedMembers(nextVal);
                      if (includeBreakfast && breakfastPortions > 0) setBreakfastPortions(nextVal);
                    }}
                    className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-black text-sm flex items-center justify-center transition cursor-pointer shrink-0 shadow-2xs"
                    title="Tambah 1 atau 5 orang"
                  >
                    +
                  </button>
                </div>
                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {[0, 10, 20, 40, 80, 160].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => {
                        setEstimatedMembers(cnt);
                        if (includeBreakfast && breakfastPortions > 0) setBreakfastPortions(cnt);
                      }}
                      className={`px-2 py-0.5 text-[10px] rounded font-bold border transition cursor-pointer ${
                        estimatedMembers === cnt 
                          ? 'bg-hajj-700 text-white border-hajj-800 shadow-2xs' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cnt === 0 ? '0 Orang' : cnt === 40 ? '40 (1 Bus)' : cnt === 80 ? '80 (2 Bus)' : cnt === 160 ? '160 (Kloter)' : `${cnt} Pax`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Status Penerimaan Rombongan <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatusMode('TERISI')}
                    className={`py-2 px-3 rounded-lg font-bold border text-center cursor-pointer transition ${
                      statusMode === 'TERISI' 
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs' 
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <i className="fa-solid fa-door-open mr-1.5"></i>
                    Langsung Check-In
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusMode('BOOKED')}
                    className={`py-2 px-3 rounded-lg font-bold border text-center cursor-pointer transition ${
                      statusMode === 'BOOKED' 
                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs' 
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <i className="fa-solid fa-calendar-plus mr-1.5"></i>
                    Reservasi / Booking
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tanggal Masuk (Check-In) <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-hajj-600 focus:bg-white outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Durasi Menginap (Malam) <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => setDuration(prev => Math.max(0, prev - 1))}
                    className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-black text-sm flex items-center justify-center transition cursor-pointer shrink-0 shadow-2xs"
                    title="Kurangi 1 malam"
                  >
                    -
                  </button>
                  <input 
                    type="number" 
                    min={0} 
                    max={60}
                    value={duration}
                    onChange={(e) => setDuration(Math.max(0, parseInt(e.target.value) || 0))}
                    onFocus={(e) => e.target.select()}
                    required
                    className="w-20 px-2 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-hajj-600 focus:bg-white outline-none font-bold text-center text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setDuration(prev => prev + 1)}
                    className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-black text-sm flex items-center justify-center transition cursor-pointer shrink-0 shadow-2xs"
                    title="Tambah 1 malam"
                  >
                    +
                  </button>
                  <span className="text-slate-600 font-medium text-[11px] leading-tight flex-1 ml-1">
                    {duration === 0 
                      ? <strong className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">0 Malam (Transit / Acara 1 Hari)</strong>
                      : <>Malam (Check-Out: <strong>{formatIndonesianDate(addDaysToDateStr(startDate, duration))}</strong>)</>}
                  </span>
                </div>
                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {[0, 1, 2, 3, 5, 7].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className={`px-2 py-0.5 text-[10px] rounded font-bold border transition cursor-pointer ${
                        duration === d 
                          ? 'bg-hajj-700 text-white border-hajj-800 shadow-2xs' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {d === 0 ? '0 Malam (Transit)' : `${d} Malam`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Alokasi Kamar Rombongan */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div>
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <i className="fa-solid fa-bed text-emerald-700"></i>
                  <span>3. Alokasi Kamar Rombongan</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Pilih kamar kosong untuk ditempati rombongan ({emptyRooms.length} kamar kosong tersedia)
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg border border-emerald-200">
                  {selectedRoomIds.length} Kamar Terpilih ({calculateTotalBeds()} Tempat Tidur)
                </span>
                <button
                  type="button"
                  onClick={handleSelectAllInBuilding}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg border border-slate-300 cursor-pointer transition"
                >
                  Pilih Semua di Gedung Ini
                </button>
              </div>
            </div>

            {/* Quick Auto-Select Helper */}
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="font-bold text-slate-700">Pilih Cepat Berdasarkan Kebutuhan:</span>
              {[2, 4, 6, 8, 10].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleQuickAutoSelect(n)}
                  className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 font-medium rounded border border-slate-300 shadow-2xs cursor-pointer"
                >
                  + {n} Kamar
                </button>
              ))}
              {selectedRoomIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedRoomIds([])}
                  className="px-2 py-0.5 text-rose-600 hover:underline font-bold ml-auto"
                >
                  Reset Pilihan
                </button>
              )}
            </div>

            {/* Building Filter Pills */}
            <div className="flex flex-wrap gap-1.5">
              {buildings.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBuildingFilter(b.id)}
                  className={`px-3 py-1 rounded-full font-bold transition cursor-pointer text-[11px] ${
                    selectedBuildingFilter === b.id
                      ? 'bg-hajj-800 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {/* Room Selection Grid */}
            {filteredAvailableRooms.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Tidak ada kamar kosong yang tersedia pada filter gedung ini.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                {filteredAvailableRooms.map(r => {
                  const isSelected = selectedRoomIds.includes(r.id);
                  return (
                    <div
                      key={r.id}
                      onClick={() => toggleRoomSelection(r.id)}
                      className={`p-2 rounded-xl border text-center cursor-pointer transition flex flex-col items-center justify-center space-y-0.5 ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-500 text-white font-black shadow-xs ring-2 ring-emerald-300'
                          : 'border-slate-200 bg-white hover:border-slate-400 text-slate-800'
                      }`}
                    >
                      <div className="text-[10px] opacity-80">{r.building.split(' ')[1] || r.building}</div>
                      <div className="text-xs font-bold">{r.roomNumber}</div>
                      <div className="text-[9px] opacity-75">{r.capacity} Bed</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. Sewa Ruang Pertemuan (Aula) Terintegrasi */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div>
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <i className="fa-solid fa-landmark text-purple-700"></i>
                  <span>4. Alokasi Ruang Pertemuan / Aula (Sewa Aula Rombongan)</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Untuk pembekalan manasik haji, rapat koordinasi kementerian, bimbingan teknis, atau gathering
                </p>
              </div>

              <label className="flex items-center space-x-2 cursor-pointer px-3 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition">
                <input 
                  type="checkbox"
                  checked={includeAula}
                  onChange={(e) => {
                    setIncludeAula(e.target.checked);
                    if (e.target.checked && !selectedMeetingRoomId && emptyMeetingRooms.length > 0) {
                      setSelectedMeetingRoomId(emptyMeetingRooms[0].id);
                    }
                  }}
                  className="w-4 h-4 text-purple-600 rounded border-purple-300 focus:ring-purple-500"
                />
                <span className="font-bold text-purple-900 text-xs">Menyewa Ruang Pertemuan / Aula</span>
              </label>
            </div>

            {includeAula ? (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Pilih Ruang Pertemuan / Aula (Grid Real Ruangan) <span className="text-rose-500">*</span>
                  </label>
                  {emptyMeetingRooms.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      Tidak ada ruang pertemuan / aula kosong yang tersedia saat ini.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-52 overflow-y-auto p-1 custom-scrollbar">
                      {emptyMeetingRooms.map(m => {
                        const isSelected = selectedMeetingRoomId === m.id;
                        return (
                          <div
                            key={m.id}
                            onClick={() => setSelectedMeetingRoomId(m.id)}
                            className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between space-y-1 ${
                              isSelected
                                ? 'border-purple-600 bg-purple-50 text-purple-950 font-bold shadow-sm ring-2 ring-purple-300'
                                : 'border-slate-200 bg-white hover:border-purple-300 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                                {m.building}
                              </span>
                              {isSelected && (
                                <i className="fa-solid fa-circle-check text-purple-700 text-sm"></i>
                              )}
                            </div>
                            <div>
                              <div className="text-xs font-black text-slate-900">{m.roomNumber}</div>
                              <div className="text-[10px] text-slate-600 mt-0.5">Kapasitas: <strong className="text-slate-800">{m.capacity}</strong></div>
                              {m.facilities && m.facilities.length > 0 && (
                                <div className="text-[9px] text-slate-400 truncate mt-1">
                                  {m.facilities.join(' • ')}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-purple-100">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Sesi & Durasi Jam Pemakaian Aula <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={meetingRoomSession}
                      onChange={(e) => {
                        setMeetingRoomSession(e.target.value);
                        if (e.target.value.includes('12 Jam')) setMeetingRoomDuration(12);
                        else if (e.target.value.includes('4 Jam')) setMeetingRoomDuration(4);
                        else setMeetingRoomDuration(8);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-purple-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-purple-600 focus:bg-white outline-none font-medium"
                    >
                      <option value="Reguler 8 Jam (Sesi Pagi - 08.00 s/d 16.00 WIB)">Reguler 8 Jam (Sesi Pagi - 08.00 s/d 16.00 WIB)</option>
                      <option value="Reguler 8 Jam (Sesi Siang/Malam - 13.00 s/d 21.00 WIB)">Reguler 8 Jam (Sesi Siang/Malam - 13.00 s/d 21.00 WIB)</option>
                      <option value="Full Day 12 Jam (08.00 s/d 20.00 WIB)">Full Day 12 Jam (08.00 s/d 20.00 WIB)</option>
                      <option value="Half Day 4 Jam (Sesi Singkat)">Half Day 4 Jam (Sesi Singkat)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Durasi Pemesanan (Hari) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={meetingRoomDays}
                      onChange={(e) => setMeetingRoomDays(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 bg-slate-50 border border-purple-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-purple-600 focus:bg-white outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Keperluan Acara / Agenda Kegiatan
                    </label>
                    <input 
                      type="text" 
                      value={meetingRoomPurpose}
                      onChange={(e) => setMeetingRoomPurpose(e.target.value)}
                      placeholder={
                        groupType === 'JEMAAH_HAJI'
                          ? 'Bimbingan Manasik Haji Akbar & Pelepasan Kloter'
                          : groupType === 'INSTANSI'
                          ? 'Rapat Koordinasi Kerja & Diklat Kepegawaian'
                          : 'Pertemuan Silaturahmi & Temu Komunitas'
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-purple-600 focus:bg-white outline-none font-medium"
                    />
                  </div>
                </div>

                <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-100 flex items-start space-x-2">
                  <i className="fa-solid fa-circle-check text-purple-600 mt-0.5 shrink-0 text-sm"></i>
                  <div className="text-[11px] text-purple-900">
                    <strong className="block">Fasilitas Standar Aula Termasuk:</strong>
                    Sound system 4 mic wireless, Proyektor & screen 3000 lumens, Podium sambutan, AC central, Meja penerima tamu.
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-500 text-[11px] flex items-center justify-between">
                <span>Rombongan ini tidak menyewa ruang pertemuan / aula (Hanya alokasi akomodasi kamar tidur).</span>
                <button
                  type="button"
                  onClick={() => {
                    setIncludeAula(true);
                    if (emptyMeetingRooms.length > 0) setSelectedMeetingRoomId(emptyMeetingRooms[0].id);
                  }}
                  className="text-purple-700 hover:text-purple-900 font-bold hover:underline ml-2 shrink-0 cursor-pointer"
                >
                  + Tambahkan Aula
                </button>
              </div>
            )}
          </div>

          {/* 5. Layanan Konsumsi & Kebutuhan Pack Katering */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div>
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <i className="fa-solid fa-utensils text-orange-600"></i>
                  <span>5. Paket Konsumsi Koperasi & Detail Pack</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Hitung kebutuhan pack makanan utama, sarapan pagi, atau coffee break aula rombongan
                </p>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-bold text-orange-800 bg-orange-100 px-2.5 py-1 rounded-lg border border-orange-200">
                  Kebutuhan: {estimatedMembers} Pack Peserta
                </span>
              </div>
            </div>

            {/* Pilihan Jenis Paket Konsumsi */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'TIDAK', label: 'Tidak Pakai Konsumsi', desc: 'Konsumsi Mandiri / 0 Pack', icon: 'fa-ban', color: 'slate' },
                { id: 'SARAPAN', label: 'Sarapan Pagi', desc: '1x Sarapan / Hari', icon: 'fa-mug-hot', color: 'orange' },
                { id: 'FULLBOARD', label: 'Fullboard Diklat', desc: '3x Makan + 2x Snack', icon: 'fa-bowl-food', color: 'emerald' },
                { id: 'SNACK_AULA', label: 'Snack Box Aula', desc: 'Snack & Kopi Rapat', icon: 'fa-cookie-bite', color: 'purple' },
              ].map((pkg) => (
                <div
                  key={pkg.id}
                  onClick={() => {
                    setCateringPackage(pkg.id as any);
                    setIncludeBreakfast(pkg.id !== 'TIDAK');
                    if (pkg.id === 'TIDAK') {
                      setBreakfastPortions(0);
                    } else if (breakfastPortions === 0 && estimatedMembers > 0) {
                      setBreakfastPortions(estimatedMembers);
                    }
                  }}
                  className={`p-2.5 rounded-xl border-2 text-center cursor-pointer transition flex flex-col items-center justify-center ${
                    cateringPackage === pkg.id
                      ? 'border-orange-500 bg-orange-50/80 ring-1 ring-orange-400 font-bold shadow-2xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <i className={`fa-solid ${pkg.icon} text-base mb-1 ${cateringPackage === pkg.id ? 'text-orange-600' : 'text-slate-400'}`}></i>
                  <div className="text-xs text-slate-800">{pkg.label}</div>
                  <div className="text-[10px] text-slate-500">{pkg.desc}</div>
                </div>
              ))}
            </div>

            {/* Jika TIDAK PAKAI KONSUMSI dipilih */}
            {cateringPackage === 'TIDAK' && (
              <div className="space-y-2 pt-2 border-t border-slate-100 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 text-xs mb-0.5">
                      Jumlah Pack Konsumsi (Default 0 - Mode: Tidak Pakai Konsumsi)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Rombongan mandiri / tanpa konsumsi. Jumlah pack disetel <strong>0</strong> secara default.
                    </p>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setBreakfastPortions(prev => Math.max(0, prev - (prev > 10 ? 5 : 1)))}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-sm flex items-center justify-center transition cursor-pointer shadow-2xs"
                      title="Kurangi pack"
                    >
                      -
                    </button>
                    <input 
                      type="number"
                      min={0}
                      value={breakfastPortions}
                      onChange={(e) => setBreakfastPortions(Math.max(0, parseInt(e.target.value) || 0))}
                      onFocus={(e) => e.target.select()}
                      className="w-20 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-500 outline-none font-bold text-center text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setBreakfastPortions(prev => prev + (prev >= 10 ? 5 : 1))}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-sm flex items-center justify-center transition cursor-pointer shadow-2xs"
                      title="Tambah pack"
                    >
                      +
                    </button>
                    <span className="text-xs font-bold text-slate-600">Pack</span>
                  </div>
                </div>
                {/* Shortcut Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 font-semibold">Isi Cepat:</span>
                  <button
                    type="button"
                    onClick={() => setBreakfastPortions(0)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                      breakfastPortions === 0 
                        ? 'bg-slate-800 text-white border-slate-900 shadow-2xs' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    0 Pack (Default)
                  </button>
                  {estimatedMembers > 0 && (
                    <button
                      type="button"
                      onClick={() => setBreakfastPortions(estimatedMembers)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                        breakfastPortions === estimatedMembers 
                          ? 'bg-slate-800 text-white border-slate-900 shadow-2xs' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      = {estimatedMembers} Pack (Semua Peserta)
                    </button>
                  )}
                  {[5, 10, 20, 40].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setBreakfastPortions(p)}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded border transition cursor-pointer ${
                        breakfastPortions === p 
                          ? 'bg-slate-800 text-white border-slate-900' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {p} Pack
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Jika PAKET KONSUMSI AKTIF dipilih */}
            {cateringPackage !== 'TIDAK' && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Pilihan Menu Hidangan / Katering
                    </label>
                    <select
                      value={breakfastMenu}
                      onChange={(e) => setBreakfastMenu(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-orange-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none font-medium text-sm"
                    >
                      {breakfastMenuItems.length > 0 ? (
                        breakfastMenuItems.map(m => (
                          <option key={m.id} value={m.name}>
                            {m.name} {m.description ? `(${m.description})` : ''} - Rp {m.price.toLocaleString('id-ID')}
                          </option>
                        ))
                      ) : cateringPackage === 'FULLBOARD' ? (
                        <>
                          <option value="Paket Nusantara (Rawon, Ayam Bakar Madu, Ikan Bakar Jimbaran, Snack Lemper & Risol)">Paket Nusantara (Rawon, Ayam Bakar, Snack Lengkap)</option>
                          <option value="Paket Tradisional Betawi (Soto Betawi Daging, Ayam Goreng Lengkuas, Asinan)">Paket Betawi (Soto Betawi, Ayam Goreng, Asinan)</option>
                          <option value="Paket Standar Diklat Asrama Haji (Menu Variasi 3 Hari Kemenag)">Paket Standar Diklat Asrama Haji (Variasi Menu Kemenag)</option>
                        </>
                      ) : cateringPackage === 'SNACK_AULA' ? (
                        <>
                          <option value="Snack Box Premium (Kroket Daging, Bolu Gulung, Pastel, Kopi & Teh Tarik)">Snack Box Premium (Kroket, Bolu, Pastel, Kopi/Teh)</option>
                          <option value="Snack Box Ekonomis (Lontong, Lemper Ayam, Tahu Bakso, Air Mineral)">Snack Box Ekonomis (Lontong, Lemper, Tahu Bakso)</option>
                        </>
                      ) : (
                        <>
                          <option value="Nasi Goreng Spesial Asrama Haji & Telur Ceplok">Nasi Goreng Spesial Asrama Haji & Telur Ceplok</option>
                          <option value="Lontong Sayur Betawi Gurih & Telur Balado">Lontong Sayur Betawi Gurih & Telur Balado</option>
                          <option value="Bubur Ayam Komplit Asrama Haji Spesial">Bubur Ayam Komplit Asrama Haji Spesial</option>
                          <option value="Nasi Uduk Gurih Komplit Semur Tahu & Bihun">Nasi Uduk Gurih Komplit Semur Tahu & Bihun</option>
                          <option value="Nasi Kuning Nusantara & Orek Tempe Manis">Nasi Kuning Nusantara & Orek Tempe Manis</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Jumlah Pack Konsumsi per Sesi / Hari
                    </label>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setBreakfastPortions(prev => Math.max(0, prev - (prev > 10 ? 5 : 1)))}
                        className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold text-sm flex items-center justify-center transition cursor-pointer shadow-2xs"
                        title="Kurangi pack"
                      >
                        -
                      </button>
                      <input 
                        type="number"
                        min={0}
                        value={breakfastPortions}
                        onChange={(e) => setBreakfastPortions(Math.max(0, parseInt(e.target.value) || 0))}
                        onFocus={(e) => e.target.select()}
                        className="w-24 px-3 py-2 bg-slate-50 border border-orange-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none font-bold text-center text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setBreakfastPortions(prev => prev + (prev >= 10 ? 5 : 1))}
                        className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold text-sm flex items-center justify-center transition cursor-pointer shadow-2xs"
                        title="Tambah pack"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => setBreakfastPortions(estimatedMembers)}
                        title="Samakan dengan jumlah estimasi peserta"
                        className="px-2.5 py-2 bg-orange-100 hover:bg-orange-200 text-orange-800 text-[11px] font-bold rounded-lg border border-orange-300 shrink-0 cursor-pointer"
                      >
                        = {estimatedMembers} Pack
                      </button>
                    </div>

                    {/* Quick shortcuts */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {[0, 10, 20, 40, 80].map(cnt => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setBreakfastPortions(cnt)}
                          className={`px-2 py-0.5 text-[10px] rounded font-bold border transition cursor-pointer ${
                            breakfastPortions === cnt 
                              ? 'bg-orange-600 text-white border-orange-700 shadow-2xs' 
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {cnt === 0 ? '0 Pack' : `${cnt} Pack`}
                        </button>
                      ))}
                    </div>

                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Total estimasi: {breakfastPortions} Pack x {Math.max(1, duration)} Hari = <strong>{breakfastPortions * Math.max(1, duration)} Porsi</strong>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Extra Bed & Catatan */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="flex items-center space-x-2 cursor-pointer font-bold text-slate-800">
                <input 
                  type="checkbox"
                  checked={includeExtraBed}
                  onChange={(e) => setIncludeExtraBed(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span>Kebutuhan Kasur Lipat Tambahan (Extra Bed)</span>
              </label>

              {includeExtraBed && (
                <div className="flex items-center space-x-2">
                  <span className="text-slate-600 font-medium">Jumlah:</span>
                  <input 
                    type="number" 
                    min={1}
                    max={50}
                    value={extraBedCount}
                    onChange={(e) => setExtraBedCount(parseInt(e.target.value) || 1)}
                    className="w-20 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-center font-bold text-slate-900"
                  />
                  <span className="text-slate-500">Unit</span>
                </div>
              )}
            </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Catatan Khusus Kebutuhan Rombongan
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Rombongan tiba dengan 2 bus pariwisata jam 14:00. Mohon bantuan pengangkutan koper dan briefing singkat di lobi."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-hajj-600 focus:bg-white outline-none font-medium"
                ></textarea>
              </div>
            </div>

          {/* Modal Footer Buttons */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-slate-500 text-xs">
              Alokasi: <strong className="text-slate-800">{selectedRoomIds.length} Kamar ({calculateTotalBeds()} Bed)</strong>
              {includeAula && selectedMeetingRoomId && (
                <strong className="text-purple-700 ml-1">+ 1 Ruang Pertemuan</strong>
              )}
              <span className="mx-2 text-slate-300">|</span>
              Peserta: <strong className="text-orange-700">{estimatedMembers} Pack</strong>
              {cateringPackage !== 'TIDAK' && (
                <span className="ml-1 text-[11px] text-emerald-700 font-semibold">({cateringPackage} - {breakfastPortions} Porsi/Hari)</span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold rounded-xl shadow-md transition flex items-center space-x-2 cursor-pointer"
              >
                <i className="fa-solid fa-check"></i>
                <span>{isEdit ? 'Simpan Perubahan Data Rombongan' : 'Simpan & Daftarkan Rombongan'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
