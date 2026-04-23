import { Card } from "react-bootstrap";
import FavoriteButton from "./FavoriteButton";

export default function TeamCard({ team }) {
  return (
    <Card className="team-card">
      <Card.Body>
        <img className="team-card-logo" src={team.logoUrl} alt={`${team.name} logo`} loading="lazy" />
        <div className="team-card-copy">
          <h3>{team.name}</h3>
          <p>{team.region || "Unknown region"}</p>
        </div>
        <FavoriteButton teamId={team.id} />
      </Card.Body>
    </Card>
  );
}
