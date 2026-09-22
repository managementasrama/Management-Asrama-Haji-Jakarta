import { User, Room, Transaction, Maintenance, AuditLog, WorkSession, QcInspection, BreakfastMenuItem, BreakfastOrder, Building, MeetingRoom } from './types';
import { getRealTodayDate } from './lib/utils';

export const OFFICIAL_TARIFFS: Record<string, any> = {
    "Gedung A (Arafah)": { category: "KAMAR", capacity: "3-4 Bed", desc: "VIP / Standar Arafah" },
    "Gedung B (Muzdalifah)": { category: "KAMAR", capacity: "4 Bed", desc: "Standar Muzdalifah" },
    "Gedung C (Mina)": { category: "KAMAR", capacity: "4 Bed", desc: "Standar Mina" },
    "Gedung D (Madinah)": { category: "KAMAR", capacity: "2-3 Bed (AC/TV)", desc: "Deluxe Madinah" },
    "Ruang Pertemuan": { category: "AULA", capacity: "100 - 1500 Orang", desc: "Sewa per Hari / Acara" }
};

// Master Users: Akun Resmi Petugas Terpadu SIM-HAJI UPT Asrama Haji Jakarta
export const initialUsers: User[] = [
    { 
        id: 'u-superadmin', 
        username: 'superadmin', 
        fullName: 'Ahmad Faisal (Super Admin)', 
        role: 'Super Admin', 
        password: '12345',
        department: 'Pimpinan & IT UPT',
        supervisorId: null,
        assignedBuilding: 'Semua Gedung', 
        phone: '081211112222', 
        status: 'Aktif' 
    },
    { 
        id: 'u-admin', 
        username: 'admin', 
        fullName: 'Administrator Operasional (Admin)', 
        role: 'Admin', 
        password: '12345',
        department: 'Administrasi & Pelayanan UPT',
        supervisorId: null,
        assignedBuilding: 'Semua Gedung', 
        phone: '081233334444', 
        status: 'Aktif' 
    },
    {
        id: 'u-mgr-resepsionis',
        username: 'mgr_resepsionis',
        fullName: 'Nurul Hidayah, S.Sos (Manager Resepsionis)',
        role: 'Manager Resepsionis',
        password: '12345',
        department: 'Pelayanan & Resepsionis',
        supervisorId: 'u-admin',
        assignedBuilding: 'Semua Gedung',
        phone: '081255556666',
        status: 'Aktif'
    },
    { 
        id: 'u-resepsionis', 
        username: 'resepsionis', 
        fullName: 'Siti Rahmawati (Resepsionis)', 
        role: 'Resepsionis', 
        password: '12345',
        department: 'Pelayanan & Resepsionis',
        supervisorId: 'u-mgr-resepsionis',
        assignedBuilding: 'Semua Gedung', 
        phone: '081277778888', 
        status: 'Aktif' 
    },
    {
        id: 'u-mgr-qc',
        username: 'mgr_qc',
        fullName: 'Ir. Bambang Tri (Manager QC)',
        role: 'Manager QC',
        password: '12345',
        department: 'Pengawasan Mutu & QC',
        supervisorId: 'u-admin',
        assignedBuilding: 'Semua Gedung',
        phone: '081288889999',
        status: 'Aktif'
    },
    { 
        id: 'u-qc', 
        username: 'qc', 
        fullName: 'Hendra Pratama (Quality Control)', 
        role: 'Quality Control', 
        password: '12345',
        department: 'Pengawasan Mutu & QC',
        supervisorId: 'u-mgr-qc',
        assignedBuilding: 'Semua Gedung', 
        phone: '081311112222', 
        status: 'Aktif' 
    },
    {
        id: 'u-mgr-teknisi',
        username: 'mgr_teknisi',
        fullName: 'Agus Setiawan, S.T. (Manager Teknisi)',
        role: 'Manager Teknisi',
        password: '12345',
        department: 'Pemeliharaan Fasilitas & Teknisi',
        supervisorId: 'u-admin',
        assignedBuilding: 'Semua Gedung',
        phone: '081333334444',
        status: 'Aktif'
    },
    { 
        id: 'u-teknisi', 
        username: 'teknisi', 
        fullName: 'Joko Susilo (Teknisi Sarpras)', 
        role: 'Teknisi', 
        password: '12345',
        department: 'Pemeliharaan Fasilitas & Teknisi',
        supervisorId: 'u-mgr-teknisi',
        assignedBuilding: 'Semua Gedung', 
        phone: '081355556666', 
        status: 'Aktif' 
    },
    {
        id: 'u-mgr-koperasi',
        username: 'mgr_koperasi',
        fullName: 'Hj. Fatimah, S.E. (Manager Koperasi)',
        role: 'Manager Koperasi',
        password: '12345',
        department: 'Koperasi, Dapur & Konsumsi',
        supervisorId: 'u-admin',
        assignedBuilding: 'Dapur & Distribusi Sarapan',
        phone: '081377778888',
        status: 'Aktif'
    },
    { 
        id: 'u-koperasi', 
        username: 'koperasi', 
        fullName: 'Dewi Lestari (Petugas Koperasi)', 
        role: 'Petugas Koperasi', 
        password: '12345',
        department: 'Koperasi, Dapur & Konsumsi',
        supervisorId: 'u-mgr-koperasi',
        assignedBuilding: 'Dapur & Distribusi Sarapan', 
        phone: '081399990000', 
        status: 'Aktif' 
    }
];

