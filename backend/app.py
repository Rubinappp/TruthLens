
import os 
import pickle
from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
from keras.utils import pad_sequences
from datetime import datetime
import json
import re
import numpy as np
import lime.lime_text
from lime import lime_text
import random
import feedparser
import requests

from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"])
app.config['SECRET_KEY'] = 'your_secret_key_here_change_this_in_production'

# Database configuration
base_dir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(base_dir, "users.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

print(f"📁 Database will be created at: {os.path.join(base_dir, 'users.db')}")

# Initialize SQLAlchemy
db = SQLAlchemy(app)

# User model (trial period fields removed)
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Initialize database function
def init_database():
    try:
        with app.app_context():
            db.create_all()
            print("✅ Database tables created successfully!")
            test_user = User.query.first()
            print("✅ Database connection test passed!")
    except Exception as e:
        print(f" Database initialization error: {e}")
        try:
            with app.app_context():
                db.create_all()
                print("✅ Database created on second attempt!")
        except Exception as e2:
            print(f" Critical database error: {e2}")

init_database()

# ==================== MODEL LOADING ====================

MODEL_PATH = os.path.join("..", "ML_model", "my_lstm_model.h5")
TOKENIZER_PATH = os.path.join("..", "ML_model", "tokenizer.pkl")
MAX_SEQUENCE_LENGTH = 100

try:
    model = tf.keras.models.load_model(MODEL_PATH)
    with open(TOKENIZER_PATH, "rb") as f:
        tokenizer = pickle.load(f)
    print("✅ LSTM model and tokenizer loaded successfully!")
except Exception as e:
    print("❌ Error loading model/tokenizer:", e)
    model = None
    tokenizer = None

# ==================== HELPER FUNCTIONS ====================

def preprocess_text(text):
    """Enhanced text preprocessing"""
    text = text.lower()
    text = ' '.join(text.split())
    text = re.sub(r'[^\w\s?\!\.\']', '', text)
    return text.strip()

def clean_html(text):
    """Remove HTML tags and clean text"""
    if not text:
        return "No description available"
    
    clean = re.compile('<.*?>')
    cleaned = re.sub(clean, '', text)
    
    cleaned = (cleaned
        .replace('&nbsp;', ' ')
        .replace('&amp;', '&')
        .replace('&quot;', '"')
        .replace('&#39;', "'")
        .replace('&lt;', '<')
        .replace('&gt;', '>')
    )
    
    cleaned = ' '.join(cleaned.split())
    return cleaned.strip()

def extract_image_from_entry(entry):
    """Extract image URL from RSS entry with multiple fallback methods"""
    image_url = None
    
    try:
        if hasattr(entry, 'media_content') and entry.media_content:
            for media in entry.media_content:
                if media.get('type', '').startswith('image/'):
                    image_url = media['url']
                    return image_url
        
        if hasattr(entry, 'links'):
            for link in entry.links:
                if link.get('type', '').startswith('image/'):
                    image_url = link['href']
                    return image_url
        
        content_to_search = ""
        if hasattr(entry, 'summary'):
            content_to_search += entry.summary
        if hasattr(entry, 'content'):
            for content in entry.content:
                content_to_search += content.value
        
        if content_to_search:
            img_matches = re.findall(r'<img[^>]+src="([^">]+)"', content_to_search)
            if img_matches:
                for img_url in img_matches:
                    if 'snopes.com' in img_url:
                        if any(keyword in img_url.lower() for keyword in ['uploads', 'tachyon', 'media', 'snopes.com']):
                            image_url = img_url
                            return image_url
                    elif not any(bad in img_url.lower() for bad in ['pixel', 'tracker', 'spacer', 'blank.gif']):
                        if any(ext in img_url.lower() for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
                            image_url = img_url
                            return image_url
        
        if hasattr(entry, 'enclosures'):
            for enclosure in entry.enclosures:
                if enclosure.get('type', '').startswith('image/'):
                    image_url = enclosure['href']
                    return image_url
        
        if hasattr(entry, 'link') and 'snopes.com' in entry.link:
            image_url = 'https://www.snopes.com/tachyon/2015/12/snopes.png'
            return image_url
                
    except Exception as e:
        print(f" Error extracting image: {e}")
    
    return None

def get_research_articles():
    """Fetch latest articles from various fact-checking and AI news sources"""
    articles = []
    
    try:
        rss_feeds = [
            'https://www.politifact.com/',
            'https://www.factcheck.org/feed/',
            'https://www.snopes.com/feed/',
        ]
        
        for feed_url in rss_feeds:
            try:
                feed = feedparser.parse(feed_url)
                
                for entry in feed.entries[:3]:
                    image_url = extract_image_from_entry(entry)
                    clean_title = clean_html(entry.title)
                    clean_summary = clean_html(entry.summary)
                    
                    if not clean_summary or clean_summary == "No description available":
                        clean_summary = f"Fact-check analysis: {clean_title}"
                    
                    articles.append({
                        'title': clean_title,
                        'summary': clean_summary[:150] + '...' if len(clean_summary) > 150 else clean_summary,
                        'source': feed_url.split('/')[2],
                        'date': entry.published if hasattr(entry, 'published') else datetime.now().strftime("%b %d, %Y"),
                        'url': entry.link,
                        'image': image_url
                    })
                    
            except Exception as e:
                print(f"Error parsing feed {feed_url}: {e}")
                continue
        
        if not articles:
            articles = get_sample_articles()
            
    except Exception as e:
        print(f"Error in get_research_articles: {e}")
        articles = get_sample_articles()
    
    return articles[:6]

def get_sample_articles():
    """Provide sample research articles"""
    return [
        {
            'title': "AI Is About to Change Our Lives Forever. Luckily We Have a User Manual for That.",
            'summary': "Exploring how AI-generated content is reshaping the misinformation landscape and what it means for truth verification in the digital age...",
            'source': "AI Analysis",
            'date': "Oct 1, 2025",
            'url': "#",
            'image': None
        },
        {
            'title': "How Deepfakes Are Evolving: A Technical Breakdown",
            'summary': "Analyzing the latest developments in synthetic media and their implications for political discourse and public trust...",
            'source': "Technical Analysis",
            'date': "Sep 28, 2025",
            'url': "#",
            'image': None
        }
    ]

# ==================== LIME SETUP ====================
class PredictionWrapper:
    """Optimized wrapper for LIME predictions"""
    def __init__(self, model, tokenizer, max_length):
        self.model = model
        self.tokenizer = tokenizer
        self.max_length = max_length
    
    def predict_proba(self, texts):
       try:
           if isinstance(texts, str):
               texts = [texts]

           processed_texts = [preprocess_text(text) for text in texts]
           sequences = self.tokenizer.texts_to_sequences(processed_texts)
           probabilities = []

           for seq in sequences:
               if len(seq) == 0:
                   probabilities.append([0.5, 0.5])
                   continue

               padded_seq = pad_sequences([seq], maxlen=self.max_length, padding='post', truncating='post')
               pred = float(self.model.predict(padded_seq, verbose=0)[0][0])
               # Small random jitter to enhance sensitivity for LIME
               pred += np.random.normal(0, 0.01)
               pred = float(np.clip(pred, 0.0001, 0.9999))
               probabilities.append([1 - pred, pred])

           return np.array(probabilities)
       except Exception as e:
           print(f" PredictionWrapper error: {e}")
           return np.array([[0.5, 0.5]] * len(texts))       
   


# Initialize LIME
try:
    if model is not None and tokenizer is not None:
        predictor = PredictionWrapper(model, tokenizer, MAX_SEQUENCE_LENGTH)
        explainer = lime_text.LimeTextExplainer(
    class_names=['Fake', 'Real'],
    bow=True,
    random_state=42
)


        print(" LIME explainer initialized successfully!")
    else:
        explainer = None
        predictor = None
        print(" LIME explainer not initialized (model not available)")
except Exception as e:
    print(" Error initializing LIME explainer:", e)
    explainer = None
    predictor = None

def generate_explanation_summary(supporting_words, contradicting_words, predicted_class):
    """Generate human-readable explanation summary"""
    
    if predicted_class == 1:  # Real prediction
        if supporting_words:
            top_words = [w['word'] for w in supporting_words[:3]]
            if len(top_words) >= 2:
                support_phrase = f"Words like '{top_words[0]}' and '{top_words[1]}'"
            else:
                support_phrase = f"The word '{top_words[0]}'"
        else:
            support_phrase = "The overall language patterns"
            
        if contradicting_words:
            contra_words = [w['word'] for w in contradicting_words[:2]]
            if len(contra_words) >= 2:
                contra_phrase = f", though '{contra_words[0]}' and '{contra_words[1]}' slightly reduce confidence"
            else:
                contra_phrase = f", though '{contra_words[0]}' slightly reduces confidence"
        else:
            contra_phrase = ""
            
        return f"{support_phrase} suggest credible reporting patterns{contra_phrase}."
    
    else:  # Fake prediction
        if supporting_words:
            top_words = [w['word'] for w in supporting_words[:3]]
            if len(top_words) >= 2:
                support_phrase = f"Words like '{top_words[0]}' and '{top_words[1]}'"
            else:
                support_phrase = f"The word '{top_words[0]}'"
        else:
            support_phrase = "The overall language patterns"
            
        if contradicting_words:
            contra_words = [w['word'] for w in contradicting_words[:2]]
            if len(contra_words) >= 2:
                contra_phrase = f", though '{contra_words[0]}' and '{contra_words[1]}' suggest some credibility"
            else:
                contra_phrase = f", though '{contra_words[0]}' suggests some credibility"
        else:
            contra_phrase = ""
            
        return f"{support_phrase} show patterns associated with misinformation{contra_phrase}."

# ==================== ROUTES ====================

@app.route("/")
def home():
    return " TruthLens backend is running!"

@app.route("/test-db", methods=["GET"])
def test_db():
    try:
        with app.app_context():
            user_count = User.query.count()
            return jsonify({
                "success": True, 
                "message": f"Database connected successfully. Total users: {user_count}",
                "user_count": user_count
            })
    except Exception as e:
        return jsonify({"success": False, "message": f"Database error: {str(e)}"}), 500

@app.route("/register", methods=["POST"])
def register():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "message": "No JSON data received"}), 400
            
        username = data.get("username", "").strip()
        email = data.get("email", "").strip().lower()
        password = data.get("password", "").strip()

        print(f" Registration attempt: {username}, {email}")

        if not username or not email or not password:
            return jsonify({"success": False, "message": "All fields are required"}), 400

        if len(password) < 3:
            return jsonify({"success": False, "message": "Password must be at least 3 characters"}), 400

        with app.app_context():
            if User.query.filter_by(email=email).first():
                return jsonify({"success": False, "message": "Email already exists"}), 400

            if User.query.filter_by(username=username).first():
                return jsonify({"success": False, "message": "Username already exists"}), 400

            hashed_pw = generate_password_hash(password)
            new_user = User(username=username, email=email, password=hashed_pw)
            
            db.session.add(new_user)
            db.session.commit()
        
        print(f"✅ User registered successfully: {username}")
        return jsonify({"success": True, "message": "User registered successfully! Please login."})

    except Exception as e:
        db.session.rollback()
        print(f" Registration error: {str(e)}")
        return jsonify({"success": False, "message": f"Registration failed: {str(e)}"}), 500

