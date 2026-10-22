"""Machine Learning Engine for loan predictions"""
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
import numpy as np
from typing import Dict, Tuple
import pickle
import os


class MLEngine:
    """Simple ML model for loan eligibility prediction"""
    
    def __init__(self):
        self.model = None
        self.scaler = None
        current_dir = os.path.dirname(os.path.abspath(__file__))
        self.model_path = os.path.join(current_dir, "ml_model.pkl")
        self.scaler_path = os.path.join(current_dir, "ml_scaler.pkl")
        self.load_or_train()

    def load_or_train(self):
        """Load pre-trained model or train new one"""
        if os.path.exists(self.model_path):
            try:
                with open(self.model_path, 'rb') as f:
                    self.model = pickle.load(f)
                with open(self.scaler_path, 'rb') as f:
                    self.scaler = pickle.load(f)
                features = ['age', 'employment_months', 'monthly_income', 'credit_score', 
                           'existing_emi', 'dependents', 'loan_amount', 'tenure']
                self.feature_importance = {
                    feat: float(self.model.coef_[0][i]) for i, feat in enumerate(features)
                }
                return
            except Exception:
                pass
        
        # Train new model on synthetic data
        self._train_model()

    def _train_model(self):
        """Train logistic regression model on sample data"""
        # Synthetic training data (50 samples)
        X = np.array([
            # age, employment_months, monthly_income, credit_score, existing_emi, dependents, loan_amount, tenure
            [25, 12, 30000, 650, 5000, 1, 200000, 24],   # Approved
            [35, 60, 75000, 750, 10000, 2, 500000, 60],  # Approved
            [45, 120, 100000, 800, 15000, 3, 1000000, 120],  # Approved
            [28, 24, 45000, 700, 8000, 2, 300000, 36],   # Approved
            [22, 6, 25000, 600, 0, 0, 150000, 24],       # Rejected (low income)
            [50, 180, 120000, 850, 20000, 4, 800000, 120],  # Approved
            [30, 36, 55000, 720, 12000, 2, 400000, 48],  # Approved
            [26, 18, 35000, 680, 6000, 1, 250000, 30],   # Approved
            [40, 96, 90000, 780, 14000, 3, 600000, 84],  # Approved
            [29, 30, 50000, 710, 9000, 2, 350000, 42],   # Approved
            [21, 3, 20000, 550, 0, 0, 100000, 18],       # Rejected (too young, low income)
            [55, 200, 130000, 820, 25000, 5, 700000, 120],  # Approved
            [32, 48, 65000, 740, 11000, 2, 450000, 54],  # Approved
            [27, 24, 40000, 695, 7000, 1, 280000, 36],   # Approved
            [38, 72, 85000, 770, 13000, 3, 550000, 72],  # Approved
            [24, 12, 32000, 670, 4000, 1, 180000, 24],   # Approved
            [43, 120, 110000, 800, 18000, 4, 750000, 108],  # Approved
            [31, 42, 60000, 730, 10000, 2, 380000, 48],  # Approved
            [28, 30, 48000, 715, 8500, 1, 320000, 36],   # Approved
            [36, 60, 78000, 760, 12500, 3, 500000, 60],  # Approved
            [23, 8, 28000, 640, 3000, 0, 160000, 24],    # Rejected (income too low for amount)
            [48, 144, 125000, 810, 22000, 4, 850000, 120],  # Approved
            [33, 48, 62000, 725, 9500, 2, 400000, 48],   # Approved
            [26, 20, 38000, 690, 5500, 1, 240000, 30],   # Approved
            [41, 96, 95000, 785, 15000, 3, 600000, 72],  # Approved
            [30, 36, 52000, 705, 8200, 2, 340000, 42],   # Approved
            [25, 15, 34000, 675, 4500, 1, 200000, 28],   # Approved
            [44, 132, 115000, 795, 19000, 3, 750000, 108],  # Approved
            [29, 32, 56000, 735, 9800, 2, 380000, 45],   # Approved
            [37, 66, 82000, 765, 13200, 3, 520000, 66],  # Approved
            [20, 2, 18000, 580, 0, 0, 80000, 18],        # Rejected (too young, low income)
            [52, 216, 135000, 830, 26000, 5, 900000, 132],  # Approved
            [34, 54, 68000, 745, 10800, 2, 420000, 54],  # Approved
            [27, 25, 42000, 705, 7000, 1, 260000, 32],   # Approved
            [39, 78, 88000, 775, 14000, 3, 560000, 72],  # Approved
            [28, 28, 46000, 720, 8500, 2, 310000, 38],   # Approved
            [24, 10, 30000, 660, 3500, 0, 170000, 24],   # Rejected (low income)
            [46, 150, 120000, 805, 21000, 4, 800000, 120],  # Approved
            [32, 44, 61000, 735, 10200, 2, 390000, 48],  # Approved
            [25, 18, 36000, 685, 5000, 1, 220000, 28],   # Approved
            [40, 84, 92000, 790, 15000, 3, 580000, 72],  # Approved
            [30, 40, 54000, 715, 9200, 2, 360000, 42],   # Approved
            [26, 22, 40000, 700, 6000, 1, 250000, 30],   # Approved
            [45, 138, 118000, 815, 20000, 4, 780000, 120],  # Approved
            [33, 50, 66000, 750, 11000, 2, 410000, 50],  # Approved
            [28, 26, 44000, 710, 7500, 1, 280000, 34],   # Approved
            [38, 72, 86000, 770, 13500, 3, 540000, 66],  # Approved
            [29, 34, 50000, 725, 9000, 2, 330000, 40],   # Approved
            [22, 5, 22000, 600, 0, 0, 120000, 20],       # Rejected (too young, low income)
            [35, 72, 80000, 760, 12000, 2, 450000, 60],  # Approved (50th sample)
        ])
        
        # Labels: 1 = Approved, 0 = Rejected
        y = np.array([
            1, 1, 1, 1, 0, 1, 1, 1, 1, 1,
            0, 1, 1, 1, 1, 1, 1, 1, 1, 1,
            0, 1, 1, 1, 1, 1, 1, 1, 1, 1,
            0, 1, 1, 1, 1, 1, 0, 1, 1, 1,
            1, 1, 1, 1, 1, 1, 1, 1, 1, 0,
        ])
        
        # Scale features
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)
        
        # Train model
        self.model = LogisticRegression(random_state=42, max_iter=1000)
        self.model.fit(X_scaled, y)
        
        # Save model
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        with open(self.model_path, 'wb') as f:
            pickle.dump(self.model, f)
        with open(self.scaler_path, 'wb') as f:
            pickle.dump(self.scaler, f)
        
        # Feature importance from coefficients
        features = ['age', 'employment_months', 'monthly_income', 'credit_score', 
                   'existing_emi', 'dependents', 'loan_amount', 'tenure']
        for i, feature in enumerate(features):
            self.feature_importance[feature] = float(self.model.coef_[0][i])

    def predict_eligibility(self, applicant_data: Dict) -> Tuple[bool, float, Dict]:
        """
        Predict loan eligibility
        Returns: (eligible, confidence, details)
        """
        try:
            features = np.array([[
                applicant_data.get('age', 30),
                applicant_data.get('employment_duration_months', 12),
                applicant_data.get('monthly_income', 50000),
                applicant_data.get('credit_score', 700),
                applicant_data.get('existing_emi', 0),
                applicant_data.get('number_of_dependents', 0),
                applicant_data.get('requested_amount', 500000),
                applicant_data.get('loan_tenure_months', 60),
            ]])
            
            features_scaled = self.scaler.transform(features)
            prediction = self.model.predict(features_scaled)[0]
            probability = float(self.model.predict_proba(features_scaled)[0][1])
            
            eligible = bool(prediction == 1)
            
            # Calculate risk level
            if probability > 0.8:
                risk_level = "LOW"
            elif probability > 0.6:
                risk_level = "MEDIUM"
            else:
                risk_level = "HIGH"
            
            details = {
                "eligible": eligible,
                "confidence": round(probability * 100, 2),
                "risk_level": risk_level,
                "reasoning": self._generate_reasoning(applicant_data, risk_level),
                "feature_importance": self.feature_importance,
            }
            
            return eligible, probability, details
        
        except Exception as e:
            return False, 0.0, {"error": str(e)}

    def _generate_reasoning(self, data: Dict, risk_level: str) -> str:
        """Generate human-readable reasoning"""
        reasons = []
        
        if data.get('credit_score', 0) > 750:
            reasons.append("Excellent credit score")
        elif data.get('credit_score', 0) < 650:
            reasons.append("Credit score below threshold")
        
        dti_ratio = (data.get('existing_emi', 0) + data.get('monthly_income', 1) * 0.3) / data.get('monthly_income', 1)
        if dti_ratio < 0.4:
            reasons.append("Good debt-to-income ratio")
        elif dti_ratio > 0.6:
            reasons.append("High debt obligations relative to income")
        
        if data.get('employment_duration_months', 0) > 60:
            reasons.append("Stable employment history")
        elif data.get('employment_duration_months', 0) < 12:
            reasons.append("Limited employment history")
        
        if not reasons:
            reasons.append(f"Overall profile: {risk_level} risk")
        
        return "; ".join(reasons)


ml_engine = MLEngine()
