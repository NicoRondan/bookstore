// components/SortDropdown.js
import { useBooksContext } from "../contexts/BooksContext";
import { FaSort } from "react-icons/fa";

const SortDropdown = () => {
  const { filters, setFilters } = useBooksContext();

  const handleSortChange = (e) => {
    setFilters({ ...filters, sort: e.target.value });
  };

  return (
    <div className="sort-container">
      <FaSort className="sort-icon" />
      <select name="sort" onChange={handleSortChange} className="sort-dropdown">
        <option value="default">Ordenar por</option>
        <option value="title-asc">Título (A-Z)</option>
        <option value="title-desc">Título (Z-A)</option>
        <option value="price-asc">Precio (Menor a Mayor)</option>
        <option value="price-desc">Precio (Mayor a Menor)</option>
      </select>
    </div>
  );
};

export default SortDropdown;
