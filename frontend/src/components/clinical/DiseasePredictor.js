import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const DiseasePredictor = () => {
    const [symptoms, setSymptoms] = useState({});
    const [availableSymptoms, setAvailableSymptoms] = useState([]);
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [diseases, setDiseases] = useState([]);

    // Fetch available symptoms on component mount
    useEffect(() => {
        fetchSymptoms();
        fetchDiseases();
    }, []);

    const fetchSymptoms = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/api/disease/symptoms`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setAvailableSymptoms(response.data.symptoms);
                // Initialize symptoms state with all symptoms set to 0
                const initialSymptoms = {};
                response.data.symptoms.forEach(symptom => {
                    initialSymptoms[symptom] = 0;
                });
                setSymptoms(initialSymptoms);
            }
        } catch (err) {
            console.error('Error fetching symptoms:', err);
            setError('Failed to load symptoms');
        }
    };

    const fetchDiseases = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/api/disease/diseases`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setDiseases(response.data.diseases);
            }
        } catch (err) {
            console.error('Error fetching diseases:', err);
        }
    };

    const handleSymptomChange = (symptom, value) => {
        setSymptoms(prev => ({
            ...prev,
            [symptom]: value ? 1 : 0
        }));
    };

    const handlePredict = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const token = localStorage.getItem('token');
            const selectedSymptoms = {};
            Object.keys(symptoms).forEach(symptom => {
                if (symptoms[symptom] === 1) {
                    selectedSymptoms[symptom] = 1;
                }
            });

            const response = await axios.post(`${API_BASE_URL}/api/disease/predict`, 
                { symptoms: selectedSymptoms },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (response.data.success) {
                setPrediction(response.data.prediction);
            } else {
                setError(response.data.error || 'Prediction failed');
            }
        } catch (err) {
            console.error('Error predicting disease:', err);
            setError(err.response?.data?.error || 'Failed to get prediction');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        const resetSymptoms = {};
        availableSymptoms.forEach(symptom => {
            resetSymptoms[symptom] = 0;
        });
        setSymptoms(resetSymptoms);
        setPrediction(null);
        setError(null);
    };

    // Get common symptoms for quick selection (first 20 symptoms)
    const commonSymptoms = availableSymptoms.slice(0, 20);

    return (
        <div className="disease-predictor">
            <h2>AI Disease Predictor</h2>
            <p className="text-muted">Select symptoms to get AI-powered disease prediction</p>

            {error && (
                <div className="alert alert-danger">
                    {error}
                </div>
            )}

            <div className="row">
                <div className="col-md-6">
                    <div className="card">
                        <div className="card-header">
                            <h5>Select Symptoms</h5>
                        </div>
                        <div className="card-body">
                            <div className="symptom-search">
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    placeholder="Search symptoms..."
                                    onChange={(e) => {
                                        const searchTerm = e.target.value.toLowerCase();
                                        const filtered = availableSymptoms.filter(s => 
                                            s.toLowerCase().includes(searchTerm)
                                        );
                                        // You can implement filtering logic here
                                    }}
                                />
                            </div>
                            
                            <div className="symptom-grid mt-3">
                                {commonSymptoms.map(symptom => (
                                    <div key={symptom} className="form-check">
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            id={`symptom-${symptom}`}
                                            checked={symptoms[symptom] === 1}
                                            onChange={(e) => handleSymptomChange(symptom, e.target.checked)}
                                        />
                                        <label className="form-check-label" htmlFor={`symptom-${symptom}`}>
                                            {symptom.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </label>
                                    </div>
                                ))}
                            </div>
                            
                            {availableSymptoms.length > 20 && (
                                <div className="mt-2">
                                    <small className="text-muted">
                                        Showing 20 of {availableSymptoms.length} symptoms. Search for more.
                                    </small>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-md-6">
                    <div className="card">
                        <div className="card-header">
                            <h5>Prediction Results</h5>
                        </div>
                        <div className="card-body">
                            {loading && (
                                <div className="text-center">
                                    <div className="spinner-border text-primary" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                    <p>Analyzing symptoms...</p>
                                </div>
                            )}

                            {prediction && !loading && (
                                <div>
                                    <div className="prediction-result">
                                        <h4>Predicted Disease:</h4>
                                        <div className="disease-name">
                                            {prediction.predicted_disease}
                                        </div>
                                        <div className="confidence">
                                            Confidence: {prediction.confidence_percentage}
                                        </div>
                                        <div className="symptoms-count">
                                            Symptoms used: {prediction.symptoms_used} / {prediction.total_symptoms_considered}
                                        </div>
                                    </div>

                                    <div className="top-predictions mt-4">
                                        <h5>Top 3 Possible Diseases:</h5>
                                        {prediction.top_predictions.map((pred, index) => (
                                            <div key={index} className="prediction-item">
                                                <div className="disease">{pred.disease}</div>
                                                <div className="progress">
                                                    <div 
                                                        className="progress-bar" 
                                                        style={{ width: pred.confidence_percentage }}
                                                    >
                                                        {pred.confidence_percentage}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!prediction && !loading && (
                                <div className="text-center text-muted">
                                    <p>Select symptoms and click "Predict Disease" to see results</p>
                                </div>
                            )}

                            <div className="action-buttons mt-3">
                                <button 
                                    className="btn btn-primary me-2"
                                    onClick={handlePredict}
                                    disabled={loading}
                                >
                                    {loading ? 'Predicting...' : 'Predict Disease'}
                                </button>
                                <button 
                                    className="btn btn-secondary"
                                    onClick={handleReset}
                                    disabled={loading}
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .symptom-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 10px;
                    max-height: 400px;
                    overflow-y: auto;
                    padding: 10px;
                }
                .disease-name {
                    font-size: 24px;
                    font-weight: bold;
                    color: #28a745;
                    margin: 10px 0;
                }
                .confidence {
                    font-size: 18px;
                    color: #ffc107;
                    margin-bottom: 10px;
                }
                .prediction-item {
                    margin: 10px 0;
                }
                .progress {
                    height: 25px;
                    margin-top: 5px;
                }
                .progress-bar {
                    background-color: #007bff;
                    color: white;
                    line-height: 25px;
                    padding-left: 10px;
                    text-align: left;
                }
                .action-buttons {
                    display: flex;
                    justify-content: center;
                }
                .symptom-search {
                    margin-bottom: 10px;
                }
            `}</style>
        </div>
    );
};

export default DiseasePredictor;