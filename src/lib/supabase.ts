import { createClient } from '@supabase/supabase-js';
import type { CompleteStorageDatabase } from '../services/dataStorage';
import type { 
  Building, 
  Room, 
  MeetingRoom, 
  Transaction, 
  Maintenance, 
  QcInspection, 
  WorkSession, 
  AuditLog, 
  ChatChannel, 
  ChatMessage, 
  BreakfastMenuItem, 
  BreakfastOrder, 
  User 
} from '../types';

/**
 * Pembersihan URL Supabase jika pengguna menyertakan path endpoint '/rest/v1' atau trailing slash.
 * createClient memerlukan base project URL seperti https://xyz.supabase.co
 */
function sanitizeSupabaseUrl(url?: string): string {
  if (!url) return '';
  return url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

// Deteksi environment variable aman untuk Vite & Vercel
const rawEnvUrl = 
  (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && (process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)) ||
  'https://ijvbtubyjxqjethugzlm.supabase.co';

const rawEnvKey = 
  (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && (process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqdmJ0dWJ5anhxamV0aHVnemxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NzEwMDksImV4cCI6MjEwNTU0NzAwOX0.Kq8voFP02KShzjqQ7XPgL2OJi07oV_d0iY01hYYZ4sU';

export const SUPABASE_URL = sanitizeSupabaseUrl(rawEnvUrl);
export const SUPABASE_ANON_KEY = (rawEnvKey || '').trim();

/**
 * Klien resmi Supabase (@supabase/supabase-js)
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

export interface SupabaseSyncState {
  status: 'idle' | 'syncing' | 'connected' | 'error';
  lastSyncTime: string | null;
  errorMessage: string | null;
  isConfigured: boolean;
}

/**
 * Uji konektivitas ke Supabase
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return { success: false, message: 'URL atau Anon Key Supabase belum dikonfigurasi.' };
    }

    // Coba ping tabel app_database_sync atau users
    const { error } = await supabase.from('app_database_sync').select('id').limit(1);
    if (error) {
      // Jika tabel belum dibuat, periksa koneksi rest
      if (error.code === '42P01') {
        return { 
          success: true, 
          message: 'Terkoneksi ke Supabase! Catatan: Tabel database belum dibuat. Silakan jalankan script SQL yang telah disediakan di SQL Editor Supabase.' 
        };
      }
      return { success: false, message: `Koneksi Supabase gagal: ${error.message} (Code: ${error.code})` };
    }

    return { success: true, message: 'Berhasil terhubung ke Supabase Database secara realtime!' };
  } catch (err: any) {
    return { success: false, message: `Gagal menghubungi Supabase: ${err?.message || 'Network error'}` };
  }
}

/**
 * Ambil seluruh database dari Supabase
 */
/**
 * Pemetaan record tabel users Supabase (snake_case) ke objek User aplikasi (camelCase)
 */
export function mapSupabaseUserToAppUser(u: any): User {
  return {
    id: u.id,
    username: u.username,
    fullName: u.full_name || u.fullName || u.username,
    role: u.role,
    password: u.password || '12345',
    department: u.department || 'Operasional',
    supervisorId: u.supervisor_id || u.supervisorId || undefined,
    assignedBuilding: u.assigned_building || u.assignedBuilding || 'Semua Gedung',
    phone: u.phone || '-',
    status: u.status || 'Aktif',
    email: u.email || undefined,
    isOwner: u.is_owner ?? u.isOwner ?? false,
  };
}

/**
 * Mengambil seluruh database dari Supabase Cloud
 */
export async function fetchFullDatabaseFromSupabase(): Promise<CompleteStorageDatabase | null> {
  try {
    // 1. Ambil data users langsung dari tabel Supabase users agar selalu sinkron dengan database
    let directUsers: User[] | null = null;
    try {
      const { data: uData } = await supabase.from('users').select('*');
      if (uData && uData.length > 0) {
        directUsers = uData.map(mapSupabaseUserToAppUser);
      }
    } catch (uErr) {
      console.warn('Gagal membaca tabel users Supabase:', uErr);
    }

    // 2. Coba ambil dari tabel snapshot terpadu app_database_sync
    const { data: syncData, error: syncError } = await supabase
      .from('app_database_sync')
      .select('database_payload, updated_at')
      .eq('id', 'main_production_db')
      .maybeSingle();

    if (!syncError && syncData && syncData.database_payload) {
      const payload = syncData.database_payload as CompleteStorageDatabase;
      // Jika tabel users di Supabase memiliki data, prioritaskan agar identik dengan tabel Supabase
      if (directUsers && directUsers.length > 0) {
        payload.users = directUsers;
      }
      return payload;
    }

    // 3. Jika tidak ada di app_database_sync, coba query dari masing-masing tabel relasional
    const [
      usersRes,
      buildingsRes,
      roomsRes,
      meetingRoomsRes,
      transactionsRes,
      maintenancesRes,
      qcRes,
      sessionsRes,
      auditRes,
      breakfastMenuRes,
      breakfastOrdersRes,
      settingsRes
    ] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('buildings').select('*'),
      supabase.from('rooms').select('*'),
      supabase.from('meeting_rooms').select('*'),
      supabase.from('transactions').select('*'),
      supabase.from('maintenances').select('*'),
      supabase.from('qc_inspections').select('*'),
      supabase.from('work_sessions').select('*'),
      supabase.from('audit_logs').select('*'),
      supabase.from('breakfast_menu_items').select('*'),
      supabase.from('breakfast_orders').select('*'),
      supabase.from('app_settings').select('*').maybeSingle()
    ]);

    // Jika setidaknya tabel users atau rooms ada isinya, kita konstruksi database
    if ((usersRes.data && usersRes.data.length > 0) || (roomsRes.data && roomsRes.data.length > 0)) {
      const mappedUsers = (usersRes.data || []).map(mapSupabaseUserToAppUser);
      const db: CompleteStorageDatabase = {
        schemaVersion: 4,
        appName: 'SIM-Akomodasi UPT Asrama Haji Jakarta',
        exportedAt: new Date().toISOString(),
        appSettings: (settingsRes.data as any) || undefined,
        users: mappedUsers.length > 0 ? mappedUsers : (directUsers || []),
        buildings: (buildingsRes.data as any) || [],
        rooms: (roomsRes.data as any) || [],
        meetingRooms: (meetingRoomsRes.data as any) || [],
        transactions: (transactionsRes.data as any) || [],
        maintenances: (maintenancesRes.data as any) || [],
        qcInspections: (qcRes.data as any) || [],
        workSessions: (sessionsRes.data as any) || [],
        auditLogs: (auditRes.data as any) || [],
        chatChannels: [],
        chatMessages: [],
        breakfastMenuItems: (breakfastMenuRes.data as any) || [],
        breakfastOrders: (breakfastOrdersRes.data as any) || []
      };
      return db;
    }

    return null;
  } catch (e) {
    console.warn('Gagal membaca data dari Supabase:', e);
    return null;
  }
}

/**
 * Simpan seluruh database ke Supabase
 */
export async function syncFullDatabaseToSupabase(db: CompleteStorageDatabase): Promise<{ success: boolean; error?: string }> {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return { success: false, error: 'Kredensial Supabase tidak ditemukan' };
    }

    // 1. Simpan snapshot terpadu ke app_database_sync (cepat, atomic, dan menjamin relasi utuh)
    const { error: syncError } = await supabase
      .from('app_database_sync')
      .upsert({
        id: 'main_production_db',
        database_payload: db,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (syncError && syncError.code !== '42P01') {
      console.warn('Peringatan saat upsert app_database_sync:', syncError.message);
    }

    // 2. Simpan juga ke tabel-tabel individual jika tabel sudah dibuat
    // (Jalankan secara background/non-blocking)
    syncIndividualTables(db).catch(err => {
      console.warn('Sync individual tables info/warning:', err?.message);
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error syncing to Supabase:', err);
    return { success: false, error: err?.message || 'Sync error' };
  }
}

/**
 * Sinkronisasi data ke tabel-tabel individual Supabase (upsert batch)
 */
async function syncIndividualTables(db: CompleteStorageDatabase) {
  // Simpan settings
  if (db.appSettings) {
    await supabase.from('app_settings').upsert({
      id: 'default',
      organization_name: db.appSettings.organizationName,
      sub_title: db.appSettings.subTitle,
      ministry_name: db.appSettings.ministryName,
      address: db.appSettings.address,
      phone: db.appSettings.phone,
      email: db.appSettings.email,
      portal_url: db.appSettings.portalUrl,
      app_logo: db.appSettings.appLogo,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
  }

  // Simpan users
  if (db.users && db.users.length > 0) {
    const userPayloads = db.users.map(u => ({
      id: u.id,
      username: u.username,
      full_name: u.fullName,
      role: u.role,
      password: u.password,
      department: u.department,
      supervisor_id: u.supervisorId || null,
      assigned_building: u.assignedBuilding || null,
      phone: u.phone || null,
      status: u.status || 'Aktif',
      email: u.email || null,
      is_owner: Boolean(u.isOwner)
    }));
    await supabase.from('users').upsert(userPayloads, { onConflict: 'id' });

    // Hapus user di Supabase yang sudah dihapus di aplikasi agar data selalu identik
    try {
      const activeIds = db.users.map(u => u.id);
      const { data: existingRemoteUsers } = await supabase.from('users').select('id');
      if (existingRemoteUsers && existingRemoteUsers.length > 0) {
        const toDeleteIds = existingRemoteUsers.map(r => r.id).filter(id => !activeIds.includes(id));
        if (toDeleteIds.length > 0) {
          await supabase.from('users').delete().in('id', toDeleteIds);
        }
      }
    } catch (cleanErr) {
      console.warn('Gagal membersihkan user terhapus di Supabase:', cleanErr);
    }
  }

  // Simpan buildings
  if (db.buildings && db.buildings.length > 0) {
    const bldPayloads = db.buildings.map(b => ({
      id: b.id,
      name: b.name,
      code: b.code,
      floors: b.floors,
      total_rooms: b.totalRooms,
      capacity_desc: b.capacityDesc,
      category: b.category,
      description: b.description,
      status: b.status
    }));
    await supabase.from('buildings').upsert(bldPayloads, { onConflict: 'id' });
  }

  // Simpan rooms
  if (db.rooms && db.rooms.length > 0) {
    const roomPayloads = db.rooms.map(r => ({
      id: r.id,
      building: r.building,
      room_number: r.roomNumber,
      floor: r.floor,
      type: r.type,
      capacity: r.capacity,
      status: r.status,
      qc_status: r.qcStatus,
      last_qc_date: r.lastQcDate,
      last_qc_by: r.lastQcBy,
      last_qc_notes: r.lastQcNotes,
      active_tx_id: r.activeTxId,
      active_maint_id: r.activeMaintId,
      price_per_night: r.pricePerNight,
      facilities: r.facilities
    }));
    await supabase.from('rooms').upsert(roomPayloads, { onConflict: 'id' });
  }

  // Simpan meeting rooms
  if (db.meetingRooms && db.meetingRooms.length > 0) {
    const mrPayloads = db.meetingRooms.map(m => ({
      id: m.id,
      name: m.name,
      code: m.code,
      building: m.building,
      capacity: m.capacity,
      capacity_number: m.capacityNumber,
      facilities: m.facilities,
      daily_rate: m.dailyRate,
      session_rate: m.sessionRate,
      description: m.description,
      status: m.status,
      qc_status: m.qcStatus,
      active_tx_id: m.activeTxId
    }));
    await supabase.from('meeting_rooms').upsert(mrPayloads, { onConflict: 'id' });
  }

  // Simpan transactions
  if (db.transactions && db.transactions.length > 0) {
    const txPayloads = db.transactions.map(t => ({
      id: t.id,
      room_id: t.roomId,
      building: t.building,
      room_number: t.roomNumber,
      category: t.category,
      guest_name: t.guestName,
      guest_type: t.guestType,
      nik_ktp: t.nikKtp,
      kloter: t.kloter,
      start_date: t.startDate,
      duration: t.duration,
      phone: t.phone,
      notes: t.notes,
      status: t.status,
      created_user: t.createdUser,
      is_group: t.isGroup,
      group_type: t.groupType,
      group_name: t.groupName,
      group_pic: t.groupPic,
      group_pic_phone: t.groupPicPhone,
      group_id: t.groupId,
      total_pax: t.totalPax,
      include_aula: t.includeAula,
      rent_aula_id: t.rentAulaId,
      rent_aula_name: t.rentAulaName,
      catering_package: t.cateringPackage,
      catering_pax_count: t.cateringPaxCount,
      spk_number: t.spkNumber,
      allocated_room_numbers: t.allocatedRoomNumbers,
      allocated_rooms_count: t.allocatedRoomsCount,
      breakfast: t.breakfast,
      breakfast_menu: t.breakfastMenu,
      breakfast_portions: t.breakfastPortions,
      breakfast_days: t.breakfastDays,
      breakfast_status: t.breakfastStatus,
      rent_type: t.rentType,
      duration_unit: t.durationUnit,
      extra_bed: t.extraBed,
      extra_bed_count: t.extraBedCount,
      check_in_time: t.checkInTime,
      check_out_time: t.checkOutTime
    }));
    await supabase.from('transactions').upsert(txPayloads, { onConflict: 'id' });
  }

  // Simpan maintenances
  if (db.maintenances && db.maintenances.length > 0) {
    const maintPayloads = db.maintenances.map(m => ({
      id: m.id,
      room_id: m.roomId,
      building: m.building,
      room_number: m.roomNumber,
      category: m.category,
      urgency: m.urgency,
      technician: m.technician,
      description: m.description,
      report_time: m.reportTime,
      status: m.status,
      reported_user: m.reportedUser,
      assigned_technician_id: m.assignedTechnicianId,
      assigned_technician_name: m.assignedTechnicianName,
      assigned_by_manager: m.assignedByManager,
      assigned_time: m.assignedTime,
      manager_notes: m.managerNotes,
      work_completed_time: m.workCompletedTime,
      technician_notes: m.technicianNotes,
      resolved_time: m.resolvedTime,
      qc_inspection_id: m.qcInspectionId,
      facility_type: m.facilityType
    }));
    await supabase.from('maintenances').upsert(maintPayloads, { onConflict: 'id' });
  }

  // Simpan QC inspections
  if (db.qcInspections && db.qcInspections.length > 0) {
    const qcPayloads = db.qcInspections.map(q => ({
      id: q.id,
      room_id: q.roomId,
      building: q.building,
      room_number: q.roomNumber,
      inspector_id: q.inspectorId,
      inspector_name: q.inspectorName,
      inspection_date: q.inspectionDate,
      cleanliness: q.cleanliness,
      linen_bed: q.linenBed,
      ac_electricity: q.acElectricity,
      plumbing_water: q.plumbingWater,
      amenities: q.amenities,
      result: q.result,
      notes: q.notes,
      facility_type: q.facilityType
    }));
    await supabase.from('qc_inspections').upsert(qcPayloads, { onConflict: 'id' });
  }

  // Simpan Breakfast items
  if (db.breakfastMenuItems && db.breakfastMenuItems.length > 0) {
    const menuPayloads = db.breakfastMenuItems.map(m => ({
      id: m.id,
      name: m.name,
      category: m.category,
      price: m.price,
      description: m.description,
      is_available: m.isAvailable,
      allergens: m.allergens
    }));
    await supabase.from('breakfast_menu_items').upsert(menuPayloads, { onConflict: 'id' });
  }

  // Simpan Breakfast orders
  if (db.breakfastOrders && db.breakfastOrders.length > 0) {
    const orderPayloads = db.breakfastOrders.map(o => ({
      id: o.id,
      room_number: o.roomNumber,
      building: o.building,
      guest_name: o.guestName,
      phone: o.phone,
      kloter: o.kloter,
      transaction_id: o.transactionId,
      menu_name: o.menuName,
      portions: o.portions,
      days: o.days,
      start_date: o.startDate,
      delivery_time: o.deliveryTime,
      status: o.status,
      notes: o.notes,
      price_per_portion: o.pricePerPortion,
      total_price: o.totalPrice
    }));
    await supabase.from('breakfast_orders').upsert(orderPayloads, { onConflict: 'id' });
  }
}
