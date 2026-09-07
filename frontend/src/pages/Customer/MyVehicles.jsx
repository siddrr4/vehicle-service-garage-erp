import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaCar, FaPlus, FaEye } from 'react-icons/fa';
import api from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { toast } from 'react-toastify';

const MyVehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyVehicles = async () => {
      try {
        const { data } = await api.get('/vehicles/my-vehicles');
        setVehicles(data);
        setLoading(false);
      } catch (error) {
        if (error.response?.status !== 404) {
          toast.error('Failed to load your vehicles');
        }
        setLoading(false);
      }
    };
    fetchMyVehicles();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/customer-dashboard">Home</Link></li>
          <li className="breadcrumb-item active" aria-current="page">My Vehicles</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-navy fw-bold m-0">My Vehicles</h2>
        <Link to="/request-service" className="btn btn-orange d-flex align-items-center gap-2">
          <FaPlus /> Request Service
        </Link>
      </div>

      <div className="bg-card p-4 rounded shadow-sm">
        {vehicles.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <FaCar size={64} className="mb-3 opacity-25" />
            <h4 className="fw-bold text-navy">No Vehicles Found</h4>
            <p className="mb-0">You don't have any vehicles registered in our system yet.</p>
            <p className="small">Please contact the admin if you recently added a vehicle.</p>
          </div>
        ) : (
          <div className="row g-4">
            {vehicles.map((vehicle) => (
              <div key={vehicle._id} className="col-md-6 col-lg-4">
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h5 className="card-title fw-bold text-navy mb-1">{vehicle.vehicleNumber}</h5>
                        <h6 className="card-subtitle text-muted">{vehicle.brand} {vehicle.model}</h6>
                      </div>
                      <span className="badge bg-light text-dark border">{vehicle.manufacturingYear}</span>
                    </div>
                    
                    <ul className="list-unstyled mb-4 small text-muted">
                      <li className="mb-2"><strong>Fuel:</strong> {vehicle.fuelType}</li>
                      <li className="mb-2"><strong>Transmission:</strong> {vehicle.transmission}</li>
                      <li className="mb-2"><strong>Odometer:</strong> {vehicle.currentOdometerReading} km</li>
                    </ul>

                    <Link to={`/vehicles/${vehicle._id}`} className="btn btn-outline-primary w-100 d-flex align-items-center justify-content-center gap-2">
                      <FaEye /> View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyVehicles;