// Master Gedung (Buildings)
export const initialBuildings: Building[] = [
    {
        id: 'bld-1',
        name: 'Gedung A (Arafah)',
        code: 'A',
        floors: 3,
        capacityDesc: '50 Kamar (3-4 Bed)',
        category: 'PENGINAPAN',
        description: 'Gedung VIP & Reguler Arafah berstandar asrama haji dengan fasilitas lengkap.',
        status: 'AKTIF',
        createdAt: '2026-01-01'
    },
    {
        id: 'bld-2',
        name: 'Gedung B (Muzdalifah)',
        code: 'B',
        floors: 3,
        capacityDesc: '50 Kamar (4 Bed)',
        category: 'PENGINAPAN',
        description: 'Gedung Muzdalifah untuk jemaah dan tamu umum dengan kenyamanan optimal.',
        status: 'AKTIF',
        createdAt: '2026-01-01'
    },
    {
        id: 'bld-3',
        name: 'Gedung C (Mina)',
        code: 'C',
        floors: 3,
        capacityDesc: '50 Kamar (4 Bed)',
        category: 'PENGINAPAN',
        description: 'Gedung Mina kapasitas besar dengan akses strategis ke masjid dan poliklinik.',
        status: 'AKTIF',
        createdAt: '2026-01-01'
    },
    {
        id: 'bld-4',
        name: 'Gedung D (Madinah)',
        code: 'D',
        floors: 3,
        capacityDesc: '50 Kamar (2-3 Bed AC/TV)',
        category: 'PENGINAPAN',
        description: 'Gedung Deluxe Madinah dilengkapi AC dan TV untuk tamu VIP dan rombongan keluarga.',
        status: 'AKTIF',
        createdAt: '2026-01-01'
    },
    {
        id: 'bld-5',
        name: 'Ruang Pertemuan',
        code: 'RP',
        floors: 2,
        capacityDesc: '13 Aula & Ruang Rapat',
        category: 'SERBAGUNA',
        description: 'Kompleks aula serbaguna, convention hall, dan ruang rapat koordinasi resmi UPT.',
        status: 'AKTIF',
        createdAt: '2026-01-01'
    }
];

