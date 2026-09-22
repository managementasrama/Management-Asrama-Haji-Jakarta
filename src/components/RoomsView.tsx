import React, { useState } from 'react';
import { useAppContext, isTeknisiRole, isManagerTeknisi, isQcRole, isRecepRole, isKoperasiRole, isSuperAdmin } from '../store';
import { OFFICIAL_TARIFFS } from '../data';
import { Room, Building, MeetingRoom, Transaction } from '../types';
import { getRealTodayDate, getRealDateWithOffset, formatIndonesianDate, addDaysToDateStr, formatRupiah, getTxDays } from '../lib/utils';
import { BuildingModal, MeetingRoomModal, RoomModal, DeleteConfirmModal } from './CatalogManagementModals';

const BUILDING_ORDER = [
  'Gedung A (Arafah)',
  'Gedung B (Muzdalifah)',
  'Gedung C (Mina)',
  'Gedung D (Madinah)',
  'Ruang Pertemuan',
];

export function RoomsView() {
  const { 
    rooms, transactions, maintenances, openModal, finishMaintenance, currentUser, setActiveTab,
    buildings = [], meetingRooms = [], deleteBuilding, deleteMeetingRoom, deleteRoom, showToast
  } = useAppContext();

  // Sub-tabs for Rooms & Facilities View
  const [activeCatalogTab, setActiveCatalogTab] = useState<'ROOMS_GRID' | 'BUILDINGS_CATALOG' | 'MEETING_ROOMS_CATALOG'>('ROOMS_GRID');

  // Modal State for CRUD
  const [isBuildingModalOpen, setIsBuildingModalOpen] = useState(false);
  const [buildingToEdit, setBuildingToEdit] = useState<Building | null>(null);

  const [isMeetingRoomModalOpen, setIsMeetingRoomModalOpen] = useState(false);
  const [meetingRoomToEdit, setMeetingRoomToEdit] = useState<MeetingRoom | null>(null);

  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [roomToEdit, setRoomToEdit] = useState<Room | null>(null);

  // Delete Confirmation Modal State
  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    itemName: string;
    itemType: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    itemName: '',
    itemType: '',
    onConfirm: () => {}
  });

  const [bFilter, setBFilter] = useState('ALL');
  const [sFilter, setSFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [myZoneOnly, setMyZoneOnly] = useState(false);
  const [globalDisplay, setGlobalDisplay] = useState<'COLLAPSE' | 'EXPAND'>('COLLAPSE');
  const [buildingOverrides, setBuildingOverrides] = useState<Record<string, boolean>>({});

  const isRecep = isRecepRole(currentUser?.role);
  const isTeknisi = isTeknisiRole(currentUser?.role);
  const isManagerTek = isManagerTeknisi(currentUser?.role);
  const isQc = isQcRole(currentUser?.role);
  const isKoperasi = isKoperasiRole(currentUser?.role);
  const isSuperAdm = Boolean(currentUser && (isSuperAdmin(currentUser.role) || currentUser.role === 'Admin'));
  const canManageMaster = isSuperAdm;
  const canManageRooms = isSuperAdm || isRecep;

  // Determine user's zone
  const hasAssignedZone = currentUser?.assignedBuilding && 
    !currentUser.assignedBuilding.includes('Pusat Komando') && 
    !currentUser.assignedBuilding.includes('Kawasan') && 
    !currentUser.assignedBuilding.includes('Semua') &&
    currentUser.assignedBuilding !== '-';

  const isRoomInUserZone = (roomBuilding: string): boolean => {
    if (!hasAssignedZone || !myZoneOnly || !currentUser?.assignedBuilding) return true;
    const zone = currentUser.assignedBuilding;
    if (zone.includes('A & B') || (zone.includes('Gedung A') && zone.includes('Gedung B'))) {
      return roomBuilding === 'Gedung A (Arafah)' || roomBuilding === 'Gedung B (Muzdalifah)';
    }
    if (zone.includes('C, D') || zone.includes('C & D')) {
      return roomBuilding === 'Gedung C (Mina)' || roomBuilding === 'Gedung D (Madinah)' || roomBuilding === 'Ruang Pertemuan';
    }
    return true;
  };

  const filteredRooms = rooms.filter(r => {
    if (myZoneOnly && !isRoomInUserZone(r.building)) return false;
    if (bFilter !== 'ALL' && r.building !== bFilter) return false;
    if (sFilter !== 'ALL' && r.status !== sFilter) return false;
    if (search && !r.roomNumber.toLowerCase().includes(search.toLowerCase()) && !r.building.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped: Record<string, Room[]> = {};
  filteredRooms.forEach(r => {
    if (!grouped[r.building]) grouped[r.building] = [];
    grouped[r.building].push(r);
  });

  const buildingNames = Object.keys(grouped).sort((a, b) => {
    const idxA = BUILDING_ORDER.indexOf(a);
    const idxB = BUILDING_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    return a.localeCompare(b);
  });

  const isBuildingCollapsed = (bName: string): boolean => {
    if (buildingOverrides[bName] !== undefined) {
      return buildingOverrides[bName];
    }
    return globalDisplay === 'COLLAPSE';
  };

  const toggleBuilding = (bName: string) => {
    const current = isBuildingCollapsed(bName);
    setBuildingOverrides(prev => ({
      ...prev,
      [bName]: !current,
    }));
  };

  const handleGlobalDisplayChange = (mode: 'COLLAPSE' | 'EXPAND') => {
    setGlobalDisplay(mode);
    setBuildingOverrides({});
  };

  const realTodayStr = getRealTodayDate();
  const realTomorrowStr = getRealDateWithOffset(1);

  const renderQcBadge = (qc?: string) => {
    switch (qc) {
      case 'LOLOS_QC':
        return <span className="text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-bold">✅ Lolos QC</span>;
      case 'MENUNGGU_QC':
        return <span className="text-[9px] px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-bold animate-pulse">🔔 Menunggu QC</span>;
      case 'PERLU_PERBAIKAN':
        return <span className="text-[9px] px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded font-bold">⚠️ Perlu Perbaikan</span>;
      case 'PERLU_INSPEKSI':
      default:
        return <span className="text-[9px] px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-bold">⚠️ Perlu Cek QC</span>;
    }
  };

  const getRoomCard = (room: Room) => {
    let statusBadge = null;
    let borderClass = '';
    let btnAction = null;
    const isAula = room.building === "Ruang Pertemuan";

    // Active transactions for this room
    const activeRoomTxs = transactions.filter(t => 
      t.roomId === room.id && 
      t.status !== 'DIBATALKAN' && 
      t.status !== 'SELESAI'
    );

    const activeTx = transactions.find(t => t.id === room.activeTxId);
    const evalDate = activeTx?.startDate || activeRoomTxs[0]?.startDate || realTodayStr;

    // =========================================================================
    // 1. LOGIC RUANG PERTEMUAN (AULA)
    // =========================================================================
    if (isAula) {
      if (room.status === 'MAINTENANCE') {
        const aulaMaint = maintenances.find(m => m.id === room.activeMaintId || (m.roomId === room.id && m.status !== 'SELESAI'));
        const isWaitingQc = room.qcStatus === 'MENUNGGU_QC' || aulaMaint?.status === 'MENUNGGU_QC';

        if (isWaitingQc) {
          borderClass = 'border-purple-300 bg-purple-50/70';
          statusBadge = <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-700 text-white animate-pulse">Menunggu QC</span>;
          btnAction = (
            <div className="space-y-1">
              {isQc ? (
                <button 
                  onClick={() => openModal('modalQcInspection', { room })} 
                  className="w-full py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg text-xs shadow flex items-center justify-center space-x-1.5 transition"
                  title="Lakukan inspeksi kelayakan aula untuk lolos QC"
                >
                  <i className="fa-solid fa-clipboard-check"></i>
                  <span>Inspeksi QC Aula</span>
                </button>
              ) : isTeknisi ? (
                <button 
                  onClick={() => { if (aulaMaint) openModal('modalUpdateMaintenance', { maintenance: aulaMaint }); }} 
                  className="w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs shadow flex items-center justify-center space-x-1.5 transition"
                  title="Lihat status verifikasi QC"
                >
                  <i className="fa-solid fa-clock-rotate-left"></i>
                  <span>Telah Diperbaiki (Menunggu QC)</span>
                </button>
              ) : (
                <div className="w-full py-1 px-1.5 bg-purple-100 text-purple-900 rounded text-[10px] font-bold border border-purple-200 text-center">
                  Menunggu Inspeksi QC
                </div>
              )}
            </div>
          );
        } else {
          borderClass = 'border-amber-300 bg-amber-50/60';
          statusBadge = <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-600 text-white">Maintenance</span>;
          btnAction = (
            <div className="space-y-1">
              {isManagerTek && aulaMaint?.status === 'MENUNGGU_PENUGASAN' ? (
                <button 
                  onClick={() => openModal('modalAssignTechnician', { maintenance: aulaMaint })} 
                  className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow flex items-center justify-center space-x-1.5 transition"
                >
                  <i className="fa-solid fa-user-plus"></i>
                  <span>Tugaskan Teknisi</span>
                </button>
              ) : isTeknisi ? (
                <button 
                  onClick={() => {
                    if (aulaMaint) {
                      openModal('modalUpdateMaintenance', { maintenance: aulaMaint });
                    } else {
                      finishMaintenance(room.id);
                    }
                  }} 
                  className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow flex items-center justify-center space-x-1.5 transition"
                >
                  <i className="fa-solid fa-wrench"></i>
                  <span>Update / Selesai Perbaikan</span>
                </button>
              ) : (
                <div className="w-full py-1 px-1.5 bg-amber-100/90 text-amber-900 rounded text-[10px] font-bold border border-amber-200 text-center">
                  Perbaikan Sedang Berjalan
                </div>
              )}
            </div>
          );
        }
      } else if (activeRoomTxs.length === 0) {
        // AWAL / KOSONG
        borderClass = 'border-slate-200 bg-white hover:border-hajj-500';
        statusBadge = <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">Kosong</span>;
        btnAction = isRecep ? (
          <button 
            onClick={() => openModal('modalCheckin', { roomId: room.id, actionType: 'BOOKING', initialDate: realTodayStr })} 
            className="w-full py-2 bg-hajj-700 hover:bg-hajj-800 text-white font-bold rounded-lg text-xs shadow flex items-center justify-center space-x-1.5 transition"
          >
            <i className="fa-solid fa-calendar-check text-gold-300"></i>
            <span>Booking Aula</span>
          </button>
        ) : isQc ? (
          <button 
            onClick={() => openModal('modalQcInspection', { room })} 
            className="w-full py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs shadow flex items-center justify-center space-x-1.5 transition"
          >
            <i className="fa-solid fa-clipboard-check"></i>
            <span>Inspeksi QC Aula</span>
          </button>
        ) : isTeknisi ? (
          <button 
            onClick={() => openModal('modalMaintenance', { roomId: room.id })} 
            className="w-full py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 font-semibold rounded-lg text-xs flex items-center justify-center space-x-1.5 transition"
          >
            <i className="fa-solid fa-wrench text-amber-600"></i>
            <span>Lapor Perbaikan</span>
          </button>
        ) : (
          <div className="w-full text-center text-[10px] text-slate-400 py-1 font-medium">Aula Siap Disewa</div>
        );
      } else {
        // ADA PENYEWA YANG BOOKING AULA
        const sameDateTxs = activeRoomTxs.filter(t => {
          const tDays = getTxDays(t);
          for (let j = 0; j < tDays; j++) {
            if (addDaysToDateStr(t.startDate, j) === evalDate) {
              return true;
            }
          }
          return false;
        });

        const has12OrMultiDay = sameDateTxs.some(t => t.duration >= 12 || t.durationUnit === 'Hari' || t.duration >= 24);
        const count8Jam = sameDateTxs.filter(t => (t.duration === 8 || (t.duration < 12 && t.durationUnit !== 'Hari'))).length;
        const isAulaFull = has12OrMultiDay || count8Jam >= 2;
        const isOne8Jam = !has12OrMultiDay && count8Jam === 1;

        if (isAulaFull) {
          borderClass = 'border-purple-300 bg-purple-50/70';
          statusBadge = (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-700 text-white">
              {has12OrMultiDay ? 'Penuh (12 Jam - 7 Hari)' : 'Penuh (2x 8 Jam)'}
            </span>
          );
          btnAction = isRecep ? (
            <div className="space-y-1.5">
              <div className="text-[10px] text-purple-900 bg-purple-100/90 p-1.5 rounded-lg font-semibold border border-purple-200">
                <div className="font-bold flex items-center space-x-1 text-purple-950">
                  <i className="fa-solid fa-circle-exclamation text-purple-700"></i>
                  <span>Kuota Tanggal Penuh</span>
                </div>
                <div className="text-[9px] text-purple-800 truncate mt-0.5" title={sameDateTxs.map(t => `${t.guestName} (${t.duration} Jam)`).join(', ')}>
                  {has12OrMultiDay 
                    ? `1 Penyewa 12 Jam / Multi-hari (${sameDateTxs[0]?.guestName})` 
                    : `2 Penyewa 8 Jam (${sameDateTxs.map(t => t.guestName).join(' & ')})`}
                </div>
              </div>
              <button 
                onClick={() => openModal('modalCheckin', { roomId: room.id, actionType: 'BOOKING', initialDate: addDaysToDateStr(evalDate, 1) })} 
                className="w-full py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg text-xs shadow flex items-center justify-center space-x-1.5 transition"
                title={`Tanggal ini sudah penuh. Klik untuk booking tanggal berikutnya (${addDaysToDateStr(evalDate, 1)})`}
              >
                <i className="fa-solid fa-calendar-plus text-gold-300"></i>
                <span>Booking Tgl Lain (+1 Hari)</span>
              </button>
              <button 
                onClick={() => openModal('modalCheckoutSelection', { roomId: room.id, type: 'CANCEL' })} 
                className="w-full py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg text-xs border border-red-200 flex items-center justify-center space-x-1.5 transition"
              >
                <i className="fa-solid fa-xmark"></i>
                <span>Batalkan Booking</span>
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-[10px] text-purple-900 bg-purple-100 p-1.5 rounded font-medium border border-purple-200">
                <span className="font-bold">Terpakai Penuh:</span> {sameDateTxs[0]?.guestName}
              </div>
              {isQc && (
                <button 
                  onClick={() => openModal('modalQcInspection', { room })} 
                  className="w-full py-1 bg-teal-50 text-teal-800 hover:bg-teal-100 font-semibold rounded text-[11px] border border-teal-200 transition"
                >
                  <i className="fa-solid fa-clipboard-check mr-1"></i> Inspeksi QC Aula
                </button>
              )}
            </div>
          );
        } else if (isOne8Jam) {
          borderClass = 'border-amber-300 bg-amber-50/70';
          statusBadge = (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-600 text-white">
              1 Penyewa (8 Jam)
            </span>
          );
          btnAction = isRecep ? (
            <div className="space-y-1.5">
              <div className="text-[10px] text-amber-900 bg-amber-100/90 p-1.5 rounded-lg font-semibold border border-amber-200">
                <div className="font-bold flex items-center space-x-1 text-amber-950">
                  <i className="fa-solid fa-clock text-amber-700"></i>
                  <span>Sisa 1 Sesi (8 Jam)</span>
                </div>
                <div className="text-[9px] text-amber-800 truncate mt-0.5">
                  {sameDateTxs[0]?.guestName} (8 Jam)
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button 
                  type="button"
                  onClick={() => openModal('modalRoomDetail', { roomId: room.id })}
                  className="py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs border border-slate-200 flex items-center justify-center space-x-1 transition cursor-pointer"
                  title="Buka rincian sewa & tambah sesi"
                >
                  <i className="fa-solid fa-file-lines text-slate-500 text-[10px]"></i>
                  <span>Rincian Ruangan</span>
                </button>
                <button 
                  type="button"
                  onClick={() => openModal('modalCheckoutSelection', { roomId: room.id, type: 'CANCEL' })} 
                  className="py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg text-xs border border-red-200 flex items-center justify-center space-x-1 transition cursor-pointer"
                  title="Batalkan reservasi"
                >
                  <i className="fa-solid fa-xmark text-[10px]"></i>
                  <span>Batal</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-amber-800 bg-amber-50 p-1.5 rounded font-medium border border-amber-200">
              1 Sesi Terisi: {sameDateTxs[0]?.guestName} (8 Jam)
            </div>
          );
        } else {
          borderClass = 'border-blue-300 bg-blue-50/60';
          statusBadge = <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">Booked</span>;
          btnAction = isRecep ? (
            <div className="space-y-1.5">
              <button 
                onClick={() => openModal('modalCheckin', { roomId: room.id, actionType: 'BOOKING', initialDate: addDaysToDateStr(evalDate, 1) })} 
                className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow flex items-center justify-center space-x-1.5 transition"
              >
                <i className="fa-solid fa-calendar-plus"></i>
                <span>Booking Tgl Lain (+1 Hari)</span>
              </button>
              <div className="grid grid-cols-2 gap-1.5">
                <button 
                  type="button"
                  onClick={() => openModal('modalRoomDetail', { roomId: room.id })}
                  className="py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs border border-slate-200 flex items-center justify-center space-x-1 transition cursor-pointer"
                  title="Buka rincian reservasi"
                >
                  <i className="fa-solid fa-file-lines text-indigo-600 text-[10px]"></i>
                  <span>Rincian Ruangan</span>
                </button>
                <button 
                  onClick={() => openModal('modalCheckoutSelection', { roomId: room.id, type: 'CANCEL' })} 
                  className="py-1 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg text-xs border border-red-200 flex items-center justify-center space-x-1 transition cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-[10px]"></i>
                  <span>Batal</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-blue-800 bg-blue-50 p-1.5 rounded font-medium border border-blue-200">
              Reservasi: {activeRoomTxs[0]?.guestName}
            </div>
          );
        }
      }
    } else {
      // =========================================================================
      // 2. LOGIC GEDUNG (KAMAR PENGINAPAN: GEDUNG A, B, C, D)
      // =========================================================================
      switch(room.status) {
        case 'KOSONG': {
          const bookedTxs = transactions.filter(t => t.roomId === room.id && t.status === 'BOOKED');
          borderClass = 'border-slate-200 bg-white hover:border-hajj-500';
          statusBadge = <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">Kosong</span>;
          
          if (isRecep) {
            const isNeedQc = !room.qcStatus || room.qcStatus !== 'LOLOS_QC';
            btnAction = (
              <div className="space-y-1.5">
                <button 
                  onClick={() => openModal('modalCheckin', { roomId: room.id, actionType: 'CHECKIN', initialDate: realTodayStr })} 
                  className={`w-full py-1.5 font-bold rounded-lg text-xs shadow-xs flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                    isNeedQc
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                  title={
                    isNeedQc
                      ? "Perhatian: Kamar masih berstatus perlu cek QC oleh tim penilai mutu"
                      : (bookedTxs.length > 0 ? "Pilih tamu reservasi atau check-in tamu baru" : "Tamu langsung Cek In hari ini")
                  }
                >
                  <i className={`fa-solid ${isNeedQc ? 'fa-triangle-exclamation text-amber-200' : 'fa-door-open'}`}></i>
                  <span>
                    {isNeedQc
                      ? (bookedTxs.length > 0 ? `Cek In (${bookedTxs.length} Booking - Perlu QC)` : 'Cek In (Perlu Cek QC)')
                      : (bookedTxs.length > 0 ? `Cek In (${bookedTxs.length} Booking)` : 'Cek In')}
                  </span>
                </button>
                <button 
                  onClick={() => openModal('modalCheckin', { roomId: room.id, actionType: 'BOOKING', initialDate: realTomorrowStr })} 
                  className="w-full py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded-lg text-xs border border-blue-200 flex items-center justify-center space-x-1.5 transition cursor-pointer"
                  title="Booking untuk tanggal besok / mendatang"
                >
                  <i className="fa-solid fa-calendar-plus text-blue-600"></i>
                  <span>Booking Tgl Lain</span>
                </button>
              </div>
            );
          } else if (isQc) {
            btnAction = (
              <div className="space-y-1">
                <button 
                  onClick={() => openModal('modalQcInspection', { room })} 
                  className="w-full py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs shadow flex items-center justify-center space-x-1.5 transition"
                >
                  <i className="fa-solid fa-clipboard-check"></i>
                  <span>Inspeksi QC Kamar</span>
                </button>
                <div className="text-[9px] text-slate-500 text-center font-medium">
                  {room.qcStatus === 'LOLOS_QC' ? '✅ Lolos Standar QC' : '⚠️ Perlu Verifikasi QC'}
                </div>
              </div>
            );
          } else if (isTeknisi) {
            btnAction = (
              <div className="space-y-1">
                <button 
                  onClick={() => openModal('modalMaintenance', { roomId: room.id })} 
                  className="w-full py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 font-semibold rounded-lg text-xs flex items-center justify-center space-x-1.5 transition"
                >
                  <i className="fa-solid fa-wrench text-amber-600"></i>
                  <span>Lapor Kerusakan</span>
                </button>
                <div className="text-[9px] text-slate-400 text-center font-medium">Fasilitas Standar OK</div>
              </div>
            );
          } else if (isKoperasi) {
            btnAction = (
              <div className="w-full py-2 bg-slate-50 border border-slate-200 rounded-lg text-center text-[10px] text-slate-500 font-medium">
                <i className="fa-solid fa-bed text-slate-400 mr-1"></i> Kamar Kosong (Tanpa Tamu)
              </div>
            );
          } else {
            btnAction = (
              <div className="w-full text-center text-[10px] text-slate-400 py-1 font-medium">Kamar Kosong</div>
            );
          }
          break;
        }

        case 'BOOKED': {
          const bookedTxs = transactions.filter(t => t.roomId === room.id && t.status === 'BOOKED');
          borderClass = 'border-blue-300 bg-blue-50/60';
          statusBadge = (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white flex items-center space-x-1">
              <span>Booked</span>
              {bookedTxs.length > 1 && <span className="bg-white text-blue-800 rounded-full px-1 text-[9px] font-extrabold">{bookedTxs.length}</span>}
            </span>
          );
          
          if (isRecep) {
            const isNeedQc = !room.qcStatus || room.qcStatus !== 'LOLOS_QC';
            btnAction = (
              <div className="space-y-1.5">
                <div className="text-[10px] text-slate-700 truncate font-bold mb-0.5">
                  <i className="fa-solid fa-calendar-check text-blue-600 mr-1"></i> {activeTx ? activeTx.guestName : (bookedTxs[0]?.guestName || 'Reservasi')}
                </div>
                <button 
                  type="button"
                  onClick={() => openModal('modalCheckin', { roomId: room.id, actionType: 'CHECKIN', initialDate: realTodayStr })} 
                  className={`w-full py-1.5 font-bold rounded-lg text-xs shadow flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                    isNeedQc
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                  title={
                    isNeedQc 
                      ? "Perhatian: Kamar masih berstatus perlu cek QC oleh tim penilai mutu" 
                      : "Pilih data tamu booking untuk proses check-in masuk kamar"
                  }
                >
                  <i className={`fa-solid ${isNeedQc ? 'fa-triangle-exclamation text-amber-200' : 'fa-door-open'}`}></i>
                  <span>
                    {isNeedQc
                      ? `Check-In (${bookedTxs.length} Tamu - Perlu QC)`
                      : `Check-In (${bookedTxs.length} Tamu Booking)`}
                  </span>
                </button>
                <div className="grid grid-cols-3 gap-1">
                  <button 
                    type="button"
                    onClick={() => openModal('modalCheckin', { roomId: room.id, actionType: 'BOOKING', initialDate: realTomorrowStr })} 
                    className="py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded-lg text-[11px] border border-blue-200 flex items-center justify-center space-x-1 transition cursor-pointer"
                    title="Booking untuk tanggal lain / mendatang"
                  >
                    <i className="fa-solid fa-calendar-plus text-blue-600 text-[10px]"></i>
                    <span>Tgl Lain</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => openModal('modalRoomDetail', { roomId: room.id })} 
                    className="py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[11px] border border-slate-200 flex items-center justify-center space-x-1 transition cursor-pointer"
                    title="Buka rincian reservasi dan cetak invoice"
                  >
                    <i className="fa-solid fa-file-invoice text-indigo-600 text-[10px]"></i>
                    <span>Rincian</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => openModal('modalCheckoutSelection', { roomId: room.id, type: 'CANCEL' })} 
                    className="py-1 bg-red-50 text-red-700 hover:bg-red-100 font-semibold rounded-lg text-[11px] border border-red-200 flex items-center justify-center space-x-1 transition cursor-pointer"
                    title="Batalkan reservasi ini"
                  >
                    <i className="fa-solid fa-xmark text-[10px]"></i>
                    <span>Batal</span>
                  </button>
                </div>
              </div>
            );
          } else {
            btnAction = (
              <div className="space-y-1">
                <div className="text-[10px] text-blue-900 bg-blue-100/90 p-1.5 rounded-lg font-medium border border-blue-200">
                  <span className="font-bold">Booking:</span> {activeTx ? activeTx.guestName : (bookedTxs[0]?.guestName || 'Tamu Reservasi')}
                </div>
                {isQc && (
                  <button 
                    onClick={() => openModal('modalQcInspection', { room })} 
                    className="w-full py-1 bg-teal-50 text-teal-800 hover:bg-teal-100 font-semibold rounded text-[11px] border border-teal-200 transition"
                  >
                    <i className="fa-solid fa-clipboard-check mr-1"></i> Cek Kesiapan Kamar
                  </button>
                )}
              </div>
            );
          }
          break;
        }

        case 'TERISI': {
          const bookedTxs = transactions.filter(t => t.roomId === room.id && t.status === 'BOOKED');
          const terisiTxs = transactions.filter(t => t.roomId === room.id && t.status === 'TERISI');
          borderClass = 'border-emerald-300 bg-emerald-50/60';
          statusBadge = (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white flex items-center space-x-1">
              <span>Terisi</span>
              {terisiTxs.length > 1 && (
                <span className="bg-white text-emerald-800 rounded-full px-1.5 py-0 text-[9px] font-extrabold ml-1">
                  {terisiTxs.length} Tamu
                </span>
              )}
            </span>
          );

          if (isRecep) {
            btnAction = (
              <div className="space-y-1.5">
                <div className="text-[10px] text-slate-700 truncate font-bold mb-0.5 flex items-center justify-between">
                  <span className="truncate">
                    <i className="fa-solid fa-user text-emerald-600 mr-1"></i> 
                    {terisiTxs.length > 1 
                      ? `${terisiTxs[0].guestName} (+${terisiTxs.length - 1})` 
                      : (activeTx ? activeTx.guestName : 'Jemaah')}
                  </span>
                  {activeTx?.extraBed && (
                    <span className="text-[9px] px-1 py-0.2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-bold shrink-0 ml-1" title={`${activeTx.extraBedCount || 1} Extra Bed`}>
                      +{activeTx.extraBedCount || 1} Bed
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button 
                    type="button"
                    onClick={() => openModal('modalCheckoutSelection', { roomId: room.id, type: 'CHECKOUT' })} 
                    className="py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs shadow-xs flex items-center justify-center space-x-1 transition cursor-pointer"
                    title="Check-Out tamu dari kamar"
                  >
                    <i className="fa-solid fa-right-from-bracket text-[10px]"></i>
                    <span>Check-Out</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      const nextDate = activeTx ? addDaysToDateStr(activeTx.startDate, activeTx.duration) : addDaysToDateStr(evalDate, 1);
                      openModal('modalCheckin', { roomId: room.id, actionType: 'BOOKING', initialDate: nextDate });
                    }} 
                    className="py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded-lg text-xs border border-blue-200 flex items-center justify-center space-x-1 transition cursor-pointer"
                    title="Booking untuk tanggal setelah tamu checkout"
                  >
                    <i className="fa-solid fa-calendar-plus text-blue-600 text-[10px]"></i>
                    <span>Booking Tgl Lain</span>
                  </button>
                </div>
                {bookedTxs.length > 0 ? (
                  <button 
                    type="button"
                    onClick={() => openModal('modalCheckoutSelection', { roomId: room.id, type: 'CANCEL' })} 
                    className="w-full py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded-lg text-[11px] border border-amber-200 flex items-center justify-center space-x-1 transition cursor-pointer"
                    title="Batalkan reservasi booking tamu yang belum tiba"
                  >
                    <i className="fa-solid fa-ban text-amber-600"></i>
                    <span>Batalkan Booking ({bookedTxs.length})</span>
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={() => openModal('modalRoomDetail', { roomId: room.id })}
                    className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs border border-slate-200 flex items-center justify-center space-x-1.5 transition cursor-pointer"
                    title="Buka rincian lengkap & administrasi kamar"
                  >
                    <i className="fa-solid fa-file-lines text-slate-500 text-[10px]"></i>
                    <span>Rincian Kamar</span>
                  </button>
                )}
              </div>
            );
          } else if (isKoperasi) {
            const hasBreakfast = activeTx?.breakfast;
            btnAction = (
              <div className="space-y-1.5">
                <div className="text-[10px] text-slate-800 bg-orange-50 border border-orange-200 p-1.5 rounded-lg font-medium">
                  <div className="font-bold text-orange-950 truncate">{activeTx?.guestName || 'Tamu Menginap'}</div>
                  <div className="text-[9px] text-orange-800 mt-0.5">
                    {hasBreakfast ? `🍱 ${activeTx?.breakfastMenu} (${activeTx?.breakfastPortions || 1} Porsi)` : '❌ Tidak Pesan Sarapan'}
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('pesananSarapan')} 
                  className="w-full py-1 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded text-xs transition"
                >
                  <i className="fa-solid fa-utensils mr-1"></i> Buka Pesanan Dapur
                </button>
              </div>
            );
          } else {
            btnAction = (
              <div className="space-y-1">
                <div className="text-[10px] text-emerald-900 bg-emerald-50 border border-emerald-200 p-1.5 rounded font-medium">
                  <span className="font-bold">Tamu Menginap:</span> {activeTx?.guestName || 'Jemaah'}
                </div>
                <button 
                  onClick={() => openModal('modalMaintenance', { roomId: room.id })} 
                  className="w-full py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 font-semibold rounded text-[11px] border border-amber-200 transition"
                >
                  <i className="fa-solid fa-wrench mr-1 text-amber-600"></i> Lapor Kendala Kamar
                </button>
              </div>
            );
          }
          break;
        }

        case 'MAINTENANCE': {
          const roomMaint = maintenances.find(m => m.id === room.activeMaintId || (m.roomId === room.id && m.status !== 'SELESAI'));
          const isWaitingQc = room.qcStatus === 'MENUNGGU_QC' || roomMaint?.status === 'MENUNGGU_QC';

          if (isWaitingQc) {
            borderClass = 'border-purple-300 bg-purple-50/70';
            statusBadge = <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-700 text-white animate-pulse">Menunggu QC</span>;
            btnAction = (
              <div className="space-y-1.5">
                {isQc ? (
                  <button 
                    onClick={() => openModal('modalQcInspection', { room })} 
                    className="w-full py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg text-xs shadow flex items-center justify-center space-x-1.5 transition"
                    title="Lakukan inspeksi kelayakan kamar untuk lolos QC"
                  >
                    <i className="fa-solid fa-clipboard-check"></i>
                    <span>Inspeksi QC Kamar</span>
                  </button>
                ) : isTeknisi ? (
                  <button 
                    onClick={() => { if (roomMaint) openModal('modalUpdateMaintenance', { maintenance: roomMaint }); }} 
                    className="w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs shadow flex items-center justify-center space-x-1.5 transition"
                    title="Lihat status verifikasi QC"
                  >
                    <i className="fa-solid fa-clock-rotate-left"></i>
                    <span>Telah Diperbaiki (Menunggu QC)</span>
                  </button>
                ) : (
                  <div className="w-full py-1 px-1.5 bg-purple-100 text-purple-900 rounded text-[10px] font-bold border border-purple-200 text-center">
                    Menunggu Verifikasi QC
                  </div>
                )}
                {isRecep && (
                  <button 
                    onClick={() => openModal('modalCheckin', { roomId: room.id, actionType: 'BOOKING', initialDate: addDaysToDateStr(evalDate, 1) })} 
                    className="w-full py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded-lg text-xs border border-blue-200 flex items-center justify-center space-x-1.5 transition"
                    title="Booking untuk jadwal tanggal berikutnya"
                  >
                    <i className="fa-solid fa-calendar-plus text-blue-600"></i>
                    <span>Booking Tgl Lain (+1 Hari)</span>
                  </button>
                )}
              </div>
            );
          } else {
            borderClass = 'border-amber-300 bg-amber-50/70';
            statusBadge = <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-600 text-white">Maintenance</span>;
            btnAction = (
              <div className="space-y-1.5">
                {isManagerTek && roomMaint?.status === 'MENUNGGU_PENUGASAN' ? (
                  <button 
                    onClick={() => openModal('modalAssignTechnician', { maintenance: roomMaint })} 
                    className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow flex items-center justify-center space-x-1.5 transition"
                  >
                    <i className="fa-solid fa-user-plus"></i>
                    <span>Tugaskan Teknisi</span>
                  </button>
                ) : isTeknisi ? (
                  <button 
                    onClick={() => {
                      if (roomMaint) {
                        openModal('modalUpdateMaintenance', { maintenance: roomMaint });
                      } else {
                        finishMaintenance(room.id);
                      }
                    }} 
                    className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow flex items-center justify-center space-x-1.5 transition"
                    title="Update status perbaikan atau laporkan selesai"
                  >
                    <i className="fa-solid fa-wrench"></i>
                    <span>Update / Selesai Perbaikan</span>
                  </button>
                ) : (
                  <div className="w-full py-1 px-1.5 bg-amber-100/90 text-amber-900 rounded text-[10px] font-bold border border-amber-200 text-center flex items-center justify-center space-x-1">
                    <i className="fa-solid fa-wrench text-amber-700 text-[10px]"></i>
                    <span>Sedang Dikerjakan Teknisi</span>
                  </div>
                )}
                {isRecep && (
                  <button 
                    onClick={() => openModal('modalCheckin', { roomId: room.id, actionType: 'BOOKING', initialDate: addDaysToDateStr(evalDate, 1) })} 
                    className="w-full py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded-lg text-xs border border-blue-200 flex items-center justify-center space-x-1.5 transition"
                    title="Booking untuk jadwal tanggal berikutnya"
                  >
                    <i className="fa-solid fa-calendar-plus text-blue-600"></i>
                    <span>Booking Tgl Lain (+1 Hari)</span>
                  </button>
                )}
              </div>
            );
          }
          break;
        }
      }
    }

    const hasOccupant = !!activeTx;

    return (
      <div 
        key={room.id} 
        className={`p-3 rounded-xl border ${borderClass} shadow-xs flex flex-col justify-between space-y-2.5 relative group hover:shadow-md transition bg-white`}
      >
        <div>
          <div className="flex items-start justify-between gap-1.5">
            <button 
              type="button"
              onClick={() => openModal('modalRoomDetail', { roomId: room.id })}
              className="font-bold text-xs text-slate-800 hover:text-hajj-800 flex items-start gap-2 text-left cursor-pointer min-w-0 flex-1 group/btn"
              title="Klik untuk melihat rincian & kelola kamar ini"
            >
              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${
                isAula ? 'bg-purple-100 text-purple-900 border border-purple-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
              } shrink-0 shadow-2xs`}>
                <i className={`fa-solid ${isAula ? 'fa-landmark text-xs text-purple-700' : 'fa-bed text-xs text-slate-600'}`}></i>
              </span>
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <span className="font-bold text-xs text-slate-900 leading-tight break-words block group-hover/btn:text-hajj-700">
                  {isAula ? room.roomNumber : `Kamar ${room.roomNumber}`}
                </span>
                <span className="text-[10px] text-slate-500 font-medium leading-tight block truncate mt-0.5">
                  {isAula ? 'Ruang Pertemuan (Aula / Rapat)' : `${room.building} • Hunian`}
                </span>
              </div>
            </button>
            <div className="shrink-0 pt-0.5 flex flex-col items-end space-y-1">
              {statusBadge}
              {renderQcBadge(room.qcStatus)}
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 pt-1.5 border-t border-slate-100">
            <span className="inline-flex items-center space-x-1 font-medium">
              <i className={`fa-solid ${isAula ? 'fa-users-line text-hajj-700' : 'fa-users text-slate-400'} text-[10px]`}></i>
              <span>{room.capacity} {isAula ? 'Pax' : 'Orang'}</span>
            </span>
            {isAula ? (
              <span className="text-[9px] font-semibold text-hajj-900 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                Aula / Rapat
              </span>
            ) : (
              <span className="text-[9px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
                {room.type || 'Standar'}
              </span>
            )}
          </div>
        </div>

        <div className="pt-1 border-t border-slate-100 space-y-1">
          {btnAction}
          <div className="flex items-center justify-between gap-1 pt-0.5">
            <button 
              type="button"
              onClick={() => openModal('modalMaintenance', { roomId: room.id })} 
              title="Set Maintenance / Perawatan" 
              className="w-full text-center text-[10px] text-slate-600 hover:text-amber-700 py-1 rounded bg-slate-50 hover:bg-amber-50 border border-slate-200 cursor-pointer transition flex items-center justify-center space-x-1 font-semibold"
            >
              <i className="fa-solid fa-wrench text-[9px] text-amber-600"></i>
              <span>Perawatan</span>
            </button>

            {canManageRooms && (
              <button 
                type="button"
                onClick={() => {
                  setRoomToEdit(room);
                  setIsRoomModalOpen(true);
                }} 
                title="Edit Data Kamar" 
                className="p-1 text-[10px] text-slate-500 hover:text-blue-700 rounded hover:bg-blue-50 cursor-pointer transition"
              >
                <i className="fa-solid fa-pen-to-square"></i>
              </button>
            )}

            {canManageMaster && (
              <button 
                type="button"
                onClick={() => {
                  setDeleteConfirmState({
                    isOpen: true,
                    title: 'Hapus Kamar',
                    itemName: `${room.building} - Kamar ${room.roomNumber}`,
                    itemType: 'Kamar',
                    onConfirm: () => {
                      deleteRoom(room.id);
                      showToast(`Kamar ${room.roomNumber} berhasil dihapus dari database.`, 'info');
                    }
                  });
                }} 
                title="Hapus Kamar" 
                className="p-1 text-[10px] text-slate-400 hover:text-rose-700 rounded hover:bg-rose-50 cursor-pointer transition"
              >
                <i className="fa-solid fa-trash-can"></i>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Sub-Navigation Tabs */}
      <div className="bg-white p-3 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveCatalogTab('ROOMS_GRID')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap ${
              activeCatalogTab === 'ROOMS_GRID'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <i className="fa-solid fa-bed text-emerald-600"></i>
            <span>Denah &amp; Kamar Hunian</span>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full font-bold">
              {rooms.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCatalogTab('BUILDINGS_CATALOG')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap ${
              activeCatalogTab === 'BUILDINGS_CATALOG'
                ? 'bg-white text-blue-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <i className="fa-solid fa-building text-blue-600"></i>
            <span>Katalog Gedung</span>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full font-bold">
              {buildings.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCatalogTab('MEETING_ROOMS_CATALOG')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap ${
              activeCatalogTab === 'MEETING_ROOMS_CATALOG'
                ? 'bg-white text-purple-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <i className="fa-solid fa-landmark text-purple-600"></i>
            <span>Katalog Ruang Pertemuan / Aula</span>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full font-bold">
              {meetingRooms.length}
            </span>
          </button>
        </div>

        {/* Quick Add Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {canManageRooms && (
            <button
              type="button"
              onClick={() => {
                setRoomToEdit(null);
                setIsRoomModalOpen(true);
              }}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-1.5"
            >
              <i className="fa-solid fa-plus"></i>
              <span>Input Kamar</span>
            </button>
          )}

          {canManageMaster && (
            <button
              type="button"
              onClick={() => {
                setBuildingToEdit(null);
                setIsBuildingModalOpen(true);
              }}
              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-1.5"
            >
              <i className="fa-solid fa-plus"></i>
              <span>Input Gedung</span>
            </button>
          )}

          {canManageRooms && (
            <button
              type="button"
              onClick={() => {
                setMeetingRoomToEdit(null);
                setIsMeetingRoomModalOpen(true);
              }}
              className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-1.5"
            >
              <i className="fa-solid fa-plus"></i>
              <span>Input Ruang Pertemuan</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: DENAH & KAMAR HUNIAN */}
      {activeCatalogTab === 'ROOMS_GRID' && (
        <div className="space-y-4">
          {/* Filter & Display Controls Bar */}
          <div className="bg-white p-3 rounded-xl shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <select value={bFilter} onChange={e => setBFilter(e.target.value)} className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-hajj-600 outline-none">
                <option key="all" value="ALL">Semua Gedung, Kamar &amp; Ruang Pertemuan</option>
                {buildings.map(b => (
                  <option key={b.id} value={b.name}>{b.name} - {b.totalRooms || 50} Kamar</option>
                ))}
                <option key="ruang-pertemuan" value="Ruang Pertemuan">Gedung dan Ruang Pertemuan ({meetingRooms.length} Aula / Rapat)</option>
              </select>
              <select value={sFilter} onChange={e => setSFilter(e.target.value)} className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-hajj-600 outline-none">
                <option key="all" value="ALL">Semua Status</option>
                <option key="kosong" value="KOSONG">Kosong (Tersedia)</option>
                <option key="terisi" value="TERISI">Terisi (Check-In)</option>
                <option key="booked" value="BOOKED">Booked (Reservasi)</option>
                <option key="maint" value="MAINTENANCE">Maintenance</option>
              </select>

              {/* Dropdown for hiding rooms */}
              <select 
                value={globalDisplay}
                onChange={e => handleGlobalDisplayChange(e.target.value as 'COLLAPSE' | 'EXPAND')} 
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-hajj-600 outline-none font-semibold text-slate-800"
              >
                <option key="collapse" value="COLLAPSE">Sembunyikan Kamar (Nama Gedung Saja)</option>
                <option key="expand" value="EXPAND">Semua Kamar Terbuka</option>
              </select>
            </div>

            <div className="relative">
              <input 
                type="text" 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari No Kamar / Aula..." 
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 pl-8 focus:ring-2 focus:ring-hajj-600 outline-none w-48 sm:w-60" 
              />
              <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-2.5 text-slate-400 text-xs"></i>
            </div>
          </div>

          <div className="space-y-6">
            {buildingNames.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400">
                <i className="fa-solid fa-building-circle-xmark text-4xl mb-2"></i>
                <p className="text-xs font-semibold">Tidak ada kamar atau gedung yang sesuai dengan filter pencarian.</p>
              </div>
            ) : (
              buildingNames.map(bName => {
                const bRooms = grouped[bName];
                const isCollapsed = isBuildingCollapsed(bName);
                return (
                  <div key={bName} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm space-y-3 transition">
                    {/* Building Header / Accordion Dropdown */}
                    <div 
                      onClick={() => toggleBuilding(bName)}
                      className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer hover:bg-slate-200/75 transition select-none"
                      title="Klik untuk menyembunyikan / menampilkan kamar"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-9 h-9 rounded-xl ${
                          bName === 'Ruang Pertemuan' 
                            ? 'bg-purple-700 text-white border border-purple-800 shadow-xs' 
                            : bName.includes('Arafah')
                            ? 'bg-emerald-800 text-emerald-100 border border-emerald-700 shadow-xs'
                            : bName.includes('Muzdalifah')
                            ? 'bg-blue-800 text-blue-100 border border-blue-700 shadow-xs'
                            : bName.includes('Mina')
                            ? 'bg-teal-800 text-teal-100 border border-teal-700 shadow-xs'
                            : 'bg-amber-800 text-amber-100 border border-amber-700 shadow-xs'
                        } flex items-center justify-center font-bold text-sm shrink-0`}>
                          <i className={`fa-solid ${
                            bName === 'Ruang Pertemuan' ? 'fa-landmark' :
                            bName.includes('Arafah') ? 'fa-kaaba' :
                            bName.includes('Muzdalifah') ? 'fa-mosque' :
                            bName.includes('Mina') ? 'fa-tents' :
                            bName.includes('Madinah') ? 'fa-archway' : 'fa-building'
                          }`}></i>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-bold text-sm text-slate-900">
                              {bName === 'Ruang Pertemuan' ? 'Gedung dan Ruang Pertemuan (Aula / Rapat)' : `${bName} (Kamar Hunian)`}
                            </h3>
                            {isCollapsed && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] rounded font-semibold border border-amber-200">
                                {bName === 'Ruang Pertemuan' ? 'Ruang Disembunyikan' : 'Kamar Disembunyikan'}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {bRooms.length} {bName === 'Ruang Pertemuan' ? 'Ruang Pertemuan' : 'Kamar Hunian'} | {OFFICIAL_TARIFFS[bName]?.desc || 'Tarif Resmi UPT'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2 text-xs flex-wrap gap-y-1">
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded font-semibold">{bRooms.filter(r => r.status === 'KOSONG').length} Tersedia</span>
                          {bName !== 'Ruang Pertemuan' && (
                            <span className="px-2 py-1 bg-emerald-600 text-white rounded font-semibold">{bRooms.filter(r => r.status === 'TERISI').length} Terisi</span>
                          )}
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-semibold">{bRooms.filter(r => r.status === 'BOOKED').length} Booked</span>
                          <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded font-semibold">{bRooms.filter(r => r.status === 'MAINTENANCE').length} Maint</span>
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded font-semibold" title="Kamar/Aula yang memerlukan inspeksi QC">
                            {bRooms.filter(r => !r.qcStatus || r.qcStatus === 'PERLU_INSPEKSI' || r.qcStatus === 'MENUNGGU_QC').length} Perlu QC
                          </span>
                        </div>

                        <button
                          type="button"
                          className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-300/60 transition"
                          aria-label={isCollapsed ? 'Tampilkan Kamar' : 'Sembunyikan Kamar'}
                        >
                          <i className={`fa-solid fa-chevron-${isCollapsed ? 'down' : 'up'}`}></i>
                        </button>
                      </div>
                    </div>

                    {/* Rooms Grid */}
                    {!isCollapsed && (
                      <div className={`p-4 grid gap-3.5 ${
                        bName === 'Ruang Pertemuan'
                          ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                          : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
                      }`}>
                        {bRooms.map(r => getRoomCard(r))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: KATALOG GEDUNG */}
      {activeCatalogTab === 'BUILDINGS_CATALOG' && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2">
                <i className="fa-solid fa-building text-blue-600"></i>
                <span>Katalog Gedung Asrama &amp; Fasilitas UPT</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola daftar gedung, kode fasilitas, jumlah lantai, dan kapasitas hunian di Asrama Haji Jakarta.
              </p>
            </div>

            {canManageMaster && (
              <button
                type="button"
                onClick={() => {
                  setBuildingToEdit(null);
                  setIsBuildingModalOpen(true);
                }}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-2 self-start sm:self-auto"
              >
                <i className="fa-solid fa-plus"></i>
                <span>Tambah Gedung Baru</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 uppercase text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Kode</th>
                  <th className="p-3">Nama Gedung</th>
                  <th className="p-3">Kategori</th>
                  <th className="p-3">Lantai</th>
                  <th className="p-3">Estimasi Kamar</th>
                  <th className="p-3">Kapasitas &amp; Deskripsi</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {buildings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                      Belum ada gedung terdaftar di basis data. Klik tombol di atas untuk menambah gedung.
                    </td>
                  </tr>
                ) : (
                  buildings.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono font-bold text-blue-700">{b.code}</td>
                      <td className="p-3 font-bold text-slate-900">{b.name}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {b.category || 'PENGINAPAN'}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-700">{b.floors || 1} Lantai</td>
                      <td className="p-3 font-bold text-emerald-700">{b.totalRooms || 50} Kamar</td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">{b.capacityDesc || b.description || '-'}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === 'AKTIF' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {canManageMaster ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setBuildingToEdit(b);
                                  setIsBuildingModalOpen(true);
                                }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Edit Gedung"
                              >
                                <i className="fa-solid fa-pen-to-square"></i>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteConfirmState({
                                    isOpen: true,
                                    title: 'Hapus Gedung',
                                    itemName: b.name,
                                    itemType: 'Gedung',
                                    onConfirm: () => {
                                      deleteBuilding(b.id);
                                    }
                                  });
                                }}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Hapus Gedung"
                              >
                                <i className="fa-solid fa-trash-can"></i>
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Hanya Lihat</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: KATALOG RUANG PERTEMUAN / AULA */}
      {activeCatalogTab === 'MEETING_ROOMS_CATALOG' && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2">
                <i className="fa-solid fa-landmark text-purple-600"></i>
                <span>Katalog Ruang Pertemuan, Aula &amp; Rapat</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar lengkap aula serbaguna, kapasitas peserta, fasilitas kelayakan, dan tarif resmi sewa.
              </p>
            </div>

            {canManageRooms && (
              <button
                type="button"
                onClick={() => {
                  setMeetingRoomToEdit(null);
                  setIsMeetingRoomModalOpen(true);
                }}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-2 self-start sm:self-auto"
              >
                <i className="fa-solid fa-plus"></i>
                <span>Tambah Ruang Pertemuan</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {meetingRooms.length === 0 ? (
              <div className="col-span-full p-8 text-center text-slate-400 italic bg-slate-50 rounded-xl border border-slate-200">
                Belum ada ruang pertemuan di database. Klik tombol di atas untuk menambah ruang pertemuan baru.
              </div>
            ) : (
              meetingRooms.map(mr => (
                <div key={mr.id} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-purple-300 shadow-xs transition space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 border border-purple-200 flex items-center justify-center font-bold text-sm shrink-0">
                          <i className="fa-solid fa-landmark"></i>
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 leading-snug">{mr.name}</h4>
                          <span className="text-[10px] text-slate-500 block">{mr.building}</span>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200 shrink-0">
                        {mr.capacity}
                      </span>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-500">Tarif Sewa Harian:</span>
                        <span className="font-bold font-mono text-emerald-700">{formatRupiah(mr.dailyRate)}</span>
                      </div>
                      {mr.sessionRate ? (
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500">Tarif Sewa Per Sesi:</span>
                          <span className="font-bold font-mono text-slate-700">{formatRupiah(mr.sessionRate)}</span>
                        </div>
                      ) : null}

                      <div className="pt-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Fasilitas Utama:</span>
                        <div className="flex flex-wrap gap-1">
                          {mr.facilities.slice(0, 4).map((f, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[9px] font-medium">
                              {f}
                            </span>
                          ))}
                          {mr.facilities.length > 4 && (
                            <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[9px]">
                              +{mr.facilities.length - 4} lainnya
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      mr.status === 'TERSEDIA' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {mr.status}
                    </span>

                    <div className="flex items-center space-x-1">
                      {canManageRooms && (
                        <button
                          type="button"
                          onClick={() => {
                            setMeetingRoomToEdit(mr);
                            setIsMeetingRoomModalOpen(true);
                          }}
                          className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded font-semibold transition"
                        >
                          <i className="fa-solid fa-pen-to-square mr-1"></i>
                          <span>Edit</span>
                        </button>
                      )}

                      {canManageMaster && (
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteConfirmState({
                              isOpen: true,
                              title: 'Hapus Ruang Pertemuan',
                              itemName: mr.name,
                              itemType: 'Ruang Pertemuan / Aula',
                              onConfirm: () => {
                                deleteMeetingRoom(mr.id);
                              }
                            });
                          }}
                          className="px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded font-semibold transition"
                        >
                          <i className="fa-solid fa-trash-can mr-1"></i>
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* CRUD MODALS */}
      <BuildingModal
        isOpen={isBuildingModalOpen}
        onClose={() => {
          setIsBuildingModalOpen(false);
          setBuildingToEdit(null);
        }}
        buildingToEdit={buildingToEdit}
      />

      <MeetingRoomModal
        isOpen={isMeetingRoomModalOpen}
        onClose={() => {
          setIsMeetingRoomModalOpen(false);
          setMeetingRoomToEdit(null);
        }}
        meetingRoomToEdit={meetingRoomToEdit}
      />

      <RoomModal
        isOpen={isRoomModalOpen}
        onClose={() => {
          setIsRoomModalOpen(false);
          setRoomToEdit(null);
        }}
        roomToEdit={roomToEdit}
      />

      <DeleteConfirmModal
        isOpen={deleteConfirmState.isOpen}
        title={deleteConfirmState.title}
        itemName={deleteConfirmState.itemName}
        itemType={deleteConfirmState.itemType}
        onClose={() => setDeleteConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={deleteConfirmState.onConfirm}
      />
    </div>
  );
}
