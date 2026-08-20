import { Star } from "lucide-react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { Autoplay, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import { LibraryItem } from "./useLibrary";

import "swiper/css";
import "swiper/css/pagination";

const BLOB_RADIUS = "61% 39% 52% 48% / 44% 59% 41% 56%";

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`Baho: ${rating}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={`h-3.5 w-3.5 ${i < rating ? "fill-amber-800 text-amber-800" : "fill-none text-stone-300"}`}
        />
      ))}
    </div>
  );
}

export function ReadingCarousel({ items }: { items: LibraryItem[] }) {
  const reading = items.filter((item) => item.status === "reading");

  if (reading.length === 0) {
    return null;
  }

  return (
    <Swiper
      modules={[Autoplay, Pagination]}
      slidesPerView={1.2}
      centeredSlides
      spaceBetween={12}
      autoplay={{ delay: 4000, disableOnInteraction: false }}
      pagination={{ clickable: true }}
      style={{ "--swiper-pagination-color": "#92400e" } as CSSProperties}
      className="px-4 pb-8 pt-4"
    >
      {reading.map((item) => (
        <SwiperSlide key={item.entry_id}>
          <Link
            to={`/read/${item.entry_id}`}
            className="flex flex-col items-center gap-3 rounded-2xl bg-white p-5 text-center shadow-sm"
          >
            {item.book_cover_url ? (
              <img
                src={item.book_cover_url}
                alt={item.book_title}
                className="h-36 w-36 object-cover shadow-[inset_10px_10px_15px_rgba(0,0,0,0.05),5px_15px_20px_rgba(0,0,0,0.08)]"
                style={{ borderRadius: BLOB_RADIUS }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div
                className="flex h-36 w-36 items-center justify-center bg-stone-100 text-stone-400"
                style={{ borderRadius: BLOB_RADIUS }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-10 w-10">
                  <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 0 4 22V5.5Z" />
                  <path d="M4 19a2.5 2.5 0 0 1 2.5-2.5H19" />
                </svg>
              </div>
            )}

            <div>
              <p className="font-semibold text-stone-900">{item.book_title}</p>
              {item.book_author && <p className="text-sm text-stone-500">{item.book_author}</p>}
            </div>

            {item.rating !== null && <RatingStars rating={item.rating} />}

            <span className="rounded-full bg-amber-800 px-5 py-1.5 text-sm text-white">Batafsil</span>
          </Link>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