// Master Ruang Pertemuan (Meeting Rooms / Aula)
export const initialMeetingRooms: MeetingRoom[] = [
    {
        id: 'mr-1',
        name: 'Gedung SG-1 (SG-1)',
        code: 'SG-1',
        building: 'Ruang Pertemuan',
        capacity: '1000 - 1500 Orang',
        capacityNumber: 1500,
        facilities: ['AC Sentral', 'Panggung Utama', 'Sound System 10.000 Watt', 'Videotron LED', 'VIP Room'],
        dailyRate: 15000000,
        sessionRate: 8500000,
        description: 'Aula konvensi termegah berkapasitas ribuan peserta untuk manasik akbar atau resepsi.',
        status: 'TERSEDIA',
        qcStatus: 'LOLOS_QC',
        activeTxId: null
    },
    {
        id: 'mr-2',
        name: 'Gedung SG-2 (SG-2)',
        code: 'SG-2',
        building: 'Ruang Pertemuan',
        capacity: '800 - 1000 Orang',
        capacityNumber: 1000,
        facilities: ['AC Sentral', 'Sound System', 'Proyektor Dual', 'Panggung'],
        dailyRate: 12000000,
        sessionRate: 7000000,
        description: 'Aula serbaguna kedua ideal untuk pelepasan jemaah, seminar nasional, dan wisuda.',
        status: 'TERSEDIA',
        qcStatus: 'LOLOS_QC',
        activeTxId: null
    },
    {
        id: 'mr-3',
        name: 'Gedung Multipurpose',
        code: 'MP',
        building: 'Ruang Pertemuan',
        capacity: '500 - 700 Orang',
        capacityNumber: 700,
        facilities: ['AC Sentral', 'Sound System', 'LCD Proyektor', 'Meja Kursi Seminar'],
        dailyRate: 9000000,
        sessionRate: 5500000,
        description: 'Ruang serbaguna fleksibel untuk pameran, pelatihan manasik, dan rapat kerja.',
        status: 'TERSEDIA',
        qcStatus: 'LOLOS_QC',
        activeTxId: null
    },
    {
        id: 'mr-4',
        name: 'Aula Utama Arafah',
        code: 'AU-A',
        building: 'Ruang Pertemuan',
        capacity: '300 - 500 Orang',
        capacityNumber: 500,
        facilities: ['AC', 'Sound System Standar', 'Proyektor HD', 'Mimbar Resmi'],
        dailyRate: 7500000,
        sessionRate: 4500000,
        description: 'Aula lantai dasar sayap Arafah untuk pertemuan pembekalan kloter jemaah.',
        status: 'TERSEDIA',
        qcStatus: 'LOLOS_QC',
        activeTxId: null
    },
    {
        id: 'mr-5',
        name: 'Aula Muzdalifah',
        code: 'AU-M',
        building: 'Ruang Pertemuan',
        capacity: '300 - 400 Orang',
        capacityNumber: 400,
        facilities: ['AC', 'Sound System', 'Wireless Mic', 'Screen'],
        dailyRate: 6500000,
        sessionRate: 4000000,
        description: 'Aula sayap Muzdalifah untuk konsolidasi regu dan bimbingan ibadah.',
        status: 'TERSEDIA',
        qcStatus: 'LOLOS_QC',
        activeTxId: null
    },
    {
        id: 'mr-6',
        name: 'Aula Mina',
        code: 'AU-MINA',
        building: 'Ruang Pertemuan',
        capacity: '250 - 350 Orang',
        capacityNumber: 350,
        facilities: ['AC', 'Sound System', 'Kursi Chitose 300 unit'],
        dailyRate: 6000000,
        sessionRate: 3500000,
        description: 'Aula sayap Mina untuk kegiatan evaluasi berkala dan rapat koordinasi karom.',
        status: 'TERSEDIA',
        qcStatus: 'LOLOS_QC',
        activeTxId: null
    },
    {
        id: 'mr-7',
        name: 'Auditorium Madinah',
        code: 'AUD-M',
        building: 'Ruang Pertemuan',
        capacity: '200 - 300 Orang',
        capacityNumber: 300,
        facilities: ['AC', 'Sound System Theater', 'Lighting Panggung', 'Videotron'],
        dailyRate: 7000000,
        sessionRate: 4200000,
        description: 'Auditorium bertingkat dengan kenyamanan kursi teater untuk pemutaran film & seminar.',
        status: 'TERSEDIA',
        qcStatus: 'LOLOS_QC',
        activeTxId: null
    },
    {
        id: 'mr-8',
        name: 'Ruang Rapat Bir Ali 1',
        code: 'RR-BA1',
        building: 'Ruang Pertemuan',
        capacity: '30 - 50 Orang',
        capacityNumber: 50,
        facilities: ['AC', 'Smart TV 75 inch', 'Meja Rapat Oval', 'WiFi Super Cepat', 'Mic Conference'],
        dailyRate: 3000000,
        sessionRate: 1800000,
        description: 'Ruang rapat VIP pimpinan dan koordinasi teknis dinas Kementerian.',
        status: 'TERSEDIA',
        qcStatus: 'LOLOS_QC',
        activeTxId: null
    },
    {
        id: 'mr-9',
        name: 'Ruang Rapat Bir Ali 2',
        code: 'RR-BA2',
        building: 'Ruang Pertemuan',
        capacity: '20 - 35 Orang',
        capacityNumber: 35,
        facilities: ['AC', 'Smart TV', 'Whiteboard Glass', 'WiFi'],
        dailyRate: 2500000,
        sessionRate: 1500000,
        description: 'Ruang rapat eksekutif untuk rapat koordinasi lintas divisi.',
        status: 'TERSEDIA',
        qcStatus: 'LOLOS_QC',
        activeTxId: null
    },
    {
        id: 'mr-10',
        name: 'Ruang Rapat Bir Ali 3',
        code: 'RR-BA3',
        building: 'Ruang Pertemuan',
        capacity: '15 - 25 Orang',
        capacityNumber: 25,
        facilities: ['AC', 'TV Display', 'WiFi', 'Meja Rapat'],
        dailyRate: 2000000,
        sessionRate: 1200000,
        description: 'Ruang rapat tim teknis, konsumsi, dan logistik lapangan.',
        status: 'TERSEDIA',
        qcStatus: 'LOLOS_QC',
        activeTxId: null
    },
    {
        id: 'mr-11',
        name: 'Ruang VIP Quba',
        code: 'VIP-Q',
        building: 'Ruang Pertemuan',
        capacity: '20 - 30 Orang',
        capacityNumber: 30,
        facilities: ['Sofa Mewah', 'AC', 'Toilet Privat VIP', 'Mini Bar'],
        dailyRate: 4000000,
        sessionRate: 2500000,
        description: 'Transit VIP untuk menteri, duta besar, dan tamu kehormatan.',
        status: 'TERSEDIA',
        qcStatus: 'LOLOS_QC',
        activeTxId: null
    },
    {
        id: 'mr-12',
        name: 'Ruang VIP Uhud',
        code: 'VIP-U',
        building: 'Ruang Pertemuan',
        capacity: '15 - 20 Orang',
        capacityNumber: 20,
        facilities: ['Sofa VIP', 'AC', 'Private Pantry', 'Smart TV'],
        dailyRate: 3500000,
        sessionRate: 2200000,
        description: 'Ruang tunggu transit delegasi dan narasumber VVIP.',
        status: 'TERSEDIA',
        qcStatus: 'LOLOS_QC',
        activeTxId: null
    },
    {
        id: 'mr-13',
        name: 'Ruang Pertemuan Nabawi',
        code: 'RP-N',
        building: 'Ruang Pertemuan',
        capacity: '100 - 150 Orang',
        capacityNumber: 150,
        facilities: ['AC', 'Sound System', 'Screen LCD', 'Podium'],
        dailyRate: 5000000,
        sessionRate: 3000000,
        description: 'Ruang pertemuan sedang bernuansa islami untuk pengajian dan rapat kerja.',
        status: 'TERSEDIA',
        qcStatus: 'LOLOS_QC',
        activeTxId: null
    }
];