@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "message": "No JSON data received"}), 400
            
        email = data.get("email", "").strip().lower()
        password = data.get("password", "").strip()

        print(f" Login attempt: {email}")

        if not email or not password:
            return jsonify({"success": False, "message": "Email and password are required"}), 400

        with app.app_context():
            user = User.query.filter_by(email=email).first()
            if not user:
                return jsonify({"success": False, "message": "Invalid email or password"}), 401

            if not check_password_hash(user.password, password):
                return jsonify({"success": False, "message": "Invalid email or password"}), 401

        print(f" Login successful: {user.username}")
        return jsonify({
            "success": True,
            "message": "Login successful",
            "username": user.username
        })

    except Exception as e:
        print(f" Login error: {str(e)}")
        return jsonify({"success": False, "message": f"Login failed: {str(e)}"}), 500

@app.route("/debug-users", methods=["GET"])
def debug_users():
    try:
        with app.app_context():
            users = User.query.all()
            user_list = []
            for user in users:
                user_list.append({
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "created_at": user.created_at.isoformat() if user.created_at else None
                })
            return jsonify({"success": True, "users": user_list, "count": len(user_list)})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/predict", methods=["POST"])
def predict():
    if model is None or tokenizer is None:
        return jsonify({"error": "Model not loaded"}), 500

    data = request.get_json()
    text = data.get("text", "").strip()

    if not text:
        return jsonify({"error": "Empty text provided"}), 400

    if len(text.split()) < 3:
        return jsonify({
            "input": text,
            "prediction": "uncertain",
            "confidence_percent": 50.0,
            "message": "Text is too short for reliable analysis. Please provide more context."
        })

    try:
        processed_text = preprocess_text(text)
        sequences = tokenizer.texts_to_sequences([processed_text])
        
        if len(sequences[0]) == 0:
            return jsonify({
                "input": text,
                "prediction": "uncertain", 
                "confidence_percent": 50.0,
                "message": "Text contains no recognizable patterns for analysis"
            })
            
        padded_seq = pad_sequences(sequences, maxlen=MAX_SEQUENCE_LENGTH, padding='post', truncating='post')
        real_probability = float(model.predict(padded_seq, verbose=0)[0][0])

        confidence_threshold = 0.30
        
        if real_probability >= confidence_threshold:
            prediction_label = "real"
            confidence_percent = round(real_probability * 100, 2)
        elif real_probability <= (1 - confidence_threshold):
            prediction_label = "fake"
            confidence_percent = round((1 - real_probability) * 100, 2)
        else:
            prediction_label = "uncertain"
            confidence_percent = 50.0

        # Create response data
        response_data = {
            "input": text,
            "prediction": prediction_label,
            "confidence_percent": confidence_percent,
            "raw_probability": round(real_probability, 4),
            "words_analyzed": len(sequences[0])
        }
        
        # ⭐ DEBUG LOGGING - See what we're sending
        print(f"\n SENDING TO FRONTEND:")
        print(f"   Prediction: {prediction_label}")
        print(f"   Confidence: {confidence_percent}%")
        print(f"   Raw probability: {real_probability:.4f}")
        print(f"   Full response: {response_data}\n")

        return jsonify(response_data)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/explain", methods=["POST"])
