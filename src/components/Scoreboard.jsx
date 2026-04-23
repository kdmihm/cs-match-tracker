import { Badge, Table } from "react-bootstrap";

export default function Scoreboard({ match, showMaps = false }) {
  const score = match?.score || { team1: 0, team2: 0 };
  const isPending = match?.status === "upcoming";
  const team1Won = match?.status === "finished" && match?.winnerId && match.winnerId === match?.team1?.id;
  const team2Won = match?.status === "finished" && match?.winnerId && match.winnerId === match?.team2?.id;

  return (
    <div className="scoreboard">
      <div className="score-row">
        <div className="team-score">
          <span>{match?.team1?.name || "TBD"}</span>
          <strong className={team1Won ? "winner-score" : undefined}>{isPending ? "-" : score.team1 ?? 0}</strong>
        </div>
        <Badge bg={match?.status === "finished" ? "secondary" : "dark"}>{match?.format || "bo3"}</Badge>
        <div className="team-score team-score-right">
          <strong className={team2Won ? "winner-score" : undefined}>{isPending ? "-" : score.team2 ?? 0}</strong>
          <span>{match?.team2?.name || "TBD"}</span>
        </div>
      </div>

      {showMaps && match?.maps?.length > 0 ? (
        <Table responsive borderless size="sm" className="map-table mt-3 mb-0">
          <thead>
            <tr>
              <th>Map</th>
              <th className="text-center">{match.team1?.name || "Team 1"}</th>
              <th className="text-center">{match.team2?.name || "Team 2"}</th>
              <th className="text-end">Status</th>
            </tr>
          </thead>
          <tbody>
            {match.maps.map((map, index) => (
              <tr key={`${map.name}-${index}`}>
                <td>{map.name}</td>
                <td className="text-center">{map.team1Score ?? 0}</td>
                <td className="text-center">{map.team2Score ?? 0}</td>
                <td className="text-end text-capitalize">{map.status}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : null}
    </div>
  );
}
