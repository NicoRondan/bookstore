// components/Pagination.js
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useBooksContext } from "../contexts/BooksContext";

const Pagination = ({ totalPages }) => {
  const { currentPage, setCurrentPage } = useBooksContext();

  return (
    <div className="pagination">
      <button
        className="pagination-arrow"
        disabled={currentPage === 1}
        onClick={() => setCurrentPage(currentPage - 1)}
      >
        <FaChevronLeft />
      </button>
      {[...Array(totalPages).keys()].slice(0, 5).map((pageNum) => (
        <button
          key={pageNum + 1}
          onClick={() => setCurrentPage(pageNum + 1)}
          className={`pagination-button ${
            currentPage === pageNum + 1 ? "active" : ""
          }`}
        >
          {pageNum + 1}
        </button>
      ))}
      {totalPages > 5 && <span>...</span>}
      <button
        className="pagination-arrow"
        disabled={currentPage >= totalPages}
        onClick={() => setCurrentPage(currentPage + 1)}
      >
        <FaChevronRight />
      </button>
    </div>
  );
};

export default Pagination;
