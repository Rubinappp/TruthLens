
// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import "./Research.css";

// function Research({ user }) {  // Add user as a prop here
//   const [articles, setArticles] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     fetchResearchArticles();
//   }, []);

//   // Function to format date nicely
//   const formatDate = (dateString) => {
//     try {
//       const date = new Date(dateString);
//       return date.toLocaleDateString('en-US', {
//         year: 'numeric',
//         month: 'short',
//         day: 'numeric'
//       });
//     } catch (e) {
//       return dateString;
//     }
//   };

//   // Function to generate AI-style placeholder for Snopes
//   const getSnopesAIPlaceholder = (title) => {
//     const titleLower = title.toLowerCase();
    
//     if (titleLower.includes('trump') || titleLower.includes('biden') || titleLower.includes('election')) {
//       return {
//         background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
//         emoji: '🗳️',
//         text: 'POLITICS'
//       };
//     } else if (titleLower.includes('covid') || titleLower.includes('vaccine') || titleLower.includes('virus')) {
//       return {
//         background: 'linear-gradient(135deg, #43e97b, #38f9d7)',
//         emoji: '💉',
//         text: 'HEALTH'
//       };
//     } else if (titleLower.includes('facebook') || titleLower.includes('social media')) {
//       return {
//         background: 'linear-gradient(135deg, #667eea, #764ba2)',
//         emoji: '📱',
//         text: 'SOCIAL MEDIA'
//       };
//     } else if (titleLower.includes('climate') || titleLower.includes('weather')) {
//       return {
//         background: 'linear-gradient(135deg, #a8edea, #fed6e3)',
//         emoji: '🌍',
//         text: 'ENVIRONMENT'
//       };
//     } else if (titleLower.includes('money') || titleLower.includes('economy')) {
//       return {
//         background: 'linear-gradient(135deg, #fad0c4, #ffd1ff)',
//         emoji: '💰',
//         text: 'ECONOMY'
//       };
//     } else if (titleLower.includes('crime') || titleLower.includes('police')) {
//       return {
//         background: 'linear-gradient(135deg, #ffecd2, #fcb69f)',
//         emoji: '👮',
//         text: 'CRIME & SAFETY'
//       };
//     }
    
//     // Default for Snopes
//     return {
//       background: 'linear-gradient(135deg, #cc3333, #aa2222)',
//       emoji: '✅',
//       text: 'FACT CHECK'
//     };
//   };

//   const fetchResearchArticles = async () => {
//     try {
//       setLoading(true);
//       const response = await axios.get("http://127.0.0.1:5000/api/research-articles");
      
//       console.log("API Response:", response.data);
      
//       // Process articles - FORCE AI placeholders for Snopes
//       const enhancedArticles = (response.data.articles || response.data).map(article => {
//         const hasRealImage = !!article.image && article.image !== 'null' && article.image !== '';
//         const isSnopes = article.source.includes('snopes.com');
        
//         console.log(`Article: "${article.title}"`);
//         console.log(`  Source: ${article.source}`);
//         console.log(`  Has Real Image: ${hasRealImage}`);
//         console.log(`  Image URL: ${article.image}`);
//         console.log(`  Is Snopes: ${isSnopes}`);
        
//         // For Snopes, get AI placeholder data - ALWAYS use AI for Snopes
//         const snopesData = isSnopes ? getSnopesAIPlaceholder(article.title) : null;
        
//         // FORCE: For Snopes, always use AI placeholder regardless of real image
//         const useAIImage = isSnopes;
        
//         return {
//           ...article,
//           date: formatDate(article.date),
//           source: cleanSourceName(article.source),
//           hasRealImage: hasRealImage,
//           isSnopes: isSnopes,
//           snopesData: snopesData,
//           useAIImage: useAIImage  // Force AI images for Snopes
//         };
//       });
      
//       setArticles(enhancedArticles);
//       setError("");
//     } catch (err) {
//       console.error("Error fetching research articles:", err);
//       setError("Failed to load latest research articles.");
//       setArticles(getSampleArticles());
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Function to clean source names
//   const cleanSourceName = (source) => {
//     if (source.includes('factcheck.org')) return 'FactCheck.org';
//     if (source.includes('snopes.com')) return 'Snopes';
//     if (source.includes('poynter.org')) return 'Poynter Institute';
//     return source;
//   };

//   const getSampleArticles = () => [
//     {
//       title: "Fact Check: Recent Claims About Election Integrity",
//       summary: "Analysis of recent misinformation circulating about election processes and security measures...",
//       source: "FactCheck.org",
//       date: "Oct 1, 2025",
//       url: "#",
//       hasRealImage: false,
//       isSnopes: false,
//       useAIImage: false
//     },
//     {
//       title: "Social Media Platforms Address Misinformation Spread",
//       summary: "How major platforms are implementing new policies to combat fake news and manipulated content...",
//       source: "Poynter Institute",
//       date: "Sep 28, 2025",
//       url: "#",
//       hasRealImage: false,
//       isSnopes: false,
//       useAIImage: false
//     }
//   ];

