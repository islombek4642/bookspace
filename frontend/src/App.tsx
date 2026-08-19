import { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { TelegramAuthProvider, useAuth } from "./auth/TelegramAuthProvider";
import { ToastProvider } from "./components/ToastProvider";
import { BottomNav } from "./components/BottomNav";
import { VersionWatcher } from "./components/VersionWatcher";
import { LibraryPage } from "./features/library/LibraryPage";
import { FavoritesPage } from "./features/favorites/FavoritesPage";
import { AddBookPage } from "./features/entry-editor/AddBookPage";
import { EntryDetailPage } from "./features/entry-editor/EntryDetailPage";
import { ProfilePage } from "./features/profile/ProfilePage";
import { RatingPage } from "./features/rating/RatingPage";
import { t } from "./i18n/locale";

function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === "loading") {
    return <p className="p-4 text-center text-stone-500">Yuklanmoqda...</p>;
  }

  if (status === "error") {
    return <p className="p-4 text-center text-red-600">{t("error.session_expired")}</p>;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <div className="min-h-screen pb-16">
      <Routes>
        <Route path="/" element={<LibraryPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/rating" element={<RatingPage />} />
        <Route path="/add-book" element={<AddBookPage />} />
        <Route path="/read/:id" element={<EntryDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <VersionWatcher />
      <TelegramAuthProvider>
        <BrowserRouter>
          <AuthGate>
            <AppRoutes />
          </AuthGate>
        </BrowserRouter>
      </TelegramAuthProvider>
    </ToastProvider>
  );
}

export default App;
