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
  PasswordResetRequest
} from '../types';
import { 
  initialUsers, 
  getInitialRooms, 
  initialTransactions, 
  initialMaintenances, 
  initialAuditLogs, 
  initialWorkSessions, 
  initialQcInspections,
  initialBreakfastMenuItems,
  getInitialBreakfastOrders,
  initialBuildings,
  initialMeetingRooms
} from '../data';
import { initialChatChannels, initialChatMessages } from '../chatData';
import { 
  supabase, 
  syncFullDatabaseToSupabase, 
  fetchFullDatabaseFromSupabase, 
  testSupabaseConnection, 
  type SupabaseSyncState 
} from '../lib/supabase';

export type StorageNamespace = 'LOCAL' | 'PROD' | 'DEMO';

export const LOCAL_STORAGE_KEY = 'UPT_ASRAMA_HAJI_DATABASE_V4_CLEAN';
export const LEGACY_STORAGE_KEYS = [
  'UPT_ASRAMA_HAJI_DATABASE_V3_CLEAN',
  'UPT_ASRAMA_HAJI_LOCAL_DATABASE_V1',
  'UPT_ASRAMA_HAJI_DATABASE_V2',
  'UPT_ASRAMA_HAJI_LOCAL_DATABASE_V2'
];

export interface AppSettings {
  organizationName: string;
  subTitle: string;
  ministryName: string;
  address: string;
  phone: string;
  email: string;
  portalUrl: string;
  appLogo?: string;
  appFavicon?: string;
  tagTitle?: string;
}

export interface CompleteStorageDatabase {
  schemaVersion: number;
  appName: string;
  exportedAt: string;
  appSettings: AppSettings;
  users: User[];
  buildings: Building[];
  rooms: Room[];
  meetingRooms: MeetingRoom[];
  transactions: Transaction[];
  maintenances: Maintenance[];
  qcInspections: QcInspection[];
  workSessions: WorkSession[];
  auditLogs: AuditLog[];
  chatChannels: ChatChannel[];
  chatMessages: ChatMessage[];
  breakfastMenuItems: BreakfastMenuItem[];
  breakfastOrders: BreakfastOrder[];
  passwordResetRequests?: PasswordResetRequest[];
}

export const defaultAppSettings: AppSettings = {
  organizationName: 'UPT ASRAMA HAJI JAKARTA',
  subTitle: 'Sistem Informasi Manajemen Operasional Terpadu & Hunian',
  ministryName: 'KEMENTERIAN HAJI DAN UMRAH REPUBLIK INDONESIA',
  address: 'Jl. Raya Pd. Gede, RT.1/RW.1, Pinang Ranti, Kec. Makasar, Kota Jakarta Timur, Daerah Khusus Ibukota Jakarta 13560, Indonesia.',
  phone: '0816243154',
  email: 'info@asramahajijakarta.id',
  portalUrl: 'https://asramahajijakarta.id'
};

export function generateInitialDatabase(onlyAdmin: boolean = false): CompleteStorageDatabase {
  const usersList = onlyAdmin
    ? initialUsers.filter(u => u.role === 'Super Admin' || u.role === 'Admin' || u.username.toLowerCase() === 'superadmin' || u.username.toLowerCase() === 'admin')
    : [...initialUsers];

  return {
    schemaVersion: 4,
    appName: 'SIM-Akomodasi UPT Asrama Haji Jakarta',
    exportedAt: new Date().toISOString(),
    appSettings: { ...defaultAppSettings },
    users: usersList,
    buildings: [...initialBuildings],
    meetingRooms: [...initialMeetingRooms],
    rooms: getInitialRooms(),
    transactions: [],
    maintenances: [],
    qcInspections: [],
    workSessions: [],
    auditLogs: [],
    chatChannels: [...initialChatChannels],
    chatMessages: [],
    breakfastMenuItems: [...initialBreakfastMenuItems],
    breakfastOrders: [],
    passwordResetRequests: []
  };
}

export class DataStorageService {
  private cache: CompleteStorageDatabase | null = null;
  private lastSyncTime: string | null = null;
  private syncStatus: 'idle' | 'syncing' | 'connected' | 'error' = 'idle';
  private syncError: string | null = null;
  private syncDebounceTimer: any = null;

  constructor() {
    this.getDatabase();
    // Inisialisasi pengecekan koneksi Supabase di background
    this.checkInitialSupabaseConnection();
  }

