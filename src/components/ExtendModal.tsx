import React, { useState, useMemo } from 'react';
import { Transaction, Room } from '../types';
import { formatIndonesianDate, addDaysToDateStr } from '../lib/utils';
import { useAppContext } from '../store';
import { useBodyScrollLock } from '../lib/scrollLock';

interface ExtendModalProps {
  isOpen: boolean;
  onClose: () => void;
  tx: Transaction | null;
  room?: Room | null;
  returnToRoomId?: string | null;
  onReturn?: () => void;
}

export function ExtendModal({ isOpen, onClose, tx, room, returnToRoomId, onReturn }: ExtendModalProps) {
  const { extendTransaction, transactions, rooms, openModal } = useAppContext();
  
  useBodyScrollLock(isOpen);
  
  const isAula = tx?.building === 'Ruang Pertemuan';
  const defaultAdd = isAula ? 24 : 1;
  const [addedDuration, setAddedDuration] = useState<number>(defaultAdd);
  const [reason, setReason] = useState<string>('Perpanjangan masa sewa atas permintaan tamu');
  const [extendBreakfast, setExtendBreakfast] = useState<boolean>(tx?.breakfast || false);
  const [extendExtraBed, setExtendExtraBed] = useState<boolean>(tx?.extraBed || false);

  // Sync defaults when tx changes
  React.useEffect(() => {
    if (tx) {
      setAddedDuration(tx.building === 'Ruang Pertemuan' ? 24 : 1);
      setExtendBreakfast(!!tx.breakfast);
      setExtendExtraBed(!!tx.extraBed);
      setReason('Perpanjangan masa sewa atas permintaan tamu');
    }
  }, [tx]);

  const targetRoomId = returnToRoomId || room?.id || tx?.roomId;

  const handleDismiss = () => {
    onClose();
    if (targetRoomId) {
      if (onReturn) {
        onReturn();
      } else {
        openModal('modalRoomDetail', { roomId: targetRoomId });
      }
    }
  };

  // Computed new dates and conflicts
  const currentCheckoutDate = tx ? (!isAula ? addDaysToDateStr(tx.startDate, tx.duration) : tx.startDate) : '';
  const newDuration = (tx?.duration || 0) + (Number(addedDuration) || 0);
  const newCheckoutDate = tx ? (!isAula ? addDaysToDateStr(tx.startDate, newDuration) : tx.startDate) : '';

  // Check for conflicts with existing upcoming bookings
  const conflictTx = useMemo(() => {
    if (!tx || isAula) return null;
    const currentEnd = addDaysToDateStr(tx.startDate, tx.duration);
    const newEnd = addDaysToDateStr(tx.startDate, newDuration);

    return transactions.find(t => 
      t.id !== tx.id &&
      t.roomId === tx.roomId &&
      t.status !== 'DIBATALKAN' &&
      t.status !== 'SELESAI' &&
      t.startDate >= currentEnd &&
      t.startDate < newEnd
    );
  }, [tx, newDuration, transactions, isAula]);

  // Meeting room hour validation
  const isAulaOverLimit = isAula && newDuration > 168;

  if (!isOpen || !tx) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (conflictTx || isAulaOverLimit || addedDuration <= 0) return;

    extendTransaction(tx.id, Number(addedDuration), extendBreakfast, extendExtraBed, reason);
    onClose();
    if (targetRoomId) {
      openModal('modalRoomDetail', { roomId: targetRoomId });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-hajj-800 to-hajj-900 px-6 py-4 text-white flex items-center justify-between shrink-0 border-b border-gold-500/20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gold-400/20 border border-gold-400/30 text-gold-300 flex items-center justify-center font-bold text-base shadow-inner shrink-0">
              <i className="fa-solid fa-clock-rotate-left"></i>
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight flex items-center gap-2">
                <span>Perpanjang Masa Sewa (Extend)</span>
              </h3>
              <p className="text-xs text-gold-200">
                {tx.roomNumber} • {tx.building}
              </p>
            </div>
          </div>
          
          <button 
            type="button" 
            onClick={onClose} 
            className="text-white/70 hover:text-white text-lg p-1.5 rounded-xl hover:bg-white/10 transition cursor-pointer"
            title="Tutup"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs text-slate-700">
          {/* Info Tamu Singkat */}
          <div className="p-3.5 bg-hajj-50 border border-hajj-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-hajj-900 text-xs flex items-center gap-1.5">
                <i className="fa-solid fa-user-check text-hajj-700"></i>
                <span>{tx.guestName}</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-hajj-200 text-hajj-900">
                {tx.category === 'JEMAAH' ? 'Jemaah Haji/Umrah' : 'Tamu Dinas/Umum'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-hajj-200/60">
              <div>
                <span className="text-slate-400 block text-[10px]">Tgl Check-In:</span>
                <span className="font-bold text-slate-800">{formatIndonesianDate(tx.startDate)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">{isAula ? 'Selesai Sebelumnya:' : 'Check-Out Sebelumnya:'}</span>
                <span className="font-bold text-slate-800">{formatIndonesianDate(currentCheckoutDate)}</span>
              </div>
            </div>
          </div>

          {/* Opsi Tambahan Durasi */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Tambah Durasi Sewa ({isAula ? 'Jam Acara' : 'Malam Menginap'})
            </label>
            <div className="grid grid-cols-3 gap-2">
              {isAula ? (
                <>
                  <button
                    type="button"
                    onClick={() => setAddedDuration(8)}
                    className={`py-2 px-3 rounded-lg font-bold border text-xs transition cursor-pointer ${
                      addedDuration === 8 
                        ? 'bg-hajj-700 text-white border-hajj-700 shadow-xs' 
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    +8 Jam
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddedDuration(24)}
                    className={`py-2 px-3 rounded-lg font-bold border text-xs transition cursor-pointer ${
                      addedDuration === 24 
                        ? 'bg-hajj-700 text-white border-hajj-700 shadow-xs' 
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    +24 Jam (1 Hari)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddedDuration(48)}
                    className={`py-2 px-3 rounded-lg font-bold border text-xs transition cursor-pointer ${
                      addedDuration === 48 
                        ? 'bg-hajj-700 text-white border-hajj-700 shadow-xs' 
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    +48 Jam (2 Hari)
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setAddedDuration(1)}
                    className={`py-2 px-3 rounded-lg font-bold border text-xs transition cursor-pointer ${
                      addedDuration === 1 
                        ? 'bg-hajj-700 text-white border-hajj-700 shadow-xs' 
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    +1 Malam
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddedDuration(2)}
                    className={`py-2 px-3 rounded-lg font-bold border text-xs transition cursor-pointer ${
                      addedDuration === 2 
                        ? 'bg-hajj-700 text-white border-hajj-700 shadow-xs' 
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    +2 Malam
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddedDuration(3)}
                    className={`py-2 px-3 rounded-lg font-bold border text-xs transition cursor-pointer ${
                      addedDuration === 3 
                        ? 'bg-hajj-700 text-white border-hajj-700 shadow-xs' 
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    +3 Malam
                  </button>
                </>
              )}
            </div>

            {/* Input Manual jika durasi berbeda */}
            <div className="mt-2 flex items-center space-x-2">
              <span className="text-[11px] text-slate-500 font-medium">Atau masukkan jumlah persis:</span>
              <input 
                type="number" 
                min={1} 
                max={isAula ? 168 : 30}
                value={addedDuration} 
                onChange={e => setAddedDuration(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 p-1.5 border border-slate-300 rounded text-center font-bold text-xs outline-none focus:ring-2 focus:ring-hajj-600"
              />
              <span className="text-[11px] text-slate-600 font-bold">{isAula ? 'Jam' : 'Malam'}</span>
            </div>
          </div>

          {/* Preview Tanggal Baru */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <span className="font-bold text-slate-700 text-[11px] block">Rangkuman Jadwal Baru:</span>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-500">Total Durasi Setelah Extend:</span>
              <span className="text-hajj-800 font-black">{newDuration} {isAula ? 'Jam' : 'Malam'}</span>
            </div>
            {!isAula && (
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500">Tanggal Check-Out Baru:</span>
                <span className="text-emerald-700 font-black">{formatIndonesianDate(newCheckoutDate)}</span>
              </div>
            )}
          </div>

          {/* Warning Conflict */}
          {conflictTx && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-[11px] space-y-1">
              <div className="font-bold flex items-center space-x-1.5">
                <i className="fa-solid fa-triangle-exclamation text-red-600"></i>
                <span>Bentrok Jadwal Kamar!</span>
              </div>
              <p>
                Kamar ini telah dibooking oleh tamu <b>{conflictTx.guestName}</b> mulai tanggal <b>{formatIndonesianDate(conflictTx.startDate)}</b>. Perpanjangan tidak dapat melebihi tanggal tersebut.
              </p>
            </div>
          )}

          {isAulaOverLimit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-[11px] space-y-1">
              <div className="font-bold flex items-center space-x-1.5">
                <i className="fa-solid fa-triangle-exclamation text-red-600"></i>
                <span>Melebihi Batas Sewa Aula!</span>
              </div>
              <p>
                Batas durasi sewa harian ruang pertemuan adalah maksimal 12 jam per hari.
              </p>
            </div>
          )}

          {/* Opsi Layanan Tambahan yang Dilanjutkan */}
          {!isAula && (
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <span className="font-bold text-slate-800 block text-xs">Penyesuaian Layanan Tambahan:</span>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={extendBreakfast}
                    onChange={e => setExtendBreakfast(e.target.checked)}
                    className="rounded text-hajj-700 focus:ring-hajj-600 h-4 w-4"
                  />
                  <span className="text-xs text-slate-700 font-medium">Lanjutkan Pesanan Sarapan</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={extendExtraBed}
                    onChange={e => setExtendExtraBed(e.target.checked)}
                    className="rounded text-hajj-700 focus:ring-hajj-600 h-4 w-4"
                  />
                  <span className="text-xs text-slate-700 font-medium">Lanjutkan Extra Bed</span>
                </label>
              </div>
            </div>
          )}

          {/* Alasan / Catatan */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">Catatan / Alasan Extend</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              placeholder="Contoh: Tamu memperpanjang menginap untuk rombongan dinas..."
              className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-hajj-600 text-xs"
            ></textarea>
          </div>

          {/* Actions: Clean secondary on left, single primary on right */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition flex items-center space-x-1.5 cursor-pointer"
            >
              <i className="fa-solid fa-arrow-left text-slate-500 text-[11px]"></i>
              <span>{targetRoomId ? 'Kembali ke Rincian' : 'Batal'}</span>
            </button>

            <button
              type="submit"
              disabled={!!conflictTx || isAulaOverLimit || addedDuration <= 0}
              className={`px-5 py-2 font-bold rounded-lg shadow-xs text-xs transition flex items-center space-x-1.5 cursor-pointer ${
                conflictTx || isAulaOverLimit || addedDuration <= 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-hajj-700 hover:bg-hajj-800 text-white'
              }`}
            >
              <i className="fa-solid fa-clock-rotate-left"></i>
              <span>Konfirmasi Extend (+{addedDuration} {isAula ? 'Jam' : 'Malam'})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
