import React, { useState } from "react";
import axios from "axios";

function LoginModal({ onClose, onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = isRegister ? "http://127.0.0.1:5000/register" : "http://127.0.0.1:5000/login";
      const payload = isRegister ? { username, email, password } : { email, password };

      const res = await axios.post(url, payload);
      if (res.data.success) {
        if (!isRegister) {
          onLoginSuccess(res.data); // pass trial info to parent
        }
        onClose();
      } else {
        setError(res.data.message);
      }
    } catch (err) {
      setError("Server error, try again later");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{isRegister ? "Register" : "Login"}</h2>
        <form onSubmit={handleSubmit}>
          {isRegister && (
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? "Processing..." : isRegister ? "Register" : "Login"}
          </button>
        </form>
        <p onClick={() => setIsRegister(!isRegister)} className="toggle-link">
          {isRegister ? "Already have an account? Login" : "Don't have an account? Register"}
        </p>
      </div>
    </div>
  );
}

export default LoginModal;