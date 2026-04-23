import { useState } from "react";
import { Alert, Button, Card, Container, Form } from "react-bootstrap";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { loginWithEmail, registerWithEmail } from "../services/auth";

export default function LoginPage() {
  const [mode, setMode] = useState("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  if (currentUser) {
    return <Navigate to="/favorites" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (mode === "register") {
        await registerWithEmail(email, password, displayName);
      } else {
        await loginWithEmail(email, password);
      }
      navigate("/favorites");
    } catch (authError) {
      setError(authError.message || "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container className="login-container">
      <Card className="login-card">
        <Card.Body>
          <span className="eyebrow">Account</span>
          <h1>{mode === "login" ? "Login" : "Create account"}</h1>
          <p>Use email/password auth to save favorite teams.</p>

          {error ? <Alert variant="danger">{error}</Alert> : null}

          <Form onSubmit={handleSubmit}>
            {mode === "register" ? (
              <Form.Group className="mb-3" controlId="displayName">
                <Form.Label>Display name</Form.Label>
                <Form.Control value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
              </Form.Group>
            ) : null}

            <Form.Group className="mb-3" controlId="email">
              <Form.Label>Email</Form.Label>
              <Form.Control type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </Form.Group>

            <Form.Group className="mb-4" controlId="password">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Form.Group>

            <Button type="submit" variant="warning" disabled={submitting} className="w-100">
              {submitting ? "Working..." : mode === "login" ? "Login" : "Create account"}
            </Button>
          </Form>

          <Button variant="link" className="auth-mode-toggle" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Need an account? Register" : "Already have an account? Login"}
          </Button>
        </Card.Body>
      </Card>
    </Container>
  );
}
