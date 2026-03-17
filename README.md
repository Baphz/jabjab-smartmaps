# Smart Maps Labkesda

Direktori dan dashboard operasional untuk pemetaan laboratorium kesehatan daerah, agenda kegiatan, hari libur, dan publikasi artikel. Aplikasi ini dibuat untuk kebutuhan DPW Jawa Barat, DKI Jakarta, dan Banten dengan pola akses `invite-only`.

## Ringkasan

`Smart Maps Labkesda` menggabungkan tiga kebutuhan utama dalam satu aplikasi:

- peta publik untuk melihat sebaran laboratorium
- dashboard internal untuk mengelola data lab, agenda, artikel, dan hari libur
- sistem otorisasi berbasis peran untuk `Super Admin` dan `Lab Admin`

Halaman publik berfokus pada peta, agenda, kalender, dan artikel terbaru. Dashboard berfokus pada pengelolaan data dengan alur yang ringkas dan terpusat.

## Fitur Utama

- Peta publik interaktif berbasis `Leaflet` dan `OpenStreetMap/CARTO`
- Pencarian laboratorium dan wilayah administratif langsung dari peta
- Highlight marker berdasarkan hasil pencarian, agenda aktif, dan fokus event
- Kalender publik untuk agenda, artikel, libur nasional, dan cuti bersama
- Agenda per laboratorium dan agenda global DPW
- Artikel bergaya blog dengan editor `WYSIWYG` berbasis `TipTap`
- Halaman artikel publik dan blok `5 artikel terbaru` di halaman utama
- Form laboratorium dengan alamat terstruktur:
  - provinsi
  - kabupaten/kota
  - kecamatan
  - kelurahan/desa
- Auto-geocoding alamat dan pemilih titik koordinat langsung di peta
- Upload gambar ke `Supabase Storage`
- Autentikasi `invite-only` dengan `Clerk`
- Otorisasi berbasis metadata Clerk:
  - `admin` untuk Super Admin
  - `lab_admin` untuk akun laboratorium

## Model Akses

### Super Admin

- melihat seluruh laboratorium
- membuat dan mengelola agenda global maupun agenda per lab
- membuat artikel global maupun artikel per lab
- mengelola hari libur nasional dan cuti bersama
- mengundang akun lab melalui email
- menghapus laboratorium

### Lab Admin

- hanya melihat laboratorium miliknya
- hanya dapat mengedit laboratorium miliknya
- tidak dapat menghapus laboratorium
- dapat membuat agenda untuk lab miliknya
- dapat membuat artikel untuk lab miliknya
- tetap dapat melihat agenda global DPW

## Stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Ant Design`
- `Prisma`
- `PostgreSQL / Supabase`
- `Supabase Storage`
- `Clerk`
- `Leaflet` + `react-leaflet`
- `TipTap`

## Struktur Data Inti

Model utama ada di [prisma/schema.prisma](/Users/baphien/Documents/projects/smart-maps/prisma/schema.prisma):

- `Lab`
- `LabType`
- `LabEvent`
- `MasterHoliday`
- `Article`

Data lokasi disimpan terstruktur agar pencarian wilayah dan pemetaan lebih akurat:

- `provinceName`
- `cityName`
- `districtName`
- `villageName`
- `latitude`
- `longitude`

## Menjalankan Secara Lokal

### 1. Install dependency

```bash
npm install
```

### 2. Siapkan environment

Salin [`.env.example`](/Users/baphien/Documents/projects/smart-maps/.env.example) menjadi `.env`, lalu isi seluruh value yang dibutuhkan.

### 3. Jalankan migrasi database

Untuk local development:

```bash
npx prisma migrate dev
```

Untuk environment yang schema-nya sudah ada:

```bash
npm run db:deploy
```

### 4. Jalankan aplikasi

```bash
npm run dev
```

Buka `http://localhost:3000`.

## Environment Variables

Contoh lengkap ada di [`.env.example`](/Users/baphien/Documents/projects/smart-maps/.env.example).

### Database

```env
DATABASE_URL=
DIRECT_URL=
```

- `DATABASE_URL` dipakai runtime Prisma
- `DIRECT_URL` dipakai untuk migrasi

### Clerk

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Catatan penting:

- nama env harus `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, bukan `CLERK_PUBLISHABLE_KEY`
- project ini menutup pendaftaran publik
- akun dashboard dibuat melalui undangan email

### Supabase Storage

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=lab-assets
SUPABASE_STORAGE_MAX_BYTES=10485760
```

### Geocoding

```env
GEOCODING_SEARCH_URL=https://nominatim.openstreetmap.org/search
GEOCODING_USER_AGENT=smart-maps-labkesda/1.0 (contact: admin@example.com)
```

## Seed dan Operasional Data

Project ini sudah dirancang untuk:

- menyimpan data laboratorium secara terstruktur
- menyimpan agenda lokal dan agenda global
- menampilkan hari libur nasional serta cuti bersama
- menyimpan artikel publikasi dalam format HTML hasil editor WYSIWYG

Jika Anda menambahkan tahun libur baru atau impor data laboratorium tambahan, sebaiknya lakukan lewat dashboard atau script terpisah agar format wilayah tetap konsisten.

## Deploy ke Vercel

Project ini sudah disiapkan untuk Vercel dengan alur:

- `postinstall` menjalankan `prisma generate`
- `build` menjalankan `prisma generate && next build`

Langkah deploy:

1. Import repo ini ke Vercel
2. Isi seluruh environment variables
3. Pastikan env tersedia untuk environment yang dipakai
4. Deploy atau redeploy

Environment minimum yang wajib ada di Vercel:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`

## Direktori Penting

```text
app/
  page.tsx                    Halaman publik
  admin/                      Dashboard admin
  artikel/                    Halaman artikel publik
  login/                      Halaman login Clerk

components/
  SmartMapInner.tsx           Peta utama publik
  home/                       Layout halaman depan
  activity/                   Kalender dan agenda
  admin/                      Manager dashboard internal
  article/                    Renderer artikel publik

lib/
  clerk-auth.ts               Otorisasi dan session helper
  supabase-storage.ts         Upload storage
  address-geocoding.ts        Geocoding alamat
  site-content.ts             Konten teks dan branding

prisma/
  schema.prisma               Struktur database utama
```

## Catatan Implementasi

- Halaman publik dirancang `map-first`
- Dashboard dirancang `compact` dan fokus ke aksi
- Form koordinat mendukung klik titik di peta
- Artikel memakai editor HTML terkontrol, bukan markdown biasa
- Storage utama memakai `Supabase Storage`
- Beberapa route legacy tetap dipertahankan untuk kompatibilitas data lama

## Quality Checks

Gunakan perintah ini sebelum push atau deploy:

```bash
npm run lint
npm run build
```

## Lisensi

Internal project untuk kebutuhan operasional `Smart Maps Labkesda`.