def explain_prediction():
    """SINGLE explain endpoint using proper LIME integration"""
    if model is None or explainer is None:
        return jsonify({"error": "Model or explainer not loaded"}), 500

    data = request.get_json()
    text = data.get("text", "").strip()

    if not text:
        return jsonify({"error": "Empty text provided"}), 400

    try:
        processed_text = preprocess_text(text)
        sequences = tokenizer.texts_to_sequences([processed_text])
        
        if len(sequences[0]) == 0:
            return jsonify({
                "success": False,
                "error": "Text contains no recognizable words for analysis"
            }), 400
        
        padded_seq = pad_sequences(sequences, maxlen=MAX_SEQUENCE_LENGTH)
        real_prob = float(model.predict(padded_seq, verbose=0)[0][0])
        predicted_class = 1 if real_prob >= 0.3 else 0
        
        print(f" Explaining: '{processed_text[:80]}...'")
        print(f" Prediction - Real prob: {real_prob:.4f}, Class: {predicted_class} ({['Fake', 'Real'][predicted_class]})")
        
        # Test predictor
        test_probs = predictor.predict_proba([processed_text])
        print(f"= Predictor test: {test_probs[0]}")
        
        # Use LIME with optimized settings
        explanation = explainer.explain_instance(
            processed_text,
            predictor.predict_proba,
            num_features=15,
            top_labels=1,
            num_samples=800  #  REDUCED from 600 to 500 for faster processing
        )
        
        # Scale up contributions for better visibility
        word_impacts = [(word, contribution * 100) for word, contribution in explanation.as_list(label=predicted_class)]

        print(f" LIME generated {len(word_impacts)} contributions")
        print(f" Sample: {word_impacts[:5]}")
        
        # Process contributions
        word_contributions = []
        for word, contribution in word_impacts:
            if predicted_class == 0:  # Fake
                impact = "supporting" if contribution < 0 else "contradicting"
            else:  # Real
                impact = "supporting" if contribution > 0 else "contradicting"
            
            word_contributions.append({
                "word": word,
                "contribution": round(contribution, 3),
                "impact": impact
            })
        
        word_contributions.sort(key=lambda x: abs(x["contribution"]), reverse=True)
        
        top_supporting = [w for w in word_contributions if w["impact"] == "supporting"][:8]
        top_contradicting = [w for w in word_contributions if w["impact"] == "contradicting"][:8]
        
        explanation_summary = generate_explanation_summary(top_supporting, top_contradicting, predicted_class)
        
        return jsonify({
            "success": True,
            "explanation": {
                "word_contributions": word_contributions[:20],
                "top_supporting": top_supporting,
                "top_contradicting": top_contradicting,
                "summary": explanation_summary,
                "predicted_class": "real" if predicted_class == 1 else "fake",
                "original_probability": round(real_prob, 4),
                "confidence_percent": round(real_prob * 100, 2) if predicted_class == 1 else round((1 - real_prob) * 100, 2),
                "total_features": len(word_contributions),
                "explanation_method": "lime"
            }
        })
        
    except Exception as e:
        print(f" LIME explanation failed: {e}")
        import traceback
        traceback.print_exc()
        
        return jsonify({
            "success": False,
            "error": f"Explanation failed: {str(e)}"
        }), 500

