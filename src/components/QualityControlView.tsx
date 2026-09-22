import { useState } from 'react';
import { useAppContext, isQcRole } from '../store';
import { Room } from '../types';

const BUILDING_ORDER = [
  'Gedung A (Arafah)',
  'Gedung B (Muzdalifah)',
  'Gedung C (Mina)',
  'Gedung D (Madinah)',
  'Ruang Pertemuan',
];

export function QualityControlView() {
  const { rooms, qcInspections = [], currentUser, openModal, setActiveTab, buildings = [], meetingRooms = [] } = useAppContext();
  const [bFilter, setBFilter] = useState('ALL');
  const [qcFilter, setQcFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'ROOMS' | 'HISTORY'>('ROOMS');
  const [globalDisplay, setGlobalDisplay] = useState<'COLLAPSE' | 'EXPAND'>('COLLAPSE');
  const [buildingOverrides, setBuildingOverrides] = useState<Record<string, boolean>>({});

  const canInspect = isQcRole(currentUser?.role);

  // Filtered rooms
  const filteredRooms = rooms.filter(r => {
    if (bFilter !== 'ALL' && r.building !== bFilter) return false;
    if (qcFilter !== 'ALL') {
      const roomQc = r.qcStatus || 'PERLU_INSPEKSI';
      if (roomQc !== qcFilter) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const matchRoom = r.roomNumber.toLowerCase().includes(q);
      const matchBldg = r.building.toLowerCase().includes(q);
      const matchNotes = (r.lastQcNotes || '').toLowerCase().includes(q);
      const matchBy = (r.lastQcBy || '').toLowerCase().includes(q);
      if (!matchRoom && !matchBldg && !matchNotes && !matchBy) return false;
    }
    return true;
  });

  // Group rooms by building
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

  // KPI Metrics
  const totalRooms = rooms.length;
  const lolosQcCount = rooms.filter(r => r.qcStatus === 'LOLOS_QC').length;
  const menungguQcCount = rooms.filter(r => r.qcStatus === 'MENUNGGU_QC').length;
  const perluPerbaikanCount = rooms.filter(r => r.qcStatus === 'PERLU_PERBAIKAN').length;
  const perluInspeksiCount = rooms.filter(r => !r.qcStatus || r.qcStatus === 'PERLU_INSPEKSI').length;

  const getQcBadge = (status?: string, compact = true) => {
    switch (status) {
      case 'LOLOS_QC':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <i className="fa-solid fa-circle-check mr-1 text-emerald-600 text-[8px]"></i>
            {compact ? 'Lolos QC' : 'Lolos QC (Siap Pakai)'}
          </span>
        );
      case 'MENUNGGU_QC':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-hajj-900 border border-amber-300 animate-pulse">
            <i className="fa-solid fa-bell mr-1 text-amber-600 text-[8px]"></i>
            {compact ? 'Cek QC' : 'Telah Diperbaiki (Cek QC)'}
          </span>
        );
      case 'PERLU_PERBAIKAN':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-800 border border-red-300">
            <i className="fa-solid fa-triangle-exclamation mr-1 text-red-600 text-[8px]"></i>
            {compact ? 'Perbaikan' : 'Perlu Perbaikan'}
          </span>
        );
      case 'PERLU_INSPEKSI':
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <i className="fa-solid fa-clock-rotate-left mr-1 text-amber-600 text-[8px]"></i>
            {compact ? 'Perlu Cek' : 'Perlu Inspeksi Rutin'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-xs hover:border-emerald-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Lolos QC (Siap Huni)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm border border-emerald-100">
              <i className="fa-solid fa-circle-check"></i>
            </div>
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-black text-slate-900">{lolosQcCount}</span>
            <span className="text-xs font-bold text-emerald-600">{Math.round((lolosQcCount / totalRooms) * 100)}%</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.round((lolosQcCount / totalRooms) * 100)}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">Standar mutu kamar siap digunakan</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-200/90 shadow-xs hover:border-purple-300 transition bg-purple-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
              <span>Perlu Cek QC</span>
              {menungguQcCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping"></span>
              )}
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-sm border border-purple-200">
              <i className="fa-solid fa-bell"></i>
            </div>
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-black text-purple-900">{menungguQcCount}</span>
            <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">Prioritas</span>
          </div>
          <div className="w-full bg-purple-100/70 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-purple-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.round((menungguQcCount / totalRooms) * 100) * 3)}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-purple-700 mt-1.5 font-medium">Hasil perbaikan teknisi menunggu verifikasi</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200/80 shadow-xs hover:border-rose-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Perlu Perbaikan</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-sm border border-rose-100">
              <i className="fa-solid fa-wrench"></i>
            </div>
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-black text-slate-900">{perluPerbaikanCount}</span>
            <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">Teknisi</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-rose-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.round((perluPerbaikanCount / totalRooms) * 100) * 3)}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">Kamar dengan kendala dalam perbaikan</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-xs hover:border-amber-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Perlu Inspeksi Rutin</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-sm border border-amber-100">
              <i className="fa-solid fa-clipboard-list"></i>
            </div>
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-black text-slate-900">{perluInspeksiCount}</span>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Rutin</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.round((perluInspeksiCount / totalRooms) * 100)}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">Selesai checkout & reservasi baru</p>
        </div>
      </div>

      {/* Navigation Sub-Tabs & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveSubTab('ROOMS')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center space-x-2 ${
              activeSubTab === 'ROOMS'
                ? 'bg-white text-teal-800 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <i className="fa-solid fa-door-open"></i>
            <span>Status Kamar & Gedung</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeSubTab === 'ROOMS' ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {filteredRooms.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('HISTORY')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center space-x-2 ${
              activeSubTab === 'HISTORY'
                ? 'bg-white text-teal-800 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <i className="fa-solid fa-clock-rotate-left"></i>
            <span>Riwayat Log QC</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeSubTab === 'HISTORY' ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {qcInspections.length}
            </span>
          </button>
        </div>

        {/* Download QC Report Buttons */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={() => openModal('modalExport', { 
              defaultType: 'QC', 
              defaultQcMode: activeSubTab === 'ROOMS' ? 'READINESS' : 'HISTORY',
              defaultBuilding: bFilter,
              defaultFormat: 'PDF'
            })}
            className="px-3 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition text-xs cursor-pointer"
            title="Cetak / Unduh Dokumen PDF Resmi QC (Kop Kementerian Haji dan Umrah RI)"
          >
            <i className="fa-solid fa-file-pdf"></i>
            <span>PDF QC</span>
          </button>
          <button
            onClick={() => openModal('modalExport', { 
              defaultType: 'QC', 
              defaultQcMode: activeSubTab === 'ROOMS' ? 'READINESS' : 'HISTORY',
              defaultBuilding: bFilter,
              defaultFormat: 'XLSX'
            })}
            className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition text-xs cursor-pointer"
            title="Unduh Spreadsheet Excel (.xlsx) QC"
          >
            <i className="fa-solid fa-file-excel"></i>
            <span>Excel (.xlsx)</span>
          </button>
          <button
            onClick={() => openModal('modalExport', { 
              defaultType: 'QC', 
              defaultQcMode: activeSubTab === 'ROOMS' ? 'READINESS' : 'HISTORY',
              defaultBuilding: bFilter 
            })}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition text-xs cursor-pointer"
            title="Kustomisasi Laporan QC (Filter Gedung, Periode & Mode)"
          >
            <i className="fa-solid fa-sliders"></i>
            <span>Opsi Lengkap</span>
          </button>
        </div>
      </div>

      {/* SUB-VIEW 1: ROOMS INSPECTION GROUPED BY BUILDING & AULA */}
      {activeSubTab === 'ROOMS' && (
        <div className="space-y-5">
          {/* Filters Bar & View Controls - Aligned with RoomsView benchmark */}
          <div className="bg-white p-3 rounded-xl shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={bFilter}
                onChange={e => setBFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-hajj-600 outline-none font-semibold text-slate-800"
              >
                <option key="all" value="ALL">Semua Gedung & Aula</option>
                {buildings.map(b => (
                  <option key={b.id} value={b.name}>{b.name} - {b.totalRooms || 50} Kamar</option>
                ))}
                <option key="ruang-pertemuan" value="Ruang Pertemuan">Ruang Pertemuan / Aula ({meetingRooms.length || 13} Ruangan)</option>
              </select>

              <select
                value={qcFilter}
                onChange={e => setQcFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-hajj-600 outline-none font-semibold text-slate-800"
              >
                <option key="all" value="ALL">Semua Status QC</option>
                <option key="menunggu" value="MENUNGGU_QC">🟣 Perlu Cek QC (Pasca Teknisi)</option>
                <option key="lolos" value="LOLOS_QC">🟢 Lolos QC (Siap Pakai)</option>
                <option key="inspeksi" value="PERLU_INSPEKSI">🟡 Perlu Inspeksi Rutin</option>
                <option key="perbaikan" value="PERLU_PERBAIKAN">🔴 Perlu Perbaikan (Teknisi)</option>
              </select>

              {/* Dropdown for hiding rooms - Default COLLAPSE matching RoomsView */}
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
                placeholder="Cari No Kamar / Aula..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 pl-8 focus:ring-2 focus:ring-hajj-600 outline-none w-48 sm:w-60 text-slate-800 placeholder-slate-400"
              />
              <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-2.5 text-slate-400 text-xs"></i>
            </div>
          </div>

          {/* Grouped by Building & Aula */}
          <div className="space-y-6">
            {buildingNames.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400">
                <i className="fa-solid fa-building-circle-xmark text-4xl mb-2"></i>
                <p className="text-xs font-semibold">Tidak ada kamar atau aula yang sesuai dengan filter QC.</p>
              </div>
            ) : (
              buildingNames.map(bName => {
                const bRooms = grouped[bName];
                const isCollapsed = isBuildingCollapsed(bName);
                const isMeetingRoom = bName === 'Ruang Pertemuan';
                const bLolos = bRooms.filter(r => r.qcStatus === 'LOLOS_QC').length;
                const bMenunggu = bRooms.filter(r => r.qcStatus === 'MENUNGGU_QC').length;
                const bPerluPerbaikan = bRooms.filter(r => r.qcStatus === 'PERLU_PERBAIKAN').length;
                const bPerluInspeksi = bRooms.filter(r => !r.qcStatus || r.qcStatus === 'PERLU_INSPEKSI').length;

                return (
                  <div key={bName} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm space-y-3 transition">
                    {/* Building Header / Accordion Dropdown Toggle matching RoomsView */}
                    <div
                      onClick={() => toggleBuilding(bName)}
                      className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer hover:bg-slate-200/75 transition select-none"
                      title="Klik untuk menyembunyikan / menampilkan kamar"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-9 h-9 rounded-xl ${
                          isMeetingRoom 
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
                            isMeetingRoom ? 'fa-landmark' :
                            bName.includes('Arafah') ? 'fa-kaaba' :
                            bName.includes('Muzdalifah') ? 'fa-mosque' :
                            bName.includes('Mina') ? 'fa-tents' :
                            bName.includes('Madinah') ? 'fa-archway' : 'fa-building'
                          }`}></i>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-bold text-sm text-slate-900">
                              {isMeetingRoom ? 'Gedung dan Ruang Pertemuan (Aula / Rapat)' : `${bName} (Kamar Hunian)`}
                            </h3>
                            {isCollapsed && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] rounded font-semibold border border-amber-200">
                                {isMeetingRoom ? 'Ruang Disembunyikan' : 'Kamar Disembunyikan'}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">{bRooms.length} {isMeetingRoom ? 'Ruangan' : 'Kamar'} | Standar Mutu & Higienitas QC</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded font-semibold">
                            {bLolos} Lolos QC
                          </span>
                          {bMenunggu > 0 && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-900 border border-purple-300 rounded font-bold animate-pulse">
                              {bMenunggu} Cek QC
                            </span>
                          )}
                          {bPerluPerbaikan > 0 && (
                            <span className="px-2 py-1 bg-rose-100 text-rose-800 rounded font-semibold">
                              {bPerluPerbaikan} Perlu Perbaikan
                            </span>
                          )}
                          <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded font-semibold">
                            {bPerluInspeksi} Perlu Cek
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

                    {/* Rooms Grid - 5 columns per row for Gedung Kamar */}
                    {!isCollapsed && (
                      <div className={`p-3.5 grid ${
                        isMeetingRoom 
                          ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5' 
                          : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-2'
                      }`}>
                        {bRooms.map((room: Room) => {
                          const qc = room.qcStatus || 'PERLU_INSPEKSI';
                          let cardBg = 'bg-white border-slate-200';
                          if (qc === 'LOLOS_QC') cardBg = 'bg-white border-emerald-300 hover:border-emerald-400';
                          if (qc === 'MENUNGGU_QC') cardBg = 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-300/70 shadow-xs';
                          if (qc === 'PERLU_PERBAIKAN') cardBg = 'bg-white border-rose-200 hover:border-rose-300';
                          if (qc === 'PERLU_INSPEKSI') cardBg = 'bg-white border-amber-200 hover:border-amber-300';

                          return (
                            <div key={room.id} className={`p-2.5 rounded-xl border ${cardBg} shadow-2xs flex flex-col justify-between hover:shadow-md transition bg-white`}>
                              <div>
                                {qc === 'MENUNGGU_QC' && (
                                  <div className="mb-2 -mt-0.5 -mx-0.5 px-2 py-0.5 rounded-lg bg-amber-100 text-hajj-900 text-[9px] font-bold flex items-center justify-between border border-amber-300">
                                    <span className="flex items-center">
                                      <i className="fa-solid fa-bolt mr-1 text-amber-600 text-[8px]"></i> Siap Cek Pasca Teknisi
                                    </span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping"></span>
                                  </div>
                                )}

                                <div className="flex items-start justify-between gap-1">
                                  <div className="flex items-center space-x-1.5 min-w-0">
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                      isMeetingRoom ? 'bg-purple-100 text-purple-900 border border-purple-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
                                    }`}>
                                      <i className={`fa-solid ${isMeetingRoom ? 'fa-landmark text-purple-700' : 'fa-bed text-slate-600'}`}></i>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <span className="text-xs font-bold text-slate-900 leading-tight block truncate">
                                        {isMeetingRoom ? room.roomNumber : `Kamar ${room.roomNumber}`}
                                      </span>
                                      <span className="text-[9px] text-slate-500 font-medium leading-tight block truncate mt-0.5">
                                        {isMeetingRoom ? 'Ruang Pertemuan' : room.building}
                                      </span>
                                    </div>
                                  </div>
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold shrink-0 ${
                                    room.status === 'TERISI' ? 'bg-emerald-600 text-white' :
                                    room.status === 'BOOKED' ? 'bg-blue-600 text-white' :
                                    room.status === 'MAINTENANCE' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {room.status}
                                  </span>
                                </div>

                                <div className="mt-2 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Status QC</span>
                                    {getQcBadge(room.qcStatus, true)}
                                  </div>

                                  {room.lastQcDate && (
                                    <div className="text-[9px] text-slate-600 flex items-center justify-between">
                                      <span className="text-slate-400">Inspeksi:</span>
                                      <span className="font-semibold text-slate-700 font-mono text-[9px]">{room.lastQcDate}</span>
                                    </div>
                                  )}

                                  {room.lastQcBy && (
                                    <div className="text-[9px] text-slate-600 flex items-center justify-between">
                                      <span className="text-slate-400">Pemeriksa:</span>
                                      <span className="font-semibold text-slate-700 flex items-center text-[9px] truncate max-w-[85px]" title={room.lastQcBy}>
                                        <i className="fa-solid fa-user-check text-teal-600 mr-1 text-[8px]"></i>
                                        {room.lastQcBy}
                                      </span>
                                    </div>
                                  )}

                                  {room.lastQcNotes && (
                                    <div className="text-[9px] text-slate-700 italic bg-slate-50 p-1 rounded border border-slate-100 line-clamp-1 mt-0.5" title={room.lastQcNotes}>
                                      "{room.lastQcNotes}"
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5">
                                {canInspect ? (
                                  <button
                                    type="button"
                                    onClick={() => openModal('modalQcInspection', { room })}
                                    className={`w-full py-1 font-bold rounded-lg text-[10px] shadow-xs flex items-center justify-center space-x-1 transition cursor-pointer ${
                                      qc === 'MENUNGGU_QC'
                                        ? 'bg-amber-600 hover:bg-amber-700 text-white ring-1 ring-amber-400 font-extrabold'
                                        : 'bg-teal-700 hover:bg-teal-800 text-white'
                                    }`}
                                  >
                                    <i className={`fa-solid ${qc === 'MENUNGGU_QC' ? 'fa-stamp' : 'fa-clipboard-check'} text-[9px]`}></i>
                                    <span>{qc === 'MENUNGGU_QC' ? 'Verifikasi QC' : 'Inspeksi QC'}</span>
                                  </button>
                                ) : (
                                  <div className="text-center text-[9px] text-slate-400 italic py-0.5">
                                    <i className="fa-solid fa-lock mr-1 text-slate-300 text-[8px]"></i> Khusus QC
                                  </div>
                                )}

                                <div className="flex items-center space-x-1 pt-0.5">
                                  {qc === 'PERLU_PERBAIKAN' && (
                                    <button
                                      type="button"
                                      onClick={() => openModal('modalMaintenance', { roomId: room.id })}
                                      className="flex-1 py-0.5 px-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded text-[9px] font-bold transition flex items-center justify-center space-x-1 cursor-pointer"
                                      title="Laporkan tiket perbaikan fasilitas ke tim teknisi"
                                    >
                                      <i className="fa-solid fa-wrench text-[8px]"></i>
                                      <span>Perbaikan</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setActiveTab('gedung')}
                                    className="flex-1 py-0.5 px-1 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded text-[9px] font-semibold transition flex items-center justify-center space-x-1 cursor-pointer"
                                    title="Buka lokasi kamar di denah gedung"
                                  >
                                    <i className="fa-solid fa-door-open text-[8px]"></i>
                                    <span>Denah</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: INSPECTION AUDIT HISTORY */}
      {activeSubTab === 'HISTORY' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center">
              <i className="fa-solid fa-list-check text-teal-600 mr-2"></i>
              Buku Log Inspeksi Mutu & Kesiapan Kamar (QC Audit Trail)
            </h3>
            <span className="text-[11px] text-slate-500">Total {qcInspections.length} pemeriksaan tercatat</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 uppercase text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Waktu Inspeksi</th>
                  <th className="p-3">Kamar / Fasilitas</th>
                  <th className="p-3">Pemeriksa QC</th>
                  <th className="p-3">Kebersihan</th>
                  <th className="p-3">Linen & Sprei</th>
                  <th className="p-3">AC & Listrik</th>
                  <th className="p-3">Sanitasi & Air</th>
                  <th className="p-3">Amenities</th>
                  <th className="p-3 text-center">Hasil QC</th>
                  <th className="p-3">Catatan Temuan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {qcInspections.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">{item.inspectionDate}</td>
                    <td className="p-3 font-bold text-slate-800">
                      {item.roomNumber}
                      <span className="block text-[10px] font-normal text-slate-400">{item.building}</span>
                    </td>
                    <td className="p-3 font-medium text-slate-800">{item.inspectorName}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.cleanliness === 'BAIK' ? 'bg-emerald-100 text-emerald-800' :
                        item.cleanliness === 'CUKUP' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {item.cleanliness}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.linenBed === 'LENGKAP_BERSIH' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.linenBed === 'LENGKAP_BERSIH' ? 'Bersih' : 'Perlu Ganti'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.acElectricity === 'NORMAL' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {item.acElectricity}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.plumbingWater === 'LANCAR' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {item.plumbingWater}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.amenities === 'LENGKAP' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.amenities}
                      </span>
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {item.result === 'LOLOS_QC' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <i className="fa-solid fa-check mr-1 text-emerald-600"></i> LOLOS QC
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-red-100 text-red-800 border border-red-300">
                          <i className="fa-solid fa-wrench mr-1 text-red-600"></i> PERLU PERBAIKAN
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600 max-w-xs truncate" title={item.notes}>
                      {item.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
