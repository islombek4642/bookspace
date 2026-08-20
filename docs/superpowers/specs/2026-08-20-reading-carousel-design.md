# Kutubxona sahifasidagi "O'qilayotgan kitoblar" karuseli (dizayn)

**Sana:** 2026-08-20
**Holat:** Tasdiqlangan (implementatsiya rejasiga o'tishga tayyor)

## 1. Maqsad

Kutubxona sahifasining yuqori qismiga, mavjud kitoblar to'ridan oldin, foydalanuvchi hozir o'qiyotgan kitoblarni ko'rsatuvchi avtomatik aylanuvchi karusel qo'shish. Vizual ilhom — foydalanuvchi topib, loyiha papkasiga qo'ygan "Water Drop Card Slider" (Codehal) namunasi: `D:\BookSpace\card slider water drop\` (asl holatda odamlar profili — ism, kasb, baho — uchun mo'ljallangan, bu loyihada kitoblar uchun moslashtiriladi).

## 2. Qamrov

**Kiradi:**
- `frontend/src/features/library/ReadingCarousel.tsx` — yangi komponent, `LibraryPage.tsx`ning yuqorisida ko'rsatiladi
- `status === "reading"` bo'lgan yozuvlarni ko'rsatish (mavjud `/library` ma'lumotidan, yangi backend so'rov kerak emas)
- "Tomchi" (blob) shaklidagi muqova rasmi, neumorfik soya, amber-800 urg'u rangi
- Avtomatik aylanish (har 4 soniyada), qo'lda swipe ham ishlaydi
- Bir vaqtda 1 ta to'liq karta + keyingisining bir qismi ko'rinadi
- Bo'sh holat: `reading` statusli yozuv bo'lmasa, bo'lim umuman ko'rsatilmaydi

**Kiritilmaydi:**
- Yangi backend endpoint yoki so'rov — mavjud `/library` javobidan filtrlanadi
- Old/keyingi tugmalar (faqat swipe + pastdagi nuqtalar)
- Karusel tarkibini sozlash (masalan "reading" o'rniga boshqa filtr tanlash) — qattiq kodlangan

## 3. Arxitektura va dependency

Yangi npm paket: `swiper` (React uchun rasmiy `swiper/react` komponentlari — `Swiper`, `SwiperSlide` — va kerakli modullar, masalan `Autoplay`, `Pagination`, `swiper/modules`dan import qilinadi). Namunadagi vanilla-JS (`new Swiper(...)`, script.js) ishlatilmaydi — bu React komponent sifatida qayta quriladi.

`ReadingCarousel` komponenti `useLibrary(false)`ning natijasidan `status === "reading"` bo'lgan elementlarni filtrlaydi. `LibraryPage.tsx` allaqachon shu hookni chaqiradi (asosiy kitoblar to'ri uchun) — `ReadingCarousel` xuddi shu ma'lumotni qayta ishlatadi (yangi `useLibrary()` chaqiruvi, ya'ni yangi `/library` so'rovi, kerak emas — natija `LibraryPage`dan prop sifatida uzatiladi).

## 4. Vizual dizayn

**Karta:**
- Muqova rasmi: ~140-160px o'lchamdagi tomchi shaklida (`border-radius: 61% 39% 52% 48% / 44% 59% 41% 56%`, namunadagi qiymat), yumshoq soya bilan (`box-shadow` — neumorfik, oq/och fon uchun moslashtirilgan)
- Kitob nomi (qalin), muallif (kulrang, kichikroq)
- Yulduzli baho: faqat `rating !== null` bo'lganda ko'rsatiladi (5 ta yulduz, to'ldirilgan/bo'sh, amber-800 rangda). Baholanmagan kitoblarda bu qator umuman ko'rsatilmaydi (bo'sh joy qoldirilmaydi)
- "Batafsil" tugmasi (`rounded-full bg-amber-800 text-white`, mavjud tugma uslubiga mos)
- **Butun karta bosiladigan** (`Link to="/read/{entry_id}"`) — mobil ekranda kichik tugmani aniq bosishdan qulayroq, LibraryCard/TopRatedBooks bilan bir xil naqsh

**Ranglar:** namunadagi tasodifiy pushti/binafsha/to'q sariq ranglar ishlatilmaydi — barcha kartalarda bitta izchil `amber-800` urg'u rangi (loyihaning umumiy dizayn tiliga mos).

**Karusel sozlamalari (Swiper):**
```js
slidesPerView: 1.15
spaceBetween: 12
autoplay: { delay: 4000, disableOnInteraction: false }
pagination: { clickable: true }
modules: [Autoplay, Pagination]
```
`disableOnInteraction: false` — foydalanuvchi qo'lda surgandan keyin ham avtomatik aylanish davom etadi (to'xtab qolmaydi).

## 5. Ma'lumotlar oqimi

```
LibraryPage useLibrary(false) orqali barcha yozuvlarni oladi (mavjud oqim)
  → ReadingCarousel'ga items prop sifatida uzatiladi
  → ReadingCarousel items.filter(item => item.status === "reading")
  → agar natija bo'sh bo'lsa: hech narsa render qilinmaydi
  → aks holda: Swiper orqali kartalar ko'rsatiladi, avtomatik aylanadi
```

## 6. Test

`frontend/src/features/library/ReadingCarousel.test.tsx`:
- `status === "reading"` bo'lgan yozuvlarni to'g'ri filtrlab ko'rsatishini tekshirish (boshqa statusdagilar chiqmasligi)
- Baholangan kitobda yulduzlar ko'rsatilishini, baholanmaganda ko'rsatilmasligini tekshirish
- Bo'sh holatda (`reading` statusli yozuv yo'q) komponent hech narsa render qilmasligini tekshirish (`container.firstChild` yoki shunga o'xshash orqali)
- Har bir karta to'g'ri `/read/{entry_id}` havolasiga ega ekanligini tekshirish

`frontend/src/features/library/LibraryPage.test.tsx` (mavjud, kerak bo'lsa yangilanadi): `ReadingCarousel`ning `LibraryPage` ichida to'g'ri joyda (kartalar to'ridan oldin) render qilinishini tekshirish.

Swiper'ning haqiqiy animatsiyasi/avtomatik aylanish vaqti **jsdom testlarida tekshirilmaydi** (loyihada avval ham CSS layout/animatsiya faqat qurilmada tekshirilgan) — faqat DOM tuzilishi va ma'lumotlarning to'g'ri filtrlanishi/ko'rsatilishi tekshiriladi.
