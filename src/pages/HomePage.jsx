import { Col, Container, Row } from "react-bootstrap";
import MatchList from "../components/MatchList";
import { useMatches } from "../hooks/useMatches";
import { isToday } from "../utils/formatDate";

function Section({ title, kicker, children }) {
  return (
    <section className="content-section">
      <div className="section-heading">
        <span>{kicker}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function HomePage() {
  const live = useMatches("live", 5);
  const upcoming = useMatches("upcoming", 20);
  const recent = useMatches("finished", 10);

  const upcomingToday = {
    ...upcoming,
    matches: upcoming.matches.filter((match) => isToday(match.startTime)).slice(0, 10),
  };

  return (
    <Container>
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Professional Counter-Strike 2</span>
          <h1>Track live scores, upcoming fixtures, and results without leaving Firestore.</h1>
          <p>
            Synced match data stays behind Firebase Cloud Functions, giving the app a fast realtime frontend without
            exposing external API credentials.
          </p>
        </div>
      </section>

      <Row className="g-4">
        <Col lg={7}>
          <Section title="Live Matches" kicker="Now">
            <MatchList {...live} emptyMessage="No professional CS2 matches are live right now." />
          </Section>
        </Col>
        <Col lg={5}>
          <Section title="Today Upcoming" kicker="Next">
            <MatchList {...upcomingToday} emptyMessage="No more upcoming matches today." />
          </Section>
        </Col>
      </Row>

      <Section title="Recent Results" kicker="Finals">
        <MatchList {...recent} emptyMessage="No recent results have been synced yet." />
      </Section>
    </Container>
  );
}
