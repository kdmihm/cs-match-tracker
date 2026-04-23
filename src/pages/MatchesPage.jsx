import { useMemo, useState } from "react";
import { Container } from "react-bootstrap";
import MatchFilters from "../components/MatchFilters";
import MatchList from "../components/MatchList";
import { useMatches } from "../hooks/useMatches";

function matchesSearch(match, search) {
  if (!search) return true;

  const haystack = [match.eventName, match.team1?.name, match.team2?.name].filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(search.toLowerCase());
}

export default function MatchesPage() {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const { matches, loading, error } = useMatches(status);

  const events = useMemo(() => {
    return Array.from(new Set(matches.map((match) => match.eventName).filter(Boolean))).sort();
  }, [matches]);

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => matchesSearch(match, search) && (!eventFilter || match.eventName === eventFilter));
  }, [eventFilter, matches, search]);

  return (
    <Container>
      <div className="page-heading">
        <span className="eyebrow">Browse</span>
        <h1>Matches</h1>
        <p>Filter the synced Firestore feed by match state, team, or event.</p>
      </div>

      <MatchFilters
        status={status}
        onStatusChange={setStatus}
        search={search}
        onSearchChange={setSearch}
        eventFilter={eventFilter}
        onEventFilterChange={setEventFilter}
        events={events}
      />

      <MatchList matches={filteredMatches} loading={loading} error={error} emptyMessage="No matches match those filters." />
    </Container>
  );
}
