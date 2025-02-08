// components/FiltersSidebar.js
import { useBooksContext } from "../contexts/BooksContext";

const FiltersSidebar = () => {
  const { filters, setFilters, setCurrentPage } = useBooksContext();

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setCurrentPage(1);
  };

  return (
    <aside className="filters-sidebar">
      <h3>Filtros</h3>
      <div className="filter-group">
        <input
          type="text"
          name="title"
          placeholder="Buscar por título"
          onChange={handleFilterChange}
          className="filter-input"
        />
        <select
          name="genre"
          onChange={handleFilterChange}
          className="filter-input"
        >
          <option value="">Todos los Géneros</option>
          <option value="Ficción">Ficción</option>
          <option value="No Ficción">No Ficción</option>
          <option value="Misterio">Misterio</option>
          <option value="Fantasía">Fantasía</option>
          <option value="Ciencia Ficción">Ciencia Ficción</option>
          <option value="Romance">Romance</option>
          <option value="Terror">Terror</option>
        </select>
        <input
          type="text"
          name="author"
          placeholder="Autor"
          onChange={handleFilterChange}
          className="filter-input"
        />
        <input
          type="number"
          name="minPrice"
          placeholder="Precio mínimo"
          onChange={handleFilterChange}
          className="filter-input"
        />
        <input
          type="number"
          name="maxPrice"
          placeholder="Precio máximo"
          onChange={handleFilterChange}
          className="filter-input"
        />
      </div>
    </aside>
  );
};

export default FiltersSidebar;
