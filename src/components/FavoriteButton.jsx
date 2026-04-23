import { Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useFavorites } from "../hooks/useFavorites";

export default function FavoriteButton({ teamId, size = "sm" }) {
  const { isAuthenticated, isFavorite, toggleFavorite, updatingTeamId } = useFavorites();
  const navigate = useNavigate();

  if (!teamId) return null;

  const active = isFavorite(teamId);
  const isUpdating = updatingTeamId === teamId;

  async function handleClick(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    await toggleFavorite(teamId);
  }

  return (
    <Button
      variant={active ? "warning" : "outline-warning"}
      size={size}
      className="favorite-button"
      onClick={handleClick}
      disabled={isUpdating}
    >
      {active ? "Favorited" : "Favorite"}
    </Button>
  );
}
