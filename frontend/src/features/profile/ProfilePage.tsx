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
        className="h-20 w-20 rounded-full object-cover shadow-sm"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={name}
      className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-800 text-2xl font-semibold text-white shadow-sm"
    >
      {initial}
    </div>
  );
}

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
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
    } catch {
      setError("Saqlashda xatolik yuz berdi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-4">
        <ProfileAvatar
          avatarUrl={profile.avatar_url}
          name={profile.display_name ?? profile.username ?? "?"}
        />
        <h1 className="text-xl font-bold">{profile.display_name ?? profile.username}</h1>
      </div>

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

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-full bg-amber-800 px-4 py-2 text-white transition-colors hover:bg-amber-900 active:scale-[0.98] disabled:opacity-50"
        >
          Saqlash
        </button>
      </form>
    </div>
  );
}
