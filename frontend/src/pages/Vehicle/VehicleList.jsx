import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FaPlus, FaEye, FaEdit, FaTrash, FaFilter, FaCar, FaSearch,
} from 'react-icons/fa';
import { getVehicles, deleteVehicle } from '../../services/vehicleService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { toast } from 'react-toastify';

const FUEL_TYPES = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'];
const TRANSMISSION_TYPES = ['Manual', 'Automatic'];

const VehicleList = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [fuelFilter, setFuelFilter] = useState('');
  const [transmissionFilter, setTransmissionFilter] = useState('');
  const [sortBy, setSortBy] = useState('Newest');

  const fetchVehicles = useCallback(async (
    currentPage = 1,
    currentKeyword = '',
    fuel = '',
    transmission = ''
  ) => {
    try {
      setLoading(true);
      const data = await getVehicles(currentPage, 10, currentKeyword, fuel, transmission);
      setVehicles(data.vehicles);
      setPages(data.pages);
      setTotal(data.total);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error fetching vehicles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles(page, keyword, fuelFilter, transmissionFilter);
  }, [page, fuelFilter, transmissionFilter]); // eslint-disable-line

  const handleSearch = (e) => {
    const val = e.target.value;
    setKeyword(val);
    setPage(1);
    fetchVehicles(1, val, fuelFilter, transmissionFilter);
  };

  const handleFuelFilter = (e) => {
    setFuelFilter(e.target.value);
    setPage(1);
  };

  const handleTransmissionFilter = (e) => {
    setTransmissionFilter(e.target.value);
    setPage(1);
  };

  const clearFilters = () => {
    setKeyword('');
    setFuelFilter('');
    setTransmissionFilter('');
    setSortBy('Newest');
    setPage(1);
    fetchVehicles(1, '', '', '');
  };

  const handleDelete = async (id, vehicleNumber) => {
    if (window.confirm(`Are you sure you want to delete vehicle ${vehicleNumber}? This action cannot be undone.`)) {
      try {
        await deleteVehicle(id);
        toast.success('Vehicle deleted successfully');
        fetchVehicles(page, keyword, fuelFilter, transmissionFilter);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Error deleting vehicle');
      }
    }
  };

  // Client-side sort (backend already sorts by newest)
  const sortedVehicles = [...vehicles].sort((a, b) => {
    if (sortBy === 'Vehicle No. A-Z') return a.vehicleNumber.localeCompare(b.vehicleNumber);
    if (sortBy === 'Vehicle No. Z-A') return b.vehicleNumber.localeCompare(a.vehicleNumber);
    if (sortBy === 'Brand A-Z') return a.brand.localeCompare(b.brand);
    if (sortBy === 'Year Newest') return b.manufacturingYear - a.manufacturingYear;
    if (sortBy === 'Year Oldest') return a.manufacturingYear - b.manufacturingYear;
    return 0; // 'Newest' = backend default
  });

  const hasFilters = keyword || fuelFilter || transmissionFilter;

  return (
    <div>
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/admin-dashboard">Home</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Vehicles
          </li>
        </ol>
      </nav>

      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="text-navy fw-bold mb-0">Vehicle Management</h2>
          <p className="text-muted mb-0 small mt-1">
            {total} vehicle{total !== 1 ? 's' : ''} registered in the system
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link
            to="/vehicles/add"
            id="btn-add-vehicle"
            className="btn btn-orange d-flex align-items-center gap-2 shadow-sm"
          >
            <FaPlus /> Add Vehicle
          </Link>
        </div>
      </div>

      <div className="bg-card p-4">
        {/* Search & Filters Row */}
        <div className="row mb-4 align-items-center g-3">
          {/* Search */}
          <div className="col-md-5 col-lg-4">
            <div className="input-group shadow-sm">
              <span className="input-group-text bg-white border-end-0">
                <FaSearch className="text-muted" />
              </span>
              <input
                id="vehicle-search"
                type="text"
                className="form-control border-start-0 ps-0"
                placeholder="Search by number, brand or model..."
                value={keyword}
                onChange={handleSearch}
              />
            </div>
          </div>

          {/* Filters */}
          <div className="col-md-7 col-lg-8 d-flex justify-content-md-end gap-2 flex-wrap">
            <div className="d-flex align-items-center gap-2">
              <FaFilter className="text-muted" />
              <select
                id="fuel-filter"
                className="form-select bg-light border-0 shadow-sm"
                style={{ width: 'auto' }}
                value={fuelFilter}
                onChange={handleFuelFilter}
              >
                <option value="">Fuel Type: All</option>
                {FUEL_TYPES.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div className="d-flex align-items-center gap-2">
              <FaFilter className="text-muted" />
              <select
                id="transmission-filter"
                className="form-select bg-light border-0 shadow-sm"
                style={{ width: 'auto' }}
                value={transmissionFilter}
                onChange={handleTransmissionFilter}
              >
                <option value="">Transmission: All</option>
                {TRANSMISSION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="d-flex align-items-center gap-2">
              <FaFilter className="text-muted" />
              <select
                id="sort-filter"
                className="form-select bg-light border-0 shadow-sm"
                style={{ width: 'auto' }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="Newest">Sort: Newest</option>
                <option value="Vehicle No. A-Z">Vehicle No. (A-Z)</option>
                <option value="Vehicle No. Z-A">Vehicle No. (Z-A)</option>
                <option value="Brand A-Z">Brand (A-Z)</option>
                <option value="Year Newest">Year (Newest)</option>
                <option value="Year Oldest">Year (Oldest)</option>
              </select>
            </div>

            {hasFilters && (
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={clearFilters}
                title="Clear all filters"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-hover align-middle border" id="vehicles-table">
                <thead className="table-light">
                  <tr>
                    <th className="px-3">#</th>
                    <th>Vehicle No.</th>
                    <th>Make &amp; Model</th>
                    <th>Year</th>
                    <th>Fuel / Transmission</th>
                    <th>Odometer</th>
                    <th>Owner</th>
                    <th>Registered On</th>
                    <th className="text-end px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedVehicles.map((vehicle, idx) => (
                    <tr key={vehicle._id}>
                      <td className="px-3 text-muted small">
                        {(page - 1) * 10 + idx + 1}
                      </td>
                      <td>
                        <span className="fw-bold text-navy d-flex align-items-center gap-2">
                          <FaCar className="text-orange" />
                          {vehicle.vehicleNumber}
                        </span>
                      </td>
                      <td>
                        <span className="fw-semibold">{vehicle.brand}</span>{' '}
                        <span className="text-muted">{vehicle.model}</span>
                      </td>
                      <td>{vehicle.manufacturingYear}</td>
                      <td>
                        <span className="badge bg-primary bg-opacity-10 text-primary border me-1 fw-normal">
                          {vehicle.fuelType}
                        </span>
                        <span className="badge bg-secondary bg-opacity-10 text-secondary border fw-normal">
                          {vehicle.transmission}
                        </span>
                      </td>
                      <td>
                        <span className="fw-medium">
                          {vehicle.currentOdometerReading?.toLocaleString()} km
                        </span>
                      </td>
                      <td>
                        {vehicle.customer ? (
                          <>
                            <span className="fw-semibold">{vehicle.customer.fullName}</span>
                            <br />
                            <small className="text-muted">{vehicle.customer.mobileNumber}</small>
                          </>
                        ) : (
                          <span className="text-muted fst-italic">Unassigned</span>
                        )}
                      </td>
                      <td className="text-muted small">
                        {new Date(vehicle.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="text-end px-3">
                        <div className="d-flex gap-2 justify-content-end">
                          <Link
                            to={`/vehicles/${vehicle._id}`}
                            className="btn btn-sm btn-light border text-primary"
                            title="View Details"
                          >
                            <FaEye />
                          </Link>
                          <Link
                            to={`/vehicles/edit/${vehicle._id}`}
                            className="btn btn-sm btn-light border text-secondary"
                            title="Edit Vehicle"
                          >
                            <FaEdit />
                          </Link>
                          <button
                            className="btn btn-sm btn-light border text-danger"
                            onClick={() => handleDelete(vehicle._id, vehicle.vehicleNumber)}
                            title="Delete Vehicle"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sortedVehicles.length === 0 && (
                    <tr>
                      <td colSpan="9" className="text-center py-5">
                        <FaCar size={40} className="text-muted mb-3 d-block mx-auto" />
                        <div className="text-muted mb-2 fw-medium">No vehicles found</div>
                        {hasFilters && (
                          <button
                            className="btn btn-sm btn-outline-secondary mt-2"
                            onClick={clearFilters}
                          >
                            Clear Filters
                          </button>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <nav aria-label="Vehicle list pagination" className="mt-4">
                <ul className="pagination justify-content-center">
                  <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setPage(page - 1)}
                      aria-label="Previous page"
                    >
                      &laquo; Previous
                    </button>
                  </li>
                  {[...Array(pages).keys()].map((x) => (
                    <li
                      key={x + 1}
                      className={`page-item ${page === x + 1 ? 'active' : ''}`}
                    >
                      <button
                        className="page-link"
                        onClick={() => setPage(x + 1)}
                        aria-label={`Page ${x + 1}`}
                      >
                        {x + 1}
                      </button>
                    </li>
                  ))}
                  <li className={`page-item ${page === pages ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setPage(page + 1)}
                      aria-label="Next page"
                    >
                      Next &raquo;
                    </button>
                  </li>
                </ul>
              </nav>
            )}

            {/* Footer: showing X - Y of Z */}
            {total > 0 && (
              <p className="text-center text-muted small mt-2 mb-0">
                Showing {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} of {total} vehicles
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default VehicleList;