// Generator master kamar bersih (Semua KOSONG, Siap Digunakan)
export function getCleanRooms(): Room[] {
    const rooms: Room[] = [];
    const buildings = [
        { name: "Gedung A (Arafah)", code: "A" },
        { name: "Gedung B (Muzdalifah)", code: "B" },
        { name: "Gedung C (Mina)", code: "C" },
        { name: "Gedung D (Madinah)", code: "D" }
    ];

    buildings.forEach(b => {
        for (let i = 1; i <= 50; i++) {
            const floorNum = Math.ceil(i / 17);
            rooms.push({
                id: `room-${b.code}-${i}`,
                building: b.name,
                roomNumber: `${b.code}-${100 + i}`,
                floor: floorNum,
                type: "Kamar Penginapan",
                capacity: OFFICIAL_TARIFFS[b.name]?.capacity || "4 Bed",
                status: "KOSONG",
                qcStatus: "LOLOS_QC",
                lastQcDate: undefined,
                lastQcBy: undefined,
                lastQcNotes: undefined,
                activeTxId: null,
                activeMaintId: null
            });
        }
    });

    // Menambahkan kamar tipe Ruang Pertemuan / Aula dari master initialMeetingRooms
    initialMeetingRooms.forEach(mr => {
        rooms.push({
            id: mr.id,
            building: "Ruang Pertemuan",
            roomNumber: mr.name,
            type: "Ruang Pertemuan / Aula",
            capacity: mr.capacity,
            status: mr.status === 'MAINTENANCE' ? 'MAINTENANCE' : 'KOSONG',
            qcStatus: mr.qcStatus || "LOLOS_QC",
            lastQcDate: undefined,
            lastQcBy: undefined,
            lastQcNotes: undefined,
            activeTxId: null,
            activeMaintId: null
        });
    });

    return rooms;
}

