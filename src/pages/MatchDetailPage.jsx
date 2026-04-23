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

function getWinner(match) {
  if (!match?.winnerId) return null;
  if (match.winnerId === match?.team1?.id) return match.team1;
  if (match.winnerId === match?.team2?.id) return match.team2;
  return null;
}

function getMapWinnerName(map, match) {
  if (!map?.winnerId) return "Winner unavailable";
  if (map.winnerId === match?.team1?.id) return match.team1?.name || "Team 1";
  if (map.winnerId === match?.team2?.id) return match.team2?.name || "Team 2";
  return "Winner unavailable";
}

function getMapTitle(map, index) {
  return map?.position ? `Map ${map.position}` : `Map ${index + 1}`;
}

function getMapName(map, index) {
  const fallbackName = getMapTitle(map, index);
  if (!map?.name || map.name === fallbackName) {
    return "Map name unavailable";
  }

  return map.name;
}

function getMapScore(map) {
  if (!map?.hasScore) {
    return "Score unavailable";
  }

  return `${map.team1Score ?? 0} - ${map.team2Score ?? 0}`;
}

export default function MatchDetailPage() {
  const { matchId } = useParams();
  const { match, loading, error } = useMatch(matchId);
  const winner = getWinner(match);
  const playedMaps = (match?.maps || []).filter((map) => map?.status !== "upcoming");

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

        <Scoreboard match={match} />

        <div className="detail-summary-grid">
          <div className="detail-summary-card">
            <span className="eyebrow">Series</span>
            <strong>
              {match.score?.team1 ?? 0} - {match.score?.team2 ?? 0}
            </strong>
            <p>{match.status === "finished" ? "Final map count" : "Current series score"}</p>
          </div>

          <div className="detail-summary-card">
            <span className="eyebrow">Winner</span>
            <strong>{winner?.name || (match.status === "finished" ? "Unknown" : "Pending")}</strong>
            <p>{match.status === "finished" ? "Series winner" : "Will update when match ends"}</p>
          </div>

          <div className="detail-summary-card">
            <span className="eyebrow">Played Maps</span>
            <strong>{playedMaps.length}</strong>
            <p>{match.format ? `${match.format.toUpperCase()} scheduled` : "Best-of series"}</p>
          </div>
        </div>

        {match.status === "finished" ? (
          <section className="detail-section">
            <div className="section-heading">
              <span>Breakdown</span>
              <h2>Maps Played</h2>
            </div>

            {playedMaps.length > 0 ? (
              <div className="map-breakdown-grid">
                {playedMaps.map((map, index) => (
                  <article className="map-breakdown-card" key={`${match.id}-${map.position || index}`}>
                    <div className="map-breakdown-header">
                      <span className="map-chip">{getMapTitle(map, index)}</span>
                      <span className="map-status text-capitalize">{map.status || "finished"}</span>
                    </div>
                    <h3>{getMapName(map, index)}</h3>
                    <div className="map-scoreline">{getMapScore(map)}</div>
                    <p className="map-winner-copy">{getMapWinnerName(map, match)} won this map.</p>
                    {!map.hasScore ? (
                      <p className="map-meta-copy">The current PandaScore plan does not include the final round score for this map.</p>
                    ) : null}
                    {map.forfeit ? <p className="map-meta-copy">This map result was recorded as a forfeit.</p> : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="detail-empty-card">
                This match finished, but no per-map results were included in the synced fixture payload.
              </div>
            )}
          </section>
        ) : null}

        <section className="detail-section">
          <div className="section-heading">
            <span>Players</span>
            <h2>Player Stats</h2>
          </div>
          <div className="detail-empty-card">
            Player-level post-match stats are not available on the current PandaScore plan, so this page can only show the
            series result and map-by-map fixture data.
          </div>
        </section>
      </div>
    </Container>
  );
}