  private async checkInitialSupabaseConnection() {
    try {
      const res = await testSupabaseConnection();
      if (res.success) {
        this.syncStatus = 'connected';
      } else {
        this.syncStatus = 'error';
        this.syncError = res.message;
      }
    } catch (_) {}
  }

  public getNamespace(): StorageNamespace {
    return 'LOCAL';
  }

  public isProd(): boolean {
    return false;
  }

  public isDemo(): boolean {
    return false;
  }

  public getLastSyncTime(): string | null {
    return this.lastSyncTime;
  }

  public getSupabaseSyncState(): SupabaseSyncState {
    return {
      status: this.syncStatus,
      lastSyncTime: this.lastSyncTime,
      errorMessage: this.syncError,
      isConfigured: true
    };
  }

  /**
   * Hidrasi data terbaru dari Supabase Cloud saat aplikasi dibuka
   */
  public async hydrateFromSupabase(): Promise<CompleteStorageDatabase | null> {
    try {
      this.syncStatus = 'syncing';
      const cloudDb = await fetchFullDatabaseFromSupabase();
      if (cloudDb && Array.isArray(cloudDb.rooms) && cloudDb.rooms.length > 0) {
        this.cache = cloudDb;
        this.lastSyncTime = new Date().toISOString();
        this.syncStatus = 'connected';
        this.syncError = null;
        
        // Simpan ke localStorage sebagai cache offline
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudDb));
        }
        return cloudDb;
      }
      this.syncStatus = 'connected';
      return null;
    } catch (err: any) {
      this.syncStatus = 'error';
      this.syncError = err?.message || 'Gagal mengambil data dari Supabase';
      return null;
    }
  }

  public async hydrateFromServer(_ns?: any): Promise<CompleteStorageDatabase | null> {
    return this.hydrateFromSupabase();
  }

  /**
   * Sinkronisasi paksa ke Supabase
   */
  public async pushAllToSupabase(): Promise<{ success: boolean; error?: string }> {
    const db = this.getDatabase();
    this.syncStatus = 'syncing';
    const res = await syncFullDatabaseToSupabase(db);
    if (res.success) {
      this.syncStatus = 'connected';
      this.lastSyncTime = new Date().toISOString();
      this.syncError = null;
    } else {
      this.syncStatus = 'error';
      this.syncError = res.error || 'Gagal push ke Supabase';
    }
    return res;
  }

  /**
   * Mengirim data ke Supabase dengan debouncing agar hemat bandwidth dan tidak membebani UI
   */
  private triggerSupabaseSync(db: CompleteStorageDatabase) {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }
    this.syncDebounceTimer = setTimeout(async () => {
      try {
        this.syncStatus = 'syncing';
        const res = await syncFullDatabaseToSupabase(db);
        if (res.success) {
          this.syncStatus = 'connected';
          this.lastSyncTime = new Date().toISOString();
          this.syncError = null;
        } else {
          this.syncStatus = 'error';
          this.syncError = res.error || 'Koneksi Supabase terputus';
        }
      } catch (err: any) {
        this.syncStatus = 'error';
        this.syncError = err?.message || 'Sync error';
      }
    }, 1500);
  }

  public setNamespace(_ns: any): CompleteStorageDatabase {
    return this.getDatabase();
  }

  public getStorageKey(): string {
    return LOCAL_STORAGE_KEY;
  }

  public getDatabase(_ns?: any): CompleteStorageDatabase {
    if (this.cache) {
      return this.cache;
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        let stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!stored) {
          for (const oldKey of LEGACY_STORAGE_KEYS) {
            const oldVal = window.localStorage.getItem(oldKey);
            if (oldVal) {
              stored = oldVal;
              try { window.localStorage.removeItem(oldKey); } catch (_) {}
              break;
            }
          }
        }

        if (stored) {
          const parsed = JSON.parse(stored) as Partial<CompleteStorageDatabase>;
          if (parsed && Array.isArray(parsed.rooms)) {
            // SINKRONISASI PENGGUNA: Gunakan akun yang tersimpan dari storage/Supabase, fallback ke initialUsers hanya jika kosong
            if (!Array.isArray(parsed.users) || parsed.users.length === 0) {
              parsed.users = [...initialUsers];
            }

            // BERSIHKAN SEMUA DATA DUMMY (Transaksi dummy, Maintenance dummy, QC dummy, Log aktivitas, Shift, dsb)
            if (!parsed.schemaVersion || parsed.schemaVersion < 4) {
              parsed.transactions = [];
              parsed.maintenances = [];
              parsed.qcInspections = [];
              parsed.workSessions = [];
              parsed.auditLogs = [];
              parsed.breakfastOrders = [];
              parsed.chatMessages = [];
              parsed.schemaVersion = 4;

              // Reset status semua kamar agar KOSONG (bersih dari transaksi dummy dan catatan QC lama)
              parsed.rooms = parsed.rooms.map(r => ({
                ...r,
                status: r.status === 'MAINTENANCE' ? 'MAINTENANCE' : 'KOSONG',
                qcStatus: 'LOLOS_QC',
                lastQcDate: undefined,
                lastQcBy: undefined,
                lastQcNotes: undefined,
                activeTxId: null,
                activeMaintId: null
              }));
            }

            // Pastikan data aktivitas, shift, dan QC bertipe array
            if (!Array.isArray(parsed.auditLogs)) parsed.auditLogs = [];
            if (!Array.isArray(parsed.workSessions)) parsed.workSessions = [];
            if (!Array.isArray(parsed.qcInspections)) parsed.qcInspections = [];

            // Inisialisasi buildings jika belum ada
            if (!Array.isArray(parsed.buildings) || parsed.buildings.length === 0) {
              parsed.buildings = [...initialBuildings];
            }

            // Inisialisasi meetingRooms jika belum ada
            if (!Array.isArray(parsed.meetingRooms) || parsed.meetingRooms.length === 0) {
              parsed.meetingRooms = [...initialMeetingRooms];
            }

            // Inisialisasi breakfast katalog jika belum ada
            if (!Array.isArray(parsed.breakfastMenuItems) || parsed.breakfastMenuItems.length === 0) {
              parsed.breakfastMenuItems = [...initialBreakfastMenuItems];
            }

            if (!Array.isArray(parsed.breakfastOrders)) {
              parsed.breakfastOrders = [];
            }

            if (!Array.isArray(parsed.chatChannels) || parsed.chatChannels.length === 0) {
              parsed.chatChannels = [...initialChatChannels];
            }

            if (!Array.isArray(parsed.chatMessages)) {
              parsed.chatMessages = [];
            }

            if (!Array.isArray(parsed.passwordResetRequests)) {
              parsed.passwordResetRequests = [];
            }

            if (!parsed.appSettings || parsed.appSettings.address?.includes('Hankam') || parsed.appSettings.phone === '(021) 8094444') {
              parsed.appSettings = { ...defaultAppSettings };
            }

            this.cache = parsed as CompleteStorageDatabase;
            this.saveDatabase(this.cache);
            return this.cache;
          }
        }
      }
    } catch (e) {
      console.warn('Gagal membaca database dari localStorage, menggunakan seed awal:', e);
    }

    const initDb = generateInitialDatabase(true);
    this.cache = initDb;
    this.saveDatabase(initDb);
    return initDb;
  }

  public saveDatabase(db: CompleteStorageDatabase, _ns?: any): void {
    const updated: CompleteStorageDatabase = {
      ...db,
      schemaVersion: 4,
      users: db.users.filter(u => u.username.toLowerCase() !== 'zain'),
      exportedAt: new Date().toISOString()
    };

    this.cache = updated;

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      console.error('Gagal menyimpan database ke localStorage:', e);
    }

    // Sinkronisasi otomatis ke Supabase Backend di cloud
    this.triggerSupabaseSync(updated);
  }

  // ==========================================
  // MANAJEMEN PENGGUNA (CRUD)
  // ==========================================
  public getUsers(): User[] {
    return this.getDatabase().users;
  }

  public getUserById(id: string): User | undefined {
    return this.getDatabase().users.find(u => u.id === id);
  }

  public getUserByUsername(username: string): User | undefined {
    return this.getDatabase().users.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  public saveUser(user: User): User {
    const db = this.getDatabase();
    const existingIndex = db.users.findIndex(u => u.id === user.id);
    let updatedUsers: User[];

    if (existingIndex >= 0) {
      updatedUsers = [...db.users];
      updatedUsers[existingIndex] = { ...updatedUsers[existingIndex], ...user };
    } else {
      updatedUsers = [user, ...db.users];
    }

    this.saveDatabase({ ...db, users: updatedUsers });
    return user;
  }

  public updateUser(userId: string, updates: Partial<User>): User | null {
    const db = this.getDatabase();
    const idx = db.users.findIndex(u => u.id === userId);
    if (idx === -1) return null;

    const updatedUser = { ...db.users[idx], ...updates };
    const newUsers = [...db.users];
    newUsers[idx] = updatedUser;

    this.saveDatabase({ ...db, users: newUsers });
    return updatedUser;
  }

  public toggleUserStatus(userId: string): User | null {
    const db = this.getDatabase();
    const idx = db.users.findIndex(u => u.id === userId);
    if (idx === -1) return null;

    const currentStatus = db.users[idx].status;
    const newStatus = currentStatus === 'Aktif' ? 'Non-Aktif' : 'Aktif';
    const updatedUser = { ...db.users[idx], status: newStatus };

    const newUsers = [...db.users];
    newUsers[idx] = updatedUser;

    this.saveDatabase({ ...db, users: newUsers });
    return updatedUser;
  }

  public deleteUser(userId: string): boolean {
    const db = this.getDatabase();
    const initialLen = db.users.length;
    const newUsers = db.users.filter(u => u.id !== userId);

    if (newUsers.length === initialLen) return false;

    this.saveDatabase({ ...db, users: newUsers });
    return true;
  }

  // ==========================================
  // MANAJEMEN MASTER GEDUNG (BUILDINGS CRUD)
  // ==========================================
  public getBuildings(): Building[] {
    return this.getDatabase().buildings || [];
  }

  public saveBuilding(building: Building): Building {
    const db = this.getDatabase();
    const buildings = db.buildings || [];
    const buildingWithId = {
      ...building,
      id: building.id && building.id.trim() !== '' ? building.id : `bld-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
    };
    const idx = buildings.findIndex(b => b.id === buildingWithId.id);
    let updated: Building[];

    if (idx >= 0) {
      updated = [...buildings];
      updated[idx] = { ...updated[idx], ...buildingWithId };
    } else {
      updated = [...buildings, buildingWithId];
    }

    this.saveDatabase({ ...db, buildings: updated });
    return buildingWithId;
  }

  public deleteBuilding(buildingId: string): { success: boolean; message: string } {
    const db = this.getDatabase();
    const buildings = db.buildings || [];
    const bld = buildings.find(b => b.id === buildingId);
    if (!bld) {
      return { success: false, message: 'Gedung tidak ditemukan.' };
    }

    // Validasi apakah ada kamar aktif yang terasosiasi dengan gedung ini
    const rooms = db.rooms || [];
    const associatedRooms = rooms.filter(r => r.building.toLowerCase() === bld.name.toLowerCase());
    if (associatedRooms.length > 0) {
      return { 
        success: false, 
        message: `Tidak dapat menghapus '${bld.name}' karena masih terdapat ${associatedRooms.length} kamar aktif di dalamnya. Pindahkan atau hapus kamar terkait terlebih dahulu.` 
      };
    }

    const updated = buildings.filter(b => b.id !== buildingId);
    this.saveDatabase({ ...db, buildings: updated });
    return { success: true, message: `Gedung '${bld.name}' berhasil dihapus dari database.` };
  }

  // ==========================================
  // MANAJEMEN MASTER RUANG PERTEMUAN (CRUD)
  // ==========================================
  public getMeetingRooms(): MeetingRoom[] {
    return this.getDatabase().meetingRooms || [];
  }

  public saveMeetingRoom(meetingRoom: MeetingRoom): MeetingRoom {
    const db = this.getDatabase();
    const meetingRooms = db.meetingRooms || [];
    const mrWithId = {
      ...meetingRoom,
      id: meetingRoom.id && meetingRoom.id.trim() !== '' ? meetingRoom.id : `mr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
    };
    const idx = meetingRooms.findIndex(m => m.id === mrWithId.id);
    let updated: MeetingRoom[];

    if (idx >= 0) {
      updated = [...meetingRooms];
      updated[idx] = { ...updated[idx], ...mrWithId };
    } else {
      updated = [...meetingRooms, mrWithId];
    }

    // Sinkronkan juga ke daftar rooms (dengan building: "Ruang Pertemuan") agar operasional terpadu
    const rooms = db.rooms || [];
    const roomIdx = rooms.findIndex(r => r.id === mrWithId.id || r.roomNumber === mrWithId.name);
    let updatedRooms: Room[];

    const roomRepresentation: Room = {
      id: mrWithId.id,
      building: 'Ruang Pertemuan',
      roomNumber: mrWithId.name,
      type: 'Ruang Pertemuan / Aula',
      capacity: mrWithId.capacity,
      status: mrWithId.status === 'MAINTENANCE' ? 'MAINTENANCE' : (mrWithId.status === 'TERPAKAI' ? 'TERISI' : 'KOSONG'),
      qcStatus: mrWithId.qcStatus || 'LOLOS_QC',
      activeTxId: mrWithId.activeTxId || null,
      activeMaintId: null
    };

    if (roomIdx >= 0) {
      updatedRooms = [...rooms];
      updatedRooms[roomIdx] = { ...updatedRooms[roomIdx], ...roomRepresentation };
    } else {
      updatedRooms = [...rooms, roomRepresentation];
    }

    this.saveDatabase({ ...db, meetingRooms: updated, rooms: updatedRooms });
    return mrWithId;
  }

  public deleteMeetingRoom(meetingRoomId: string): { success: boolean; message: string } {
    const db = this.getDatabase();
    const meetingRooms = db.meetingRooms || [];
    const mr = meetingRooms.find(m => m.id === meetingRoomId);
    if (!mr) {
      return { success: false, message: 'Ruang pertemuan tidak ditemukan.' };
    }

    // Cek apakah sedang terpakai dalam transaksi aktif
    const txs = db.transactions || [];
    const activeTx = txs.find(t => (t.roomId === meetingRoomId || t.roomNumber === mr.name) && t.status === 'AKTIF');
    if (activeTx) {
      return { 
        success: false, 
        message: `Tidak dapat menghapus '${mr.name}' karena sedang ada peminjaman/booking aktif (${activeTx.guestName}).` 
      };
    }

    const updatedMR = meetingRooms.filter(m => m.id !== meetingRoomId);
    const updatedRooms = (db.rooms || []).filter(r => r.id !== meetingRoomId && r.roomNumber !== mr.name);

    this.saveDatabase({ ...db, meetingRooms: updatedMR, rooms: updatedRooms });
    return { success: true, message: `Ruang Pertemuan '${mr.name}' berhasil dihapus dari database.` };
  }

  // ==========================================
  // MANAJEMEN MASTER KAMAR (ROOMS CRUD)
  // ==========================================
  public getRooms(): Room[] {
    return this.getDatabase().rooms;
  }

  public saveRoom(room: Room): Room {
    const db = this.getDatabase();
    const rooms = db.rooms || [];
    const roomWithId = {
      ...room,
      id: room.id && room.id.trim() !== '' ? room.id : `room-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      qcStatus: room.qcStatus || 'LOLOS_QC'
    };
    const idx = rooms.findIndex(r => r.id === roomWithId.id);
    let updated: Room[];

    if (idx >= 0) {
      updated = [...rooms];
      updated[idx] = { ...updated[idx], ...roomWithId };
    } else {
      updated = [...rooms, roomWithId];
    }

    this.saveDatabase({ ...db, rooms: updated });
    return roomWithId;
  }

  public deleteRoom(roomId: string): { success: boolean; message: string } {
    const db = this.getDatabase();
    const rooms = db.rooms || [];
    const room = rooms.find(r => r.id === roomId);
    if (!room) {
      return { success: false, message: 'Kamar tidak ditemukan.' };
    }

    if (room.status === 'TERISI') {
      return { success: false, message: `Tidak dapat menghapus kamar ${room.roomNumber} karena status sedang terisi tamu.` };
    }

    const updatedRooms = rooms.filter(r => r.id !== roomId);
    this.saveDatabase({ ...db, rooms: updatedRooms });
    return { success: true, message: `Kamar ${room.roomNumber} (${room.building}) berhasil dihapus.` };
  }

  // ==========================================
  // TRANSAKSI & RESERVASI
  // ==========================================
  public getTransactions(): Transaction[] {
    return this.getDatabase().transactions;
  }

  public saveTransaction(tx: Transaction): Transaction {
    const db = this.getDatabase();
    const existingIndex = db.transactions.findIndex(t => t.id === tx.id);
    let updatedTxs: Transaction[];

    if (existingIndex >= 0) {
      updatedTxs = [...db.transactions];
      updatedTxs[existingIndex] = { ...updatedTxs[existingIndex], ...tx };
    } else {
      updatedTxs = [tx, ...db.transactions];
    }

    this.saveDatabase({ ...db, transactions: updatedTxs });
    return tx;
  }

  // ==========================================
  // PEMELIHARAAN (MAINTENANCE)
  // ==========================================
  public getMaintenances(): Maintenance[] {
    return this.getDatabase().maintenances;
  }

  public saveMaintenance(m: Maintenance): Maintenance {
    const db = this.getDatabase();
    const idx = db.maintenances.findIndex(item => item.id === m.id);
    let updated: Maintenance[];

    if (idx >= 0) {
      updated = [...db.maintenances];
      updated[idx] = { ...updated[idx], ...m };
    } else {
      updated = [m, ...db.maintenances];
    }

    this.saveDatabase({ ...db, maintenances: updated });
    return m;
  }

  // ==========================================
  // AUDIT LOG & AKTIVITAS
  // ==========================================
  public getAuditLogs(): AuditLog[] {
    return this.getDatabase().auditLogs;
  }

  public addAuditLog(log: AuditLog): AuditLog {
    const db = this.getDatabase();
    const updated = [log, ...db.auditLogs];
    this.saveDatabase({ ...db, auditLogs: updated });
    return log;
  }

  // ==========================================
  // SESI KERJA & SHIFT
  // ==========================================
  public getWorkSessions(): WorkSession[] {
    return this.getDatabase().workSessions;
  }

  public saveWorkSession(session: WorkSession): WorkSession {
    const db = this.getDatabase();
    const idx = db.workSessions.findIndex(s => s.id === session.id);
    let updated: WorkSession[];

    if (idx >= 0) {
      updated = [...db.workSessions];
      updated[idx] = { ...updated[idx], ...session };
    } else {
      updated = [session, ...db.workSessions];
    }

    this.saveDatabase({ ...db, workSessions: updated });
    return session;
  }

  // ==========================================
  // QUALITY CONTROL (QC) INSPECTIONS
  // ==========================================
  public getQcInspections(): QcInspection[] {
    return this.getDatabase().qcInspections;
  }

  public saveQcInspection(inspection: QcInspection): QcInspection {
    const db = this.getDatabase();
    const idx = db.qcInspections.findIndex(q => q.id === inspection.id);
    let updated: QcInspection[];

    if (idx >= 0) {
      updated = [...db.qcInspections];
      updated[idx] = { ...updated[idx], ...inspection };
    } else {
      updated = [inspection, ...db.qcInspections];
    }

    this.saveDatabase({ ...db, qcInspections: updated });
    return inspection;
  }

  // ==========================================
  // BASIS DATA CHAT & KOMUNIKASI (CRUD)
  // ==========================================
  public getChatChannels(): ChatChannel[] {
    return this.getDatabase().chatChannels || [];
  }

  public saveChatChannel(channel: ChatChannel): ChatChannel {
    const db = this.getDatabase();
    const channels = db.chatChannels || [];
    const idx = channels.findIndex(c => c.id === channel.id);
    let updated: ChatChannel[];

    if (idx >= 0) {
      updated = [...channels];
      updated[idx] = { ...updated[idx], ...channel };
    } else {
      updated = [...channels, channel];
    }

    this.saveDatabase({ ...db, chatChannels: updated });
    return channel;
  }

  public deleteChatChannel(channelId: string): boolean {
    const db = this.getDatabase();
    const channels = db.chatChannels || [];
    const updatedChannels = channels.filter(c => c.id !== channelId);
    const updatedMessages = (db.chatMessages || []).filter(m => m.channelId !== channelId);

    this.saveDatabase({ ...db, chatChannels: updatedChannels, chatMessages: updatedMessages });
    return true;
  }

  public getChatMessages(channelId?: string): ChatMessage[] {
    const all = this.getDatabase().chatMessages || [];
    if (channelId) {
      return all.filter(m => m.channelId === channelId);
    }
    return all;
  }

  public saveChatMessage(msg: ChatMessage): ChatMessage {
    const db = this.getDatabase();
    const messages = db.chatMessages || [];
    const updatedMessages = [...messages, msg];

    // Perbarui status last message pada channel
    const channels = db.chatChannels || [];
    const updatedChannels = channels.map(c => {
      if (c.id === msg.channelId) {
        return {
          ...c,
          lastMessage: msg.message,
          lastMessageTime: msg.timeFormatted,
          lastSenderName: msg.senderName
        };
      }
      return c;
    });

    this.saveDatabase({ 
      ...db, 
      chatMessages: updatedMessages, 
      chatChannels: updatedChannels 
    });
    return msg;
  }

  public clearChatMessages(channelId?: string): void {
    const db = this.getDatabase();
    if (channelId) {
      const remaining = (db.chatMessages || []).filter(m => m.channelId !== channelId);
      this.saveDatabase({ ...db, chatMessages: remaining });
    } else {
      this.saveDatabase({ ...db, chatMessages: [] });
    }
  }

  // ==========================================
  // PENGATURAN APLIKASI
  // ==========================================
  public getAppSettings(): AppSettings {
    return this.getDatabase().appSettings || defaultAppSettings;
  }

  public updateAppSettings(updates: Partial<AppSettings>): AppSettings {
    const db = this.getDatabase();
    const newSettings: AppSettings = {
      ...this.getAppSettings(),
      ...updates
    };
    this.saveDatabase({ ...db, appSettings: newSettings });
    return newSettings;
  }

  // ==========================================
  // CADANGAN & PEMULIHAN (BACKUP & RESTORE)
  // ==========================================
  public exportDatabaseAsJson(): string {
    const db = this.getDatabase();
    return JSON.stringify(db, null, 2);
  }

  public downloadBackupFile(customFilename?: string, _ns?: any): void {
    const jsonStr = this.exportDatabaseAsJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);
    const defaultName = `UPT_Asrama_Haji_Jakarta_Backup_${timestamp}.json`;
    a.href = url;
    a.download = customFilename || defaultName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public importDatabaseFromJson(jsonStr: string, _ns?: any): { 
    success: boolean; 
    message: string; 
    countSummary?: Record<string, number> 
  } {
    try {
      const parsed = JSON.parse(jsonStr) as Partial<CompleteStorageDatabase>;
      if (!parsed) {
        return { success: false, message: 'Format berkas JSON tidak valid atau kosong.' };
      }

      if (!Array.isArray(parsed.users) || !Array.isArray(parsed.rooms) || !Array.isArray(parsed.transactions)) {
        return { 
          success: false, 
          message: 'Struktur database tidak lengkap. Wajib memiliki data users, rooms, dan transactions.' 
        };
      }

      const validatedDb: CompleteStorageDatabase = {
        schemaVersion: parsed.schemaVersion || 2,
        appName: parsed.appName || 'SIM-Akomodasi UPT Asrama Haji Jakarta',
        exportedAt: new Date().toISOString(),
        appSettings: parsed.appSettings || { ...defaultAppSettings },
        users: parsed.users.filter(u => u.username.toLowerCase() !== 'zain'),
        buildings: Array.isArray(parsed.buildings) ? parsed.buildings : [...initialBuildings],
        meetingRooms: Array.isArray(parsed.meetingRooms) ? parsed.meetingRooms : [...initialMeetingRooms],
        rooms: parsed.rooms,
        transactions: parsed.transactions,
        maintenances: Array.isArray(parsed.maintenances) ? parsed.maintenances : [],
        qcInspections: Array.isArray(parsed.qcInspections) ? parsed.qcInspections : [],
        workSessions: Array.isArray(parsed.workSessions) ? parsed.workSessions : [],
        auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
        chatChannels: Array.isArray(parsed.chatChannels) ? parsed.chatChannels : [...initialChatChannels],
        chatMessages: Array.isArray(parsed.chatMessages) ? parsed.chatMessages : [],
        breakfastMenuItems: Array.isArray(parsed.breakfastMenuItems) ? parsed.breakfastMenuItems : [...initialBreakfastMenuItems],
        breakfastOrders: Array.isArray(parsed.breakfastOrders) ? parsed.breakfastOrders : []
      };

      this.saveDatabase(validatedDb);

      return {
        success: true,
        message: 'Basis data berhasil dipulihkan secara penuh ke penyimpanan lokal sistem.',
        countSummary: {
          users: validatedDb.users.length,
          buildings: validatedDb.buildings.length,
          rooms: validatedDb.rooms.length,
          meetingRooms: validatedDb.meetingRooms.length,
          transactions: validatedDb.transactions.length,
          maintenances: validatedDb.maintenances.length,
          qcInspections: validatedDb.qcInspections.length,
          auditLogs: validatedDb.auditLogs.length,
          breakfastOrders: validatedDb.breakfastOrders.length,
          breakfastMenuItems: validatedDb.breakfastMenuItems.length
        }
      };
    } catch (err: any) {
      return { 
        success: false, 
        message: `Terjadi kegagalan parsing JSON: ${err?.message || 'Format tidak valid'}` 
      };
    }
  }

  public resetDatabaseToDefaults(_ns?: any): CompleteStorageDatabase {
    // Reset basis data lokal dan HANYA menyisakan akun Super Admin serta data master bersih
    // Default kosongkan data aktivitas, shift, QC, dan transaksi
    const initDb = generateInitialDatabase(true);
    initDb.auditLogs = [];
    initDb.workSessions = [];
    initDb.qcInspections = [];
    initDb.transactions = [];
    initDb.maintenances = [];
    initDb.breakfastOrders = [];
    initDb.chatMessages = [];
    this.cache = initDb;
    this.saveDatabase(initDb);
    return initDb;
  }

  // ==========================================
  // MANAJEMEN SARAPAN & KATALOG MENU (CRUD)
  // ==========================================
  public getBreakfastMenuItems(): BreakfastMenuItem[] {
    return this.getDatabase().breakfastMenuItems || [];
  }

  public saveBreakfastMenuItem(item: BreakfastMenuItem): BreakfastMenuItem {
    const db = this.getDatabase();
    const items = db.breakfastMenuItems || [];
    const idx = items.findIndex(m => m.id === item.id);
    let updated: BreakfastMenuItem[];
    if (idx >= 0) {
      updated = [...items];
      updated[idx] = { ...updated[idx], ...item };
    } else {
      updated = [...items, item];
    }
    this.saveDatabase({ ...db, breakfastMenuItems: updated });
    return item;
  }

  public deleteBreakfastMenuItem(itemId: string): boolean {
    const db = this.getDatabase();
    const items = db.breakfastMenuItems || [];
    const filtered = items.filter(m => m.id !== itemId);
    this.saveDatabase({ ...db, breakfastMenuItems: filtered });
    return true;
  }

  public getBreakfastOrders(): BreakfastOrder[] {
    return this.getDatabase().breakfastOrders || [];
  }

  public saveBreakfastOrder(order: BreakfastOrder): BreakfastOrder {
    const db = this.getDatabase();
    const orders = db.breakfastOrders || [];
    const idx = orders.findIndex(o => o.id === order.id);
    let updated: BreakfastOrder[];
    if (idx >= 0) {
      updated = [...orders];
      updated[idx] = { ...updated[idx], ...order, updatedAt: new Date().toISOString() };
    } else {
      updated = [order, ...orders];
    }
    this.saveDatabase({ ...db, breakfastOrders: updated });
    return order;
  }

  public deleteBreakfastOrder(orderId: string): boolean {
    const db = this.getDatabase();
    const orders = db.breakfastOrders || [];
    const filtered = orders.filter(o => o.id !== orderId);
    this.saveDatabase({ ...db, breakfastOrders: filtered });
    return true;
  }

  public updateBreakfastOrderStatus(orderId: string, status: BreakfastOrder['status']): boolean {
    const db = this.getDatabase();
    const orders = db.breakfastOrders || [];
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx >= 0) {
      const updated = [...orders];
      updated[idx] = { ...updated[idx], status, updatedAt: new Date().toISOString() };
      this.saveDatabase({ ...db, breakfastOrders: updated });
      return true;
    } else {
      const txId = orderId.replace('BO-TX-', '');
      const tx = (db.transactions || []).find(t => t.id === txId || t.id.includes(txId) || t.id === orderId);
      if (tx) {
        const newOrder: BreakfastOrder = {
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
          startDate: tx.startDate || new Date().toISOString().split('T')[0],
          deliveryTime: '06:30 WIB',
          status,
          createdAt: `${tx.startDate || new Date().toISOString().split('T')[0]} 06:00:00`,
          updatedAt: new Date().toISOString()
        };
        this.saveDatabase({ ...db, breakfastOrders: [newOrder, ...orders] });
        return true;
      }
    }
    return false;
  }
  public getPasswordResetRequests(): PasswordResetRequest[] {
    const db = this.getDatabase();
    return Array.isArray(db.passwordResetRequests) ? db.passwordResetRequests : [];
  }

  public savePasswordResetRequest(request: PasswordResetRequest): void {
    const db = this.getDatabase();
    const list = this.getPasswordResetRequests();
    const idx = list.findIndex(r => r.id === request.id);
    let updatedList: PasswordResetRequest[];
    if (idx >= 0) {
      updatedList = [...list];
      updatedList[idx] = request;
    } else {
      updatedList = [request, ...list];
    }
    this.saveDatabase({ ...db, passwordResetRequests: updatedList });
  }

  public deletePasswordResetRequest(requestId: string): boolean {
    const db = this.getDatabase();
    const list = this.getPasswordResetRequests();
    const filtered = list.filter(r => r.id !== requestId);
    this.saveDatabase({ ...db, passwordResetRequests: filtered });
    return true;
  }
}

export const dataStorage = new DataStorageService();
