import { Button, Container, Nav, Navbar } from "react-bootstrap";
import { NavLink, useNavigate } from "react-router-dom";
import { logout } from "../services/auth";
import { useAuth } from "../hooks/useAuth";

export default function AppNavbar() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <Navbar expand="lg" className="app-navbar" variant="dark">
      <Container>
        <Navbar.Brand as={NavLink} to="/" className="brand-mark">
          CS2 Match Tracker
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-nav" />
        <Navbar.Collapse id="main-nav">
          <Nav className="ms-auto align-items-lg-center gap-lg-2">
            <Nav.Link as={NavLink} to="/matches">
              Matches
            </Nav.Link>
            <Nav.Link as={NavLink} to="/teams">
              Teams
            </Nav.Link>
            <Nav.Link as={NavLink} to="/favorites">
              Favorites
            </Nav.Link>
            {currentUser ? (
              <div className="d-flex align-items-center gap-2 mt-3 mt-lg-0">
                <span className="user-pill">{userProfile?.displayName || currentUser.email}</span>
                <Button size="sm" variant="outline-light" onClick={handleLogout}>
                  Sign out
                </Button>
              </div>
            ) : (
              <Button as={NavLink} to="/login" size="sm" variant="warning" className="mt-3 mt-lg-0">
                Login
              </Button>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
