import React, { useState, useMemo } from 'react';
import { useAppContext } from '../store';
import { motion } from 'motion/react';
import { GroupType, Transaction, Room } from '../types';
import { addDaysToDateStr, formatIndonesianDate, getRealTodayDate } from '../lib/utils';

interface ConsolidatedAgendaItem {
  id: string;
  isGroup: boolean;
  groupId?: string;
  groupName: string;
  groupType?: GroupType;
  picName?: string;
  picPhone?: string;
  roomNumbers: string[];
  roomIds: string[];
  transactions: Transaction[];
  building: string;
  duration: number;
  startDate: string;
  status: string;
}

function groupAgendaTransactions(txs: Transaction[]): ConsolidatedAgendaItem[] {
  const map: Record<string, ConsolidatedAgendaItem> = {};
  const individuals: ConsolidatedAgendaItem[] = [];

  txs.forEach(tx => {
    let key = '';
    let gName = '';
    let detectedType: GroupType = 'UMUM';

    if (tx.groupId) {
      key = tx.groupId;
      detectedType = tx.groupType || (tx.category === 'JEMAAH' ? 'JEMAAH_HAJI' : 'INSTANSI');
      gName = tx.groupName || tx.guestName;
    } else if (tx.category === 'JEMAAH' && tx.kloter && tx.kloter !== '-') {
      key = `KLOTER-${tx.kloter}`;
      detectedType = 'JEMAAH_HAJI';
      gName = `Jemaah Haji Kloter ${tx.kloter}`;
    } else if (tx.notes && tx.notes.includes('[Rombongan:')) {
      const match = tx.notes.match(/\[Rombongan:\s*([^\]]+)\]/);
      gName = match ? match[1] : tx.guestName;
      key = `GRP-${gName.replace(/\s+/g, '-').toUpperCase()}`;
      detectedType = tx.groupType || 'UMUM';
    } else if (tx.groupName && tx.groupName.trim() !== '' && tx.groupName !== tx.guestName) {
      gName = tx.groupName;
      key = `GRP-${gName.replace(/\s+/g, '-').toUpperCase()}`;
      detectedType = tx.groupType || 'UMUM';
    } else if (tx.isGroup || tx.guestType === 'ROMBONGAN' || (tx.allocatedRoomNumbers && tx.allocatedRoomNumbers.length > 1)) {
      gName = tx.groupName || tx.guestName;
      key = `GRP-${gName.replace(/\s+/g, '-').toUpperCase()}`;
      detectedType = tx.groupType || 'UMUM';
    }

    if (key) {
      if (!map[key]) {
        map[key] = {
          id: key,
          isGroup: true,
          groupId: key,
          groupName: gName,
          groupType: detectedType,
          picName: tx.groupPic || tx.phone || '-',
          picPhone: tx.phone || '-',
          roomNumbers: [],
          roomIds: [],
          transactions: [],
          building: tx.building,
          duration: tx.duration,
          startDate: tx.startDate,
          status: tx.status
        };
      }
      map[key].transactions.push(tx);
      if (!map[key].roomNumbers.includes(tx.roomNumber)) {
        map[key].roomNumbers.push(tx.roomNumber);
      }
      if (!map[key].roomIds.includes(tx.roomId)) {
        map[key].roomIds.push(tx.roomId);
      }
    } else {
      individuals.push({
        id: tx.id,
        isGroup: false,
        groupName: tx.guestName,
        picName: tx.phone || '-',
        picPhone: tx.phone || '-',
        roomNumbers: [tx.roomNumber],
        roomIds: [tx.roomId],
        transactions: [tx],
        building: tx.building,
        duration: tx.duration,
        startDate: tx.startDate,
        status: tx.status
      });
    }
  });

  return [...Object.values(map), ...individuals];
}

interface CalendarConsolidatedItem {
  id: string;
  isGroup: boolean;
  groupId?: string;
  title: string;
  groupType?: GroupType;
  roomNumbers: string[];
  count: number;
  status: 'TERISI' | 'BOOKED' | 'CAMPUR';
  building: string;
  transactions: Transaction[];
}

function getConsolidatedCalendarForDate(txs: Transaction[]): CalendarConsolidatedItem[] {
  const map: Record<string, CalendarConsolidatedItem> = {};
  const individuals: CalendarConsolidatedItem[] = [];

  txs.forEach(tx => {
    let key = '';
    let gName = '';
    let detectedType: GroupType = 'UMUM';

    if (tx.groupId) {
      key = tx.groupId;
      detectedType = tx.groupType || (tx.category === 'JEMAAH' ? 'JEMAAH_HAJI' : 'INSTANSI');
      gName = tx.groupName || tx.guestName;
    } else if (tx.category === 'JEMAAH' && tx.kloter && tx.kloter !== '-') {
      key = `KLOTER-${tx.kloter}`;
      detectedType = 'JEMAAH_HAJI';
      gName = `Kloter ${tx.kloter}`;
    } else if (tx.notes && tx.notes.includes('[Rombongan:')) {
      const match = tx.notes.match(/\[Rombongan:\s*([^\]]+)\]/);
      gName = match ? match[1] : tx.guestName;
      key = `GRP-${gName.replace(/\s+/g, '-').toUpperCase()}`;
      detectedType = tx.groupType || 'UMUM';
    }

    if (key) {
      if (!map[key]) {
        map[key] = {
          id: key,
          isGroup: true,
          groupId: key,
          title: gName,
          groupType: detectedType,
          roomNumbers: [],
          count: 0,
          status: tx.status as any,
          building: tx.building,
          transactions: []
        };
      }
      map[key].transactions.push(tx);
      map[key].count += 1;
      if (!map[key].roomNumbers.includes(tx.roomNumber)) {
        map[key].roomNumbers.push(tx.roomNumber);
      }
      if (tx.status === 'TERISI' && map[key].status === 'BOOKED') {
        map[key].status = 'CAMPUR';
      }
    } else {
      individuals.push({
        id: tx.id,
        isGroup: false,
        title: `${tx.roomNumber} (${tx.guestName})`,
        roomNumbers: [tx.roomNumber],
        count: 1,
        status: tx.status as any,
        building: tx.building,
        transactions: [tx]
      });
    }
  });

  return [...Object.values(map), ...individuals];
}

