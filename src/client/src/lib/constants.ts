export interface Major {
  code: string;
  name: string;
}

export interface Faculty {
  id: string;
  name: string;
  majors: Major[];
}

export const CAMPUSES = [
  { id: "UMB_MY", name: "Meruya (Kampus Utama)", badge: "Meruya" },
  { id: "UMB_MN", name: "Menteng (Kampus B)", badge: "Menteng" },
  { id: "UMB_WB", name: "Warung Buncit (Kampus C)", badge: "Warung Buncit" },
  { id: "UMB_CP", name: "Cipayung (Kampus D)", badge: "Cipayung" },
] as const;

export const SHIFTS = [
  { id: "REGULER_1", label: "Reguler 1 (Pagi)" },
  { id: "REGULER_2", label: "Reguler 2 (Sore/Malam/Karyawan)" },
] as const;

export const FACULTIES: Faculty[] = [
  {
    id: "FASILKOM",
    name: "Fakultas Ilmu Komputer",
    majors: [
      { code: "TI", name: "Teknik Informatika" },
      { code: "SI", name: "Sistem Informasi" },
    ],
  },
  {
    id: "FT",
    name: "Fakultas Teknik",
    majors: [
      { code: "TS", name: "Teknik Sipil" },
      { code: "TA", name: "Teknik Arsitektur" },
      { code: "TM", name: "Teknik Mesin" },
      { code: "TE", name: "Teknik Elektro" },
      { code: "TI_IND", name: "Teknik Industri" },
    ],
  },
  {
    id: "FEB",
    name: "Fakultas Ekonomi dan Bisnis",
    majors: [
      { code: "MN", name: "Manajemen" },
      { code: "AK", name: "Akuntansi" },
    ],
  },
  {
    id: "FIKOM",
    name: "Fakultas Ilmu Komunikasi",
    majors: [
      { code: "IK", name: "Ilmu Komunikasi" },
      { code: "PR", name: "Hubungan Masyarakat" },
      { code: "BC", name: "Penyiaran (Broadcasting)" },
      { code: "ADV", name: "Periklanan" },
    ],
  },
  {
    id: "FPSI",
    name: "Fakultas Psikologi",
    majors: [{ code: "PSI", name: "Psikologi" }],
  },
  {
    id: "FDSK",
    name: "Fakultas Desain dan Seni Kreatif",
    majors: [
      { code: "DKV", name: "Desain Komunikasi Visual" },
      { code: "DI", name: "Desain Interior" },
      { code: "DP", name: "Desain Produk" },
    ],
  },
];

export function getCampusBadge(campusId: string): string {
  const c = CAMPUSES.find((item) => item.id === campusId);
  return c ? c.badge : campusId;
}

export function getMajorCode(majorNameOrCode?: string): string {
  if (!majorNameOrCode) return "";
  const trimmed = majorNameOrCode.trim();
  for (const f of FACULTIES) {
    for (const m of f.majors) {
      if (m.code.toLowerCase() === trimmed.toLowerCase()) return m.code;
      if (m.name.toLowerCase() === trimmed.toLowerCase()) return m.code;
    }
  }
  return trimmed;
}

export const SEMESTER_OPTIONS = [
  { value: 1, label: "Semester 1", badge: "SM1" },
  { value: 2, label: "Semester 2", badge: "SM2" },
  { value: 3, label: "Semester 3", badge: "SM3" },
  { value: 4, label: "Semester 4", badge: "SM4" },
  { value: 5, label: "Semester 5", badge: "SM5" },
  { value: 6, label: "Semester 6", badge: "SM6" },
  { value: 7, label: "Semester 7", badge: "SM7" },
  { value: 8, label: "Semester 8", badge: "SM8" },
  { value: 0, label: "Graduated", badge: "Graduated" },
] as const;

export function formatSemesterBadge(
  sem: number | string | null | undefined,
): string {
  if (sem === null || sem === undefined || sem === "") return "";
  const num = Number(sem);
  if (num === 0) return "Graduated";
  if (num >= 1 && num <= 8) return `SM${num}`;
  return "";
}

export function formatSemesterLabel(
  sem: number | string | null | undefined,
): string {
  if (sem === null || sem === undefined || sem === "") return "-";
  const num = Number(sem);
  if (num === 0) return "Graduated";
  if (num >= 1 && num <= 8) return `Semester ${num}`;
  return "-";
}

export function getDiceBearAvatar(seed: string): string {
  if (seed && (seed.startsWith("http://") || seed.startsWith("https://"))) {
    return seed;
  }
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(
    seed || "default",
  )}`;
}

export function getAvatarUrl(
  seedOrUrl?: string | null,
  fallbackNim?: string,
): string {
  if (!seedOrUrl || !seedOrUrl.trim()) {
    return getDiceBearAvatar(fallbackNim || "default");
  }
  if (seedOrUrl.startsWith("http://") || seedOrUrl.startsWith("https://")) {
    return seedOrUrl;
  }
  return getDiceBearAvatar(seedOrUrl);
}
