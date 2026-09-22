import React, { useState, useEffect } from 'react';
import { useAppContext, isSuperAdmin, isRecepRole } from '../store';
import { Building, MeetingRoom, Room } from '../types';
import { formatRupiah } from '../lib/utils';
import { useBodyScrollLock } from '../lib/scrollLock';

// =========================================================================
// 1. MODAL KELOLA GEDUNG (INPUT BARU & EDIT)
// =========================================================================
interface BuildingModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildingToEdit: Building | null;
}

export function BuildingModal({ isOpen, onClose, buildingToEdit }: BuildingModalProps) {
  const { addBuilding, updateBuilding, currentUser, showToast } = useAppContext();
  const isEdit = Boolean(buildingToEdit);

  useBodyScrollLock(isOpen);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [floors, setFloors] = useState<number>(3);
  const [totalRooms, setTotalRooms] = useState<number>(50);
  const [capacityDesc, setCapacityDesc] = useState('');
  const [category, setCategory] = useState<'PENGINAPAN' | 'SERBAGUNA' | 'KANTOR'>('PENGINAPAN');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'AKTIF' | 'NONAKTIF'>('AKTIF');

  useEffect(() => {
    if (buildingToEdit) {
      setName(buildingToEdit.name || '');
      setCode(buildingToEdit.code || '');
      setFloors(buildingToEdit.floors || 3);
      setTotalRooms(buildingToEdit.totalRooms || 50);
      setCapacityDesc(buildingToEdit.capacityDesc || '');
      setCategory(buildingToEdit.category || 'PENGINAPAN');
      setDescription(buildingToEdit.description || '');
      setStatus(buildingToEdit.status || 'AKTIF');
    } else {
      setName('');
      setCode('');
      setFloors(3);
      setTotalRooms(50);
      setCapacityDesc('50 Kamar Hunian Ber-AC');
      setCategory('PENGINAPAN');
      setDescription('');
      setStatus('AKTIF');
    }
  }, [buildingToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      showToast('Nama dan kode gedung wajib diisi!', 'warning');
      return;
    }

    if (isEdit && buildingToEdit) {
      updateBuilding({
        ...buildingToEdit,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        floors: Number(floors) || 1,
        totalRooms: Number(totalRooms) || 0,
        capacityDesc: capacityDesc.trim(),
        category,
        description: description.trim(),
        status
      });
    } else {
      addBuilding({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        floors: Number(floors) || 1,
        totalRooms: Number(totalRooms) || 0,
        capacityDesc: capacityDesc.trim() || `${totalRooms} Kamar Hunian`,
        category,
        description: description.trim(),
        status
      });
    }

    onClose();
  };

  const canManage = currentUser && (isSuperAdmin(currentUser.role) || currentUser.role === 'Admin');

  const isSerbagunaBuilding = category === 'SERBAGUNA';
  const isKantorBuilding = category === 'KANTOR';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className={`bg-gradient-to-r ${
          isSerbagunaBuilding 
            ? 'from-slate-900 via-purple-950 to-slate-900' 
            : isKantorBuilding
            ? 'from-slate-900 via-slate-800 to-slate-900'
            : 'from-slate-900 via-emerald-950 to-slate-900'
        } text-white p-4 flex items-center justify-between transition-colors`}>
          <div className="flex items-center space-x-2.5">
            <div className={`w-8 h-8 rounded-lg ${
              isSerbagunaBuilding
                ? 'bg-purple-500/20 text-purple-400 border border-purple-400/30'
                : isKantorBuilding
                ? 'bg-slate-500/20 text-slate-300 border border-slate-400/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/30'
            } flex items-center justify-center`}>
              <i className={`fa-solid ${
                isSerbagunaBuilding ? 'fa-landmark' : isKantorBuilding ? 'fa-briefcase' : 'fa-building'
              }`}></i>
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                <span>{isEdit ? 'Edit Data Gedung' : 'Input Gedung Baru'}</span>
                {isSerbagunaBuilding && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300 font-semibold border border-purple-400/30">
                    Serbaguna / Aula
                  </span>
                )}
              </h3>
              <p className="text-[10px] text-slate-300">Pangkalan Data Fasilitas UPT Asrama Haji Jakarta</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {!canManage ? (
          <div className="p-6 text-center space-y-3">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mx-auto text-xl">
              <i className="fa-solid fa-lock"></i>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              Hanya <strong>Super Admin / Admin</strong> yang memiliki hak akses untuk menginput atau mengubah data katalog gedung.
            </p>
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 bg-slate-200 text-slate-800 font-bold text-xs rounded-xl hover:bg-slate-300 transition"
            >
              Tutup
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-700">Nama Gedung *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Gedung E (Multazam)"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Kode Gedung *</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="Contoh: E"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs uppercase font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Jumlah Lantai</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={floors}
                  onChange={e => setFloors(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Kapasitas / Estimasi Kamar</label>
                <input
                  type="number"
                  min={1}
                  value={totalRooms}
                  onChange={e => setTotalRooms(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Kategori Fasilitas</label>
                <select
                  value={category}
                  onChange={e => {
                    const newCat = e.target.value as any;
                    setCategory(newCat);
                    if (newCat === 'SERBAGUNA' && (!capacityDesc || capacityDesc.includes('Kamar Hunian'))) {
                      setCapacityDesc('Kapasitas 500 - 1000 Orang (Aula Serbaguna)');
                    } else if (newCat === 'PENGINAPAN' && capacityDesc.includes('Aula Serbaguna')) {
                      setCapacityDesc(`${totalRooms} Kamar Hunian Ber-AC`);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option key="PENGINAPAN" value="PENGINAPAN">Penginapan / Asrama</option>
                  <option key="SERBAGUNA" value="SERBAGUNA">Serbaguna / Aula</option>
                  <option key="KANTOR" value="KANTOR">Kantor & Administrasi</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Status Operasional</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option key="AKTIF" value="AKTIF">Aktif (Dapat Ditempati)</option>
                  <option key="NONAKTIF" value="NONAKTIF">Nonaktif (Perbaikan / Ditutup)</option>
                </select>
              </div>
            </div>

            {category === 'SERBAGUNA' && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-start space-x-2.5 text-xs text-purple-900">
                <i className="fa-solid fa-landmark text-purple-600 text-sm mt-0.5 shrink-0"></i>
                <div className="space-y-0.5">
                  <span className="font-bold block text-purple-950">Terhubung Otomatis ke Katalog Ruang Pertemuan &amp; Denah</span>
                  <p className="text-[11px] text-purple-800 leading-relaxed">
                    Karena kategori ini adalah <strong>Serbaguna / Aula</strong>, data gedung beserta ruang pertemuannya akan otomatis disinkronkan ke Katalog Ruang Pertemuan dan Denah Kamar Dan Ruang Pertemuan dengan fasilitas aula terpadu.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Keterangan Kapasitas & Spesifikasi Singkat</label>
              <input
                type="text"
                placeholder={category === 'SERBAGUNA' ? 'Contoh: Kapasitas 500 - 1000 Orang (AC Central, Videotron)' : 'Contoh: 50 Kamar Hunian AC & Kamar Mandi Dalam'}
                value={capacityDesc}
                onChange={e => setCapacityDesc(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Deskripsi / Catatan Tambahan</label>
              <textarea
                rows={2}
                placeholder="Catatan fasilitas khusus, penanggung jawab zona, dsb..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center space-x-1.5"
              >
                <i className="fa-solid fa-floppy-disk"></i>
                <span>{isEdit ? 'Simpan Perubahan Gedung' : 'Tambahkan Gedung Baru'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// 2. MODAL KELOLA RUANG PERTEMUAN / AULA (INPUT BARU & EDIT)
// =========================================================================
interface MeetingRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingRoomToEdit: MeetingRoom | null;
}

export function MeetingRoomModal({ isOpen, onClose, meetingRoomToEdit }: MeetingRoomModalProps) {
  const { addMeetingRoom, updateMeetingRoom, buildings, currentUser, showToast } = useAppContext();
  const isEdit = Boolean(meetingRoomToEdit);

  useBodyScrollLock(isOpen);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [building, setBuilding] = useState('Ruang Pertemuan');
  const [capacity, setCapacity] = useState('500 - 800 Orang');
  const [capacityNumber, setCapacityNumber] = useState(800);
  const [dailyRate, setDailyRate] = useState(15000000);
  const [sessionRate, setSessionRate] = useState(8500000);
  const [facilitiesText, setFacilitiesText] = useState('AC Central, Sound System 5000W, Videotron, Kursi VIP, Toilet');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'TERSEDIA' | 'TERPAKAI' | 'MAINTENANCE'>('TERSEDIA');

  useEffect(() => {
    if (meetingRoomToEdit) {
      setName(meetingRoomToEdit.name || '');
      setCode(meetingRoomToEdit.code || '');
      setBuilding(meetingRoomToEdit.building || 'Ruang Pertemuan');
      setCapacity(meetingRoomToEdit.capacity || '500 - 800 Orang');
      setCapacityNumber(meetingRoomToEdit.capacityNumber || 800);
      setDailyRate(meetingRoomToEdit.dailyRate || 15000000);
      setSessionRate(meetingRoomToEdit.sessionRate || 8500000);
      setFacilitiesText((meetingRoomToEdit.facilities || []).join(', '));
      setDescription(meetingRoomToEdit.description || '');
      setStatus(meetingRoomToEdit.status || 'TERSEDIA');
    } else {
      setName('');
      setCode('');
      setBuilding('Ruang Pertemuan');
      setCapacity('500 - 800 Orang');
      setCapacityNumber(800);
      setDailyRate(15000000);
      setSessionRate(8500000);
      setFacilitiesText('AC Central, Sound System 5000W, Videotron, Kursi VIP, Toilet');
      setDescription('');
      setStatus('TERSEDIA');
    }
  }, [meetingRoomToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Nama ruang pertemuan wajib diisi!', 'warning');
      return;
    }

    const facilitiesArray = facilitiesText
      .split(',')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    if (isEdit && meetingRoomToEdit) {
      updateMeetingRoom({
        ...meetingRoomToEdit,
        name: name.trim(),
        code: code.trim() || undefined,
        building,
        capacity: capacity.trim(),
        capacityNumber: Number(capacityNumber) || 100,
        dailyRate: Number(dailyRate) || 0,
        sessionRate: Number(sessionRate) || 0,
        facilities: facilitiesArray,
        description: description.trim(),
        status
      });
    } else {
      addMeetingRoom({
        name: name.trim(),
        code: code.trim() || undefined,
        building,
        capacity: capacity.trim(),
        capacityNumber: Number(capacityNumber) || 100,
        dailyRate: Number(dailyRate) || 0,
        sessionRate: Number(sessionRate) || 0,
        facilities: facilitiesArray,
        description: description.trim(),
        status
      });
    }

    onClose();
  };

  const canManage = currentUser && (isSuperAdmin(currentUser.role) || currentUser.role === 'Admin' || isRecepRole(currentUser.role));

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-400/30 flex items-center justify-center">
              <i className="fa-solid fa-landmark"></i>
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                {isEdit ? 'Edit Ruang Pertemuan / Aula' : 'Input Ruang Pertemuan Baru'}
              </h3>
              <p className="text-[10px] text-purple-200">Katalog Gedung Aula, Pertemuan &amp; Rapat UPT</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {!canManage ? (
          <div className="p-6 text-center space-y-3">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mx-auto text-xl">
              <i className="fa-solid fa-lock"></i>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              Anda tidak memiliki otorisasi untuk menambah atau mengubah data ruang pertemuan.
            </p>
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 bg-slate-200 text-slate-800 font-bold text-xs rounded-xl hover:bg-slate-300 transition"
            >
              Tutup
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-700">Nama Ruang Pertemuan / Aula *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Gedung SG-1 (SG-1) atau Aula Utama Arafah"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Kode Singkat</label>
                <input
                  type="text"
                  placeholder="Contoh: SG-1"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs uppercase font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Lokasi / Gedung</label>
                <select
                  value={building}
                  onChange={e => setBuilding(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  <option key="Ruang Pertemuan" value="Ruang Pertemuan">Ruang Pertemuan (Kawasan Utama)</option>
                  {buildings.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Status Awal</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  <option key="TERSEDIA" value="TERSEDIA">Tersedia (Siap Disewa)</option>
                  <option key="TERPAKAI" value="TERPAKAI">Sedang Terpakai</option>
                  <option key="MAINTENANCE" value="MAINTENANCE">Maintenance / Perawatan</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Kapasitas (Teks)</label>
                <input
                  type="text"
                  placeholder="Contoh: 1000 - 1500 Orang"
                  value={capacity}
                  onChange={e => setCapacity(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Kapasitas Maksimal (Orang)</label>
                <input
                  type="number"
                  min={10}
                  value={capacityNumber}
                  onChange={e => setCapacityNumber(parseInt(e.target.value) || 100)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Tarif Sewa Harian (Rp)</label>
                <input
                  type="number"
                  step={500000}
                  value={dailyRate}
                  onChange={e => setDailyRate(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
                <span className="text-[10px] text-slate-500">{formatRupiah(dailyRate)} / hari</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Tarif Per Sesi (Rp)</label>
                <input
                  type="number"
                  step={500000}
                  value={sessionRate}
                  onChange={e => setSessionRate(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
                <span className="text-[10px] text-slate-500">{formatRupiah(sessionRate)} / sesi</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Fasilitas Lengkap (Pisahkan dengan koma)</label>
              <textarea
                rows={2}
                placeholder="AC Central, Sound System 5000W, Videotron, Kursi VIP, Toilet, Karpet"
                value={facilitiesText}
                onChange={e => setFacilitiesText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Deskripsi / Peruntukan</label>
              <textarea
                rows={2}
                placeholder="Cocok untuk resepsi, manasik haji akbar, seminar kedinasan, wisuda..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center space-x-1.5"
              >
                <i className="fa-solid fa-floppy-disk"></i>
                <span>{isEdit ? 'Simpan Perubahan Ruang' : 'Tambahkan Ruang Pertemuan'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// 3. MODAL KELOLA KAMAR (INPUT BARU & EDIT KAMAR)
// =========================================================================
interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomToEdit: Room | null;
}

export function RoomModal({ isOpen, onClose, roomToEdit }: RoomModalProps) {
  const { addRoom, updateRoom, buildings, currentUser, showToast } = useAppContext();
  const isEdit = Boolean(roomToEdit);

  useBodyScrollLock(isOpen);

  const [roomNumber, setRoomNumber] = useState('');
  const [building, setBuilding] = useState(buildings[0]?.name || 'Gedung A (Arafah)');
  const [floor, setFloor] = useState(1);
  const [capacity, setCapacity] = useState(4);
  const [type, setType] = useState('Standar');
  const [status, setStatus] = useState<'KOSONG' | 'TERISI' | 'BOOKED' | 'MAINTENANCE'>('KOSONG');
  const [pricePerNight, setPricePerNight] = useState(400000);
  const [facilitiesText, setFacilitiesText] = useState('AC, Kamar Mandi Dalam, 4 Single Bed, Lemari');

  useEffect(() => {
    if (roomToEdit) {
      setRoomNumber(roomToEdit.roomNumber || '');
      setBuilding(roomToEdit.building || buildings[0]?.name || 'Gedung A (Arafah)');
      setFloor(roomToEdit.floor || 1);
      setCapacity(roomToEdit.capacity || 4);
      setType(roomToEdit.type || 'Standar');
      setStatus(roomToEdit.status || 'KOSONG');
      setPricePerNight(roomToEdit.pricePerNight || 400000);
      setFacilitiesText((roomToEdit.facilities || []).join(', '));
    } else {
      setRoomNumber('');
      setBuilding(buildings[0]?.name || 'Gedung A (Arafah)');
      setFloor(1);
      setCapacity(4);
      setType('Standar');
      setStatus('KOSONG');
      setPricePerNight(400000);
      setFacilitiesText('AC, Kamar Mandi Dalam, 4 Single Bed, Lemari');
    }
  }, [roomToEdit, isOpen, buildings]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber.trim()) {
      showToast('Nomor kamar wajib diisi!', 'warning');
      return;
    }

    const facilitiesArray = facilitiesText
      .split(',')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    if (isEdit && roomToEdit) {
      updateRoom({
        ...roomToEdit,
        roomNumber: roomNumber.trim(),
        building,
        floor: Number(floor) || 1,
        capacity: Number(capacity) || 1,
        type,
        status,
        pricePerNight: Number(pricePerNight) || 400000,
        facilities: facilitiesArray
      });
    } else {
      addRoom({
        roomNumber: roomNumber.trim(),
        building,
        floor: Number(floor) || 1,
        capacity: Number(capacity) || 1,
        type,
        status,
        pricePerNight: Number(pricePerNight) || 400000,
        facilities: facilitiesArray
      });
    }

    onClose();
  };

  const canManage = currentUser && (isSuperAdmin(currentUser.role) || currentUser.role === 'Admin' || isRecepRole(currentUser.role));

  const selectedBuilding = buildings.find(b => b.name === building);
  const isSerbagunaRoom = selectedBuilding?.category === 'SERBAGUNA' || building === 'Ruang Pertemuan' || type === 'Ruang Pertemuan / Aula';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className={`bg-gradient-to-r ${
          isSerbagunaRoom 
            ? 'from-slate-900 via-purple-950 to-slate-900' 
            : 'from-slate-900 via-blue-950 to-slate-900'
        } text-white p-4 flex items-center justify-between transition-colors`}>
          <div className="flex items-center space-x-2.5">
            <div className={`w-8 h-8 rounded-lg ${
              isSerbagunaRoom
                ? 'bg-purple-500/20 text-purple-400 border border-purple-400/30'
                : 'bg-blue-500/20 text-blue-400 border border-blue-400/30'
            } flex items-center justify-center`}>
              <i className={`fa-solid ${isSerbagunaRoom ? 'fa-landmark' : 'fa-bed'}`}></i>
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                <span>{isEdit ? (isSerbagunaRoom ? 'Edit Ruang Pertemuan' : 'Edit Data Kamar') : (isSerbagunaRoom ? 'Input Ruang Pertemuan' : 'Input Kamar Baru')}</span>
                {isSerbagunaRoom && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300 font-semibold border border-purple-400/30">
                    Aula / Serbaguna
                  </span>
                )}
              </h3>
              <p className="text-[10px] text-blue-200">
                {isSerbagunaRoom ? 'Pangkalan Data Fasilitas Ruang Pertemuan & Aula' : 'Manajemen Fasilitas Hunian UPT Asrama Haji'}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {!canManage ? (
          <div className="p-6 text-center space-y-3">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mx-auto text-xl">
              <i className="fa-solid fa-lock"></i>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              Anda tidak memiliki otorisasi untuk menambah atau mengubah data kamar.
            </p>
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 bg-slate-200 text-slate-800 font-bold text-xs rounded-xl hover:bg-slate-300 transition"
            >
              Tutup
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto custom-scrollbar">
            {isSerbagunaRoom && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-start space-x-2.5 text-xs text-purple-900">
                <i className="fa-solid fa-landmark text-purple-600 text-sm mt-0.5 shrink-0"></i>
                <div>
                  <span className="font-bold block text-purple-950">Sinkronisasi Katalog Ruang Pertemuan Terpadu</span>
                  <p className="text-[11px] text-purple-800 leading-relaxed">
                    Unit ini terhubung dengan <strong>Katalog Ruang Pertemuan</strong> dan <strong>Denah Kamar Dan Ruang Pertemuan</strong>. Perubahan nama, status, atau fasilitas akan langsung tercermin di kedua modul.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  {isSerbagunaRoom ? 'Nama / No Ruangan *' : 'Nomor Kamar *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isSerbagunaRoom ? 'Contoh: Aula Serbaguna 1' : 'Contoh: A101'}
                  value={roomNumber}
                  onChange={e => setRoomNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Lantai Ke-</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={floor}
                  onChange={e => setFloor(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Gedung / Kompleks</label>
              <select
                value={building}
                onChange={e => {
                  const bName = e.target.value;
                  setBuilding(bName);
                  const bObj = buildings.find(b => b.name === bName);
                  if (bObj?.category === 'SERBAGUNA' || bName === 'Ruang Pertemuan') {
                    setType('Ruang Pertemuan / Aula');
                    if (capacity <= 6) setCapacity(500);
                    if (pricePerNight <= 1000000) setPricePerNight(8500000);
                    if (facilitiesText.includes('4 Single Bed')) {
                      setFacilitiesText('AC Central, Sound System 5000W, Proyektor & Videotron, Kursi VIP & Seminar, Podium Pidato, Ruang Rias & Toilet VIP');
                    }
                  }
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {buildings.map(b => (
                  <option key={b.id} value={b.name}>
                    {b.name} {b.category === 'SERBAGUNA' ? '(Serbaguna / Aula)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  {isSerbagunaRoom ? 'Kapasitas Peserta (Orang)' : 'Kapasitas (Orang)'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={2000}
                  value={capacity}
                  onChange={e => setCapacity(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Tipe Fasilitas</label>
                <select
                  value={type}
                  onChange={e => {
                    const newType = e.target.value;
                    setType(newType);
                    if (newType === 'Ruang Pertemuan / Aula') {
                      if (capacity <= 6) setCapacity(500);
                      if (pricePerNight <= 1000000) setPricePerNight(8500000);
                      if (facilitiesText.includes('4 Single Bed')) {
                        setFacilitiesText('AC Central, Sound System 5000W, Proyektor & Videotron, Kursi VIP & Seminar, Podium Pidato, Ruang Rias & Toilet VIP');
                      }
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option key="Standar" value="Standar">Standar (Haji / Reguler)</option>
                  <option key="VIP" value="VIP">VIP</option>
                  <option key="Family" value="Family">Keluarga</option>
                  <option key="Asrama" value="Asrama">Asrama / Barak</option>
                  <option key="Ruang Pertemuan / Aula" value="Ruang Pertemuan / Aula">Ruang Pertemuan / Aula</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  {isSerbagunaRoom ? 'Tarif Sewa per Sesi/Hari (Rp)' : 'Tarif per Malam (Rp)'}
                </label>
                <input
                  type="number"
                  step={50000}
                  value={pricePerNight}
                  onChange={e => setPricePerNight(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Status Operasional</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option key="KOSONG" value="KOSONG">{isSerbagunaRoom ? 'Tersedia (Dapat Disewa)' : 'Kosong (Tersedia)'}</option>
                  <option key="TERISI" value="TERISI">{isSerbagunaRoom ? 'Terpakai / Berlangsung Acara' : 'Terisi (Check-In)'}</option>
                  <option key="BOOKED" value="BOOKED">Booked (Reservasi Acara)</option>
                  <option key="MAINTENANCE" value="MAINTENANCE">Maintenance</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                {isSerbagunaRoom ? 'Fasilitas Aula / Ruang Rapat (Pisahkan dengan koma)' : 'Fasilitas Kamar (Pisahkan dengan koma)'}
              </label>
              <input
                type="text"
                placeholder={isSerbagunaRoom ? 'AC Central, Sound System 5000W, Videotron, Kursi VIP...' : 'AC, Kamar Mandi Dalam, 4 Single Bed...'}
                value={facilitiesText}
                onChange={e => setFacilitiesText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center space-x-1.5"
              >
                <i className="fa-solid fa-floppy-disk"></i>
                <span>{isEdit ? 'Simpan Perubahan Kamar' : 'Tambahkan Kamar Baru'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// 4. MODAL KONFIRMASI HAPUS
// =========================================================================
interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  itemName: string;
  itemType: string;
  onConfirm: () => void;
}

export function DeleteConfirmModal({ isOpen, onClose, title, itemName, itemType, onConfirm }: DeleteConfirmModalProps) {
  useBodyScrollLock(isOpen);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-rose-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center space-x-3 text-rose-800">
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-lg font-bold shrink-0">
            <i className="fa-solid fa-trash-can text-rose-600"></i>
          </div>
          <div>
            <h4 className="font-bold text-sm text-rose-950">{title}</h4>
            <p className="text-[11px] text-rose-600">Peringatan Penghapusan Data</p>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-600 leading-relaxed">
            Apakah Anda yakin ingin menghapus {itemType} <strong>&quot;{itemName}&quot;</strong> dari basis data lokal?
          </p>
          <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-[11px] text-amber-800">
            <i className="fa-solid fa-triangle-exclamation mr-1.5"></i>
            Tindakan ini akan menghapus data tersebut secara permanen dari penyimpanan lokal.
          </div>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow transition flex items-center space-x-1.5"
          >
            <i className="fa-solid fa-trash"></i>
            <span>Ya, Hapus Data</span>
          </button>
        </div>
      </div>
    </div>
  );
}
