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
            {/* Dark Mode Toggle with Visual Switch & Active Mode Label */}
            <div className="flex items-center space-x-2 bg-white/10 p-1.5 rounded-xl border border-white/15">
              <button
                type="button"
                onClick={toggleDarkMode}
                className="flex items-center space-x-2.5 px-2 py-1 rounded-lg transition-all cursor-pointer select-none group focus:outline-hidden"
                title={isDarkMode ? "Mode Gelap aktif. Klik untuk beralih ke Mode Terang." : "Mode Terang aktif. Klik untuk beralih ke Mode Gelap."}
                aria-label={`Beralih mode tema, saat ini ${isDarkMode ? 'Mode Gelap' : 'Mode Terang'}`}
              >
                {/* Physical Toggle Switch Track & Sliding Thumb */}
                <div 
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out flex items-center ${
                    isDarkMode ? 'bg-amber-400' : 'bg-slate-700/60'
                  }`}
                >
                  <div 
                    className={`w-4 h-4 rounded-full bg-white shadow-md flex items-center justify-center text-[9px] transform transition-transform duration-200 ease-in-out ${
                      isDarkMode ? 'translate-x-5 text-slate-900' : 'translate-x-0 text-amber-500'
                    }`}
                  >
                    <i className={`fa-solid ${isDarkMode ? 'fa-moon' : 'fa-sun'}`}></i>
                  </div>
                </div>

                {/* Active Mode Status Text */}
                <div className="text-left leading-none">
                  <span className="text-[10px] text-gold-300 font-semibold uppercase tracking-wider block">Mode Aktif</span>
                  <span className="text-xs font-black text-white group-hover:text-gold-200 transition-colors">
                    {isDarkMode ? 'Mode Gelap' : 'Mode Terang'}
                  </span>
                </div>
              </button>
              <div className="h-5 w-px bg-white/15"></div>
              <OperationalNotifications />
            </div>

            {/* Unified Super Admin / User Account Menu */}
            <div className="relative" ref={switchRef}>
              <button
                type="button"
                onClick={() => setIsSwitchOpen(prev => !prev)}
                className="flex items-center space-x-2 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs bg-white/10 hover:bg-white/20 backdrop-blur-md border-white/20 cursor-pointer hover:ring-2 hover:ring-gold-400 transition-all text-left shadow-xs"
                title="Buka Menu Akun Super Admin & Pengaturan"
              >
                <div className="relative shrink-0">
                  <div className="w-7 h-7 rounded-lg bg-gold-500 text-slate-900 font-bold flex items-center justify-center text-xs shadow-xs">
                    {currentUser.role.includes('Admin') ? (
                      <i className="fa-solid fa-user-shield text-[12px]"></i>
                    ) : (
                      currentUser.fullName.charAt(0)
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900"></div>
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-bold text-gold-400 text-[10px] leading-tight flex items-center space-x-1">
                    <span>{currentUser.role}</span>
                    <i className={`fa-solid fa-chevron-down text-[8px] text-gold-300 transition-transform ${isSwitchOpen ? 'rotate-180' : ''}`}></i>
                  </span>
                  <span className="text-slate-200 text-[11px] font-medium leading-tight truncate max-w-[100px] sm:max-w-[130px]">
                    {currentUser.fullName}
                  </span>
                </div>
              </button>

              {isSwitchOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden text-xs max-h-[88vh] flex flex-col animate-in fade-in zoom-in-95 duration-100">
                  {/* 1. Header Profil Super Admin / Petugas (MUNCUL PERTAMA) */}
                  <div className="p-4 bg-gradient-to-r from-hajj-900 via-slate-900 to-hajj-950 text-white space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gold-500 text-slate-900 font-extrabold flex items-center justify-center text-base shadow-md shrink-0">
                          {currentUser.role.includes('Admin') ? (
                            <i className="fa-solid fa-user-shield"></i>
                          ) : (
                            currentUser.fullName.charAt(0)
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-bold text-sm text-white truncate">{currentUser.fullName}</h4>
                            <span className="text-[9px] bg-gold-400/20 text-gold-300 px-1.5 py-0.2 rounded font-bold border border-gold-400/30 shrink-0">
                              {currentUser.role}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 font-mono">@{currentUser.username}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsSwitchOpen(false)}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition text-sm cursor-pointer"
                        title="Tutup Menu"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px] text-slate-300">
                      <div className="flex items-center space-x-1.5 truncate">
                        <i className="fa-solid fa-building-user text-gold-400 text-xs shrink-0"></i>
                        <span className="truncate">{currentUser.department || 'Pimpinan & IT UPT'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsSwitchOpen(false);
                          logout();
                        }}
                        className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[11px] flex items-center space-x-1.5 transition border border-red-400/40 shrink-0 cursor-pointer shadow-xs"
                        title="Keluar dari sesi saat ini"
                      >
                        <i className="fa-solid fa-right-from-bracket text-xs"></i>
                        <span>Keluar</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. MENU KHUSUS ADMIN & PETUGAS */}
                  <div className="p-3 overflow-y-auto custom-scrollbar space-y-3 flex-1">
                    {(isSuperAdmin(currentUser.role) || currentUser.role.includes('Admin')) && (
                      <>
                        {/* 2a. Konfigurasi Judul & Logo Web */}
                        <div className="p-3 bg-gradient-to-r from-amber-50 to-gold-50/60 dark:bg-slate-700/50 border border-amber-200 dark:border-amber-700/40 rounded-xl space-y-2 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 flex items-center justify-center text-xs shrink-0">
                                <i className="fa-solid fa-palette"></i>
                              </div>
                              <div>
                                <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">Konfigurasi Judul &amp; Logo Web</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-300 block">Identitas Instansi, Favicon &amp; Tampilan</span>
                              </div>
                            </div>
                            <span className="text-[9px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded font-bold border border-amber-300 dark:border-amber-700">
                              Admin
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setIsSwitchOpen(false);
                              openModal('modalAccountProfile', { section: 'BRANDING' });
                            }}
                            className="w-full py-1.5 px-3 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-600 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer shadow-xs"
                          >
                            <i className="fa-solid fa-pen-ruler text-amber-600 dark:text-amber-400"></i>
                            <span>Buka Pengaturan Judul &amp; Logo</span>
                          </button>
                        </div>

                        {/* 2b. Profil Akun (Dikeluarkan dan diletakkan tepat di atas Supabase Cloud) */}
                        <div className="p-3 bg-gradient-to-r from-slate-50 to-emerald-50/50 dark:bg-slate-700/50 border border-emerald-200/80 dark:border-emerald-700/40 rounded-xl space-y-2 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 flex items-center justify-center text-xs shrink-0">
                                <i className="fa-solid fa-user-gear"></i>
                              </div>
                              <div>
                                <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">Profil Akun</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-300 block">Kredensial Login &amp; Kontak Pribadi</span>
                              </div>
                            </div>
                            <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded font-bold border border-emerald-300 dark:border-emerald-700">
                              Akun
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setIsSwitchOpen(false);
                              openModal('modalAccountProfile', { section: 'PROFIL' });
                            }}
                            className="w-full py-1.5 px-3 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-600 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer shadow-xs"
                          >
                            <i className="fa-solid fa-user-pen text-emerald-600 dark:text-emerald-400"></i>
                            <span>Buka Pengaturan Profil Akun</span>
                          </button>
                        </div>

                        {/* 3b. Supabase Cloud */}
                        <div className="p-3 bg-gradient-to-r from-slate-50 to-sky-50/50 dark:bg-slate-700/50 border border-sky-200/80 dark:border-sky-700/40 rounded-xl space-y-2 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 flex items-center justify-center text-xs shrink-0">
                                <i className="fa-solid fa-cloud"></i>
                              </div>
                              <div>
                                <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">Supabase Cloud</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-300 block">Penyimpanan &amp; Sinkronisasi Data</span>
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                              supabaseSyncState.status === 'connected' 
                                ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700' 
                                : supabaseSyncState.status === 'syncing' 
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700 animate-pulse' 
                                : 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                supabaseSyncState.status === 'connected' ? 'bg-emerald-600 dark:bg-emerald-400' :
                                supabaseSyncState.status === 'syncing' ? 'bg-blue-600 dark:bg-blue-400' : 'bg-amber-600 dark:bg-amber-400'
                              }`}></span>
                              <span>
                                {supabaseSyncState.status === 'connected' ? 'Terkoneksi' :
                                 supabaseSyncState.status === 'syncing' ? 'Menyinkronkan...' : 'Offline / Standby'}
                              </span>
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={manualSyncSupabase}
                            disabled={supabaseSyncState.status === 'syncing'}
                            className="w-full py-2 px-3 bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-sky-900 dark:hover:text-sky-100 border border-sky-200 dark:border-sky-600 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer shadow-xs disabled:opacity-50"
                          >
                            <i className={`fa-solid ${supabaseSyncState.status === 'syncing' ? 'fa-arrows-rotate animate-spin text-sky-600' : 'fa-arrows-rotate text-emerald-600'}`}></i>
                            <span>{supabaseSyncState.status === 'syncing' ? 'Sedang Sinkronisasi Cloud...' : 'Sinkronisasi Data Supabase Sekarang'}</span>
                          </button>
                        </div>

                        {/* 3c. Ganti Akun Section */}
                        <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-between px-1">
                            <div className="flex items-center space-x-1.5 font-bold text-slate-800 dark:text-slate-100 text-xs">
                              <i className="fa-solid fa-users-viewfinder text-hajj-700 dark:text-gold-400"></i>
                              <span>Ganti Akun (Uji 12 Hak Akses)</span>
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded font-semibold">
                              Semua Divisi
                            </span>
                          </div>

                          <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar pr-1">
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
                                        onClick={() => {
                                          handleSwitchAccount(u);
                                          setIsSwitchOpen(false);
                                        }}
                                        className={`w-full text-left p-2 rounded-lg transition flex items-center justify-between group cursor-pointer ${
                                          isCurrent 
                                            ? 'bg-hajj-50 dark:bg-hajj-900/60 border border-hajj-300 dark:border-hajj-700 font-bold text-hajj-950 dark:text-gold-200 shadow-2xs' 
                                            : 'hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200'
                                        }`}
                                      >
                                        <div className="flex items-center space-x-2.5 min-w-0">
                                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                            isCurrent ? 'bg-hajj-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 group-hover:bg-slate-300'
                                          }`}>
                                            {u.fullName.charAt(0)}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="flex items-center space-x-1.5">
                                              <span className="font-semibold text-slate-900 dark:text-white truncate text-xs">{u.fullName}</span>
                                              {isCurrent && (
                                                <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold shrink-0">
                                                  Aktif
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center space-x-1 truncate">
                                              <span className="font-medium text-slate-700 dark:text-slate-300">{u.role}</span>
                                              <span>•</span>
                                              <span className="text-slate-500 dark:text-slate-400 font-mono">@{u.username}</span>
                                            </div>
                                          </div>
                                        </div>
                                        <i className={`fa-solid fa-arrow-right-to-bracket text-xs transition-opacity shrink-0 ${
                                          isCurrent ? 'text-hajj-700 dark:text-gold-400 opacity-100' : 'text-slate-400 opacity-0 group-hover:opacity-100'
                                        }`}></i>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
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
