import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  // Get user data from localStorage
  const userData = localStorage.getItem('user');
  
  if (!userData) {
    // Redirect to login if no user data
    return <Navigate to="/" replace />;
  }

  try {
    const user = JSON.parse(userData);
    
    // If role is required, check if user has the required role
    if (requiredRole) {
      const userRole = user.role;
      
      // Role hierarchy: participant < host < admin
      const roleHierarchy = {
        'participant': 1,
        'host': 2,
        'admin': 3
      };
      
      if (roleHierarchy[userRole] < roleHierarchy[requiredRole]) {
        // User doesn't have required role, redirect to login
        localStorage.removeItem('user');
        return <Navigate to="/" replace />;
      }
    }
    
    // User is authenticated and has required role
    return children;
    
  } catch (error) {
    // Invalid user data, redirect to login
    localStorage.removeItem('user');
    return <Navigate to="/" replace />;
  }
};

export default ProtectedRoute;