//   if (loading) {
//     return (
//       <div className="research-page">
//         <div className="container">
//           <div className="research-header">
//             <h1>Research & Insights</h1>
//             <p>Latest analysis on misinformation trends and AI developments</p>
//           </div>
//           <div className="loading-spinner">Loading latest research...</div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="research-page">
//       <div className="container">
//         <div className="research-header">
//           <h1>Research & Insights</h1>
//           <p>Latest analysis on misinformation trends, AI developments, and digital literacy</p>
//           {/* Add user indicator - safely check if user exists */}
//           {user && (
//             <div className="user-indicator">
//               Welcome back, <strong>{user.username}</strong>
//               {user.trial_active && (
//                 <span className="trial-badge"> 🆓 Trial: {user.trial_days_left} days</span>
//               )}
//             </div>
//           )}
//         </div>

//         {error && (
//           <div className="error-message">
//             {error}
//           </div>
//         )}

//         <div className="research-grid">
//           {articles.map((article, index) => (
//             <article key={index} className="research-article">
//               <div className="article-image-container">
//                 {article.useAIImage && article.snopesData ? (
//                   // AI-style placeholder for Snopes (FORCED)
//                   <div 
//                     className="article-image-placeholder snopes-ai"
//                     style={{ background: article.snopesData.background }}
//                   >
//                     <span className="ai-emoji">{article.snopesData.emoji}</span>
//                     <div className="image-overlay">
//                       <div className="ai-badge">{article.snopesData.text}</div>
//                     </div>
//                   </div>
//                 ) : article.hasRealImage ? (
//                   // Real image from RSS feed (for FactCheck.org)
//                   <img 
//                     src={article.image} 
//                     alt={article.title}
//                     className="article-image-real"
//                     onError={(e) => {
//                       console.log(`Image failed to load: ${article.image}`);
//                       e.target.style.display = 'none';
//                     }}
//                     onLoad={(e) => {
//                       console.log(`Image loaded successfully: ${article.image}`);
//                     }}
//                   />
//                 ) : (
//                   // Simple placeholder for other sources
//                   <div 
//                     className="article-image-placeholder"
//                     style={{ 
//                       background: article.source.includes('factcheck.org') 
//                         ? 'linear-gradient(135deg, #3366cc, #2244aa)'
//                         : article.source.includes('snopes.com')
//                         ? 'linear-gradient(135deg, #cc3333, #aa2222)'
//                         : 'linear-gradient(135deg, #33cc33, #22aa22)'
//                     }}
//                   >
//                     <span className="source-initial">
//                       {article.source?.charAt(0) || "N"}
//                     </span>
//                     <div className="image-overlay">
//                       <div className="news-badge">
//                         {article.source.includes('factcheck.org') ? 'FACT CHECK' : 
//                          article.source.includes('snopes.com') ? 'SNOPES' : 'ANALYSIS'}
//                       </div>
//                     </div>
//                   </div>
//                 )}
//               </div>
              
//               <div className="article-content">
//                 <div className="article-meta">
//                   <span className="article-category">{article.source}</span>
//                   <span className="article-date">{article.date}</span>
//                 </div>
                
//                 <h2>{article.title}</h2>
//                 <p className="article-summary">
//                   {article.summary}
//                 </p>
                
//                 <div className="article-actions">
//                   <a href={article.url} className="read-more" target="_blank" rel="noopener noreferrer">
//                     Read Full Analysis →
//                   </a>
//                 </div>
//               </div>
//             </article>
//           ))}
//         </div>

//         <div className="research-info">
//           <h3>About Our Research</h3>
//           <p>
//             TruthLens continuously monitors misinformation trends using machine learning and data analysis. 
//             Our research focuses on emerging patterns in fake news, AI-generated content, and social media manipulation.
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default Research;
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Research.css";

