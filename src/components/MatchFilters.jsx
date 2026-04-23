import { ButtonGroup, Form, ToggleButton } from "react-bootstrap";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "upcoming", label: "Upcoming" },
  { value: "finished", label: "Results" },
];

export default function MatchFilters({ status, onStatusChange, search, onSearchChange, eventFilter, onEventFilterChange, events }) {
  return (
    <div className="filters-panel">
      <Form.Control
        type="search"
        placeholder="Search by team or event"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <Form.Select value={eventFilter} onChange={(event) => onEventFilterChange(event.target.value)} aria-label="Filter by event">
        <option value="">All events</option>
        {events.map((eventName) => (
          <option key={eventName} value={eventName}>
            {eventName}
          </option>
        ))}
      </Form.Select>
      <ButtonGroup className="filter-tabs">
        {FILTERS.map((filter) => (
          <ToggleButton
            key={filter.value}
            id={`status-${filter.value}`}
            type="radio"
            variant={status === filter.value ? "warning" : "outline-light"}
            name="status"
            value={filter.value}
            checked={status === filter.value}
            onChange={(event) => onStatusChange(event.currentTarget.value)}
          >
            {filter.label}
          </ToggleButton>
        ))}
      </ButtonGroup>
    </div>
  );
}
