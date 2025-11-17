import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import Research from "./components/Research";
import "./App.css";

// HomePage Component
function HomePage({ user, onLoginSuccess, onLogout, onShowLoginModal }) {
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [explanation, setExplanation] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);

  const formRef = useRef(null);
  const resultRef = useRef(null);
  const location = useLocation();

  const sampleNews = [
    { text: "WASHINGTON (Reuters) - Trump campaign adviser George Papadopoulos told an Australian diplomat in May 2016 that Russia had political dirt on Democratic presidential candidate Hillary Clinton, the New York Times reported on Saturday. The conversation between Papadopoulos and the diplomat, Alexander Downer, in London was a driving factor behind the FBI's decision to open a counter-intelligence investigation of Moscow's contacts with the Trump campaign, the Times reported. Two months after the meeting, Australian officials passed the information that came from Papadopoulos to their American counterparts when leaked Democratic emails began appearing online, according to the newspaper, which cited four current and former U.S. and foreign officials. Besides the information from the Australians, the probe by the Federal Bureau of Investigation was also propelled by intelligence from other friendly governments, including the British and Dutch, the Times said. Papadopoulos, a Chicago-based international energy lawyer, pleaded guilty on Oct. 30 to lying to FBI agents about contacts with people who claimed to have ties to top Russian officials. It was the first criminal charge alleging links between the Trump campaign and Russia. The White House has played down the former aide's campaign role, saying it was \"extremely limited\" and that any actions he took would have been on his own. The New York Times, however, reported that Papadopoulos helped set up a meeting between then-candidate Donald Trump and Egyptian President Abdel Fattah al-Sisi and edited the outline of Trump's first major foreign policy speech in April 2016. The federal investigation, which is now being led by Special Counsel Robert Mueller, has hung over Trump's White House since he took office almost a year ago. Some Trump allies have recently accused Mueller's team of being biased against the Republican president. Lawyers for Papadopoulos did not immediately respond to requests by Reuters for comment. Mueller's office declined to comment. Trump's White House attorney, Ty Cobb, declined to comment on the New York Times report. \"Out of respect for the special counsel and his process, we are not commenting on matters such as this,\" he said in a statement. Mueller has charged four Trump associates, including Papadopoulos, in his investigation. Russia has denied interfering in the U.S. election and Trump has said there was no collusion between his campaign and Moscow. ", label: "Real" },
    { text: "Donald Trump has made a habit of embarrassing America in front of other world leaders, but on Monday he outdid himself.", label: "Fake" }
  ];

  // Handle section scrolling when coming from other pages
  useEffect(() => {
    const scrollToSection = sessionStorage.getItem('scrollToSection');
    if (scrollToSection) {
      setTimeout(() => {
        const element = document.getElementById(scrollToSection);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
        sessionStorage.removeItem('scrollToSection');
      }, 500);
    }
  }, [location]);

  // Reset analysis when user logs out
  useEffect(() => {
    if (!user) {
      setResult("");
      setConfidence(0);
      setAnalysisHistory([]);
      setExplanation(null);
      setShowExplanation(false);
    }
  }, [user]);

  const handleStartDetection = () => {
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleCheckAuthClick = (e) => {
    e.preventDefault();
    
    if (!text.trim()) {
      setError("Please enter some text to analyze");
      return;
    }
    
    if (!user) {
      onShowLoginModal();
      return;
    }
    
    handleSubmit(e);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      setError("Please enter some text to analyze");
      return;
    }
    
    setIsLoading(true);
    setError("");
    setResult("");
    setConfidence(0);
    setExplanation(null);
    setShowExplanation(false);

    try {
      const response = await axios.post("http://127.0.0.1:5000/predict", { 
        text: text 
      }, {
        timeout: 15000
      });
      
      console.log(" RAW RESPONSE:", response);
      console.log(" RESPONSE DATA:", response.data);
      
      if (response.data.error) {
        setError(response.data.error);
        return;
      }

      if (response.data.message) {
        setResult("Uncertain");
        setConfidence(50.0);
        setError(response.data.message);
        return;
      }

      const predLabel = response.data.prediction
        ? response.data.prediction.charAt(0).toUpperCase() + response.data.prediction.slice(1)
        : "Unknown";
      
      const conf = response.data.confidence_percent;

      // DEBUG LOGGING
      console.log(" Prediction Label:", predLabel);
      console.log(" Confidence from backend:", conf);
      console.log(" Type:", typeof conf);
      console.log(" Full confidence_percent:", response.data.confidence_percent);

      // CRITICAL: Check if conf is actually a number
      if (conf === undefined || conf === null || isNaN(conf)) {
        console.error(" Invalid confidence value!", conf);
        setError("Invalid confidence value from server");
        return;
      }

      setResult(predLabel);
      setConfidence(conf);

      console.log(" Set confidence to:", conf);

      const newAnalysis = {
        text: text.length > 100 ? text.substring(0, 100) + "..." : text,
        result: predLabel,
        confidence: conf,
        timestamp: new Date().toLocaleTimeString()
      };
      setAnalysisHistory(prev => [newAnalysis, ...prev.slice(0, 4)]);

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);

    } catch (error) {
      console.error(" Prediction error:", error);
      if (error.code === 'ECONNABORTED') {
        setError("Request timeout. Please try again.");
      } else if (error.response) {
        setError(error.response.data?.error || "Server error occurred");
      } else if (error.request) {
        setError("Cannot connect to backend server. Make sure Flask is running on port 5000.");
      } else {
        setError("An unexpected error occurred");
      }
      setResult("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExplain = async () => {
    if (!text.trim()) {
      setError("Please analyze text first before getting explanation");
      return;
    }
    setIsExplaining(true);
    setError("");
    try {
      const response = await axios.post("http://127.0.0.1:5000/explain", { text });
      console.log("🔍 Explanation Response:", response.data);
      
      if (response.data.success) {
        const explanationData = response.data.explanation;
        console.log(" Word Contributions:", explanationData.word_contributions);
        console.log(" Supporting:", explanationData.top_supporting);
        console.log(" Contradicting:", explanationData.top_contradicting);
        
        setExplanation(explanationData);
        setShowExplanation(true);
        setTimeout(() => {
          document.getElementById('explanation-section')?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 300);
      } else {
        setError(response.data.error || "Failed to generate explanation");
      }
    } catch (error) {
      console.error(" Explanation error:", error);
      if (error.response) {
        setError(error.response.data?.error || "Server error generating explanation");
      } else if (error.request) {
        setError("Cannot connect to backend server");
      } else {
        setError("Error generating explanation");
      }
    } finally {
      setIsExplaining(false);
    }
  };

  const loadSampleNews = (newsText) => {
    setText(newsText);
    setError("");
    setResult("");
    setExplanation(null);
    setShowExplanation(false);
  };

  const clearForm = () => {
    setText("");
    setResult("");
    setError("");
    setExplanation(null);
    setShowExplanation(false);
  };

  return (
    <>
      {/* Hero Section */}
      <section className="hero" id="home">
        <div className="hero-content">
          <h1>See Beyond the Surface</h1>
          <h2>TruthLens</h2>
          <p>Cuts through the noise - uncover what's real in a world full of misinformation.</p>
          {!showForm && (
            <button className="cta-button" onClick={handleStartDetection}>Start Detecting</button>
          )}
        </div>
        <div className="hero-image">
          <img src="images/femaledetective.png" alt="TruthLens visualization" />
        </div>
      </section>

      {/* Detection Form Section */}
      <section className="detection-section" id="detect" ref={formRef}>
        <div className="container">
          <h2>Detect Fake News</h2>
          <p>Paste news content below to analyze its authenticity</p>

          <div className="sample-news">
            <h3>Try with sample news:</h3>
            <div className="sample-buttons">
              {sampleNews.map((news, idx) => (
                <button key={idx} className="sample-btn" onClick={() => loadSampleNews(news.text)}>
                  {news.label} News Example
                </button>
              ))}
            </div>
          </div>

          <form className="detection-form">
            <textarea
              placeholder="Paste news article or text here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
            />
            <div className="form-actions">
              <button type="button" className="clear-btn" onClick={clearForm} disabled={isLoading}>Clear</button>
              <button type="submit" className="cta-button" disabled={isLoading || !text.trim()} onClick={handleCheckAuthClick}>
                {isLoading ? "Analyzing..." : "Check Authenticity"}
              </button>
            </div>
          </form>
          {error && <div className="error-message">{error}</div>}
        </div>
      </section>

      {/* Result section*/}
      {result && (
        <section className="results-section" ref={resultRef}>
          <div className="container">
            <h2>Analysis Result</h2>
            
            <div className={`result-card ${result.toLowerCase()}`}>
              <div className="result-header">
                <div className={`status-indicator ${result.toLowerCase()}`}>
                  {result === "Real" ? "✓" : "⚠"}
                </div>
                <div className="result-text">
                  <h3>This content is likely <span className="result-label">{result}</span></h3>
                  <p>with {confidence}% confidence</p>
                </div>
              </div>
              
              <div className="confidence-meter">
                <div className="meter-bar">
                  <div 
                    className={`meter-fill ${confidence > 75 ? 'high' : confidence > 50 ? 'medium' : 'low'}`}
                    style={{width: `${confidence}%`}}
                  ></div>
                </div>
                <div className="meter-labels">
                  <span>Low Confidence</span>
                  <span>High Confidence</span>
                </div>
              </div>
              
              <div className="result-explanation">
                {result === "Real" ? (
                  <p>This content appears to be credible. However, always verify information from multiple trusted sources.</p>
                ) : (
                  <p>This content shows signs of potential misinformation. Cross-check with reliable news sources before sharing.</p>
                )}
              </div>

              <div className="result-actions">
                <button 
                  className="explain-button"
                  onClick={handleExplain}
                  disabled={isExplaining}
                >
                  {isExplaining ? " Analyzing..." : " Explain This Result"}
                </button>
              </div>
            </div>
            
            {analysisHistory.length > 0 && (
              <div className="history-section">
                <h3>Recent Analysis</h3>
                <div className="history-list">
                  {analysisHistory.map((item, index) => (
                    <div key={index} className="history-item">
                      <div className="history-text">{item.text}</div>
                      <div className={`history-result ${item.result.toLowerCase()}`}>
                        {item.result} ({item.confidence}%)
                      </div>
                      <div className="history-time">{item.timestamp}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {explanation && showExplanation && (
        <section className="explanation-section" id="explanation-section">
          <div className="container">
            <h2>Why is this {result}?</h2>
            <p>See how each word influenced the prediction.</p>
            
            <div className="explanation-summary">
              <div className="summary-card">
                <h3>Explanation Summary</h3>
                <p>{explanation.summary}</p>
              </div>
            </div>

            <div className="word-analysis">
              <div className="word-contributions">
                <h3>Word Impact Analysis</h3>
                <div className="words-grid">
                 {explanation.word_contributions && explanation.word_contributions.length > 0 ? (
                    explanation.word_contributions.map((item, index) => {
                      const absContribution = Math.abs(item.contribution);
                      // Calculate font size in rems (your base font size is ~0.9rem)
                      const minFont = 0.8;  // rem
                      const maxFont = 1.2;  // rem
                      // Use a smooth scaling formula (log scale or linear) 
                      // Here, simple linear between min and max with clamping:
                      let scale = (absContribution - 0) / (0.2 - 0);  // normalize (adjust 0.2 to your max expected)
                      scale = Math.min(1, Math.max(0, scale)); // clamp between 0 and 1
                      const fontSize = minFont + scale * (maxFont - minFont);

                      return (                  
                        <div
                          key={index}
                          className={`word-bubble ${item.impact}`}
                          style={{ fontSize: `${fontSize}rem` }}
                        >
                          <span className="word">{item.word}</span>
                          <span className="contribution">
                            {item.contribution > 0 ? '+' : ''}{item.contribution.toFixed(3)}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p>No word contributions available</p>
                  )}
                </div>
              </div>

              <div className="impact-breakdown">
                <div className="impact-column supporting">
                  <h4>✅ Supporting Evidence</h4>
                  <div className="impact-list">
                    {explanation.top_supporting && explanation.top_supporting.length > 0 ? (
                      explanation.top_supporting.map((item, index) => (
                        <div key={index} className="impact-item">
                          <span className="word">{item.word}</span>
                          <span className="score">
                            {item.contribution > 0 ? '+' : ''}{item.contribution.toFixed(3)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="no-data">No supporting evidence found</p>
                    )}
                  </div>
                </div>

                <div className="impact-column contradicting">
                  <h4>❌ Contradicting Evidence</h4>
                  <div className="impact-list">
                    {explanation.top_contradicting && explanation.top_contradicting.length > 0 ? (
                      explanation.top_contradicting.map((item, index) => (
                        <div key={index} className="impact-item">
                          <span className="word">{item.word}</span>
                          <span className="score">{item.contribution.toFixed(3)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="no-data">No contradicting evidence found</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="explanation-notes">
              <h4>How to interpret this:</h4>
              <ul>
                <li>✅ <strong>Green words</strong> increase confidence in the {result} classification</li>
                <li>❌ <strong>Red words</strong> decrease confidence in the {result} classification</li>
                <li>Larger words had a stronger impact on the decision</li>
                <li>Numbers show the exact contribution weight</li>
              </ul>
            </div>
          </div>
        </section>
      )}

      <section className="about-section" id="about">
        <div className="container">
          <h2>How TruthLens Works</h2>
          <div className="features-grid">
            <div className="feature">
              <div className="feature-icon">🔍</div>
              <h3>Advanced Analysis</h3>
              <p>Uses machine learning to detect patterns associated with misinformation.</p>
            </div>
            <div className="feature">
              <div className="feature-icon">⚡</div>
              <h3>Instant Results</h3>
              <p>Get authenticity assessment in seconds, not hours.</p>
            </div>
            <div className="feature">
              <div className="feature-icon">📊</div>
              <h3>Confidence Scoring</h3>
              <p>See how confident our system is in its assessment.</p>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="container">
          <p>TruthLens &copy; {new Date().getFullYear()} - Fighting misinformation one analysis at a time</p>
          <p className="disclaimer">
            Disclaimer: This tool provides an algorithmic assessment and should be used as one of multiple verification sources.
          </p>
        </div>
      </footer>
    </>
  );
}

// Navigation Component with Login/Logout
function Navigation({ user, onLogout, onLoginSuccess, showAuthModal, setShowAuthModal }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  const handleLogout = () => {
    onLogout();
    setMenuOpen(false);
    setShowUserDropdown(false);
  };

  const handleNavClick = () => {
    setMenuOpen(false);
  };

  const handleHomeClick = () => {
    setMenuOpen(false);
    if (window.location.pathname === '/') {
      sessionStorage.removeItem('scrollToSection');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSectionClick = (sectionId) => {
    setMenuOpen(false);
    if (window.location.pathname === '/') {
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      sessionStorage.setItem('scrollToSection', sectionId);
    }
  };

  const handleLoginClick = () => {
    setShowAuthModal(true);
    setMenuOpen(false);
  };

  const resetAuthForm = () => {
    setAuthEmail("");
    setAuthPassword("");
    setAuthUsername("");
    setAuthError("");
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError("Please enter both email and password");
      return;
    }
    
    if (isRegister && !authUsername.trim()) {
      setAuthError("Please enter a username");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(authEmail)) {
      setAuthError("Please enter a valid email address");
      return;
    }

    if (isRegister && authPassword.length < 6) {
      setAuthError("Password must be at least 6 characters long");
      return;
    }

    setIsAuthLoading(true);
    setAuthError("");

    try {
      const endpoint = isRegister ? "http://127.0.0.1:5000/register" : "http://127.0.0.1:5000/login";
      const payload = isRegister 
        ? { 
            username: authUsername.trim(), 
            email: authEmail.trim().toLowerCase(), 
            password: authPassword 
          }
        : { 
            email: authEmail.trim().toLowerCase(), 
            password: authPassword 
          };

      const response = await axios.post(endpoint, payload, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.data.success) {
        if (isRegister) {
          setIsRegister(false);
          setAuthError("Registration successful! Please login with your credentials.");
          setAuthPassword("");
          setAuthUsername("");
          setAuthEmail(authEmail);
        } else {
          const userData = response.data;
          const newUser = {
            username: userData.username || authEmail.split('@')[0],
            email: authEmail.trim().toLowerCase()
          };
          
          onLoginSuccess(newUser);
          setShowAuthModal(false);
          resetAuthForm();
        }
      } else {
        const errorMsg = response.data.message || "Authentication failed";
        setAuthError(errorMsg);
        
        if (isRegister && errorMsg.toLowerCase().includes('already exists')) {
          setTimeout(() => {
            setIsRegister(false);
            setAuthError("Account already exists. Please login instead.");
          }, 2000);
        }
      }
    } catch (error) {
      console.error(" Auth error:", error);
      
      if (error.code === 'ECONNABORTED') {
        setAuthError("Request timeout. Please check your connection and try again.");
      } else if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || error.response.data?.error;
        
        switch (status) {
          case 400:
            setAuthError(message || "Invalid request. Please check your input.");
            break;
          case 401:
            setAuthError(message || "Invalid email or password.");
            break;
          case 409:
            setAuthError(message || "User already exists. Please login instead.");
            setTimeout(() => setIsRegister(false), 2000);
            break;
          case 500:
            setAuthError("Server error. Please try again later.");
            break;
          default:
            setAuthError(message || `Error: ${status}`);
        }
      } else if (error.request) {
        setAuthError("Cannot connect to server. Please check if the backend is running on port 5000.");
      } else {
        setAuthError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  return (
    <>
      <nav>
        <div className="logo">
          <img src="images/image.png" alt="TruthLens Logo" className="logo-img" />
          <span>TruthLens</span>
        </div>
        
        <div className={`hamburger ${menuOpen ? "active" : ""}`} onClick={toggleMenu}>
          <div></div><div></div><div></div>
        </div>
        
        <ul className={`nav-links ${menuOpen ? "active" : ""}`}>
          <li>
            <Link to="/" onClick={handleHomeClick}>HOME</Link>
          </li>
          <li>
            <Link 
              to="/" 
              onClick={() => handleSectionClick('about')}
            >
              ABOUT
            </Link>
          </li>
          <li>
            <Link 
              to="/" 
              onClick={() => handleSectionClick('detect')}
            >
              DETECT
            </Link>
          </li>
          <li>
            <Link to="/research" onClick={handleNavClick}>RESEARCH</Link>
          </li>
          
          {user ? (
            <li className="nav-user">
              <div 
                className="user-dropdown-trigger"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
              >
                <span className="username-display">{user.username}</span>
                <span className="dropdown-arrow">▼</span>
              </div>
              {showUserDropdown && (
                <div className="user-dropdown-menu">
                  <button onClick={handleLogout} className="dropdown-logout-btn">
                    Logout
                  </button>
                </div>
              )}
            </li>
          ) : (
            <li className="nav-login">
              <button onClick={handleLoginClick} className="login-btn">
                Login
              </button>
            </li>
          )}
        </ul>
      </nav>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{isRegister ? "Register" : "Login"}</h2>
            {authError && <div className="error-message">{authError}</div>}
            
            <form onSubmit={handleAuth}>
              {isRegister && (
                <input 
                  type="text" 
                  placeholder="Username" 
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  required 
                />
              )}
              <input 
                type="email" 
                placeholder="Email" 
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required 
              />
              <input 
                type="password" 
                placeholder="Password" 
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required 
              />
              
              <div className="modal-actions">
                <button type="submit" disabled={isAuthLoading}>
                  {isAuthLoading ? "Processing..." : isRegister ? "Register" : "Login"}
                </button>
                <button type="button" onClick={() => {
                  setIsRegister(!isRegister);
                  setAuthError("");
                }}>
                  {isRegister ? "Already have an account? Login" : "Don't have an account? Register"}
                </button>
                <button type="button" onClick={() => {
                  setShowAuthModal(false);
                  resetAuthForm();
                }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleLogout = () => {
    setUser(null);
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleShowLoginModal = () => {
    setShowAuthModal(true);
  };

  return (
    <Router>
      <div className="App">
        <Navigation 
          user={user} 
          onLogout={handleLogout} 
          onLoginSuccess={handleLoginSuccess}
          showAuthModal={showAuthModal}
          setShowAuthModal={setShowAuthModal}
        />
        <Routes>
          <Route path="/" element={
            <HomePage 
              user={user} 
              onLoginSuccess={handleLoginSuccess} 
              onLogout={handleLogout}
              onShowLoginModal={handleShowLoginModal}
            />
          } />
          <Route path="/research" element={<Research user={user} />} />
          <Route path="*" element={
            <HomePage 
              user={user} 
              onLoginSuccess={handleLoginSuccess} 
              onLogout={handleLogout}
              onShowLoginModal={handleShowLoginModal}
            />
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;