import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Shows Telegram Mini App's native back button (top-left, in the header
// Telegram itself renders) for as long as the calling page is mounted, and
// wires it to browser-style back navigation -- for drill-in pages like a
// book's detail view, reached by tapping a card rather than a bottom-nav
// tab, so there's otherwise no way back except closing the whole app.
export function useTelegramBackButton() {
  const navigate = useNavigate();

  useEffect(() => {
    const backButton = window.Telegram?.WebApp?.BackButton;
    if (!backButton) return;

    function handleBack() {
      navigate(-1);
    }

    backButton.show();
    backButton.onClick(handleBack);

    return () => {
      backButton.offClick(handleBack);
      backButton.hide();
    };
  }, [navigate]);
}
