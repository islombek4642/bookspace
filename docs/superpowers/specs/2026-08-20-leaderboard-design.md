# Reyting jadvali — barcha foydalanuvchilar reytingi (dizayn)

**Sana:** 2026-08-20
**Holat:** Tasdiqlangan (implementatsiya rejasiga o'tishga tayyor)

## 1. Maqsad

Reyting sahifasiga ikkinchi tab qo'shish: barcha ro'yxatdan o'tgan foydalanuvchilar orasida eng ko'p kitob o'qiganlar reytingi. Bu MVP dizaynida ataylab chiqarib tashlangan birinchi ijtimoiy/ko'p-foydalanuvchili funksiya — asl spec (`2026-08-16-bookspace-mvp-design.md`, bo'lim 2) "Boshqa foydalanuvchilar profilini ko'rish" va "Ijtimoiy o'zaro ta'sir"ni keyingi bosqichga qoldirgan edi.

## 2. Qamrov

**Kiradi:**
- Barcha foydalanuvchilar orasida "jami tugatilgan kitoblar soni" bo'yicha reyting (kamayish tartibida), top 20
- Joriy foydalanuvchining o'z o'rni (agar top 20'dan tashqarida bo'lsa)
- Har bir qatorda ism (yoki username) + avatar (yoki bosh harf bilan zaxira)
- Reyting sahifasida 2 ta tab: "Mening statistikam" (mavjud) va "Reyting jadvali" (yangi)

**Kiritilmaydi:**
- Ixtiyoriy ishtirok/maxfiylik sozlamasi ("reytingda ko'rinish" tugmasi) — barcha foydalanuvchilar avtomatik ko'rinadi (foydalanuvchi tasdiqlagan qaror)
- Vaqt oralig'i bo'yicha reyting (masalan "bu yilgi eng ko'p o'qiganlar") — faqat barcha-vaqt (all-time) jami hisoblanadi
- Boshqa foydalanuvchining to'liq profilini ko'rish/bosib kirish — reyting jadvalidagi qatorlar bosilmaydigan (interaktiv bo'lmagan) matn sifatida qoladi
- Sahifalash (pagination) — top 20 bilan cheklanadi, "ko'proq ko'rsatish" tugmasi yo'q

## 3. Backend — `GET /leaderboard`

Yangi `app/modules/leaderboard/` modul (`router.py`, `service.py`, `schemas.py`, `__init__.py`), `stats` moduli namunasida.

**Endpoint:** `GET /leaderboard` — JWT autentifikatsiya talab qilinadi.

**Javob sxemasi:**
```python
class LeaderboardEntry(BaseModel):
    user_id: int
    username: str | None
    display_name: str | None
    last_name: str | None
    avatar_url: str | None
    total_finished: int

class MyRank(BaseModel):
    rank: int
    total_finished: int

class LeaderboardOut(BaseModel):
    top: list[LeaderboardEntry]
    my_rank: MyRank | None
```

**Hisoblash mantiqi:**
- `total_finished` — har bir foydalanuvchi uchun `status == "finished"` bo'lgan yozuvlar soni, `Entry.user_id` bo'yicha guruhlangan SQL agregatsiya (`GROUP BY`), `User` jadvali bilan `JOIN` qilib ism/avatar maydonlarini olish
- Faqat `total_finished > 0` bo'lgan foydalanuvchilar reytingga kiradi (`HAVING COUNT(*) > 0` yoki ekvivalent)
- Saralash: `total_finished DESC, user_id ASC` (tenglikda barqaror tartib)
- `top` — shu saralangan ro'yxatning birinchi 20 tasi
- `my_rank` — agar joriy foydalanuvchi `top`ning o'zida bo'lsa **yoki** uning `total_finished == 0` bo'lsa (reytingda umuman yo'q) — `null`. Aks holda: joriy foydalanuvchidan ko'proq kitob o'qigan (yoki teng sonda, lekin kichikroq `user_id`ga ega) foydalanuvchilar sonini hisoblab, `rank = shu son + 1` qilib topiladi

**Xatolik holatlari:** maxsus xatolik yo'q — bo'sh reyting uchun `top: []`, `my_rank: null` qaytadi (200 OK).

## 4. Frontend — Reyting sahifasida 2-tab

`RatingPage.tsx`ga tab holati qo'shiladi (`useState<"personal" | "leaderboard">("personal")`), URL/marshrut o'zgarmaydi.

**Tab tugmalari:** joriy sahifaning kartalar tepasida, ikkita tugma ("Mening statistikam" / "Reyting jadvali"), faol tab `bg-amber-800 text-white`, nofaol `bg-white text-stone-500` (mavjud pill-tugma uslubiga mos: `rounded-full`).

**Yangi `useLeaderboard()` hook** (`features/rating/useLeaderboard.ts`) — `useStats`/`useLibrary` bilan bir xil naqsh: `{ data, loading, error }`, `GET /leaderboard`, StrictMode `ignore`-guard.

`RatingPage` ikkala tab kontentini shart bilan (conditional render) ko'rsatadi: `{activeTab === "personal" ? <PersonalStats .../> : <LeaderboardTab />}`. `LeaderboardTab` komponentining o'zi faqat "Reyting jadvali" tab'i tanlanganda mount bo'ladi (React DOM'ga qo'shiladi), shu sababli `useLeaderboard()` effekti — va demak `GET /leaderboard` so'rovi — faqat foydalanuvchi shu tab'ni birinchi marta ochganda ishga tushadi, "Mening statistikam"da qolgan foydalanuvchi uchun bu so'rov umuman yuborilmaydi. Tabdan chiqib qaytilganda `LeaderboardTab` qayta mount bo'lgani uchun so'rov qaytadan yuboriladi (keshlash yo'q — boshqa barcha sahifalar bilan izchil).

**`LeaderboardTab.tsx` komponenti:**
- Yuklanish/xato — mavjud sahifalar bilan bir xil: `<p className="p-4 text-center text-stone-500">Yuklanmoqda...</p>` / `"Reytingni yuklab bo'lmadi."`
- Bo'sh holat (`top.length === 0`): `"Hali reyting jadvali bo'sh."`
- Ro'yxat: `rounded-xl bg-white shadow-sm` karta ichida, har bir qator: tartib raqami (`#1`, `#2`...), kichik doira avatar (40px, `ProfilePage`dagi `ProfileAvatar` bilan bir xil avatar+bosh-harf-zaxira naqshi, lekin kichikroq o'lchamda), ism (`[display_name, last_name].filter(Boolean).join(" ") || username || "?"` — `ProfilePage.tsx:108-109` bilan bir xil formula), o'ng tomonda `{total_finished} kitob`
- Agar `my_rank !== null`, ro'yxat ostida ajratuvchi chiziq bilan: `"Sizning o'rningiz: #{rank} — {total_finished} kitob"`

