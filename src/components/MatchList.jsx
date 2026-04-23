import { Alert } from "react-bootstrap";
import LoadingSpinner from "./LoadingSpinner";
import MatchCard from "./MatchCard";

export default function MatchList({ matches, loading, error, emptyMessage = "No matches found." }) {
  if (loading) return <LoadingSpinner label="Loading matches" />;

  if (error) {
    return (
      <Alert variant="danger">
        Could not load matches. {error.message ? `Firebase says: ${error.message}` : "Please try again later."}
      </Alert>
    );
  }

  if (!matches.length) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="match-list">
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} />
      ))}
    </div>
  );
}
