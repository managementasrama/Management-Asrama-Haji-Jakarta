export type UserRole = 
  | 'Super Admin' 
  | 'Admin'
  | 'Manager Resepsionis' 
  | 'Resepsionis' 
  | 'Manager QC' 
  | 'Quality Control' 
  | 'Manager Teknisi' 
  | 'Teknisi' 
  | 'Manager Koperasi' 
  | 'Petugas Koperasi'
  | string;

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  password?: string;
  department?: string;
  supervisorId?: string | null;
  assignedBuilding: string;
  phone: string;
  status: string;
  email?: string;
  isOwner?: boolean;
}

export interface Building {
  id: string;
  name: string; // e.g. "Gedung A (Arafah)"
  code: string; // e.g. "A"
  floors?: number;
  totalRooms?: number;
  capacityDesc?: string;
  category?: 'PENGINAPAN' | 'SERBAGUNA' | 'KANTOR';
  description?: string;
  status: 'AKTIF' | 'NONAKTIF';
  createdAt?: string;
}

export interface MeetingRoom {
  id: string;
  name: string; // e.g. "Gedung SG-1 (SG-1)", "Aula Utama Arafah"
  code?: string;
  building: string; // e.g. "Kompleks Ruang Pertemuan & Aula"
  capacity: string; // e.g. "1000 - 1500 Orang"
  capacityNumber?: number;
  facilities: string[];
  dailyRate: number;
  sessionRate?: number;
  description?: string;
  status: 'TERSEDIA' | 'TERPAKAI' | 'MAINTENANCE';
  qcStatus?: 'LOLOS_QC' | 'PERLU_INSPEKSI' | 'PERLU_PERBAIKAN';
  activeTxId?: string | null;
  createdAt?: string;
}

export interface Room {
  id: string;
  building: string;
  roomNumber: string;
  floor?: number;
  type: string;
  capacity: string;
  status: "KOSONG" | "TERISI" | "BOOKED" | "MAINTENANCE";
  qcStatus?: "LOLOS_QC" | "PERLU_INSPEKSI" | "PERLU_PERBAIKAN" | "MENUNGGU_QC";
  lastQcDate?: string;
  lastQcBy?: string;
  lastQcNotes?: string;
  activeTxId: string | null;
  activeMaintId: string | null;
  pricePerNight?: number;
  facilities?: string[];
  createdAt?: string;
}

export interface QcInspection {
  id: string;
  roomId: string;
  building: string;
  roomNumber: string;
  inspectorId: string;
  inspectorName: string;
  inspectionDate: string;
  cleanliness: 'BAIK' | 'CUKUP' | 'BURUK';
  linenBed: 'LENGKAP_BERSIH' | 'PERLU_GANTI';
  acElectricity: 'NORMAL' | 'BERMASALAH';
  plumbingWater: 'LANCAR' | 'BOCOR_MAMPET';
  amenities: 'LENGKAP' | 'KURANG';
  result: 'LOLOS_QC' | 'PERLU_PERBAIKAN';
  notes: string;
  maintenanceIdCreated?: string;
  facilityType?: 'KAMAR' | 'RUANG_PERTEMUAN';
}

export type GroupType = 'JEMAAH_HAJI' | 'UMUM' | 'INSTANSI';

export interface GroupBooking {
  id: string;
  groupName: string;
  groupType: GroupType;
  picName: string;
  picPhone: string;
  agencyOrDocument?: string;
  spkNumber?: string;
  estimatedMembers: number;
  startDate: string;
  duration: number;
  roomIds: string[];
  roomNumbers: string[];
  buildingList: string[];
  includeAula?: boolean;
  meetingRoomIds?: string[];
  rentAulaId?: string;
  rentAulaName?: string;
  rentAulaDuration?: number;
  rentAulaDurationDays?: number;
  rentAulaSession?: string;
  cateringPackage?: 'TIDAK' | 'SARAPAN' | 'FULLBOARD' | 'SNACK_AULA' | string;
  cateringPaxCount?: number;
  breakfast: boolean;
  breakfastMenu?: string;
  breakfastPortions?: number;
  notes?: string;
  status: 'BOOKED' | 'TERISI' | 'SELESAI';
  createdAt: string;
  createdUser: string;
}

export interface ConsolidatedGroupRecord {
  key: string;
  groupId: string;
  groupName: string;
  groupType: GroupType;
  groupPic: string;
  groupPicPhone: string;
  agencyOrDocument?: string;
  spkNumber?: string;
  kloter?: string;
  startDate: string;
  duration: number;
  durationUnit?: string;
  totalPax: number;
  status: 'BOOKED' | 'TERISI' | 'SELESAI' | string;
  createdUser: string;
  notes?: string;
  // Detail kamar dan gedung
  allRoomNumbers: string[];
  allRoomIds: string[];
  buildingsList: string[];
  roomsBreakdown: {
    building: string;
    rooms: {
      roomNumber: string;
      roomId: string;
      type: string;
      capacity: number | string;
      status: string;
      txId?: string;
    }[];
  }[];
  // Ruang Pertemuan (Aula)
  includeAula?: boolean;
  rentAulaId?: string;
  rentAulaName?: string;
  rentAulaDuration?: number;
  rentAulaDurationDays?: number;
  rentAulaSession?: string;
  // Catering & Extra Bed
  cateringPackage?: string;
  cateringPaxCount?: number;
  breakfast?: boolean;
  breakfastMenu?: string;
  breakfastPortions?: number;
  extraBed?: boolean;
  extraBedCount?: number;
  // Referensi transaksi
  representativeTx: Transaction;
  memberTransactions: Transaction[];
}

