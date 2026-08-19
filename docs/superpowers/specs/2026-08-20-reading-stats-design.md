# Reyting sahifasi — o'qish statistikasi (dizayn)

**Sana:** 2026-08-20
**Holat:** Tasdiqlangan (implementatsiya rejasiga o'tishga tayyor)

## 1. Maqsad

Pastki navigatsiyaga avval qo'shilgan, lekin hozircha "Tez orada..." placeholder bo'lgan **Reyting** tab'ini foydalanuvchining shaxsiy o'qish statistikasi sahifasiga aylantirish: jami o'qilgan kitoblar soni, bu yil/bu oy o'qilganlar, o'rtacha baho va so'nggi 12 oylik oylik grafik.

Bu ijtimoiy/reyting-jadval funksiyasi emas — MVP hali ham faqat shaxsiy ma'lumotlarga qaratilgan (boshqa foydalanuvchilar ko'rinmaydi, taqqoslash yo'q).

## 2. Qamrov

**Kiradi:**
- Jami tugatilgan (status="finished") kitoblar soni
- Joriy yilda va joriy oyda tugatilgan kitoblar soni
- Barcha baholangan yozuvlarning o'rtacha bahosi (1 xona aniqlikda)
- So'nggi 12 oy uchun oylik tugatilgan kitoblar soni — ustunli diagramma
- Bo'sh holat (hali birorta ham kitob tugatilmagan bo'lsa) uchun oddiy matn

**Kiritilmaydi (keyingi bosqich):**
- Janr bo'yicha statistika — `Book` modelida janr maydoni yo'q, faqat foydalanuvchi profilida "sevimli janrlar" bor, kitoblarga bog'lanmagan
- Boshqa foydalanuvchilar bilan taqqoslash/reyting jadvali
- Sahifalarni chop etish/eksport qilish

## 3. Backend — `GET /stats`

Mavjud modul naqshiga mos yangi `app/modules/stats/` modul (`router.py`, `service.py`, `schemas.py`), `library` moduli namunasida.

**Endpoint:** `GET /stats` — JWT autentifikatsiya talab qilinadi (`Authorization: Bearer <token>`), boshqa barcha `/library`, `/entries` kabi endpointlar bilan bir xil.

**Javob sxemasi (`StatsOut`):**
```python
class MonthlyCount(BaseModel):
    month: str  # "YYYY-MM"
    count: int

class StatsOut(BaseModel):
    total_finished: int
    finished_this_year: int
    finished_this_month: int
    average_rating: float | None  # None agar birorta ham baholanmagan bo'lsa
    monthly_breakdown: list[MonthlyCount]  # har doim aniq 12 element
```

