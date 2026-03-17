export const siteContent = {
  metadata: {
    title: "Smart Maps",
    description: "Peta laboratorium",
  },
  brand: {
    appName: "Smart Maps Labkesda",
    shortName: "Smart Maps",
    logoUrl:
      "https://drive.google.com/thumbnail?id=1KtUkqQREVr_dQVhjYBdv35HgpUUMrAvS&sz=w200",
    logoAlt: "Logo Smart Maps Labkesda",
    regionLabel: "Jawa Barat · DKI Jakarta · Banten",
    organizationName: "ASLABKESDA DPW Jawa Barat-DKI Jakarta-Banten",
    footerTagline: "Smart Maps • Direktori laboratorium kesehatan daerah",
  },
  publicHome: {
    eyebrow: "Smart Maps Labkesda",
    title: "Peta dan Agenda Laboratorium",
    description:
      "Pemantauan lokasi laboratorium kesehatan dan agenda kegiatan yang dipublikasikan.",
    dashboardAccessNote: "Akses dashboard diberikan melalui undangan email.",
    metrics: {
      labs: "Laboratorium",
      activeAgenda: "Agenda aktif",
      holidays: "Hari libur",
    },
  },
  login: {
    badge: "Smart Maps Labkesda",
    title: "Login Dashboard Labkesda",
    description:
      "Portal pengelolaan peta laboratorium untuk Jawa Barat, DKI Jakarta, dan Banten.",
    highlights: [
      "Dashboard berbasis peta",
      "Akses melalui undangan",
      "Aktivasi akun terverifikasi",
    ],
    inviteAlertTitle: "Akses akun tidak bisa daftar langsung",
    inviteAlertDescription:
      "Setiap akun Labkesda harus diundang lebih dulu melalui email. Link undangan akan dipakai untuk membuat password pertama kali.",
    helpText:
      "Jika Anda belum menerima undangan, hubungi super admin untuk mendapatkan akses.",
    signInTitle: "Masuk ke akun Anda",
    signInDescription:
      "Gunakan email undangan dan password yang sudah Anda buat saat aktivasi akun.",
    backToMapLabel: "Kembali ke peta",
  },
  admin: {
    modalSubtitle: "Smart Maps Labkesda",
  },
} as const;

export type SiteContent = typeof siteContent;
