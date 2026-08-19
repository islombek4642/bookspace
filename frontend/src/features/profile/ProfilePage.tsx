import { FormEvent, useEffect, useState } from "react";
import { apiClient } from "../../api/client";

interface Profile {
  id: number;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  reading_since: string | null;
  favorite_genre_keys: string[];
}

function ProfileAvatar({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  if (avatarUrl && !imgFailed) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="h-24 w-24 rounded-full object-cover shadow-sm"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={name}
      className="flex h-24 w-24 items-center justify-center rounded-full bg-amber-800 text-3xl font-semibold text-white shadow-sm"
    >
      {initial}
    </div>
  );
}

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
}

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setLoadError(false);
    apiClient
      .get<Profile>("/users/me")
      .then((data) => {
        if (!ignore) setProfile(data);
      })
      .catch(() => {
        if (!ignore) setLoadError(true);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  if (loading) {
    return <p className="p-4 text-center text-stone-500">Yuklanmoqda...</p>;
  }

  if (loadError || !profile) {
    return <p className="p-4 text-center text-stone-500">Profilni yuklab bo'lmadi.</p>;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const genreKeys = (formData.get("favorite_genre_keys") as string)
      .split(",")
      .map((key) => key.trim())
      .filter(Boolean);

    try {
      const updated = await apiClient.patch<Profile>("/users/me", {
        bio: (formData.get("bio") as string) || null,
        reading_since: (formData.get("reading_since") as string) || null,
        favorite_genre_keys: genreKeys,
      });
      setProfile(updated);
      setIsEditing(false);
    } catch {
      setError("Saqlashda xatolik yuz berdi.");
    } finally {
      setSaving(false);
    }
  }

  const displayName = profile.display_name ?? profile.username ?? "?";

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col items-center gap-1 text-center">
        <ProfileAvatar avatarUrl={profile.avatar_url} name={displayName} />
        <h1 className="mt-2 text-xl font-bold">{displayName}</h1>
        {profile.username && <p className="text-sm text-stone-500">@{profile.username}</p>}
      </div>

      {!isEditing ? (
        <div className="space-y-4">
          <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                O'zi haqida
              </p>
              <p className="mt-1 text-stone-700">{profile.bio || "Kiritilmagan"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Qachondan beri kitob o'qiydi
              </p>
              <p className="mt-1 text-stone-700">
                {profile.reading_since ? formatDate(profile.reading_since) : "Kiritilmagan"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Sevimli janrlar
              </p>
              {profile.favorite_genre_keys.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-2">
                  {profile.favorite_genre_keys.map((key) => (
                    <span
                      key={key}
                      className="rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-800"
                    >
                      {key}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-stone-700">Kiritilmagan</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="w-full rounded-full bg-amber-800 px-4 py-2 text-white transition-colors hover:bg-amber-900 active:scale-[0.98]"
          >
            Tahrirlash
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="profile-bio" className="mb-1 block text-sm font-medium text-stone-700">
              O'zingiz haqingizda
            </label>
            <textarea
              id="profile-bio"
              name="bio"
              defaultValue={profile.bio ?? ""}
              placeholder="O'zingiz haqingizda qisqacha yozing..."
              className="w-full rounded-xl border border-stone-300 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="profile-reading-since" className="mb-1 block text-sm font-medium text-stone-700">
              Qachondan beri kitob o'qiysiz
            </label>
            <input
              id="profile-reading-since"
              type="date"
              name="reading_since"
              defaultValue={profile.reading_since ?? ""}
              className="w-full rounded-xl border border-stone-300 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="profile-genres" className="mb-1 block text-sm font-medium text-stone-700">
              Sevimli janrlar (vergul bilan ajrating)
            </label>
            <input
              id="profile-genres"
              name="favorite_genre_keys"
              defaultValue={profile.favorite_genre_keys.join(", ")}
              placeholder="fantasy, classic"
              className="w-full rounded-xl border border-stone-300 px-3 py-2"
            />
          </div>

          {error && <p className="text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setIsEditing(false);
              }}
              disabled={saving}
              className="flex-1 rounded-full border border-stone-300 px-4 py-2 text-stone-700 transition-colors hover:bg-stone-100 disabled:opacity-50"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-full bg-amber-800 px-4 py-2 text-white transition-colors hover:bg-amber-900 active:scale-[0.98] disabled:opacity-50"
            >
              Saqlash
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
