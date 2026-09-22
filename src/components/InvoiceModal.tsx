import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, Room, ConsolidatedGroupRecord } from '../types';
import { formatIndonesianDate, addDaysToDateStr, getRealTodayDate } from '../lib/utils';
import { useAppContext } from '../store';
import { downloadDirectInvoicePdf, printInvoiceDocument } from '../lib/pdfDownloader';
import { useBodyScrollLock } from '../lib/scrollLock';
import { consolidateGroupTransactions } from '../lib/reportExporter';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  tx: Transaction | null;
  room?: Room | null;
  returnToRoomId?: string | null;
  onReturn?: () => void;
  onExtend?: (tx: Transaction) => void;
  onEdit?: (tx: Transaction) => void;
  groupKey?: string;
  groupRecord?: ConsolidatedGroupRecord;
}

export function InvoiceModal({ 
  isOpen, 
  onClose, 
  tx, 
  room, 
  returnToRoomId, 
  onReturn,
  onExtend,
  onEdit,
  groupKey,
  groupRecord
}: InvoiceModalProps) {
  const { currentUser, rooms, transactions, openModal, showToast, appSettings, dataStorage } = useAppContext();
  const settings = appSettings || dataStorage.getAppSettings();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useBodyScrollLock(isOpen);

  // Mark body with has-invoice-open class when open so @media print works directly with Ctrl+P
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('has-invoice-open');
      return () => {
        document.body.classList.remove('has-invoice-open');
      };
    }
  }, [isOpen]);

  // Consolidate group transactions to perfectly synchronize with ReportsView
  const { rombonganList } = useMemo(() => {
    return consolidateGroupTransactions(transactions, rooms);
  }, [transactions, rooms]);

  const matchedGroup = useMemo(() => {
    if (!tx) return null;
    if (groupRecord) return groupRecord;
    if (groupKey) {
      const found = rombonganList.find(g => g.key === groupKey);
      if (found) return found;
    }
    return rombonganList.find(grp => 
      grp.representativeTx.id === tx.id ||
      (tx.groupId && grp.groupId === tx.groupId) ||
      (tx.groupName && grp.groupName.trim().toLowerCase() === grp.groupName.trim().toLowerCase() && grp.startDate === tx.startDate) ||
      (grp.allRoomNumbers && tx.roomNumber && grp.allRoomNumbers.includes(tx.roomNumber))
    );
  }, [rombonganList, tx, groupKey, groupRecord]);

  if (!isOpen || !tx) return null;

  const currentRoom = room || rooms.find(r => r.id === tx.roomId) || null;
  const resolvedTargetRoomId = returnToRoomId || (currentRoom ? currentRoom.id : tx?.roomId) || null;
  const canGoBack = Boolean(onReturn || resolvedTargetRoomId);

  const isAulaMain = tx.building === 'Ruang Pertemuan';
  const aulaDays = isAulaMain && tx.duration >= 24 ? Math.ceil(tx.duration / 24) : 1;
  const checkoutDate = !isAulaMain ? addDaysToDateStr(tx.startDate, tx.duration) : addDaysToDateStr(tx.startDate, aulaDays);

  // Filter all member transactions belonging to this group / reservation
  const memberTransactions = matchedGroup ? matchedGroup.memberTransactions : transactions.filter(t => {
    if (t.id === tx.id) return true;
    if (tx.groupId && t.groupId === tx.groupId) return true;
    if (tx.isGroup && t.isGroup && tx.groupName && tx.groupName.trim().toLowerCase() === (t.groupName || '').trim().toLowerCase() && tx.startDate === t.startDate) return true;
    if (tx.allocatedRoomNumbers && tx.allocatedRoomNumbers.includes(t.roomNumber)) return true;
    return false;
  });

  // Collect all room numbers from this transaction and member transactions
  const roomNumberSet = new Set<string>();
  if (tx.roomNumber && tx.building !== 'Ruang Pertemuan') {
    roomNumberSet.add(tx.roomNumber);
  }
  if (tx.allocatedRoomNumbers && Array.isArray(tx.allocatedRoomNumbers)) {
    tx.allocatedRoomNumbers.forEach(rn => {
      if (rn) roomNumberSet.add(rn);
    });
  }
  memberTransactions.forEach(m => {
    if (m.building !== 'Ruang Pertemuan' && m.roomNumber) {
      roomNumberSet.add(m.roomNumber);
    }
    if (m.allocatedRoomNumbers && Array.isArray(m.allocatedRoomNumbers)) {
      m.allocatedRoomNumbers.forEach(rn => {
        if (rn) roomNumberSet.add(rn);
      });
    }
  });

  const allocatedRoomNumbers = matchedGroup ? matchedGroup.allRoomNumbers : Array.from(roomNumberSet);
  const isGroupBooking = Boolean(
    tx.isGroup || 
    matchedGroup ||
    allocatedRoomNumbers.length > 1 || 
    (tx.totalPax && tx.totalPax > 1) || 
    memberTransactions.length > 1
  );

  // Map detailed room objects
  const detailedAllocatedRooms = allocatedRoomNumbers.map((rNum, idx) => {
    const roomObj = rooms.find(r => r.roomNumber === rNum);
    const memTx = memberTransactions.find(m => m.roomNumber === rNum);
    const parsedCap = roomObj ? (parseInt(String(roomObj.capacity).replace(/\D/g, ''), 10) || 4) : 4;
    
    // Determine floor based on room number format
    const floorMatch = rNum.match(/[-_]?(\d)\d{2}/);
    const floor = floorMatch ? parseInt(floorMatch[1], 10) : (rNum.includes('-1') ? 1 : rNum.includes('-2') ? 2 : 1);

    return {
      index: idx + 1,
      number: rNum,
      roomId: roomObj?.id || memTx?.roomId || `room-${rNum}`,
      building: roomObj?.building || memTx?.building || tx.building,
      floor,
      type: roomObj?.type || memTx?.category || tx.category || 'Kamar Quad (4 Bed)',
      capacity: parsedCap,
      status: memTx?.status || roomObj?.status || tx.status,
      facilities: ['AC Split', 'Kamar Mandi Dalam', 'Water Heater', 'Linen Bersih']
    };
  });

  // Group rooms by building
  const roomsByBuilding = detailedAllocatedRooms.reduce((acc, rm) => {
    if (!acc[rm.building]) {
      acc[rm.building] = [];
    }
    acc[rm.building].push(rm);
    return acc;
  }, {} as Record<string, typeof detailedAllocatedRooms>);

  const uniqueBuildings = Object.keys(roomsByBuilding);
  const totalCapacity = detailedAllocatedRooms.reduce((acc, r) => acc + r.capacity, 0);

  // Check if Aula / Ruang Pertemuan is involved
  const linkedAulaTx = memberTransactions.find(m => m.building === 'Ruang Pertemuan');
  const hasAula = Boolean(
    isAulaMain || 
    tx.includeAula || 
    tx.rentAulaName || 
    linkedAulaTx
  );

  const resolvedAulaName = tx.rentAulaName || (isAulaMain ? tx.roomNumber : linkedAulaTx?.roomNumber) || 'Aula Serbaguna Utama';
  const resolvedAulaSession = tx.rentAulaSession || (linkedAulaTx ? linkedAulaTx.rentAulaSession : null) || 'Sesi Pagi - Siang (08:00 - 16:00 WIB)';
  const resolvedAulaDurationDays = tx.rentAulaDurationDays || (isAulaMain && tx.durationUnit === 'Hari' ? tx.duration : linkedAulaTx?.rentAulaDurationDays) || 1;
  const resolvedAulaDurationHours = tx.rentAulaDuration || (isAulaMain ? tx.duration : linkedAulaTx?.duration) || 8;
  const resolvedAulaBuilding = isAulaMain ? 'Gedung Serbaguna (Aula Utama)' : 'Gedung Serbaguna UPT Asrama Haji';

  const handleGoBack = () => {
    onClose();
    if (onReturn) {
      onReturn();
    } else if (resolvedTargetRoomId) {
      openModal('modalRoomDetail', { roomId: resolvedTargetRoomId });
    }
  };

  const handlePrint = () => {
    printInvoiceDocument();
  };

  const handleDownloadPdf = () => {
    try {
      setIsGeneratingPdf(true);
      downloadDirectInvoicePdf(
        tx,
        currentRoom,
        currentUser?.fullName || 'Petugas Administrasi',
        currentUser?.role || 'Resepsionis',
        rooms,
        memberTransactions
      );
      showToast(`Berkas PDF Invoice ${tx.id} berhasil diunduh.`, 'success');
    } catch (err) {
      console.error('Download PDF error:', err);
      printInvoiceDocument();
    } finally {
      setTimeout(() => {
        setIsGeneratingPdf(false);
      }, 500);
    }
  };

  return (
    <div 
      id="invoice-modal-overlay" 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto print:overflow-visible print:block print:z-auto"
    >
      <div 
        id="invoice-modal-card" 
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[94vh] my-auto animate-in fade-in zoom-in duration-150 print:max-h-none print:h-auto print:shadow-none print:border-none print:w-full print:overflow-visible print:static print:m-0 print:rounded-none"
      >
        {/* Modal Header Toolbar */}
        <div className="bg-gradient-to-r from-hajj-800 to-hajj-900 px-6 py-3.5 text-white flex items-center justify-between shrink-0 print:hidden border-b border-gold-500/20">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gold-500/20 border border-gold-400/40 text-gold-300 flex items-center justify-center font-bold text-sm">
              <i className="fa-solid fa-file-invoice"></i>
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Lembar Invoice & Dokumen Reservasi Resmi</h3>
              <p className="text-[11px] text-gold-300 font-mono">No. Dokumen: INV-OPR/{tx.id}/{tx.startDate.replace(/-/g, '')}</p>
            </div>
          </div>
          
          <button 
            type="button" 
            onClick={onClose} 
            className="text-white/70 hover:text-white text-lg p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
            title="Tutup lembar invoice"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Modal Content / Printable Invoice Body */}
        <div 
          id="invoice-printable-sheet" 
          className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar flex-1 bg-white text-slate-800 print:p-0 print:m-0 print:overflow-visible print:w-full print:block"
        >
          {/* 1. KOP SURAT RESMI KEMENTERIAN HAJI & UMRAH RI */}
          <div className="border-b-2 border-hajj-900 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center space-x-3.5">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm shrink-0 overflow-hidden ${settings?.appLogo && settings.appLogo.startsWith('data:') ? 'bg-transparent border-0 shadow-none' : 'bg-hajj-800 text-gold-400 border-2 border-gold-400'}`}>
                {settings?.appLogo && settings.appLogo.startsWith('data:') ? (
                  <img src={settings.appLogo} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <i className={`fa-solid ${settings?.appLogo || 'fa-kaaba'}`}></i>
                )}
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black tracking-tight text-hajj-900 leading-tight">
                  {settings.organizationName}
                </h2>
                <p className="text-[10px] uppercase tracking-widest font-black text-gold-600">{settings.ministryName}</p>
                <p className="text-[11px] text-slate-600 font-medium">
                  {settings.subTitle}
                </p>
              </div>
            </div>
            <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4 text-[11px] text-slate-500">
              <p className="font-bold text-slate-700">Lampiran Administrasi Hunian</p>
              <p>{settings.address}</p>
              <p>Email: {settings.email} • Telp: {settings.phone}</p>
            </div>
          </div>

          {/* 2. JUDUL DOKUMEN & METADATA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-hajj-50/80 p-3 rounded-xl border border-hajj-200">
            <div>
              <span className="text-[10px] font-bold text-hajj-700 uppercase tracking-wider block">Dokumen Resmi Akomodasi Non-Finansial</span>
              <h1 className="text-sm sm:text-base font-bold text-slate-900">
                {isGroupBooking 
                  ? 'BUKTI RESERVASI & CHECK-IN ROMBONGAN TERPADU' 
                  : isAulaMain 
                  ? 'BUKTI RESERVASI SEWA RUANG PERTEMUAN (AULA)' 
                  : 'BUKTI CHECK-IN & RESERVASI HUNIAN KAMAR'}
              </h1>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[10px] text-slate-500 block">Status Operasional:</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                tx.status === 'TERISI' 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                  : tx.status === 'BOOKED'
                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                  : tx.status === 'SELESAI'
                  ? 'bg-slate-100 text-slate-700 border border-slate-300'
                  : 'bg-red-100 text-red-700 border border-red-300'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                  tx.status === 'TERISI' ? 'bg-emerald-600' : tx.status === 'BOOKED' ? 'bg-blue-600' : 'bg-slate-500'
                }`}></span>
                {tx.status === 'TERISI' ? 'Check-In (Aktif)' : tx.status === 'BOOKED' ? 'Reservasi Terjadwal' : tx.status}
              </span>
            </div>
          </div>

          {/* 3. RINCIAN DATA TAMU & FASILITAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Box Tamu / Penyewa */}
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-2.5">
              <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 flex items-center justify-between text-xs">
                <span className="flex items-center space-x-1.5">
                  <i className="fa-solid fa-user-tie text-hajj-700"></i>
                  <span>Data Tamu / Penyewa</span>
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  isGroupBooking
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  {isGroupBooking 
                    ? `ROMBONGAN (${tx.totalPax || totalCapacity || 1} PAX)` 
                    : isAulaMain 
                    ? 'PENYEWA RUANG PERTEMUAN'
                    : 'TAMU INDIVIDU / REGULER'}
                </span>
              </h4>
              <div className="space-y-1.5 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Tamu / Entitas:</span>
                  <span className="font-bold text-slate-900 text-right">{tx.groupName || tx.guestName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kategori Registrasi:</span>
                  <span className="font-semibold text-slate-800 text-right">
                    {isGroupBooking 
                      ? `Rombongan (${tx.groupType === 'INSTANSI' ? 'Instansi / Lembaga' : tx.groupType === 'JEMAAH_HAJI' ? 'Jemaah Haji Akbar' : 'Tamu Umum Rombongan'})`
                      : isAulaMain
                      ? 'Penyewaan Fasilitas Aula / Ruang Rapat'
                      : 'Individu (1 Kamar / 1 Penyewa)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kloter / Instansi:</span>
                  <span className="font-semibold text-slate-800 text-right">{tx.kloter || tx.agencyOrDocument || '-'}</span>
                </div>
                {(tx.groupPic || (isGroupBooking && tx.phone)) && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">PIC / Penanggung Jawab:</span>
                    <span className="font-semibold text-slate-800 text-right">
                      {tx.groupPic || tx.guestName} {tx.groupPicPhone ? `(${tx.groupPicPhone})` : ''}
                    </span>
                  </div>
                )}
                {tx.nikKtp && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">NIK / Identitas KTP:</span>
                    <span className="font-mono text-slate-800">{tx.nikKtp}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Kontak / HP:</span>
                  <span className="font-mono text-slate-800">{tx.groupPicPhone || tx.phone || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ID Registrasi Dokumen:</span>
                  <span className="font-mono text-slate-600">{tx.id}</span>
                </div>
              </div>
            </div>

            {/* Box Fasilitas & Durasi */}
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-2.5">
              <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 flex items-center justify-between text-xs">
                <span className="flex items-center space-x-1.5">
                  <i className={`fa-solid ${isAulaMain ? 'fa-landmark text-hajj-700' : 'fa-bed text-hajj-700'}`}></i>
                  <span>{isAulaMain ? 'Fasilitas Ruang Pertemuan' : isGroupBooking ? 'Ringkasan Alokasi Gedung & Kamar' : 'Fasilitas Kamar Hunian'}</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-semibold">
                  {uniqueBuildings.length > 0 ? uniqueBuildings.join(', ') : tx.building}
                </span>
              </h4>
              <div className="space-y-1.5 text-slate-700">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-slate-500 shrink-0">{isAulaMain ? 'Gedung & Ruangan:' : isGroupBooking ? 'Jumlah Gedung & Kamar:' : 'Gedung & Kamar:'}</span>
                  <span className="font-bold text-slate-900 text-right break-words">
                    {isAulaMain 
                      ? `${tx.building} (${tx.roomNumber})`
                      : isGroupBooking 
                      ? `${uniqueBuildings.length} Gedung • ${detailedAllocatedRooms.length} Kamar` 
                      : `${tx.building} - Kamar ${tx.roomNumber}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kapasitas Maksimal:</span>
                  <span className="font-semibold text-slate-800">
                    {isAulaMain 
                      ? `${currentRoom ? currentRoom.capacity : 250} Pax` 
                      : `${totalCapacity} Orang (${detailedAllocatedRooms.length} Kamar)`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isAulaMain ? 'Tgl Pelaksanaan:' : 'Tgl Check-In:'}</span>
                  <span className="font-bold text-slate-900">{formatIndonesianDate(tx.startDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isAulaMain ? 'Estimasi Selesai:' : 'Perkiraan Check-Out:'}</span>
                  <span className="font-bold text-slate-900">{formatIndonesianDate(checkoutDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Durasi Sewa:</span>
                  <span className="font-bold text-hajj-800">
                    {isAulaMain && tx.duration >= 24 ? `${tx.duration / 24} Hari Penuh (${tx.duration} Jam)` : `${tx.duration} ${tx.durationUnit || (isAulaMain ? 'Jam' : 'Malam')}`}
                  </span>
                </div>
                {hasAula && !isAulaMain && (
                  <div className="flex justify-between text-purple-900 font-semibold bg-purple-50 p-1.5 rounded border border-purple-200 text-[11px]">
                    <span className="text-purple-700">Paket Terpadu Aula:</span>
                    <span>{resolvedAulaName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. DATA GEDUNG SAMPAI KAMAR YANG DISEWA */}
          {!isAulaMain && (
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs space-y-0">
              <div className="bg-slate-800 text-white px-4 py-2.5 font-bold flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <i className="fa-solid fa-building-user text-gold-300"></i>
                  <span>
                    Rincian Alokasi Gedung Sampai Kamar yang Disewa ({detailedAllocatedRooms.length} Kamar)
                  </span>
                </div>
                <span className="text-[10px] bg-slate-700 px-2.5 py-0.5 rounded text-slate-200 font-medium">
                  {uniqueBuildings.length} Wilayah Gedung
                </span>
              </div>

              {/* Ringkasan Per Gedung */}
              <div className="p-3 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                {uniqueBuildings.map(bld => {
                  const bldRooms = roomsByBuilding[bld] || [];
                  const bldCap = bldRooms.reduce((acc, r) => acc + r.capacity, 0);
                  return (
                    <div key={bld} className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                      <div className="flex items-center justify-between text-slate-700 font-bold">
                        <span className="flex items-center gap-1.5 text-hajj-800">
                          <i className="fa-solid fa-hotel text-gold-600 text-xs"></i>
                          <span>{bld}</span>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                          {bldRooms.length} Kamar
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Kapasitas: <strong className="text-slate-800">{bldCap} Bed / Orang</strong>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        No: {bldRooms.map(r => r.number).join(', ')}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tabel Rinci Kamar per Gedung */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold text-[11px]">
                      <th className="py-2 px-3 w-10 text-center">No</th>
                      <th className="py-2 px-3">Wilayah Gedung & Lantai</th>
                      <th className="py-2 px-3 font-mono">Nomor Kamar</th>
                      <th className="py-2 px-3">Tipe / Fasilitas Ruangan</th>
                      <th className="py-2 px-3 text-center">Kapasitas</th>
                      <th className="py-2 px-3 text-center">Status Alokasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800 text-xs">
                    {detailedAllocatedRooms.map((rm) => (
                      <tr key={rm.number} className="hover:bg-slate-50/70 transition">
                        <td className="py-2 px-3 text-center text-slate-400 font-medium">{rm.index}</td>
                        <td className="py-2 px-3 font-medium">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900">
                            <i className="fa-solid fa-hotel text-slate-400 text-[10px]"></i>
                            <span>{rm.building}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-normal">Lantai {rm.floor}</span>
                        </td>
                        <td className="py-2 px-3 font-bold text-hajj-800 font-mono text-sm">
                          {rm.number}
                        </td>
                        <td className="py-2 px-3 text-slate-600 text-[11px]">
                          <div className="font-semibold text-slate-800">{rm.type}</div>
                          <div className="text-[10px] text-slate-400">Fasilitas: {rm.facilities.join(', ')}</div>
                        </td>
                        <td className="py-2 px-3 text-center font-semibold">
                          {rm.capacity} Orang
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            rm.status === 'TERISI' 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                              : rm.status === 'BOOKED'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {rm.status === 'TERISI' ? 'Check-In' : rm.status === 'BOOKED' ? 'Reservasi' : rm.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer Ringkasan Kamar & Gedung */}
              <div className="bg-slate-100/90 px-4 py-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-slate-700 font-medium text-xs">
                <div className="flex items-center space-x-3">
                  <span>Total Kamar: <strong className="text-slate-900">{detailedAllocatedRooms.length} Kamar</strong></span>
                  <span>•</span>
                  <span>Total Kapasitas: <strong className="text-slate-900">{totalCapacity} Orang / Pax</strong></span>
                </div>
                <div className="text-slate-500 text-[11px]">
                  Gedung Terkait: <span className="font-semibold text-slate-800">{uniqueBuildings.join(', ')}</span>
                </div>
              </div>
            </div>
          )}

          {/* 5. FASILITAS SEWA RUANG PERTEMUAN (AULA) - DISESUAIKAN SECARA KHUSUS */}
          {hasAula && (
            <div className="border border-purple-200 rounded-xl overflow-hidden text-xs">
              <div className="bg-purple-900 text-white px-4 py-2.5 font-bold flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <i className="fa-solid fa-landmark text-gold-300"></i>
                  <span>
                    {isAulaMain 
                      ? 'Rincian Sewa Fasilitas Ruang Pertemuan (Aula Utama)' 
                      : 'Fasilitas Terpadu Ruang Pertemuan (Aula) Rombongan'}
                  </span>
                </div>
                <span className="text-[10px] bg-purple-800 px-2.5 py-0.5 rounded text-purple-200 font-medium">
                  Operasional Gedung Serbaguna
                </span>
              </div>
              <div className="p-4 bg-purple-50/50 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-white rounded-lg border border-purple-200">
                    <span className="text-slate-400 block text-[10px]">Nama Ruang & Gedung:</span>
                    <strong className="text-purple-950 text-sm block mt-0.5">{resolvedAulaName}</strong>
                    <span className="text-[10px] text-purple-700">{resolvedAulaBuilding}</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-purple-200">
                    <span className="text-slate-400 block text-[10px]">Sesi & Durasi Pelaksanaan:</span>
                    <strong className="text-purple-950 text-xs block mt-0.5">{resolvedAulaSession}</strong>
                    <span className="text-[10px] text-purple-700">Durasi: {resolvedAulaDurationDays} Hari ({resolvedAulaDurationHours} Jam / Sesi)</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-purple-200">
                    <span className="text-slate-400 block text-[10px]">Kapasitas Peserta Ruangan:</span>
                    <strong className="text-purple-950 text-sm block mt-0.5">250 - 500 Pax</strong>
                    <span className="text-[10px] text-purple-700">Format Teater / Seminar</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-lg border border-purple-100 text-purple-900 text-xs space-y-1.5">
                  <span className="font-bold text-purple-950 block text-[11px]">
                    Fasilitas Standard Terpadu Ruang Pertemuan (Aula):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700">
                    <div className="flex items-start gap-1.5">
                      <i className="fa-solid fa-volume-high text-purple-600 mt-0.5"></i>
                      <span>Sound System Gedung 5000 Watt, 4 Mic Wireless & 2 Mic Podium</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <i className="fa-solid fa-snowflake text-purple-600 mt-0.5"></i>
                      <span>Air Conditioner (AC) Central & Exhaust Fan Sirkulasi</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <i className="fa-solid fa-chalkboard-user text-purple-600 mt-0.5"></i>
                      <span>Podium Resmi Kementerian, Panggung Utama, dan Meja VIP</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <i className="fa-solid fa-tv text-purple-600 mt-0.5"></i>
                      <span>Layar Proyektor / Screen Display & Akses Listrik Acara</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 6. LAYANAN KONSUMSI & TAMBAHAN */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <div className="bg-slate-100/90 px-4 py-2 font-bold text-slate-800 border-b border-slate-200 flex items-center justify-between">
              <span>Layanan Konsumsi & Fasilitas Tambahan</span>
              <span className="text-[10px] text-slate-500 font-normal">Koperasi & Dapur UPT</span>
            </div>
            <div className="p-4 bg-white">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <span className="text-slate-400 block text-[10px]">Paket Konsumsi / Katering:</span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {tx.cateringPackage && tx.cateringPackage !== 'TIDAK' ? (
                      <span className="text-orange-700 flex items-center gap-1 font-bold">
                        <i className="fa-solid fa-utensils text-orange-600"></i>
                        <span>{tx.cateringPackage} ({tx.cateringPaxCount || tx.breakfastPortions || tx.totalPax || 1} Pack)</span>
                      </span>
                    ) : tx.breakfast ? (
                      <span className="text-emerald-700 flex items-center gap-1 font-bold">
                        <i className="fa-solid fa-circle-check text-emerald-600"></i>
                        <span>{tx.breakfastMenu || 'Sarapan'} ({tx.breakfastPortions || 1} Porsi)</span>
                      </span>
                    ) : (
                      <span className="text-slate-500 inline-flex items-center gap-1">
                        <i className="fa-solid fa-ban text-slate-400"></i>
                        <span>Tidak Pakai Konsumsi (0 Pack)</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <span className="text-slate-400 block text-[10px]">Extra Bed / Kasur Tambahan:</span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {tx.extraBed ? (
                      <span className="text-indigo-700 flex items-center gap-1 font-bold">
                        <i className="fa-solid fa-circle-check text-indigo-600"></i>
                        <span>+{tx.extraBedCount || 1} Unit Extra Bed</span>
                      </span>
                    ) : (
                      <span className="text-slate-500">Standar Fasilitas Kamar</span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <span className="text-slate-400 block text-[10px]">Format Alokasi Tamu:</span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {isGroupBooking 
                      ? `Rombongan (${tx.totalPax || totalCapacity || 1} Pax, Terpadu)` 
                      : (tx.rentType || (isAulaMain ? 'Sewa Per Jam / Sesi' : 'Sewa Kamar Individu'))}
                  </div>
                </div>
              </div>

              {tx.notes && (
                <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  <span className="font-bold block text-[10px] text-amber-800">Catatan Khusus Tamu / Rombongan:</span>
                  <p className="mt-0.5">{tx.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* 7. KETENTUAN DAN TATA TERTIB */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
            <span className="font-bold text-slate-800 block text-xs">Ketentuan & Tata Tertib Operasional UPT Asrama Haji:</span>
            <ul className="list-disc list-inside space-y-0.5 text-[10px] text-slate-500">
              <li>Waktu standar Check-In pukul 14:00 WIB dan batas waktu Check-Out pukul 12:00 WIB.</li>
              <li>Penyewa wajib menjaga kebersihan, ketertiban, dan keutuhan fasilitas gedung, kamar, dan ruang pertemuan.</li>
              <li>Kehilangan kunci atau kerusakan inventaris akan diselesaikan sesuai SOP pengelola UPT Asrama Haji Jakarta.</li>
            </ul>
          </div>

          {/* 8. KOLOM TANDA TANGAN RESMI (3 PIHAK) */}
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs text-slate-700">
            <div>
              <p className="text-slate-500 font-medium">Penyewa / Ketua Rombongan,</p>
              <div className="h-16 flex items-end justify-center">
                <div className="w-44 border-b border-slate-400 font-bold text-slate-900 pb-1 truncate">
                  {tx.groupPic || tx.guestName}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Tanda Tangan & Nama Terang</p>
            </div>

            <div>
              <p className="text-slate-500 font-medium">Pengelola Sarana & Hunian,</p>
              <div className="h-16 flex items-end justify-center">
                <div className="w-44 border-b border-slate-400 font-bold text-slate-900 pb-1">
                  Tim Pengelola Sarana
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">UPT Asrama Haji Jakarta</p>
            </div>

            <div>
              <p className="text-slate-500 font-medium">
                Jakarta, {formatIndonesianDate(getRealTodayDate())}
              </p>
              <p className="text-slate-500 font-medium">Petugas Front Office / Resepsionis,</p>
              <div className="h-11 flex items-end justify-center">
                <div className="w-44 border-b border-slate-400 font-bold text-slate-900 pb-1 truncate">
                  {currentUser?.fullName || 'Petugas Resepsionis'}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">{currentUser?.role || 'Resepsionis'} • Front Desk</p>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0 print:hidden">
          {canGoBack ? (
            <button
              type="button"
              onClick={handleGoBack}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs transition flex items-center space-x-1.5 cursor-pointer border border-slate-300"
              title="Kembali ke rincian kamar sebelumnya"
            >
              <i className="fa-solid fa-arrow-left text-slate-500 text-[11px]"></i>
              <span>Kembali ke Rincian</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Dokumen Administrasi Resmi UPT Asrama Haji</span>
            </div>
          )}

          <div className="flex items-center flex-wrap gap-2">
            {onExtend && (tx.status === 'TERISI' || tx.status === 'BOOKED') && (
              <button
                type="button"
                onClick={() => onExtend(tx)}
                className="px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold rounded-lg text-xs border border-teal-200 transition flex items-center space-x-1.5 cursor-pointer"
                title="Perpanjang durasi hunian"
              >
                <i className="fa-solid fa-clock-rotate-left text-teal-600"></i>
                <span>Perpanjang</span>
              </button>
            )}

            {onEdit && tx.status === 'BOOKED' && (
              <button
                type="button"
                onClick={() => onEdit(tx)}
                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded-lg text-xs border border-amber-200 transition flex items-center space-x-1.5 cursor-pointer"
                title="Sesuaikan data reservasi"
              >
                <i className="fa-solid fa-pen-to-square text-amber-600"></i>
                <span>Ubah Reservasi</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-lg text-xs shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
              title="Cetak langsung dokumen"
            >
              <i className="fa-solid fa-print"></i>
              <span>Cetak Dokumen</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2 bg-hajj-700 hover:bg-hajj-800 disabled:bg-slate-400 text-white font-bold rounded-lg text-xs shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
              title="Unduh berkas PDF resmi ke perangkat"
            >
              {isGeneratingPdf ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin text-gold-300"></i>
                  <span>Menyiapkan PDF...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-file-pdf text-gold-300"></i>
                  <span>Unduh File PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg text-xs transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
