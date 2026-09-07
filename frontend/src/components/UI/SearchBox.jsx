import React from 'react';
import { FaSearch } from 'react-icons/fa';

const SearchBox = ({ value, onChange, placeholder = "Search..." }) => {
  return (
    <div className="input-group">
      <span className="input-group-text bg-white border-end-0">
        <FaSearch className="text-muted" />
      </span>
      <input
        type="text"
        className="form-control border-start-0 ps-0"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
};

export default SearchBox;