## 5. Ma'lumotlar oqimi

```
Foydalanuvchi "Reyting jadvali" tab'ini bosadi
  → LeaderboardTab render bo'ladi (yoki ko'rsatiladi)
  → useLeaderboard() effekti GET /leaderboard ni chaqiradi
  → backend barcha foydalanuvchilarning finished-yozuvlarini guruhlab sanaydi,
    top 20 + (agar kerak bo'lsa) joriy foydalanuvchi o'rnini hisoblaydi
  → LeaderboardOut JSON qaytadi
  → LeaderboardTab ro'yxatni + (agar mavjud bo'lsa) "sizning o'rningiz"ni render qiladi
```

Boshqa sahifalarga o'xshab, keshlash yo'q — har safar tab ochilganda/sahifa qayta mount bo'lganda yangi so'rov yuboriladi.

## 6. Test

**Backend (`backend/tests/test_leaderboard.py`):**
- Bo'sh holat (foydalanuvchilar bor, lekin hech kim kitob tugatmagan) → `top: []`, `my_rank: null`
- Bir nechta foydalanuvchi turli sonlarda kitob tugatgan → to'g'ri kamayish tartibida saralanadi
- Ikki foydalanuvchi bir xil sonda kitob tugatgan → `user_id` bo'yicha barqaror tartib
- Joriy foydalanuvchi top 20 ichida → `my_rank: null`
- 20 dan ortiq foydalanuvchi bor va joriy foydalanuvchi top 20'dan tashqarida → to'g'ri `rank` va `total_finished` qaytadi
- Joriy foydalanuvchi hali kitob tugatmagan → `my_rank: null` (reytingda umuman yo'q bo'lgani uchun)
- Autentifikatsiyasiz so'rov → 401

**Frontend (`RatingPage.test.tsx`ga qo'shimcha yoki yangi `LeaderboardTab.test.tsx`):**
- Tab almashtirish ishlaydi (bosilganda kontent almashadi)
- Ro'yxat to'g'ri tartibda va to'g'ri maydonlar bilan render bo'ladi
- `my_rank` mavjud bo'lganda ko'rsatiladi, `null` bo'lganda ko'rsatilmaydi
- Bo'sh holat matni to'g'ri ko'rsatiladi
