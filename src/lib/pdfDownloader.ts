import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Transaction, Room } from '../types';
import { formatIndonesianDate, getRealTodayDate, addDaysToDateStr } from './utils';
import { dataStorage } from '../services/dataStorage';

/**
 * Generates an official, beautifully formatted Ministry Invoice PDF directly via jsPDF.
 * 100% reliable, zero external network calls, zero CORS canvas issues, and downloads instantly.
 */
export function downloadDirectInvoicePdf(
  tx: Transaction,
  room?: Room | null,
  officerName = 'Petugas Front Office',
  officerRole = 'Resepsionis',
  allRooms: Room[] = [],
  memberTransactions: Transaction[] = []
): void {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const isAula = tx.building === 'Ruang Pertemuan';
    const realToday = getRealTodayDate();
    const checkoutDate = !isAula ? addDaysToDateStr(tx.startDate, tx.duration) : tx.startDate;

    // Palette
    const primaryColor: [number, number, number] = [111, 75, 43]; // Chocolate Brown #6f4b2b
    const goldColor: [number, number, number] = [184, 134, 11]; // Warm Gold #b8860b
    const darkSlate: [number, number, number] = [30, 41, 59];
    const lightSlate: [number, number, number] = [100, 116, 139];
    const bgCard: [number, number, number] = [248, 250, 252];
    const borderCard: [number, number, number] = [226, 232, 240];

    // Determine room list across tx and memberTransactions
    const roomNumberSet = new Set<string>();
    if (tx.roomNumber && tx.building !== 'Ruang Pertemuan') {
      roomNumberSet.add(tx.roomNumber);
    }
    if (tx.allocatedRoomNumbers && Array.isArray(tx.allocatedRoomNumbers)) {
      tx.allocatedRoomNumbers.forEach(rn => rn && roomNumberSet.add(rn));
    }
    memberTransactions.forEach(m => {
      if (m.building !== 'Ruang Pertemuan' && m.roomNumber) {
        roomNumberSet.add(m.roomNumber);
      }
      if (m.allocatedRoomNumbers && Array.isArray(m.allocatedRoomNumbers)) {
        m.allocatedRoomNumbers.forEach(rn => rn && roomNumberSet.add(rn));
      }
    });

    const roomNumbers: string[] = Array.from(roomNumberSet);

    const rentedRooms = roomNumbers.map(rn => {
      const rObj = allRooms.find(r => r.roomNumber === rn);
      const memTx = memberTransactions.find(m => m.roomNumber === rn);
      const parsedCapacity = rObj ? (parseInt(String(rObj.capacity).replace(/\D/g, ''), 10) || 4) : 4;
      return {
        number: rn,
        building: rObj?.building || memTx?.building || tx.building,
        type: rObj?.type || 'Kamar Quad (4 Bed)',
        capacity: parsedCapacity,
        status: memTx?.status || rObj?.status || tx.status
      };
    });

    const isGroupBooking = Boolean(tx.isGroup || (tx.allocatedRoomNumbers && tx.allocatedRoomNumbers.length > 1) || (tx.totalPax && tx.totalPax > 1));
    const totalCapacity = rentedRooms.reduce((acc, r) => acc + r.capacity, 0);
    const uniqueBuildings = Array.from(new Set(rentedRooms.map(r => r.building)));

    // 1. Top Decorative Bar
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 5, 'F');
    doc.setFillColor(...goldColor);
    doc.rect(0, 5, 210, 1.5, 'F');

    const appSettings = dataStorage.getAppSettings();
    // 2. Official Header (Kop Surat)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...primaryColor);
    doc.text(appSettings.organizationName, 105, 16, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setTextColor(...goldColor);
    doc.text(appSettings.ministryName, 105, 20.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...lightSlate);
    doc.text(appSettings.address, 105, 24.5, { align: 'center' });
    doc.text(`Telp: ${appSettings.phone} • Email: ${appSettings.email} • Portal: ${appSettings.portalUrl}`, 105, 28, { align: 'center' });

    // Double rule line under header
    doc.setDrawColor(...darkSlate);
    doc.setLineWidth(0.6);
    doc.line(14, 31, 196, 31);
    doc.setLineWidth(0.2);
    doc.line(14, 32.2, 196, 32.2);

    // 3. Document Title & Document Meta
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...darkSlate);
    doc.text(
      isGroupBooking 
        ? 'BUKTI RESERVASI & CHECK-IN ROMBONGAN TERPADU' 
        : isAula 
        ? 'BUKTI RESERVASI SEWA RUANG PERTEMUAN (AULA)' 
        : 'LEMBAR BUKTI RESERVASI & OPERASIONAL HUNIAN KAMAR', 
      14, 
      38
    );

    doc.setFontSize(7.5);
    doc.setTextColor(...lightSlate);
    doc.setFont('helvetica', 'normal');
    doc.text('Lampiran Dokumen Resmi Tata Kelola Akomodasi Non-Finansial', 14, 42);

    // Right meta (No. Dokumen & Tanggal)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...primaryColor);
    doc.text(`NO: INV-OPR/${tx.id}/${tx.startDate.replace(/-/g, '')}`, 196, 38, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...lightSlate);
    doc.text(`Diterbitkan: ${formatIndonesianDate(realToday)}`, 196, 42, { align: 'right' });

    // Status Banner Box
    const statusBg: [number, number, number] = tx.status === 'TERISI' 
      ? [209, 250, 229] 
      : tx.status === 'BOOKED' 
      ? [219, 234, 254] 
      : [241, 245, 249];
    const statusTextCol: [number, number, number] = tx.status === 'TERISI' 
      ? [6, 95, 70] 
      : tx.status === 'BOOKED' 
      ? [30, 64, 175] 
      : [51, 65, 85];
    const statusLabel = tx.status === 'TERISI' 
      ? 'STATUS: CHECK-IN (AKTIF MENGINAP)' 
      : tx.status === 'BOOKED' 
      ? 'STATUS: RESERVASI BOOKING (TERJADWAL)' 
      : tx.status === 'SELESAI' 
      ? 'STATUS: SELESAI (CHECK-OUT)' 
      : 'STATUS: DIBATALKAN';

    doc.setFillColor(...statusBg);
    doc.roundedRect(14, 45, 182, 6.5, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...statusTextCol);
    doc.text(statusLabel, 105, 49.5, { align: 'center' });

    // 4. Two Structured Content Cards: Data Tamu & Ringkasan Sewa
    const cardY = 54;
    const cardH = 45;
    const cardW = 88;

    // Card 1: Data Tamu / Rombongan
    doc.setFillColor(...bgCard);
    doc.setDrawColor(...borderCard);
    doc.roundedRect(14, cardY, cardW, cardH, 2, 2, 'FD');

    doc.setFillColor(...primaryColor);
    doc.roundedRect(14, cardY, cardW, 6, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('1. DATA TAMU & PENYEWA', 18, cardY + 4.3);

    const guestRows = [
      ['Nama Tamu / Entitas', tx.groupName || tx.guestName || '-'],
      ['Tipe Registrasi', isGroupBooking ? `Rombongan (${tx.totalPax || totalCapacity || 1} Pax)` : 'Individu (1 Penyewa Kamar)'],
      ['Kloter / Instansi', tx.kloter || '-'],
      ['PIC / Koordinator', tx.groupPic || tx.guestName || '-'],
      ['Kontak Telepon', tx.groupPicPhone || tx.phone || '-'],
      ['ID Transaksi', tx.id]
    ];

    let rowY = cardY + 10.5;
    guestRows.forEach(([lbl, val]) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...lightSlate);
      doc.text(lbl, 18, rowY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkSlate);
      doc.text(`: ${val}`, 48, rowY);
      rowY += 6.5;
    });

    // Card 2: Ringkasan Sewa Fasilitas
    doc.setFillColor(...bgCard);
    doc.setDrawColor(...borderCard);
    doc.roundedRect(108, cardY, cardW, cardH, 2, 2, 'FD');

    doc.setFillColor(...primaryColor);
    doc.roundedRect(108, cardY, cardW, 6, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(isAula ? '2. RINGKASAN RUANG PERTEMUAN' : '2. RINGKASAN SEWA HUNIAN', 112, cardY + 4.3);

    const facilityRows = [
      ['Gedung Utama', uniqueBuildings.length > 0 ? uniqueBuildings.join(', ') : tx.building],
      [isAula ? 'Ruang Pertemuan' : 'Alokasi Kamar', isAula ? tx.roomNumber : `${rentedRooms.length} Kamar Disewa`],
      ['Total Kapasitas', isAula ? `${room?.capacity || 250} Pax` : `${totalCapacity} Orang (${rentedRooms.length} Kamar)`],
      [isAula ? 'Pelaksanaan Acara' : 'Periode Check-In', formatIndonesianDate(tx.startDate)],
      [isAula ? 'Estimasi Selesai' : 'Perkiraan Check-Out', formatIndonesianDate(checkoutDate)],
      ['Total Durasi Sewa', `${tx.duration} ${tx.durationUnit || (isAula ? 'Jam' : 'Malam')}`]
    ];

    let facY = cardY + 10.5;
    facilityRows.forEach(([lbl, val]) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...lightSlate);
      doc.text(lbl, 112, facY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkSlate);
      doc.text(`: ${val}`, 148, facY);
      facY += 6.5;
    });

    // 5. Tabel Rincian Alokasi Gedung Sampai Kamar Yang Disewa
    const tableY = 103;
    doc.setFillColor(...bgCard);
    doc.setDrawColor(...borderCard);
    
    // Header Bar for Table
    doc.setFillColor(30, 41, 59); // Dark slate
    doc.roundedRect(14, tableY, 182, 6.5, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(
      isAula 
        ? '3. DETAIL RUANG PERTEMUAN & FASILITAS TERJADWAL'
        : `3. RINCIAN ALOKASI GEDUNG SAMPAI KAMAR YANG DISEWA (${rentedRooms.length} KAMAR)`,
      18, 
      tableY + 4.5
    );

    // Column headers
    const colHeaderY = tableY + 6.5;
    doc.setFillColor(241, 245, 249);
    doc.rect(14, colHeaderY, 182, 5.5, 'F');
    doc.setDrawColor(...borderCard);
    doc.setLineWidth(0.2);
    doc.rect(14, colHeaderY, 182, 5.5, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...darkSlate);
    doc.text('No', 17, colHeaderY + 3.8);
    doc.text('Wilayah Gedung', 26, colHeaderY + 3.8);
    doc.text('No. Kamar / Aula', 70, colHeaderY + 3.8);
    doc.text('Tipe / Fasilitas Ruangan', 98, colHeaderY + 3.8);
    doc.text('Kapasitas', 148, colHeaderY + 3.8);
    doc.text('Status Alokasi', 172, colHeaderY + 3.8);

    let currRowY = colHeaderY + 5.5;

    // Helper to print table headers on subsequent pages
    const printTableHeader = (y: number, pageNum: number) => {
      // Top header band
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 4, 'F');
      doc.setFillColor(...goldColor);
      doc.rect(0, 4, 210, 1.2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...primaryColor);
      doc.text(`RINCIAN ALOKASI KAMAR (Lanjutan) - ${tx.groupName || tx.guestName || 'Rombongan'}`, 14, 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...lightSlate);
      doc.text(`No. Dokumen: INV-OPR/${tx.id}/${tx.startDate.replace(/-/g, '')}`, 196, 12, { align: 'right' });

      // Column header
      const newHeaderY = 16;
      doc.setFillColor(241, 245, 249);
      doc.rect(14, newHeaderY, 182, 5.5, 'F');
      doc.setDrawColor(...borderCard);
      doc.setLineWidth(0.2);
      doc.rect(14, newHeaderY, 182, 5.5, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...darkSlate);
      doc.text('No', 17, newHeaderY + 3.8);
      doc.text('Wilayah Gedung', 26, newHeaderY + 3.8);
      doc.text('No. Kamar / Aula', 70, newHeaderY + 3.8);
      doc.text('Tipe / Fasilitas Ruangan', 98, newHeaderY + 3.8);
      doc.text('Kapasitas', 148, newHeaderY + 3.8);
      doc.text('Status Alokasi', 172, newHeaderY + 3.8);

      return newHeaderY + 5.5;
    };

    // Print ALL rented rooms without truncation or omission
    for (let i = 0; i < rentedRooms.length; i++) {
      // Check if row exceeds page boundary
      if (currRowY > 262) {
        doc.addPage();
        currRowY = printTableHeader(16, doc.getNumberOfPages());
      }

      const rm = rentedRooms[i];
      const isEven = i % 2 === 0;
      if (isEven) {
        doc.setFillColor(255, 255, 255);
      } else {
        doc.setFillColor(248, 250, 252);
      }
      doc.rect(14, currRowY, 182, 5, 'F');
      doc.setDrawColor(...borderCard);
      doc.line(14, currRowY + 5, 196, currRowY + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...darkSlate);
      doc.text(String(i + 1), 17, currRowY + 3.5);
      doc.text(rm.building, 26, currRowY + 3.5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text(rm.number, 70, currRowY + 3.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...darkSlate);
      doc.text(rm.type, 98, currRowY + 3.5);
      doc.text(`${rm.capacity} Orang`, 148, currRowY + 3.5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(rm.status === 'TERISI' ? 6 : 30, rm.status === 'TERISI' ? 95 : 64, rm.status === 'TERISI' ? 70 : 175);
      doc.text(rm.status === 'TERISI' ? 'CHECK-IN' : rm.status === 'BOOKED' ? 'RESERVASI' : rm.status, 172, currRowY + 3.5);

      currRowY += 5;
    }

    // If meeting room is also included
    if (tx.includeAula && tx.rentAulaName) {
      doc.setFillColor(243, 232, 255); // light purple
      doc.rect(14, currRowY, 182, 5.5, 'F');
      doc.setDrawColor(216, 180, 254);
      doc.line(14, currRowY + 5.5, 196, currRowY + 5.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(107, 33, 168); // purple 800
      doc.text('★ SEWA AULA TERPADU:', 17, currRowY + 3.8);
      doc.text(`Ruang Pertemuan / ${tx.rentAulaName}`, 58, currRowY + 3.8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Sesi: ${tx.rentAulaSession || 'Reguler 8 Jam'} | Kapasitas: 250 Pax | Sound System & AC`, 105, currRowY + 3.8);
      doc.setFont('helvetica', 'bold');
      doc.text('TERJADWAL', 172, currRowY + 3.8);

      currRowY += 5.5;
    }

    // 6. Layanan Tambahan & Fasilitas Terpadu
    // If remaining space on current page is insufficient for Services, Terms & Signatures (~75mm)
    if (currRowY > 195) {
      doc.addPage();
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 4, 'F');
      doc.setFillColor(...goldColor);
      doc.rect(0, 4, 210, 1.2, 'F');
      currRowY = 14;
    }

    const serviceY = currRowY + 3;
    const serviceH = 26;
    doc.setFillColor(...bgCard);
    doc.setDrawColor(...borderCard);
    doc.roundedRect(14, serviceY, 182, serviceH, 2, 2, 'FD');

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, serviceY, 182, 5.5, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...darkSlate);
    doc.text('4. FASILITAS DAN LAYANAN TAMBAHAN YANG DIAJUKAN', 18, serviceY + 3.8);

    const cateringText = tx.cateringPackage && tx.cateringPackage !== 'TIDAK'
      ? `Paket ${tx.cateringPackage}: ${tx.cateringPaxCount || tx.breakfastPortions || tx.totalPax || 1} Pack/Hari`
      : tx.breakfast 
      ? `Sarapan: ${tx.breakfastMenu || 'Standar'} (${tx.breakfastPortions || 1} Porsi x ${tx.breakfastDays || tx.duration || 1} Hari)`
      : 'Tidak Memesan Paket Konsumsi';

    const serviceRows = [
      ['Paket Konsumsi / Katering', cateringText],
      ['Fasilitas Tambahan / Bed', tx.extraBed ? `Termasuk: +${tx.extraBedCount || 1} Unit Extra Bed (${tx.extraBedNotes || 'Lengkap sprei & bantal'})` : 'Standar Fasilitas Ruangan'],
      ['Sewa Ruang Pertemuan / Aula', tx.includeAula && tx.rentAulaName ? `Termasuk: ${tx.rentAulaName} (${tx.rentAulaSession || 'Reguler'})` : isAula ? 'Ruang Pertemuan Utama' : 'Tidak Menyewa Aula'],
      ['Catatan Khusus Tamu', tx.notes ? tx.notes : 'Tidak ada instruksi khusus.']
    ];

    let sY = serviceY + 9;
    serviceRows.forEach(([srvLbl, srvVal]) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...primaryColor);
      doc.text(srvLbl, 18, sY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...darkSlate);
      doc.text(`: ${srvVal}`, 64, sY);
      sY += 4.5;
    });

    // 7. Tata Tertib & Ketentuan Ringkas
    const termsY = serviceY + serviceH + 3;
    doc.setFillColor(254, 252, 243);
    doc.setDrawColor(243, 223, 162);
    doc.roundedRect(14, termsY, 182, 16, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...primaryColor);
    doc.text('KETENTUAN OPERASIONAL & TATA TERTIB HUNIAN:', 18, termsY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...darkSlate);
    doc.text('1. Tamu / Rombongan wajib menjaga kebersihan, ketertiban, serta fasilitas yang ada di seluruh area asrama.', 18, termsY + 8);
    doc.text('2. Waktu standar Check-In pukul 14:00 WIB dan batas waktu Check-Out pukul 12:00 WIB pada tanggal yang tertera.', 18, termsY + 11.5);
    doc.text('3. Kehilangan kunci kamar atau kerusakan sarana kamar/aula akan ditangani sesuai SOP UPT Asrama Haji Jakarta.', 18, termsY + 14.5);

    // 8. Signature Box (Tanda Tangan 3 Pihak)
    const signY = termsY + 20;

    // 1. Tamu / Penyewa
    const tamuX = 42;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...darkSlate);
    doc.text('Penyewa / Tamu yang Bersangkutan,', tamuX, signY, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(tx.groupPic || tx.guestName || 'Nama Tamu / Penyewa', tamuX, signY + 20, { align: 'center' });
    doc.setLineWidth(0.3);
    doc.setDrawColor(...darkSlate);
    doc.line(16, signY + 21, 68, signY + 21);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...lightSlate);
    doc.text('Tanda Tangan & Nama Terang', tamuX, signY + 24.5, { align: 'center' });

    // 2. Tim Akomodasi
    const akoX = 105;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...darkSlate);
    doc.text('Tim Pengelola Akomodasi & Sarana,', akoX, signY, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('Tim Pengelola Akomodasi', akoX, signY + 20, { align: 'center' });
    doc.setLineWidth(0.3);
    doc.setDrawColor(...darkSlate);
    doc.line(79, signY + 21, 131, signY + 21);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...lightSlate);
    doc.text('Sarana & Hunian UPT Asrama Haji', akoX, signY + 24.5, { align: 'center' });

    // 3. Resepsionis
    const recepX = 168;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...darkSlate);
    doc.text(`Jakarta, ${formatIndonesianDate(realToday)}`, recepX, signY - 3.5, { align: 'center' });
    doc.text('Petugas Front Office / Resepsionis,', recepX, signY, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(officerName, recepX, signY + 20, { align: 'center' });
    doc.setLineWidth(0.3);
    doc.setDrawColor(...darkSlate);
    doc.line(142, signY + 21, 194, signY + 21);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...lightSlate);
    doc.text(`${officerRole} • UPT Asrama Haji`, recepX, signY + 24.5, { align: 'center' });

    // 9. Footer Barcode & Legal Notice on ALL pages
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setDrawColor(...borderCard);
      doc.setLineWidth(0.4);
      doc.line(14, 281, 196, 281);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(...lightSlate);
      doc.text('Dokumen ini sah secara elektronik dan tercatat di Sistem Informasi Manajemen Operasional UPT Asrama Haji Jakarta.', 14, 285);
      doc.text(`Kementerian Haji dan Umrah RI • Halaman ${p} dari ${totalPages}`, 196, 285, { align: 'right' });
    }

    // Trigger Save
    const safeRoom = (isGroupBooking ? 'Grup' : tx.roomNumber || 'kamar').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanFilename = `Invoice-${tx.id}-${safeRoom}.pdf`;
    doc.save(cleanFilename);
  } catch (error) {
    console.error('Error in downloadDirectInvoicePdf:', error);
    // Fallback to print
    printInvoiceDocument();
  }
}

/**
 * Calculates precision column widths tailored to report type so that no text is truncated.
 */
function calculateReportColumnWidths(headers: string[], reportType?: string, tableWidth = 273): number[] {
  const colCount = headers.length;
  if (reportType === 'KAMAR' && colCount === 13) {
    // 13 cols: No, ID/Kode, Tipe Booking, Nama/Rombongan/PIC, Wilayah Gedung, Rincian Kamar/Aula, Kloter/Instansi, Tgl Masuk, Durasi, Satuan, Fasilitas Tambahan, Kontak HP, Status
    return [8, 16, 22, 32, 24, 42, 20, 18, 11, 11, 28, 20, 21]; // sum = 273
  }
  if (reportType === 'MAINTENANCE' && colCount === 11) {
    // 11 cols: No, Waktu, Tipe, Gedung, No.Kamar/Aula, Kategori, Urgensi, Teknisi, Pelapor, Deskripsi, Status
    return [8, 20, 22, 24, 30, 24, 18, 24, 22, 57, 24]; // sum = 273
  }
  if (reportType === 'QC') {
    if (colCount === 11) {
      // Readiness: No, Tipe, Gedung, No.Kamar/Aula, Tipe/Kelas, Kapasitas, Status Fisik, Vonis, Tgl, Petugas, Catatan
      return [8, 22, 24, 30, 20, 18, 18, 28, 20, 24, 61]; // sum = 273
    }
    if (colCount === 15) {
      // History: No, ID, Waktu, Tipe, Gedung, No.Kamar/Aula, QC, Kebersihan, Linen, AC, Sanitasi, Amenities, Vonis, Alur, Catatan
      return [7, 14, 18, 20, 20, 22, 22, 14, 16, 15, 15, 16, 23, 17, 34]; // sum = 273
    }
  }
  if (reportType === 'SARAPAN' && colCount === 16) {
    // 16 cols: No, ID, Status, Prioritas, Gedung, No.Kamar, Nama, Kloter, HP, Tgl, Menu, Porsi, Hari, Total, StatusDapur, Catatan
    return [7, 14, 15, 17, 18, 15, 26, 18, 16, 15, 26, 10, 10, 11, 23, 32]; // sum = 273
  }

  // Dynamic weights fallback
  const weights = headers.map(h => {
    const l = h.toLowerCase();
    if (l === 'no' || l === 'no.') return 1.0;
    if (l.includes('durasi') || l.includes('porsi') || l.includes('hari') || l.includes('satuan')) return 1.5;
    if (l.includes('id') || l.includes('tgl') || l.includes('waktu') || l.includes('urgensi')) return 2.2;
    if (l.includes('status') || l.includes('kategori') || l.includes('kloter')) return 2.8;
    if (l.includes('kamar') || l.includes('aula') || l.includes('gedung') || l.includes('wilayah')) return 3.6;
    if (l.includes('nama') || l.includes('teknisi') || l.includes('pemeriksa')) return 3.8;
    if (l.includes('catatan') || l.includes('deskripsi') || l.includes('temuan') || l.includes('evaluasi')) return 6.0;
    return 3.0;
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  return weights.map(w => Number(((w / totalWeight) * tableWidth).toFixed(1)));
}

/**
 * Menentukan pejabat penandatangan (TTD) resmi berdasarkan jenis laporan
 * Pemesanan/Kamar/Rombongan -> Manager Resepsionis
 * Pesanan Dapur/Sarapan/Konsumsi -> Manager Koperasi
 * Kerusakan/Maintenance/Teknisi -> Manager Teknisi
 * QC -> Manager QC
 * Audit/Jam Kerja -> Kepala UPT / Super Admin
 */
export function getReportSignatory(reportType: string, currentUser?: { fullName?: string; role?: string }) {
  const normType = (reportType || '').toUpperCase();

  // 1. Pesanan Dapur / Sarapan / Konsumsi / Katering -> Manager Koperasi
  if (normType === 'SARAPAN' || normType.includes('DAPUR') || normType.includes('KONSUMSI') || normType.includes('KATERING')) {
    const isMatchingManager = currentUser?.role && (currentUser.role.includes('Koperasi') && currentUser.role.includes('Manager'));
    return {
      name: isMatchingManager && currentUser?.fullName ? currentUser.fullName : 'Hj. Rina Marlina',
      role: 'Manager Koperasi & Konsumsi',
      nip: 'NIP. 19820917 200801 2 006'
    };
  }

  // 2. Pemeliharaan & Kerusakan Teknisi -> Manager Teknisi
  if (normType === 'MAINTENANCE' || normType.includes('TEKNISI') || normType.includes('PERBAIKAN')) {
    const isMatchingManager = currentUser?.role && (currentUser.role.includes('Teknisi') && currentUser.role.includes('Manager'));
    return {
      name: isMatchingManager && currentUser?.fullName ? currentUser.fullName : 'H. Joko Susilo, ST',
      role: 'Manager Teknisi & Sarpras',
      nip: 'NIP. 19800311 200701 1 008'
    };
  }

  // 3. Pengawasan Mutu & Kebersihan -> Manager Quality Control
  if (normType === 'QC') {
    const isMatchingManager = currentUser?.role && (currentUser.role.includes('QC') && currentUser.role.includes('Manager'));
    return {
      name: isMatchingManager && currentUser?.fullName ? currentUser.fullName : 'Ir. Hendra Kusuma',
      role: 'Manager Quality Control',
      nip: 'NIP. 19790822 200604 1 005'
    };
  }

  // 4. Audit & Jam Kerja -> Kepala UPT Asrama Haji Jakarta
  if (normType === 'AUDIT' || normType === 'JAM_KERJA') {
    return {
      name: 'Ahmad Faisal',
      role: 'Super Admin / Kepala UPT',
      nip: 'NIP. 19750101 200003 1 001'
    };
  }

  // 5. Default: Laporan Pemesanan Kamar / Hunian / Reservasi / Rombongan -> Manager Resepsionis
  const isMatchingManager = currentUser?.role && (currentUser.role.includes('Resepsionis') && currentUser.role.includes('Manager'));
  return {
    name: isMatchingManager && currentUser?.fullName ? currentUser.fullName : 'Dra. Hj. Siti Rahmah',
    role: 'Manager Resepsionis',
    nip: 'NIP. 19780514 200501 2 003'
  };
}

/**
 * Downloads tabular reports (Kamar, Maintenance, QC, Sarapan, dll) directly as crisp official PDF.
 * Implements precision multi-line wrapping and single manager signature.
 */
export function downloadReportPdfDirect(
  title: string,
  filename: string,
  headers: string[],
  rows: (string | number)[][],
  summaryStats?: { label: string; value: string | number }[],
  officerName = 'Administrator Operasional',
  officerRole = 'Pimpinan Divisi',
  reportType?: string
): void {
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const realToday = getRealTodayDate();
    const primaryColor: [number, number, number] = [111, 75, 43]; // Chocolate Brown
    const goldColor: [number, number, number] = [184, 134, 11];
    const darkSlate: [number, number, number] = [30, 41, 59];
    const lightSlate: [number, number, number] = [100, 116, 139];

    // Top Brand Bar
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 297, 4.5, 'F');
    doc.setFillColor(...goldColor);
    doc.rect(0, 4.5, 297, 1.2, 'F');

    const appSettings = dataStorage.getAppSettings();
    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...primaryColor);
    doc.text(appSettings.organizationName, 148.5, 13, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setTextColor(...goldColor);
    doc.text(appSettings.ministryName, 148.5, 17.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...lightSlate);
    doc.text(appSettings.subTitle, 148.5, 21.5, { align: 'center' });

    doc.setDrawColor(...darkSlate);
    doc.setLineWidth(0.4);
    doc.line(12, 24, 285, 24);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...darkSlate);
    doc.text(title, 12, 30);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...lightSlate);
    doc.text(`Tanggal Cetak: ${formatIndonesianDate(realToday)}  |  UPT Asrama Haji Jakarta • Kementerian Haji dan Umrah RI`, 12, 34);

    // Summary Stats
    let curY = 38;
    if (summaryStats && summaryStats.length > 0) {
      let statX = 12;
      summaryStats.forEach(stat => {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(statX, curY, 42, 10, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(...lightSlate);
        doc.text(String(stat.label).toUpperCase(), statX + 3, curY + 4);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...primaryColor);
        doc.text(String(stat.value), statX + 3, curY + 8.5);

        statX += 45;
      });
      curY += 13;
    }

    // Determine Table Column Widths with Exact Proportions
    const tableWidth = 273; // 285 - 12
    const colWidths = calculateReportColumnWidths(headers, reportType, tableWidth);

    // Header row
    const startY = curY;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(12, startY, tableWidth, 6.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...darkSlate);

    let hX = 12;
    headers.forEach((h, idx) => {
      const cWidth = colWidths[idx];
      doc.text(h, hX + 1.2, startY + 4.5, { maxWidth: cWidth - 2.4 });
      hX += cWidth;
    });

    let rowY = startY + 6.5;

    // Helper to render table header
    const renderTableHeader = (yPos: number) => {
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.rect(12, yPos, tableWidth, 6.5, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(...darkSlate);

      let headerX = 12;
      headers.forEach((h, idx) => {
        const cWidth = colWidths[idx];
        doc.text(h, headerX + 1.2, yPos + 4.5, { maxWidth: cWidth - 2.4 });
        headerX += cWidth;
      });
    };

    // Render Data Rows with Dynamic Text Wrapping (No Clipping!)
    rows.forEach((r, rIdx) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);

      // Split text to lines for each cell in this row
      const cellLines = r.map((cVal, cIdx) => {
        const cWidth = colWidths[cIdx] || 20;
        const strVal = String(cVal ?? '-');
        return doc.splitTextToSize(strVal, cWidth - 2.4);
      });

      const maxLines = Math.max(1, ...cellLines.map(lines => lines.length));
      const lineHeight = 3.0; // mm
      const rowHeight = Math.max(5.5, maxLines * lineHeight + 2.5);

      // Page overflow check (A4 Landscape height = 210mm; limit table to 176mm to leave room for bottom info)
      if (rowY + rowHeight > 176) {
        doc.addPage();
        rowY = 16;
        renderTableHeader(rowY);
        rowY += 6.5;
      }

      const isEven = rIdx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 249, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(12, rowY, tableWidth, rowHeight, 'FD');

      doc.setTextColor(...darkSlate);

      let xPos = 12;
      r.forEach((_, cIdx) => {
        const cWidth = colWidths[cIdx] || 20;
        const lines = cellLines[cIdx];
        lines.forEach((lineText: string, lIdx: number) => {
          doc.text(lineText, xPos + 1.2, rowY + 3.5 + (lIdx * lineHeight));
        });
        xPos += cWidth;
      });

      rowY += rowHeight;
    });

    // 1 Signature Only: Manager yang bersangkutan sesuai tupoksi laporan
    const signatory = getReportSignatory(reportType || '', { fullName: officerName, role: officerRole });
    const managerName = signatory.name;
    const managerRole = signatory.role;
    const managerNip = signatory.nip;

    // Check if signature fits on current page (needs ~30mm)
    if (rowY + 32 > 198) {
      doc.addPage();
      rowY = 20;
    }

    const signY = Math.max(rowY + 6, 168);
    const signX = 245;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...darkSlate);
    doc.text(`Jakarta, ${formatIndonesianDate(realToday)}`, signX, signY, { align: 'center' });
    doc.text('Mengetahui / Menyetujui,', signX, signY + 4, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(managerName, signX, signY + 20, { align: 'center' });
    doc.setLineWidth(0.3);
    doc.line(signX - 26, signY + 21, signX + 26, signY + 21);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...lightSlate);
    doc.text(`${managerRole} • UPT Asrama Haji`, signX, signY + 25, { align: 'center' });
    doc.text(managerNip, signX, signY + 28.5, { align: 'center' });

    const finalFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    doc.save(finalFilename);
  } catch (err) {
    console.error('Error generating report PDF:', err);
    window.print();
  }
}

/**
 * Downloads a DOM element using html2canvas with fallback to direct PDF.
 */
export async function downloadElementAsPdf(
  element: HTMLElement,
  filename: string,
  options?: {
    orientation?: 'portrait' | 'landscape';
    format?: 'a4';
    marginMm?: number;
    title?: string;
  }
): Promise<void> {
  const orientation = options?.orientation || 'portrait';
  const margin = options?.marginMm ?? 8;

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pageWidth = orientation === 'landscape' ? 297 : 210;
    const pageHeight = orientation === 'landscape' ? 210 : 297;
    const printableWidth = pageWidth - margin * 2;
    const printableHeight = pageHeight - margin * 2;

    const imgWidth = printableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (imgHeight <= printableHeight) {
      pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
    } else {
      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
      heightLeft -= printableHeight;

      while (heightLeft > 0) {
        pdf.addPage();
        position = margin - (imgHeight - heightLeft);
        pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
        heightLeft -= printableHeight;
      }
    }

    const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(cleanFilename);
  } catch (error) {
    console.warn('html2canvas failed, attempting print fallback:', error);
    window.print();
  }
}

/**
 * Renders raw HTML string in a sandboxed offscreen container and exports directly as PDF
 */
export async function downloadHtmlContentAsPdf(
  htmlContent: string,
  filename: string,
  options?: {
    orientation?: 'portrait' | 'landscape';
    format?: 'a4';
    marginMm?: number;
    title?: string;
  }
): Promise<void> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '0';
  container.style.width = options?.orientation === 'landscape' ? '1200px' : '900px';
  container.style.backgroundColor = '#ffffff';
  container.style.zIndex = '-9999';
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    await new Promise(resolve => setTimeout(resolve, 150));
    await downloadElementAsPdf(container, filename, options);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Executes a clean browser print for invoice sheets with proper CSS scoping
 */
export function printInvoiceDocument(): void {
  try {
    document.body.classList.add('printing-invoice');

    const handleAfterPrint = () => {
      document.body.classList.remove('printing-invoice');
      window.removeEventListener('afterprint', handleAfterPrint);
    };

    window.addEventListener('afterprint', handleAfterPrint);

    window.print();

    // Fallback cleanup in case afterprint does not fire in certain browser setups
    setTimeout(() => {
      document.body.classList.remove('printing-invoice');
      window.removeEventListener('afterprint', handleAfterPrint);
    }, 15000);
  } catch (err) {
    console.error('Print invoice error:', err);
    window.print();
  }
}