@app.route("/api/research-articles", methods=["GET"])
def research_articles():
    try:
        articles = get_research_articles()
        return jsonify({
            "success": True,
            "articles": articles,
            "count": len(articles),
            "last_updated": datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "articles": get_sample_articles()
        }), 500

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "model_loaded": model is not None,
        "tokenizer_loaded": tokenizer is not None,
        "explainer_loaded": explainer is not None,
        "predictor_loaded": predictor is not None,
        "database_initialized": True,
        "timestamp": datetime.now().isoformat()
    })

@app.route("/model-debug", methods=["GET"])
def model_debug():
    if model is None:
        return jsonify({"error": "Model not loaded"}), 500
        
    test_cases = [
        "The weather is nice today",
        "Breaking news: Major discovery announced by scientists",
        "Government secretly controlling everything with hidden chips"
    ]
    
    results = []
    for text in test_cases:
        processed = preprocess_text(text)
        sequences = tokenizer.texts_to_sequences([processed])
        if len(sequences[0]) > 0:
            padded_seq = pad_sequences(sequences, maxlen=MAX_SEQUENCE_LENGTH)
            prob = float(model.predict(padded_seq, verbose=0)[0][0])
            
            if prob >= 0.30:
                prediction = "real"
                confidence = round(prob * 100, 2)
            elif prob <= 0.70:
                prediction = "fake"
                confidence = round((1 - prob) * 100, 2)
            else:
                prediction = "uncertain"
                confidence = 50.0
                
            results.append({
                "text": text,
                "real_probability": round(prob, 4),
                "prediction": prediction,
                "confidence": confidence,
                "tokens_found": len(sequences[0])
            })
        else:
            results.append({
                "text": text,
                "real_probability": None,
                "prediction": "no_tokens",
                "confidence": 0,
                "tokens_found": 0
            })
    
    return jsonify({"test_results": results})