export function Dashboard() {
  const { 
    rooms, 
    transactions, 
    openModal, 
    maintenances, 
    qcInspections, 
    auditLogs, 
    setActiveTab, 
    currentUser, 
    updateBreakfastStatus, 
    showToast, 
    batchCheckinGroup, 
    batchCheckoutGroup
  } = useAppContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [facilityFilter, setFacilityFilter] = useState<'ALL' | 'KAMAR' | 'AULA'>('ALL');
  const [groupTabFilter, setGroupTabFilter] = useState<'ALL' | 'JEMAAH_HAJI' | 'UMUM' | 'INSTANSI'>('ALL');

  const realToday = getRealTodayDate();

  // Role detection for tailored operational dashboard
  const userRole = currentUser?.role || 'Resepsionis';
  const isResepsionis = userRole.includes('Resepsionis') || userRole.includes('Manager Resepsionis');
  const isQc = userRole.includes('QC') || userRole.includes('Quality');
  const isTeknisi = userRole.includes('Teknisi');
  const isKoperasi = userRole.includes('Koperasi');
  const isSuperAdmin = userRole === 'Super Admin' || userRole === 'Admin';

  // Metrics for Rooms & Aula
  const kamarRooms = rooms.filter(r => r.type === "Kamar Penginapan");
  const totalKamar = kamarRooms.length;
  const terisiKamar = kamarRooms.filter(r => r.status === 'TERISI').length;
  const bookedKamar = kamarRooms.filter(r => r.status === 'BOOKED').length;
  const maintKamar = kamarRooms.filter(r => r.status === 'MAINTENANCE').length;
  const kosongKamar = kamarRooms.filter(r => r.status === 'KOSONG').length;
  const occupancyPercent = totalKamar > 0 ? Math.round((terisiKamar / totalKamar) * 100) : 0;

  const aulaRooms = rooms.filter(r => r.building === "Ruang Pertemuan");
  const totalAula = aulaRooms.length;
  const aulaTerisi = aulaRooms.filter(r => r.status === 'TERISI' || r.status === 'BOOKED').length;

  // Active Guests Calculation
  const activeTransactions = transactions.filter(tx => tx.status === 'TERISI');
  const jemaahCount = activeTransactions.filter(tx => tx.category === 'JEMAAH').length;
  const umumCount = activeTransactions.filter(tx => tx.category === 'UMUM').length;

  // Today's Operations
  // 1. Check-In Hari Ini (Kamar Penginapan)
  const checkinTodayList = transactions.filter(tx => {
    return tx.building !== 'Ruang Pertemuan' && tx.status === 'BOOKED' && tx.startDate === realToday;
  });

  // Acara Ruang Pertemuan (Aula) Terlaksana Hari Ini (otomatis terlaksana jika tgl booking == realToday)
  const aulaEventsToday = transactions.filter(tx => {
    return tx.building === 'Ruang Pertemuan' && (tx.status === 'TERISI' || (tx.status === 'BOOKED' && tx.startDate === realToday));
  });

  // 2. Check-Out Hari Ini
  const checkoutTodayList = transactions.filter(tx => {
    if (tx.status !== 'TERISI') return false;
    const checkoutDate = addDaysToDateStr(tx.startDate, tx.duration);
    return checkoutDate === realToday || checkoutDate < realToday;
  });

  // Consolidated Agenda Items (Grouped Rombongan & Individuals)
  const checkinAgendaItems = useMemo(() => {
    return groupAgendaTransactions(checkinTodayList);
  }, [checkinTodayList]);

  const checkoutAgendaItems = useMemo(() => {
    return groupAgendaTransactions(checkoutTodayList);
  }, [checkoutTodayList]);

  // 3. Breakfast Orders Hari Ini
  const activeBreakfastList = transactions.filter(tx => tx.breakfast && tx.breakfastStatus !== 'SELESAI');
  const totalBreakfastPortions = activeBreakfastList.reduce((acc, tx) => acc + (tx.breakfastPortions || 0), 0);

  // 4. Maintenance Issues
  const urgentMaintenances = maintenances.filter(m => m.status !== 'SELESAI' && m.urgency === 'Urgent');
  const activeMaintenances = maintenances.filter(m => m.status !== 'SELESAI');

  // 5. QC Ready Status
  const readyQcRooms = rooms.filter(r => r.qcStatus === 'LOLOS_QC').length;
  const waitingQcRooms = rooms.filter(r => r.qcStatus === 'MENUNGGU_QC').length;
  const inspectionNeededRooms = rooms.filter(r => !r.qcStatus || r.qcStatus === 'PERLU_INSPEKSI').length;

  // 6. Active Kloters Summary
  const activeKloters = useMemo(() => {
    const map: Record<string, { kloter: string; guestName: string; rooms: string[]; jemaahCount: number; startDate: string; duration: number }> = {};
    activeTransactions.forEach(tx => {
      if (tx.category === 'JEMAAH' && tx.kloter) {
        if (!map[tx.kloter]) {
          map[tx.kloter] = {
            kloter: tx.kloter,
            guestName: tx.guestName,
            rooms: [],
            jemaahCount: 0,
            startDate: tx.startDate,
            duration: tx.duration,
          };
        }
        map[tx.kloter].rooms.push(tx.roomNumber);
        map[tx.kloter].jemaahCount += 4; // Standard 4 bed per room
      }
    });
    return Object.values(map);
  }, [activeTransactions]);

  // 6. Comprehensive Group Bookings (Jemaah Haji, Tamu Umum, & Instansi)
  const allGroups = useMemo(() => {
    const map: Record<string, {
      id: string;
      groupName: string;
      groupType: GroupType;
      picName: string;
      picPhone: string;
      roomNumbers: string[];
      roomIds: string[];
      meetingRooms: string[];
      memberCount: number;
      startDate: string;
      duration: number;
      status: string;
      breakfast: boolean;
      extraBed: boolean;
      transactions: Transaction[];
    }> = {};

    transactions.forEach(tx => {
      if (tx.status === 'DIBATALKAN' || tx.status === 'SELESAI') return;

      let key = '';
      let detectedType: GroupType = 'UMUM';
      let gName = '';
      let pic = tx.groupPic || tx.phone || '-';

      if (tx.groupId) {
        key = tx.groupId;
        detectedType = tx.groupType || (tx.category === 'JEMAAH' ? 'JEMAAH_HAJI' : 'INSTANSI');
        gName = tx.groupName || tx.guestName;
      } else if (tx.category === 'JEMAAH' && tx.kloter && tx.kloter !== '-') {
        key = `KLOTER-${tx.kloter}`;
        detectedType = 'JEMAAH_HAJI';
        gName = `Jemaah Haji Kloter ${tx.kloter}`;
      } else if (tx.notes && tx.notes.includes('[Rombongan:')) {
        const match = tx.notes.match(/\[Rombongan:\s*([^\]]+)\]/);
        gName = match ? match[1] : tx.guestName;
        key = `GRP-${gName.replace(/\s+/g, '-').toUpperCase()}`;
        detectedType = tx.groupType || 'UMUM';
      }

      if (key) {
        if (!map[key]) {
          map[key] = {
            id: key,
            groupName: gName,
            groupType: detectedType,
            picName: pic,
            picPhone: tx.phone || '-',
            roomNumbers: [],
            roomIds: [],
            meetingRooms: [],
            memberCount: 0,
            startDate: tx.startDate,
            duration: tx.duration,
            status: tx.status,
            breakfast: false,
            extraBed: false,
            transactions: []
          };
        }
        map[key].transactions.push(tx);
        if (tx.building === 'Ruang Pertemuan') {
          if (!map[key].meetingRooms.includes(tx.roomNumber)) {
            map[key].meetingRooms.push(tx.roomNumber);
          }
        } else {
          if (!map[key].roomNumbers.includes(tx.roomNumber)) {
            map[key].roomNumbers.push(tx.roomNumber);
            map[key].roomIds.push(tx.roomId);
            map[key].memberCount += 4; // standard 4 beds per room
          }
        }
        if (tx.breakfast) map[key].breakfast = true;
        if (tx.extraBed) map[key].extraBed = true;
      }
    });

    return Object.values(map);
  }, [transactions]);

  // Filtered Groups for Dashboard Section
  const filteredGroups = useMemo(() => {
    if (groupTabFilter === 'ALL') return allGroups;
    return allGroups.filter(g => g.groupType === groupTabFilter);
  }, [allGroups, groupTabFilter]);

  // Role-Specific Tailored Datasets
  // For QC: Rooms waiting for QC inspection (vacant or just checked-out)
  const qcPendingRoomsList = useMemo(() => {
    return rooms.filter(r => r.building !== 'Ruang Pertemuan' && (r.qcStatus === 'MENUNGGU_QC' || r.qcStatus === 'PERLU_INSPEKSI' || !r.qcStatus)).slice(0, 4);
  }, [rooms]);

  // For Teknisi: Urgent and active maintenance tickets
  const teknisiWorkList = useMemo(() => {
    return maintenances.filter(m => m.status !== 'SELESAI').slice(0, 4);
  }, [maintenances]);

  // Building Occupancy Breakdown
  const buildings = [
    { name: 'Gedung A (Arafah)', shortName: 'Gedung A (Arafah)', icon: 'fa-kaaba', color: 'emerald' },
    { name: 'Gedung B (Muzdalifah)', shortName: 'Gedung B (Muzdalifah)', icon: 'fa-mosque', color: 'blue' },
    { name: 'Gedung C (Mina)', shortName: 'Gedung C (Mina)', icon: 'fa-tents', color: 'teal' },
    { name: 'Gedung D (Madinah)', shortName: 'Gedung D (Madinah)', icon: 'fa-archway', color: 'amber' },
    { name: 'Ruang Pertemuan', shortName: 'Ruang Pertemuan / Aula', icon: 'fa-handshake', color: 'purple' },
  ];

  const buildingStats = useMemo(() => {
    return buildings.map(b => {
      const bRooms = rooms.filter(r => r.building === b.name);
      const total = bRooms.length;
      const occupied = bRooms.filter(r => r.status === 'TERISI').length;
      const reserved = bRooms.filter(r => r.status === 'BOOKED').length;
      const maintenance = bRooms.filter(r => r.status === 'MAINTENANCE').length;
      const vacant = bRooms.filter(r => r.status === 'KOSONG').length;
      const readyQc = bRooms.filter(r => r.qcStatus === 'LOLOS_QC').length;
      const occPercent = total > 0 ? Math.round((occupied / total) * 100) : 0;
      return {
        ...b,
        total,
        occupied,
        reserved,
        maintenance,
        vacant,
        readyQc,
        occPercent
      };
    });
  }, [rooms]);

  // Calendar Logic
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleResetToCurrent = () => {
    setCurrentDate(new Date());
  };

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [year, month, daysInMonth, firstDayOfMonth]);

  const getTransactionsForDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const checkDateStr = `${y}-${m}-${d}`;

    return transactions.filter(tx => {
      if (tx.status === 'DIBATALKAN' || tx.status === 'SELESAI') return false;
      
      if (facilityFilter === 'KAMAR' && tx.building === 'Ruang Pertemuan') return false;
      if (facilityFilter === 'AULA' && tx.building !== 'Ruang Pertemuan') return false;

      if (tx.building === 'Ruang Pertemuan') {
        const aulaDays = tx.duration >= 24 ? Math.ceil(tx.duration / 24) : 1;
        const aulaEndDateStr = addDaysToDateStr(tx.startDate, aulaDays);
        return checkDateStr >= tx.startDate && checkDateStr < aulaEndDateStr;
      }
      
      const checkoutDateStr = addDaysToDateStr(tx.startDate, tx.duration);
      return checkDateStr >= tx.startDate && checkDateStr < checkoutDateStr;
    });
  };

  // Recent audit logs (latest 4)
  const recentLogs = useMemo(() => {
    return (auditLogs || []).slice(0, 4);
  }, [auditLogs]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto space-y-5"
    >
      {/* 1. TOP LIVE OPERATIONAL OVERVIEW BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">
            Akses Cepat & Panel Kontrol
          </div>
          <p className="text-xs text-slate-600 flex items-center gap-1.5 flex-wrap">
            <span>{formatIndonesianDate(realToday)}</span>
            <span>•</span>
            <span>
              Petugas: <strong className="text-slate-800">{currentUser?.fullName || 'Petugas UPT'}</strong> ({currentUser?.role || 'Staff'})
            </span>
          </p>
        </div>

        {/* Quick Action Bar - Akses Cepat dengan Penataan Lebih Rapi */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Booking Kamar Baru */}
          <button 
            type="button"
            onClick={() => {
              const vacantRoom = rooms.find(r => r.status === 'KOSONG' && r.building !== 'Ruang Pertemuan') || rooms[0];
              if (vacantRoom) {
                const tmr = new Date();
                tmr.setDate(tmr.getDate() + 1);
                const tmrStr = tmr.toISOString().split('T')[0];
                openModal('modalCheckin', { roomId: vacantRoom.id, actionType: 'BOOKING', initialDate: tmrStr });
              } else {
                setActiveTab('gedung');
              }
            }} 
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
            title="Buka form reservasi / booking kamar penginapan"
          >
            <i className="fa-solid fa-calendar-plus text-gold-300 text-[11px]"></i>
            <span>+ Booking Kamar</span>
          </button>

          {/* Registrasi Rombongan */}
          <button 
            type="button"
            onClick={() => openModal('modalGroupRegistration')} 
            className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
            title="Daftarkan rombongan jemaah haji, umum, atau instansi"
          >
            <i className="fa-solid fa-users-rectangle text-gold-400 text-[11px]"></i>
            <span>+ Rombongan</span>
          </button>

          {/* Invoice Resmi */}
          <button 
            type="button"
            onClick={() => {
              const sampleTx = transactions.find(t => t.status === 'TERISI') || transactions[0];
              if (sampleTx) {
                const r = rooms.find(room => room.id === sampleTx.roomId);
                openModal('modalInvoice', { transaction: sampleTx, room: r });
              } else {
                showToast('Belum ada transaksi aktif untuk dicetak invoice.', 'info');
              }
            }} 
            className="px-3.5 py-2 bg-slate-900 hover:bg-hajj-800 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
            title="Buka & cetak invoice resmi transaksi terkini"
          >
            <i className="fa-solid fa-file-invoice text-gold-400 text-[11px]"></i>
            <span>Invoice Resmi</span>
          </button>

          {/* Role Adaptive Quick Actions */}
          {isQc && (
            <button 
              type="button"
              onClick={() => {
                const targetQc = rooms.find(r => r.qcStatus === 'MENUNGGU_VERIFIKASI_QC') || rooms.find(r => r.qcStatus === 'PERLU_PERBAIKAN') || rooms[0];
                if (targetQc) openModal('modalQcInspection', { room: targetQc });
                else setActiveTab('qualityControl');
              }}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
              title="Inspeksi Kendali Mutu Kamar"
            >
              <i className="fa-solid fa-clipboard-check text-[11px]"></i>
              <span>Inspeksi QC</span>
            </button>
          )}

          {isTeknisi && (
            <button 
              type="button"
              onClick={() => setActiveTab('laporanMaintenance')}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
              title="Lihat Daftar Tiket Perbaikan & Sarpras"
            >
              <i className="fa-solid fa-wrench text-[11px]"></i>
              <span>Tiket Teknisi</span>
            </button>
          )}

          {isKoperasi && (
            <button 
              type="button"
              onClick={() => setActiveTab('pesananSarapan')}
              className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
              title="Kelola Pesanan Sarapan Kamar"
            >
              <i className="fa-solid fa-utensils text-[11px]"></i>
              <span>Dapur Sarapan</span>
            </button>
          )}

          {/* Denah Kamar & Check-In */}
          <button 
            type="button"
            onClick={() => setActiveTab('gedung')} 
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
          >
            <i className="fa-solid fa-door-open text-slate-600"></i>
            <span>Denah Kamar</span>
          </button>

          {/* Lapor Kerusakan */}
          <button 
            type="button"
            onClick={() => {
              const defaultRoom = rooms.find(r => r.status === 'KOSONG') || rooms[0];
              openModal('modalMaintenance', { roomId: defaultRoom?.id });
            }} 
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
          >
            <i className="fa-solid fa-triangle-exclamation"></i>
            <span>Lapor Kerusakan</span>
          </button>

          {/* Unduh Laporan */}
          <button 
            type="button"
            onClick={() => openModal('modalExport')} 
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
          >
            <i className="fa-solid fa-file-arrow-down"></i>
            <span>Unduh Laporan</span>
          </button>

          {/* Kelola Anggota (Akses Admin / Super Admin) */}
          {isSuperAdmin && (
            <button 
              type="button"
              onClick={() => setActiveTab('kelolaAnggota')} 
              className="px-3 py-1.5 bg-gold-500 hover:bg-gold-600 text-slate-900 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
              title="Akses Admin: Tambah Anggota & Kelola Hak Akses Petugas"
            >
              <i className="fa-solid fa-users-gear"></i>
              <span>Kelola Anggota</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. EXECUTIVE METRIC CARDS (6 Metrik Utama) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Okupansi Kamar */}
        <div 
          onClick={() => setActiveTab('gedung')}
          className="bg-white p-3.5 rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between hover:border-emerald-400 hover:shadow-sm transition cursor-pointer group"
          title="Klik untuk melihat denah & daftar seluruh kamar"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-emerald-700">Okupansi Kamar</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-black text-[10px] border border-emerald-200">
              {occupancyPercent}%
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-slate-900 group-hover:text-emerald-800">{terisiKamar}<span className="text-xs font-semibold text-slate-400">/{totalKamar}</span></div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div className="bg-emerald-600 h-1.5 rounded-full transition-all" style={{ width: `${occupancyPercent}%` }}></div>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 font-medium flex items-center justify-between">
            <span>{kosongKamar} Kamar Siap Huni</span>
            <i className="fa-solid fa-arrow-right text-[9px] text-slate-400 group-hover:text-emerald-600 transition"></i>
          </span>
        </div>

        {/* Tamu / Jemaah Menginap */}
        <div 
          onClick={() => setActiveTab('gedung')}
          className="bg-white p-3.5 rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between hover:border-emerald-400 hover:shadow-sm transition cursor-pointer group"
          title="Klik untuk melihat daftar tamu dan jemaah yang sedang menginap"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Tamu Menginap</span>
            <i className="fa-solid fa-users text-emerald-600 text-xs"></i>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-emerald-700">{activeTransactions.length} <span className="text-xs font-normal text-slate-500">Kamar</span></div>
            <p className="text-[10px] text-slate-500 mt-0.5">{jemaahCount} Haji • {umumCount} Umum • Est. ~{activeTransactions.length * 4} Orang</p>
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold flex items-center justify-between">
            <span className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Hunian Sedang Aktif</span>
            </span>
            <i className="fa-solid fa-arrow-right text-[9px] text-slate-400 group-hover:text-emerald-600 transition"></i>
          </span>
        </div>

        {/* Reservasi Terjadwal */}
        <div 
          onClick={() => {
            const el = document.getElementById('dashboard-calendar-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-white p-3.5 rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between hover:border-blue-400 hover:shadow-sm transition cursor-pointer group"
          title="Klik untuk menuju ke Kalender Reservasi & Hunian"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Reservasi Terjadwal</span>
            <i className="fa-solid fa-calendar-check text-blue-600 text-xs"></i>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-blue-700">{bookedKamar}</div>
            <p className="text-[10px] text-blue-600 mt-0.5">{checkinTodayList.length} Dijadwalkan Hari Ini</p>
          </div>
          <span className="text-[10px] text-slate-500 flex items-center justify-between">
            <span>Booking Kamar Mendatang</span>
            <i className="fa-solid fa-calendar text-[9px] text-slate-400 group-hover:text-blue-600 transition"></i>
          </span>
        </div>

        {/* Ruang Pertemuan (Aula) */}
        <div 
          onClick={() => {
            setFacilityFilter('AULA');
            const el = document.getElementById('dashboard-calendar-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-white p-3.5 rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between hover:border-purple-400 hover:shadow-sm transition cursor-pointer group"
          title="Klik untuk filter kalender reservasi khusus Ruang Pertemuan / Aula"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Ruang Pertemuan</span>
            <i className="fa-solid fa-handshake text-purple-600 text-xs"></i>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-purple-700">{totalAula}</div>
            <p className="text-[10px] text-purple-600 mt-0.5">{aulaTerisi} Sesi Sewa Digunakan</p>
          </div>
          <span className="text-[10px] text-slate-500 flex items-center justify-between">
            <span>SG-1, SG-2 & Aula Utama</span>
            <i className="fa-solid fa-arrow-right text-[9px] text-slate-400 group-hover:text-purple-600 transition"></i>
          </span>
        </div>

        {/* Maintenance / Perbaikan */}
        <div 
          onClick={() => setActiveTab('laporanMaintenance')}
          className="bg-white p-3.5 rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between hover:border-amber-400 hover:shadow-sm transition cursor-pointer group"
          title="Klik untuk melihat tiket kendala teknis & sarana prasarana"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Maintenance</span>
            <i className="fa-solid fa-screwdriver-wrench text-amber-600 text-xs"></i>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-amber-700">{maintKamar}</div>
            <p className="text-[10px] text-amber-600 mt-0.5">{urgentMaintenances.length} Tiket Urgen</p>
          </div>
          <span className="text-[10px] text-slate-500 flex items-center justify-between">
            <span>{activeMaintenances.length} Dalam Pengerjaan</span>
            <i className="fa-solid fa-arrow-right text-[9px] text-slate-400 group-hover:text-amber-600 transition"></i>
          </span>
        </div>

        {/* Standar Mutu QC */}
        <div 
          onClick={() => setActiveTab('qualityControl')}
          className="bg-white p-3.5 rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between hover:border-teal-400 hover:shadow-sm transition cursor-pointer group"
          title="Klik untuk membuka modul verifikasi Kendali Mutu (QC)"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">Standar Mutu QC</span>
            <i className="fa-solid fa-clipboard-check text-teal-600 text-xs"></i>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-teal-700">{readyQcRooms}</div>
            <p className="text-[10px] text-teal-600 mt-0.5">Kamar Lolos Standar QC</p>
          </div>
          <span className="text-[10px] text-purple-700 font-semibold flex items-center justify-between">
            <span>{waitingQcRooms} Butuh Cek QC</span>
            <i className="fa-solid fa-arrow-right text-[9px] text-slate-400 group-hover:text-teal-600 transition"></i>
          </span>
        </div>
      </div>

      {/* 3. AGENDA OPERASIONAL HARI INI & PRIORITAS PETUGAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Kolom Kiri: Agenda Hari Ini (2 Kolom) */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-xs border border-slate-200 p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-hajj-100 text-hajj-800 flex items-center justify-center font-bold text-xs">
                <i className="fa-solid fa-clock-rotate-left"></i>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Agenda & Prioritas Operasional Hari Ini</h3>
                <p className="text-[11px] text-slate-500">Monitoring jadwal check-in, check-out, dapur, dan penanganan teknis</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-hajj-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              {formatIndonesianDate(realToday)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {/* Check-In Hari Ini Card */}
            <div 
              onClick={() => openModal('modalAgendaList', { type: 'CHECKIN' })}
              className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 transition cursor-pointer space-y-1 shadow-2xs"
              title="Klik untuk membuka daftar lengkap jadwal Check-In hari ini"
            >
              <div className="flex items-center justify-between text-emerald-800">
                <span className="text-[10px] font-bold uppercase">Check-In Kamar</span>
                <i className="fa-solid fa-door-open text-xs"></i>
              </div>
              <div className="text-2xl font-black text-emerald-800">{checkinTodayList.length}</div>
              <p className="text-[10px] text-emerald-700 font-medium line-clamp-1">
                {checkinTodayList.length > 0 ? `${checkinTodayList[0].groupName || checkinTodayList[0].guestName}` : 'Semua telah check-in'}
              </p>
            </div>

            {/* Check-Out Hari Ini Card */}
            <div 
              onClick={() => openModal('modalAgendaList', { type: 'CHECKOUT' })}
              className="p-3 rounded-xl border border-blue-200 bg-blue-50/40 hover:bg-blue-50 transition cursor-pointer space-y-1 shadow-2xs"
              title="Klik untuk membuka daftar lengkap jadwal Check-Out hari ini"
            >
              <div className="flex items-center justify-between text-blue-800">
                <span className="text-[10px] font-bold uppercase">Check-Out</span>
                <i className="fa-solid fa-right-from-bracket text-xs"></i>
              </div>
              <div className="text-2xl font-black text-blue-800">{checkoutTodayList.length}</div>
              <p className="text-[10px] text-blue-700 font-medium line-clamp-1">
                {checkoutTodayList.length > 0 ? `${checkoutTodayList[0].groupName || checkoutTodayList[0].guestName}` : 'Tidak ada kepulangan'}
              </p>
            </div>

            {/* Acara Aula Hari Ini */}
            <div 
              onClick={() => setActiveTab('gedung')}
              className="p-3 rounded-xl border border-purple-200 bg-purple-50/40 hover:bg-purple-50 transition cursor-pointer space-y-1 shadow-2xs"
            >
              <div className="flex items-center justify-between text-purple-800">
                <span className="text-[10px] font-bold uppercase">Acara Aula</span>
                <i className="fa-solid fa-handshake text-xs"></i>
              </div>
              <div className="text-2xl font-black text-purple-800">{aulaEventsToday.length}</div>
              <p className="text-[10px] text-purple-700 font-medium line-clamp-1">
                {aulaEventsToday.length > 0 ? `${aulaEventsToday[0].guestName}` : 'Tidak ada acara'}
              </p>
            </div>

            {/* Sarapan Dapur */}
            <div 
              onClick={() => setActiveTab('pesananSarapan')}
              className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50 transition cursor-pointer space-y-1 shadow-2xs"
            >
              <div className="flex items-center justify-between text-amber-800">
                <span className="text-[10px] font-bold uppercase">Sarapan</span>
                <i className="fa-solid fa-utensils text-xs"></i>
              </div>
              <div className="text-2xl font-black text-amber-800">{totalBreakfastPortions} <span className="text-xs font-semibold">Porsi</span></div>
              <p className="text-[10px] text-amber-700 font-medium line-clamp-1">
                {activeBreakfastList.length} Kamar Menunggu
              </p>
            </div>

            {/* Maintenance & Kerusakan */}
            <div 
              onClick={() => setActiveTab('laporanMaintenance')}
              className="p-3 rounded-xl border border-red-200 bg-red-50/40 hover:bg-red-50 transition cursor-pointer space-y-1 shadow-2xs"
            >
              <div className="flex items-center justify-between text-red-800">
                <span className="text-[10px] font-bold uppercase">Kerusakan</span>
                <i className="fa-solid fa-triangle-exclamation text-xs"></i>
              </div>
              <div className="text-2xl font-black text-red-800">{activeMaintenances.length}</div>
              <p className="text-[10px] text-red-700 font-medium line-clamp-1">
                {urgentMaintenances.length > 0 ? `${urgentMaintenances.length} Urgen` : 'Terkendali'}
              </p>
            </div>
          </div>

          {/* Detailed Actionable Lists: Check-In, Check-Out, & Acara Aula Hari Ini */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            {/* List 1: Reservasi Masuk Hari Ini */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <i className="fa-solid fa-calendar-check text-emerald-600 text-xs"></i>
                  <span>Jadwal Masuk (Check-In)</span>
                </span>
                <button 
                  type="button"
                  onClick={() => openModal('modalAgendaList', { type: 'CHECKIN' })} 
                  className="text-[11px] text-emerald-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Lihat Semua ({checkinTodayList.length}) →</span>
                </button>
              </div>

              {checkinTodayList.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">Tidak ada jadwal check-in baru hari ini.</p>
              ) : (
                <div className="space-y-1.5">
                  {checkinAgendaItems.slice(0, 3).map(item => (
                    <div key={item.id} className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs hover:border-emerald-300 transition shadow-2xs">
                      <div className="min-w-0 pr-1">
                        <div className="font-bold text-slate-900 leading-tight truncate flex items-center gap-1">
                          {item.isGroup && (
                            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded shrink-0">
                              Rombongan
                            </span>
                          )}
                          <span className="truncate">{item.groupName}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                          {item.isGroup ? (
                            `${item.roomNumbers.length} Kamar (${item.roomNumbers.join(', ')}) • ${item.duration} Malam`
                          ) : (
                            `${item.roomNumbers[0]} • ${item.building} • ${item.duration} Malam`
                          )}
                        </div>
                      </div>
                      {item.isGroup ? (
                        <button
                          type="button"
                          onClick={() => batchCheckinGroup(item.groupId || item.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition shrink-0 flex items-center gap-1 shadow-2xs cursor-pointer"
                          title={`Check-In 1 klik untuk seluruh ${item.roomNumbers.length} kamar rombongan ini`}
                        >
                          <i className="fa-solid fa-bolt text-amber-300 text-[9px]"></i>
                          <span>Batch ({item.roomNumbers.length})</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openModal('modalRoomDetail', { roomId: item.roomIds[0] })}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition shrink-0 cursor-pointer"
                        >
                          Check-In
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* List 2: Jadwal Keluar (Check-Out) */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <i className="fa-solid fa-door-closed text-blue-600 text-xs"></i>
                  <span>Jadwal Keluar (Check-Out)</span>
                </span>
                <button 
                  type="button"
                  onClick={() => openModal('modalAgendaList', { type: 'CHECKOUT' })} 
                  className="text-[11px] text-blue-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Lihat Semua ({checkoutTodayList.length}) →</span>
                </button>
              </div>

              {checkoutTodayList.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">Tidak ada jadwal check-out untuk hari ini.</p>
              ) : (
                <div className="space-y-1.5">
                  {checkoutAgendaItems.slice(0, 3).map(item => (
                    <div key={item.id} className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs hover:border-blue-300 transition shadow-2xs">
                      <div className="min-w-0 pr-1">
                        <div className="font-bold text-slate-900 leading-tight truncate flex items-center gap-1">
                          {item.isGroup && (
                            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[9px] font-black rounded shrink-0">
                              Rombongan
                            </span>
                          )}
                          <span className="truncate">{item.groupName}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                          {item.isGroup ? (
                            `${item.roomNumbers.length} Kamar (${item.roomNumbers.join(', ')}) • ${item.building}`
                          ) : (
                            `${item.roomNumbers[0]} • ${item.building}`
                          )}
                        </div>
                      </div>
                      {item.isGroup ? (
                        <button
                          type="button"
                          onClick={() => batchCheckoutGroup(item.groupId || item.id)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold transition shrink-0 flex items-center gap-1 shadow-2xs cursor-pointer"
                          title={`Check-Out 1 klik untuk seluruh ${item.roomNumbers.length} kamar rombongan ini`}
                        >
                          <i className="fa-solid fa-right-from-bracket text-blue-200 text-[9px]"></i>
                          <span>Batch ({item.roomNumbers.length})</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openModal('modalCheckoutSelection', { roomId: item.roomIds[0], type: 'CHECKOUT' })}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold transition shrink-0 cursor-pointer"
                        >
                          Check-Out
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* List 3: Acara Ruang Pertemuan (Aula) Hari Ini */}
            <div className="p-3 bg-purple-50/40 rounded-xl border border-purple-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <i className="fa-solid fa-handshake text-purple-600 text-xs"></i>
                  <span>Acara Ruang Pertemuan Hari Ini</span>
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-200 text-purple-800">
                  Otomatis Terlaksana
                </span>
              </div>

              {aulaEventsToday.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">Tidak ada agenda acara aula hari ini.</p>
              ) : (
                <div className="space-y-1.5">
                  {aulaEventsToday.slice(0, 3).map(tx => (
                    <div key={tx.id} className="p-2 bg-white rounded-lg border border-purple-200 flex items-center justify-between text-xs hover:border-purple-400 transition">
                      <div className="min-w-0 pr-1">
                        <div className="font-bold text-slate-900 leading-tight truncate">{tx.guestName}</div>
                        <div className="text-[10px] text-purple-700 truncate">{tx.roomNumber} • {tx.duration} Jam • Terlaksana</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openModal('modalRoomDetail', { roomId: tx.roomId })}
                        className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded text-[10px] font-bold transition shrink-0"
                      >
                        Rincian
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Keterisian Per Gedung & Aula */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                  <i className="fa-solid fa-building"></i>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Keterisian Per Gedung</h3>
                  <p className="text-[11px] text-slate-500">Status 4 Gedung & Aula</p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 mt-3">
              {buildingStats.map(b => (
                <div key={b.name} className="p-2 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center space-x-1.5 truncate">
                      <i className={`fa-solid ${b.icon} text-slate-400 text-xs`}></i>
                      <span className="truncate">{b.shortName}</span>
                    </span>
                    <span className="text-[11px] font-bold text-slate-700 shrink-0">
                      {b.occupied}/{b.total} ({b.occPercent}%)
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden flex">
                    <div className="bg-emerald-600 h-1.5" style={{ width: `${b.occPercent}%` }} title={`Terisi: ${b.occupied}`}></div>
                    <div className="bg-amber-500 h-1.5" style={{ width: `${b.total > 0 ? (b.maintenance / b.total) * 100 : 0}%` }} title={`Maintenance: ${b.maintenance}`}></div>
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
                    <span>Tersedia: <strong>{b.vacant}</strong></span>
                    {b.maintenance > 0 && <span className="text-amber-700 font-semibold">Maint: {b.maintenance}</span>}
                    <button 
                      onClick={() => setActiveTab('gedung')} 
                      className="text-hajj-700 font-bold hover:underline"
                    >
                      Buka Gedung →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setActiveTab('gedung')}
            className="w-full py-2 bg-slate-900 hover:bg-hajj-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs mt-2"
          >
            <i className="fa-solid fa-cubes"></i>
            <span>Buka Denah Gedung & Kamar</span>
          </button>
        </div>
      </div>

      {/* 4. REGISTRASI & MANAJEMEN DATA ROMBONGAN (HAJI, UMUM, & INSTANSI) */}
      <div className="bg-white p-4 sm:p-5 rounded-xl shadow-xs border border-slate-200 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-hajj-50 text-hajj-800 border border-hajj-200 flex items-center justify-center font-bold text-base shadow-xs shrink-0">
              <i className="fa-solid fa-users-rectangle"></i>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Registrasi & Manajemen Data Rombongan
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {allGroups.length} Rombongan
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Pusat pendataan & alokasi kamar untuk Jemaah Haji (Kloter), Tamu Umum Rombongan, dan Instansi/Kedinasan.
              </p>
            </div>
          </div>

          {/* Action Buttons to Register Different Types of Groups */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openModal('modalGroupRegistration', { defaultGroupType: 'JEMAAH_HAJI' })}
              className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
            >
              <span>🕌</span>
              <span>+ Jemaah Haji</span>
            </button>

            <button
              type="button"
              onClick={() => openModal('modalGroupRegistration', { defaultGroupType: 'UMUM' })}
              className="px-2.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
            >
              <span>👥</span>
              <span>+ Tamu Umum</span>
            </button>

            <button
              type="button"
              onClick={() => openModal('modalGroupRegistration', { defaultGroupType: 'INSTANSI' })}
              className="px-2.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
            >
              <span>🏛️</span>
              <span>+ Instansi</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs for Groups */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setGroupTabFilter('ALL')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${groupTabFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Semua ({allGroups.length})
            </button>
            <button
              type="button"
              onClick={() => setGroupTabFilter('JEMAAH_HAJI')}
              className={`px-3 py-1 rounded-md transition flex items-center space-x-1.5 cursor-pointer ${groupTabFilter === 'JEMAAH_HAJI' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <span>🕌 Jemaah Haji</span>
              <span className="text-[10px] px-1 py-0.2 rounded-full bg-black/10">{allGroups.filter(g => g.groupType === 'JEMAAH_HAJI').length}</span>
            </button>
            <button
              type="button"
              onClick={() => setGroupTabFilter('UMUM')}
              className={`px-3 py-1 rounded-md transition flex items-center space-x-1.5 cursor-pointer ${groupTabFilter === 'UMUM' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <span>👥 Tamu Umum</span>
              <span className="text-[10px] px-1 py-0.2 rounded-full bg-black/10">{allGroups.filter(g => g.groupType === 'UMUM').length}</span>
            </button>
            <button
              type="button"
              onClick={() => setGroupTabFilter('INSTANSI')}
              className={`px-3 py-1 rounded-md transition flex items-center space-x-1.5 cursor-pointer ${groupTabFilter === 'INSTANSI' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <span>🏛️ Instansi / Dinas</span>
              <span className="text-[10px] px-1 py-0.2 rounded-full bg-black/10">{allGroups.filter(g => g.groupType === 'INSTANSI').length}</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-500 font-medium">
            Menampilkan {filteredGroups.length} rombongan terdaftar
          </span>
        </div>

        {/* Group Cards Grid */}
        {filteredGroups.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xl">
              <i className="fa-solid fa-users-slash"></i>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Belum Ada Data Rombongan</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftarkan rombongan baru untuk mengalokasikan kamar & fasilitas aula secara kolektif.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => openModal('modalGroupRegistration', { defaultGroupType: 'JEMAAH_HAJI' })}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
              >
                + Jemaah Haji
              </button>
              <button
                type="button"
                onClick={() => openModal('modalGroupRegistration', { defaultGroupType: 'UMUM' })}
                className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
              >
                + Tamu Umum
              </button>
              <button
                type="button"
                onClick={() => openModal('modalGroupRegistration', { defaultGroupType: 'INSTANSI' })}
                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
              >
                + Instansi / Dinas
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredGroups.map(group => {
              const isHaji = group.groupType === 'JEMAAH_HAJI';
              const isInstansi = group.groupType === 'INSTANSI';
              const badgeBg = isHaji 
                ? 'bg-emerald-700 text-white' 
                : isInstansi 
                  ? 'bg-purple-700 text-white' 
                  : 'bg-blue-700 text-white';
              const borderTheme = isHaji 
                ? 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-300' 
                : isInstansi 
                  ? 'border-purple-200 bg-purple-50/30 hover:border-purple-300' 
                  : 'border-blue-200 bg-blue-50/30 hover:border-blue-300';
              const iconType = isHaji ? 'fa-kaaba' : isInstansi ? 'fa-building-columns' : 'fa-users';
              const typeLabel = isHaji ? 'Jemaah Haji' : isInstansi ? 'Instansi / Kedinasan' : 'Tamu Umum Rombongan';

              // Target transaction for invoice
              const targetTx = group.transactions[0];
              const targetRoom = rooms.find(r => r.id === targetTx?.roomId);

              return (
                <div key={group.id} className={`p-3.5 rounded-xl border ${borderTheme} space-y-3 transition flex flex-col justify-between shadow-2xs`}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${badgeBg} flex items-center space-x-1`}>
                        <i className={`fa-solid ${iconType} text-[9px]`}></i>
                        <span>{typeLabel}</span>
                      </span>
                      <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {group.roomNumbers.length} Kamar {group.meetingRooms.length > 0 && `• ${group.meetingRooms.length} Aula`}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 text-sm leading-tight">{group.groupName}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <i className="fa-solid fa-user-tie text-[10px] text-slate-400"></i>
                        <span>PIC: <strong>{group.picName}</strong> ({group.picPhone})</span>
                      </p>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-200/80 space-y-1 text-[11px]">
                      <div className="flex justify-between text-slate-600">
                        <span>Alokasi Kamar:</span>
                        <span className="font-bold text-slate-800 font-mono text-right truncate max-w-[160px]">
                          {group.roomNumbers.length > 0 ? group.roomNumbers.join(', ') : '-'}
                        </span>
                      </div>
                      {group.meetingRooms.length > 0 ? (
                        <div className="flex justify-between items-center bg-purple-50 px-2 py-1 rounded border border-purple-200 text-purple-800">
                          <span className="flex items-center gap-1 font-semibold">
                            <i className="fa-solid fa-handshake text-purple-600 text-[10px]"></i>
                            <span>Aula / R. Pertemuan:</span>
                          </span>
                          <span className="font-bold text-purple-900">{group.meetingRooms.join(', ')}</span>
                        </div>
                      ) : (
                        <div className="flex justify-between text-slate-400 text-[10px]">
                          <span>Ruang Pertemuan:</span>
                          <span>Tidak Menyewa Aula</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-600">
                        <span>Check-In & Durasi:</span>
                        <span className="font-medium text-slate-700">{group.startDate} ({group.duration} Hari)</span>
                      </div>
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-[10px]">
                        {group.breakfast && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold flex items-center gap-1">
                            <i className="fa-solid fa-utensils text-[9px]"></i>
                            <span>Sarapan</span>
                          </span>
                        )}
                        {group.extraBed && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold flex items-center gap-1">
                            <i className="fa-solid fa-bed text-[9px]"></i>
                            <span>Extra Bed</span>
                          </span>
                        )}
                        <span className="text-slate-400 ml-auto">Est. ~{group.memberCount} Orang</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for group */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    {/* Batch Actions: 1-Click Check-In & Check-Out */}
                    {(() => {
                      const bookedCount = group.transactions.filter(t => t.status === 'BOOKED' && t.building !== 'Ruang Pertemuan').length;
                      const terisiCount = group.transactions.filter(t => t.status === 'TERISI' && t.building !== 'Ruang Pertemuan').length;

                      return (
                        <div className="flex flex-wrap gap-1.5">
                          {bookedCount > 0 && (
                            <button
                              type="button"
                              onClick={() => batchCheckinGroup(group.id)}
                              className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 shadow-xs cursor-pointer"
                              title={`Check-In langsung sekaligus untuk seluruh ${bookedCount} kamar rombongan ini`}
                            >
                              <i className="fa-solid fa-bolt text-amber-300 text-xs"></i>
                              <span>Batch Check-In ({bookedCount})</span>
                            </button>
                          )}
                          {terisiCount > 0 && (
                            <button
                              type="button"
                              onClick={() => batchCheckoutGroup(group.id)}
                              className="flex-1 py-1.5 px-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 shadow-xs cursor-pointer"
                              title={`Check-Out langsung sekaligus untuk seluruh ${terisiCount} kamar rombongan ini`}
                            >
                              <i className="fa-solid fa-right-from-bracket text-red-200 text-xs"></i>
                              <span>Batch Check-Out ({terisiCount})</span>
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    <div className="flex items-center gap-1.5">
                      {targetTx && (
                        <button
                          type="button"
                          onClick={() => openModal('modalInvoice', { transaction: targetTx, room: targetRoom })}
                          className="flex-1 py-1.5 bg-slate-900 hover:bg-hajj-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 shadow-xs cursor-pointer"
                          title="Buka dan cetak invoice resmi rombongan (seluruh kamar)"
                        >
                          <i className="fa-solid fa-file-invoice text-gold-400 text-xs"></i>
                          <span>Invoice Resmi</span>
                        </button>
                      )}

                      {group.roomIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => openModal('modalRoomDetail', { roomId: group.roomIds[0] })}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition cursor-pointer"
                          title="Lihat rincian kamar"
                        >
                          <i className="fa-solid fa-eye"></i>
                        </button>
                      )}


                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. KALENDER RESERVASI & HUNIAN BULANAN */}
      <div id="dashboard-calendar-section" className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 space-y-3 scroll-mt-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center">
              <i className="fa-solid fa-calendar-days text-hajj-700 mr-2"></i>
              Kalender Reservasi & Hunian Bulanan
            </h3>
            <p className="text-xs text-slate-500">Sinkronisasi data riil reservasi Kamar Penginapan & Ruang Pertemuan.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Fasilitas */}
            <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFacilityFilter('ALL')}
                className={`px-2.5 py-1 rounded-md transition ${facilityFilter === 'ALL' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setFacilityFilter('KAMAR')}
                className={`px-2.5 py-1 rounded-md transition flex items-center space-x-1 ${facilityFilter === 'KAMAR' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <span>Gedung (Kamar)</span>
              </button>
              <button
                type="button"
                onClick={() => setFacilityFilter('AULA')}
                className={`px-2.5 py-1 rounded-md transition flex items-center space-x-1 ${facilityFilter === 'AULA' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <span>Ruang Pertemuan</span>
              </button>
            </div>

            <div className="flex items-center space-x-1">
              <button onClick={handlePrevMonth} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition" title="Bulan sebelumnya">
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              <span className="text-xs font-bold text-slate-800 min-w-[125px] text-center">
                {monthNames[month]} {year}
              </span>
              <button onClick={handleNextMonth} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition" title="Bulan berikutnya">
                <i className="fa-solid fa-chevron-right"></i>
              </button>
              <button onClick={handleResetToCurrent} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition">
                Hari Ini
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-slate-600 text-[11px] font-medium">Check-In Kamar (Terisi)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span className="text-slate-600 text-[11px] font-medium">Booking Kamar (Reservasi)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
            <span className="text-slate-600 text-[11px] font-medium">Booking Aula (Ruang Pertemuan)</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-500 bg-slate-100 py-1.5 rounded-t-lg">
              <div>Minggu</div><div>Senin</div><div>Selasa</div><div>Rabu</div><div>Kamis</div><div>Jumat</div><div>Sabtu</div>
            </div>
            <div className="grid grid-cols-7 gap-1 border border-slate-200 rounded-b-lg p-1 bg-slate-50">
              {calendarDays.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="h-20 bg-slate-100/50 rounded-md border border-slate-100/50"></div>;
                
                const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                const dayTxs = getTransactionsForDate(day);
                const consolidatedItems = getConsolidatedCalendarForDate(dayTxs);
                const actualToday = new Date();
                const isToday = day.getDate() === actualToday.getDate() && day.getMonth() === actualToday.getMonth() && day.getFullYear() === actualToday.getFullYear();

                const handleDayClick = () => {
                  const allDayTxs = transactions.filter(tx => {
                    if (tx.status === 'DIBATALKAN' || tx.status === 'SELESAI') return false;
                    if (tx.building === 'Ruang Pertemuan') {
                      const aulaDays = tx.duration >= 24 ? Math.ceil(tx.duration / 24) : 1;
                      const aulaEndDateStr = addDaysToDateStr(tx.startDate, aulaDays);
                      return dateStr >= tx.startDate && dateStr < aulaEndDateStr;
                    }
                    const checkoutDateStr = addDaysToDateStr(tx.startDate, tx.duration);
                    return dateStr >= tx.startDate && dateStr < checkoutDateStr;
                  });
                  openModal('modalCalendarDetail', { dateStr, dayTxs: allDayTxs });
                };

                return (
                  <div key={`day-${day.getDate()}`} onClick={handleDayClick} className="h-20 bg-white p-1 rounded-md border border-slate-200 hover:border-hajj-600 transition cursor-pointer flex flex-col justify-between group shadow-xs overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className={`font-bold text-[11px] ${isToday ? 'w-4 h-4 rounded-full bg-hajj-700 text-white flex items-center justify-center text-[10px]' : 'text-slate-700'}`}>
                        {day.getDate()}
                      </span>
                      {dayTxs.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                    </div>
                    <div className="space-y-0.5 overflow-hidden flex-grow mt-1">
                      {consolidatedItems.slice(0, 2).map((item, tIdx) => {
                        const bg = item.building === "Ruang Pertemuan" 
                          ? "bg-purple-600" 
                          : item.status === "TERISI" 
                            ? "bg-emerald-600" 
                            : item.status === "CAMPUR"
                              ? "bg-indigo-600"
                              : "bg-blue-600";
                        return (
                          <div 
                            key={tIdx} 
                            className={`${bg} text-white text-[9px] px-1 py-0.2 rounded truncate font-medium shadow-2xs flex items-center gap-1`} 
                            title={item.isGroup ? `${item.title} (${item.count} Kamar: ${item.roomNumbers.join(', ')})` : item.title}
                          >
                            {item.isGroup && <i className="fa-solid fa-users text-[8px] shrink-0"></i>}
                            <span className="truncate">
                              {item.isGroup ? `${item.title} (${item.count} Kamar)` : item.title}
                            </span>
                          </div>
                        );
                      })}
                      {consolidatedItems.length > 2 && (
                        <div className="text-[8px] text-slate-500 font-bold px-1">+{consolidatedItems.length - 2} lagi</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 6. LOG AKTIVITAS SISTEM TERKINI */}
      {recentLogs.length > 0 && (
        <div className="bg-white p-3.5 rounded-xl shadow-xs border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs">
            <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
              <i className="fa-solid fa-history"></i>
            </span>
            <span className="font-bold text-slate-800">Aktivitas Terkini:</span>
            <span className="text-slate-600 truncate max-w-lg">
              <strong>{recentLogs[0].userName || recentLogs[0].user}</strong>: {recentLogs[0].details}
            </span>
          </div>
          <button 
            onClick={() => setActiveTab('auditLog')}
            className="text-blue-700 hover:text-blue-900 font-bold text-xs shrink-0 self-end sm:self-auto"
          >
            Buka Log Aktivitas & Shift →
          </button>
        </div>
      )}
    </motion.div>
  );
}