**Hisoblash mantiqi (`service.py`):**
- Barcha hisob-kitoblar joriy foydalanuvchining (`current_user_id`) `entries` yozuvlaridan, SQL agregatsiya (`func.count`, `func.avg`) orqali — Python tomonida ro'yxatni aylantirib hisoblash emas
- `total_finished` — `status == "finished"` bo'lgan yozuvlar soni
- `finished_this_year` / `finished_this_month` — `status == "finished" AND finished_at` joriy server sanasining yili/oyi ichida bo'lgan yozuvlar soni
- `average_rating` — `rating IS NOT NULL` bo'lgan barcha yozuvlar (status'dan qat'iy nazar) bo'yicha `AVG(rating)`, natija `round(x, 1)`; agar mos yozuv bo'lmasa — `None`
- `monthly_breakdown` — joriy oydan orqaga qarab aniq 12 oy (masalan joriy oy avgust 2026 bo'lsa: 2025-09 dan 2026-08 gacha). Har bir oy uchun `status == "finished" AND finished_at` shu oy ichida bo'lgan yozuvlar soni; ma'lumot bo'lmagan oylar `count: 0` bilan qatnashadi (ro'yxatda hech qachon oy tushib qolmaydi)
- Server vaqti UTC asosida hisoblanadi (loyihada boshqa joyda ham foydalanuvchi-timezone hisobga olinmagan — `deploy.sh`/Postgres konteyneri UTC'da ishlaydi — shunga izchil)

**Xatolik holatlari:** maxsus xatolik yo'q — bo'sh kutubxona uchun barcha sonlar `0`, `average_rating` esa `None` qaytadi (bu 200 OK javob, xato emas).

## 4. Frontend — `RatingPage.tsx`

Hozirgi placeholder butunlay almashtiriladi.

**`useStats()` hook** (`features/rating/useStats.ts`) — loyihadagi `useLibrary`/`useEntryDetail` bilan bir xil naqsh:
- `{ stats, loading, error }` qaytaradi
- `useEffect` ichida `GET /stats` chaqiradi, React 18 StrictMode `ignore`-guard bilan
- Xato bo'lsa `error: true`, muvaffaqiyatli bo'lsa `stats: StatsResponse`

**`RatingPage.tsx` tuzilishi:**
- Yuklanish/xato holatlari — boshqa sahifalar bilan bir xil uslub: `<p className="p-4 text-center text-stone-500">Yuklanmoqda...</p>` / `"Statistikani yuklab bo'lmadi."`
- 4 ta statistika kartasi, 2x2 grid (`grid grid-cols-2 gap-3 p-4`), har biri `rounded-xl bg-white p-4 shadow-sm` (loyihaning `LibraryCard` uslubiga mos):
  - "Jami o'qilgan" — `total_finished`
  - "Bu yil" — `finished_this_year`
  - "Bu oy" — `finished_this_month`
  - "O'rtacha baho" — `average_rating` (masalan "4.3 ★"), `null` bo'lsa "—" yoki "Hali yo'q"
- Bo'sh holat: agar `total_finished === 0`, grafik o'rniga oddiy matn ko'rsatiladi: **"Hali statistika yo'q — birinchi kitobingizni tugating."** (loyihaning "plain-text empty state, skeleton yo'q" qoidasiga mos), statistika kartalari baribir ko'rsatiladi (barchasi 0/— bilan)
- Oylik grafik (faqat `total_finished > 0` bo'lsa ko'rsatiladi): tashqi kutubxonasiz, oddiy `<div>` ustunlar bilan quriladi — har bir oy uchun ustun balandligi `count / maxCount` nisbatida (`maxCount` — 12 oylik oynadagi eng katta son, agar hammasi 0 bo'lsa componentning o'zi ko'rsatilmaydi chunki bo'sh holat yuqorida qamrab olingan), ustun rangi `bg-amber-800`, ostida qisqartirilgan oy nomi (masalan "Sen", "Okt")

## 5. Ma'lumotlar oqimi

```
Foydalanuvchi "Reyting" tab'ini bosadi
  → RatingPage mount bo'ladi
  → useStats() effekti GET /stats ni chaqiradi (Bearer token bilan)
  → backend joriy foydalanuvchining entries'laridan SQL agregatsiya qiladi
  → StatsOut JSON qaytadi
  → RatingPage 4 ta karta + (agar ma'lumot bo'lsa) oylik grafikni render qiladi
```

Boshqa sahifalarga o'xshab, `RatingPage` har safar mount bo'lganda (masalan foydalanuvchi boshqa tab'ga o'tib qaytganda) qayta so'rov yuboradi — keshlash yo'q, chunki loyihada hech qayerda client-side keshlash qo'llanilmagan (`useLibrary` ham xuddi shunday ishlaydi).

## 6. Test

**Backend (`backend/tests/test_stats.py`):**
- Bo'sh kutubxona → barcha sonlar 0, `average_rating: None`, `monthly_breakdown` 12 ta 0-count element bilan
- Aralash statuslar (finished/reading/planned) → faqat `finished` hisoblanadi
- Turli oylarda tugatilgan yozuvlar → `monthly_breakdown` to'g'ri taqsimlanadi, joriy oydan tashqaridagi (13+ oy oldingi) yozuvlar chetda qoladi
- Ba'zi yozuvlar baholangan, ba'zilari yo'q → `average_rating` faqat baholangan yozuvlar bo'yicha hisoblanadi
- Autentifikatsiyasiz so'rov → 401

**Frontend (`RatingPage.test.tsx`):**
- Hozirgi placeholder testi ("Tez orada...") olib tashlanadi
- Yuklanish holati ko'rsatiladi, keyin statistika kartalari mock fetch javobi bilan render bo'ladi
- Bo'sh holat (`total_finished: 0`) uchun grafik o'rniga bo'sh-holat matni ko'rsatiladi, grafik render qilinmaydi
- Xato holati (`fetch` reject) uchun xato matni ko'rsatiladi
