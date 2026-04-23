import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppNavbar from "./components/Navbar";
import FavoritesPage from "./pages/FavoritesPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import MatchDetailPage from "./pages/MatchDetailPage";
import MatchesPage from "./pages/MatchesPage";
import TeamsPage from "./pages/TeamsPage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <AppNavbar />
        <main className="page-shell">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/matches" element={<MatchesPage />} />
            <Route path="/matches/:matchId" element={<MatchDetailPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
