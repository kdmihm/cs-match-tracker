import { useMemo, useState } from "react";
import { Alert, Container, Form } from "react-bootstrap";
import LoadingSpinner from "../components/LoadingSpinner";
import TeamCard from "../components/TeamCard";
import { useTeams } from "../hooks/useTeams";

export default function TeamsPage() {
  const [search, setSearch] = useState("");
  const { teams, loading, error } = useTeams();

  const filteredTeams = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    const sortedTeams = teams
      .filter((team) => team.isTop50Team || (team.isRankedTeam && team.hltvRank <= 50))
      .sort((a, b) => (a.hltvRank || 999) - (b.hltvRank || 999));

    if (!searchValue) {
      return sortedTeams;
    }

    return sortedTeams.filter((team) =>
      [team.name, team.region, team.slug, team.rankingName, ...(team.rankingAliases || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchValue),
    );
  }, [search, teams]);

  return (
    <Container>
      <div className="page-heading">
        <span className="eyebrow">Teams</span>
        <h1>Top 50 teams</h1>
        <p>Only teams currently marked in the top 50 are shown here and used for match feeds.</p>
      </div>

      <Form.Control
        type="search"
        className="search-control"
        placeholder="Search teams by name or region"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {loading ? <LoadingSpinner label="Loading teams" /> : null}
      {error ? <Alert variant="danger">Could not load teams. {error.message}</Alert> : null}
      {!loading && !error && filteredTeams.length === 0 ? <div className="empty-state">No teams found.</div> : null}
      <div className="team-grid">
        {filteredTeams.map((team) => (
          <TeamCard key={team.id} team={team} />
        ))}
      </div>
    </Container>
  );
}
