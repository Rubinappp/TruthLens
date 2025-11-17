# TruthLens

TruthLens is a **misinformation detection web application** that classifies text as **real** or **fake** news using a deep learning LSTM model. It provides **interpretable predictions** using LIME and fetches fact-checking articles to support analysis.

---

## Features

- **News Classification**: Detect if a news article or text is real or fake.
- **Explainable AI**: Word-level explanations using LIME for transparent predictions.
- **User Management**: Register and login users.
- **Research Articles**: Fetches articles from fact-checking sources (Snopes, PolitiFact, FactCheck.org).
- **Interactive Frontend**: Built with React for a user-friendly interface.
- **Backend API**: Flask backend serving model predictions, explanations, and research data.

---

## Project Structure
```
TruthLens/
│
├── backend/ # Flask backend
│ ├── app.py # Main server and API routes
│ └── requirements.txt # Python dependencies
│
├── frontend/ # React frontend
│ ├── public/ # Static assets
│ └── src/ # React components
│
├── notebooks/ # Jupyter notebooks for training
│ └── model.ipynb
│
├── ML_model/ # Trained LSTM model (ignored in Git)
│ ├── my_lstm_model.h5
│ └── tokenizer.pkl
│
└── .gitignore
```
## Installation

### Prerequisites

- Python 3.8+  
- Node.js 14+ and npm  

### Backend Setup


```bash
# Navigate to the backend folder
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install backend dependencies
pip install -r requirements.txt

# Run the backend server
python app.py
# Backend runs at: http://127.0.0.1:5000


# Frontend Setup


# Navigate to the frontend folder
cd ../frontend

# Install frontend dependencies
npm install

# Start the frontend
npm start
# Frontend runs at: http://localhost:3000

```

# Usage
 1. Open the frontend in your browser: http://localhost:3000.

 2. Enter or paste a news article or text.

 3. Click Analyze to see:
     a. Prediction (real, fake, or uncertain)
     b. Confidence percentage
     c. Word-level explanation (LIME)

```

| Endpoint                 | Method | Description                  |                         
|   /                      | GET    | Home page                    |
|  /predict                | POST   | Predict real/fake news       |
|  /explain                | POST   | Get LIME explanation         |
|  /api/research-articles  | GET    | Fetch fact-checking articles |
|  /register               | POST   | Register a new user          |
|  /login                  | POST   | User login                   |
|  /health                 | GET    | Backend health check         |
|  /model-debug            | GET    | Test model on sample texts   |

```


Acknowledgements
React – Frontend framework

Flask – Backend API

Kaggle – Fake and real news datasets

LIME – Explainable AI library