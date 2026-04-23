import { Badge } from "react-bootstrap";

export default function LiveBadge({ status }) {
  if (status !== "live") return null;

  return (
    <Badge bg="danger" className="live-badge">
      LIVE
    </Badge>
  );
}