function Research({ user }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchResearchArticles();
  }, []);

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  const getSnopesAIPlaceholder = (title) => {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('trump') || titleLower.includes('biden') || titleLower.includes('election')) {
      return {
        background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
        emoji: '🗳️',
        text: 'POLITICS'
      };
    } else if (titleLower.includes('covid') || titleLower.includes('vaccine') || titleLower.includes('virus')) {
      return {
        background: 'linear-gradient(135deg, #43e97b, #38f9d7)',
        emoji: '💉',
        text: 'HEALTH'
      };
    } else if (titleLower.includes('facebook') || titleLower.includes('social media')) {
      return {
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        emoji: '📱',
        text: 'SOCIAL MEDIA'
      };
    } else if (titleLower.includes('climate') || titleLower.includes('weather')) {
      return {
        background: 'linear-gradient(135deg, #a8edea, #fed6e3)',
        emoji: '🌍',
        text: 'ENVIRONMENT'
      };
    } else if (titleLower.includes('money') || titleLower.includes('economy')) {
      return {
        background: 'linear-gradient(135deg, #fad0c4, #ffd1ff)',
        emoji: '💰',
        text: 'ECONOMY'
      };
    } else if (titleLower.includes('crime') || titleLower.includes('police')) {
      return {
        background: 'linear-gradient(135deg, #ffecd2, #fcb69f)',
        emoji: '👮',
        text: 'CRIME & SAFETY'
      };
    }
    
    return {
      background: 'linear-gradient(135deg, #cc3333, #aa2222)',
      emoji: '✅',
      text: 'FACT CHECK'
    };
  };

  const fetchResearchArticles = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://127.0.0.1:5000/api/research-articles");
      
      console.log("API Response:", response.data);
      
      const enhancedArticles = (response.data.articles || response.data).map(article => {
        const hasRealImage = !!article.image && article.image !== 'null' && article.image !== '';
        const isSnopes = article.source.includes('snopes.com');
        
        const snopesData = isSnopes ? getSnopesAIPlaceholder(article.title) : null;
        const useAIImage = isSnopes;
        
        return {
          ...article,
          date: formatDate(article.date),
          source: cleanSourceName(article.source),
          hasRealImage: hasRealImage,
          isSnopes: isSnopes,
          snopesData: snopesData,
          useAIImage: useAIImage
        };
      });
      
      setArticles(enhancedArticles);
      setError("");
    } catch (err) {
      console.error("Error fetching research articles:", err);
      setError("Failed to load latest research articles.");
      setArticles(getSampleArticles());
    } finally {
      setLoading(false);
    }
  };

  const cleanSourceName = (source) => {
    if (source.includes('factcheck.org')) return 'FactCheck.org';
    if (source.includes('snopes.com')) return 'Snopes';
    if (source.includes('poynter.org')) return 'Poynter Institute';
    return source;
  };

  const getSampleArticles = () => [
    {
      title: "Fact Check: Recent Claims About Election Integrity",
      summary: "Analysis of recent misinformation circulating about election processes and security measures...",
      source: "FactCheck.org",
      date: "Oct 1, 2025",
      url: "#",
      hasRealImage: false,
      isSnopes: false,
      useAIImage: false
    },
    {
      title: "Social Media Platforms Address Misinformation Spread",
      summary: "How major platforms are implementing new policies to combat fake news and manipulated content...",
      source: "Poynter Institute",
      date: "Sep 28, 2025",
      url: "#",
      hasRealImage: false,
      isSnopes: false,
      useAIImage: false
    }
  ];

  if (loading) {
    return (
      <div className="research-page">
        <div className="container">
          <div className="research-header">
            <h1>Research & Insights</h1>
            <p>Latest analysis on misinformation trends and AI developments</p>
          </div>
          <div className="loading-spinner">Loading latest research...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="research-page">
      <div className="container">
        <div className="research-header">
          <h1>Research & Insights</h1>
          <p>Latest analysis on misinformation trends, AI developments, and digital literacy</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="research-grid">
          {articles.map((article, index) => (
            <article key={index} className="research-article">
              <div className="article-image-container">
                {article.useAIImage && article.snopesData ? (
                  <div 
                    className="article-image-placeholder snopes-ai"
                    style={{ background: article.snopesData.background }}
                  >
                    <span className="ai-emoji">{article.snopesData.emoji}</span>
                    <div className="image-overlay">
                      <div className="ai-badge">{article.snopesData.text}</div>
                    </div>
                  </div>
                ) : article.hasRealImage ? (
                  <img 
                    src={article.image} 
                    alt={article.title}
                    className="article-image-real"
                    onError={(e) => {
                      console.log(`Image failed to load: ${article.image}`);
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div 
                    className="article-image-placeholder"
                    style={{ 
                      background: article.source.includes('factcheck.org') 
                        ? 'linear-gradient(135deg, #3366cc, #2244aa)'
                        : article.source.includes('snopes.com')
                        ? 'linear-gradient(135deg, #cc3333, #aa2222)'
                        : 'linear-gradient(135deg, #33cc33, #22aa22)'
                    }}
                  >
                    <span className="source-initial">
                      {article.source?.charAt(0) || "N"}
                    </span>
                    <div className="image-overlay">
                      <div className="news-badge">
                        {article.source.includes('factcheck.org') ? 'FACT CHECK' : 
                         article.source.includes('snopes.com') ? 'SNOPES' : 'ANALYSIS'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="article-content">
                <div className="article-meta">
                  <span className="article-category">{article.source}</span>
                  <span className="article-date">{article.date}</span>
                </div>
                
                <h2>{article.title}</h2>
                <p className="article-summary">
                  {article.summary}
                </p>
                
                <div className="article-actions">
                  <a href={article.url} className="read-more" target="_blank" rel="noopener noreferrer">
                    Read Full Analysis →
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="research-info">
          <h3>About Our Research</h3>
          <p>
            TruthLens continuously monitors misinformation trends using machine learning and data analysis. 
            Our research focuses on emerging patterns in fake news, AI-generated content, and social media manipulation.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Research;