export interface Transaction {
  id: string;
  roomId: string;
  building: string;
  roomNumber: string;
  category: string;
  guestName: string;
  guestType?: 'INDIVIDU' | 'ROMBONGAN';
  nikKtp?: string;
  kloter: string;
  startDate: string;
  duration: number;
  phone: string;
  notes: string;
  status: string;
  createdUser: string;
  isGroup?: boolean;
  groupType?: GroupType;
  groupName?: string;
  groupPic?: string;
  groupPicPhone?: string;
  groupId?: string;
  totalPax?: number; // Total Pack / Estimasi Peserta
  includeAula?: boolean; // Menyewa Aula / Ruang Pertemuan
  rentAulaId?: string;
  rentAulaName?: string;
  rentAulaDuration?: number;
  rentAulaDurationDays?: number;
  rentAulaSession?: string;
  cateringPackage?: 'TIDAK' | 'SARAPAN' | 'FULLBOARD' | 'SNACK_AULA' | string;
  cateringPaxCount?: number;
  agencyOrDocument?: string;
  spkNumber?: string;
  allocatedRoomNumbers?: string[];
  allocatedRoomsCount?: number;
  breakfast?: boolean;
  breakfastMenu?: string;
  breakfastPortions?: number;
  breakfastDays?: number;
  breakfastStatus?: 'MENUNGGU' | 'SEDANG_DIBUAT' | 'PENGANTARAN' | 'SELESAI';
  rentType?: string;
  durationUnit?: string;
  extraBed?: boolean;
  extraBedCount?: number;
  extraBedNotes?: string;
  checkInTime?: string;
  checkOutTime?: string;
  extendedCount?: number;
  extendHistory?: {
    date: string;
    addedDuration: number;
    unit: string;
    newTotalDuration: number;
    user: string;
    reason?: string;
  }[];
}

export interface Maintenance {
  id: string;
  roomId: string;
  building: string;
  roomNumber: string;
  category: string;
  urgency: string;
  technician: string;
  description: string;
  reportTime: string;
  status: 'MENUNGGU_PENUGASAN' | 'PROSES' | 'MENUNGGU_QC' | 'SELESAI' | string;
  reportedUser: string;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  assignedByManager?: string;
  assignedTime?: string;
  managerNotes?: string;
  workCompletedTime?: string;
  technicianNotes?: string;
  resolvedTime?: string;
  qcInspectionId?: string;
  qcVerdict?: 'LOLOS_QC' | 'PERLU_PERBAIKAN';
  facilityType?: 'KAMAR' | 'RUANG_PERTEMUAN';
}

export interface AuditLog {
  id?: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  details: string;
  durationMinutes?: number;
}

export interface WorkSession {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  loginTime: string;       // "YYYY-MM-DD HH:mm:ss"
  logoutTime: string | null; // "YYYY-MM-DD HH:mm:ss" or null if currently active
  durationSeconds: number; // in seconds
  durationFormatted: string; // e.g. "8 Jam 15 Menit 30 Detik"
  status: 'AKTIF' | 'SELESAI';
  notes?: string;
}

export interface DailyWorkRecord {
  id: string;              // unique key `${userName}_${date}`
  date: string;            // "YYYY-MM-DD"
  userId: string;
  userName: string;
  userRole: string;
  sessionCount: number;
  totalDurationSeconds: number;
  totalDurationFormatted: string;
  firstLoginTime: string;
  lastLogoutTime: string | null;
  status: 'AKTIF' | 'SELESAI';
  sessions: WorkSession[];
}

export type ChatScope = 'MANAGER_TO_MANAGER' | 'MANAGER_TO_SUBORDINATE' | 'DIVISION_GROUP' | 'ALL_MANAGERS_GROUP';

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderDepartment?: string;
  message: string;
  timestamp: string;
  timeFormatted: string;
  priority?: 'NORMAL' | 'PENTING' | 'URGENT';
  isInstruction?: boolean;
  readBy: string[];
}

export interface ChatChannel {
  id: string;
  name: string;
  scope: ChatScope;
  type: 'DIRECT' | 'GROUP';
  department?: string;
  participantIds: string[];
  description?: string;
  icon?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  lastSenderName?: string;
}

export interface BreakfastMenuItem {
  id: string;
  name: string;
  category: 'MAKANAN_BERAT' | 'BUBUR_SAYUR' | 'SNACK_KUDAPAN' | 'MINUMAN' | 'SEHAT_LANSIA';
  price: number;
  description: string;
  isAvailable: boolean;
  allergens?: string;
}

export interface BreakfastOrder {
  id: string;
  roomNumber: string;
  building: string;
  guestName: string;
  phone?: string;
  kloter?: string;
  transactionId?: string;
  menuId?: string;
  menuName: string;
  portions: number;
  days: number;
  startDate: string; // "YYYY-MM-DD"
  deliveryTime: string; // e.g. "06:30 WIB"
  status: 'MENUNGGU' | 'SEDANG_DIBUAT' | 'PENGANTARAN' | 'SELESAI';
  notes?: string;
  dietaryRestriction?: string;
  pricePerPortion?: number;
  totalPrice?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface PasswordResetRequest {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  role: string;
  newPassword: string;
  requestDate: string;
  status: 'MENUNGGU_PERSETUJUAN' | 'DISETUJUI' | 'DITOLAK';
  notes?: string;
  processedBy?: string;
  processedAt?: string;
}
