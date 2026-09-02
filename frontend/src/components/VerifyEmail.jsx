import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const { verifyEmail, resendVerification } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let isActive = true;
    let redirectTimer;

    const runVerification = async () => {
      if (!token) {
        setMessage('No verification token found');
        setLoading(false);
        return;
      }

      try {
        const result = await verifyEmail(token);

        if (!isActive) return;

        if (result.success) {
          setMessage('Email verified successfully! You can now login.');
          redirectTimer = setTimeout(() => {
            navigate('/login');
          }, 3000);
        } else {
          setMessage(result.error || 'Invalid or expired verification token.');
        }
      } catch (error) {
        if (isActive) {
          setMessage('Verification failed. Please try again.');
        }
      }

      if (isActive) {
        setLoading(false);
      }
    };

    runVerification();

    return () => {
      isActive = false;
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [token, navigate]);

  const handleResend = async () => {
    const email = prompt('Enter your email to resend verification:');
    if (email) {
      const result = await resendVerification(email);
      if (result.success) {
        alert('Verification email resent. Please check your inbox.');
      } else {
        alert('Failed to resend verification. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2>Verifying your email...</h2>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Email Verification</h1>

        <p style={styles.message}>{message}</p>

        {message.includes('Invalid') && (
          <div>
            <p style={styles.subtitle}>
              The verification link may have expired or been used.
            </p>
            <button onClick={handleResend} style={styles.button}>
              Resend Verification Email
            </button>
          </div>
        )}

        <p style={styles.footer}>
          <Link to="/login" style={styles.link}>Back to Login</Link>
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '16px',
  },
  message: {
    fontSize: '16px',
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
  },
  subtitle: {
    color: '#666',
    marginBottom: '16px',
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
    marginBottom: '16px',
  },
  footer: {
    marginTop: '16px',
    color: '#666',
  },
  link: {
    color: '#4CAF50',
    textDecoration: 'none',
    fontWeight: '500',
  },
};

export default VerifyEmail;
