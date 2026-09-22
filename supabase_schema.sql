-- ==============================================================================
-- SKRIP INISIALISASI DATABASE SUPABASE
-- SISTEM INFORMASI AKOMODASI & OPERASIONAL UPT ASRAMA HAJI JAKARTA
-- 
-- Petunjuk Penggunaan:
-- 1. Buka Dashboard Supabase Anda: https://supabase.com/dashboard/project/ijvbtubyjxqjethugzlm
-- 2. Pilih menu "SQL Editor" di bilah navigasi kiri.
-- 3. Klik "New Query", tempelkan (paste) seluruh isi skrip ini, lalu klik "RUN".
-- ==============================================================================

-- Aktifkan ekstensi UUID jika diperlukan
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. TABEL SNAPSHOT SINKRONISASI DATABASE UTUH (APP_DATABASE_SYNC)
-- Menyimpan state terpadu untuk redundansi dan sinkronisasi real-time instan
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.app_database_sync (
    id TEXT PRIMARY KEY,
    database_payload JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 2. TABEL PENGATURAN INSTANSI (APP_SETTINGS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    organization_name TEXT NOT NULL,
    sub_title TEXT,
    ministry_name TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    portal_url TEXT,
    app_logo TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 3. TABEL PENGGUNA & STAF (USERS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL,
    password TEXT,
    department TEXT,
    supervisor_id TEXT,
    assigned_building TEXT,
    phone TEXT,
    status TEXT DEFAULT 'Aktif',
    email TEXT,
    is_owner BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 4. TABEL MASTER GEDUNG (BUILDINGS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.buildings (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    floors INTEGER DEFAULT 1,
    total_rooms INTEGER DEFAULT 0,
    capacity_desc TEXT,
    category TEXT DEFAULT 'PENGINAPAN',
    description TEXT,
    status TEXT DEFAULT 'AKTIF',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 5. TABEL MASTER RUANG PERTEMUAN / AULA (MEETING_ROOMS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.meeting_rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    building TEXT NOT NULL,
    capacity TEXT,
    capacity_number INTEGER,
    facilities TEXT[],
    daily_rate NUMERIC DEFAULT 0,
    session_rate NUMERIC DEFAULT 0,
    description TEXT,
    status TEXT DEFAULT 'TERSEDIA',
    qc_status TEXT DEFAULT 'LOLOS_QC',
    active_tx_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 6. TABEL MASTER KAMAR HUNIAN (ROOMS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.rooms (
    id TEXT PRIMARY KEY,
    building TEXT NOT NULL,
    room_number TEXT NOT NULL,
    floor INTEGER,
    type TEXT NOT NULL,
    capacity TEXT,
    status TEXT DEFAULT 'KOSONG',
    qc_status TEXT DEFAULT 'LOLOS_QC',
    last_qc_date TEXT,
    last_qc_by TEXT,
    last_qc_notes TEXT,
    active_tx_id TEXT,
    active_maint_id TEXT,
    price_per_night NUMERIC DEFAULT 0,
    facilities TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index pencarian kamar
CREATE INDEX IF NOT EXISTS idx_rooms_building ON public.rooms(building);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_qc_status ON public.rooms(qc_status);

-- ==============================================================================
-- 7. TABEL TRANSAKSI & RESERVASI (TRANSACTIONS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    room_id TEXT,
    building TEXT NOT NULL,
    room_number TEXT NOT NULL,
    category TEXT,
    guest_name TEXT NOT NULL,
    guest_type TEXT DEFAULT 'INDIVIDU',
    nik_ktp TEXT,
    kloter TEXT,
    start_date TEXT NOT NULL,
    duration INTEGER DEFAULT 1,
    phone TEXT,
    notes TEXT,
    status TEXT DEFAULT 'AKTIF',
    created_user TEXT,
    is_group BOOLEAN DEFAULT false,
    group_type TEXT,
    group_name TEXT,
    group_pic TEXT,
    group_pic_phone TEXT,
    group_id TEXT,
    total_pax INTEGER,
    include_aula BOOLEAN DEFAULT false,
    rent_aula_id TEXT,
    rent_aula_name TEXT,
    rent_aula_duration INTEGER,
    rent_aula_duration_days INTEGER,
    rent_aula_session TEXT,
    catering_package TEXT,
    catering_pax_count INTEGER,
    spk_number TEXT,
    allocated_room_numbers TEXT[],
    allocated_rooms_count INTEGER,
    breakfast BOOLEAN DEFAULT false,
    breakfast_menu TEXT,
    breakfast_portions INTEGER,
    breakfast_days INTEGER,
    breakfast_status TEXT,
    rent_type TEXT,
    duration_unit TEXT DEFAULT 'Hari',
    extra_bed BOOLEAN DEFAULT false,
    extra_bed_count INTEGER DEFAULT 0,
    extra_bed_notes TEXT,
    check_in_time TEXT,
    check_out_time TEXT,
    extended_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_group_id ON public.transactions(group_id);

-- ==============================================================================
-- 8. TABEL PEMELIHARAAN & PERBAIKAN TEKNISI (MAINTENANCES)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.maintenances (
    id TEXT PRIMARY KEY,
    room_id TEXT,
    building TEXT NOT NULL,
    room_number TEXT NOT NULL,
    category TEXT NOT NULL,
    urgency TEXT DEFAULT 'SEDANG',
    technician TEXT,
    description TEXT,
    report_time TEXT NOT NULL,
    status TEXT DEFAULT 'MENUNGGU_PENUGASAN',
    reported_user TEXT,
    assigned_technician_id TEXT,
    assigned_technician_name TEXT,
    assigned_by_manager TEXT,
    assigned_time TEXT,
    manager_notes TEXT,
    work_completed_time TEXT,
    technician_notes TEXT,
    resolved_time TEXT,
    qc_inspection_id TEXT,
    qc_verdict TEXT,
    facility_type TEXT DEFAULT 'KAMAR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_maintenances_status ON public.maintenances(status);

-- ==============================================================================
-- 9. TABEL INSPEKSI QUALITY CONTROL (QC_INSPECTIONS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.qc_inspections (
    id TEXT PRIMARY KEY,
    room_id TEXT,
    building TEXT NOT NULL,
    room_number TEXT NOT NULL,
    inspector_id TEXT,
    inspector_name TEXT NOT NULL,
    inspection_date TEXT NOT NULL,
    cleanliness TEXT DEFAULT 'BAIK',
    linen_bed TEXT DEFAULT 'LENGKAP_BERSIH',
    ac_electricity TEXT DEFAULT 'NORMAL',
    plumbing_water TEXT DEFAULT 'LANCAR',
    amenities TEXT DEFAULT 'LENGKAP',
    result TEXT DEFAULT 'LOLOS_QC',
    notes TEXT,
    maintenance_id_created TEXT,
    facility_type TEXT DEFAULT 'KAMAR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 10. TABEL SESI KERJA & SHIFT STAF (WORK_SESSIONS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.work_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    login_time TEXT NOT NULL,
    logout_time TEXT,
    duration_seconds INTEGER DEFAULT 0,
    duration_formatted TEXT,
    status TEXT DEFAULT 'AKTIF',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 11. TABEL LOG AUDIT AKTIVITAS SISTEM (AUDIT_LOGS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY DEFAULT ('log-' || floor(random()*1000000)::text),
    timestamp TEXT NOT NULL,
    user_name TEXT,
    role TEXT,
    action TEXT NOT NULL,
    details TEXT,
    duration_minutes NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 12. TABEL KATALOG MENU SARAPAN & KOPERASI (BREAKFAST_MENU_ITEMS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.breakfast_menu_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC DEFAULT 0,
    description TEXT,
    is_available BOOLEAN DEFAULT true,
    allergens TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 13. TABEL PESANAN SARAPAN & KATERING (BREAKFAST_ORDERS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.breakfast_orders (
    id TEXT PRIMARY KEY,
    room_number TEXT NOT NULL,
    building TEXT NOT NULL,
    guest_name TEXT NOT NULL,
    phone TEXT,
    kloter TEXT,
    transaction_id TEXT,
    menu_id TEXT,
    menu_name TEXT NOT NULL,
    portions INTEGER DEFAULT 1,
    days INTEGER DEFAULT 1,
    start_date TEXT,
    delivery_time TEXT,
    status TEXT DEFAULT 'MENUNGGU',
    notes TEXT,
    dietary_restriction TEXT,
    price_per_portion NUMERIC DEFAULT 0,
    total_price NUMERIC DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT
);

-- ==============================================================================
-- KEBIJAKAN KEAMANAN ROW LEVEL SECURITY (RLS)
-- Memungkinkan aplikasi membaca dan menyimpan data secara aman melalui Anon Key
-- ==============================================================================
ALTER TABLE public.app_database_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qc_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breakfast_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breakfast_orders ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses Penuh untuk Klien Aplikasi (Anon & Authenticated)
CREATE POLICY "Allow public all access on app_database_sync" ON public.app_database_sync FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on buildings" ON public.buildings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on meeting_rooms" ON public.meeting_rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on rooms" ON public.rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on maintenances" ON public.maintenances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on qc_inspections" ON public.qc_inspections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on work_sessions" ON public.work_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on breakfast_menu_items" ON public.breakfast_menu_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on breakfast_orders" ON public.breakfast_orders FOR ALL USING (true) WITH CHECK (true);

-- Insert nilai default awal pengaturan instansi jika belum ada
INSERT INTO public.app_settings (id, organization_name, sub_title, ministry_name, address, phone, email, portal_url)
VALUES (
    'default',
    'UPT ASRAMA HAJI JAKARTA',
    'Sistem Informasi Manajemen Operasional Terpadu & Hunian',
    'KEMENTERIAN HAJI DAN UMRAH REPUBLIK INDONESIA',
    'Jl. Raya Pd. Gede, RT.1/RW.1, Pinang Ranti, Kec. Makasar, Kota Jakarta Timur, Daerah Khusus Ibukota Jakarta 13560, Indonesia.',
    '0816243154',
    'info@asramahajijakarta.id',
    'https://asramahajijakarta.id'
) ON CONFLICT (id) DO NOTHING;

-- Selesai! Skrip SQL siap dijalankan.
