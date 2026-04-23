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
    if (!searchValue) return teams;

    return teams.filter((team) => [team.name, team.region].filter(Boolean).join(" ").toLowerCase().includes(searchValue));
  }, [search, teams]);

  return (
    <Container>
      <div className="page-heading">
        <span className="eyebrow">Teams</span>
        <h1>Find and favorite teams</h1>
        <p>Your favorites power the personalized match feed.</p>
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
