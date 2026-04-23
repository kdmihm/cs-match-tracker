import { Spinner } from "react-bootstrap";

export default function LoadingSpinner({ label = "Loading" }) {
  return (
    <div className="loading-state">
      <Spinner animation="border" role="status" />
      <span>{label}</span>
    </div>
  );
}
