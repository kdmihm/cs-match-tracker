import { Badge, Card } from "react-bootstrap";
import { Link } from "react-router-dom";
import { formatMatchTime } from "../utils/formatDate";
import FavoriteButton from "./FavoriteButton";
import LiveBadge from "./LiveBadge";
import Scoreboard from "./Scoreboard";

function TeamLogo({ team }) {
  return <img className="team-logo" src={team?.logoUrl} alt={`${team?.name || "Team"} logo`} loading="lazy" />;
}

export default function MatchCard({ match }) {
  return (
    <Card as={Link} to={`/matches/${match.id}`} className="match-card text-decoration-none">
      <Card.Body>
        <div className="match-card-header">
          <div>
            <div className="eyebrow">{match.eventName || "Unknown event"}</div>
            <div className="match-time">{formatMatchTime(match.startTime)}</div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <LiveBadge status={match.status} />
            <Badge bg={match.status === "finished" ? "secondary" : "primary"} className="text-capitalize">
              {match.status}
            </Badge>
          </div>
        </div>

        <div className="teams-line">
          <div className="team-side">
            <TeamLogo team={match.team1} />
            <span>{match.team1?.name || "TBD"}</span>
            <FavoriteButton teamId={match.team1?.id} />
          </div>
          <span className="versus">vs</span>
          <div className="team-side justify-content-end">
            <FavoriteButton teamId={match.team2?.id} />
            <span>{match.team2?.name || "TBD"}</span>
            <TeamLogo team={match.team2} />
          </div>
        </div>

        <Scoreboard match={match} />
      </Card.Body>
    </Card>
  );
}
