# Pastki navigatsiya — "suzib chiquvchi aylana" dizayni (dizayn)

**Sana:** 2026-08-20
**Holat:** Tasdiqlangan (implementatsiya rejasiga o'tishga tayyor)

## 1. Maqsad

Hozirgi pastki navigatsiyani (2+2 matn-guruh + alohida joylashgan "+" tugma) foydalanuvchi topgan tayyor dizayn namunasi ("Magic Navigation Menu Indicator", Codehal) asosida to'liq qayta qurish: 5 ta bir xil uslubdagi band, faol band ustiga "suzib chiquvchi" aylana ko'tariladi, panelda shu aylanaga mos "o'yiq" ko'rinishi hosil bo'ladi.

Manba namuna: `D:\BookSpace\magic navigation menu indicator\` (index.html, style.css, script.js) — foydalanuvchi internetdan topib loyiha papkasiga qo'ygan.

## 2. Qamrov

**Kiradi:**
- `frontend/src/components/BottomNav.tsx`ni to'liq qayta qurish: 5 ta band (Kutubxona, Reyting, Qo'shish, Sevimlilar, Profil), CSS grid orqali teng kenglikda
- Har bir band uchun `lucide-react` ikonkasi (matn o'rniga/qo'shimcha)
- Faol bandning ikonkasi suzib chiquvchi amber aylana ichiga ko'tarilishi, ostida label paydo bo'lishi
- Aylananing gorizontal siljishi (marshrut o'zgarganda)
- Panelning aylana atrofida "o'yiq" ko'rinishi (box-shadow orqali)
- "+" tugmasi boshqa 4 band bilan bir xil xulq-atvorga o'tishi (endi alohida katta/ko'tarilgan emas)

**Kiritilmaydi:**
- Ikonka tanlash uchun foydalanuvchi sozlamasi — ikonkalar qattiq kodlangan (hard-coded)
- Boshqa sahifalardagi (LibraryCard, ProfilePage va h.k.) dizaynga o'zgartirish — faqat `BottomNav.tsx`
- Animatsiya sozlamalari (tezlik, easing) uchun konfiguratsiya — qiymatlar to'g'ridan-to'g'ri kodda

## 3. Arxitektura

`BottomNav.tsx` — yagona komponent, ichida:
- `NAV_ITEMS` massivi: `{ to, label, icon: LucideIcon }[]`, 5 ta element, tartib: Kutubxona, Reyting, Qo'shish, Sevimlilar, Profil
- `useLocation()` (react-router) orqali joriy yo'lni olib, `NAV_ITEMS` ichidan mos indeksni topish (`activeIndex`)
- `<nav>` — `grid grid-cols-5` konteyner, ichida 5 ta `NavLink`
- Alohida `<div>` — suzib chiquvchi aylana ("indicator"), `activeIndex` asosida `transform: translateX(...)` bilan pozitsiyalanadi

Marshrutlash o'zgarmaydi — `App.tsx`dagi mavjud `/`, `/rating`, `/add-book`, `/favorites`, `/profile` yo'llari saqlanadi, faqat ularni ko'rsatuvchi navigatsiya elementi qayta quriladi.

## 4. Ikonkalar

Yangi dependency: `lucide-react` (`npm install lucide-react`).

| Band | Yo'l | Ikonka |
|---|---|---|
| Kutubxona | `/` | `Library` |
| Reyting | `/rating` | `BarChart3` |
| Qo'shish | `/add-book` | `Plus` |
| Sevimlilar | `/favorites` | `Heart` |
| Profil | `/profile` | `User` |

Ikonka o'lchami: `24px` (lucide standart), suzib chiquvchi aylana ichida oq rangda (`text-white`), nofaol holatda `text-stone-500`.

## 5. Vizual mexanika

**Panel:** `h-16` (64px), `bg-white`, `rounded-t-2xl`, mavjud soya (`shadow-[0_-2px_10px_rgba(0,0,0,0.05)]`) saqlanadi. `grid grid-cols-5` — har bir band aniq 20% kenglik oladi.

**Har bir band (`NavLink`):**
- Nofaol: ikonka markazda, `text-stone-500`, label ko'rinmaydi
- Faol: ikonka `-translate-y-7` (yuqoriga ko'tariladi, aylana ichiga tushadi uchun), rangi `text-white`ga o'zgaradi; label ostida `opacity-100` bilan paydo bo'ladi (`text-[10px] text-amber-800 font-semibold`)
- O'tish animatsiyasi: `transition-all duration-500`

**Suzib chiquvchi aylana (`indicator`):**
- `absolute -top-7 h-14 w-14 rounded-full bg-amber-800 border-[6px] border-stone-50 shadow-lg`
- Pozitsiya: `left: calc(20% * {activeIndex} + 10%)`, `-translate-x-1/2` bilan markazlashtiriladi
- Gorizontal siljish: `transition-transform duration-500`

**"O'yiq" effekti:** `frontend/src/index.css`ga qo'shiladigan maxsus qoida (`.nav-indicator::before` / `::after`), asl namunadagi `box-shadow`-asosidagi texnikani takrorlaydi, lekin rang `#06021b` (namunaning qorong'i sahifa foni) o'rniga **`stone-50` ekvivalenti** (bizning sahifa foni, `index.css`da allaqachon `body`ga o'rnatilgan) bilan almashtiriladi — chunki aylana panelning yuqori chetidan chiqib, sahifa foniga qo'shilib ketishi kerak, panel foniga (`white`) emas.

**Ogohlantirish (implementatsiya vaqtida hal qilinadi):** agar bu box-shadow texnikasi turli ekran kengliklarida (masalan juda tor ekranlarda, band kengligi o'zgarganda) piksel-aniq ishlamasa yoki vizual sinovda beqaror ko'rinsa, oddiyroq muqobilga o'tiladi: aylana panel ustida shunchaki soya bilan suzib turadi, "kesib olingan" ko'rinishisiz (faqat `box-shadow`, panel qirrasi silliq qoladi). Bu holat yuz bersa, foydalanuvchiga screenshot orqali ko'rsatib, qaysi variantni afzal ko'rishi so'raladi.

## 6. "+" tugmasining o'zgarishi

Hozirgi implementatsiyada `/add-book` havolasi alohida, katta (`h-14 w-14`), doim ko'tarilgan holatda, mustaqil ravishda joylashtirilgan edi (`absolute left-1/2 -top-6`). Yangi dizaynda bu boshqa 4 band bilan **bir xil komponentga** aylanadi (`NAV_ITEMS` ro'yxatining bir a'zosi) — faqat `/add-book` sahifasida turganda aylana ichiga ko'tariladi, aks holda oddiy `Plus` ikonkasi sifatida ko'rinadi. Bosilganda xulq-atvor o'zgarmaydi (`/add-book`ga navigatsiya).

## 7. Test

`frontend/src/components/BottomNav.test.tsx` to'liq qayta yoziladi (hozirgi test "ikkita guruh + markazdagi tugma" haqidagi eskirgan taxminga asoslangan):
- 5 ta havola mavjudligi va har birining `href` to'g'ri ekanligini tekshirish
- Joriy marshrutga mos band `NavLink`ning faol holatini olishini tekshirish (react-router `MemoryRouter initialEntries` orqali turli boshlang'ich yo'llar bilan)

Aniq CSS `transform` pozitsiyasi yoki box-shadow effekti **jsdom testlarida tekshirilmaydi** — jsdom haqiqiy CSS layout/renderni hisoblamaydi (bu loyihada avval ham shunday bo'lgan, masalan oylik grafik ustunlarining balandlik xatosi faqat haqiqiy qurilmada topilgan edi). Vizual to'g'rilik implementatsiyadan keyin foydalanuvchi tomonidan qurilmada tekshiriladi.
