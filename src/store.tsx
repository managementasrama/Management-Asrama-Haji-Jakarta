import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  Room, 
  Transaction, 
  Maintenance, 
  AuditLog, 
  WorkSession, 
  QcInspection, 
  ChatChannel, 
  ChatMessage, 
  BreakfastMenuItem, 
  BreakfastOrder,
  Building,
  MeetingRoom,
  PasswordResetRequest,
  UserRole
} from './types';
import { initialUsers, getInitialRooms, initialTransactions, initialMaintenances, initialAuditLogs, initialWorkSessions, initialQcInspections, initialBuildings, initialMeetingRooms } from './data';
import { initialChatChannels, initialChatMessages } from './chatData';
import { playNotificationSound } from './lib/sound';
import { getRealTodayDate, formatIndonesianDate, addDaysToDateStr, getTxDays, getRealLocalDateTimeStr, parseLocalTimeString } from './lib/utils';
import { dataStorage, DataStorageService, StorageNamespace, AppSettings } from './services/dataStorage';
import { useBodyScrollLock } from './lib/scrollLock';

export function formatHMS(totalSeconds: number): string {
  if (totalSeconds < 0) totalSeconds = 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours} Jam ${minutes} Menit ${seconds} Detik`;
}

// Role Authorization Helpers
export function isSuperAdmin(role?: string): boolean {
  return role === 'Super Admin' || role === 'Admin';
}
export function isManagerTeknisi(role?: string): boolean {
  return role === 'Manager Teknisi' || isSuperAdmin(role);
}
export function isManagerQc(role?: string): boolean {
  return role === 'Manager QC' || isSuperAdmin(role);
}
export function isManagerRecep(role?: string): boolean {
  return role === 'Manager Resepsionis' || isSuperAdmin(role);
}
export function isManagerKoperasi(role?: string): boolean {
  return role === 'Manager Koperasi' || isSuperAdmin(role);
}
export function isManagerRole(role?: string): boolean {
  return isSuperAdmin(role) || 
         role === 'Manager Resepsionis' || 
         role === 'Manager QC' || 
         role === 'Manager Teknisi' || 
         role === 'Manager Koperasi';
}
export function isRecepRole(role?: string): boolean {
  return role === 'Resepsionis' || role === 'Manager Resepsionis' || isSuperAdmin(role);
}
export function isTeknisiRole(role?: string): boolean {
  return role === 'Teknisi' || role === 'Manager Teknisi' || isSuperAdmin(role);
}
export function isQcRole(role?: string): boolean {
  return role === 'Quality Control' || role === 'Manager QC' || isSuperAdmin(role);
}
export function isKoperasiRole(role?: string): boolean {
  return role === 'Petugas Koperasi' || role === 'Manager Koperasi' || role === 'Koperasi' || isSuperAdmin(role);
}

interface AppContextType {
  currentUser: User | null;
  users: User[];
  rooms: Room[];
  transactions: Transaction[];
  maintenances: Maintenance[];
  auditLogs: AuditLog[];
  workSessions: WorkSession[];
  qcInspections: QcInspection[];
  activeSessionId: string | null;
  clearWorkSessions: () => void;
  activeTab: string;
  toasts: { id: string, msg: string, type: string }[];
  modalState: { [key: string]: any };
  
  // Storage Mode (PROD / DEMO) & Dark Mode
  storageNamespace: StorageNamespace;
  switchStorageNamespace: (ns: StorageNamespace) => void;
  isNetworkOnline: boolean;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  updateCurrentAccount: (updatedData: { fullName?: string; username?: string; phone?: string; password?: string }) => void;
  appSettings: AppSettings;
  updateAppSettings: (newTitle?: string, newLogo?: string) => void;

  // Supabase Cloud Sync
  supabaseSyncState: {
    status: 'idle' | 'syncing' | 'connected' | 'error';
    lastSyncTime: string | null;
    errorMessage: string | null;
  };
  manualSyncSupabase: () => Promise<void>;
  pushAllToSupabase: () => Promise<void>;

  // Chat State & Methods
  chatChannels: ChatChannel[];
  chatMessages: ChatMessage[];
  isChatOpen: boolean;
  activeChatChannelId: string | null;
  chatSoundEnabled: boolean;
  chatNotificationToast: { message: ChatMessage; channelName: string; channelId: string } | null;
  unreadTotalCount: number;
  openChat: (channelId?: string) => void;
  closeChat: () => void;
  setActiveChatChannelId: (channelId: string | null) => void;
  toggleChatSound: () => void;
  sendChatMessage: (channelId: string, text: string, priority?: 'NORMAL' | 'PENTING' | 'URGENT', isInstruction?: boolean) => void;
  markChannelAsRead: (channelId: string) => void;
  dismissChatNotification: () => void;
  simulateIncomingChatMessage: (channelId?: string) => void;
  
  login: (user: User, preferNamespace?: StorageNamespace, rememberDevice?: boolean) => void;
  logout: () => void;
  setActiveTab: (tab: string) => void;
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  toggleUserStatus: (userId: string) => void;
  deleteUser: (userId: string) => void;
  
  addTransaction: (tx: Transaction) => void;
  addGroupBooking: (txs: Transaction[], groupName: string) => void;
  updateGroupBooking: (editGroupId: string, txs: Transaction[], groupName: string) => void;
  updateTransaction: (tx: Transaction) => void;
  updateBreakfastStatus: (txId: string, status: 'MENUNGGU' | 'SEDANG_DIBUAT' | 'PENGANTARAN' | 'SELESAI') => void;
  checkoutRoom: (roomId: string, txId?: string) => void;
  activateCheckin: (roomId: string, targetTxId?: string) => void;
  cancelBooking: (roomId: string, txId?: string) => void;
  extendTransaction: (txId: string, additionalDuration: number, extendBreakfast?: boolean, extendExtraBed?: boolean, reason?: string) => boolean;
  batchCheckinGroup: (txIdsOrGroupId: string[] | string) => boolean;
  batchCheckoutGroup: (txIdsOrGroupId: string[] | string) => boolean;
  
  addMaintenance: (maint: Maintenance) => void;
  assignTechnicianToMaintenance: (maintId: string, technicianId: string, technicianName: string, managerNotes?: string) => boolean;
  markMaintenanceRepaired: (maintId: string, technicianNotes: string) => boolean;
  updateMaintenanceStatus: (maintId: string, newStatus: 'MENUNGGU_PENUGASAN' | 'PROSES' | 'MENUNGGU_QC' | 'SELESAI', technicianNotes?: string) => boolean;
  finishMaintenance: (roomId: string) => boolean;

  addQcInspection: (inspection: QcInspection) => void;
  
  // Breakfast Orders & Menu Catalog Database Management
  breakfastMenuItems: BreakfastMenuItem[];
  breakfastOrders: BreakfastOrder[];
  addBreakfastOrder: (order: BreakfastOrder) => void;
  updateBreakfastOrder: (order: BreakfastOrder) => void;
  deleteBreakfastOrder: (orderId: string) => void;
  updateBreakfastOrderStatusState: (orderId: string, status: BreakfastOrder['status']) => void;
  addBreakfastMenuItem: (item: BreakfastMenuItem) => void;
  updateBreakfastMenuItem: (item: BreakfastMenuItem) => void;
  deleteBreakfastMenuItem: (itemId: string) => void;

  logAudit: (action: string, details: string, durationMinutes?: number) => void;
  showToast: (msg: string, type?: string) => void;
  removeToast: (id: string) => void;
  
  openModal: (modalId: string, data?: any) => void;
  closeModal: (modalId: string) => void;

  // Master Buildings & Meeting Rooms Database Catalog
  buildings: Building[];
  meetingRooms: MeetingRoom[];
  addBuilding: (building: Building) => void;
  updateBuilding: (building: Building) => void;
  deleteBuilding: (buildingId: string) => boolean;
  addMeetingRoom: (mr: MeetingRoom) => void;
  updateMeetingRoom: (mr: MeetingRoom) => void;
  deleteMeetingRoom: (mrId: string) => boolean;
  addRoom: (room: Room) => void;
  updateRoom: (room: Room) => void;
  deleteRoom: (roomId: string) => boolean;

  // Centralized Local Storage Database Management
  dataStorage: DataStorageService;
  exportDatabaseBackup: () => void;
  importDatabaseBackup: (jsonString: string) => boolean;
  resetDatabase: () => void;
  clearChatHistory: (channelId?: string) => void;
  addChatChannel: (channel: ChatChannel) => void;
  deleteChatChannel: (channelId: string) => boolean;

  // Account Registration & Password Reset Requests with Admin Approval
  passwordResetRequests: PasswordResetRequest[];
  requestPasswordReset: (username: string, newPassword: string, notes?: string) => { success: boolean; message: string };
  approvePasswordReset: (requestId: string) => boolean;
  rejectPasswordReset: (requestId: string, notes?: string) => boolean;
  registerAccountRequest: (userData: { fullName: string; username: string; password?: string; role: UserRole; department?: string; phone: string; assignedBuilding?: string }) => { success: boolean; message: string };
  approveUserRegistration: (userId: string) => boolean;
  rejectUserRegistration: (userId: string) => boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [storageNamespace, setStorageNamespace] = useState<StorageNamespace>(() => dataStorage.getNamespace());
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      // Periksa sessionStorage terlebih dahulu (sesi tab browser aktif)
      const sessionSaved = sessionStorage.getItem('sim_haji_current_user');
      if (sessionSaved) {
        const u = JSON.parse(sessionSaved);
        if (u && u.id) return u;
      }
      // Periksa localStorage HANYA jika fitur Ingat Sesi aktif (default: true)
      const isRemember = localStorage.getItem('sim_haji_remember_session');
      if (isRemember !== 'false') {
        const localSaved = localStorage.getItem('sim_haji_current_user');
        if (localSaved) {
          const u = JSON.parse(localSaved);
          if (u && u.id) return u;
        }
      }
    } catch (_) {}
    return null;
  });

  useEffect(() => {
    try {
      if (currentUser) {
        sessionStorage.setItem('sim_haji_current_user', JSON.stringify(currentUser));
        const isRemember = localStorage.getItem('sim_haji_remember_session');
        if (isRemember !== 'false') {
          localStorage.setItem('sim_haji_current_user', JSON.stringify(currentUser));
        } else {
          localStorage.removeItem('sim_haji_current_user');
        }
      } else {
        localStorage.removeItem('sim_haji_current_user');
        sessionStorage.removeItem('sim_haji_current_user');
      }
    } catch (_) {}
  }, [currentUser]);
  const [users, setUsers] = useState<User[]>(() => dataStorage.getUsers());
  const [buildings, setBuildings] = useState<Building[]>(() => dataStorage.getBuildings());
  const [meetingRooms, setMeetingRooms] = useState<MeetingRoom[]>(() => dataStorage.getMeetingRooms());
  const [rooms, setRooms] = useState<Room[]>(() => dataStorage.getRooms());
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const today = getRealTodayDate();
    const stored = dataStorage.getTransactions();
    return stored.map(t => {
      if (t.building === 'Ruang Pertemuan' && t.status !== 'DIBATALKAN') {
        const durDays = getTxDays(t);
        const endDate = addDaysToDateStr(t.startDate, Math.max(0, durDays - 1));
        if (today > endDate) {
          return { ...t, status: 'SELESAI' as const };
        } else if (today >= t.startDate && today <= endDate) {
          return { ...t, status: 'TERISI' as const };
        } else if (today < t.startDate) {
          return { ...t, status: 'BOOKED' as const };
        }
      }
      return t;
    });
  });
  const [maintenances, setMaintenances] = useState<Maintenance[]>(() => dataStorage.getMaintenances());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => dataStorage.getAuditLogs());
  const [workSessions, setWorkSessions] = useState<WorkSession[]>(() => dataStorage.getWorkSessions());
  const [qcInspections, setQcInspections] = useState<QcInspection[]>(() => dataStorage.getQcInspections());
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toasts, setToasts] = useState<{ id: string, msg: string, type: string }[]>([]);
  const [modalState, setModalState] = useState<{ [key: string]: any }>({});

  // Chat States
  const [chatChannels, setChatChannels] = useState<ChatChannel[]>(() => dataStorage.getChatChannels());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => dataStorage.getChatMessages());
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [activeChatChannelId, setActiveChatChannelId] = useState<string | null>(null);
  const [chatSoundEnabled, setChatSoundEnabled] = useState<boolean>(true);
  const [chatNotificationToast, setChatNotificationToast] = useState<{ message: ChatMessage; channelName: string; channelId: string } | null>(null);

  // Permohonan Reset Password States
  const [passwordResetRequests, setPasswordResetRequests] = useState<PasswordResetRequest[]>(() => dataStorage.getPasswordResetRequests());

  // Real-time Network Online / Offline Detection
  const [isNetworkOnline, setIsNetworkOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  // Dark Mode State & Toggle
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('upt_haji_dark_mode') === 'true';
  });

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem('upt_haji_dark_mode', String(next));
    if (next) {
      document.documentElement.classList.add('dark');
      showToast("Mode Gelap diaktifkan", "info");
    } else {
      document.documentElement.classList.remove('dark');
      showToast("Mode Terang diaktifkan", "info");
    }
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const updateCurrentAccount = (updatedData: { fullName?: string; username?: string; phone?: string; password?: string }) => {
    if (!currentUser) return;
    const updatedUser: User = {
      ...currentUser,
      fullName: updatedData.fullName !== undefined ? updatedData.fullName : currentUser.fullName,
      username: updatedData.username !== undefined ? updatedData.username : currentUser.username,
      phone: updatedData.phone !== undefined ? updatedData.phone : currentUser.phone,
      password: updatedData.password !== undefined ? updatedData.password : currentUser.password,
    };
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
    setCurrentUser(updatedUser);
    logAudit('Edit Akun Mandiri', `Pengguna ${updatedUser.fullName} memperbarui informasi profil akun mereka.`);
    showToast('Profil akun berhasil diperbarui!', 'success');
  };

  const [appSettings, setAppSettings] = useState<AppSettings>(() => dataStorage.getAppSettings());

  useEffect(() => {
    if (appSettings?.tagTitle || appSettings?.organizationName) {
      document.title = appSettings.tagTitle || `${appSettings.organizationName} - Sistem Operasional Terpadu`;
    }
    if (appSettings?.appFavicon && appSettings.appFavicon.startsWith('data:')) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = appSettings.appFavicon;
    }
  }, [appSettings]);

  const updateAppSettings = (newTitleOrUpdates?: string | Partial<AppSettings>, newLogo?: string) => {
    if (!currentUser || !isSuperAdmin(currentUser.role)) return;
    let updates: Partial<AppSettings> = {};
    if (typeof newTitleOrUpdates === 'string') {
      updates = {
        organizationName: newTitleOrUpdates,
        appLogo: newLogo
      };
    } else if (newTitleOrUpdates) {
      updates = newTitleOrUpdates;
    }
    const updated = dataStorage.updateAppSettings(updates);
    setAppSettings(updated);
    logAudit('Pengaturan Web Admin', `Admin mengubah konfigurasi judul, logo, favicon & tag title web sistem.`);
    showToast('Konfigurasi Web Sistem berhasil diperbarui!', 'success');
  };

  // Breakfast Orders & Menu Catalog Database States
  const [breakfastMenuItems, setBreakfastMenuItems] = useState<BreakfastMenuItem[]>(() => dataStorage.getBreakfastMenuItems());
  const [breakfastOrders, setBreakfastOrders] = useState<BreakfastOrder[]>(() => dataStorage.getBreakfastOrders());

  useEffect(() => {
    const handleOnline = () => setIsNetworkOnline(true);
    const handleOffline = () => setIsNetworkOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Supabase Cloud Sync State
  const [supabaseSyncState, setSupabaseSyncState] = useState(dataStorage.getSupabaseSyncState());

  // Periodik update status Supabase
  useEffect(() => {
    const timer = setInterval(() => {
      setSupabaseSyncState(dataStorage.getSupabaseSyncState());
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Hydrate awal dari Supabase Cloud saat aplikasi dibuka
  useEffect(() => {
    async function loadCloudDatabase() {
      try {
        const cloudDb = await dataStorage.hydrateFromSupabase();
        if (cloudDb) {
          setUsers(cloudDb.users);
          setBuildings(cloudDb.buildings || []);
          setMeetingRooms(cloudDb.meetingRooms || []);
          setRooms(cloudDb.rooms);
          setTransactions(cloudDb.transactions);
          setMaintenances(cloudDb.maintenances);
          setAuditLogs(cloudDb.auditLogs);
          setWorkSessions(cloudDb.workSessions);
          setQcInspections(cloudDb.qcInspections);
          setBreakfastMenuItems(cloudDb.breakfastMenuItems || []);
          setBreakfastOrders(cloudDb.breakfastOrders || []);
          if (cloudDb.appSettings) setAppSettings(cloudDb.appSettings);
          setSupabaseSyncState(dataStorage.getSupabaseSyncState());
        }
      } catch (err) {
        console.warn('Gagal memuat database dari Supabase:', err);
      }
    }
    loadCloudDatabase();
  }, []);

  const manualSyncSupabase = async () => {
    showToast('Menghubungi Supabase Cloud...', 'info');
    try {
      const cloudDb = await dataStorage.hydrateFromSupabase();
      if (cloudDb) {
        setUsers(cloudDb.users);
        setBuildings(cloudDb.buildings || []);
        setMeetingRooms(cloudDb.meetingRooms || []);
        setRooms(cloudDb.rooms);
        setTransactions(cloudDb.transactions);
        setMaintenances(cloudDb.maintenances);
        setAuditLogs(cloudDb.auditLogs);
        setWorkSessions(cloudDb.workSessions);
        setQcInspections(cloudDb.qcInspections);
        setBreakfastMenuItems(cloudDb.breakfastMenuItems || []);
        setBreakfastOrders(cloudDb.breakfastOrders || []);
        if (cloudDb.appSettings) setAppSettings(cloudDb.appSettings);
        setSupabaseSyncState(dataStorage.getSupabaseSyncState());
        showToast('Sinkronisasi Supabase berhasil diperbarui!', 'success');
      } else {
        const pushRes = await dataStorage.pushAllToSupabase();
        setSupabaseSyncState(dataStorage.getSupabaseSyncState());
        if (pushRes.success) {
          showToast('Data berhasil disimpan ke Supabase Cloud!', 'success');
        } else {
          showToast(`Koneksi Supabase: ${pushRes.error || 'Terhubung'}`, 'warning');
        }
      }
    } catch (err: any) {
      showToast(`Gagal sinkronisasi: ${err?.message || 'Error'}`, 'error');
    }
  };

  const pushAllToSupabase = async () => {
    showToast('Mengunggah seluruh basis data ke Supabase...', 'info');
    const res = await dataStorage.pushAllToSupabase();
    setSupabaseSyncState(dataStorage.getSupabaseSyncState());
    if (res.success) {
      showToast('Seluruh data berhasil disimpan ke Supabase Cloud!', 'success');
    } else {
      showToast(`Gagal mengunggah ke Supabase: ${res.error || 'Error'}`, 'error');
    }
  };

  // Switch storage namespace and refresh in-memory state
  const switchStorageNamespace = (newNs: StorageNamespace) => {
    setStorageNamespace(newNs);
    const db = dataStorage.getDatabase();
    setUsers(db.users);
    setBuildings(db.buildings || []);
    setMeetingRooms(db.meetingRooms || []);
    setRooms(db.rooms);
    setTransactions(db.transactions);
    setMaintenances(db.maintenances);
    setAuditLogs(db.auditLogs);
    setWorkSessions(db.workSessions);
    setQcInspections(db.qcInspections);
    setChatChannels(db.chatChannels);
    setChatMessages(db.chatMessages);
    setBreakfastMenuItems(db.breakfastMenuItems || []);
    setBreakfastOrders(db.breakfastOrders || []);
    setAppSettings(db.appSettings || dataStorage.getAppSettings());
  };

  // Sync state changes with dataStorage for durable persistence
  useEffect(() => {
    dataStorage.saveDatabase({
      schemaVersion: 2,
      appName: 'SIM-Akomodasi UPT Asrama Haji Jakarta',
      exportedAt: new Date().toISOString(),
      appSettings: dataStorage.getAppSettings(),
      users,
      buildings,
      meetingRooms,
      rooms,
      transactions,
      maintenances,
      qcInspections,
      workSessions,
      auditLogs,
      chatChannels,
      chatMessages,
      breakfastMenuItems,
      breakfastOrders,
      passwordResetRequests
    }, storageNamespace);
  }, [storageNamespace, users, buildings, meetingRooms, rooms, transactions, maintenances, qcInspections, workSessions, auditLogs, chatChannels, chatMessages, breakfastMenuItems, breakfastOrders, passwordResetRequests]);

  // Auto-dismiss notification toast after 7 seconds
  useEffect(() => {
    if (!chatNotificationToast) return;
    const timer = setTimeout(() => {
      setChatNotificationToast(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [chatNotificationToast]);

  // Dynamic calculation of unread messages for current user
  const unreadTotalCount = currentUser
    ? chatMessages.filter(m => {
        if (m.senderId === currentUser.id) return false;
        if (m.readBy.includes(currentUser.id)) return false;
        const channel = chatChannels.find(c => c.id === m.channelId);
        if (!channel) return false;
        return isSuperAdmin(currentUser.role) || channel.participantIds.includes(currentUser.id);
      }).length
    : 0;

  const markChannelAsRead = (channelId: string) => {
    if (!currentUser) return;
    setChatMessages(prev => prev.map(m => {
      if (m.channelId === channelId && !m.readBy.includes(currentUser.id)) {
        return { ...m, readBy: [...m.readBy, currentUser.id] };
      }
      return m;
    }));
  };

  const openChat = (channelId?: string) => {
    setIsChatOpen(true);
    if (channelId) {
      const exists = chatChannels.some(c => c.id === channelId);
      if (!exists && channelId.startsWith('dm-')) {
        const parts = channelId.split('-');
        const otherId = parts.find(p => p !== 'dm' && p !== currentUser?.id);
        const otherUser = users.find(u => u.id === otherId);
        if (otherUser && currentUser) {
          const newDirectChannel: ChatChannel = {
            id: channelId,
            name: otherUser.fullName,
            type: 'DIRECT',
            scope: 'DIRECT' as any,
            participantIds: [currentUser.id, otherUser.id],
            description: `Obrolan Pribadi dengan ${otherUser.fullName} (${otherUser.role})`,
            icon: 'fa-user',
            lastMessage: 'Obrolan pribadi siap digunakan.',
            lastMessageTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            lastSenderName: 'Sistem'
          };
          setChatChannels(prev => [newDirectChannel, ...prev]);
        }
      }
      setActiveChatChannelId(channelId);
      markChannelAsRead(channelId);
    } else if (activeChatChannelId) {
      markChannelAsRead(activeChatChannelId);
    }
  };

  const closeChat = () => {
    setIsChatOpen(false);
  };

  const handleSetActiveChatChannelId = (channelId: string | null) => {
    setActiveChatChannelId(channelId);
    if (channelId) {
      markChannelAsRead(channelId);
    }
  };

  const toggleChatSound = () => {
    setChatSoundEnabled(prev => {
      const next = !prev;
      if (next) {
        playNotificationSound();
        showToast("Suara notifikasi pesan diaktifkan", "info");
      } else {
        showToast("Suara notifikasi pesan dinonaktifkan (senyap)", "warning");
      }
      return next;
    });
  };

  const dismissChatNotification = () => {
    setChatNotificationToast(null);
  };

  const sendChatMessage = (channelId: string, text: string, priority: 'NORMAL' | 'PENTING' | 'URGENT' = 'NORMAL', isInstruction: boolean = false) => {
    if (!currentUser || !text.trim()) return;

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      channelId,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      senderRole: currentUser.role,
      senderDepartment: currentUser.department || 'Operasional',
      message: text.trim(),
      timestamp,
      timeFormatted,
      priority,
      isInstruction,
      readBy: [currentUser.id]
    };

    setChatMessages(prev => [...prev, newMsg]);

    setChatChannels(prev => prev.map(c => {
      if (c.id === channelId) {
        return {
          ...c,
          lastMessage: text.trim(),
          lastMessageTime: timeFormatted,
          lastSenderName: currentUser.fullName
        };
      }
      return c;
    }));

    if (isInstruction || priority === 'URGENT') {
      logAudit(
        isInstruction ? 'Instruksi Chat Resmi' : 'Chat Urgent',
        `${currentUser.fullName} (${currentUser.role}) mengirimkan ${isInstruction ? 'instruksi tugas' : 'pesan mendesak'}: "${text.trim().substring(0, 75)}..."`
      );
    }
  };

  const simulateIncomingChatMessage = (targetChannelId?: string) => {
    if (!currentUser) return;

    let targetChannel: ChatChannel | undefined;
    let sender: User | undefined;
    let text = '';
    let priority: 'NORMAL' | 'PENTING' | 'URGENT' = 'NORMAL';
    let isInstruction = false;

    if (targetChannelId) {
      targetChannel = chatChannels.find(c => c.id === targetChannelId);
    }

    if (targetChannel) {
      const otherParticipantId = targetChannel.participantIds.find(id => id !== currentUser.id);
      sender = users.find(u => u.id === otherParticipantId);
    }

    if (!targetChannel || !sender) {
      if (currentUser.role === 'Manager Resepsionis') {
        targetChannel = chatChannels.find(c => c.id === 'dm-u2-u5') || chatChannels[0];
        sender = users.find(u => u.id === 'u5'); // Ir. Hendra Kusuma (Manager QC)
        text = 'Bu Siti, kamar A-105 dan A-106 baru selesai diverifikasi dan LOLOS QC. Siap untuk check-in jemaah sore ini!';
        priority = 'PENTING';
      } else if (currentUser.role === 'Manager QC') {
        targetChannel = chatChannels.find(c => c.id === 'dm-u5-u8') || chatChannels[0];
        sender = users.find(u => u.id === 'u8'); // H. Joko Susilo, ST (Manager Teknisi)
        text = 'Pak Hendra, perbaikan keran wastafel dan shower di C-104 sudah tuntas diganti part baru. Mohon tim QC verifikasi kelayakannya.';
        priority = 'NORMAL';
      } else if (currentUser.role === 'Manager Teknisi') {
        targetChannel = chatChannels.find(c => c.id === 'dm-u5-u8') || chatChannels[0];
        sender = users.find(u => u.id === 'u5'); // Ir. Hendra Kusuma (Manager QC)
        text = 'Pak Joko, ada temuan rembesan AC di Gedung Mina kamar 208 saat inspeksi. Mohon segera kirim teknisi untuk penanganan darurat ya!';
        priority = 'URGENT';
        isInstruction = true;
      } else if (currentUser.role === 'Manager Koperasi') {
        targetChannel = chatChannels.find(c => c.id === 'dm-u2-u11') || chatChannels[0];
        sender = users.find(u => u.id === 'u2'); // Dra. Hj. Siti Rahmah (Manager Resepsionis)
        text = 'Bu Rina, rombongan jemaah Kloter 03 sebanyak 120 orang tiba malam ini. Mohon disiapkan sarapan pagi box jam 05.30 WIB.';
        priority = 'PENTING';
      } else if (currentUser.role.includes('Teknisi')) {
        targetChannel = chatChannels.find(c => c.id === `dm-u8-${currentUser.id}` || c.id === 'group-teknisi') || chatChannels[0];
        sender = users.find(u => u.id === 'u8'); // Manager Teknisi
        text = `Instruksi Segera: Lakukan pengecekan darurat fasilitas pompa air Gedung Arafah. Pastikan seluruh debit air lancar!`;
        priority = 'URGENT';
        isInstruction = true;
      } else if (currentUser.role.includes('Resepsionis')) {
        targetChannel = chatChannels.find(c => c.id === `dm-u2-${currentUser.id}` || c.id === 'group-recep') || chatChannels[0];
        sender = users.find(u => u.id === 'u2'); // Manager Resepsionis
        text = `Arahan Manager: Pastikan formulir data jemaah lansia dan kunci kamar cadangan sudah disiapkan rapi di meja lobi ya.`;
        priority = 'PENTING';
        isInstruction = true;
      } else if (currentUser.role.includes('QC') || currentUser.role.includes('Quality')) {
        targetChannel = chatChannels.find(c => c.id === `dm-u5-${currentUser.id}` || c.id === 'group-qc') || chatChannels[0];
        sender = users.find(u => u.id === 'u5'); // Manager QC
        text = `Instruksi Manager: Tolong prioritaskan uji sanitasi dan kelayakan linen di lantai 2 Gedung Muzdalifah sebelum pukul 17.00.`;
        priority = 'PENTING';
        isInstruction = true;
      } else if (currentUser.role.includes('Koperasi')) {
        targetChannel = chatChannels.find(c => c.id === 'group-koperasi' || c.id === 'dm-u11-u12') || chatChannels[0];
        sender = users.find(u => u.id === 'u11'); // Manager Koperasi
        text = `Siti, koordinasikan tim dapur untuk pengemasan box sarapan higienis jemaah kloter baru.`;
        priority = 'NORMAL';
        isInstruction = true;
      } else {
        targetChannel = chatChannels.find(c => c.id === 'channel-all-managers') || chatChannels[0];
        sender = users.find(u => u.id === 'u2') || users[1];
        text = 'Lapor Pak Pimpinan, seluruh koordinasi operasional antar divisi hari ini berjalan optimal dan tertib.';
        priority = 'NORMAL';
      }
    }

    if (!sender) {
      sender = users.find(u => u.id !== currentUser.id) || users[0];
    }
    if (!text) {
      text = 'Halo, koordinasi operasional Asrama Haji terpantau aman dan terkendali.';
    }

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);

    const incomingMsg: ChatMessage = {
      id: `sim-msg-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      channelId: targetChannel.id,
      senderId: sender.id,
      senderName: sender.fullName,
      senderRole: sender.role,
      senderDepartment: sender.department || 'Operasional',
      message: text,
      timestamp,
      timeFormatted,
      priority,
      isInstruction,
      readBy: [sender.id]
    };

    setChatMessages(prev => [...prev, incomingMsg]);

    setChatChannels(prev => prev.map(c => {
      if (c.id === targetChannel!.id) {
        return {
          ...c,
          lastMessage: text,
          lastMessageTime: timeFormatted,
          lastSenderName: sender!.fullName
        };
      }
      return c;
    }));

    if (chatSoundEnabled) {
      playNotificationSound();
    }

    setChatNotificationToast({
      message: incomingMsg,
      channelName: targetChannel.name,
      channelId: targetChannel.id
    });
  };

  const [loginTime, setLoginTime] = useState<number | null>(null);

  const showToast = (msg: string, type: string = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const logAudit = (action: string, details: string, durationMinutes?: number) => {
    setAuditLogs(prev => [{
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: currentUser ? currentUser.fullName : 'System',
      role: currentUser ? currentUser.role : 'System',
      action,
      details,
      durationMinutes
    }, ...prev]);
  };

  const login = (user: User, _preferNamespace?: StorageNamespace, rememberDevice: boolean = true) => {
    if (user.status === 'Menunggu Persetujuan') {
      showToast("Pendaftaran akun Anda masih menunggu persetujuan (ACC) dari Administrator!", "warning");
      return;
    }
    if (user.status === 'Non-Aktif') {
      showToast("Akses Ditolak: Akun petugas ini berstatus Non-Aktif. Hubungi Administrator!", "error");
      return;
    }

    try {
      if (rememberDevice) {
        localStorage.setItem('sim_haji_remember_session', 'true');
        localStorage.setItem('sim_haji_current_user', JSON.stringify(user));
        sessionStorage.setItem('sim_haji_current_user', JSON.stringify(user));
      } else {
        localStorage.setItem('sim_haji_remember_session', 'false');
        localStorage.removeItem('sim_haji_current_user');
        sessionStorage.setItem('sim_haji_current_user', JSON.stringify(user));
      }
    } catch (_) {}

    setCurrentUser(user);
    const now = new Date();
    const loginTimeStr = getRealLocalDateTimeStr(now);

    // Periksa apakah pengguna ini sudah memiliki sesi AKTIF yang belum ditutup
    const existingActive = workSessions.find(
      s => s.userId === user.id && s.status === 'AKTIF' && !s.logoutTime
    );

    if (existingActive) {
      // Lanjutkan sesi aktif yang sudah ada tanpa membuat duplikat sesi baru
      setActiveSessionId(existingActive.id);
      const parsedStart = parseLocalTimeString(existingActive.loginTime).getTime();
      setLoginTime(parsedStart);
      logAudit(
        "Login System", 
        `Petugas ${user.fullName} (${user.role}) melanjutkan sesi kerja aktif (${existingActive.id})`
      );
      showToast(`Melanjutkan sesi aktif, ${user.fullName} (${user.role})!`, "success");
      setActiveTab('dashboard');
      return;
    }

    const nowMs = now.getTime();
    setLoginTime(nowMs);

    const newSessionId = `SESI-${Date.now().toString().slice(-4)}`;
    setActiveSessionId(newSessionId);

    const newSession: WorkSession = {
      id: newSessionId,
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      loginTime: loginTimeStr,
      logoutTime: null,
      durationSeconds: 0,
      durationFormatted: '0 Jam 0 Menit 0 Detik (Sedang Berjalan)',
      status: 'AKTIF',
      notes: `Sesi login petugas (${user.role} - ${user.department || 'Operasional'})`
    };

    setWorkSessions(prev => {
      // Tutup sesi aktif lain yang mungkin tertinggal dari akun yang sama
      const sanitized = prev.map(s => {
        if (s.userId === user.id && s.status === 'AKTIF') {
          const sTime = parseLocalTimeString(s.loginTime).getTime();
          const sDur = Math.max(1, Math.floor((nowMs - sTime) / 1000));
          return {
            ...s,
            status: 'SELESAI' as const,
            logoutTime: loginTimeStr,
            durationSeconds: sDur,
            durationFormatted: formatHMS(sDur)
          };
        }
        return s;
      });
      return [newSession, ...sanitized];
    });

    logAudit(
      "Login System", 
      `Petugas ${user.fullName} (${user.role}) masuk bertugas pada ${loginTimeStr}`
    );

    showToast(`Selamat datang, ${user.fullName} (${user.role})!`, "success");

    // All roles land on Dashboard
    setActiveTab('dashboard');
  };

  const logout = () => {
    if (currentUser) {
      const now = new Date();
      const logoutTimeStr = getRealLocalDateTimeStr(now);
      const nowMs = now.getTime();
      let totalSeconds = 0;
      let durationStr = "0 Jam 0 Menit 0 Detik";

      setWorkSessions(prev => prev.map(s => {
        if (s.id === activeSessionId || (s.userId === currentUser.id && s.status === 'AKTIF')) {
          const sTime = parseLocalTimeString(s.loginTime).getTime();
          const sDur = Math.max(1, Math.floor((nowMs - sTime) / 1000));
          const sFormatted = formatHMS(sDur);
          totalSeconds = sDur;
          durationStr = sFormatted;
          return {
            ...s,
            logoutTime: logoutTimeStr,
            durationSeconds: sDur,
            durationFormatted: sFormatted,
            status: 'SELESAI' as const
          };
        }
        return s;
      }));

      const totalMins = Math.floor(totalSeconds / 60);
      logAudit(
        "Logout System",
        `Petugas ${currentUser.fullName} (${currentUser.role}) checkout tugas pada ${logoutTimeStr}. Durasi kerja: ${durationStr}.`,
        totalMins
      );
    }
    setCurrentUser(null);
    setLoginTime(null);
    setActiveSessionId(null);
    try {
      localStorage.removeItem('sim_haji_current_user');
      sessionStorage.removeItem('sim_haji_current_user');
      localStorage.removeItem('sim_haji_active_session_id');
    } catch (_) {}
    showToast("Anda telah keluar dari sistem (Check-Out Shift).", "info");
  };

  const clearWorkSessions = () => {
    setWorkSessions([]);
    setActiveSessionId(null);
    setLoginTime(null);
    logAudit("Reset Sesi Kerja", "Daftar rekap riwayat sesi & jam kerja petugas telah dibersihkan.");
    showToast("Rekap sesi dan jam kerja berhasil direset!", "success");
  };

  const addUser = (user: User) => {
    if (!isSuperAdmin(currentUser?.role)) {
      showToast("Akses Ditolak: Hanya Administrator yang berwenang menambah akun petugas!", "error");
      return;
    }
    setUsers(prev => [...prev, user]);
    logAudit("Tambah User", `Membuat akun baru: ${user.username} (${user.role}) - ${user.department || 'Operasional'}`);
    showToast(`Akun petugas ${user.fullName} (${user.role}) berhasil ditambahkan ke direktori pengguna!`, "success");
  };

  const updateUser = (updatedUser: User) => {
    if (!isSuperAdmin(currentUser?.role)) {
      showToast("Akses Ditolak: Hanya Administrator yang berwenang mengubah data akun petugas!", "error");
      return;
    }
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    logAudit("Ubah Akun", `Memperbarui akun: ${updatedUser.username} (${updatedUser.fullName}) - ${updatedUser.role}`);
    showToast(`Data petugas ${updatedUser.fullName} berhasil diperbarui di sistem!`, "success");
  };

  const toggleUserStatus = (userId: string) => {
    if (!isSuperAdmin(currentUser?.role)) {
      showToast("Akses Ditolak: Hanya Administrator yang berwenang mengubah status akun!", "error");
      return;
    }
    const target = users.find(u => u.id === userId);
    if (!target) return;
    if (target.id === currentUser?.id) {
      showToast("Anda tidak dapat menonaktifkan akun yang sedang aktif Anda gunakan!", "warning");
      return;
    }
    const newStatus = target.status === 'Aktif' ? 'Non-Aktif' : 'Aktif';
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
    logAudit("Status User", `Mengubah status akun ${target.username} (${target.fullName}) menjadi ${newStatus}`);
    showToast(`Status akun ${target.fullName} diubah menjadi ${newStatus}`, newStatus === 'Aktif' ? 'success' : 'info');
  };

  const deleteUser = (userId: string) => {
    if (!isSuperAdmin(currentUser?.role)) {
      showToast("Akses Ditolak: Hanya Administrator yang berwenang menghapus akun!", "error");
      return;
    }
    const target = users.find(u => u.id === userId);
    if (!target) return;
    if (target.id === currentUser?.id) {
      showToast("Anda tidak dapat menghapus akun Anda sendiri!", "warning");
      return;
    }
    setUsers(prev => prev.filter(u => u.id !== userId));
    dataStorage.deleteUser(userId);
    logAudit("Hapus User", `Menghapus akun ${target.username} (${target.fullName})`);
    showToast(`Akun ${target.fullName} berhasil dihapus dari sistem.`, "info");
  };

  const requestPasswordReset = (username: string, newPassword: string, notes?: string): { success: boolean; message: string } => {
    const cleanUser = username.trim().toLowerCase();
    const foundUser = users.find(u => u.username.toLowerCase() === cleanUser) || dataStorage.getUserByUsername(cleanUser);
    if (!foundUser) {
      return { success: false, message: 'Username / NIP tidak ditemukan dalam direktori petugas!' };
    }
    if (!newPassword || newPassword.trim().length < 3) {
      return { success: false, message: 'Kata sandi baru minimal 3 karakter!' };
    }

    const newReq: PasswordResetRequest = {
      id: `pr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: foundUser.id,
      username: foundUser.username,
      fullName: foundUser.fullName,
      role: foundUser.role,
      newPassword: newPassword.trim(),
      requestDate: getRealLocalDateTimeStr(),
      status: 'MENUNGGU_PERSETUJUAN',
      notes: notes?.trim() || 'Permohonan reset kata sandi diajukan oleh petugas'
    };

    setPasswordResetRequests(prev => [newReq, ...prev]);
    dataStorage.savePasswordResetRequest(newReq);
    logAudit('PERMOHONAN_RESET_PASSWORD', `Pengajuan reset kata sandi baru untuk akun ${foundUser.fullName} (${foundUser.username})`);
    return { 
      success: true, 
      message: 'Permohonan kata sandi baru berhasil diajukan! Kata sandi akan aktif setelah disetujui (ACC) oleh Administrator.' 
    };
  };

  const approvePasswordReset = (requestId: string): boolean => {
    const req = (passwordResetRequests || []).find(r => r.id === requestId) || dataStorage.getPasswordResetRequests().find(r => r.id === requestId);
    if (!req) {
      showToast("Permohonan reset kata sandi tidak ditemukan atau telah diproses!", "error");
      return false;
    }

    // 1. Perbarui kata sandi di dataStorage dan state users
    let targetUser = users.find(u => u.id === req.userId || u.username.toLowerCase() === req.username.toLowerCase()) || dataStorage.getUserByUsername(req.username);
    if (targetUser) {
      const updatedUser: User = { ...targetUser, password: req.newPassword };
      setUsers(prevUsers => prevUsers.map(u => (u.id === targetUser!.id ? updatedUser : u)));
      dataStorage.saveUser(updatedUser);
    }

    // 2. Perbarui status permohonan menjadi DISETUJUI
    const updatedReq: PasswordResetRequest = {
      ...req,
      status: 'DISETUJUI',
      processedBy: currentUser?.fullName || 'Administrator Operasional',
      processedAt: getRealLocalDateTimeStr()
    };
    setPasswordResetRequests(prev => prev.map(r => r.id === requestId ? updatedReq : r));
    dataStorage.savePasswordResetRequest(updatedReq);

    logAudit('ACC_RESET_PASSWORD', `Menyetujui perubahan kata sandi akun ${req.username} (${req.fullName})`);
    showToast(`Kata sandi baru untuk ${req.fullName} (@${req.username}) BERHASIL DI-ACC! Petugas kini dapat masuk dengan sandi baru.`, 'success');
    return true;
  };

  const rejectPasswordReset = (requestId: string, notes?: string): boolean => {
    const req = (passwordResetRequests || []).find(r => r.id === requestId) || dataStorage.getPasswordResetRequests().find(r => r.id === requestId);
    if (!req) {
      showToast("Permohonan reset kata sandi tidak ditemukan atau telah diproses!", "error");
      return false;
    }

    const updatedReq: PasswordResetRequest = {
      ...req,
      status: 'DITOLAK',
      notes: notes ? `${req.notes || ''} [Catatan Penolakan: ${notes}]` : req.notes,
      processedBy: currentUser?.fullName || 'Administrator Operasional',
      processedAt: getRealLocalDateTimeStr()
    };
    setPasswordResetRequests(prev => prev.map(r => r.id === requestId ? updatedReq : r));
    dataStorage.savePasswordResetRequest(updatedReq);

    logAudit('REJECT_RESET_PASSWORD', `Menolak permohonan reset kata sandi akun ${req.username}`);
    showToast(`Permohonan reset kata sandi untuk @${req.username} (${req.fullName}) TELAH DITOLAK.`, 'info');
    return true;
  };

  const registerAccountRequest = (userData: {
    fullName: string;
    username: string;
    password?: string;
    role: UserRole;
    department?: string;
    phone: string;
    assignedBuilding?: string;
  }): { success: boolean; message: string } => {
    const cleanUser = userData.username.trim().toLowerCase();
    if (!cleanUser) {
      return { success: false, message: 'Username / NIP tidak boleh kosong!' };
    }
    const exists = users.find(u => u.username.toLowerCase() === cleanUser) || dataStorage.getUserByUsername(cleanUser);
    if (exists) {
      return { success: false, message: `Username "${userData.username}" sudah digunakan di sistem!` };
    }

    const newUser: User = {
      id: `u-reg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fullName: userData.fullName.trim(),
      username: cleanUser,
      password: userData.password?.trim() || '12345',
      role: userData.role || 'Resepsionis',
      department: userData.department || 'Pelayanan & Resepsionis',
      assignedBuilding: userData.assignedBuilding || 'Semua Gedung',
      supervisorId: null,
      phone: userData.phone.trim() || '-',
      status: 'Menunggu Persetujuan'
    };

    setUsers(prev => [newUser, ...prev]);
    dataStorage.saveUser(newUser);
    logAudit('DAFTAR_AKUN_BARU', `Pendaftaran akun baru: ${newUser.fullName} (${newUser.username}) - menunggu persetujuan Administrator`);
    return { 
      success: true, 
      message: 'Pendaftaran akun berhasil dikirim! Akun Anda sedang menunggu persetujuan (ACC) dari Administrator sebelum dapat masuk.' 
    };
  };

  const approveUserRegistration = (userId: string): boolean => {
    const target = users.find(u => u.id === userId) || dataStorage.getUserById(userId);
    if (!target) {
      showToast("Akun pendaftaran tidak ditemukan atau sudah diproses!", "error");
      return false;
    }

    const updatedUser: User = { ...target, status: 'Aktif' };
    setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
    dataStorage.saveUser(updatedUser);

    logAudit('ACC_PENDAFTARAN_AKUN', `Menyetujui pendaftaran akun petugas: ${target.fullName} (${target.username}) sebagai ${target.role}`);
    showToast(`Akun ${target.fullName} (@${target.username}) BERHASIL DI-ACC & AKTIF! Petugas sekarang dapat login.`, 'success');
    return true;
  };

  const rejectUserRegistration = (userId: string): boolean => {
    const target = users.find(u => u.id === userId) || dataStorage.getUserById(userId);
    if (!target) {
      showToast("Akun pendaftaran tidak ditemukan atau sudah diproses!", "error");
      return false;
    }

    setUsers(prev => prev.filter(u => u.id !== userId));
    dataStorage.deleteUser(userId);

    logAudit('REJECT_PENDAFTARAN_AKUN', `Menolak dan menghapus pendaftaran akun petugas: ${target.fullName} (${target.username})`);
    showToast(`Pendaftaran akun ${target.fullName} (@${target.username}) TELAH DITOLAK dan dihapus dari sistem.`, 'info');
    return true;
  };

  const addTransaction = (tx: Transaction) => {
    if (!isRecepRole(currentUser?.role)) {
      showToast("Akses Ditolak: Hanya staf Resepsionis yang berwenang memproses Check-In & Booking!", "error");
      return;
    }
    setTransactions(prev => [...prev, tx]);
    setRooms(prev => prev.map(r => {
      if (r.id === tx.roomId) {
        if (r.status === 'KOSONG') {
          return { ...r, status: tx.status as any, activeTxId: tx.id };
        }
        if (tx.status === 'TERISI') {
          return { ...r, status: tx.status as any, activeTxId: tx.id };
        }
      }
      return r;
    }));
    logAudit(tx.status === 'BOOKED' ? "BOOKING" : "CHECKIN", `Untuk ${tx.roomNumber} (${tx.guestName})`);
    showToast(`Transaksi berhasil dikonfirmasi!`, "success");
  };

  const addGroupBooking = (txList: Transaction[], groupName: string) => {
    if (!isRecepRole(currentUser?.role)) {
      showToast("Akses Ditolak: Hanya staf Resepsionis & Admin yang berwenang mendaftarkan rombongan!", "error");
      return;
    }
    setTransactions(prev => [...prev, ...txList]);
    setRooms(prev => prev.map(r => {
      const matchTx = txList.find(t => t.roomId === r.id);
      if (matchTx) {
        return { ...r, status: matchTx.status as any, activeTxId: matchTx.id };
      }
      return r;
    }));
    logAudit("REGISTRASI_ROMBONGAN", `Mendaftarkan rombongan "${groupName}" sebanyak ${txList.length} fasilitas.`);
    showToast(`Rombongan "${groupName}" (${txList.length} kamar/fasilitas) berhasil didaftarkan!`, "success");
  };

  const updateGroupBooking = (editGroupId: string, txList: Transaction[], groupName: string) => {
    if (!isRecepRole(currentUser?.role)) {
      showToast("Akses Ditolak: Hanya staf Resepsionis & Admin yang berwenang mengubah data rombongan!", "error");
      return;
    }

    const newRoomIds = new Set(txList.map(t => t.roomId));

    setTransactions(prev => {
      const filtered = prev.filter(t => {
        if (t.groupId === editGroupId) return false;
        if (t.isGroup && t.groupName && t.groupName.toLowerCase() === groupName.toLowerCase() && newRoomIds.has(t.roomId)) return false;
        return true;
      });
      return [...filtered, ...txList];
    });

    setRooms(prev => prev.map(r => {
      const nowInGroup = txList.find(t => t.roomId === r.id);
      if (nowInGroup) {
        return { ...r, status: nowInGroup.status as any, activeTxId: nowInGroup.id };
      }
      const wasInGroupOld = transactions.some(t => (t.groupId === editGroupId || (t.isGroup && t.groupName?.toLowerCase() === groupName.toLowerCase())) && t.roomId === r.id);
      if (wasInGroupOld && !nowInGroup) {
        return { ...r, status: 'KOSONG', activeTxId: null, qcStatus: 'PERLU_INSPEKSI' };
      }
      return r;
    }));

    logAudit("SESUAIKAN_ROMBONGAN", `Menyesuaikan data rombongan "${groupName}" (${txList.length} fasilitas).`);
    showToast(`Data rombongan "${groupName}" berhasil disesuaikan!`, "success");
  };

  const updateTransaction = (updatedTx: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
  };

  const updateBreakfastStatus = (txId: string, status: 'MENUNGGU' | 'SEDANG_DIBUAT' | 'PENGANTARAN' | 'SELESAI') => {
    if (!isKoperasiRole(currentUser?.role)) {
      showToast("Akses Ditolak: Hanya Petugas Koperasi yang berwenang memperbarui status produksi & pengantaran sarapan!", "error");
      return;
    }
    setTransactions(prev => prev.map(t => t.id === txId ? { ...t, breakfastStatus: status } : t));
    const statusLabel = status === 'SEDANG_DIBUAT' ? 'Sedang Dibuat di Dapur' : status === 'PENGANTARAN' ? 'Sedang Pengantaran ke Kamar' : status === 'SELESAI' ? 'Selesai Diantar' : 'Menunggu';
    const tx = transactions.find(t => t.id === txId);
    logAudit("Status Sarapan", `Petugas Koperasi ${currentUser?.fullName} mengubah status pesanan sarapan ${tx?.roomNumber || txId} (${tx?.guestName || ''}) menjadi: ${statusLabel}`);
    showToast(`Status sarapan diperbarui: ${statusLabel}`, "success");
  };

  const checkoutRoom = (roomId: string, txId?: string) => {
    if (!isRecepRole(currentUser?.role)) {
      showToast("Akses Ditolak: Hanya staf Resepsionis yang berwenang memproses Check-Out!", "error");
      return;
    }
    let targetTxId: string | null = txId || null;
    if (!targetTxId) {
      const room = rooms.find(r => r.id === roomId);
      if (room && room.activeTxId) {
        targetTxId = room.activeTxId;
      }
    }

    if (targetTxId) {
      const targetTx = transactions.find(t => t.id === targetTxId);
      const room = rooms.find(r => r.id === roomId);
      const guestName = targetTx?.guestName || 'Tamu';

      const updatedTxs = transactions.map(t => t.id === targetTxId ? { ...t, status: "SELESAI" as const } : t);
      setTransactions(updatedTxs);
      
      setRooms(prev => prev.map(r => {
        if (r.id === roomId) {
          const activeTxs = updatedTxs.filter(t => t.roomId === roomId && (t.status === 'TERISI' || t.status === 'BOOKED'));
          const stillTerisi = activeTxs.find(t => t.status === 'TERISI');
          if (stillTerisi) {
            return { ...r, status: "TERISI", activeTxId: stillTerisi.id };
          }
          const nextBooked = activeTxs.find(t => t.status === 'BOOKED');
          if (nextBooked) {
            return { ...r, status: "BOOKED", activeTxId: nextBooked.id, qcStatus: "PERLU_INSPEKSI" };
          }
          return { ...r, status: "KOSONG", activeTxId: null, qcStatus: "PERLU_INSPEKSI" };
        }
        return r;
      }));
      
      logAudit("Check-Out", `Check-out berhasil untuk ${guestName} di ruangan ${room?.roomNumber || roomId}. Status kamar kini Perlu Inspeksi QC.`);
      showToast(`Check-Out untuk ${guestName} (${room?.roomNumber || roomId}) berhasil! Kamar siap diinspeksi kebersihan QC.`, "success");
    }
  };

  const cancelBooking = (roomId: string, txId?: string) => {
    if (!isRecepRole(currentUser?.role)) {
      showToast("Akses Ditolak: Hanya staf Resepsionis yang berwenang membatalkan booking!", "error");
      return;
    }
    let targetTxId: string | null = txId || null;
    if (!targetTxId) {
      const room = rooms.find(r => r.id === roomId);
      if (room && room.activeTxId) {
        targetTxId = room.activeTxId;
      }
    }

    if (targetTxId) {
      const targetTx = transactions.find(t => t.id === targetTxId);
      const room = rooms.find(r => r.id === roomId);
      const guestName = targetTx?.guestName || 'Reservasi';

      const updatedTxs = transactions.map(t => t.id === targetTxId ? { ...t, status: "DIBATALKAN" as const } : t);
      setTransactions(updatedTxs);
      
      setRooms(prev => prev.map(r => {
        if (r.id === roomId) {
          const activeTxs = updatedTxs.filter(t => t.roomId === roomId && (t.status === 'TERISI' || t.status === 'BOOKED'));
          const stillTerisi = activeTxs.find(t => t.status === 'TERISI');
          if (stillTerisi) {
            return { ...r, status: "TERISI", activeTxId: stillTerisi.id };
          }
          const nextBooked = activeTxs.find(t => t.status === 'BOOKED');
          if (nextBooked) {
            return { ...r, status: "BOOKED", activeTxId: nextBooked.id };
          }
          return { ...r, status: "KOSONG", activeTxId: null };
        }
        return r;
      }));
      
      logAudit("Batal Booking", `Booking ${guestName} dibatalkan untuk ruangan ${room?.roomNumber || roomId}`);
      showToast(`Booking ${guestName} (${room?.roomNumber || roomId}) telah berhasil dibatalkan.`, "success");
    }
  };

  const activateCheckin = (roomId: string, targetTxId?: string) => {
    if (!isRecepRole(currentUser?.role)) {
      showToast("Akses Ditolak: Hanya staf Resepsionis yang berwenang mengaktifkan Check-In!", "error");
      return;
    }
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    const txIdToActivate = targetTxId || room.activeTxId;
    if (!txIdToActivate) return;

    const targetTx = transactions.find(t => t.id === txIdToActivate);
    const guestName = targetTx?.guestName || 'Tamu';

    const updatedTxs = transactions.map(t => t.id === txIdToActivate ? { ...t, status: "TERISI" as const } : t);
    setTransactions(updatedTxs);
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, status: "TERISI", activeTxId: txIdToActivate } : r));

    logAudit("Aktivasi Check-In", `Aktivasi status terisi dari booking ${room.roomNumber} (${guestName})`);
    showToast(`Check-In untuk ${room.roomNumber} (${guestName}) berhasil diaktifkan!`, "success");
  };

  const extendTransaction = (
    txId: string, 
    additionalDuration: number, 
    extendBreakfast: boolean = false, 
    extendExtraBed: boolean = false,
    reason?: string
  ): boolean => {
    if (!isRecepRole(currentUser?.role)) {
      showToast("Akses Ditolak: Hanya staf Resepsionis yang berwenang memproses perpanjangan sewa (Extend)!", "error");
      return false;
    }

    const tx = transactions.find(t => t.id === txId);
    if (!tx) {
      showToast("Data transaksi tidak ditemukan.", "error");
      return false;
    }

    const isAula = tx.building === 'Ruang Pertemuan';
    const currentDuration = Number(tx.duration) || 1;
    const added = Number(additionalDuration) || 1;
    const newTotalDuration = currentDuration + added;
    const unit = tx.durationUnit || (isAula ? 'Jam' : 'Malam');

    // Conflict detection
    if (!isAula) {
      const currentCheckout = addDaysToDateStr(tx.startDate, currentDuration);
      const newCheckout = addDaysToDateStr(tx.startDate, newTotalDuration);

      const conflict = transactions.find(other => {
        if (other.id === tx.id || other.roomId !== tx.roomId) return false;
        if (other.status === 'DIBATALKAN' || other.status === 'SELESAI') return false;

        const otherStart = other.startDate;
        return otherStart >= currentCheckout && otherStart < newCheckout;
      });

      if (conflict) {
        showToast(`Tidak dapat memperpanjang sewa! Kamar sudah di-booking oleh ${conflict.guestName} mulai tanggal ${formatIndonesianDate(conflict.startDate)}.`, "error");
        return false;
      }
    } else {
      if (unit === 'Jam' && newTotalDuration > 12) {
        showToast(`Maksimal durasi sewa aula dalam 1 hari adalah 12 Jam (Full Day). Durasi sewa (${newTotalDuration} Jam) melebihi batas.`, "error");
        return false;
      }
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const historyItem = {
      date: nowStr,
      addedDuration: added,
      unit,
      newTotalDuration,
      user: currentUser?.fullName || 'Resepsionis',
      reason: reason || 'Permintaan perpanjangan masa sewa oleh tamu / jemaah'
    };

    const newBreakfastDays = extendBreakfast 
      ? (tx.breakfastDays || tx.duration) + added 
      : tx.breakfastDays;

    const updatedTx: Transaction = {
      ...tx,
      duration: newTotalDuration,
      breakfastDays: newBreakfastDays,
      extendedCount: (tx.extendedCount || 0) + 1,
      extendHistory: [...(tx.extendHistory || []), historyItem],
      notes: tx.notes 
        ? `${tx.notes} | [Extend +${added} ${unit} pada ${formatIndonesianDate(nowStr.substring(0, 10))}]`
        : `[Extend +${added} ${unit} pada ${formatIndonesianDate(nowStr.substring(0, 10))}]`
    };

    if (extendExtraBed) {
      updatedTx.extraBed = true;
      updatedTx.extraBedCount = (tx.extraBedCount || 0) > 0 ? tx.extraBedCount : 1;
    }

    setTransactions(prev => prev.map(t => t.id === tx.id ? updatedTx : t));

    const newCheckoutDateStr = !isAula ? addDaysToDateStr(tx.startDate, newTotalDuration) : tx.startDate;

    logAudit(
      "Extend Sewa",
      `Petugas ${currentUser?.fullName} memperpanjang sewa ${tx.roomNumber} (${tx.guestName}) sebanyak +${added} ${unit}. Total durasi baru: ${newTotalDuration} ${unit}.${extendBreakfast ? ' Termasuk sarapan.' : ''}`
    );

    showToast(
      `Perpanjangan sewa ${tx.roomNumber} (${tx.guestName}) berhasil! (+${added} ${unit})${!isAula ? ` hingga ${formatIndonesianDate(newCheckoutDateStr)}` : ''}`,
      "success"
    );

    return true;
  };

  const batchCheckinGroup = (txIdsOrGroupId: string[] | string): boolean => {
    if (!isRecepRole(currentUser?.role)) {
      showToast("Akses Ditolak: Hanya staf Resepsionis yang berwenang memproses Check-In!", "error");
      return false;
    }

    let targetTxs: Transaction[] = [];
    if (Array.isArray(txIdsOrGroupId)) {
      targetTxs = transactions.filter(t => txIdsOrGroupId.includes(t.id));
    } else {
      const key = (txIdsOrGroupId || '').trim().toLowerCase();
      targetTxs = transactions.filter(t => {
        if (t.status === 'DIBATALKAN' || t.status === 'SELESAI') return false;
        if (t.groupId && t.groupId.toLowerCase() === key) return true;
        if (t.groupName && t.groupName.trim().toLowerCase() === key) return true;
        if (t.guestName && t.guestName.trim().toLowerCase() === key) return true;
        if (key.startsWith('kloter-') && t.kloter && `kloter-${t.kloter.toLowerCase()}` === key) return true;
        if (t.notes && t.notes.toLowerCase().includes(key)) return true;
        return false;
      });
    }

    const toCheckin = targetTxs.filter(t => t.status === 'BOOKED');
    if (toCheckin.length === 0) {
      showToast("Semua kamar dalam rombongan ini sudah berstatus Check-In atau Selesai.", "info");
      return false;
    }

    const toCheckinIds = new Set(toCheckin.map(t => t.id));
    const updatedTxs = transactions.map(t => {
      if (toCheckinIds.has(t.id)) {
        return { ...t, status: 'TERISI' as const };
      }
      return t;
    });
    setTransactions(updatedTxs);

    const updatedRoomIds = new Set(toCheckin.map(t => t.roomId));
    setRooms(prev => prev.map(r => {
      if (updatedRoomIds.has(r.id)) {
        const activeTx = toCheckin.find(t => t.roomId === r.id);
        return { ...r, status: 'TERISI', activeTxId: activeTx?.id || r.activeTxId };
      }
      return r;
    }));

    const sampleName = toCheckin[0].groupName || toCheckin[0].guestName || 'Rombongan';
    const roomListStr = toCheckin.map(t => t.roomNumber).join(', ');
    logAudit("BATCH_CHECKIN", `Batch Check-In untuk rombongan "${sampleName}": ${toCheckin.length} kamar (${roomListStr}) berhasil diaktifkan`);
    showToast(`Berhasil! ${toCheckin.length} kamar rombongan "${sampleName}" telah aktif Check-In.`, "success");
    return true;
  };

  const batchCheckoutGroup = (txIdsOrGroupId: string[] | string): boolean => {
    if (!isRecepRole(currentUser?.role)) {
      showToast("Akses Ditolak: Hanya staf Resepsionis yang berwenang memproses Check-Out!", "error");
      return false;
    }

    let targetTxs: Transaction[] = [];
    if (Array.isArray(txIdsOrGroupId)) {
      targetTxs = transactions.filter(t => txIdsOrGroupId.includes(t.id));
    } else {
      const key = (txIdsOrGroupId || '').trim().toLowerCase();
      targetTxs = transactions.filter(t => {
        if (t.status === 'DIBATALKAN' || t.status === 'SELESAI') return false;
        if (t.groupId && t.groupId.toLowerCase() === key) return true;
        if (t.groupName && t.groupName.trim().toLowerCase() === key) return true;
        if (t.guestName && t.guestName.trim().toLowerCase() === key) return true;
        if (key.startsWith('kloter-') && t.kloter && `kloter-${t.kloter.toLowerCase()}` === key) return true;
        if (t.notes && t.notes.toLowerCase().includes(key)) return true;
        return false;
      });
    }

    const toCheckout = targetTxs.filter(t => t.status === 'TERISI');
    if (toCheckout.length === 0) {
      showToast("Tidak ada kamar aktif (Terisi) yang perlu di-check out pada rombongan ini.", "info");
      return false;
    }

    const toCheckoutIds = new Set(toCheckout.map(t => t.id));
    const updatedTxs = transactions.map(t => {
      if (toCheckoutIds.has(t.id)) {
        return { ...t, status: 'SELESAI' as const };
      }
      return t;
    });
    setTransactions(updatedTxs);

    const checkoutRoomIds = new Set(toCheckout.map(t => t.roomId));
    setRooms(prev => prev.map(r => {
      if (checkoutRoomIds.has(r.id)) {
        const remainingActive = updatedTxs.filter(t => t.roomId === r.id && (t.status === 'TERISI' || t.status === 'BOOKED'));
        const stillTerisi = remainingActive.find(t => t.status === 'TERISI');
        if (stillTerisi) {
          return { ...r, status: 'TERISI', activeTxId: stillTerisi.id };
        }
        const nextBooked = remainingActive.find(t => t.status === 'BOOKED');
        if (nextBooked) {
          return { ...r, status: 'BOOKED', activeTxId: nextBooked.id, qcStatus: 'PERLU_INSPEKSI' };
        }
        return { ...r, status: 'KOSONG', activeTxId: null, qcStatus: 'PERLU_INSPEKSI' };
      }
      return r;
    }));

    const sampleName = toCheckout[0].groupName || toCheckout[0].guestName || 'Rombongan';
    const roomListStr = toCheckout.map(t => t.roomNumber).join(', ');
    logAudit("BATCH_CHECKOUT", `Batch Check-Out untuk rombongan "${sampleName}": ${toCheckout.length} kamar (${roomListStr}) selesai. Menunggu inspeksi kebersihan QC.`);
    showToast(`Check-Out selesai! ${toCheckout.length} kamar rombongan "${sampleName}" berhasil di-checkout & siap diinspeksi QC.`, "success");
    return true;
  };

  const addMaintenance = (maint: Maintenance) => {
    setMaintenances(prev => [...prev, maint]);
    setRooms(prev => prev.map(r => r.id === maint.roomId ? { ...r, status: "MAINTENANCE", activeMaintId: maint.id, qcStatus: "PERLU_PERBAIKAN" } : r));
    logAudit("Lapor Maintenance", `Laporan perawatan ${maint.category} (${maint.urgency}) di ${maint.roomNumber} (${maint.building})`);
    showToast(`Tiket perbaikan ${maint.roomNumber} berhasil dicatat dan menunggu penugasan Manager Teknisi!`, "warning");
  };

  const assignTechnicianToMaintenance = (maintId: string, technicianId: string, technicianName: string, managerNotes?: string): boolean => {
    if (!isManagerTeknisi(currentUser?.role)) {
      showToast("Akses Ditolak: Hanya Manager Teknisi atau Super Admin yang berwenang menugaskan teknisi!", "error");
      return false;
    }

    const maint = maintenances.find(m => m.id === maintId);
    if (!maint) {
      showToast("Data perawatan tidak ditemukan.", "error");
      return false;
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    setMaintenances(prev => prev.map(m => {
      if (m.id === maintId) {
        return {
          ...m,
          status: 'PROSES',
          assignedTechnicianId: technicianId,
          assignedTechnicianName: technicianName,
          assignedByManager: currentUser.fullName,
          assignedTime: nowStr,
          managerNotes: managerNotes || m.managerNotes,
          technician: technicianName
        };
      }
      return m;
    }));

    setRooms(prev => prev.map(r => r.id === maint.roomId ? { ...r, status: "MAINTENANCE", activeMaintId: maint.id } : r));

    logAudit(
      "Penugasan Teknisi", 
      `Manager Teknisi ${currentUser.fullName} menugaskan ${technicianName} untuk memperbaiki ${maint.roomNumber} (${maint.building})${managerNotes ? `. Instruksi: ${managerNotes}` : ''}`
    );
    showToast(`Tugas perbaikan ${maint.roomNumber} berhasil didelegasikan kepada ${technicianName}!`, "success");
    return true;
  };

  const markMaintenanceRepaired = (maintId: string, technicianNotes: string): boolean => {
    if (!isTeknisiRole(currentUser?.role)) {
      showToast("Akses Ditolak: Hanya petugas Teknisi / Manager Teknisi yang berwenang memperbarui status perbaikan!", "error");
      return false;
    }

    const maint = maintenances.find(m => m.id === maintId);
    if (!maint) {
      showToast("Data perawatan tidak ditemukan.", "error");
      return false;
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    setMaintenances(prev => prev.map(m => {
      if (m.id === maintId) {
        return {
          ...m,
          status: 'MENUNGGU_QC',
          workCompletedTime: nowStr,
          technicianNotes: technicianNotes || m.technicianNotes || 'Pekerjaan perbaikan fisik telah diselesaikan teknisi.'
        };
      }
      return m;
    }));

    setRooms(prev => prev.map(r => {
      if (r.id === maint.roomId) {
        return { 
          ...r, 
          status: "MAINTENANCE", 
          qcStatus: "MENUNGGU_QC",
          lastQcNotes: `Perbaikan teknisi telah selesai (${nowStr}). Menunggu inspeksi & pengesahan Tim QC.`
        };
      }
      return r;
    }));

    logAudit(
      "Perbaikan Selesai - Menunggu QC", 
      `Petugas ${currentUser.fullName} menyatakan perbaikan ${maint.roomNumber} telah selesai. Kamar/ruangan berstatus MENUNGGU_QC untuk diverifikasi Tim Quality Control.`
    );
    showToast(`Perbaikan ${maint.roomNumber} selesai diperbaiki! Menunggu verifikasi & uji kelayakan QC.`, "info");
    return true;
  };

  const updateMaintenanceStatus = (maintId: string, newStatus: 'MENUNGGU_PENUGASAN' | 'PROSES' | 'MENUNGGU_QC' | 'SELESAI', technicianNotes?: string): boolean => {
    if (!isTeknisiRole(currentUser?.role)) {
      showToast("Akses Ditolak: Hanya petugas Teknisi yang berwenang memperbarui status perawatan!", "error");
      return false;
    }

    const maint = maintenances.find(m => m.id === maintId);
    if (!maint) {
      showToast("Data perawatan tidak ditemukan.", "error");
      return false;
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    setMaintenances(prev => prev.map(m => {
      if (m.id === maintId) {
        return {
          ...m,
          status: newStatus,
          resolvedTime: newStatus === 'SELESAI' ? nowStr : m.resolvedTime,
          technicianNotes: technicianNotes !== undefined ? technicianNotes : m.technicianNotes,
          technician: m.technician || currentUser.fullName
        };
      }
      return m;
    }));

    setRooms(prev => prev.map(r => {
      if (r.id === maint.roomId) {
        if (newStatus === 'SELESAI') {
          return { ...r, status: "KOSONG", activeMaintId: null, qcStatus: "LOLOS_QC" };
        } else if (newStatus === 'MENUNGGU_QC') {
          return { ...r, status: "MAINTENANCE", activeMaintId: maint.id, qcStatus: "MENUNGGU_QC" };
        } else {
          return { ...r, status: "MAINTENANCE", activeMaintId: maint.id };
        }
      }
      return r;
    }));

    const statusLabel = newStatus === 'SELESAI' 
      ? 'Selesai & Disahkan Lolos' 
      : newStatus === 'MENUNGGU_QC' 
      ? 'Perbaikan Selesai (Menunggu QC)' 
      : newStatus === 'PROSES' 
      ? 'Dalam Pengerjaan Teknisi' 
      : 'Menunggu Penugasan';

    logAudit(
      "Update Status Maintenance", 
      `${currentUser.fullName} mengubah status perbaikan fasilitas ${maint.roomNumber} (${maint.building}) menjadi "${statusLabel}"`
    );
    showToast(`Status perbaikan ${maint.roomNumber} diperbarui: ${statusLabel}`, "success");
    return true;
  };

  const finishMaintenance = (roomId: string): boolean => {
    if (!isTeknisiRole(currentUser?.role)) {
      showToast("Akses Ditolak: Hanya petugas Teknisi yang berwenang memperbarui status perbaikan!", "error");
      return false;
    }

    const room = rooms.find(r => r.id === roomId);
    if (!room) return false;

    const targetMaint = maintenances.find(m => m.roomId === roomId && (m.status === 'PROSES' || m.status === 'MENUNGGU_PENUGASAN'));

    if (targetMaint) {
      return markMaintenanceRepaired(targetMaint.id, 'Perbaikan diselesaikan langsung oleh teknisi. Menunggu verifikasi QC.');
    } else {
      setRooms(prev => prev.map(r => r.id === roomId ? { ...r, status: "MAINTENANCE", qcStatus: "MENUNGGU_QC" } : r));
      logAudit("Selesai Pekerjaan Teknisi", `Teknisi ${currentUser.fullName} menyelesaikan pekerjaan pada ${room.roomNumber}. Menunggu pengesahan QC.`);
      showToast(`${room.roomNumber} telah selesai diperbaiki! Wajib diverifikasi QC sebelum disewakan.`, "info");
      return true;
    }
  };

  const addQcInspection = (inspection: QcInspection) => {
    if (!isQcRole(currentUser?.role)) {
      showToast("Akses Ditolak: Hanya petugas Quality Control yang berwenang melakukan inspeksi!", "error");
      return;
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    setQcInspections(prev => [inspection, ...prev]);

    if (inspection.result === 'LOLOS_QC') {
      // 1. Mark Room / Meeting Hall as KOSONG & LOLOS_QC (Siap Huni / Disewa)
      setRooms(prev => prev.map(r => {
        if (r.id === inspection.roomId) {
          return {
            ...r,
            status: 'KOSONG',
            activeMaintId: null,
            qcStatus: 'LOLOS_QC',
            lastQcDate: inspection.inspectionDate,
            lastQcBy: inspection.inspectorName,
            lastQcNotes: inspection.notes || 'Kondisi kamar/gedung bersih, fasilitas normal, dan LOLOS standar QC'
          };
        }
        return r;
      }));

      // 2. Resolve any associated maintenance tickets
      setMaintenances(prev => prev.map(m => {
        if (m.roomId === inspection.roomId && (m.status === 'MENUNGGU_QC' || m.status === 'PROSES' || m.status === 'MENUNGGU_PENUGASAN')) {
          return {
            ...m,
            status: 'SELESAI',
            resolvedTime: nowStr,
            qcVerdict: 'LOLOS_QC',
            qcInspectionId: inspection.id
          };
        }
        return m;
      }));

      logAudit(
        "Inspeksi QC Disahkan (Lolos)",
        `Tim QC (${inspection.inspectorName}) menyatakan fasilitas ${inspection.roomNumber} (${inspection.building}) RESMI LOLOS QC. Ruangan/kamar telah dipulihkan menjadi KOSONG dan siap digunakan!`
      );
      showToast(`Fasilitas ${inspection.roomNumber} terverifikasi LOLOS QC & SIAP HUNI!`, "success");

    } else {
      // PERLU PERBAIKAN: Room remains / becomes MAINTENANCE
      const newMaintId = `MNT-QC-${Date.now().toString().slice(-4)}`;

      setRooms(prev => prev.map(r => {
        if (r.id === inspection.roomId) {
          return {
            ...r,
            status: 'MAINTENANCE',
            activeMaintId: newMaintId,
            qcStatus: 'PERLU_PERBAIKAN',
            lastQcDate: inspection.inspectionDate,
            lastQcBy: inspection.inspectorName,
            lastQcNotes: inspection.notes || 'Ditemukan ketidaklayakan saat inspeksi QC. Diteruskan ke Manager Teknisi.'
          };
        }
        return r;
      }));

      const newMaint: Maintenance = {
        id: newMaintId,
        roomId: inspection.roomId,
        roomNumber: inspection.roomNumber,
        building: inspection.building,
        category: 'Temuan Tidak Layak QC',
        urgency: 'Tinggi',
        description: `Laporan QC (${inspection.inspectorName}): ${inspection.notes || 'Fasilitas tidak memenuhi standar kelayakan, butuh perbaikan teknisi.'}`,
        reportedUser: `QC - ${inspection.inspectorName}`,
        reportTime: inspection.inspectionDate,
        status: 'MENUNGGU_PENUGASAN',
        technician: 'Menunggu Penugasan Manager Teknisi',
        facilityType: inspection.facilityType || (inspection.roomNumber.includes('Aula') ? 'RUANG_PERTEMUAN' : 'KAMAR')
      };

      setMaintenances(prev => [newMaint, ...prev]);

      logAudit(
        "Temuan QC: Tidak Layak",
        `QC ${inspection.inspectorName} menyatakan ${inspection.roomNumber} (${inspection.building}) TIDAK LAYAK. Tiket dibuat dengan status MENUNGGU PENUGASAN dari Manager Teknisi.`
      );
      showToast(`Laporan QC tersimpan: ${inspection.roomNumber} TIDAK LAYAK. Diteruskan ke Manager Teknisi!`, "warning");
    }
  };

  const openModal = (modalId: string, data?: any) => {
    if (modalId === 'modalCheckin' && data?.roomId) {
      const room = rooms.find(r => r.id === data.roomId || r.roomNumber === data.roomId);
      if (room && room.qcStatus && room.qcStatus !== 'LOLOS_QC') {
        showToast(`Fasilitas ${room.roomNumber} (${room.building}) belum lolos QC (Status: ${room.qcStatus.replace(/_/g, ' ')}). Belum dapat digunakan untuk pemesanan/check-in!`, 'error');
        return;
      }
    }
    setModalState(prev => ({ ...prev, [modalId]: { isOpen: true, data } }));
  };

  const closeModal = (modalId: string) => {
    setModalState(prev => ({ ...prev, [modalId]: { isOpen: false, data: null } }));
  };

  // Centralized Local Backup & Database Handlers
  const exportDatabaseBackup = () => {
    try {
      dataStorage.downloadBackupFile();
      showToast('Cadangan basis data lokal berhasil diunduh.', 'success');
      logAudit('Ekspor Cadangan Data', 'Pengguna mengunduh cadangan lengkap basis data sistem.');
    } catch {
      showToast('Gagal membuat berkas cadangan data.', 'error');
    }
  };

  const importDatabaseBackup = (jsonString: string): boolean => {
    try {
      const res = dataStorage.importDatabaseFromJson(jsonString);
      if (res.success) {
        const db = dataStorage.getDatabase();
        setUsers(db.users);
        setRooms(db.rooms);
        setTransactions(db.transactions);
        setMaintenances(db.maintenances);
        setAuditLogs(db.auditLogs);
        setWorkSessions(db.workSessions);
        setQcInspections(db.qcInspections);
        setChatChannels(db.chatChannels);
        setChatMessages(db.chatMessages);
        setBreakfastMenuItems(db.breakfastMenuItems || []);
        setBreakfastOrders(db.breakfastOrders || []);
        showToast(res.message, 'success');
        logAudit('Impor Cadangan Data', 'Pengguna memulihkan basis data sistem dari berkas JSON.');
        return true;
      }
      showToast(res.message, 'error');
      return false;
    } catch {
      showToast('Terjadi kesalahan saat membaca berkas cadangan.', 'error');
      return false;
    }
  };

  const resetDatabase = () => {
    // Reset pangkalan data lokal dan pastikan HANYA akun Super Admin dan Admin yang tersisa
    // Default kosongkan data aktivitas, shift, dan QC
    const db = dataStorage.resetDatabaseToDefaults();
    setUsers(db.users);
    setBuildings(db.buildings || []);
    setMeetingRooms(db.meetingRooms || []);
    setRooms(db.rooms);
    setTransactions([]);
    setMaintenances([]);
    setAuditLogs([]);
    setWorkSessions([]);
    setQcInspections([]);
    setActiveSessionId(null);
    setChatChannels(db.chatChannels);
    setChatMessages([]);
    setBreakfastMenuItems(db.breakfastMenuItems);
    setBreakfastOrders([]);
    if (db.users && db.users.length > 0) {
      setCurrentUser(db.users[0]);
    }
    showToast('Basis data berhasil direset! Data aktivitas, shift, dan QC telah dikosongkan.', 'success');
  };

  // ==========================================
  // METODE DATABASE MASTER GEDUNG (BUILDING CRUD)
  // ==========================================
  const addBuilding = (building: Building) => {
    if (!isSuperAdmin(currentUser?.role)) {
      showToast('Akses Ditolak: Hanya Super Admin yang berwenang menambah gedung baru!', 'error');
      return;
    }
    dataStorage.saveBuilding(building);
    setBuildings(dataStorage.getBuildings());
    showToast(`Gedung "${building.name}" berhasil ditambahkan ke database!`, 'success');
    logAudit('Tambah Gedung', `Menambahkan gedung baru: ${building.name} (${building.code}) - ${building.totalRooms} Kamar`);
  };

  const updateBuilding = (building: Building) => {
    if (!isSuperAdmin(currentUser?.role)) {
      showToast('Akses Ditolak: Hanya Super Admin yang berwenang mengubah data gedung!', 'error');
      return;
    }
    dataStorage.saveBuilding(building);
    setBuildings(dataStorage.getBuildings());
    showToast(`Data gedung "${building.name}" berhasil diperbarui!`, 'success');
    logAudit('Ubah Gedung', `Memperbarui profil gedung: ${building.name}`);
  };

  const deleteBuilding = (buildingId: string): boolean => {
    if (!isSuperAdmin(currentUser?.role)) {
      showToast('Akses Ditolak: Hanya Super Admin yang berwenang menghapus gedung!', 'error');
      return false;
    }
    const bld = buildings.find(b => b.id === buildingId);
    const res = dataStorage.deleteBuilding(buildingId);
    if (!res.success) {
      showToast(res.message, 'error');
      return false;
    }
    setBuildings(dataStorage.getBuildings());
    setRooms(dataStorage.getRooms());
    showToast(res.message, 'info');
    logAudit('Hapus Gedung', `Menghapus gedung: ${bld?.name || buildingId}`);
    return true;
  };

  // ==========================================
  // METODE DATABASE RUANG PERTEMUAN (CRUD)
  // ==========================================
  const addMeetingRoom = (mr: MeetingRoom) => {
    if (!isSuperAdmin(currentUser?.role) && currentUser?.role !== 'Manager Resepsionis') {
      showToast('Akses Ditolak: Anda tidak memiliki wewenang untuk menambah ruang pertemuan!', 'error');
      return;
    }
    dataStorage.saveMeetingRoom(mr);
    setMeetingRooms(dataStorage.getMeetingRooms());
    setRooms(dataStorage.getRooms());
    showToast(`Ruang Pertemuan "${mr.name}" berhasil ditambahkan ke database!`, 'success');
    logAudit('Tambah Ruang Pertemuan', `Menambahkan ruang pertemuan: ${mr.name} (Kapasitas: ${mr.capacity} orang)`);
  };

  const updateMeetingRoom = (mr: MeetingRoom) => {
    if (!isSuperAdmin(currentUser?.role) && currentUser?.role !== 'Manager Resepsionis') {
      showToast('Akses Ditolak: Anda tidak memiliki wewenang untuk mengubah ruang pertemuan!', 'error');
      return;
    }
    dataStorage.saveMeetingRoom(mr);
    setMeetingRooms(dataStorage.getMeetingRooms());
    setRooms(dataStorage.getRooms());
    showToast(`Data ruang pertemuan "${mr.name}" berhasil diperbarui!`, 'success');
    logAudit('Ubah Ruang Pertemuan', `Memperbarui ruang pertemuan: ${mr.name}`);
  };

  const deleteMeetingRoom = (mrId: string): boolean => {
    if (!isSuperAdmin(currentUser?.role)) {
      showToast('Akses Ditolak: Hanya Super Admin yang berwenang menghapus ruang pertemuan!', 'error');
      return false;
    }
    const mr = meetingRooms.find(m => m.id === mrId);
    const res = dataStorage.deleteMeetingRoom(mrId);
    if (!res.success) {
      showToast(res.message, 'error');
      return false;
    }
    setMeetingRooms(dataStorage.getMeetingRooms());
    setRooms(dataStorage.getRooms());
    showToast(res.message, 'info');
    logAudit('Hapus Ruang Pertemuan', `Menghapus ruang pertemuan: ${mr?.name || mrId}`);
    return true;
  };

  // ==========================================
  // METODE DATABASE MASTER KAMAR (ROOMS CRUD)
  // ==========================================
  const addRoom = (room: Room) => {
    if (!isSuperAdmin(currentUser?.role) && currentUser?.role !== 'Manager Resepsionis') {
      showToast('Akses Ditolak: Hanya Admin atau Manager Resepsionis yang dapat menambah kamar!', 'error');
      return;
    }
    dataStorage.saveRoom(room);
    setRooms(dataStorage.getRooms());
    showToast(`Kamar ${room.roomNumber} (${room.building}) berhasil ditambahkan ke database!`, 'success');
    logAudit('Tambah Kamar', `Menambah kamar: No ${room.roomNumber}, Gedung ${room.building}, Tipe ${room.type}`);
  };

  const updateRoom = (room: Room) => {
    if (!isSuperAdmin(currentUser?.role) && currentUser?.role !== 'Manager Resepsionis') {
      showToast('Akses Ditolak: Anda tidak memiliki wewenang untuk mengubah profil kamar!', 'error');
      return;
    }
    dataStorage.saveRoom(room);
    setRooms(dataStorage.getRooms());
    showToast(`Data kamar ${room.roomNumber} berhasil diperbarui!`, 'success');
    logAudit('Ubah Kamar', `Memperbarui kamar: ${room.roomNumber} (${room.building})`);
  };

  const deleteRoom = (roomId: string): boolean => {
    if (!isSuperAdmin(currentUser?.role)) {
      showToast('Akses Ditolak: Hanya Super Admin yang berwenang menghapus unit kamar!', 'error');
      return false;
    }
    const room = rooms.find(r => r.id === roomId);
    const res = dataStorage.deleteRoom(roomId);
    if (!res.success) {
      showToast(res.message, 'error');
      return false;
    }
    setRooms(dataStorage.getRooms());
    showToast(res.message, 'info');
    logAudit('Hapus Kamar', `Menghapus kamar: ${room?.roomNumber || roomId} (${room?.building || ''})`);
    return true;
  };

  // ==========================================
  // METODE MANAJEMEN DATABASE CHAT
  // ==========================================
  const clearChatHistory = (channelId?: string) => {
    dataStorage.clearChatMessages(channelId);
    if (channelId) {
      setChatMessages(prev => prev.filter(m => m.channelId !== channelId));
      showToast('Riwayat pesan pada saluran ini berhasil dibersihkan dari database.', 'info');
    } else {
      setChatMessages([]);
      showToast('Seluruh riwayat obrolan berhasil dibersihkan dari database.', 'info');
    }
    logAudit('Bersihkan Chat', channelId ? `Menghapus riwayat obrolan channel ID ${channelId}` : 'Menghapus seluruh riwayat obrolan sistem');
  };

  const addChatChannel = (channel: ChatChannel) => {
    dataStorage.saveChatChannel(channel);
    setChatChannels(prev => [...prev.filter(c => c.id !== channel.id), channel]);
    showToast(`Saluran komunikasi "${channel.name}" berhasil dibuat!`, 'success');
    logAudit('Tambah Saluran Chat', `Membuat saluran chat: ${channel.name}`);
  };

  const deleteChatChannel = (channelId: string): boolean => {
    if (!isSuperAdmin(currentUser?.role)) {
      showToast('Akses Ditolak: Hanya Administrator yang dapat menghapus saluran!', 'error');
      return false;
    }
    dataStorage.deleteChatChannel(channelId);
    setChatChannels(prev => prev.filter(c => c.id !== channelId));
    setChatMessages(prev => prev.filter(m => m.channelId !== channelId));
    showToast('Saluran komunikasi berhasil dihapus dari database.', 'info');
    logAudit('Hapus Saluran Chat', `Menghapus saluran chat ID ${channelId}`);
    return true;
  };

  // ==========================================
  // METODE DATABASE PESANAN SARAPAN & MENU
  // ==========================================
  const addBreakfastOrder = (order: BreakfastOrder) => {
    dataStorage.saveBreakfastOrder(order);
    setBreakfastOrders(prev => [order, ...prev.filter(o => o.id !== order.id)]);
    showToast(`Pesanan sarapan kamar ${order.roomNumber} (${order.portions} porsi) berhasil dicatat ke database!`, 'success');
    logAudit('Tambah Pesanan Sarapan', `Pesanan baru kamar ${order.roomNumber}: ${order.menuName} (${order.portions} porsi)`);
  };

  const updateBreakfastOrder = (order: BreakfastOrder) => {
    dataStorage.saveBreakfastOrder(order);
    setBreakfastOrders(prev => prev.map(o => o.id === order.id ? order : o));
    showToast(`Pesanan sarapan kamar ${order.roomNumber} berhasil diperbarui!`, 'success');
    logAudit('Ubah Pesanan Sarapan', `Memperbarui pesanan sarapan kamar ${order.roomNumber}: ${order.menuName}`);
  };

  const deleteBreakfastOrder = (orderId: string) => {
    const target = breakfastOrders.find(o => o.id === orderId);
    dataStorage.deleteBreakfastOrder(orderId);
    setBreakfastOrders(prev => prev.filter(o => o.id !== orderId));
    if (orderId.startsWith('BO-TX-')) {
      const txId = orderId.replace('BO-TX-', '');
      const tx = transactions.find(t => t.id === txId || t.id.includes(txId) || t.id === orderId);
      if (tx) {
        updateBreakfastStatus(tx.id, undefined as any);
      }
    } else if (target?.transactionId) {
      updateBreakfastStatus(target.transactionId, undefined as any);
    }
    showToast(`Pesanan sarapan ${target?.roomNumber || orderId} berhasil dihapus dari basis data.`, 'info');
    logAudit('Hapus Pesanan Sarapan', `Menghapus pesanan sarapan ID ${orderId}`);
  };

  const updateBreakfastOrderStatusState = (orderId: string, status: BreakfastOrder['status']) => {
    dataStorage.updateBreakfastOrderStatus(orderId, status);
    let target = breakfastOrders.find(o => o.id === orderId);
    if (!target && orderId.startsWith('BO-TX-')) {
      const txId = orderId.replace('BO-TX-', '');
      const tx = transactions.find(t => t.id === txId || t.id.includes(txId) || t.id === orderId);
      if (tx) {
        target = {
          id: orderId,
          roomNumber: tx.roomNumber,
          building: tx.building,
          guestName: tx.guestName,
          phone: tx.phone,
          kloter: tx.kloter,
          transactionId: tx.id,
          menuName: tx.breakfastMenu || 'Nasi Goreng Spesial & Telur Ceplok',
          portions: tx.breakfastPortions || 4,
          days: tx.breakfastDays || tx.duration || 1,
          startDate: tx.startDate || getRealTodayDate(),
          deliveryTime: '06:30 WIB',
          status,
          createdAt: `${tx.startDate || getRealTodayDate()} 06:00:00`
        };
      }
    }
    setBreakfastOrders(prev => {
      const exists = prev.some(o => o.id === orderId);
      if (exists) {
        return prev.map(o => o.id === orderId ? { ...o, status, updatedAt: new Date().toISOString() } : o);
      } else if (target) {
        return [...prev, { ...target, status }];
      }
      return prev;
    });
    if (target?.transactionId) {
      updateBreakfastStatus(target.transactionId, status);
    }
    const statusLabels: Record<string, string> = {
      MENUNGGU: 'Menunggu',
      SEDANG_DIBUAT: 'Sedang Dimasak di Dapur',
      PENGANTARAN: 'Dalam Pengantaran ke Kamar',
      SELESAI: 'Selesai Disajikan'
    };
    showToast(`Status sarapan kamar ${target?.roomNumber || ''} diubah ke: ${statusLabels[status] || status}`, 'info');
    logAudit('Status Sarapan', `Status sarapan kamar ${target?.roomNumber || ''} menjadi ${status}`);
  };

  const addBreakfastMenuItem = (item: BreakfastMenuItem) => {
    dataStorage.saveBreakfastMenuItem(item);
    setBreakfastMenuItems(prev => [...prev.filter(m => m.id !== item.id), item]);
    showToast(`Menu sarapan "${item.name}" berhasil ditambahkan ke katalog dapur!`, 'success');
    logAudit('Tambah Menu Sarapan', `Katalog menu ditambah: ${item.name} (Rp ${item.price.toLocaleString('id-ID')})`);
  };

  const updateBreakfastMenuItem = (item: BreakfastMenuItem) => {
    dataStorage.saveBreakfastMenuItem(item);
    setBreakfastMenuItems(prev => prev.map(m => m.id === item.id ? item : m));
    showToast(`Menu sarapan "${item.name}" berhasil diperbarui!`, 'success');
    logAudit('Ubah Menu Sarapan', `Katalog menu diubah: ${item.name}`);
  };

  const deleteBreakfastMenuItem = (itemId: string) => {
    const target = breakfastMenuItems.find(m => m.id === itemId);
    dataStorage.deleteBreakfastMenuItem(itemId);
    setBreakfastMenuItems(prev => prev.filter(m => m.id !== itemId));
    showToast(`Menu sarapan "${target?.name || itemId}" dihapus dari katalog.`, 'info');
    logAudit('Hapus Menu Sarapan', `Menghapus menu sarapan ID ${itemId}`);
  };

  // Modal scroll lock on body (mencegah scroll latar belakang saat modal terbuka)
  const isAnyModalOpen = Object.values(modalState).some((m: any) => Boolean(m?.isOpen));
  useBodyScrollLock(isAnyModalOpen);

  return (
    <AppContext.Provider value={{
      currentUser, users, rooms, transactions, maintenances, auditLogs, workSessions, qcInspections, activeSessionId, activeTab, toasts, modalState,
      storageNamespace, switchStorageNamespace, isNetworkOnline, isDarkMode, toggleDarkMode, updateCurrentAccount, appSettings, updateAppSettings,
      buildings, meetingRooms, addBuilding, updateBuilding, deleteBuilding, addMeetingRoom, updateMeetingRoom, deleteMeetingRoom, addRoom, updateRoom, deleteRoom,
      breakfastMenuItems, breakfastOrders, addBreakfastOrder, updateBreakfastOrder, deleteBreakfastOrder, updateBreakfastOrderStatusState,
      addBreakfastMenuItem, updateBreakfastMenuItem, deleteBreakfastMenuItem,
      chatChannels, chatMessages, isChatOpen, activeChatChannelId, chatSoundEnabled, chatNotificationToast, unreadTotalCount,
      openChat, closeChat, setActiveChatChannelId: handleSetActiveChatChannelId, toggleChatSound, sendChatMessage,
      markChannelAsRead, dismissChatNotification, simulateIncomingChatMessage,
      clearChatHistory, addChatChannel, deleteChatChannel,
      passwordResetRequests, requestPasswordReset, approvePasswordReset, rejectPasswordReset, registerAccountRequest, approveUserRegistration, rejectUserRegistration,
      login, logout, clearWorkSessions, setActiveTab, addUser, updateUser, toggleUserStatus, deleteUser, addTransaction, addGroupBooking, updateGroupBooking, updateTransaction, updateBreakfastStatus, checkoutRoom, activateCheckin, cancelBooking, extendTransaction, batchCheckinGroup, batchCheckoutGroup,
      addMaintenance, assignTechnicianToMaintenance, markMaintenanceRepaired, updateMaintenanceStatus, finishMaintenance, addQcInspection, logAudit, showToast, removeToast, openModal, closeModal,
      supabaseSyncState, manualSyncSupabase, pushAllToSupabase,
      dataStorage, exportDatabaseBackup, importDatabaseBackup, resetDatabase
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
}
