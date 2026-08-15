# BookSpace — kitobxonlar uchun shaxsiy kutubxona platformasi (MVP dizayni)

**Sana:** 2026-08-16
**Holat:** Tasdiqlangan (implementatsiya rejasiga o'tishga tayyor)

## 1. Maqsad

Kitobxonlar uchun Pinterest uslubidagi platforma: har bir o'qilgan kitob shunchaki baholanmaydi, balki shaxsiy o'qish xotirasi (kundalik yozuvi) sifatida saqlanadi — boshlash/tugatish sanalari, qahramonlar, iqtiboslar, shaxsiy fikr va baho bilan. Platforma Telegram bot + Telegram Mini App (webapp) shaklida ishlaydi: bot faqat kirish eshigi, barcha o'zaro ta'sir webapp'da sodir bo'ladi.

## 2. MVP qamrovi

MVP **shaxsiy funksiyalarga** qaratilgan. Ijtimoiy/kashf qilish funksiyalari (boshqa foydalanuvchilar profilini ko'rish, tavsiyalar, hamjamiyat) keyingi bosqichga qoldiriladi.

**MVP'ga kiradi:**
- Telegram orqali avtomatik ro'yxatdan o'tish/kirish
- Shaxsiy profil (bio, o'qish tajribasi qachondan beri, sevimli janrlar)
- Kitob qo'shish (tashqi API orqali qidiruv + qo'lda kiritish)
- O'qish kundaligi yozuvi: holat, sanalar, qahramonlar, iqtiboslar (strukturaviy ro'yxat), shaxsiy fikr, baho
- Shaxsiy kutubxona ko'rinishi (barcha yozuvlar)
- Favorites (belgilangan yozuvlarni filtrlash)

**MVP'ga kiritilmaydi (keyingi bosqich):**
- Boshqa foydalanuvchilar profilini ko'rish
- Tavsiyalar/kashf qilish
- Ko'p tillik (infratuzilma tayyor, lekin faqat o'zbek tili bilan ishga tushadi)
- Ijtimoiy o'zaro ta'sir (izoh, layk va h.k.)

## 3. Umumiy arxitektura

```
┌──────────────────────────────────────────────────────────┐
│                         api (FastAPI)                      │
│  ┌────────────────────┐   ┌───────────────────────────┐   │
│  │ REST API             │   │ Telegram webhook           │   │
│  │ (/users,/entries,...)│   │ (aiogram dispatcher, /start)│   │
│  └────────────────────┘   └───────────────────────────┘   │
└───────────────┬──────────────────────────┬────────────────┘
                 │                          │
        ┌────────▼────────┐       ┌────────▼─────────┐
        │   PostgreSQL     │       │ Tashqi kitob API   │
        │   (asosiy DB)    │       │ (Google Books)      │
        └──────────────────┘       └──────────────────┘
                 │
        ┌────────▼────────────┐
        │ Object storage        │
        │ (Cloudflare R2 —      │
        │  qo'lda kiritilgan     │
        │  muqova/avatar)        │
        └────────────────────────┘

        ┌──────────────────────────┐
        │ Telegram Mini App          │
        │ (React + TS + Vite)        │
        │ — foydalanuvchi shu yerda  │
        │   ishlaydi, api'ga so'rov  │
        │   yuboradi                 │
        └──────────────────────────┘
```

**Oqim:** Foydalanuvchi botga `/start` yuboradi → bot (webhook orqali `api` xizmati ichida ishlaydi) "Kutubxonamni ochish" tugmasi bilan javob beradi → tugma Telegram Mini App'ni ochadi → Mini App Telegram'dan olingan `initData`ni `api`ga yuboradi → `api` imzoni tekshiradi, foydalanuvchini topadi/yaratadi, JWT token beradi → shundan keyingi barcha so'rovlar shu token bilan `api`ga yuboriladi.