// Initial rooms sama dengan clean rooms (tanpa transaksi dummy)
export function getInitialRooms(): Room[] {
    return getCleanRooms();
}

// Data Dummy Dikosongkan: Bersih untuk operasional riil
export const initialTransactions: Transaction[] = [];
export const initialMaintenances: Maintenance[] = [];
export const initialQcInspections: QcInspection[] = [];
export const initialWorkSessions: WorkSession[] = [];

// Master Menu Sarapan Resmi Koperasi UPT (Dapat di-CRUD)
export const initialBreakfastMenuItems: BreakfastMenuItem[] = [
    {
        id: 'bmi-1',
        name: 'Nasi Goreng Spesial Telur Ceplok & Kerupuk',
        category: 'MAKANAN_BERAT',
        price: 25000,
        description: 'Nasi goreng bumbu rempah nusantara dengan suwiran ayam, telur mata sapi renyah, acar segar, dan kerupuk udang.',
        isAvailable: true,
        allergens: 'Telur, Udang'
    },
    {
        id: 'bmi-2',
        name: 'Paket Sarapan Sehat: Bubur Kacang Hijau & Telur Rebus',
        category: 'SEHAT_LANSIA',
        price: 20000,
        description: 'Bubur kacang hijau murni gula aren organik dengan kuah santan daun pandan wangi, disajikan bersama telur ayam rebus.',
        isAvailable: true,
        allergens: 'Telur'
    },
    {
        id: 'bmi-3',
        name: 'Nasi Uduk Komplit Betawi Asli',
        category: 'MAKANAN_BERAT',
        price: 25000,
        description: 'Nasi uduk wangi daun salam serai, bihun goreng kampung, orek tempe manis gurih, telur balado, sambal terasi.',
        isAvailable: true,
        allergens: 'Telur, Kedelai'
    },
    {
        id: 'bmi-4',
        name: 'Bubur Ayam Gurih Spesial Sukabumi',
        category: 'BUBUR_SAYUR',
        price: 20000,
        description: 'Bubur beras pulen kuah kuning kari harum, suwiran ayam kampung, cakwe renyah, kacang kedelai goreng, seledri, kerupuk.',
        isAvailable: true,
        allergens: 'Kedelai, Gluten'
    },
    {
        id: 'bmi-5',
        name: 'Nasi Kuning Komplit Ayam Suwir',
        category: 'MAKANAN_BERAT',
        price: 28000,
        description: 'Nasi kuning rempah kunyit santan murni, ayam suwir rica gurih, telur dadar iris, perkedel kentang lembut, kerupuk.',
        isAvailable: true,
        allergens: 'Telur'
    },
    {
        id: 'bmi-6',
        name: 'Snack Box & Kopi / Teh Hangat',
        category: 'SNACK_KUDAPAN',
        price: 15000,
        description: 'Paket 2 jenis kue basah tradisional (Lemper ayam, Pastel sayur telur) dilengkapi air mineral dan teh manis/kopi hangat.',
        isAvailable: true,
        allergens: 'Gluten, Telur'
    },
    {
        id: 'bmi-7',
        name: 'Roti Bakar Bandung Cokelat Keju',
        category: 'SNACK_KUDAPAN',
        price: 15000,
        description: 'Roti tawar tebal dipanggang margarin wangi dengan isian meses cokelat premium dan taburan keju cheddar parut.',
        isAvailable: true,
        allergens: 'Susu, Gluten'
    },
    {
        id: 'bmi-8',
        name: 'Susu Jahe Merah & Teh Tarik Hangat',
        category: 'MINUMAN',
        price: 10000,
        description: 'Minuman penghangat tubuh seduhan jahe merah segar geprek dengan susu kental manis atau pilihan teh tarik berbusa.',
        isAvailable: true,
        allergens: 'Susu'
    }
];

// Inisialisasi pesanan sarapan bersih (tidak ada pesanan dummy)
export function getInitialBreakfastOrders(_txList: Transaction[] = initialTransactions): BreakfastOrder[] {
    return [];
}

// Log inisialisasi sistem default (Dikosongkan sesuai permintaan pengguna)
export const initialAuditLogs: AuditLog[] = [];

