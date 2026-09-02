import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { farmService } from '../../services/farmService';

const FarmForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    size: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEditing) {
      fetchFarm();
    }
  }, [id]);

  const fetchFarm = async () => {
    try {
      setLoading(true);
      const data = await farmService.getFarmById(id);
      setFormData({
        name: data.name || '',
        location: data.location || '',
        size: data.size || '',
        description: data.description || '',
      });
    } catch (err) {
      setError('Failed to load farm');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = {
        ...formData,
        size: parseFloat(formData.size),
      };

      if (isEditing) {
        await farmService.updateFarm(id, data);
        alert('Farm updated successfully!');
      } else {
        await farmService.createFarm(data);
        alert('Farm created successfully!');
      }
      navigate('/farms');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save farm');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditing) {
    return <div style={styles.loading}>Loading farm...</div>;
  }

  return (
    <div style={styles.container}>
      <h1>{isEditing ? '✏️ Edit Farm' : '➕ Add New Farm'}</h1>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Farm Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            style={styles.input}
            required
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Location *</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            style={styles.input}
            required
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Size (hectares) *</label>
          <input
            type="number"
            name="size"
            value={formData.size}
            onChange={handleChange}
            style={styles.input}
            step="0.1"
            required
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            style={styles.textarea}
            rows="4"
          />
        </div>

        <div style={styles.buttonGroup}>
          <button
            type="button"
            onClick={() => navigate('/farms')}
            style={styles.cancelButton}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Saving...' : isEditing ? 'Update Farm' : 'Create Farm'}
          </button>
        </div>
      </form>
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontWeight: '600',
    fontSize: '14px',
    color: '#2D3748',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '16px',
  },
  textarea: {
    padding: '10px 12px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '16px',
    resize: 'vertical',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: '#E2E8F0',
    color: '#2D3748',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
    flex: 1,
  },
  submitButton: {
    padding: '12px 24px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
    flex: 2,
  },
  error: {
    backgroundColor: '#FED7D7',
    color: '#C53030',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#718096',
  },
};

export default FarmForm;