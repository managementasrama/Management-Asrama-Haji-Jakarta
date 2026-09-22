import React, { useState, useEffect } from 'react';
import { useAppContext, isSuperAdmin } from '../store';
import { useBodyScrollLock } from '../lib/scrollLock';

interface AccountProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: 'PROFIL' | 'BRANDING';
}

export function AccountProfileModal({ isOpen, onClose, initialSection }: AccountProfileModalProps) {
  const { currentUser, updateCurrentAccount, updateAppSettings, dataStorage, showToast } = useAppContext();

  const [activeTab, setActiveTab] = useState<'PROFIL' | 'BRANDING'>('PROFIL');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Admin settings for Web Title & Logo
  const [webTitle, setWebTitle] = useState('UPT Asrama Haji Jakarta');
  const [webLogo, setWebLogo] = useState('fa-kaaba');
  const [tagTitle, setTagTitle] = useState('UPT Asrama Haji Jakarta');
  const [appFavicon, setAppFavicon] = useState('');

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (currentUser && isOpen) {
      if (initialSection) {
        setActiveTab(initialSection);
      } else {
        setActiveTab('PROFIL');
      }
      setFullName(currentUser.fullName);
      setUsername(currentUser.username);
      setPhone(currentUser.phone && currentUser.phone !== '-' ? currentUser.phone : '');
      setPassword(currentUser.password || '12345');
      setShowPassword(false);

      const appSettings = dataStorage.getAppSettings();
      if (appSettings?.organizationName) setWebTitle(appSettings.organizationName);
      if (appSettings?.appLogo) setWebLogo(appSettings.appLogo);
      if (appSettings?.tagTitle) setTagTitle(appSettings.tagTitle);
      if (appSettings?.appFavicon) setAppFavicon(appSettings.appFavicon);
    }
  }, [currentUser, isOpen, initialSection, dataStorage]);

  if (!isOpen || !currentUser) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showToast('Nama lengkap wajib diisi!', 'warning');
      return;
    }
    if (!username.trim()) {
      showToast('Username / NIP wajib diisi!', 'warning');
      return;
    }

    // Update account profile
    updateCurrentAccount({
      fullName: fullName.trim(),
      username: username.trim(),
      phone: phone.trim() || '-',
      password: password.trim() || '12345'
    });

    // If super admin / admin, also update app settings
    if (isSuperAdmin(currentUser.role)) {
      updateAppSettings({
        organizationName: webTitle.trim(),
        appLogo: webLogo,
        tagTitle: tagTitle.trim(),
        appFavicon: appFavicon
      });
    }

    onClose();
  };

  const logoOptions = [
    { id: 'fa-kaaba', label: 'Kabah (Keagamaan)' },
    { id: 'fa-mosque', label: 'Masjid (Islamic)' },
    { id: 'fa-building-shield', label: 'Gedung Resmi (Pemerintahan)' },
    { id: 'fa-hotel', label: 'Akomodasi & Hotel' },
    { id: 'fa-shield-halal', label: 'Halal & Syariah' }
  ];

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('Ukuran file logo maksimal 2MB!', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setWebLogo(result);
          showToast('Logo berhasil diunggah! Klik Simpan Perubahan.', 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaviconFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        showToast('Ukuran file favicon maksimal 1MB!', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setAppFavicon(result);
          showToast('Favicon berhasil diunggah!', 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-hajj-800 text-white flex items-center justify-between border-b border-gold-500/30">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gold-500 text-hajj-950 flex items-center justify-center font-bold text-base shadow">
              <i className={`fa-solid ${activeTab === 'BRANDING' ? 'fa-globe' : 'fa-user-gear'}`}></i>
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                {activeTab === 'BRANDING' ? 'Pengaturan Judul & Logo Web' : 'Edit Profil Akun Saya'}
              </h3>
              <p className="text-[11px] text-slate-300">
                {activeTab === 'BRANDING' ? 'Kustomisasi identitas instansi, nama sistem & logo' : 'Perbarui informasi kredensial & identitas login Anda'}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-slate-300 hover:text-white p-1 rounded-lg transition cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Tab Navigation for Admin / Super Admin (Only shown if opened without specific section) */}
        {isSuperAdmin(currentUser.role) && !initialSection && (
          <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 pt-2.5 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('PROFIL')}
              className={`pb-2 px-3 font-bold border-b-2 transition flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'PROFIL'
                  ? 'border-hajj-700 text-hajj-800 dark:border-gold-400 dark:text-gold-300'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <i className="fa-solid fa-user-pen"></i>
              <span>Profil Akun</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('BRANDING')}
              className={`pb-2 px-3 font-bold border-b-2 transition flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'BRANDING'
                  ? 'border-hajj-700 text-hajj-800 dark:border-gold-400 dark:text-gold-300'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <i className="fa-solid fa-globe"></i>
              <span>Judul & Logo Web</span>
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
          {activeTab === 'PROFIL' ? (
            <>
              {/* Read-Only Role & Division Notice */}
              <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-700/80 p-3 rounded-xl flex items-start space-x-2.5">
                <i className="fa-solid fa-shield-halal text-amber-600 dark:text-amber-400 text-sm mt-0.5"></i>
                <div>
                  <span className="font-bold text-amber-900 dark:text-amber-200 block">Hak Akses & Peran Sistem</span>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                    Peran (<strong>{currentUser.role}</strong>) dan Divisi Anda dikelola secara terpusat oleh Administrator UPT. Anda hanya dapat mengubah informasi profil pribadi.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Nama Lengkap & Gelar</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl font-medium focus:ring-2 focus:ring-hajj-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Username / NIP Login</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl font-medium focus:ring-2 focus:ring-hajj-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Nomor WhatsApp / Kontak</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl font-medium focus:ring-2 focus:ring-hajj-600 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Kata Sandi / PIN Masuk</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      className="w-full p-2.5 pr-10 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl font-medium focus:ring-2 focus:ring-hajj-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Admin / Super Admin Web Title & Logo Settings */
            <div className="space-y-3.5">
              <div className="flex items-center space-x-2 text-hajj-800 dark:text-gold-300 font-bold bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <i className="fa-solid fa-screwdriver-wrench text-gold-600 dark:text-gold-400"></i>
                <span>Konfigurasi Khusus Administrator (Judul & Logo Web)</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Judul Web Sistem (Header)</label>
                <input
                  type="text"
                  value={webTitle}
                  onChange={e => setWebTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl font-medium focus:ring-2 focus:ring-hajj-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Edit Tag Title (Judul Tab Browser)</label>
                <input
                  type="text"
                  value={tagTitle}
                  onChange={e => setTagTitle(e.target.value)}
                  placeholder="Contoh: SIM-Akomodasi Asrama Haji"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl font-medium focus:ring-2 focus:ring-hajj-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Logo / Emblems Web (Upload Gambar atau Pilih Ikon)</label>
                <div className="flex items-center space-x-3 mb-2">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden shrink-0 text-slate-700 dark:text-slate-200 text-lg ${webLogo && webLogo.startsWith('data:') ? 'bg-transparent border-0' : 'bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700'}`}>
                    {webLogo && webLogo.startsWith('data:') ? (
                      <img src={webLogo} alt="Logo Preview" className="w-full h-full object-contain" />
                    ) : (
                      <i className={`fa-solid ${webLogo || 'fa-kaaba'}`}></i>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-hajj-100 dark:file:bg-hajj-900 file:text-hajj-800 dark:file:text-hajj-200 hover:file:bg-hajj-200 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Format PNG, JPG, atau SVG (Maks. 2MB)</p>
                  </div>
                </div>

                <select
                  value={webLogo.startsWith('data:') ? 'custom' : webLogo}
                  onChange={e => {
                    if (e.target.value !== 'custom') setWebLogo(e.target.value);
                  }}
                  aria-label="Pilih Logo Preset Sistem"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl font-medium focus:ring-2 focus:ring-hajj-600 focus:outline-none text-xs"
                >
                  <option value="custom" disabled={!webLogo.startsWith('data:')}>-- Logo Custom Diunggah --</option>
                  {logoOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Edit Favicon (Ikon Tab Browser .ico/.png)</label>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                    {appFavicon ? (
                      <img src={appFavicon} alt="Favicon Preview" className="w-full h-full object-contain" />
                    ) : (
                      <i className="fa-solid fa-globe text-slate-500 dark:text-slate-400"></i>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/png, image/x-icon, image/ico, image/svg+xml"
                      onChange={handleFaviconFileChange}
                      className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-hajj-100 dark:file:bg-hajj-900 file:text-hajj-800 dark:file:text-hajj-200 hover:file:bg-hajj-200 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Format ICO atau PNG (Maks. 1MB)</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-3 flex items-center justify-end space-x-2.5 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-hajj-700 hover:bg-hajj-800 text-white font-bold rounded-xl shadow-md transition flex items-center space-x-1.5 cursor-pointer"
            >
              <i className="fa-solid fa-floppy-disk"></i>
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
