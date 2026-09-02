import React, { useState, useEffect } from 'react';
import { userService } from '../../services/userService';

const UserForm = ({ user, roles, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    roleName: 'Employee',
    sendVerification: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isEditing = !!user;

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        roleName: user.role?.name || 'Employee',
        password: '',
        sendVerification: false,
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditing) {
        await userService.updateUser(user.id, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          roleName: formData.roleName,
        });
      } else {
        await userService.createUser(formData);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={formStyles.container}>
      <h2 style={formStyles.heading}>
        {isEditing ? '✏️ Edit System User' : '➕ Add New System User'}
      </h2>
      <p style={formStyles.subheading}>
        {isEditing ? 'Update user roles and personal information.' : 'Enter details to register a new user to the platform.'}
      </p>

      {error && <div style={formStyles.error}>{error}</div>}

      <form onSubmit={handleSubmit} style={formStyles.form}>
        <div style={formStyles.row}>
          <div style={formStyles.halfInput}>
            <label style={formStyles.label}>First Name *</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              style={formStyles.input}
              placeholder="e.g. John"
              required
            />
          </div>
          <div style={formStyles.halfInput}>
            <label style={formStyles.label}>Last Name *</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              style={formStyles.input}
              placeholder="e.g. Doe"
              required
            />
          </div>
        </div>

        <div style={formStyles.inputGroup}>
          <label style={formStyles.label}>Email Address *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            style={formStyles.input}
            placeholder="john.doe@ufms.com"
            disabled={isEditing}
            required={!isEditing}
          />
        </div>

        {!isEditing && (
          <>
            <div style={formStyles.inputGroup}>
              <label style={formStyles.label}>Initial Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                style={formStyles.input}
                placeholder="••••••••"
                required
                minLength="6"
              />
            </div>

            <div style={formStyles.checkboxGroup}>
              <input
                type="checkbox"
                name="sendVerification"
                checked={formData.sendVerification}
                onChange={handleChange}
                id="sendVerification"
                style={formStyles.checkbox}
              />
              <label htmlFor="sendVerification" style={{ fontSize: '13px', color: '#475569', cursor: 'pointer' }}>
                Send email verification & credentials to user
              </label>
            </div>
          </>
        )}

        <div style={formStyles.inputGroup}>
          <label style={formStyles.label}>Assigned System Role *</label>
          <select
            name="roleName"
            value={formData.roleName}
            onChange={handleChange}
            style={formStyles.input}
          >
            {roles.map((role) => (
              <option key={role.id || role.name} value={role.name}>
                {role.name}
              </option>
            ))}
          </select>
        </div>

        <div style={formStyles.buttonGroup}>
          <button
            type="button"
            onClick={onCancel}
            style={formStyles.cancelButton}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={formStyles.submitButton}
            disabled={loading}
          >
            {loading ? 'Saving...' : isEditing ? 'Update User' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  );
};

const formStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
  },
  heading: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#0f172a',
    margin: '0 0 4px',
  },
  subheading: {
    fontSize: '13px',
    color: '#64748b',
    margin: '0 0 20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  row: {
    display: 'flex',
    gap: '12px',
  },
  halfInput: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontWeight: '600',
    fontSize: '13px',
    color: '#334155',
  },
  input: {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-block',
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    accentColor: '#10b981',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '12px',
  },
  cancelButton: {
    padding: '11px 20px',
    backgroundColor: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#475569',
    cursor: 'pointer',
    flex: 1,
  },
  submitButton: {
    padding: '11px 20px',
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    flex: 2,
    boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
  },
  error: {
    backgroundColor: '#ffe4e6',
    color: '#f43f5e',
    padding: '10px 14px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '16px',
  },
};

export default UserForm;