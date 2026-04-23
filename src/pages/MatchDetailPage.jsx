import { Alert, Badge, Col, Container, Row } from "react-bootstrap";
import { Link, useParams } from "react-router-dom";
import FavoriteButton from "../components/FavoriteButton";
import LiveBadge from "../components/LiveBadge";
import LoadingSpinner from "../components/LoadingSpinner";
import Scoreboard from "../components/Scoreboard";
import { useMatch } from "../hooks/useMatch";
import { formatMatchTime } from "../utils/formatDate";

function DetailTeam({ team }) {
  return (
    <div className="detail-team">
      <img src={team?.logoUrl} alt={`${team?.name || "Team"} logo`} />
      <h2>{team?.name || "TBD"}</h2>
      <FavoriteButton teamId={team?.id} />
    </div>
  );
}

export default function MatchDetailPage() {
  const { matchId } = useParams();
  const { match, loading, error } = useMatch(matchId);

  if (loading) {
    return (
      <Container>
        <LoadingSpinner label="Loading match detail" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert variant="danger">Could not load this match. {error.message}</Alert>
      </Container>
    );
  }

  if (!match) {
    return (
      <Container>
        <Alert variant="warning">Match not found. Return to <Link to="/matches">matches</Link>.</Alert>
      </Container>
    );
  }

  return (
    <Container>
      <div className="detail-panel">
        <div className="detail-meta">
          <span className="eyebrow">{match.eventName || "Unknown event"}</span>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <LiveBadge status={match.status} />
            <Badge bg="dark" className="text-capitalize">
              {match.status}
            </Badge>
            <Badge bg="secondary">{match.format || "bo3"}</Badge>
          </div>
        </div>

        <Row className="align-items-center g-4">
          <Col md={5}>
            <DetailTeam team={match.team1} />
          </Col>
          <Col md={2} className="text-center">
            <div className="detail-vs">vs</div>
            <div className="match-time">{formatMatchTime(match.startTime, { weekday: "short", year: "numeric" })}</div>
          </Col>
          <Col md={5}>
            <DetailTeam team={match.team2} />
          </Col>
        </Row>

        <Scoreboard match={match} showMaps />
      </div>
    </Container>
  );
}
