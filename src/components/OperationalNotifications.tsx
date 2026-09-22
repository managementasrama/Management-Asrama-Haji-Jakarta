import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  useAppContext, 
  isSuperAdmin, 
  isRecepRole, 
  isTeknisiRole, 
  isQcRole, 
  isKoperasiRole 
} from '../store';
import { getRealTodayDate, formatIndonesianDate, addDaysToDateStr } from '../lib/utils';

export interface OperationalAlert {
  id: string;
  type: 'CHECKIN_TODAY' | 'CHECKOUT_TODAY' | 'BREAKFAST' | 'MAINTENANCE' | 'QC';
  division: 'RESEPSIONIS' | 'KOPERASI' | 'TEKNISI' | 'QC';
  title: string;
  subtitle: string;
  roomNumber?: string;
  building?: string;
  categoryBadge: string;
  severity: 'URGENT' | 'HIGH' | 'NORMAL';
  actionLabel: string;
  actionTab: string;
  modalToOpen?: string;
  modalData?: any;
}

/**
 * Helper to match user's assigned building with alert's building
 */
function matchesAssignedBuilding(assignedBuilding?: string, itemBuilding?: string): boolean {
  if (!assignedBuilding || assignedBuilding === 'Semua Gedung' || assignedBuilding === 'Semua' || assignedBuilding === '-') {
    return true;
  }
  const userB = assignedBuilding.toLowerCase();
  if (userB.includes('pusat komando') || userB.includes('kawasan') || userB.includes('terpadu') || userB.includes('seluruh') || userB.includes('penjamin mutu') || userB.includes('sarana & prasarana')) {
    return true;
  }
  if (!itemBuilding) return true;

  const itemB = itemBuilding.toLowerCase();

  // Gedung A & B
  if (userB.includes('gedung a') && itemB.includes('gedung a')) return true;
  if (userB.includes('gedung b') && itemB.includes('gedung b')) return true;
  if (userB.includes('gedung c') && itemB.includes('gedung c')) return true;
  if (userB.includes('gedung d') && itemB.includes('gedung d')) return true;
  if ((userB.includes('aula') || userB.includes('sg') || userB.includes('pertemuan')) && (itemB.includes('aula') || itemB.includes('sg') || itemB.includes('pertemuan') || itemB.includes('multipurpose'))) return true;

  return itemB.includes(userB) || userB.includes(itemB);
}