Bot alohida konteyner sifatida emas, balki `api` xizmati ichida webhook rejimida ishlaydi (QuizBot loyihasidagi sinovdan o'tgan naqsh) — bu konteynerlar sonini kamaytiradi va serverda allaqachon ishlab turgan infratuzilmaga mos keladi.

## 4. Texnologik stack

- **Backend:** Python, FastAPI (modulli router/service tuzilishi)
- **Bot:** aiogram, webhook rejimida, `api` xizmati ichiga o'rnatilgan
- **Frontend:** React + TypeScript + Vite + Tailwind CSS, Telegram WebApp SDK
- **DB:** PostgreSQL + SQLAlchemy + Alembic (migratsiyalar) — QuizBot loyihasi bilan bir xil vositalar, operatsion izchillik uchun
- **Object storage:** Cloudflare R2 (S3-mos)
- **Tashqi kitob ma'lumotlari:** Google Books API

## 5. Modullar tuzilishi

**Backend (FastAPI)** — har bir domen alohida modul, o'z `router` (API yo'llari), `service` (biznes-mantiq) va `repository` (DB) qatlamlariga ega:

- **`auth`** — Telegram `initData`ni tekshirish, JWT sessiya tokeni chiqarish
- **`users`** — profil (bio, o'qish tajribasi qachondan beri, sevimli janrlar)
- **`catalog`** — kitob katalogi: tashqi API qidiruvi + qo'lda kiritilgan kitoblarni saqlash/dedup qilish
- **`entries`** — o'qish kundaligi yozuvlari (holat, sanalar, qahramonlar, shaxsiy fikr, baho)
- **`quotes`** — entry'ga biriktirilgan strukturaviy iqtiboslar ro'yxati
- **`library`** — foydalanuvchining shaxsiy kutubxona ko'rinishini yig'adi, Favorites filtri
- **`media`** — qo'lda kiritilgan kitoblar uchun muqova rasm yuklash (object storage)
- **`bot`** — aiogram handler'lari (hozircha faqat `/start`), `api` ilovasi ichiga webhook sifatida ulanadi

Har bir modul mustaqil test qilinadi va boshqa modullarga faqat aniq interfeys orqali murojaat qiladi.

**Frontend (React)** — feature-based papkalar: `features/profile`, `features/library`, `features/entry-editor`, `features/favorites`.

## 6. Ma'lumotlar modeli

- **User** — `id`, `telegram_id` (unikal), `username`, `display_name`, `avatar_url`, `bio`, `reading_since`, `created_at`
- **Genre** (lookup) — `id`, `key` — nomi locale fayldan olinadi. **UserFavoriteGenre** — ko'p-ko'pga bog'lanish
- **Book** (katalog) — `id`, `source` (`external_api`/`manual`), `external_id`, `title`, `author`, `cover_url`, `description`, `created_by_user_id` — `external_id` bo'yicha dedup qilinadi
- **Entry** (asosiy obyekt) — `id`, `user_id`, `book_id`, `status` (`planned`/`reading`/`finished`), `started_at`, `finished_at`, `characters_notes`, `personal_thoughts`, `rating` (1–5), `is_favorite`, `created_at`, `updated_at`
- **Quote** — `id`, `entry_id`, `text`, `sort_order`, `created_at`

Favorites alohida jadval emas — `Entry.is_favorite = true` bo'yicha filtrlanadi.

## 7. Constants va ko'p tillikka tayyorgarlik

Barcha matnlar `/locales/uz.json` faylida namespace bilan kalitlangan holda saqlanadi (masalan `bot.start.welcome`, `web.entry.rating_label`). Bot va backend (Python) JSON'ni to'g'ridan-to'g'ri o'qiydi, frontend (TypeScript) Vite orqali import qiladi va tiplarni avtomatik generatsiya qiladi. Kodda hech qanday matn qattiq yozilmaydi — hammasi `t(key)` orqali olinadi. Kelajakda til qo'shish uchun shunchaki yangi `/locales/<til>.json` fayli qo'shiladi, kod o'zgarmaydi.

## 8. Autentifikatsiya oqimi

1. Mini App ochilganda Telegram `initData` beradi.
2. Frontend uni `POST /auth/telegram`ga yuboradi.
3. Backend bot tokeni bilan HMAC imzoni va `auth_date` yaqinligini (≤24 soat) tekshiradi.
4. To'g'ri bo'lsa: `telegram_id` bo'yicha foydalanuvchi topiladi/yaratiladi, 24 soatlik JWT beriladi (refresh token kerak emas — Mini App har ochilishda yangi `initData` oladi).
5. Frontend tokenni har bir so'rovda `Authorization: Bearer` orqali yuboradi.
6. Imzo noto'g'ri → `401`, frontend "ilovani qayta oching" xabarini ko'rsatadi.

## 9. Kitob katalogi integratsiyasi

1. Foydalanuvchi nom kiritadi → `GET /catalog/search?q=...`.
2. Backend Google Books API'ga serverda murojaat qiladi (kalitni yashirish, natijalarni keshlash uchun), natijalarni bir xil formatga keltiradi.
3. Tanlangan natija `external_id` bo'yicha dedup qilinadi, mavjud bo'lmasa yangi `Book` yaratiladi.
4. Topilmasa — foydalanuvchi qo'lda nom/muallif/muqova kiritadi (`POST /media/upload` → `Book(source=manual)`).
5. Kitob aniqlangach, shu foydalanuvchi uchun yangi `Entry` yaratiladi.

## 10. Xatoliklarni boshqarish

- Barcha API xatolari bir xil formatda: `{ "error_key": "...", "message": "..." }`, frontend `error_key`ni locale orqali tarjima qiladi.
- Tashqi kitob API ishlamasa (timeout 3s, 1 marta retry) — qidiruv bo'sh qaytadi, foydalanuvchiga darhol qo'lda kiritish taklif qilinadi.
- Validatsiya xatolari `422`, maydon darajasida.
- Auth xatolari `401` (8-bo'lim).
- Frontend'da global error boundary + toast xabarlar.

## 11. Testlash strategiyasi

- **Backend (pytest):** har bir modul uchun unit testlar (repository mock), asosiy endpoint'lar uchun integratsion testlar. `auth` moduli (Telegram imzo tekshirish) puxta test qilinadi.
- **Bot:** `/start` handler uchun oddiy test.
- **Frontend (Vitest + RTL):** kitob qo'shish formasi, entry tahrirlash, favorite belgilash uchun komponent testlari. To'liq e2e (Playwright) MVP uchun keraksiz — keyingi bosqichda.
- **Locale konsistentligi:** kodda ishlatilgan har bir `t()` kaliti `uz.json`da mavjudligini tekshiruvchi CI skripti.

## 12. Dizayn yondashuvi

Aniq piksel-darajasidagi dizayn implementatsiya paytida `frontend-design` skill yordamida ishlab chiqiladi. Umumiy yo'nalish: Pinterest uslubidagi masonry/grid kartochkalar (muqova fokusda), kartochka bosilganda to'liq entry sahifasi, ko'p bo'sh joy, muqova rangiga mos dinamik fon, premium va sodda uslub.

## 13. Deployment (Hetzner, mavjud infratuzilma bilan)

Server allaqachon `D:\QuizBot` loyihasi uchun global **`nginx-proxy` + `acme-companion`** (Let's Encrypt) konteynerlarini ishlatadi, umumiy `proxy_network` orqali. Yangi loyiha shu infratuzilmani qayta ishlatadi:

- `docker-compose.yml` da `api` xizmati `proxy_network`ga qo'shiladi, `VIRTUAL_HOST`, `VIRTUAL_PORT`, `LETSENCRYPT_HOST`, `LETSENCRYPT_EMAIL` environment o'zgaruvchilari beriladi — SSL sertifikat avtomatik olinadi va yangilanadi, qo'lda certbot buyrug'i kerak emas.
- Xizmatlar: faqat ikkita konteyner — `api` (FastAPI + aiogram webhook, va React'ning statik build natijasini ham o'zi `StaticFiles` orqali uzatadi) va `db` (PostgreSQL). Bitta domen uchun alohida frontend-server konteyneri ortiqcha murakkablik hisoblanadi.
- Migratsiyalar: Alembic (`alembic upgrade head`), QuizBot'dagi kabi deploy skripti ichida avtomatik ishga tushadi.
- Deploy skripti QuizBot'dagi `scripts/deploy.sh` namunasi asosida moslashtiriladi: backup → git pull → rebuild → migratsiya → health check → webhook o'rnatish.
- Redis, PgBouncer, worker/scheduler kabi qo'shimchalar MVP uchun **kiritilmaydi** — background job yoki yuqori yuklama hozircha yo'q, kerak bo'lganda keyinchalik qo'shiladi.
