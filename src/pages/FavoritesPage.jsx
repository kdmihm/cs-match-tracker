import { Alert, Container } from "react-bootstrap";
import { Link } from "react-router-dom";
import MatchList from "../components/MatchList";
import { useAuth } from "../hooks/useAuth";
import { useFavoriteMatches } from "../hooks/useFavoriteMatches";
import { useFavorites } from "../hooks/useFavorites";

export default function FavoritesPage() {
  const { currentUser } = useAuth();
  const { favoriteTeamIds } = useFavorites();
  const favoriteMatches = useFavoriteMatches();

  if (!currentUser) {
    return (
      <Container>
        <Alert variant="warning">
          Please <Link to="/login">login</Link> to manage favorite teams and see your personalized match feed.
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <div className="page-heading">
        <span className="eyebrow">Personalized</span>
        <h1>Favorite Matches</h1>
        <p>Live, upcoming, and recent matches involving your favorite teams.</p>
      </div>

      {!favoriteTeamIds.length ? (
        <Alert variant="info">
          You have not favorited any teams yet. Visit the <Link to="/teams">teams page</Link> to build your feed.
        </Alert>
      ) : (
        <MatchList {...favoriteMatches} emptyMessage="No matches found for your favorite teams yet." />
      )}
    </Container>
  );
}