export function OperationalNotifications() {
  const {
    currentUser,
    rooms,
    transactions,
    maintenances,
    setActiveTab,
    openModal
  } = useAppContext();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const realToday = getRealTodayDate();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!currentUser) return null;

  const role = currentUser.role || '';
  const isSuper = isSuperAdmin(role);
  const canSeeRecep = isRecepRole(role);
  const canSeeKoperasi = isKoperasiRole(role);
  const canSeeTeknisi = isTeknisiRole(role);
  const canSeeQc = isQcRole(role);

  // Compute operational alerts filtered by user's division and assigned building
  const alerts = useMemo<OperationalAlert[]>(() => {
    const list: OperationalAlert[] = [];

    // 1. JADWAL BOOKING / CHECK-IN HARI INI (Divisi Resepsionis / Pimpinan)
    if (canSeeRecep) {
      transactions.forEach(tx => {
        const isAula = tx.building === 'Ruang Pertemuan';
        
        if (isAula) {
          // Ruang Pertemuan: Otomatis terlaksana jika tanggal real hari ini sama dengan booking
          if (tx.startDate === realToday) {
            if (matchesAssignedBuilding(currentUser.assignedBuilding, tx.building)) {
              list.push({
                id: `alert-aula-${tx.id}`,
                type: 'CHECKIN_TODAY',
                division: 'RESEPSIONIS',
                title: `Acara Berlangsung Hari Ini: ${tx.guestName}`,
                subtitle: `${tx.building} • ${tx.roomNumber} • Otomatis Terlaksana Hari Ini • Durasi ${tx.duration} Jam`,
                roomNumber: tx.roomNumber,
                building: tx.building,
                categoryBadge: 'Acara Aula Hari Ini',
                severity: 'HIGH',
                actionLabel: 'Lihat Rincian Gedung',
                actionTab: 'gedung',
                modalToOpen: 'modalRoomDetail',
                modalData: { roomId: tx.roomId }
              });
            }
          }
        } else {
          // Kamar Penginapan biasa
          const isTodayCheckin = tx.startDate === realToday;
          const isPendingCheckin = tx.status === 'BOOKED' && (tx.startDate <= realToday);

          if (isPendingCheckin || (isTodayCheckin && tx.status === 'BOOKED')) {
            if (matchesAssignedBuilding(currentUser.assignedBuilding, tx.building)) {
              list.push({
                id: `alert-checkin-${tx.id}`,
                type: 'CHECKIN_TODAY',
                division: 'RESEPSIONIS',
                title: `Check-In Hari Ini: ${tx.guestName}`,
                subtitle: `${tx.building} • Kamar ${tx.roomNumber} (${tx.category === 'JEMAAH' ? `Kloter ${tx.kloter}` : 'Umum'}) • Durasi ${tx.duration} ${tx.durationUnit || 'Malam'}`,
                roomNumber: tx.roomNumber,
                building: tx.building,
                categoryBadge: 'Jadwal Check-In',
                severity: 'HIGH',
                actionLabel: 'Rincian & Check-In',
                actionTab: 'gedung',
                modalToOpen: 'modalRoomDetail',
                modalData: { roomId: tx.roomId }
              });
            }
          }
        }
      });
    }

    // 2. JADWAL CHECK-OUT HARI INI (Divisi Resepsionis / Pimpinan) - Khusus Kamar Penginapan
    if (canSeeRecep) {
      transactions.forEach(tx => {
        // Ruang pertemuan/aula selesai otomatis sesuai tanggal acara, tidak memerlukan proses manual check-out
        if (tx.building === 'Ruang Pertemuan') return;

        if (tx.status === 'TERISI') {
          const checkoutDate = addDaysToDateStr(tx.startDate, tx.duration);
          if (checkoutDate <= realToday) {
            if (matchesAssignedBuilding(currentUser.assignedBuilding, tx.building)) {
              list.push({
                id: `alert-checkout-${tx.id}`,
                type: 'CHECKOUT_TODAY',
                division: 'RESEPSIONIS',
                title: `Jadwal Check-Out Hari Ini: ${tx.roomNumber}`,
                subtitle: `${tx.guestName} (${tx.building}) • Jatuh tempo hari ini (${formatIndonesianDate(checkoutDate)})`,
                roomNumber: tx.roomNumber,
                building: tx.building,
                categoryBadge: 'Jadwal Check-Out',
                severity: checkoutDate < realToday ? 'URGENT' : 'HIGH',
                actionLabel: 'Proses Check-Out',
                actionTab: 'gedung',
                modalToOpen: 'modalCheckoutSelection',
                modalData: { roomId: tx.roomId, type: 'CHECKOUT' }
              });
            }
          }
        }
      });
    }

    // 3. PEMESANAN SARAPAN (Divisi Koperasi & Dapur / Pimpinan)
    if (canSeeKoperasi) {
      transactions.forEach(tx => {
        if (tx.breakfast && tx.breakfastStatus !== 'SELESAI') {
          const isWaiting = tx.breakfastStatus === 'MENUNGGU';
          const isMaking = tx.breakfastStatus === 'SEDANG_DIBUAT';

          list.push({
            id: `alert-breakfast-${tx.id}`,
            type: 'BREAKFAST',
            division: 'KOPERASI',
            title: `Pesanan Sarapan: ${tx.breakfastPortions || 4} Porsi`,
            subtitle: `${tx.breakfastMenu || 'Sarapan Standar'} • Kamar ${tx.roomNumber} (${tx.guestName}) • Status: ${isWaiting ? 'Menunggu Dapur' : isMaking ? 'Sedang Dimasak' : 'Pengantaran'}`,
            roomNumber: tx.roomNumber,
            building: tx.building,
            categoryBadge: 'Pesanan Sarapan',
            severity: isWaiting ? 'HIGH' : 'NORMAL',
            actionLabel: 'Buka Dapur Sarapan',
            actionTab: 'pesananSarapan',
            modalToOpen: 'modalBreakfastDetail',
            modalData: tx
          });
        }
      });
    }

    // 4. PEMELIHARAAN & KERUSAKAN FASILITAS (Divisi Teknisi / Pimpinan)
    if (canSeeTeknisi) {
      maintenances.forEach(m => {
        if (m.status !== 'SELESAI') {
          if (matchesAssignedBuilding(currentUser.assignedBuilding, m.building)) {
            const isUrgent = m.urgency === 'Urgent';
            const isUnassigned = m.status === 'MENUNGGU_PENUGASAN';
            const isAssignedToMe = m.assignedTechnicianId === currentUser.id || m.technician === currentUser.username || m.assignedTechnicianName === currentUser.fullName;

            list.push({
              id: `alert-maint-${m.id}`,
              type: 'MAINTENANCE',
              division: 'TEKNISI',
              title: `${isUrgent ? 'DARURAT: ' : ''}Maintenance Kamar ${m.roomNumber}`,
              subtitle: `${m.building} • ${m.category}: "${m.description}" • ${isAssignedToMe ? '★ Ditugaskan Kepada Anda' : isUnassigned ? 'Belum Ada Teknisi' : `Teknisi: ${m.assignedTechnicianName || m.technician}`}`,
              roomNumber: m.roomNumber,
              building: m.building,
              categoryBadge: isUrgent ? 'Maintenance Urgent' : 'Perawatan Fasilitas',
              severity: isUrgent ? 'URGENT' : isUnassigned ? 'HIGH' : 'NORMAL',
              actionLabel: 'Tindak Lanjut Perbaikan',
              actionTab: 'laporanMaintenance',
              modalToOpen: 'modalMaintenanceDetail',
              modalData: m
            });
          }
        }
      });
    }

    // 5. QUALITY CONTROL (Divisi QC / Pimpinan)
    if (canSeeQc) {
      rooms.forEach(r => {
        if (r.qcStatus === 'MENUNGGU_QC' || r.qcStatus === 'PERLU_INSPEKSI' || r.qcStatus === 'PERLU_PERBAIKAN') {
          if (matchesAssignedBuilding(currentUser.assignedBuilding, r.building)) {
            const isPostRepair = r.qcStatus === 'MENUNGGU_QC';
            const isDamaged = r.qcStatus === 'PERLU_PERBAIKAN';

            list.push({
              id: `alert-qc-${r.id}`,
              type: 'QC',
              division: 'QC',
              title: `Inspeksi QC: ${r.roomNumber} (${r.type || 'Kamar'})`,
              subtitle: `${r.building} • ${isPostRepair ? 'Menunggu verifikasi siap huni pasca perbaikan' : isDamaged ? 'Tercatat bermasalah / butuh penanganan' : 'Jadwal inspeksi berkala kesiapan kamar'}`,
              roomNumber: r.roomNumber,
              building: r.building,
              categoryBadge: 'Quality Control',
              severity: isPostRepair ? 'HIGH' : 'NORMAL',
              actionLabel: 'Inspeksi & Verifikasi QC',
              actionTab: 'qualityControl',
              modalToOpen: 'modalQcInspection',
              modalData: r
            });
          }
        }
      });
    }

    // Sort: URGENT -> HIGH -> NORMAL
    const severityOrder = { URGENT: 0, HIGH: 1, NORMAL: 2 };
    return list.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }, [rooms, transactions, maintenances, realToday, canSeeRecep, canSeeKoperasi, canSeeTeknisi, canSeeQc, currentUser]);

  // Counts specific to user's division
  const counts = useMemo(() => {
    return {
      total: alerts.length,
      urgent: alerts.filter(a => a.severity === 'URGENT').length,
      checkin: alerts.filter(a => a.type === 'CHECKIN_TODAY').length,
      checkout: alerts.filter(a => a.type === 'CHECKOUT_TODAY').length,
      breakfast: alerts.filter(a => a.type === 'BREAKFAST').length,
      maintenance: alerts.filter(a => a.type === 'MAINTENANCE').length,
      qc: alerts.filter(a => a.type === 'QC').length
    };
  }, [alerts]);

  // Available filter tabs depending on division
  const filterTabs = useMemo(() => {
    const tabs: { id: string; label: string; count: number; icon: string; badgeColor: string }[] = [
      { id: 'ALL', label: 'Semua Divisi Saya', count: counts.total, icon: 'fa-layer-group', badgeColor: 'bg-slate-700 text-white' }
    ];

    if (canSeeRecep) {
      tabs.push({ id: 'CHECKIN', label: 'Check-In', count: counts.checkin, icon: 'fa-calendar-check', badgeColor: 'bg-emerald-700 text-white' });
      tabs.push({ id: 'CHECKOUT', label: 'Check-Out', count: counts.checkout, icon: 'fa-door-open', badgeColor: 'bg-blue-700 text-white' });
    }
    if (canSeeKoperasi) {
      tabs.push({ id: 'BREAKFAST', label: 'Sarapan', count: counts.breakfast, icon: 'fa-utensils', badgeColor: 'bg-amber-600 text-white' });
    }
    if (canSeeTeknisi) {
      tabs.push({ id: 'MAINTENANCE', label: 'Maintenance', count: counts.maintenance, icon: 'fa-wrench', badgeColor: 'bg-red-700 text-white' });
    }
    if (canSeeQc) {
      tabs.push({ id: 'QC', label: 'Quality Control', count: counts.qc, icon: 'fa-shield-check', badgeColor: 'bg-purple-700 text-white' });
    }

    return tabs;
  }, [canSeeRecep, canSeeKoperasi, canSeeTeknisi, canSeeQc, counts]);

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    if (selectedFilter === 'ALL') return alerts;
    if (selectedFilter === 'CHECKIN') return alerts.filter(a => a.type === 'CHECKIN_TODAY');
    if (selectedFilter === 'CHECKOUT') return alerts.filter(a => a.type === 'CHECKOUT_TODAY');
    if (selectedFilter === 'BREAKFAST') return alerts.filter(a => a.type === 'BREAKFAST');
    if (selectedFilter === 'MAINTENANCE') return alerts.filter(a => a.type === 'MAINTENANCE');
    if (selectedFilter === 'QC') return alerts.filter(a => a.type === 'QC');
    return alerts;
  }, [alerts, selectedFilter]);

  const handleAction = (alert: OperationalAlert) => {
    setIsOpen(false);
    if (alert.modalToOpen) {
      openModal(alert.modalToOpen as any, alert.modalData);
    }
    setActiveTab(alert.actionTab as any);
  };

  // Division description for the popover header
  const divisionLabel = isSuper 
    ? 'Akses Pimpinan (Seluruh Divisi)' 
    : canSeeRecep 
    ? 'Divisi Resepsionis' 
    : canSeeTeknisi 
    ? 'Divisi Teknisi & Perawatan Fasilitas' 
    : canSeeQc 
    ? 'Divisi Quality Control' 
    : canSeeKoperasi 
    ? 'Divisi Koperasi & Konsumsi' 
    : currentUser.department || 'Divisi Operasional';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Header Notification Trigger Button (NO SOUND ON CLICK) */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`relative px-2.5 sm:px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 border text-xs font-semibold shadow-xs ${
          counts.urgent > 0
            ? 'bg-red-500/20 hover:bg-red-500/30 border-red-400 text-white animate-pulse'
            : counts.total > 0
            ? 'bg-gold-500/20 hover:bg-gold-500/30 border-gold-400/40 text-gold-300'
            : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
        }`}
        title={`Pemberitahuan Operasional (${divisionLabel})`}
      >
        <div className="relative">
          <i className="fa-solid fa-bell text-sm text-gold-400"></i>
          {counts.total > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-2.5 w-2.5">
              {counts.urgent > 0 && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${counts.urgent > 0 ? 'bg-red-500' : 'bg-gold-400'}`}></span>
            </span>
          )}
        </div>

        <span className="hidden lg:inline text-xs">Pemberitahuan</span>

        {counts.total > 0 && (
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
            counts.urgent > 0 ? 'bg-red-500 text-white' : 'bg-gold-500 text-slate-900'
          }`}>
            {counts.total}
          </span>
        )}
      </button>

      {/* DROPDOWN POPOVER PANEL */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[92vw] sm:w-[480px] md:w-[520px] bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-xs max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
          {/* Header Panel */}
          <div className="p-3.5 bg-gradient-to-r from-hajj-950 via-hajj-900 to-slate-900 text-white flex items-center justify-between border-b border-gold-500/30">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-gold-500 text-slate-900 flex items-center justify-center font-bold text-sm shadow">
                <i className="fa-solid fa-clipboard-check"></i>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-sm text-white">Notifikasi Operasional</h3>
                  {counts.urgent > 0 && (
                    <span className="px-1.5 py-0.2 bg-red-600 text-white text-[9px] font-black rounded uppercase animate-pulse">
                      {counts.urgent} Urgent
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gold-300 font-medium">
                  {divisionLabel} {currentUser.assignedBuilding && currentUser.assignedBuilding !== 'Semua Gedung' ? `• Area ${currentUser.assignedBuilding}` : ''}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg text-xs transition"
              title="Tutup Panel Notifikasi"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>

          {/* Operational Filter Tabs (Specific to user's division) */}
          {filterTabs.length > 1 && (
            <div className="bg-slate-50 border-b border-slate-200 p-2 overflow-x-auto custom-scrollbar flex items-center space-x-1.5 shrink-0">
              {filterTabs.map(tab => {
                const isActive = selectedFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition flex items-center space-x-1 ${
                      isActive
                        ? `${tab.badgeColor} shadow-xs`
                        : 'bg-white hover:bg-slate-200 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <i className={`fa-solid ${tab.icon} text-[10px]`}></i>
                    <span>{tab.label}</span>
                    <span className="text-[10px] opacity-80">({tab.count})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* List of Notification Items */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-slate-100/60 max-h-[55vh]">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-10 px-4 space-y-2 text-slate-500">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 mx-auto text-base">
                  <i className="fa-solid fa-circle-check text-emerald-600"></i>
                </div>
                <p className="font-semibold text-xs text-slate-800">Tidak ada agenda tertunda untuk divisi Anda.</p>
                <p className="text-[10px] text-slate-400">
                  {currentUser.assignedBuilding && currentUser.assignedBuilding !== 'Semua Gedung'
                    ? `Fokus area: ${currentUser.assignedBuilding}. Semua operasional terkendali.`
                    : 'Semua tugas operasional divisi Anda telah diselesaikan.'}
                </p>
              </div>
            ) : (
              filteredAlerts.map(item => {
                let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
                let icon = 'fa-circle-info';
                let borderHighlight = 'border-slate-200';

                if (item.type === 'CHECKIN_TODAY') {
                  badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300';
                  icon = 'fa-calendar-check text-emerald-600';
                  borderHighlight = 'hover:border-emerald-400';
                } else if (item.type === 'CHECKOUT_TODAY') {
                  badgeStyle = 'bg-blue-50 text-blue-800 border-blue-300';
                  icon = 'fa-door-open text-blue-600';
                  borderHighlight = item.severity === 'URGENT' ? 'border-red-300 bg-red-50/40' : 'hover:border-blue-400';
                } else if (item.type === 'BREAKFAST') {
                  badgeStyle = 'bg-amber-50 text-amber-800 border-amber-300';
                  icon = 'fa-utensils text-amber-600';
                  borderHighlight = 'hover:border-amber-400';
                } else if (item.type === 'MAINTENANCE') {
                  badgeStyle = item.severity === 'URGENT' ? 'bg-red-100 text-red-800 border-red-300' : 'bg-orange-50 text-orange-800 border-orange-300';
                  icon = 'fa-triangle-exclamation text-red-600';
                  borderHighlight = item.severity === 'URGENT' ? 'border-red-400 bg-red-50/50 shadow-xs' : 'hover:border-orange-400';
                } else if (item.type === 'QC') {
                  badgeStyle = 'bg-purple-50 text-purple-800 border-purple-300';
                  icon = 'fa-shield-halved text-purple-600';
                  borderHighlight = 'hover:border-purple-400';
                }

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-xl p-3 border transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${borderHighlight}`}
                  >
                    <div className="flex items-start space-x-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-sm shrink-0 mt-0.5">
                        <i className={`fa-solid ${icon}`}></i>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${badgeStyle}`}>
                            {item.categoryBadge}
                          </span>
                          {item.severity === 'URGENT' && (
                            <span className="px-1.5 py-0.2 bg-red-600 text-white rounded text-[9px] font-black animate-pulse">
                              DARURAT
                            </span>
                          )}
                          {item.roomNumber && (
                            <span className="font-bold text-slate-900 text-xs">
                              Kamar {item.roomNumber}
                            </span>
                          )}
                        </div>

                        <h4 className="font-semibold text-xs text-slate-900 mt-1 leading-tight">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAction(item)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-hajj-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 self-end sm:self-center shrink-0 shadow-xs"
                    >
                      <span>{item.actionLabel}</span>
                      <i className="fa-solid fa-arrow-right text-[10px]"></i>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Footer Summary */}
          <div className="p-2.5 bg-white border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
            <span className="flex items-center space-x-1.5">
              <i className="fa-solid fa-shield-halved text-gold-600"></i>
              <span>Menampilkan informasi relevan untuk {divisionLabel}.</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setActiveTab('gedung');
              }}
              className="text-hajj-700 font-bold hover:underline"
            >
              Lihat Denah
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Quick Operational Ribbon for Sub-Header
 * Shows real-time highlights of agendas strictly relevant to the logged-in user's division
 */
export function OperationalSummaryRibbon() {
  const { currentUser, rooms, transactions, maintenances, setActiveTab } = useAppContext();
  const realToday = getRealTodayDate();

  if (!currentUser) return null;

  const role = currentUser.role || '';
  const isSuper = isSuperAdmin(role);
  const canSeeRecep = isRecepRole(role);
  const canSeeKoperasi = isKoperasiRole(role);
  const canSeeTeknisi = isTeknisiRole(role);
  const canSeeQc = isQcRole(role);

  // 1. Checkin today (Recep / Super)
  const checkinTodayCount = canSeeRecep ? transactions.filter(
    tx => {
      const isDue = (tx.status === 'BOOKED' && tx.startDate <= realToday) || (tx.startDate === realToday && tx.status === 'BOOKED');
      return isDue && matchesAssignedBuilding(currentUser.assignedBuilding, tx.building);
    }
  ).length : 0;

  // 2. Checkout today (Recep / Super)
  const checkoutTodayCount = canSeeRecep ? transactions.filter(tx => {
    if (tx.status !== 'TERISI') return false;
    const checkoutDate = addDaysToDateStr(tx.startDate, tx.duration);
    return checkoutDate <= realToday && matchesAssignedBuilding(currentUser.assignedBuilding, tx.building);
  }).length : 0;

  // 3. Breakfast pending (Koperasi / Super)
  const breakfastPendingCount = canSeeKoperasi ? transactions
    .filter(tx => tx.breakfast && tx.breakfastStatus !== 'SELESAI')
    .reduce((sum, tx) => sum + (tx.breakfastPortions || 0), 0) : 0;

  // 4. Urgent maintenance (Teknisi / Super)
  const urgentMaintCount = canSeeTeknisi ? maintenances.filter(
    m => m.status !== 'SELESAI' && m.urgency === 'Urgent' && matchesAssignedBuilding(currentUser.assignedBuilding, m.building)
  ).length : 0;

  // 5. QC pending (QC / Super)
  const qcPendingCount = canSeeQc ? rooms.filter(
    r => (r.qcStatus === 'MENUNGGU_QC' || r.qcStatus === 'PERLU_INSPEKSI') && matchesAssignedBuilding(currentUser.assignedBuilding, r.building)
  ).length : 0;

  // 6. Aula events today (Recep / Super)
  const aulaEventsTodayCount = canSeeRecep ? transactions.filter(
    tx => tx.building === 'Ruang Pertemuan' && (tx.status === 'TERISI' || (tx.status === 'BOOKED' && tx.startDate === realToday)) && matchesAssignedBuilding(currentUser.assignedBuilding, tx.building)
  ).length : 0;

  const hasAnyAlert = checkinTodayCount > 0 || checkoutTodayCount > 0 || breakfastPendingCount > 0 || urgentMaintCount > 0 || qcPendingCount > 0 || aulaEventsTodayCount > 0;

  if (!hasAnyAlert) return null;

  return (
    <div className="bg-slate-900/95 border-b border-gold-500/20 px-4 sm:px-6 lg:px-8 py-1.5 text-xs text-slate-200 flex items-center justify-between overflow-x-auto custom-scrollbar no-print">
      <div className="max-w-7xl mx-auto w-full flex items-center space-x-3 text-[11px] whitespace-nowrap">
        <span className="font-bold text-gold-400 flex items-center space-x-1 shrink-0">
          <i className="fa-solid fa-clock-rotate-left"></i>
          <span>Agenda Operasional Hari Ini:</span>
        </span>

        <div className="flex items-center space-x-2">
          {canSeeRecep && aulaEventsTodayCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('gedung')}
              className="bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-md flex items-center space-x-1 font-semibold transition"
              title="Klik untuk melihat acara aula yang sedang berlangsung"
            >
              <i className="fa-solid fa-handshake text-[10px]"></i>
              <span>{aulaEventsTodayCount} Acara Aula Hari Ini</span>
            </button>
          )}

          {canSeeRecep && checkinTodayCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('gedung')}
              className="bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center space-x-1 font-semibold transition"
              title="Klik untuk proses tamu check-in"
            >
              <i className="fa-solid fa-calendar-check text-[10px]"></i>
              <span>{checkinTodayCount} Check-In</span>
            </button>
          )}

          {canSeeRecep && checkoutTodayCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('gedung')}
              className="bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-md flex items-center space-x-1 font-semibold transition"
              title="Klik untuk proses tamu check-out"
            >
              <i className="fa-solid fa-door-open text-[10px]"></i>
              <span>{checkoutTodayCount} Check-Out</span>
            </button>
          )}

          {canSeeKoperasi && breakfastPendingCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('pesananSarapan')}
              className="bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md flex items-center space-x-1 font-semibold transition"
              title="Klik untuk melihat pesanan sarapan aktif"
            >
              <i className="fa-solid fa-utensils text-[10px]"></i>
              <span>{breakfastPendingCount} Porsi Sarapan</span>
            </button>
          )}

          {canSeeTeknisi && urgentMaintCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('laporanMaintenance')}
              className="bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-md flex items-center space-x-1 font-bold animate-pulse transition"
              title="Klik untuk menindaklanjuti perbaikan darurat"
            >
              <i className="fa-solid fa-triangle-exclamation text-[10px]"></i>
              <span>{urgentMaintCount} Maint Urgent</span>
            </button>
          )}

          {canSeeQc && qcPendingCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('qualityControl')}
              className="bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-md flex items-center space-x-1 font-semibold transition"
              title="Klik untuk inspeksi kelayakan kamar"
            >
              <i className="fa-solid fa-shield-check text-[10px]"></i>
              <span>{qcPendingCount} Butuh QC</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
