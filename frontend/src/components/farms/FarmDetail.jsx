import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { farmService } from '../../services/farmService';

const FarmDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [farm, setFarm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCropForm, setShowCropForm] = useState(false);
  const [showAnimalForm, setShowAnimalForm] = useState(false);

  useEffect(() => {
    fetchFarm();
  }, [id]);

  const fetchFarm = async () => {
    try {
      setLoading(true);
      const data = await farmService.getFarmById(id);
      setFarm(data);
    } catch (err) {
      setError('Failed to load farm');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this farm?')) return;
    try {
      await farmService.deleteFarm(id);
      navigate('/farms');
    } catch (err) {
      alert('Failed to delete farm');
      console.error(err);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading farm details...</div>;
  }

  if (error || !farm) {
    return <div style={styles.error}>{error || 'Farm not found'}</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{farm.name}</h1>
          <p style={styles.location}>📍 {farm.location}</p>
        </div>
        <div style={styles.headerActions}>
          <Link to={`/farms/${id}/edit`} style={styles.editButton}>
            ✏️ Edit
          </Link>
          <button onClick={handleDelete} style={styles.deleteButton}>
            🗑️ Delete
          </button>
          <button onClick={() => navigate('/farms')} style={styles.backButton}>
            ← Back
          </button>
        </div>
      </div>

      <div style={styles.infoGrid}>
        <div style={styles.infoCard}>
          <span style={styles.infoLabel}>Size</span>
          <span style={styles.infoValue}>{farm.size} hectares</span>
        </div>
        <div style={styles.infoCard}>
          <span style={styles.infoLabel}>Crops</span>
          <span style={styles.infoValue}>{farm.crops?.length || 0}</span>
        </div>
        <div style={styles.infoCard}>
          <span style={styles.infoLabel}>Animals</span>
          <span style={styles.infoValue}>{farm.animals?.length || 0}</span>
        </div>
        <div style={styles.infoCard}>
          <span style={styles.infoLabel}>Created</span>
          <span style={styles.infoValue}>
            {new Date(farm.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {farm.description && (
        <div style={styles.description}>
          <h3>📝 Description</h3>
          <p>{farm.description}</p>
        </div>
      )}

      {/* Crops Section */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2>🌱 Crops</h2>
        </div>

        {farm.crops?.length === 0 ? (
          <p style={styles.emptyText}>No crops yet. Add your first crop!</p>
        ) : (
          <div style={styles.itemsGrid}>
            {farm.crops.map((crop) => (
              <div key={crop.id} style={styles.itemCard}>
                <h4>{crop.name}</h4>
                <p style={styles.itemDetail}>Variety: {crop.variety || 'N/A'}</p>
                <p style={styles.itemDetail}>Status: {crop.status}</p>
                <p style={styles.itemDetail}>Area: {crop.area || 0} hectares</p>
                <div style={styles.itemActions}>
                  <button style={styles.editSmall}>Edit</button>
                  <button style={styles.deleteSmall}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showCropForm && (
          <CropForm farmId={id} farm={farm} onSuccess={() => { fetchFarm(); setShowCropForm(false); }} />
        )}

        <div style={{ marginTop: '14px' }}>
          <button
            onClick={() => setShowCropForm(!showCropForm)}
            style={styles.addButton}
          >
            + Add Crop
          </button>
        </div>
      </div>

      {/* Animals Section */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2>🐄 Animals</h2>
        </div>

        {farm.animals?.length === 0 ? (
          <p style={styles.emptyText}>No animals yet. Add your first animal!</p>
        ) : (
          <div style={styles.itemsGrid}>
            {farm.animals.map((animal) => (
              <div key={animal.id} style={styles.itemCard}>
                <h4>{animal.name}</h4>
                <p style={styles.itemDetail}>Type: {animal.type}</p>
                <p style={styles.itemDetail}>Breed: {animal.breed || 'N/A'}</p>
                <p style={styles.itemDetail}>Age: {animal.age || 'N/A'}</p>
                <div style={styles.itemActions}>
                  <button style={styles.editSmall}>Edit</button>
                  <button style={styles.deleteSmall}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showAnimalForm && (
          <AnimalForm farmId={id} onSuccess={() => { fetchFarm(); setShowAnimalForm(false); }} />
        )}

        <div style={{ marginTop: '14px' }}>
          <button
            onClick={() => setShowAnimalForm(!showAnimalForm)}
            style={styles.addButton}
          >
            + Add Animal
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// CROP FORM (Inline)
// ============================================

const CropForm = ({ farmId, farm, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    variety: '',
    plantingDate: '',
    area: '',
    status: 'PLANTED',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const reqArea = parseFloat(formData.area) || 0;
    const farmSize = farm?.size ? Number(farm.size) : 0;

    if (farmSize > 0 && reqArea > farmSize) {
      alert(`❌ Logic Error: Planted area (${reqArea} ha) cannot exceed total farm plot size (${farmSize} ha) for "${farm?.name}".`);
      return;
    }

    setLoading(true);
    try {
      await farmService.createCrop({
        ...formData,
        farmId: parseInt(farmId),
        area: reqArea,
      });
      onSuccess();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to add crop');
      console.error(error);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} style={styles.inlineForm}>
      <input
        name="name"
        placeholder="Crop Name"
        value={formData.name}
        onChange={handleChange}
        style={styles.inlineInput}
        required
      />
      <input
        name="variety"
        placeholder="Variety"
        value={formData.variety}
        onChange={handleChange}
        style={styles.inlineInput}
      />
      <input
        name="plantingDate"
        type="date"
        value={formData.plantingDate}
        onChange={handleChange}
        style={styles.inlineInput}
        required
      />
      <input
        name="area"
        placeholder="Area (hectares)"
        value={formData.area}
        onChange={handleChange}
        style={styles.inlineInput}
        type="number"
        step="0.1"
      />
      <select
        name="status"
        value={formData.status}
        onChange={handleChange}
        style={styles.inlineInput}
      >
        <option value="PLANTED">Planted</option>
        <option value="GROWING">Growing</option>
        <option value="HARVESTED">Harvested</option>
        <option value="FAILED">Failed</option>
      </select>
      <button type="submit" style={styles.inlineSubmit} disabled={loading}>
        {loading ? 'Adding...' : 'Add Crop'}
      </button>
    </form>
  );
};

// ============================================
// ANIMAL FORM (Inline)
// ============================================

const AnimalForm = ({ farmId, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'CATTLE',
    breed: '',
    age: '',
    healthStatus: 'HEALTHY',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await farmService.createAnimal({
        ...formData,
        farmId: parseInt(farmId),
        age: parseInt(formData.age) || null,
      });
      onSuccess();
    } catch (error) {
      alert('Failed to add animal');
      console.error(error);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} style={styles.inlineForm}>
      <input
        name="name"
        placeholder="Animal Name"
        value={formData.name}
        onChange={handleChange}
        style={styles.inlineInput}
        required
      />
      <select
        name="type"
        value={formData.type}
        onChange={handleChange}
        style={styles.inlineInput}
      >
        <option value="CATTLE">Cattle</option>
        <option value="SHEEP">Sheep</option>
        <option value="GOAT">Goat</option>
        <option value="PIG">Pig</option>
        <option value="POULTRY">Poultry</option>
        <option value="OTHER">Other</option>
      </select>
      <input
        name="breed"
        placeholder="Breed"
        value={formData.breed}
        onChange={handleChange}
        style={styles.inlineInput}
      />
      <input
        name="age"
        placeholder="Age"
        value={formData.age}
        onChange={handleChange}
        style={styles.inlineInput}
        type="number"
      />
      <select
        name="healthStatus"
        value={formData.healthStatus}
        onChange={handleChange}
        style={styles.inlineInput}
      >
        <option value="HEALTHY">Healthy</option>
        <option value="SICK">Sick</option>
        <option value="UNDER_TREATMENT">Under Treatment</option>
        <option value="QUARANTINED">Quarantined</option>
      </select>
      <button type="submit" style={styles.inlineSubmit} disabled={loading}>
        {loading ? 'Adding...' : 'Add Animal'}
      </button>
    </form>
  );
};

// ============================================
// STYLES
// ============================================

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 'bold',
  },
  location: {
    margin: '4px 0 0',
    color: '#718096',
    fontSize: '16px',
  },
  headerActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  editButton: {
    padding: '8px 16px',
    backgroundColor: '#ED8936',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '14px',
  },
  deleteButton: {
    padding: '8px 16px',
    backgroundColor: '#FC8181',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  backButton: {
    padding: '8px 16px',
    backgroundColor: '#718096',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  infoCard: {
    backgroundColor: '#f7fafc',
    padding: '16px',
    borderRadius: '8px',
    textAlign: 'center',
  },
  infoLabel: {
    display: 'block',
    fontSize: '14px',
    color: '#718096',
  },
  infoValue: {
    display: 'block',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#2D3748',
  },
  description: {
    backgroundColor: '#f7fafc',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  section: {
    marginBottom: '32px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  addButton: {
    padding: '8px 16px',
    backgroundColor: '#48BB78',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  itemsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
  },
  itemCard: {
    backgroundColor: '#f7fafc',
    padding: '16px',
    borderRadius: '8px',
  },
  itemDetail: {
    margin: '4px 0',
    fontSize: '14px',
    color: '#4A5568',
  },
  itemActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
  },
  editSmall: {
    padding: '4px 12px',
    backgroundColor: '#ED8936',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  deleteSmall: {
    padding: '4px 12px',
    backgroundColor: '#FC8181',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  inlineForm: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    padding: '16px',
    backgroundColor: '#f7fafc',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  inlineInput: {
    padding: '8px 12px',
    border: '1px solid #E2E8F0',
    borderRadius: '6px',
    fontSize: '14px',
    flex: '1',
    minWidth: '120px',
  },
  inlineSubmit: {
    padding: '8px 16px',
    backgroundColor: '#48BB78',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  loading: { textAlign: 'center', padding: '40px', color: '#718096' },
  error: { textAlign: 'center', padding: '40px', color: '#E53E3E' },
  emptyText: { color: '#718096', fontStyle: 'italic' },
};

export default FarmDetail;