if __name__ == "__main__":
    print(" Starting TruthLens Backend Server...")
    print(" Database path:", os.path.join(base_dir, "users.db"))
    print(" Server running on http://127.0.0.1:5000")
    print(" Available endpoints:")
    print("   /                 - Home page")
    print("   /predict          - Make predictions")
    print("   /explain          - Get explanations")
    print("   /api/research-articles - Get research articles")
    print("   /register         - User registration")
    print("   /login            - User login")
    print("   /health           - Health check")
    
    if model is not None:
        print("\n Testing model with sample text...")
        test_text = "Scientists have discovered a new species in the Amazon rainforest."
        processed = preprocess_text(test_text)
        sequences = tokenizer.texts_to_sequences([processed])
        if len(sequences[0]) > 0:
            padded_seq = pad_sequences(sequences, maxlen=MAX_SEQUENCE_LENGTH)
            prob = float(model.predict(padded_seq, verbose=0)[0][0])
            pred = "real" if prob >= 0.60 else "fake" if prob <= 0.40 else "uncertain"
            print(f" Test: '{test_text[:50]}...' -> Real prob: {prob:.4f} -> {pred}")
        else:
            print(f" Test: '{test_text[:50]}...' -> No tokens found")
    
    app.run(debug=True, host='127.0.0.1', port=5000)