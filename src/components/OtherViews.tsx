import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext, formatHMS, isTeknisiRole, isManagerTeknisi, isManagerQc, isKoperasiRole, isRecepRole, isQcRole, isSuperAdmin } from '../store';
import { formatIndonesianDate, addDaysToDateStr, getRealTodayDate, formatIndonesianDateTime, parseLocalTimeString } from '../lib/utils';
import { Transaction, Maintenance, WorkSession, BreakfastMenuItem, BreakfastOrder } from '../types';
import { consolidateGroupTransactions } from '../lib/reportExporter';
import { useBodyScrollLock } from '../lib/scrollLock';

export function ReportsView() {
  const { transactions, rooms, openModal } = useAppContext();
  const [activeTab, setActiveTab] = useState<'ALL' | 'ROMBONGAN' | 'INDIVIDU' | 'AULA'>('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Record<string, boolean>>({});

  const toggleGroupExpand = (key: string) => {
    setExpandedGroupKeys(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Base filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (statusFilter !== 'ALL' && tx.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchName = tx.guestName?.toLowerCase().includes(q) || tx.groupName?.toLowerCase().includes(q);
        const matchRoom = tx.roomNumber?.toLowerCase().includes(q) || (tx.allocatedRoomNumbers && tx.allocatedRoomNumbers.some(rn => rn.toLowerCase().includes(q)));
        const matchBuilding = tx.building?.toLowerCase().includes(q);
        const matchId = tx.id?.toLowerCase().includes(q) || tx.groupId?.toLowerCase().includes(q);
        const matchSpk = tx.spkNumber?.toLowerCase().includes(q) || tx.notes?.toLowerCase().includes(q);
        if (!matchName && !matchRoom && !matchBuilding && !matchId && !matchSpk) return false;
      }
      return true;
    });
  }, [transactions, statusFilter, search]);

  // Consolidate into structured entities: Rombongan, Individu, and Aula
  const { rombonganList, individuList, aulaList } = useMemo(() => {
    return consolidateGroupTransactions(filteredTransactions, rooms);
  }, [filteredTransactions, rooms]);

  // Overall Statistics
  const totalRombonganCount = rombonganList.length;
  const rombonganActiveCount = rombonganList.filter(r => r.status === 'TERISI' || r.status === 'BOOKED').length;
  const totalIndividuCount = individuList.length;
  const individuActiveCount = individuList.filter(t => t.status === 'TERISI' || t.status === 'BOOKED').length;
  const totalAulaCount = aulaList.length;
  const aulaActiveCount = aulaList.filter(t => t.status === 'TERISI' || t.status === 'BOOKED').length;

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase">Rombongan Aktif</p>
          <p className="text-2xl font-bold text-purple-700">{rombonganActiveCount}</p>
          <span className="text-[10px] text-slate-400">Total riwayat rombongan: {totalRombonganCount}</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase">Kamar Individu Aktif</p>
          <p className="text-2xl font-bold text-emerald-600">{individuActiveCount}</p>
          <span className="text-[10px] text-slate-400">Total riwayat individu: {totalIndividuCount}</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase">Sewa Aula (Aktif)</p>
          <p className="text-2xl font-bold text-indigo-600">{aulaActiveCount}</p>
          <span className="text-[10px] text-slate-400">Total riwayat aula: {totalAulaCount}</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase">Total Transaksi Terfilter</p>
          <p className="text-2xl font-bold text-slate-800">{filteredTransactions.length}</p>
          <span className="text-[10px] text-emerald-600 font-medium">Kamar, Rombongan & Aula</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center">
              <i className="fa-solid fa-file-invoice text-emerald-600 mr-2"></i>
              Laporan Hunian Kamar & Booking Ruang Pertemuan
            </h3>
            <p className="text-xs text-slate-500">
              Pemisahan data terperinci antara Laporan Rombongan (Grup), Hunian Kamar Individu, dan Ruang Pertemuan (Aula).
            </p>
          </div>
          <button 
            onClick={() => openModal('modalExport', { defaultType: activeTab === 'AULA' ? 'AULA' : 'KAMAR' })} 
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center space-x-1.5 self-start md:self-auto cursor-pointer"
            title="Unduh Laporan Transaksi & Reservasi (PDF / Excel .xlsx)"
          >
            <i className="fa-solid fa-file-arrow-down"></i>
            <span>Unduh Laporan Resmi</span>
          </button>
        </div>

        {/* Filter and Tab Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          {/* Section Tabs */}
          <div className="inline-flex bg-white p-1 rounded-lg border border-slate-200 shadow-2xs text-xs font-semibold overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-md transition whitespace-nowrap ${activeTab === 'ALL' ? 'bg-slate-800 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Semua ({rombonganList.length + individuList.length + aulaList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ROMBONGAN')}
              className={`px-3 py-1.5 rounded-md transition flex items-center space-x-1.5 whitespace-nowrap ${activeTab === 'ROMBONGAN' ? 'bg-purple-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <i className="fa-solid fa-users-rectangle"></i>
              <span>Rombongan ({rombonganList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('INDIVIDU')}
              className={`px-3 py-1.5 rounded-md transition flex items-center space-x-1.5 whitespace-nowrap ${activeTab === 'INDIVIDU' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <i className="fa-solid fa-bed"></i>
              <span>Kamar Individu ({individuList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('AULA')}
              className={`px-3 py-1.5 rounded-md transition flex items-center space-x-1.5 whitespace-nowrap ${activeTab === 'AULA' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <i className="fa-solid fa-landmark"></i>
              <span>Ruang Pertemuan ({aulaList.length})</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Cari rombongan, kamar, PIC..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none w-44 sm:w-56"
              />
              <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-2.5 text-slate-400 text-xs"></i>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter status transaksi"
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="TERISI">Terisi / Check-In</option>
              <option value="BOOKED">Booked / Reservasi</option>
              <option value="SELESAI">Selesai (Check-Out)</option>
              <option value="DIBATALKAN">Dibatalkan</option>
            </select>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BAGIAN 1: LAPORAN KHUSUS ROMBONGAN (GRUP) */}
        {/* ========================================================================= */}
        {(activeTab === 'ALL' || activeTab === 'ROMBONGAN') && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <i className="fa-solid fa-users-rectangle text-purple-600"></i>
                  <span>Laporan Rombongan (Grup) dengan Rincian Alokasi Kamar & Gedung</span>
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                  {rombonganList.length} Rombongan
                </span>
              </div>
            </div>

            {rombonganList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 italic bg-slate-50 border border-slate-200 rounded-xl">
                Tidak ada data rombongan yang sesuai dengan filter.
              </div>
            ) : (
              <div className="space-y-3">
                {rombonganList.map((grp) => {
                  const isExpanded = Boolean(expandedGroupKeys[grp.key]);
                  const checkoutDate = addDaysToDateStr(grp.startDate, grp.duration);

                  return (
                    <div 
                      key={grp.key}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs hover:border-purple-300 dark:hover:border-purple-600 transition"
                    >
                      {/* Rombongan Header Banner */}
                      <div className="p-4 bg-gradient-to-r from-purple-50/70 via-white to-slate-50 dark:from-purple-950/40 dark:via-slate-800 dark:to-slate-850 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800 uppercase tracking-wide">
                              {grp.groupType === 'INSTANSI' ? 'Instansi / Lembaga' : grp.groupType === 'JEMAAH_HAJI' ? 'Jemaah Haji Akbar' : 'Rombongan Umum'}
                            </span>
                            <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {grp.groupName}
                            </h5>
                            {grp.kloter && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700">
                                Kloter: {grp.kloter}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              grp.status === 'TERISI' 
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700' 
                                : grp.status === 'BOOKED'
                                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                                : grp.status === 'SELESAI'
                                ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600'
                                : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700'
                            }`}>
                              {grp.status === 'TERISI' ? 'Check-In (Aktif)' : grp.status === 'BOOKED' ? 'Reservasi Terjadwal' : grp.status}
                            </span>
                          </div>

                          <div className="text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                            <span>PIC: <strong className="text-slate-800 dark:text-slate-200">{grp.groupPic}</strong> ({grp.groupPicPhone})</span>
                            {grp.agencyOrDocument && (
                              <span>Dokumen/SPK: <span className="font-mono text-slate-700 dark:text-slate-300">{grp.agencyOrDocument}</span></span>
                            )}
                            <span>Jadwal: <strong className="text-slate-800 dark:text-slate-200">{formatIndonesianDate(grp.startDate)}</strong> s.d. <strong className="text-slate-800 dark:text-slate-200">{formatIndonesianDate(checkoutDate)}</strong> ({grp.duration} {grp.durationUnit})</span>
                          </div>
                        </div>

                        {/* Top Action Buttons for this Rombongan */}
                        <div className="flex items-center space-x-2 shrink-0 self-start md:self-auto flex-wrap gap-y-2">
                          <button
                            type="button"
                            onClick={() => openModal('modalInvoice', { transaction: grp.representativeTx, groupKey: grp.key, groupRecord: grp })}
                            className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg text-xs shadow-2xs flex items-center space-x-1.5 transition cursor-pointer"
                            title="Buka Lembar Dokumen Invoice Resmi Rombongan"
                          >
                            <i className="fa-solid fa-file-invoice"></i>
                            <span>Invoice Rombongan</span>
                          </button>

                          {(grp.status === 'TERISI' || grp.status === 'BOOKED') && (
                            <button
                              type="button"
                              onClick={() => openModal('modalExtend', { transaction: grp.representativeTx })}
                              className="px-2.5 py-1.5 bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-300 font-bold rounded-lg text-xs border border-teal-200 dark:border-teal-700 flex items-center space-x-1 transition cursor-pointer"
                              title="Perpanjang durasi rombongan"
                            >
                              <i className="fa-solid fa-clock-rotate-left text-teal-600 dark:text-teal-400"></i>
                              <span>Extend</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => toggleGroupExpand(grp.key)}
                            className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-lg text-xs border border-slate-300 dark:border-slate-600 flex items-center space-x-1 transition cursor-pointer"
                            title={isExpanded ? "Tutup rincian kamar" : "Buka rincian kamar rombongan"}
                          >
                            <i className={`fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} text-slate-500 dark:text-slate-400 text-[11px]`}></i>
                            <span>{isExpanded ? 'Tutup Rincian' : `Rincian Kamar (${grp.allRoomNumbers.length})`}</span>
                          </button>
                        </div>
                      </div>

                      {/* Rombongan Body: Alokasi Gedung & Rincian Kamar & Ruang Pertemuan */}
                      <div className="p-4 space-y-3 text-xs">
                        {/* Rincian Gedung Sampai Kamar */}
                        <div>
                          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <i className="fa-solid fa-building text-slate-400 dark:text-slate-500"></i>
                              <span>Gedung & Kamar yang Disewa ({grp.allRoomNumbers.length} Kamar • {grp.totalPax} Pax):</span>
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-400 font-normal">
                              {grp.buildingsList.length} Gedung: {grp.buildingsList.join(', ')}
                            </span>
                          </div>

                          {/* Grid Gedung Cards */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                            {grp.roomsBreakdown.map((bBlock) => (
                              <div key={bBlock.building} className="p-3 bg-slate-50/80 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-700">
                                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-700 mb-2">
                                  <span className="flex items-center gap-1.5 text-hajj-800 dark:text-emerald-400">
                                    <i className="fa-solid fa-hotel text-gold-600 dark:text-gold-400 text-xs"></i>
                                    <span>{bBlock.building}</span>
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 font-bold">
                                    {bBlock.rooms.length} Kamar
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {bBlock.rooms.map((rm) => (
                                    <span 
                                      key={rm.roomNumber} 
                                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                                        rm.status === 'TERISI' 
                                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                                          : rm.status === 'BOOKED'
                                          ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-700'
                                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600'
                                      }`}
                                      title={`Kamar ${rm.roomNumber} - ${rm.type} (${rm.capacity} Bed) - ${rm.status}`}
                                    >
                                      {rm.roomNumber}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Fasilitas Ruang Pertemuan (Aula) Terkait */}
                        {(grp.includeAula || grp.rentAulaName) && (
                          <div className="p-3 rounded-lg bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="flex items-start gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-purple-700 text-gold-300 flex items-center justify-center shrink-0">
                                <i className="fa-solid fa-landmark text-xs"></i>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider block">
                                  Sewa Ruang Pertemuan (Aula) Terpadu
                                </span>
                                <h6 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                  {grp.rentAulaName || 'Aula Serbaguna Utama'}
                                </h6>
                                <p className="text-[11px] text-purple-900 dark:text-purple-200">
                                  Sesi: {grp.rentAulaSession || 'Sesi Acara Reguler'} • Durasi: {grp.rentAulaDuration || 1} Sesi • Kapasitas: 250 - 500 Pax (Format Seminar)
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] px-2.5 py-1 bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 font-bold rounded-md border border-purple-300 dark:border-purple-700 self-start sm:self-auto">
                              Fasilitas Lengkap Gedung SG
                            </span>
                          </div>
                        )}

                        {/* Info Konsumsi & Tambahan */}
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-slate-600 dark:text-slate-400 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <i className="fa-solid fa-utensils text-slate-400 dark:text-slate-500"></i>
                            <span>Layanan Konsumsi:</span>
                            {grp.cateringPackage && grp.cateringPackage !== 'TIDAK' ? (
                              <strong className="text-orange-700 dark:text-orange-300">
                                {grp.cateringPackage} ({grp.cateringPaxCount || grp.totalPax} Pack)
                              </strong>
                            ) : grp.breakfast ? (
                              <strong className="text-emerald-700 dark:text-emerald-300">
                                Sarapan Pagi ({grp.breakfastPortions || grp.totalPax} Porsi)
                              </strong>
                            ) : (
                              <span className="text-slate-500 dark:text-slate-400 font-medium">Tidak Pakai Konsumsi (0 Pack)</span>
                            )}
                          </div>

                          {grp.extraBed && (
                            <div className="flex items-center gap-1.5">
                              <i className="fa-solid fa-mattress-pillow text-indigo-600 dark:text-indigo-400"></i>
                              <strong className="text-indigo-700 dark:text-indigo-300">+{grp.extraBedCount || 1} Unit Extra Bed</strong>
                            </div>
                          )}
                        </div>

                        {/* Detail Expandable Table: Rincian Kamar Per Kamar */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 font-semibold text-[11px]">
                                  <th className="py-2 px-3 w-8 text-center">No</th>
                                  <th className="py-2 px-3">Gedung & Wilayah</th>
                                  <th className="py-2 px-3 font-mono">No. Kamar</th>
                                  <th className="py-2 px-3">Tipe / Fasilitas Ruangan</th>
                                  <th className="py-2 px-3 text-center">Kapasitas Bed</th>
                                  <th className="py-2 px-3 text-center">Status Alokasi</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-800 dark:text-slate-200">
                                {grp.roomsBreakdown.flatMap((b, bIdx) => 
                                  b.rooms.map((rm, rmIdx) => (
                                    <tr key={`${b.building}-${rm.roomNumber}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/50">
                                      <td className="py-2 px-3 text-center text-slate-400 dark:text-slate-500">{rmIdx + 1}</td>
                                      <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">{b.building}</td>
                                      <td className="py-2 px-3 font-bold font-mono text-purple-900 dark:text-purple-300">{rm.roomNumber}</td>
                                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{rm.type} (AC, Kamar Mandi Dalam)</td>
                                      <td className="py-2 px-3 text-center font-medium">{rm.capacity} Orang</td>
                                      <td className="py-2 px-3 text-center">
                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                          rm.status === 'TERISI' 
                                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700' 
                                            : rm.status === 'BOOKED'
                                            ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                        }`}>
                                          {rm.status === 'TERISI' ? 'Check-In' : rm.status === 'BOOKED' ? 'Reservasi' : rm.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* BAGIAN 2: TABEL KAMAR INDIVIDU (BUKAN ROMBONGAN) */}
        {/* ========================================================================= */}
        {(activeTab === 'ALL' || activeTab === 'INDIVIDU') && (
          <div className="space-y-2 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <i className="fa-solid fa-bed text-emerald-600"></i>
                  <span>Laporan Hunian Kamar Individu / Reguler (Non-Rombongan)</span>
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  {individuList.length} Kamar
                </span>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-900 uppercase text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">ID Transaksi</th>
                    <th className="p-3">Gedung & No Kamar</th>
                    <th className="p-3">Kategori Tamu</th>
                    <th className="p-3">Nama Tamu</th>
                    <th className="p-3">Tanggal Check-In</th>
                    <th className="p-3">Tanggal Check-Out</th>
                    <th className="p-3">Durasi</th>
                    <th className="p-3">Extra Bed & Sarapan</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Aksi Dokumen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-850">
                  {individuList.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-slate-400 italic">
                        Tidak ada transaksi kamar individu yang sesuai dengan filter.
                      </td>
                    </tr>
                  ) : (
                    individuList.map(tx => {
                      const checkoutDate = addDaysToDateStr(tx.startDate, tx.duration);
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                          <td className="p-3 font-bold font-mono text-emerald-800 dark:text-emerald-400">{tx.id}</td>
                          <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                            {tx.roomNumber} 
                            <span className="block text-[10px] font-normal text-slate-400">{tx.building}</span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-medium border border-slate-200 dark:border-slate-700">
                              {tx.category}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                            {tx.guestName}
                            {tx.kloter && <span className="block text-[10px] text-blue-600 dark:text-blue-400 font-normal">Kloter: {tx.kloter}</span>}
                          </td>
                          <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{formatIndonesianDate(tx.startDate)}</td>
                          <td className="p-3 font-medium text-slate-600 dark:text-slate-400">{formatIndonesianDate(checkoutDate)}</td>
                          <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{tx.duration} {tx.durationUnit || 'Malam'}</td>
                          <td className="p-3">
                            <div className="space-y-1">
                              {tx.extraBed ? (
                                <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                  <i className="fa-solid fa-mattress-pillow mr-1"></i>
                                  +{tx.extraBedCount || 1} Extra Bed
                                </div>
                              ) : null}

                              {tx.breakfast ? (
                                <div>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800" title={tx.breakfastMenu}>
                                    <i className="fa-solid fa-utensils mr-1"></i>
                                    {tx.breakfastMenu || 'Pesan Sarapan'}
                                  </span>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                    {tx.breakfastPortions || 1} Porsi × {tx.breakfastDays || tx.duration || 1} Hari
                                  </div>
                                </div>
                              ) : (
                                !tx.extraBed && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                    <i className="fa-solid fa-minus mr-1"></i> Standar
                                  </span>
                                )
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              tx.status === 'TERISI' 
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700' 
                                : tx.status === 'BOOKED'
                                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                                : tx.status === 'SELESAI'
                                ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600'
                                : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700'
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => openModal('modalInvoice', { transaction: tx })}
                                className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-lg text-xs border border-slate-300 dark:border-slate-600 shadow-2xs flex items-center space-x-1 transition cursor-pointer"
                                title="Lihat Invoice Dokumen Resmi"
                              >
                                <i className="fa-solid fa-file-invoice text-emerald-700 dark:text-emerald-400"></i>
                                <span>Invoice</span>
                              </button>
                              {(tx.status === 'TERISI' || tx.status === 'BOOKED') && (
                                <button
                                  type="button"
                                  onClick={() => openModal('modalExtend', { transaction: tx })}
                                  className="px-2 py-1 bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-300 font-bold rounded-lg text-xs border border-teal-200 dark:border-teal-700 flex items-center space-x-1 transition cursor-pointer"
                                  title="Perpanjang durasi menginap"
                                >
                                  <i className="fa-solid fa-clock-rotate-left text-teal-600 dark:text-teal-400"></i>
                                  <span>Extend</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BAGIAN 3: TABEL RUANGAN (RUANG PERTEMUAN / AULA) */}
        {/* ========================================================================= */}
        {(activeTab === 'ALL' || activeTab === 'AULA') && (
          <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
                  <i className="fa-solid fa-landmark text-indigo-600 dark:text-indigo-400"></i>
                  <span>Laporan Penyewaan Ruang Pertemuan (Aula / Auditorium / Gedung SG)</span>
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800">
                  {aulaList.length} Penyewaan Aula
                </span>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-900 uppercase text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">ID Transaksi</th>
                    <th className="p-3">Nama Ruang Pertemuan / Aula</th>
                    <th className="p-3">Penyewa / Instansi</th>
                    <th className="p-3">Tanggal Pemakaian</th>
                    <th className="p-3">Tanggal Akhir Pemakaian</th>
                    <th className="p-3">Durasi Sewa</th>
                    <th className="p-3">Keterangan / Acara</th>
                    <th className="p-3">Petugas Input</th>
                    <th className="p-3 text-center">Status Booking</th>
                    <th className="p-3 text-center">Aksi Dokumen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-850">
                  {aulaList.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-slate-400 italic">
                        Tidak ada transaksi sewa ruang pertemuan yang sesuai dengan filter.
                      </td>
                    </tr>
                  ) : (
                    aulaList.map(tx => {
                      const aulaDaysCount = Math.max(1, Math.ceil(tx.duration / 24));
                      const endDateStr = addDaysToDateStr(tx.startDate, aulaDaysCount - 1);
                      return (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                        <td className="p-3 font-bold font-mono text-indigo-800 dark:text-indigo-400">{tx.id}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                          <i className="fa-solid fa-landmark text-indigo-600 dark:text-indigo-400 mr-1.5"></i>
                          {tx.roomNumber}
                        </td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                          {tx.guestName}
                          {tx.phone && <span className="block text-[10px] text-slate-400 font-normal">Telp: {tx.phone}</span>}
                        </td>
                        <td className="p-3 font-medium text-slate-900 dark:text-slate-100">{formatIndonesianDate(tx.startDate)}</td>
                        <td className="p-3 font-medium text-emerald-800 dark:text-emerald-400">{formatIndonesianDate(endDateStr)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tx.duration >= 24 ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800' : 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'}`}>
                            {tx.duration} Jam {tx.duration >= 24 ? `(${aulaDaysCount} Hari Penuh)` : '(Sesi Harian)'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={tx.notes || '-'}>
                          {tx.notes || '-'}
                        </td>
                        <td className="p-3 text-slate-500 dark:text-slate-400 font-medium">{tx.createdUser || 'Resepsionis'}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.status === 'BOOKED' 
                              ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800' 
                              : tx.status === 'TERISI'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                              : tx.status === 'SELESAI'
                              ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600'
                              : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700'
                          }`}>
                            {tx.status === 'BOOKED' ? 'Booked (Terjadwal)' : tx.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => openModal('modalInvoice', { transaction: tx })}
                              className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-lg text-xs border border-slate-300 dark:border-slate-600 shadow-2xs flex items-center space-x-1 transition cursor-pointer"
                              title="Lihat Invoice Rincian Sewa Ruang Pertemuan (Tanpa Harga)"
                            >
                              <i className="fa-solid fa-file-invoice text-indigo-600 dark:text-indigo-400"></i>
                              <span>Invoice</span>
                            </button>
                            {(tx.status === 'BOOKED' || tx.status === 'TERISI') && (
                              <button
                                type="button"
                                onClick={() => openModal('modalExtend', { transaction: tx })}
                                className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold rounded-lg text-xs border border-purple-200 flex items-center space-x-1 transition cursor-pointer"
                                title="Perpanjang sesi sewa aula"
                              >
                                <i className="fa-solid fa-clock-rotate-left text-purple-600"></i>
                                <span>Extend</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function MaintenanceReportsView() {
  const { maintenances, finishMaintenance, markMaintenanceRepaired, openModal, rooms, currentUser } = useAppContext();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');
  const [facilityFilter, setFacilityFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const isTeknisi = isTeknisiRole(currentUser?.role) || currentUser?.role?.includes('Admin');
  const isManagerTek = isManagerTeknisi(currentUser?.role) || currentUser?.role?.includes('Admin');
  const isQc = isQcRole(currentUser?.role) || currentUser?.role?.includes('Admin');

  const getUrgBadge = (urg: string) => {
    if (urg === 'Urgent') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 mr-1.5 animate-pulse"></span>
          Urgent
        </span>
      );
    }
    if (urg === 'Tinggi') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mr-1.5"></span>
          Tinggi
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5"></span>
        {urg || 'Normal'}
      </span>
    );
  };

  const filteredMaintenances = useMemo(() => {
    return maintenances.filter(m => {
      if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;
      if (urgencyFilter !== 'ALL' && m.urgency !== urgencyFilter) return false;
      if (facilityFilter === 'KAMAR' && m.building === 'Ruang Pertemuan') return false;
      if (facilityFilter === 'AULA' && m.building !== 'Ruang Pertemuan') return false;
      if (search) {
        const q = search.toLowerCase();
        const matchRoom = m.roomNumber.toLowerCase().includes(q);
        const matchDesc = m.description.toLowerCase().includes(q);
        const matchTech = m.technician.toLowerCase().includes(q);
        const matchCat = m.category.toLowerCase().includes(q);
        if (!matchRoom && !matchDesc && !matchTech && !matchCat) return false;
      }
      return true;
    });
  }, [maintenances, statusFilter, urgencyFilter, facilityFilter, search]);

  const totalMaint = maintenances.length;
  const waitingAssignmentCount = maintenances.filter(m => m.status === 'MENUNGGU_PENUGASAN').length;
  const inProcessCount = maintenances.filter(m => m.status === 'PROSES').length;
  const waitingQcCount = maintenances.filter(m => m.status === 'MENUNGGU_QC').length;
  const finishedCount = maintenances.filter(m => m.status === 'SELESAI').length;

  return (
    <div className="space-y-4">
      {/* 4 Step Alur Maintenance Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl shadow-xs border border-amber-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800">1. Butuh Penugasan</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs">
              <i className="fa-solid fa-user-plus"></i>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-900">{waitingAssignmentCount}</span>
            <p className="text-[10px] text-amber-700 mt-0.5">Menunggu respon Manager</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl shadow-xs border border-blue-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-800">2. Sedang Dikerjakan</span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs">
              <i className="fa-solid fa-screwdriver-wrench"></i>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-blue-900">{inProcessCount}</span>
            <p className="text-[10px] text-blue-700 mt-0.5">Penanganan teknisi di lokasi</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl shadow-xs border border-amber-300 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-hajj-900">3. Menunggu Cek QC</span>
            <div className="w-7 h-7 rounded-lg bg-gold-100 text-hajj-800 flex items-center justify-center text-xs">
              <i className="fa-solid fa-clipboard-check"></i>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-hajj-900">{waitingQcCount}</span>
            <p className="text-[10px] text-hajj-700 mt-0.5">Selesai diperbaiki, siap inspeksi</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl shadow-xs border border-emerald-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800">4. Selesai Tuntas</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">
              <i className="fa-solid fa-circle-check"></i>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-900">{finishedCount}</span>
            <p className="text-[10px] text-emerald-700 mt-0.5">Lolos standar QC UPT</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center">
              <i className="fa-solid fa-screwdriver-wrench text-amber-600 mr-2"></i>
              Laporan Perawatan & Maintenance Fasilitas
            </h3>
            <p className="text-xs text-slate-500">Rekapitulasi kerusakan, alur penugasan teknisi, pelaporan perbaikan fisik, dan pengesahan inspeksi QC.</p>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => {
                const defaultRoom = rooms.find(r => r.status === 'KOSONG') || rooms[0];
                openModal('modalMaintenance', { roomId: defaultRoom?.id });
              }} 
              className="px-3 py-2 bg-hajj-700 hover:bg-hajj-800 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
            >
              <i className="fa-solid fa-plus-circle"></i>
              <span>Lapor Kerusakan Baru</span>
            </button>
            <button 
              onClick={() => openModal('modalExport', { defaultType: 'MAINTENANCE' })} 
              className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
              title="Unduh Laporan Pemeliharaan Gedung (PDF / Excel .xlsx)"
            >
              <i className="fa-solid fa-file-arrow-down"></i>
              <span>Unduh Laporan Maintenance</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            {/* Fasilitas */}
            <select
              value={facilityFilter}
              onChange={(e) => setFacilityFilter(e.target.value)}
              aria-label="Filter fasilitas gedung"
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-hajj-700 focus:outline-none"
            >
              <option value="ALL">Semua Fasilitas</option>
              <option value="KAMAR">Gedung (Kamar Hunian)</option>
              <option value="AULA">Ruang Pertemuan (Aula / Rapat)</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter status perbaikan"
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-hajj-700 focus:outline-none"
            >
              <option value="ALL">Semua Status Alur</option>
              <option value="MENUNGGU_PENUGASAN">1. Menunggu Penugasan</option>
              <option value="PROSES">2. Sedang Dikerjakan</option>
              <option value="MENUNGGU_QC">3. Menunggu Cek QC</option>
              <option value="SELESAI">4. Lolos QC & Selesai</option>
            </select>

            {/* Urgensi Filter */}
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              aria-label="Filter tingkat urgensi"
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-hajj-700 focus:outline-none"
            >
              <option value="ALL">Semua Tingkat Urgensi</option>
              <option value="Urgent">Urgent</option>
              <option value="Tinggi">Tinggi</option>
              <option value="Normal">Normal</option>
            </select>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Cari kamar, teknisi, kerusakan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-hajj-700 focus:outline-none w-48 sm:w-60"
            />
            <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-2.5 text-slate-400 text-xs"></i>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 uppercase text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3 text-center whitespace-nowrap w-28">Waktu Lapor</th>
                <th className="p-3 whitespace-nowrap w-36">Fasilitas / Lokasi</th>
                <th className="p-3 text-center whitespace-nowrap w-32">Kategori</th>
                <th className="p-3 text-center whitespace-nowrap w-28">Urgensi</th>
                <th className="p-3 min-w-[220px]">Deskripsi & Catatan</th>
                <th className="p-3 whitespace-nowrap w-36">Teknisi PJ</th>
                <th className="p-3 whitespace-nowrap w-28">Pelapor</th>
                <th className="p-3 text-center whitespace-nowrap w-40">Status Alur</th>
                <th className="p-3 text-center whitespace-nowrap min-w-[150px]">Tindakan Alur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredMaintenances.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                    Tidak ada data perbaikan yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredMaintenances.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono text-[11px] text-slate-600 text-center whitespace-nowrap">{m.reportTime}</td>
                    <td className="p-3 font-bold text-slate-800 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <i className={`fa-solid ${m.building === 'Ruang Pertemuan' ? 'fa-landmark text-purple-700' : 'fa-bed text-slate-500'} text-xs`}></i>
                        <span>{m.roomNumber}</span>
                      </div>
                      <span className="block text-[10px] font-normal text-slate-400 mt-0.5">{m.building}</span>
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 font-semibold text-[10px]">
                        {m.category}
                      </span>
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">{getUrgBadge(m.urgency)}</td>
                    <td className="p-3 text-slate-700 max-w-xs">
                      <p className="font-semibold text-slate-900 leading-snug" title={m.description}>{m.description}</p>
                      {m.managerNotes && (
                        <div className="text-[10px] text-amber-900 font-medium bg-amber-50/90 p-1.5 rounded-md mt-1 border border-amber-200 flex items-start space-x-1">
                          <i className="fa-solid fa-clipboard-user text-amber-600 mt-0.5 shrink-0"></i>
                          <span><strong>Manager:</strong> {m.managerNotes}</span>
                        </div>
                      )}
                      {m.technicianNotes && (
                        <div className="text-[10px] text-blue-900 font-medium bg-blue-50/90 p-1.5 rounded-md mt-1 border border-blue-200 flex items-start space-x-1">
                          <i className="fa-solid fa-wrench text-blue-600 mt-0.5 shrink-0"></i>
                          <span><strong>Teknisi:</strong> {m.technicianNotes}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3 font-medium text-slate-800 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-600 shrink-0">
                          <i className="fa-solid fa-user-gear"></i>
                        </div>
                        <span className="font-semibold text-slate-800 text-xs">{m.technician}</span>
                      </div>
                      {m.assignedBy && (
                        <span className="block text-[9px] text-slate-400 mt-0.5">Oleh: {m.assignedBy}</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600 whitespace-nowrap text-xs">{m.reportedUser || 'Petugas'}</td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {m.status === 'MENUNGGU_PENUGASAN' && (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300 inline-flex items-center shadow-2xs">
                          <i className="fa-solid fa-clock mr-1.5 text-amber-600"></i> 1. Butuh Penugasan
                        </span>
                      )}
                      {m.status === 'PROSES' && (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-900 border border-blue-300 inline-flex items-center shadow-2xs">
                          <i className="fa-solid fa-screwdriver-wrench mr-1.5 text-blue-600"></i> 2. Sedang Dikerjakan
                        </span>
                      )}
                      {m.status === 'MENUNGGU_QC' && (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-900 border border-purple-300 inline-flex items-center shadow-2xs">
                          <i className="fa-solid fa-clipboard-check mr-1.5 text-purple-700"></i> 3. Menunggu Cek QC
                        </span>
                      )}
                      {m.status === 'SELESAI' && (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-300 inline-flex items-center shadow-2xs">
                          <i className="fa-solid fa-circle-check mr-1.5 text-emerald-600"></i> 4. Selesai (Lolos QC)
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {m.status === 'MENUNGGU_PENUGASAN' && (
                        <div className="flex items-center justify-center gap-1.5">
                          {isManagerTek ? (
                            <button 
                              type="button"
                              onClick={() => openModal('modalAssignTechnician', { maintenance: m })} 
                              className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center space-x-1 cursor-pointer"
                              title="Tugaskan Teknisi Pelaksana"
                            >
                              <i className="fa-solid fa-user-plus text-[10px]"></i>
                              <span>Tugaskan</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-1 rounded border border-amber-200">
                              Tunggu Manager
                            </span>
                          )}
                          <button 
                            type="button"
                            onClick={() => openModal('modalRoomDetail', { roomId: m.roomId })}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs transition cursor-pointer"
                            title="Lihat Rincian Fasilitas"
                          >
                            <i className="fa-solid fa-eye text-[11px]"></i>
                          </button>
                        </div>
                      )}

                      {m.status === 'PROSES' && (
                        <div className="flex items-center justify-center gap-1.5">
                          {isTeknisi ? (
                            <>
                              <button 
                                type="button"
                                onClick={() => openModal('modalUpdateMaintenance', { maintenance: m })} 
                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold rounded-lg text-xs border border-blue-200 flex items-center space-x-1 transition cursor-pointer"
                                title="Update Catatan & Suku Cadang"
                              >
                                <i className="fa-solid fa-pen-to-square text-[10px]"></i>
                                <span>Update</span>
                              </button>
                              <button 
                                type="button"
                                onClick={() => markMaintenanceRepaired(m.id, 'Pekerjaan perbaikan fisik fasilitas telah diselesaikan dan diverifikasi. Menunggu inspeksi pengesahan QC.')} 
                                className="px-2.5 py-1.5 bg-hajj-700 hover:bg-hajj-800 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center space-x-1 cursor-pointer"
                                title="Tandai telah selesai diperbaiki & teruskan ke Tim QC"
                              >
                                <i className="fa-solid fa-paper-plane text-[10px]"></i>
                                <span>Kirim QC</span>
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-2 py-1 rounded border border-blue-200">
                              Dalam Proses
                            </span>
                          )}
                          <button 
                            type="button"
                            onClick={() => openModal('modalRoomDetail', { roomId: m.roomId })}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs transition cursor-pointer"
                            title="Lihat Rincian Fasilitas"
                          >
                            <i className="fa-solid fa-eye text-[11px]"></i>
                          </button>
                        </div>
                      )}

                      {m.status === 'MENUNGGU_QC' && (
                        <div className="flex items-center justify-center gap-1.5">
                          {isQc ? (
                            <button 
                              type="button"
                              onClick={() => openModal('modalQcInspection', { room: rooms.find(r => r.id === m.roomId) })} 
                              className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
                              title="Lakukan Inspeksi QC untuk Mengesahkan Kelayakan"
                            >
                              <i className="fa-solid fa-clipboard-check text-[10px]"></i>
                              <span>Inspeksi QC</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-2 py-1 rounded border border-purple-200">
                              Menunggu QC
                            </span>
                          )}
                          <button 
                            type="button"
                            onClick={() => openModal('modalRoomDetail', { roomId: m.roomId })}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs transition cursor-pointer"
                            title="Lihat Rincian Fasilitas"
                          >
                            <i className="fa-solid fa-eye text-[11px]"></i>
                          </button>
                        </div>
                      )}

                      {m.status === 'SELESAI' && (
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="px-2 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded border border-emerald-200 flex items-center space-x-1">
                            <i className="fa-solid fa-check text-emerald-600 text-[10px]"></i>
                            <span>Lolos QC</span>
                          </span>
                          <button 
                            type="button"
                            onClick={() => openModal('modalUpdateMaintenance', { maintenance: m })} 
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center space-x-1 transition cursor-pointer"
                            title="Lihat Detail Riwayat Perbaikan"
                          >
                            <i className="fa-solid fa-file-lines text-[10px]"></i>
                            <span>Riwayat</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function BreakfastOrdersView() {
  const { 
    transactions, 
    rooms, 
    openModal, 
    currentUser, 
    breakfastOrders = [], 
    breakfastMenuItems = [], 
    addBreakfastOrder, 
    updateBreakfastOrder, 
    deleteBreakfastOrder, 
    updateBreakfastOrderStatusState, 
    addBreakfastMenuItem, 
    updateBreakfastMenuItem, 
    deleteBreakfastMenuItem, 
    showToast,
    buildings = [],
    meetingRooms = []
  } = useAppContext();

  const [subView, setSubView] = useState<'ORDERS' | 'MENU_CATALOG'>('ORDERS');
  const [filterMode, setFilterMode] = useState<'ALL' | 'MENUNGGU' | 'SEDANG_DIBUAT' | 'PENGANTARAN' | 'SELESAI'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'CHECKIN_FIRST' | 'CHECKIN_ONLY' | 'BOOKED_ONLY' | 'ALL'>('CHECKIN_FIRST');
  const [buildingFilter, setBuildingFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Modals state
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<BreakfastMenuItem | null>(null);

  useBodyScrollLock(isAddOrderOpen || isAddMenuOpen);

  // New Order Form state
  const todayStr = getRealTodayDate();
  const [formRoomMode, setFormRoomMode] = useState<'SELECT_ACTIVE' | 'MANUAL'>('SELECT_ACTIVE');
  const [orderRoomNumber, setOrderRoomNumber] = useState('');
  const [orderBuilding, setOrderBuilding] = useState('Gedung A (Arafah)');
  const [orderGuestName, setOrderGuestName] = useState('');
  const [orderPhone, setOrderPhone] = useState('');
  const [orderKloter, setOrderKloter] = useState('');
  const [orderMenuName, setOrderMenuName] = useState(breakfastMenuItems[0]?.name || 'Nasi Goreng Spesial & Telur Ceplok');
  const [orderPortions, setOrderPortions] = useState(2);
  const [orderDays, setOrderDays] = useState(1);
  const [orderStartDate, setOrderStartDate] = useState(todayStr);
  const [orderDeliveryTime, setOrderDeliveryTime] = useState('06:30 WIB');
  const [orderDietary, setOrderDietary] = useState('Biasa (Tidak ada pantangan)');
  const [orderNotes, setOrderNotes] = useState('Antar langsung ke depan kamar tamu');

  // Menu Catalog Form state
  const [menuName, setMenuName] = useState('');
  const [menuCategory, setMenuCategory] = useState<'MAKANAN_BERAT' | 'BUBUR_SAYUR' | 'SNACK_KUDAPAN' | 'MINUMAN'>('MAKANAN_BERAT');
  const [menuPrice, setMenuPrice] = useState(25000);
  const [menuDesc, setMenuDesc] = useState('');
  const [menuAllergens, setMenuAllergens] = useState('');
  const [menuIsAvailable, setMenuIsAvailable] = useState(true);

  // Active rooms from transactions for quick selection
  const activeRoomTxs = useMemo(() => {
    return transactions.filter(tx => (tx.status === 'TERISI' || tx.status === 'BOOKED') && tx.building !== 'Ruang Pertemuan');
  }, [transactions]);

  // Merge room transactions that have breakfast with standalone breakfastOrders
  // so no orders are lost and everything is linked to the breakfast database
  const consolidatedOrders = useMemo(() => {
    const list = [...breakfastOrders];
    
    // Check if any transaction with breakfast is not yet in breakfastOrders list
    transactions.forEach(tx => {
      if (tx.breakfast && tx.building !== 'Ruang Pertemuan') {
        const fullTxId = tx.id;
        const exists = list.some(o => 
          (o.transactionId && o.transactionId === fullTxId) || 
          o.id === `BO-TX-${fullTxId}` || 
          (o.roomNumber === tx.roomNumber && o.startDate === tx.startDate && o.guestName === tx.guestName)
        );
        if (!exists) {
          list.push({
            id: `BO-TX-${fullTxId}`,
            roomNumber: tx.roomNumber,
            building: tx.building,
            guestName: tx.guestName,
            phone: tx.phone,
            kloter: tx.kloter,
            transactionId: fullTxId,
            menuName: tx.breakfastMenu || 'Nasi Goreng Spesial & Telur Ceplok',
            portions: tx.breakfastPortions || 4,
            days: tx.breakfastDays || tx.duration || 1,
            startDate: tx.startDate || todayStr,
            deliveryTime: '06:30 WIB',
            status: (tx.breakfastStatus as any) || 'MENUNGGU',
            notes: 'Pesanan terintegrasi dari data reservasi kamar',
            dietaryRestriction: 'Biasa',
            pricePerPortion: 25000,
            totalPrice: (tx.breakfastPortions || 4) * 25000 * (tx.breakfastDays || tx.duration || 1),
            createdAt: `${tx.startDate || todayStr} 06:00:00`
          });
        }
      }
    });

    // Ensure strict uniqueness of IDs across all items to prevent any React duplicate key warnings
    const seenIds = new Set<string>();
    const uniqueOrders: typeof list = [];
    list.forEach((order, idx) => {
      let uniqueId = order.id;
      if (!uniqueId || seenIds.has(uniqueId)) {
        uniqueId = `${uniqueId || 'BO'}-${order.transactionId || order.roomNumber || 'order'}-${idx + 1}`;
        order = { ...order, id: uniqueId };
      }
      seenIds.add(uniqueId);
      uniqueOrders.push(order);
    });

    // Sort: First by whether the associated room is checked-in (TERISI)
    return uniqueOrders.sort((a, b) => {
      const txA = transactions.find(t => t.id === a.transactionId || t.roomNumber === a.roomNumber);
      const txB = transactions.find(t => t.id === b.transactionId || t.roomNumber === b.roomNumber);
      const isCheckedInA = txA?.status === 'TERISI';
      const isCheckedInB = txB?.status === 'TERISI';
      if (isCheckedInA && !isCheckedInB) return -1;
      if (!isCheckedInA && isCheckedInB) return 1;
      return a.id.localeCompare(b.id);
    });
  }, [breakfastOrders, transactions, todayStr]);

  // Metrics calculation
  const totalOrdersCount = consolidatedOrders.length;
  const totalPortions = consolidatedOrders.reduce((acc, curr) => acc + (curr.portions || 1), 0);
  const totalBoxes = consolidatedOrders.reduce((acc, curr) => acc + ((curr.portions || 1) * (curr.days || 1)), 0);

  const checkedInOrders = consolidatedOrders.filter(o => {
    const tx = transactions.find(t => t.id === o.transactionId || t.roomNumber === o.roomNumber);
    return tx?.status === 'TERISI';
  });
  const checkedInCount = checkedInOrders.length;
  const checkedInPortions = checkedInOrders.reduce((acc, curr) => acc + (curr.portions || 1), 0);

  const bookedOrders = consolidatedOrders.filter(o => {
    const tx = transactions.find(t => t.id === o.transactionId || t.roomNumber === o.roomNumber);
    return tx?.status === 'BOOKED';
  });
  const bookedCount = bookedOrders.length;

  const menungguCount = consolidatedOrders.filter(o => (o.status || 'MENUNGGU') === 'MENUNGGU').length;
  const sedangDibuatCount = consolidatedOrders.filter(o => o.status === 'SEDANG_DIBUAT').length;
  const pengantaranCount = consolidatedOrders.filter(o => o.status === 'PENGANTARAN').length;
  const selesaiCount = consolidatedOrders.filter(o => o.status === 'SELESAI').length;

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return consolidatedOrders.filter(order => {
      const tx = transactions.find(t => t.id === order.transactionId || t.roomNumber === order.roomNumber);
      const isCheckedIn = tx?.status === 'TERISI';
      const isBooked = tx?.status === 'BOOKED';

      if (buildingFilter !== 'ALL' && order.building !== buildingFilter) return false;

      // Priority Filter
      if (priorityFilter === 'CHECKIN_ONLY' && !isCheckedIn) return false;
      if (priorityFilter === 'BOOKED_ONLY' && !isBooked) return false;

      // Status Filter
      const bStatus = order.status || 'MENUNGGU';
      if (filterMode === 'MENUNGGU' && bStatus !== 'MENUNGGU') return false;
      if (filterMode === 'SEDANG_DIBUAT' && bStatus !== 'SEDANG_DIBUAT') return false;
      if (filterMode === 'PENGANTARAN' && bStatus !== 'PENGANTARAN') return false;
      if (filterMode === 'SELESAI' && bStatus !== 'SELESAI') return false;

      // Search Query
      if (search) {
        const q = search.toLowerCase();
        const matchName = order.guestName.toLowerCase().includes(q);
        const matchRoom = order.roomNumber.toLowerCase().includes(q);
        const matchMenu = (order.menuName || '').toLowerCase().includes(q);
        const matchKloter = (order.kloter || '').toLowerCase().includes(q);
        const matchId = (order.id || '').toLowerCase().includes(q);
        if (!matchName && !matchRoom && !matchMenu && !matchKloter && !matchId) return false;
      }

      return true;
    });
  }, [consolidatedOrders, transactions, buildingFilter, priorityFilter, filterMode, search]);

  const canManage = true;

  // Handler: Add new order
  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderRoomNumber.trim()) {
      showToast('Harap masukkan atau pilih nomor kamar!', 'warning');
      return;
    }
    if (!orderGuestName.trim()) {
      showToast('Harap masukkan nama tamu/pemesan!', 'warning');
      return;
    }

    const selectedMenuItem = breakfastMenuItems.find(m => m.name === orderMenuName);
    const unitPrice = selectedMenuItem ? selectedMenuItem.price : 25000;
    const calcTotal = orderPortions * unitPrice * orderDays;

    const newOrder: BreakfastOrder = {
      id: `BO-${Date.now().toString().slice(-4)}`,
      roomNumber: orderRoomNumber,
      building: orderBuilding,
      guestName: orderGuestName,
      phone: orderPhone || undefined,
      kloter: orderKloter || undefined,
      menuName: orderMenuName,
      portions: Number(orderPortions),
      days: Number(orderDays),
      startDate: orderStartDate,
      deliveryTime: orderDeliveryTime,
      status: 'MENUNGGU',
      notes: orderNotes,
      dietaryRestriction: orderDietary,
      pricePerPortion: unitPrice,
      totalPrice: calcTotal,
      createdAt: `${todayStr} 06:00:00`
    };

    addBreakfastOrder(newOrder);
    setIsAddOrderOpen(false);
    // Reset form
    setOrderRoomNumber('');
    setOrderGuestName('');
    setOrderPhone('');
    setOrderKloter('');
    setOrderPortions(2);
    setOrderNotes('Antar langsung ke depan kamar tamu');
  };

  // Handler: Add or update menu item
  const handleSaveMenuItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuName.trim()) {
      showToast('Nama menu sarapan wajib diisi!', 'warning');
      return;
    }

    if (editingMenuItem) {
      const updated: BreakfastMenuItem = {
        ...editingMenuItem,
        name: menuName,
        category: menuCategory,
        price: Number(menuPrice),
        description: menuDesc,
        allergens: menuAllergens,
        isAvailable: menuIsAvailable
      };
      updateBreakfastMenuItem(updated);
      setEditingMenuItem(null);
    } else {
      const newItem: BreakfastMenuItem = {
        id: `bmi-${Date.now().toString().slice(-4)}`,
        name: menuName,
        category: menuCategory,
        price: Number(menuPrice),
        description: menuDesc,
        allergens: menuAllergens,
        isAvailable: menuIsAvailable
      };
      addBreakfastMenuItem(newItem);
    }

    setIsAddMenuOpen(false);
    setMenuName('');
    setMenuDesc('');
    setMenuAllergens('');
    setMenuPrice(25000);
  };

  const openEditMenu = (item: BreakfastMenuItem) => {
    setEditingMenuItem(item);
    setMenuName(item.name);
    setMenuCategory(item.category);
    setMenuPrice(item.price);
    setMenuDesc(item.description);
    setMenuAllergens(item.allergens || '');
    setMenuIsAvailable(item.isAvailable);
    setIsAddMenuOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* View Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl shadow-xs border border-slate-200">
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setSubView('ORDERS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-2 ${
              subView === 'ORDERS'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <i className="fa-solid fa-utensils text-xs"></i>
            <span>Antrean &amp; Pesanan Sarapan</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${subView === 'ORDERS' ? 'bg-orange-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {consolidatedOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('MENU_CATALOG')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-2 ${
              subView === 'MENU_CATALOG'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <i className="fa-solid fa-book-open text-xs"></i>
            <span>Katalog Menu Dapur Koperasi</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${subView === 'MENU_CATALOG' ? 'bg-orange-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {breakfastMenuItems.length}
            </span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {subView === 'ORDERS' ? (
            <button
              type="button"
              onClick={() => setIsAddOrderOpen(true)}
              className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
            >
              <i className="fa-solid fa-plus text-xs"></i>
              <span>+ Buat Pesanan Sarapan Baru</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditingMenuItem(null);
                setMenuName('');
                setMenuDesc('');
                setMenuAllergens('');
                setMenuPrice(25000);
                setIsAddMenuOpen(true);
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
            >
              <i className="fa-solid fa-plus text-xs"></i>
              <span>+ Tambah Menu Baru ke Database</span>
            </button>
          )}

          <button 
            type="button"
            onClick={() => openModal('modalExport', { 
              defaultType: 'SARAPAN',
              defaultBuilding: buildingFilter,
              defaultBreakfastPriority: priorityFilter === 'CHECKIN_ONLY' ? 'CHECKIN_ONLY' : priorityFilter === 'BOOKED_ONLY' ? 'BOOKED_ONLY' : 'ALL',
              defaultFormat: 'PDF'
            })} 
            className="px-3 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl shadow transition flex items-center space-x-1.5 cursor-pointer"
            title="Unduh / Cetak Rekap Pesanan Sarapan Format PDF Resmi"
          >
            <i className="fa-solid fa-file-pdf"></i>
            <span>PDF Sarapan</span>
          </button>

          <button 
            type="button"
            onClick={() => openModal('modalExport', { 
              defaultType: 'SARAPAN',
              defaultBuilding: buildingFilter,
              defaultBreakfastPriority: priorityFilter === 'CHECKIN_ONLY' ? 'CHECKIN_ONLY' : priorityFilter === 'BOOKED_ONLY' ? 'BOOKED_ONLY' : 'ALL',
              defaultFormat: 'XLSX'
            })} 
            className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow transition flex items-center space-x-1.5 cursor-pointer"
            title="Unduh Rekap Pesanan Sarapan Format Excel (.xlsx)"
          >
            <i className="fa-solid fa-file-excel"></i>
            <span>Excel</span>
          </button>
        </div>
      </div>

      {subView === 'ORDERS' ? (
        /* ================= SUBVIEW 1: ORDERS LIST & QUEUE ================= */
        <div className="space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-3.5 rounded-xl shadow-xs border border-emerald-300 bg-emerald-50/40 ring-2 ring-emerald-500/20">
              <p className="text-[11px] font-extrabold text-emerald-800 uppercase flex items-center">
                <i className="fa-solid fa-star text-amber-500 mr-1 text-[10px]"></i>
                Prioritas: Check-In
              </p>
              <p className="text-xl font-black text-emerald-700">{checkedInCount} <span className="text-xs font-semibold text-emerald-600">({checkedInPortions} porsi)</span></p>
              <span className="text-[10px] text-emerald-700 font-bold">Wajib diutamakan dapur</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl shadow-xs border border-orange-200 bg-orange-50/30">
              <p className="text-[11px] font-semibold text-orange-700 uppercase">Total Pesanan</p>
              <p className="text-xl font-bold text-orange-700">{totalOrdersCount} <span className="text-xs font-normal text-orange-600">({totalPortions} porsi)</span></p>
              <span className="text-[10px] text-orange-600 font-medium">{bookedCount} standby booked</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl shadow-xs border border-amber-200">
              <p className="text-[11px] font-semibold text-amber-700 uppercase">1. Menunggu</p>
              <p className="text-xl font-bold text-amber-700">{menungguCount}</p>
              <span className="text-[10px] text-amber-600">Antrean dapur</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl shadow-xs border border-blue-200">
              <p className="text-[11px] font-semibold text-blue-700 uppercase">2. Dimasak</p>
              <p className="text-xl font-bold text-blue-700">{sedangDibuatCount}</p>
              <span className="text-[10px] text-blue-600">Proses produksi</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl shadow-xs border border-purple-200">
              <p className="text-[11px] font-semibold text-purple-700 uppercase">3. Pengantaran</p>
              <p className="text-xl font-bold text-purple-700">{pengantaranCount}</p>
              <span className="text-[10px] text-purple-600">Menuju kamar</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl shadow-xs border border-emerald-200">
              <p className="text-[11px] font-semibold text-emerald-700 uppercase">4. Selesai</p>
              <p className="text-xl font-bold text-emerald-700">{selesaiCount}</p>
              <span className="text-[10px] text-emerald-600">Sampai di kamar</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            {/* Priority Quick Selector Bar */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                  <i className="fa-solid fa-arrow-down-short-wide"></i>
                </span>
                <span className="font-bold text-emerald-950">Filter Prioritas Antrean Kamar:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setPriorityFilter('CHECKIN_FIRST')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${priorityFilter === 'CHECKIN_FIRST' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-100/50'}`}
                  title="Urutkan pesanan tamu yang sudah check-in di paling atas"
                >
                  <i className="fa-solid fa-star text-amber-400"></i>
                  <span>Dahulukan Sudah Check-In ({checkedInCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPriorityFilter('CHECKIN_ONLY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${priorityFilter === 'CHECKIN_ONLY' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'}`}
                  title="Hanya tampilkan tamu yang kamarnya sudah check-in"
                >
                  <i className="fa-solid fa-door-open text-emerald-600"></i>
                  <span>Hanya Sudah Check-In</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPriorityFilter('BOOKED_ONLY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${priorityFilter === 'BOOKED_ONLY' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'}`}
                  title="Hanya tampilkan pesanan yang masih status reservasi (belum check-in)"
                >
                  <i className="fa-regular fa-clock text-amber-600"></i>
                  <span>Standby (Booking Saja)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPriorityFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${priorityFilter === 'ALL' ? 'bg-slate-800 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'}`}
                >
                  Semua Pesanan
                </button>
              </div>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex flex-wrap gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-xs text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFilterMode('ALL')}
                  className={`px-2.5 py-1.5 rounded-md transition ${filterMode === 'ALL' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Semua ({consolidatedOrders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('MENUNGGU')}
                  className={`px-2.5 py-1.5 rounded-md transition flex items-center space-x-1 ${filterMode === 'MENUNGGU' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-800 hover:bg-amber-50'}`}
                >
                  <span>Menunggu ({menungguCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('SEDANG_DIBUAT')}
                  className={`px-2.5 py-1.5 rounded-md transition flex items-center space-x-1 ${filterMode === 'SEDANG_DIBUAT' ? 'bg-blue-600 text-white shadow-xs' : 'text-blue-800 hover:bg-blue-50'}`}
                >
                  <i className="fa-solid fa-fire text-[10px]"></i>
                  <span>Sedang Dibuat ({sedangDibuatCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('PENGANTARAN')}
                  className={`px-2.5 py-1.5 rounded-md transition flex items-center space-x-1 ${filterMode === 'PENGANTARAN' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-800 hover:bg-purple-50'}`}
                >
                  <i className="fa-solid fa-truck-ramp-box text-[10px]"></i>
                  <span>Pengantaran ({pengantaranCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('SELESAI')}
                  className={`px-2.5 py-1.5 rounded-md transition flex items-center space-x-1 ${filterMode === 'SELESAI' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-800 hover:bg-emerald-50'}`}
                >
                  <i className="fa-solid fa-circle-check text-[10px]"></i>
                  <span>Selesai ({selesaiCount})</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={buildingFilter}
                  onChange={e => setBuildingFilter(e.target.value)}
                  className="py-1.5 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="ALL">Semua Gedung</option>
                  {buildings.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                  <option value="Ruang Pertemuan">Ruang Pertemuan / Aula</option>
                </select>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cari tamu, kamar, kloter..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none w-44 sm:w-56"
                  />
                  <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-2.5 text-slate-400 text-xs"></i>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 uppercase text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">ID &amp; Kamar</th>
                    <th className="p-3">Nama Tamu / Jemaah</th>
                    <th className="p-3">Menu &amp; Porsi</th>
                    <th className="p-3">Waktu &amp; Catatan</th>
                    <th className="p-3 text-center">Status Produksi</th>
                    <th className="p-3 text-center">Perbarui Alur Dapur</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                        Tidak ada data pesanan sarapan yang cocok dengan filter saat ini.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order, orderIdx) => {
                      const tx = transactions.find(t => t.id === order.transactionId || t.roomNumber === order.roomNumber);
                      const isCheckedIn = tx?.status === 'TERISI';
                      const bStatus = order.status || 'MENUNGGU';

                      return (
                        <tr key={`${order.id || 'bo'}-${order.roomNumber || ''}-${orderIdx}`} className={`transition ${isCheckedIn ? 'bg-emerald-50/20 hover:bg-emerald-50/40 border-l-4 border-l-emerald-500' : 'hover:bg-slate-50'}`}>
                          <td className="p-3">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-slate-900 text-sm">{order.roomNumber}</span>
                              {isCheckedIn && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" title="Tamu sudah berada di kamar (Checked-In)"></span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-semibold">{order.building}</span>
                            <div className="text-[9px] font-mono text-slate-400 mt-0.5">#{order.id}</div>
                          </td>

                          <td className="p-3">
                            <div className="font-bold text-slate-900">{order.guestName}</div>
                            {order.kloter && order.kloter !== '-' ? (
                              <div className="text-[11px] text-blue-700 font-semibold mt-0.5">
                                <i className="fa-solid fa-kaaba mr-1 text-slate-400"></i> Kloter: {order.kloter}
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400">Tamu Umum</div>
                            )}
                            {order.phone && <div className="text-[10px] text-slate-400"><i className="fa-solid fa-phone mr-1"></i>{order.phone}</div>}
                          </td>

                          <td className="p-3">
                            <div className="space-y-1">
                              <div className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-orange-100 text-orange-900 border border-orange-200">
                                <i className="fa-solid fa-bowl-rice mr-1.5 text-orange-600"></i>
                                {order.menuName}
                              </div>
                              <div className="text-[11px] text-slate-700 font-semibold">
                                <span className="text-orange-700 font-bold">{order.portions} Porsi / Hari</span> × <span>{order.days || 1} Hari</span>
                              </div>
                              {order.totalPrice ? (
                                <div className="text-[10px] text-slate-500">
                                  Total: <strong className="text-slate-900">Rp {order.totalPrice.toLocaleString('id-ID')}</strong>
                                </div>
                              ) : null}
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="text-xs font-semibold text-slate-800">
                              <i className="fa-regular fa-clock text-orange-600 mr-1"></i>
                              {order.deliveryTime || '06:30 WIB'}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Tgl Mulai: {formatIndonesianDate(order.startDate)}
                            </div>
                            {order.dietaryRestriction && order.dietaryRestriction !== 'Biasa' && (
                              <div className="mt-1 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-semibold inline-block">
                                {order.dietaryRestriction}
                              </div>
                            )}
                            {order.notes && (
                              <p className="text-[10px] text-slate-500 italic mt-0.5 line-clamp-1" title={order.notes}>
                                "{order.notes}"
                              </p>
                            )}
                          </td>

                          <td className="p-3 text-center">
                            {bStatus === 'MENUNGGU' ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>
                                Menunggu
                              </span>
                            ) : bStatus === 'SEDANG_DIBUAT' ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                                <i className="fa-solid fa-fire mr-1.5 text-blue-600"></i>
                                Dimasak
                              </span>
                            ) : bStatus === 'PENGANTARAN' ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
                                <i className="fa-solid fa-truck-ramp-box mr-1.5 text-purple-600"></i>
                                Diantar
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <i className="fa-solid fa-circle-check mr-1.5 text-emerald-600"></i>
                                Selesai
                              </span>
                            )}
                          </td>

                          <td className="p-3 text-center">
                            {canManage ? (
                              <div className="grid grid-cols-2 gap-1 w-36 mx-auto">
                                <button
                                  type="button"
                                  onClick={() => updateBreakfastOrderStatusState(order.id, 'MENUNGGU')}
                                  className={`py-1 px-1.5 rounded-md text-[10px] font-bold transition flex items-center justify-center space-x-1 cursor-pointer ${
                                    bStatus === 'MENUNGGU'
                                      ? 'bg-amber-500 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-900 border border-slate-200'
                                  }`}
                                  title="Tandai Menunggu Antrean"
                                >
                                  <i className="fa-solid fa-clock text-[9px]"></i>
                                  <span>Antre</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateBreakfastOrderStatusState(order.id, 'SEDANG_DIBUAT')}
                                  className={`py-1 px-1.5 rounded-md text-[10px] font-bold transition flex items-center justify-center space-x-1 cursor-pointer ${
                                    bStatus === 'SEDANG_DIBUAT'
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-900 border border-slate-200'
                                  }`}
                                  title="Tandai Sedang Dimasak"
                                >
                                  <i className="fa-solid fa-fire text-[9px]"></i>
                                  <span>Masak</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateBreakfastOrderStatusState(order.id, 'PENGANTARAN')}
                                  className={`py-1 px-1.5 rounded-md text-[10px] font-bold transition flex items-center justify-center space-x-1 cursor-pointer ${
                                    bStatus === 'PENGANTARAN'
                                      ? 'bg-purple-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-900 border border-slate-200'
                                  }`}
                                  title="Tandai Dalam Pengantaran"
                                >
                                  <i className="fa-solid fa-truck-ramp-box text-[9px]"></i>
                                  <span>Kirim</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateBreakfastOrderStatusState(order.id, 'SELESAI')}
                                  className={`py-1 px-1.5 rounded-md text-[10px] font-bold transition flex items-center justify-center space-x-1 cursor-pointer ${
                                    bStatus === 'SELESAI'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-900 border border-slate-200'
                                  }`}
                                  title="Tandai Selesai"
                                >
                                  <i className="fa-solid fa-circle-check text-[9px]"></i>
                                  <span>Tiba</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Hanya Koperasi</span>
                            )}
                          </td>

                          <td className="p-3 text-center">
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Hapus pesanan sarapan #${order.id} untuk ${order.guestName} (${order.roomNumber}) dari basis data?`)) {
                                    deleteBreakfastOrder(order.id);
                                  }
                                }}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-800 rounded-lg transition"
                                title="Hapus pesanan dari database"
                              >
                                <i className="fa-solid fa-trash text-xs"></i>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ================= SUBVIEW 2: MENU CATALOG DATABASE ================= */
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
                  <i className="fa-solid fa-bowl-rice text-orange-600"></i>
                  <span>Pangkalan Data Katalog Menu Sarapan &amp; Katering Koperasi</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kelola menu sarapan yang tersedia di dapur, atur harga porsi, deskripsi bahan, status stok ketersediaan, serta catatan alergen.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs px-3 py-1 bg-orange-50 text-orange-800 border border-orange-200 rounded-lg font-bold">
                  {breakfastMenuItems.length} Menu Terdaftar di Database
                </span>
              </div>
            </div>

            {/* Menu Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {breakfastMenuItems.map(item => {
                const categoryLabels: Record<string, { label: string; color: string }> = {
                  MAKANAN_BERAT: { label: 'Makanan Utama', color: 'bg-orange-100 text-orange-800 border-orange-200' },
                  BUBUR_SAYUR: { label: 'Bubur & Sayur', color: 'bg-amber-100 text-amber-800 border-amber-200' },
                  SNACK_KUDAPAN: { label: 'Snack / Kudapan', color: 'bg-purple-100 text-purple-800 border-purple-200' },
                  MINUMAN: { label: 'Minuman Segar / Hangat', color: 'bg-blue-100 text-blue-800 border-blue-200' }
                };
                const catInfo = categoryLabels[item.category] || { label: item.category, color: 'bg-slate-100 text-slate-700 border-slate-200' };

                return (
                  <div key={item.id} className="p-4 rounded-xl border border-slate-200 bg-white hover:shadow-md transition flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${catInfo.color}`}>
                          {catInfo.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = { ...item, isAvailable: !item.isAvailable };
                            updateBreakfastMenuItem(updated);
                            showToast(`Status menu "${item.name}" diubah: ${updated.isAvailable ? 'Tersedia' : 'Habis'}`, 'info');
                          }}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition ${
                            item.isAvailable 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                          title="Klik untuk toggle stok ketersediaan menu"
                        >
                          {item.isAvailable ? '🟢 Tersedia' : '🔴 Habis'}
                        </button>
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{item.description}</p>

                      {item.allergens && (
                        <div className="text-[10px] text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                          <i className="fa-solid fa-triangle-exclamation mr-1 text-amber-600"></i>
                          Alergen: {item.allergens}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Tarif per Porsi</span>
                        <span className="text-sm font-black text-orange-700">Rp {item.price.toLocaleString('id-ID')}</span>
                      </div>

                      {canManage && (
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => openEditMenu(item)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition"
                            title="Ubah Menu"
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Hapus menu "${item.name}" dari katalog basis data?`)) {
                                deleteBreakfastMenuItem(item.id);
                              }
                            }}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs transition"
                            title="Hapus Menu"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: BUAT PESANAN SARAPAN BARU ================= */}
      {isAddOrderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 space-y-4 custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-800 text-base flex items-center space-x-2">
                <i className="fa-solid fa-bowl-rice text-orange-600"></i>
                <span>Formulir Pesanan Sarapan Baru</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsAddOrderOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3.5 text-xs">
              {/* Selector Mode */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setFormRoomMode('SELECT_ACTIVE')}
                  className={`flex-1 py-1.5 rounded-lg font-bold border transition ${
                    formRoomMode === 'SELECT_ACTIVE'
                      ? 'bg-orange-50 border-orange-400 text-orange-800'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  Pilih Tamu / Kamar Aktif
                </button>
                <button
                  type="button"
                  onClick={() => setFormRoomMode('MANUAL')}
                  className={`flex-1 py-1.5 rounded-lg font-bold border transition ${
                    formRoomMode === 'MANUAL'
                      ? 'bg-orange-50 border-orange-400 text-orange-800'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  Input Bebas (Aula / Walk-In)
                </button>
              </div>

              {formRoomMode === 'SELECT_ACTIVE' ? (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pilih Kamar / Tamu</label>
                  <select
                    value={orderRoomNumber}
                    onChange={e => {
                      const selRoom = e.target.value;
                      setOrderRoomNumber(selRoom);
                      const activeTx = activeRoomTxs.find(t => t.roomNumber === selRoom);
                      if (activeTx) {
                        setOrderBuilding(activeTx.building);
                        setOrderGuestName(activeTx.guestName);
                        setOrderPhone(activeTx.phone || '');
                        setOrderKloter(activeTx.kloter || '');
                        setOrderPortions(activeTx.breakfastPortions || 2);
                      }
                    }}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none font-semibold focus:ring-2 focus:ring-orange-500"
                    required
                  >
                    <option value="">-- Pilih Kamar Terisi / Reservasi --</option>
                    {activeRoomTxs.map(t => (
                      <option key={t.id} value={t.roomNumber}>
                        {t.roomNumber} ({t.building}) - {t.guestName} [{t.status}]
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nomor / Nama Ruangan</label>
                    <input
                      type="text"
                      placeholder="Misal: Aula Utama / Kamar 101"
                      value={orderRoomNumber}
                      onChange={e => setOrderRoomNumber(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Lokasi Gedung</label>
                    <select
                      value={orderBuilding}
                      onChange={e => setOrderBuilding(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 font-semibold"
                    >
                      {buildings.map(b => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                      <option value="Ruang Pertemuan">Ruang Pertemuan / Aula</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Tamu / Pemesan</label>
                  <input
                    type="text"
                    value={orderGuestName}
                    onChange={e => setOrderGuestName(e.target.value)}
                    placeholder="Nama pemesan"
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kloter / Rombongan (Opsional)</label>
                  <input
                    type="text"
                    value={orderKloter}
                    onChange={e => setOrderKloter(e.target.value)}
                    placeholder="Contoh: 04 JKS"
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Menu & Portions */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Pilihan Menu Sarapan</label>
                  <select
                    value={orderMenuName}
                    onChange={e => setOrderMenuName(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none font-semibold focus:ring-2 focus:ring-orange-500"
                  >
                    {breakfastMenuItems.map(m => (
                      <option key={m.id} value={m.name}>
                        {m.name} - Rp {m.price.toLocaleString('id-ID')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jumlah Porsi</label>
                  <input
                    type="number"
                    min="1"
                    value={orderPortions}
                    onChange={e => setOrderPortions(Math.max(1, Number(e.target.value)))}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 font-bold text-center"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mulai Tanggal Antar</label>
                  <input
                    type="date"
                    value={orderStartDate}
                    onChange={e => setOrderStartDate(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Pengantaran</label>
                  <select
                    value={orderDeliveryTime}
                    onChange={e => setOrderDeliveryTime(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 font-semibold"
                  >
                    <option value="05:30 WIB">05:30 WIB (Pagi Awal)</option>
                    <option value="06:00 WIB">06:00 WIB</option>
                    <option value="06:30 WIB">06:30 WIB (Standar)</option>
                    <option value="07:00 WIB">07:00 WIB</option>
                    <option value="07:30 WIB">07:30 WIB</option>
                    <option value="08:00 WIB">08:00 WIB</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Pantangan Makanan</label>
                <input
                  type="text"
                  value={orderDietary}
                  onChange={e => setOrderDietary(e.target.value)}
                  placeholder="Biasa / Bebas Santan / Tanpa MSG / Lansia"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Instruksi Khusus Dapur / Kurir</label>
                <textarea
                  rows={2}
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                  placeholder="Misal: Antar ke meja kamar 101, hubungi no tamu dahulu..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddOrderOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Simpan Pesanan ke Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: TAMBAH / UBAH MENU SARAPAN ================= */}
      {isAddMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-800 text-base flex items-center space-x-2">
                <i className="fa-solid fa-bowl-rice text-emerald-600"></i>
                <span>{editingMenuItem ? 'Ubah Menu Sarapan' : 'Tambah Menu Sarapan Baru'}</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsAddMenuOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSaveMenuItem} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Menu</label>
                <input
                  type="text"
                  placeholder="Contoh: Lontong Sayur Padang Telur Balado"
                  value={menuName}
                  onChange={e => setMenuName(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kategori Menu</label>
                  <select
                    value={menuCategory}
                    onChange={e => setMenuCategory(e.target.value as any)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none font-semibold focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="MAKANAN_BERAT">Makanan Utama</option>
                    <option value="BUBUR_SAYUR">Bubur &amp; Sayur</option>
                    <option value="SNACK_KUDAPAN">Snack / Kudapan</option>
                    <option value="MINUMAN">Minuman</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Harga per Porsi (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={menuPrice}
                    onChange={e => setMenuPrice(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none font-bold text-orange-700 focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Deskripsi Menu &amp; Lauk Pendamping</label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Nasi uduk gurih dengan semur tahu tempe, bihun goreng, sambal dan kerupuk..."
                  value={menuDesc}
                  onChange={e => setMenuDesc(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kandungan Alergen (Jika Ada)</label>
                <input
                  type="text"
                  placeholder="Contoh: Telur, Kacang Tanah, Gluten, Susu"
                  value={menuAllergens}
                  onChange={e => setMenuAllergens(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="chkAvailable"
                  checked={menuIsAvailable}
                  onChange={e => setMenuIsAvailable(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="chkAvailable" className="font-bold text-slate-700 select-none cursor-pointer">
                  Menu Tersedia / Siap Dipesan (Stok Aktif)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddMenuOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Simpan ke Basis Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function AuditLogView({ defaultSubView }: { defaultSubView?: 'WORK_SESSIONS' | 'AUDIT_TRAIL' | 'DATABASE_MGMT' } = {}) {
  const { 
    auditLogs = [], workSessions = [], currentUser, showToast, openModal,
    exportDatabaseBackup, importDatabaseBackup, resetDatabase, clearWorkSessions,
    rooms = [], transactions = [], maintenances = [], users = [],
    breakfastOrders = [], breakfastMenuItems = [], qcInspections = [],
    supabaseSyncState, manualSyncSupabase, pushAllToSupabase
  } = useAppContext();
  const safeWorkSessions = workSessions || [];
  const fileImportRef = React.useRef<HTMLInputElement>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  // State for live ticker
  const [ticker, setTicker] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTicker(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter States
  const [selectedUser, setSelectedUser] = useState<string>('SEMUA');
  const [selectedRole, setSelectedRole] = useState<string>('SEMUA');
  const [sessionStatus, setSessionStatus] = useState<string>('SEMUA');
  const [datePreset, setDatePreset] = useState<'SEMUA' | 'HARI_INI' | 'KEMARIN' | '3_HARI' | '7_HARI' | 'KUSTOM'>('SEMUA');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Tab within this view: 'WORK_SESSIONS' | 'AUDIT_TRAIL' | 'DATABASE_MGMT'
  const [activeSubView, setActiveSubView] = useState<'WORK_SESSIONS' | 'AUDIT_TRAIL' | 'DATABASE_MGMT'>(defaultSubView || 'WORK_SESSIONS');
  
  useEffect(() => {
    if (defaultSubView) {
      setActiveSubView(defaultSubView);
    }
  }, [defaultSubView]);

  // Modal konfirmasi Reset Database & Reset Sesi
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [showResetSessionsModal, setShowResetSessionsModal] = useState(false);
  useBodyScrollLock(showResetConfirmModal || showResetSessionsModal);
  
  // Audit Trail Filters
  const [auditActionFilter, setAuditActionFilter] = useState<string>('SEMUA');
  const [auditSearch, setAuditSearch] = useState<string>('');

  const realToday = getRealTodayDate();
  const realYesterday = addDaysToDateStr(realToday, -1);
  const dateMinus3 = addDaysToDateStr(realToday, -3);
  const dateMinus7 = addDaysToDateStr(realToday, -7);

  // Unique users and roles for filter dropdowns
  const uniqueUsers = useMemo(() => {
    const names = new Set<string>();
    safeWorkSessions.forEach(s => names.add(s.userName));
    return Array.from(names);
  }, [safeWorkSessions]);

  const uniqueRoles = useMemo(() => {
    const roles = new Set<string>();
    safeWorkSessions.forEach(s => roles.add(s.userRole));
    return Array.from(roles);
  }, [safeWorkSessions]);

  // Compute live duration for active sessions
  const sessionsWithLiveDuration = useMemo(() => {
    return safeWorkSessions.map(session => {
      if (session.status === 'AKTIF') {
        const loginDate = parseLocalTimeString(session.loginTime);
        const now = new Date();
        const diffSeconds = Math.max(0, Math.floor((now.getTime() - loginDate.getTime()) / 1000));
        return {
          ...session,
          durationSeconds: diffSeconds,
          durationFormatted: `${formatHMS(diffSeconds)} (Sedang Berjalan)`
        };
      }
      return session;
    });
  }, [safeWorkSessions, ticker]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessionsWithLiveDuration.filter(session => {
      // User filter
      if (selectedUser !== 'SEMUA' && session.userName !== selectedUser) {
        return false;
      }

      // Role filter
      if (selectedRole !== 'SEMUA' && session.userRole !== selectedRole) {
        return false;
      }

      // Status filter
      if (sessionStatus !== 'SEMUA' && session.status !== sessionStatus) {
        return false;
      }

      // Date Presets
      const sessionDate = session.loginTime.split(' ')[0];
      if (datePreset === 'HARI_INI' && sessionDate !== realToday) {
        return false;
      }
      if (datePreset === 'KEMARIN' && sessionDate !== realYesterday) {
        return false;
      }
      if (datePreset === '3_HARI' && sessionDate < dateMinus3) {
        return false;
      }
      if (datePreset === '7_HARI' && sessionDate < dateMinus7) {
        return false;
      }
      if (datePreset === 'KUSTOM') {
        if (customStartDate && sessionDate < customStartDate) return false;
        if (customEndDate && sessionDate > customEndDate) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = session.id.toLowerCase().includes(q);
        const matchName = session.userName.toLowerCase().includes(q);
        const matchRole = session.userRole.toLowerCase().includes(q);
        const matchNotes = (session.notes || '').toLowerCase().includes(q);
        if (!matchId && !matchName && !matchRole && !matchNotes) {
          return false;
        }
      }

      return true;
    });
  }, [sessionsWithLiveDuration, selectedUser, selectedRole, sessionStatus, datePreset, customStartDate, customEndDate, searchQuery, realToday, realYesterday, dateMinus3, dateMinus7]);

  // Aggregate statistics for filtered sessions
  const totalFilteredSeconds = useMemo(() => {
    return filteredSessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  }, [filteredSessions]);

  const activeOfficersCount = useMemo(() => {
    return safeWorkSessions.filter(s => s.status === 'AKTIF').length;
  }, [safeWorkSessions]);

  const averageDurationSeconds = useMemo(() => {
    if (filteredSessions.length === 0) return 0;
    return Math.floor(totalFilteredSeconds / filteredSessions.length);
  }, [totalFilteredSeconds, filteredSessions.length]);

  // View mode for work records: 'REKAP_HARIAN' (Akumulasi harian) or 'RINCIAN_SESI' (Per sesi individual)
  const [recordViewMode, setRecordViewMode] = useState<'REKAP_HARIAN' | 'RINCIAN_SESI'>('REKAP_HARIAN');
  const [expandedDateRows, setExpandedDateRows] = useState<Record<string, boolean>>({});

  const toggleExpandDateRow = (key: string) => {
    setExpandedDateRows(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Group sessions by officer and date:
  // JIKA PETUGAS YANG SAMA TERDAPAT CHECK-IN DI TANGGAL YANG SAMA,
  // MAKA DURASI AKAN OTOMATIS TERAKUMULASI DI TANGGAL TERSEBUT
  // DAN JIKA DIA CHECK-IN LAGI DI TANGGAL YANG SAMA, MAKA REKAP AKAN MENYESUAIKAN!
  const dailyWorkRecords = useMemo(() => {
    const map = new Map<string, {
      key: string;
      date: string;
      userId: string;
      userName: string;
      userRole: string;
      sessionCount: number;
      totalDurationSeconds: number;
      firstLoginTime: string;
      lastLogoutTime: string | null;
      status: 'AKTIF' | 'SELESAI';
      hasActiveSession: boolean;
      sessions: (WorkSession & { durationSeconds: number; durationFormatted: string })[];
      hasMultipleSessions: boolean;
      notesList: string[];
    }>();

    // Sort chronologically ascending for clean timeline
    const sorted = [...filteredSessions].sort((a, b) => a.loginTime.localeCompare(b.loginTime));

    sorted.forEach(s => {
      const loginDate = s.loginTime.split(' ')[0];
      const key = `${s.userName}___${loginDate}`;
      const existing = map.get(key);

      if (!existing) {
        map.set(key, {
          key,
          date: loginDate,
          userId: s.userId,
          userName: s.userName,
          userRole: s.userRole,
          sessionCount: 1,
          totalDurationSeconds: s.durationSeconds,
          firstLoginTime: s.loginTime,
          lastLogoutTime: s.logoutTime,
          status: s.status,
          hasActiveSession: s.status === 'AKTIF',
          sessions: [s],
          hasMultipleSessions: false,
          notesList: s.notes ? [s.notes] : []
        });
      } else {
        existing.sessionCount += 1;
        existing.totalDurationSeconds += s.durationSeconds;
        existing.sessions.push(s);
        existing.hasMultipleSessions = true;
        if (s.notes && !existing.notesList.includes(s.notes)) {
          existing.notesList.push(s.notes);
        }
        // If any session on this date is still AKTIF, daily status is AKTIF
        if (s.status === 'AKTIF') {
          existing.status = 'AKTIF';
          existing.hasActiveSession = true;
          existing.lastLogoutTime = null;
        } else if (!existing.hasActiveSession) {
          // Both are finished, update lastLogoutTime if s.logoutTime is later
          if (s.logoutTime && (!existing.lastLogoutTime || s.logoutTime > existing.lastLogoutTime)) {
            existing.lastLogoutTime = s.logoutTime;
          }
        }
      }
    });

    // Sort by date descending (newest first), then userName
    return Array.from(map.values()).sort((a, b) => {
      const cmpDate = b.date.localeCompare(a.date);
      if (cmpDate !== 0) return cmpDate;
      return a.userName.localeCompare(b.userName);
    });
  }, [filteredSessions]);

  // Lookup map to get daily accumulated info for any individual session
  const sessionDailyMap = useMemo(() => {
    const map = new Map<string, { totalDurationSeconds: number; sessionCount: number; date: string }>();
    dailyWorkRecords.forEach(rec => {
      rec.sessions.forEach(s => {
        map.set(s.id, {
          totalDurationSeconds: rec.totalDurationSeconds,
          sessionCount: rec.sessionCount,
          date: rec.date
        });
      });
    });
    return map;
  }, [dailyWorkRecords]);

  // Summary by individual officer
  const userSummaries = useMemo(() => {
    const map = new Map<string, {
      userId: string;
      userName: string;
      userRole: string;
      totalSeconds: number;
      sessionCount: number;
      uniqueDates: Set<string>;
      hasMultiCheckinDates: boolean;
      lastSession: WorkSession | null;
      isOnline: boolean;
    }>();

    sessionsWithLiveDuration.forEach(s => {
      const loginDate = s.loginTime.split(' ')[0];
      const existing = map.get(s.userName);
      if (!existing) {
        const dateSet = new Set<string>();
        dateSet.add(loginDate);
        map.set(s.userName, {
          userId: s.userId,
          userName: s.userName,
          userRole: s.userRole,
          totalSeconds: s.durationSeconds,
          sessionCount: 1,
          uniqueDates: dateSet,
          hasMultiCheckinDates: false,
          lastSession: s,
          isOnline: s.status === 'AKTIF'
        });
      } else {
        existing.totalSeconds += s.durationSeconds;
        existing.sessionCount += 1;
        if (existing.uniqueDates.has(loginDate)) {
          existing.hasMultiCheckinDates = true;
        } else {
          existing.uniqueDates.add(loginDate);
        }
        if (s.status === 'AKTIF') existing.isOnline = true;
      }
    });

    return Array.from(map.values()).map(item => ({
      ...item,
      uniqueDaysCount: item.uniqueDates.size
    })).sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [sessionsWithLiveDuration]);

  // Export CSV (Supports both Rekap Harian and Rincian Sesi)
  const handleExportCSV = () => {
    if (recordViewMode === 'REKAP_HARIAN') {
      if (dailyWorkRecords.length === 0) {
        showToast('Tidak ada data rekap harian untuk diekspor.', 'warning');
        return;
      }

      const headers = [
        'Tanggal Shift', 
        'Nama Petugas', 
        'Role/Jabatan', 
        'Jumlah Check-In', 
        'Jam Masuk Pertama', 
        'Jam Keluar Terakhir', 
        'Total Detik Akumulasi', 
        'Total Rekap Durasi Kerja', 
        'Status Sesi',
        'Rincian Tiap Sesi'
      ];

      const rows = dailyWorkRecords.map(rec => {
        const firstLoginTimeOnly = rec.firstLoginTime.split(' ')[1] || '';
        const lastLogoutTimeOnly = rec.lastLogoutTime ? (rec.lastLogoutTime.split(' ')[1] || '') : (rec.hasActiveSession ? 'Masih Aktif Bertugas' : '-');
        const sessionDetails = rec.sessions.map((s, idx) => {
          const inTime = s.loginTime.split(' ')[1] || '';
          const outTime = s.logoutTime ? (s.logoutTime.split(' ')[1] || '') : 'Aktif';
          return `Sesi ${idx + 1} (${s.id}): ${inTime}-${outTime} (${formatHMS(s.durationSeconds)})`;
        }).join('; ');

        return [
          `"${rec.date}"`,
          `"${rec.userName}"`,
          `"${rec.userRole}"`,
          rec.sessionCount,
          `"${firstLoginTimeOnly}"`,
          `"${lastLogoutTimeOnly}"`,
          rec.totalDurationSeconds,
          `"${formatHMS(rec.totalDurationSeconds)}"`,
          `"${rec.status}"`,
          `"${sessionDetails.replace(/"/g, '""')}"`
        ];
      });

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Rekap_Harian_Akumulasi_Jam_Kerja_${realToday}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Laporan Rekap Harian Terakumulasi berhasil diunduh (CSV).', 'success');
    } else {
      if (filteredSessions.length === 0) {
        showToast('Tidak ada data sesi untuk diekspor.', 'warning');
        return;
      }

      const headers = ['ID Sesi', 'Nama Petugas', 'Role/Jabatan', 'Tgl Masuk', 'Jam Masuk', 'Tgl Keluar', 'Jam Keluar', 'Durasi Sesi Ini', 'Total Akumulasi Tgl Ini', 'Status', 'Catatan'];
      const rows = filteredSessions.map(s => {
        const [loginDate, loginTimeOnly] = s.loginTime.split(' ');
        let logoutDate = '-';
        let logoutTimeOnly = '-';
        if (s.logoutTime) {
          const parts = s.logoutTime.split(' ');
          logoutDate = parts[0];
          logoutTimeOnly = parts[1] || '';
        }
        const dailyInfo = sessionDailyMap.get(s.id);
        const accumulatedStr = dailyInfo ? formatHMS(dailyInfo.totalDurationSeconds) : s.durationFormatted;

        return [
          `"${s.id}"`,
          `"${s.userName}"`,
          `"${s.userRole}"`,
          `"${loginDate}"`,
          `"${loginTimeOnly || ''}"`,
          `"${logoutDate}"`,
          `"${logoutTimeOnly}"`,
          `"${formatHMS(s.durationSeconds)}"`,
          `"${accumulatedStr}"`,
          `"${s.status}"`,
          `"${(s.notes || '').replace(/"/g, '""')}"`
        ];
      });

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Rincian_Sesi_Jam_Kerja_${realToday}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Laporan Rincian Sesi berhasil diunduh (CSV).', 'success');
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedUser('SEMUA');
    setSelectedRole('SEMUA');
    setSessionStatus('SEMUA');
    setDatePreset('SEMUA');
    setCustomStartDate('');
    setCustomEndDate('');
    setSearchQuery('');
    showToast('Filter telah direset.', 'info');
  };

  const isFilterActive = selectedUser !== 'SEMUA' || selectedRole !== 'SEMUA' || sessionStatus !== 'SEMUA' || datePreset !== 'SEMUA' || customStartDate || customEndDate || searchQuery.trim() !== '';

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (auditActionFilter !== 'SEMUA') {
        if (auditActionFilter === 'AUTH' && !log.action.toLowerCase().includes('log')) return false;
        if (auditActionFilter === 'CHECKIN' && !log.action.toLowerCase().includes('check-in')) return false;
        if (auditActionFilter === 'CHECKOUT' && !log.action.toLowerCase().includes('check-out')) return false;
        if (auditActionFilter === 'SARAPAN' && !log.action.toLowerCase().includes('sarapan')) return false;
        if (auditActionFilter === 'MAINTENANCE' && !log.action.toLowerCase().includes('maintenance') && !log.action.toLowerCase().includes('perbaikan')) return false;
      }
      if (auditSearch.trim()) {
        const q = auditSearch.toLowerCase();
        const matchUser = log.user.toLowerCase().includes(q);
        const matchAction = log.action.toLowerCase().includes(q);
        const matchDetails = log.details.toLowerCase().includes(q);
        if (!matchUser && !matchAction && !matchDetails) return false;
      }
      return true;
    });
  }, [auditLogs, auditActionFilter, auditSearch]);

  return (
    <div className="space-y-4">
      {/* Simplified Top Action & Sub-Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveSubView('WORK_SESSIONS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 ${
              activeSubView === 'WORK_SESSIONS' 
                ? 'bg-white text-blue-800 shadow-xs font-black' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <i className="fa-solid fa-business-time"></i>
            <span>Rekap Sesi & Jam Kerja</span>
          </button>
          <button
            onClick={() => setActiveSubView('AUDIT_TRAIL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 ${
              activeSubView === 'AUDIT_TRAIL' 
                ? 'bg-white text-purple-800 shadow-xs font-black' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <i className="fa-solid fa-list-check"></i>
            <span>Log Aktivitas Sistem</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeSubView === 'AUDIT_TRAIL' ? 'bg-purple-100 text-purple-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {auditLogs.length}
            </span>
          </button>

          {currentUser && isSuperAdmin(currentUser.role) && (
            <button
              onClick={() => setActiveSubView('DATABASE_MGMT')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 ${
                activeSubView === 'DATABASE_MGMT' 
                  ? 'bg-white text-emerald-800 shadow-xs font-black' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <i className="fa-solid fa-database text-emerald-600"></i>
              <span>Basis Data</span>
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {safeWorkSessions.length > 0 && isSuperAdmin(currentUser?.role) && activeSubView === 'WORK_SESSIONS' && (
            <button
              onClick={() => setShowResetSessionsModal(true)}
              className="px-3 py-2 bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-800 text-xs font-bold rounded-xl border border-slate-200 hover:border-amber-200 flex items-center space-x-1.5 transition cursor-pointer"
              title="Bersihkan riwayat rekap sesi & jam kerja"
            >
              <i className="fa-solid fa-broom text-xs"></i>
              <span className="hidden sm:inline">Reset Sesi</span>
            </button>
          )}
          <button
            onClick={() => openModal('modalExport', { defaultType: activeSubView === 'WORK_SESSIONS' ? 'JAM_KERJA' : 'AUDIT' })}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-2 transition"
            title="Unduh Laporan Resmi (PDF & Excel .xlsx)"
          >
            <i className="fa-solid fa-file-arrow-down"></i>
            <span>Unduh Laporan ({activeSubView === 'WORK_SESSIONS' ? 'Jam Kerja' : 'Audit'})</span>
          </button>
        </div>
      </div>

      {activeSubView === 'WORK_SESSIONS' ? (
        <div className="space-y-4">
          {/* Streamlined KPI Summary Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center text-base shrink-0">
                <i className="fa-solid fa-hourglass-half"></i>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Total Durasi Kerja</p>
                <p className="text-base font-black text-blue-700 truncate" title={formatHMS(totalFilteredSeconds)}>
                  {formatHMS(totalFilteredSeconds)}
                </p>
                <p className="text-[10px] text-slate-400">{filteredSessions.length} sesi tugas</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center text-base shrink-0">
                <i className="fa-solid fa-calendar-check"></i>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Total Sesi Shift</p>
                <p className="text-base font-black text-slate-800">{filteredSessions.length} Sesi</p>
                <p className="text-[10px] text-slate-400">
                  {filteredSessions.filter(s => s.status === 'SELESAI').length} Selesai • {filteredSessions.filter(s => s.status === 'AKTIF').length} Aktif
                </p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center text-base shrink-0">
                <i className="fa-solid fa-user-clock"></i>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Petugas Aktif</p>
                <p className="text-base font-black text-emerald-700 flex items-center space-x-1.5">
                  <span>{activeOfficersCount} Petugas</span>
                  {activeOfficersCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  )}
                </p>
                <p className="text-[10px] text-emerald-600 font-semibold">Sedang bertugas</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center text-base shrink-0">
                <i className="fa-solid fa-chart-line"></i>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Rata-rata / Shift</p>
                <p className="text-base font-black text-amber-700 truncate" title={formatHMS(averageDurationSeconds)}>
                  {formatHMS(averageDurationSeconds)}
                </p>
                <p className="text-[10px] text-slate-400">Durasi rata-rata sesi</p>
              </div>
            </div>
          </div>

          {/* Compact Single-Bar Filter & View Controls */}
          <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
              {/* Quick Search */}
              <div className="relative flex-1 max-w-sm">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari ID sesi, nama petugas, catatan..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
                <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-2.5 text-slate-400 text-xs"></i>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => setRecordViewMode('REKAP_HARIAN')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center space-x-1 ${
                    recordViewMode === 'REKAP_HARIAN' 
                      ? 'bg-white text-blue-700 shadow-xs font-black' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <i className="fa-solid fa-calendar-day text-[10px]"></i>
                  <span>Rekap Harian ({dailyWorkRecords.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRecordViewMode('RINCIAN_SESI')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center space-x-1 ${
                    recordViewMode === 'RINCIAN_SESI' 
                      ? 'bg-white text-blue-700 shadow-xs font-black' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <i className="fa-solid fa-list-check text-[10px]"></i>
                  <span>Rincian Sesi ({filteredSessions.length})</span>
                </button>
              </div>
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Petugas</label>
                <select
                  value={selectedUser}
                  onChange={e => setSelectedUser(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                >
                  <option value="SEMUA">Semua Petugas ({uniqueUsers.length})</option>
                  {uniqueUsers.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Jabatan / Role</label>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                >
                  <option value="SEMUA">Semua Jabatan</option>
                  {uniqueRoles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Status Sesi</label>
                <select
                  value={sessionStatus}
                  onChange={e => setSessionStatus(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                >
                  <option value="SEMUA">Semua Status</option>
                  <option value="AKTIF">🟢 Sedang Aktif</option>
                  <option value="SELESAI">⚪ Selesai (Check-Out)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Periode Tanggal</label>
                <select
                  value={datePreset}
                  onChange={e => setDatePreset(e.target.value as any)}
                  className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                >
                  <option value="SEMUA">Semua Waktu</option>
                  <option value="HARI_INI">Hari Ini ({formatIndonesianDate(realToday)})</option>
                  <option value="KEMARIN">Kemarin ({formatIndonesianDate(realYesterday)})</option>
                  <option value="3_HARI">3 Hari Terakhir</option>
                  <option value="7_HARI">7 Hari Terakhir</option>
                  <option value="KUSTOM">Rentang Kustom</option>
                </select>
              </div>
            </div>

            {/* Custom Date Pickers if Selected */}
            {datePreset === 'KUSTOM' && (
              <div className="pt-2 flex flex-wrap items-center gap-3 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="flex items-center space-x-1.5">
                  <span className="text-slate-600 font-medium">Dari:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                    className="p-1 border border-slate-300 rounded-md bg-white text-xs"
                  />
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-slate-600 font-medium">Sampai:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                    className="p-1 border border-slate-300 rounded-md bg-white text-xs"
                  />
                </div>
              </div>
            )}

            {/* Active Filter Indicator & Reset */}
            {isFilterActive && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-500 text-[11px]">
                  Menampilkan <strong>{recordViewMode === 'REKAP_HARIAN' ? dailyWorkRecords.length : filteredSessions.length}</strong> data terfilter
                </span>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center space-x-1"
                >
                  <i className="fa-solid fa-rotate-left text-[10px]"></i>
                  <span>Reset Filter</span>
                </button>
              </div>
            )}
          </div>

          {/* Work Sessions Table */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">

            {/* TAB 1: REKAPITULASI HARIAN TERAKUMULASI */}
            {recordViewMode === 'REKAP_HARIAN' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 uppercase text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Tanggal Shift</th>
                      <th className="p-3.5">Petugas & Role</th>
                      <th className="p-3.5 text-center">Frekuensi Masuk</th>
                      <th className="p-3.5">
                        <span className="flex items-center space-x-1">
                          <i className="fa-solid fa-clock text-blue-600"></i>
                          <span>Rentang Jam (Pertama s/d Terakhir)</span>
                        </span>
                      </th>
                      <th className="p-3.5">
                        <span className="flex items-center space-x-1">
                          <i className="fa-solid fa-stopwatch text-emerald-600"></i>
                          <span>Total Akumulasi Durasi Kerja</span>
                        </span>
                      </th>
                      <th className="p-3.5 text-center">Rincian Sesi</th>
                      <th className="p-3.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyWorkRecords.length > 0 ? (
                      dailyWorkRecords.map(rec => {
                        const isExpanded = !!expandedDateRows[rec.key];
                        const isToday = rec.date === realToday;
                        const firstLoginTimeOnly = rec.firstLoginTime.split(' ')[1] || '';
                        const lastLogoutTimeOnly = rec.lastLogoutTime ? (rec.lastLogoutTime.split(' ')[1] || '') : null;

                        return (
                          <React.Fragment key={rec.key}>
                            <tr className={`transition ${rec.hasMultipleSessions ? 'bg-blue-50/20 hover:bg-blue-50/40 border-l-4 border-l-blue-500' : 'hover:bg-slate-50'}`}>
                              {/* Tanggal Shift */}
                              <td className="p-3.5">
                                <div className="space-y-0.5">
                                  <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                                    <i className="fa-regular fa-calendar text-blue-600"></i>
                                    <span>{formatIndonesianDate(rec.date)}</span>
                                  </div>
                                  <div className="flex items-center space-x-1.5">
                                    {isToday && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-600 text-white uppercase">
                                        Hari Ini
                                      </span>
                                    )}
                                    <span className="text-[10px] text-slate-400 font-mono">{rec.date}</span>
                                  </div>
                                </div>
                              </td>

                              {/* Petugas & Role */}
                              <td className="p-3.5">
                                <div className="flex items-center space-x-2.5">
                                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                                    {rec.userName.substring(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900 text-sm">{rec.userName}</p>
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                      {rec.userRole}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Frekuensi Masuk (Check-In) */}
                              <td className="p-3.5 text-center">
                                {rec.hasMultipleSessions ? (
                                  <div className="inline-flex flex-col items-center">
                                    <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-blue-600 text-white shadow-xs inline-flex items-center space-x-1">
                                      <i className="fa-solid fa-repeat text-amber-300 text-[10px]"></i>
                                      <span>{rec.sessionCount}x Check-In</span>
                                    </span>
                                    <span className="text-[10px] text-blue-700 font-bold mt-0.5">
                                      Terakumulasi Otomatis
                                    </span>
                                  </div>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                    1x Sesi
                                  </span>
                                )}
                              </td>

                              {/* Rentang Jam Kerja */}
                              <td className="p-3.5">
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-2 text-[11px]">
                                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-mono font-bold">
                                      Masuk: {firstLoginTimeOnly} WIB
                                    </span>
                                    <span>→</span>
                                    {rec.hasActiveSession ? (
                                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-bold animate-pulse">
                                        Sedang Bertugas
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded font-mono font-bold">
                                        Keluar: {lastLogoutTimeOnly || '-'} WIB
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {rec.hasMultipleSessions ? `Mencakup rentang ${rec.sessionCount} kali kedatangan tugas` : 'Satu sesi berkelanjutan'}
                                  </div>
                                </div>
                              </td>

                              {/* Total Akumulasi Durasi Kerja */}
                              <td className="p-3.5">
                                <div className="space-y-0.5">
                                  <div className="font-black text-blue-700 text-sm sm:text-base flex items-center space-x-1.5">
                                    <i className="fa-solid fa-stopwatch text-blue-600"></i>
                                    <span>{formatHMS(rec.totalDurationSeconds)}</span>
                                  </div>
                                  {rec.hasActiveSession ? (
                                    <div className="text-[10px] text-emerald-600 font-bold flex items-center space-x-1 animate-pulse">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                      <span>Menyesuaikan Real-Time...</span>
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      Total akumulasi {rec.totalDurationSeconds.toLocaleString('id-ID')} detik
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Rincian Sesi Toggle */}
                              <td className="p-3.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleExpandDateRow(rec.key)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition inline-flex items-center space-x-1 ${isExpanded ? 'bg-slate-800 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'}`}
                                >
                                  <span>{isExpanded ? 'Tutup Rincian' : `Lihat ${rec.sessionCount} Sesi`}</span>
                                  <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} text-[10px]`}></i>
                                </button>
                              </td>

                              {/* Status */}
                              <td className="p-3.5 text-center">
                                {rec.hasActiveSession ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center space-x-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping mr-1"></span>
                                    <span>AKTIF</span>
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-300">
                                    SELESAI
                                  </span>
                                )}
                              </td>
                            </tr>

                            {/* Sub-Rows: Individual Sessions Breakdown for this Date */}
                            {isExpanded && (
                              <tr className="bg-slate-50/80">
                                <td colSpan={7} className="p-4 pl-8 border-y border-slate-200">
                                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                      <p className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                                        <i className="fa-solid fa-list-ol text-blue-600"></i>
                                        <span>Rincian Tiap Sesi Check-In {rec.userName} pada {formatIndonesianDate(rec.date)}:</span>
                                      </p>
                                      <span className="text-[11px] text-blue-700 font-extrabold">
                                        Akumulasi Total: {formatHMS(rec.totalDurationSeconds)}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {rec.sessions.map((s, sIdx) => {
                                        const inTime = s.loginTime.split(' ')[1] || '';
                                        const outTime = s.logoutTime ? (s.logoutTime.split(' ')[1] || '') : 'Masih Berjalan';
                                        return (
                                          <div key={s.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                                            <div>
                                              <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                                                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-black text-[10px] flex items-center justify-center">
                                                  {sIdx + 1}
                                                </span>
                                                <span className="font-mono text-[11px] text-slate-500">#{s.id}</span>
                                              </div>
                                              <div className="text-[11px] text-slate-600 mt-1 font-mono">
                                                {inTime} WIB ➔ {outTime} WIB
                                              </div>
                                              {s.notes && (
                                                <p className="text-[10px] text-slate-400 mt-0.5 italic">{s.notes}</p>
                                              )}
                                            </div>
                                            <div className="text-right">
                                              <span className="font-extrabold text-blue-700 block text-xs">
                                                {formatHMS(s.durationSeconds)}
                                              </span>
                                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${s.status === 'AKTIF' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                                                {s.status}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                          Tidak ada catatan sesi jam kerja yang sesuai dengan filter yang dipilih.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* TAB 2: RINCIAN TIAP SESI INDIVIDUAL */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 uppercase text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">ID Sesi</th>
                      <th className="p-3.5">Petugas & Role</th>
                      <th className="p-3.5">
                        <span className="flex items-center space-x-1">
                          <i className="fa-solid fa-right-to-bracket text-blue-600"></i>
                          <span>Tanggal & Jam Masuk</span>
                        </span>
                      </th>
                      <th className="p-3.5">
                        <span className="flex items-center space-x-1">
                          <i className="fa-solid fa-right-from-bracket text-red-600"></i>
                          <span>Tanggal & Jam Keluar</span>
                        </span>
                      </th>
                      <th className="p-3.5">
                        <span className="flex items-center space-x-1">
                          <i className="fa-solid fa-stopwatch text-emerald-600"></i>
                          <span>Durasi Sesi Ini</span>
                        </span>
                      </th>
                      <th className="p-3.5">Akumulasi Tgl Tersebut</th>
                      <th className="p-3.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSessions.length > 0 ? (
                      filteredSessions.map((session, idx) => {
                        const [loginDate, loginTimeOnly] = session.loginTime.split(' ');
                        let logoutDate = '-';
                        let logoutTimeOnly = '-';
                        let isCrossDay = false;

                        if (session.logoutTime) {
                          const parts = session.logoutTime.split(' ');
                          logoutDate = parts[0];
                          logoutTimeOnly = parts[1] || '';
                          if (logoutDate !== loginDate) {
                            isCrossDay = true;
                          }
                        }

                        const dailyInfo = sessionDailyMap.get(session.id);
                        const hasMultipleOnDate = dailyInfo && dailyInfo.sessionCount > 1;

                        return (
                          <tr key={session.id || idx} className={`transition ${hasMultipleOnDate ? 'bg-blue-50/20 hover:bg-blue-50/40' : 'hover:bg-slate-50'}`}>
                            {/* ID Sesi */}
                            <td className="p-3.5 font-mono font-bold text-slate-500">
                              {session.id}
                            </td>

                            {/* Petugas & Role */}
                            <td className="p-3.5">
                              <div className="flex items-center space-x-2.5">
                                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                                  {session.userName.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800">{session.userName}</p>
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                    {session.userRole}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Tanggal & Jam Masuk */}
                            <td className="p-3.5">
                              <div className="space-y-0.5">
                                <div className="font-bold text-slate-800 flex items-center space-x-1">
                                  <i className="fa-regular fa-calendar text-blue-500"></i>
                                  <span>{formatIndonesianDate(loginDate)}</span>
                                </div>
                                <div className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-mono font-bold text-[11px]">
                                  {loginTimeOnly} WIB
                                </div>
                              </div>
                            </td>

                            {/* Tanggal & Jam Keluar */}
                            <td className="p-3.5">
                              {session.status === 'AKTIF' ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-ping"></span>
                                  Sedang Bertugas (Belum Keluar)
                                </span>
                              ) : (
                                <div className="space-y-0.5">
                                  <div className="font-bold text-slate-800 flex items-center space-x-1">
                                    <i className="fa-regular fa-calendar-check text-red-500"></i>
                                    <span>{formatIndonesianDate(logoutDate)}</span>
                                  </div>
                                  <div className="inline-block px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded font-mono font-bold text-[11px]">
                                    {logoutTimeOnly} WIB
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Durasi Sesi Ini */}
                            <td className="p-3.5">
                              <div className="space-y-1">
                                <div className="font-extrabold text-slate-800 text-xs flex items-center space-x-1.5">
                                  <span>{formatHMS(session.durationSeconds)}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  ({session.durationSeconds.toLocaleString('id-ID')} detik)
                                </div>
                              </div>
                            </td>

                            {/* Akumulasi Tgl Tersebut */}
                            <td className="p-3.5">
                              {dailyInfo ? (
                                <div>
                                  <span className="font-extrabold text-blue-700 text-xs block">
                                    {formatHMS(dailyInfo.totalDurationSeconds)}
                                  </span>
                                  {hasMultipleOnDate ? (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold mt-0.5">
                                      <i className="fa-solid fa-repeat mr-1 text-[9px]"></i>
                                      Total {dailyInfo.sessionCount}x check-in tgl {dailyInfo.date}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400">1x sesi pada tanggal ini</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs">-</span>
                              )}
                            </td>

                            {/* Status Badge */}
                            <td className="p-3.5 text-center">
                              {session.status === 'AKTIF' ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  AKTIF
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-300">
                                  SELESAI
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                          Tidak ada catatan sesi jam kerja yang sesuai dengan filter yang dipilih.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : activeSubView === 'AUDIT_TRAIL' ? (
        /* Audit Trail Tab */
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center">
                <i className="fa-solid fa-clock-rotate-left text-purple-600 mr-2"></i>
                Log Aktivitas Sistem (Audit Trail)
              </h3>
              <p className="text-xs text-slate-500">
                Catatan komprehensif riwayat aktivitas operasional seluruh petugas di dalam aplikasi.
              </p>
            </div>

            {/* Audit Trail Search and Filter */}
            <div className="flex items-center flex-wrap gap-2">
              <select
                value={auditActionFilter}
                onChange={e => setAuditActionFilter(e.target.value)}
                className="p-1.5 border border-slate-300 rounded-lg text-xs outline-none font-semibold"
              >
                <option value="SEMUA">Semua Tindakan</option>
                <option value="AUTH">Login & Logout</option>
                <option value="CHECKIN">Check-In Tamu</option>
                <option value="CHECKOUT">Check-Out Tamu</option>
                <option value="SARAPAN">Pesanan Sarapan</option>
                <option value="MAINTENANCE">Maintenance Kamar</option>
              </select>

              <input
                type="text"
                value={auditSearch}
                onChange={e => setAuditSearch(e.target.value)}
                placeholder="Cari log..."
                className="p-1.5 border border-slate-300 rounded-lg text-xs outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 uppercase text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Waktu & Tanggal</th>
                  <th className="p-3">Pengguna (Petugas)</th>
                  <th className="p-3">Peran / Role</th>
                  <th className="p-3">Tindakan / Aktivitas</th>
                  <th className="p-3">Rincian Objek</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAuditLogs.length > 0 ? (
                  filteredAuditLogs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono text-[11px] text-slate-500">{log.timestamp}</td>
                      <td className="p-3 font-bold text-slate-800">{log.user}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                          {log.role}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-700">{log.action}</td>
                      <td className="p-3 text-slate-600">{log.details}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                      Tidak ada data log aktivitas yang cocok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeSubView === 'DATABASE_MGMT' ? (
        /* Pusat Manajemen Basis Data Lokal */
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Local Storage Engine Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-emerald-500/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <i className="fa-solid fa-database text-9xl text-emerald-400"></i>
            </div>
            
            <div className="relative z-10 max-w-3xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center space-x-2 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 rounded-full text-xs font-bold">
                  <i className="fa-solid fa-database"></i>
                  <span>Pangkalan Data Lokal Terpadu (Local Storage)</span>
                </div>

                <div className="inline-flex items-center space-x-1.5 bg-white/10 text-slate-200 px-3 py-1 rounded-full text-xs font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Penyimpanan Aman Browser (Offline-Ready)</span>
                </div>
              </div>

              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Basis Data Lokal SIM-Akomodasi UPT Asrama Haji Jakarta
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Seluruh data operasional meliputi data kamar, aula, reservasi tamu, penugasan teknisi, inspeksi kelayakan QC, antrean sarapan &amp; katering koperasi, katalog menu dapur, serta riwayat log aktivitas tersimpan secara otomatis dan persisten di basis data lokal. Anda dapat mencadangkan berkas JSON kapan saja untuk keamanan.
              </p>
            </div>
          </div>

          {/* Current Database Metrics */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                  <i className="fa-solid fa-chart-pie text-emerald-600"></i>
                  <span>Metrik &amp; Ringkasan Rekord Basis Data Lokal</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Jumlah catatan aktif yang tersimpan dalam sistem basis data lokal saat ini.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs px-2.5 py-1 rounded-full font-bold border bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Status Aktif &amp; Terintegrasi</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Kamar &amp; Aula</span>
                <p className="text-xl font-black text-slate-900 mt-1">{rooms.length}</p>
                <span className="text-[10px] text-slate-500">Unit terdaftar</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Tamu &amp; Transaksi</span>
                <p className="text-xl font-black mt-1 text-slate-900">{transactions.length}</p>
                <span className="text-[10px] text-slate-500">Transaksi reservasi</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Maintenance</span>
                <p className="text-xl font-black text-slate-900 mt-1">{maintenances.length}</p>
                <span className="text-[10px] text-slate-500">Tiket teknisi</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Inspeksi QC</span>
                <p className="text-xl font-black text-slate-900 mt-1">{qcInspections.length}</p>
                <span className="text-[10px] text-slate-500">Laporan kelayakan</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Petugas Terdaftar</span>
                <p className="text-xl font-black text-slate-900 mt-1">{users.length}</p>
                <span className="text-[10px] text-slate-500">Akun sistem</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Katalog Menu Sarapan</span>
                <p className="text-xl font-black text-slate-900 mt-1">{breakfastMenuItems.length}</p>
                <span className="text-[10px] text-slate-500">Item menu dapur</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Pesanan Sarapan</span>
                <p className="text-xl font-black text-slate-900 mt-1">{breakfastOrders.length}</p>
                <span className="text-[10px] text-slate-500">Pesanan tercatat</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Log Aktivitas</span>
                <p className="text-xl font-black text-slate-900 mt-1">{auditLogs.length}</p>
                <span className="text-[10px] text-slate-500">Audit trail sistem</span>
              </div>
            </div>
          </div>

          {/* Integrasi Backend Supabase Cloud & Vercel Deployment */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  <i className="fa-solid fa-cloud"></i>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                    <span>Integrasi Backend Supabase Cloud &amp; Deployment Vercel</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      @supabase/supabase-js Aktif
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Penyimpanan terdistribusi cloud resmi untuk persistensi data online multi-perangkat dan kesiapan deploy Vercel.
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  supabaseSyncState.status === 'connected' 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                    : supabaseSyncState.status === 'syncing'
                    ? 'bg-sky-100 text-sky-800 border border-sky-200 animate-pulse'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    supabaseSyncState.status === 'connected' ? 'bg-emerald-500' : supabaseSyncState.status === 'syncing' ? 'bg-sky-500' : 'bg-amber-500'
                  }`}></span>
                  <span>
                    {supabaseSyncState.status === 'connected' && 'Terkoneksi ke Supabase'}
                    {supabaseSyncState.status === 'syncing' && 'Sedang Menyinkronkan...'}
                    {supabaseSyncState.status === 'idle' && 'Siap Sinkronisasi'}
                    {supabaseSyncState.status === 'error' && (supabaseSyncState.errorMessage || 'Koneksi Terputus')}
                  </span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">Project Endpoint URL:</span>
                  <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                    ijvbtubyjxqjethugzlm.supabase.co
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">Klien SDK:</span>
                  <span className="font-mono text-slate-700">@supabase/supabase-js v2.97</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">Terakhir Sinkron:</span>
                  <span className="font-mono text-slate-600">
                    {supabaseSyncState.lastSyncTime ? new Date(supabaseSyncState.lastSyncTime).toLocaleTimeString('id-ID') : 'Otomatis di background'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">Environment Variables:</span>
                  <span className="text-emerald-700 font-medium">VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">Target Hosting:</span>
                  <span className="font-bold text-slate-800">Vercel (Production SPA)</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">Skrip Tabel SQL:</span>
                  <span className="text-blue-600 font-semibold cursor-pointer hover:underline" onClick={() => setShowSqlModal(true)}>
                    Tersedia di supabase_schema.sql (Lihat)
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  setIsCloudSyncing(true);
                  await manualSyncSupabase();
                  setIsCloudSyncing(false);
                }}
                disabled={isCloudSyncing}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition flex items-center space-x-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <i className={`fa-solid ${isCloudSyncing ? 'fa-spinner fa-spin' : 'fa-arrows-rotate'}`}></i>
                <span>Tarik Data Terbaru dari Cloud</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  setIsCloudSyncing(true);
                  await pushAllToSupabase();
                  setIsCloudSyncing(false);
                }}
                disabled={isCloudSyncing}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition flex items-center space-x-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <i className="fa-solid fa-cloud-arrow-up text-emerald-400"></i>
                <span>Kirim &amp; Sync Data Lokal ke Supabase</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSqlModal(true)}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs rounded-lg transition flex items-center space-x-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-database"></i>
                <span>Skrip SQL Editor Supabase</span>
              </button>
            </div>
          </div>

          {/* Modal Skrip SQL Supabase */}
          {showSqlModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center space-x-2">
                    <i className="fa-solid fa-database text-emerald-600"></i>
                    <h4 className="font-bold text-slate-900 text-sm">Skrip SQL Supabase (Database Schema)</h4>
                  </div>
                  <button 
                    onClick={() => setShowSqlModal(false)}
                    className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
                <div className="p-4 overflow-y-auto space-y-3 text-xs">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800">
                    <p className="font-semibold">Petunjuk Pembuatan Tabel di Supabase:</p>
                    <ol className="list-decimal list-inside mt-1 space-y-1 text-[11px]">
                      <li>Buka Dashboard Supabase Anda: <strong>https://supabase.com/dashboard/project/ijvbtubyjxqjethugzlm</strong></li>
                      <li>Pilih menu <strong>SQL Editor</strong> di bilah navigasi kiri.</li>
                      <li>Klik <strong>New Query</strong>, tempelkan skrip di bawah ini, lalu klik <strong>Run</strong>.</li>
                      <li>Tabel sinkronisasi snapshot &amp; tabel individual akan otomatis terbuat beserta kebijakan RLS.</li>
                    </ol>
                  </div>

                  <div className="relative">
                    <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-60">
{`-- SKRIP TABEL DATABASE SIM-AKOMODASI UPT ASRAMA HAJI DI SUPABASE
-- File lengkap tersimpan di: /supabase_schema.sql

CREATE TABLE IF NOT EXISTS public.app_database_sync (
  id TEXT PRIMARY KEY DEFAULT 'current_sync',
  database_data JSONB NOT NULL,
  exported_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INT DEFAULT 4
);

-- RLS Enable & Allow anon access
ALTER TABLE public.app_database_sync ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public anon read and write" 
ON public.app_database_sync FOR ALL TO anon USING (true) WITH CHECK (true);`}
                    </pre>
                  </div>
                </div>
                <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`CREATE TABLE IF NOT EXISTS public.app_database_sync (
  id TEXT PRIMARY KEY DEFAULT 'current_sync',
  database_data JSONB NOT NULL,
  exported_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INT DEFAULT 4
);

ALTER TABLE public.app_database_sync ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public anon read and write" 
ON public.app_database_sync FOR ALL TO anon USING (true) WITH CHECK (true);`);
                      showToast('Skrip SQL berhasil disalin ke clipboard!', 'success');
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1 cursor-pointer"
                  >
                    <i className="fa-solid fa-copy"></i>
                    <span>Salin Skrip SQL</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSqlModal(false)}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Backup, Restore & Reset Action Tools */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h4 className="font-bold text-slate-800 text-sm flex items-center space-x-2 border-b border-slate-100 pb-3">
              <i className="fa-solid fa-shield-halved text-indigo-600"></i>
              <span>Operasi &amp; Pemeliharaan Basis Data Mandiri</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Unduh Backup */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col justify-between space-y-3">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg mb-2">
                    <i className="fa-solid fa-file-arrow-down"></i>
                  </div>
                  <h5 className="font-bold text-slate-900 text-xs">Unduh Cadangan Basis Data</h5>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Ekspor seluruh data sistem (kamar, tamu, teknisi, QC, sarapan, user, log) ke file JSON mandiri untuk arsip offline.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={exportDatabaseBackup}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <i className="fa-solid fa-download"></i>
                  <span>Unduh File .JSON</span>
                </button>
              </div>

              {/* Pulihkan / Import Backup */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col justify-between space-y-3">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg mb-2">
                    <i className="fa-solid fa-file-arrow-up"></i>
                  </div>
                  <h5 className="font-bold text-slate-900 text-xs">Pulihkan dari File JSON</h5>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Unggah file cadangan JSON untuk memulihkan seluruh struktur kamar, transaksi, menu sarapan, dan riwayat operasional.
                  </p>
                </div>
                <div>
                  <input
                    type="file"
                    ref={fileImportRef}
                    accept=".json,application/json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const content = event.target?.result as string;
                        if (content) {
                          const success = importDatabaseBackup(content);
                          if (success) {
                            showToast('Basis data berhasil dipulihkan dari cadangan!', 'success');
                          } else {
                            showToast('Gagal memulihkan: Format berkas JSON tidak valid!', 'error');
                          }
                        }
                      };
                      reader.readAsText(file);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileImportRef.current?.click()}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                  >
                    <i className="fa-solid fa-upload"></i>
                    <span>Pilih Berkas JSON</span>
                  </button>
                </div>
              </div>

              {/* Reset ke Kondisi Awal */}
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50 transition flex flex-col justify-between space-y-3">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-lg mb-2">
                    <i className="fa-solid fa-user-shield"></i>
                  </div>
                  <h5 className="font-bold text-slate-900 text-xs">Reset Database</h5>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Kembalikan seluruh basis data ke kondisi awal. Seluruh data aktivitas, shift, QC, transaksi, dan tiket maintenance dikosongkan, serta hanya menyisakan akun <strong>Super Admin</strong> dan <strong>Admin</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-reset-database"
                  onClick={() => setShowResetConfirmModal(true)}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <i className="fa-solid fa-rotate-left"></i>
                  <span>Reset Database</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Fallback Empty */
        null
      )}

      {/* Modal Konfirmasi Reset Database */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center text-xl shrink-0">
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">Konfirmasi Reset Database</h4>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 space-y-1.5">
              <p className="font-bold">Apakah Anda yakin ingin mereset basis data?</p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-700 text-[11px]">
                <li>Riwayat <strong>log aktivitas</strong> akan dikosongkan.</li>
                <li>Rekap <strong>sesi &amp; jam kerja (shift)</strong> akan dikosongkan.</li>
                <li>Seluruh inspeksi <strong>Quality Control (QC)</strong> akan dikosongkan.</li>
                <li>Data transaksi tamu &amp; tiket maintenance dibersihkan.</li>
                <li>Hanya akun <strong>Super Admin</strong> dan <strong>Admin</strong> serta data master gedung &amp; kamar yang tersisa.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                id="btn-confirm-reset-database"
                onClick={() => {
                  resetDatabase();
                  setShowResetConfirmModal(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
              >
                <i className="fa-solid fa-rotate-left"></i>
                <span>Reset Database</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Reset Rekap Sesi Kerja */}
      {showResetSessionsModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl shrink-0">
                <i className="fa-solid fa-broom"></i>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">Reset Rekap Sesi Kerja</h4>
                <p className="text-xs text-slate-500">Bersihkan seluruh riwayat shift &amp; durasi lama</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1.5">
              <p className="font-bold">Apakah Anda yakin ingin mengosongkan riwayat sesi &amp; jam kerja?</p>
              <p className="text-slate-600 text-[11px]">
                Semua entri sesi lama yang tidak wajar atau duplikat akan dibersihkan. Catatan sesi baru akan mulai dihitung bersih dan akurat sejak waktu login terkini.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResetSessionsModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                id="btn-confirm-reset-sessions"
                onClick={() => {
                  clearWorkSessions();
                  setShowResetSessionsModal(false);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
              >
                <i className="fa-solid fa-check"></i>
                <span>Ya, Bersihkan Sesi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

