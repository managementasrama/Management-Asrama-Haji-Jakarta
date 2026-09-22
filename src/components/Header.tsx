import { useState, useRef, useEffect } from 'react';
import { useAppContext, isSuperAdmin } from '../store';
import { OperationalNotifications, OperationalSummaryRibbon } from './OperationalNotifications';

export function Header() {
  const { 
    currentUser, login, logout, activeTab, setActiveTab, openModal, users, showToast, isDarkMode, toggleDarkMode, appSettings,
    supabaseSyncState, manualSyncSupabase
  } = useAppContext();
  const [isSwitchOpen, setIsSwitchOpen] = useState(false);
  const switchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (switchRef.current && !switchRef.current.contains(e.target as Node)) {
        setIsSwitchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentUser) return null;

  const ALL_TABS_CONFIG = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: 'fa-chart-pie', 
      roles: ['Super Admin', 'Admin', 'Manager Resepsionis', 'Resepsionis', 'Manager QC', 'Quality Control', 'Manager Teknisi', 'Teknisi', 'Manager Koperasi', 'Petugas Koperasi', 'Koperasi', 'Manager'] 
    },
    { 
      id: 'gedung', 
      label: 'Manajemen Gedung', 
      icon: 'fa-building', 
      roles: ['Super Admin', 'Admin', 'Manager Resepsionis', 'Resepsionis', 'Manager QC', 'Quality Control', 'Manager Teknisi', 'Teknisi', 'Manager Koperasi', 'Petugas Koperasi', 'Koperasi', 'Manager'] 
    },
    { 
      id: 'pesananSarapan', 
      label: 'Pesanan Dapur', 
      icon: 'fa-utensils', 
      roles: ['Super Admin', 'Admin', 'Manager Koperasi', 'Petugas Koperasi', 'Manager Resepsionis', 'Resepsionis', 'Manager', 'Koperasi'] 
    },
    { 
      id: 'qualityControl', 
      label: 'Pengecekan (QC)', 
      icon: 'fa-clipboard-check', 
      roles: ['Super Admin', 'Admin', 'Manager QC', 'Quality Control', 'Manager Resepsionis', 'Manager'] 
    },
    { 
      id: 'laporanMaintenance', 
      label: 'Laporan Perawatan', 
      icon: 'fa-screwdriver-wrench', 
      roles: ['Super Admin', 'Admin', 'Manager Teknisi', 'Teknisi', 'Manager QC', 'Quality Control', 'Manager Resepsionis', 'Manager'] 
    },
    { 
      id: 'laporanKamar', 
      label: 'Laporan Pemesanan', 
      icon: 'fa-file-invoice', 
      roles: ['Super Admin', 'Admin', 'Manager Resepsionis', 'Resepsionis', 'Manager'] 
    },
    { 
      id: 'auditLog', 
      label: 'Log Aktivitas & Shift', 
      icon: 'fa-clock-rotate-left', 
      roles: ['Super Admin', 'Admin', 'Manager Resepsionis', 'Manager QC', 'Manager Teknisi', 'Manager Koperasi', 'Manager'] 
    },
    { 
      id: 'kelolaAnggota', 
      label: 'Kelola Anggota', 
      icon: 'fa-users-gear', 
      roles: ['Super Admin', 'Admin'] 
    }
  ];

  const getDefaultTabForRole = (_role: string): string => {
    return 'dashboard';
  };

  const handleSwitchAccount = (user: typeof users[0]) => {
    login(user);
    setIsSwitchOpen(false);
    setActiveTab('dashboard');
    showToast(`Beralih akun: ${user.fullName} (${user.role}) - Membuka Dashboard`, 'success');
  };

  const tabs = ALL_TABS_CONFIG.filter(tab => tab.roles.includes(currentUser.role));

  // Group users for switcher dropdown
  const divisions = [
    { 
      name: 'Administrator (Super Admin & Admin)', 
      color: 'text-emerald-600 font-bold', 
      users: users.filter(u => isSuperAdmin(u.role) || u.username.toLowerCase() === 'admin') 
    },
    { name: 'Divisi Resepsionis', color: 'text-blue-600', users: users.filter(u => u.role.includes('Resepsionis')) },
    { name: 'Divisi Quality Control', color: 'text-teal-600', users: users.filter(u => u.role.includes('QC') || u.role.includes('Quality')) },
    { name: 'Divisi Teknisi', color: 'text-amber-600', users: users.filter(u => u.role.includes('Teknisi')) },
    { name: 'Divisi Koperasi', color: 'text-orange-600', users: users.filter(u => u.role.includes('Koperasi')) },
  ];

  return (
    <header className="bg-gradient-to-r from-hajj-900 via-hajj-800 to-slate-900 text-white shadow-lg sticky top-0 z-40 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xl shadow-md border overflow-hidden shrink-0 ${appSettings?.appLogo && appSettings.appLogo.startsWith('data:') ? 'bg-transparent border-0 shadow-none' : 'bg-gold-500 text-slate-900 border-gold-400'}`}>
              {appSettings?.appLogo && appSettings.appLogo.startsWith('data:') ? (
                <img src={appSettings.appLogo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <i className={`fa-solid ${appSettings?.appLogo || 'fa-kaaba'}`}></i>
              )}
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-wide text-white leading-tight">{appSettings?.organizationName || 'UPT Asrama Haji Jakarta'}</h1>
              <p className="text-xs text-gold-400 font-medium hidden sm:block">{appSettings?.subTitle || 'Kementerian Haji dan Umrah RI • Sistem Operasional Terpadu'}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 ml-auto">
            {/* Dark Mode & Notifications (Grouped) */}
            <div className="flex items-center space-x-1.5 bg-white/10 px-2 py-1 rounded-lg border border-white/15">
              <button
                type="button"
                onClick={toggleDarkMode}
                className="p-1.5 rounded-md hover:bg-white/20 text-gold-400 transition"
                title={isDarkMode ? "Beralih ke Mode Terang (Light Mode)" : "Beralih ke Mode Gelap (Dark Mode)"}
              >
                <i className={`fa-solid ${isDarkMode ? 'fa-sun text-amber-300' : 'fa-moon text-indigo-200'} text-sm`}></i>
              </button>
              <OperationalNotifications />
            </div>

            {/* Right-aligned Cluster for Supporting Features */}
            <div className="flex items-center space-x-2">
              {/* Quick Switch Account Dropdown */}
              <div className="relative" ref={switchRef}>
                <button 
                  type="button"
                  onClick={() => setIsSwitchOpen(prev => !prev)}
                  className="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 shadow-xs"
                  title="Ganti akun untuk pengujian hak akses"
                >
                  <i className="fa-solid fa-users-viewfinder text-gold-400"></i>
                  <span className="hidden md:inline">Ganti Akun</span>
                  <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${isSwitchOpen ? 'rotate-180' : ''}`}></i>
                </button>

                {isSwitchOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-xs max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-3 bg-gradient-to-r from-hajj-900 to-slate-900 text-white flex items-center justify-between">
                      <div>
                        <div className="font-bold flex items-center space-x-1.5 text-gold-400">
                          <i className="fa-solid fa-id-badge"></i>
                          <span>Pilih Akun Pengguna</span>
                        </div>
                        <p className="text-[10px] text-slate-300 mt-0.5">Uji hak akses peran & alur kerja antar-divisi</p>
                      </div>
                      <span className="text-[10px] bg-gold-500/20 text-gold-300 px-2 py-0.5 rounded font-bold border border-gold-400/30">
                        12 Akun Resmi
                      </span>
                    </div>

                    <div className="p-2 overflow-y-auto custom-scrollbar space-y-3 flex-1">
                      {divisions.map((div, divIdx) => (
                        <div key={divIdx} className="space-y-1">
                          <p className={`text-[10px] font-bold uppercase tracking-wider px-2 pt-1 flex items-center ${div.color}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5"></span>
                            {div.name}
                          </p>
                          <div className="space-y-1">
                            {div.users.map(u => {
                              const isCurrent = u.id === currentUser.id;
                              return (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => handleSwitchAccount(u)}
                                  className={`w-full text-left p-2 rounded-lg transition flex items-center justify-between group ${
                                    isCurrent 
                                      ? 'bg-hajj-50 border border-hajj-300 font-bold text-hajj-950' 
                                      : 'hover:bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center space-x-2.5">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                      isCurrent ? 'bg-hajj-700 text-white' : 'bg-slate-200 text-slate-700 group-hover:bg-slate-300'
                                    }`}>
                                      {u.fullName.charAt(0)}
                                    </div>
                                    <div>
                                      <div className="flex items-center space-x-1.5">
                                        <span className="font-semibold text-slate-900">{u.fullName}</span>
                                        {isCurrent && (
                                          <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">
                                            Aktif
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-slate-500 flex items-center space-x-1">
                                        <span className="font-medium text-slate-700">{u.role}</span>
                                        <span>•</span>
                                        <span className="text-slate-500 font-mono">{u.username}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <i className={`fa-solid fa-arrow-right-to-bracket text-xs opacity-0 group-hover:opacity-100 transition-opacity ${
                                    isCurrent ? 'text-hajj-700 opacity-100' : 'text-slate-400'
                                  }`}></i>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 text-center">
                      Setiap peran memiliki menu, hak kelola, dan alur otorisasi yang berbeda.
                    </div>
                  </div>
                )}
              </div>

              {/* Supabase Cloud Sync Status Button */}
              <button
                type="button"
                onClick={manualSyncSupabase}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition text-xs flex items-center justify-center space-x-1 shadow-xs cursor-pointer"
                title={
                  supabaseSyncState.status === 'connected'
                    ? 'Terkoneksi ke Supabase Cloud. Klik untuk sinkronisasi ulang data.'
                    : supabaseSyncState.status === 'syncing'
                    ? 'Sedang menyinkronkan data dengan Supabase...'
                    : 'Klik untuk menghubungkan & sinkronisasi data dengan Supabase'
                }
              >
                {supabaseSyncState.status === 'syncing' ? (
                  <i className="fa-solid fa-arrows-rotate animate-spin text-sky-300 text-sm"></i>
                ) : supabaseSyncState.status === 'connected' ? (
                  <span className="flex items-center space-x-1">
                    <i className="fa-solid fa-cloud text-emerald-400 text-sm"></i>
                    <span className="hidden xl:inline text-[10px] font-bold text-emerald-300">Sync</span>
                  </span>
                ) : (
                  <i className="fa-solid fa-cloud-arrow-up text-amber-300 text-sm"></i>
                )}
              </button>

              {/* Settings / Pengaturan Button */}
              <button
                type="button"
                onClick={() => openModal('modalAccountProfile')}
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 shadow-xs"
                title="Pengaturan Akun & Aplikasi UPT"
              >
                <i className="fa-solid fa-gear text-gold-400"></i>
                <span className="hidden lg:inline">Pengaturan</span>
              </button>

              {/* Active User Badge */}
              <button
                type="button"
                onClick={() => openModal('modalAccountProfile')}
                className="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-lg border text-xs bg-white/10 backdrop-blur-md border-white/10 cursor-pointer hover:ring-2 hover:ring-gold-400 transition-all text-left"
                title="Klik untuk Edit Profil Akun Anda"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></div>
                <div className="flex flex-col text-left">
                  <span className="font-bold text-gold-400 text-[10px] leading-tight">
                    {currentUser.role}
                  </span>
                  <span className="text-slate-200 text-[11px] font-medium leading-tight truncate max-w-[110px]">
                    {currentUser.fullName}
                  </span>
                </div>
              </button>

              {/* Logout / Keluar Button */}
              <button 
                onClick={logout} 
                className="bg-red-500/20 hover:bg-red-600 text-red-200 hover:text-white border border-red-500/30 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all flex items-center space-x-1"
                title="Keluar dari sistem"
              >
                <i className="fa-solid fa-right-from-bracket"></i>
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Highlights Ribbon (Checkin, Checkout, Breakfast, Urgent Maintenance, QC) */}
      <OperationalSummaryRibbon />

      <div className="bg-hajj-900/90 border-t border-white/10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex space-x-1 overflow-x-auto custom-scrollbar py-1">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)} 
              className={`px-3 sm:px-4 py-2 rounded-md text-xs transition-all flex items-center space-x-1.5 shrink-0 ${
                activeTab === tab.id 
                  ? 'text-gold-400 bg-white/10 font-semibold' 
                  : 'text-slate-300 hover:text-white hover:bg-white/5 font-medium'
              }`}
            >
              <i className={`fa-solid ${tab.icon}`}></i>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
