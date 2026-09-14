import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const getAuthHeader = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

export const diseaseService = {
  // Predict disease based on symptoms
  predict: async (symptoms) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/disease/predict`,
        { symptoms },
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      console.error('Error predicting disease:', error);
      throw error.response?.data || { error: 'Prediction failed' };
    }
  },

  // Get all symptoms
  getSymptoms: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/disease/symptoms`,
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching symptoms:', error);
      throw error.response?.data || { error: 'Failed to fetch symptoms' };
    }
  },

  // Get all diseases
  getDiseases: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/disease/diseases`,
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching diseases:', error);
      throw error.response?.data || { error: 'Failed to fetch diseases' };
    }
  },

  // Get model status
  getStatus: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/disease/status`);
      return response.data;
    } catch (error) {
      console.error('Error fetching status:', error);
      throw error.response?.data || { error: 'Failed to fetch status' };
    }
  },

  // Test endpoint (for debugging)
  test: async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/disease/test`);
      return response.data;
    } catch (error) {
      console.error('Error testing:', error);
      throw error.response?.data || { error: 'Test failed' };
    }
  }
};