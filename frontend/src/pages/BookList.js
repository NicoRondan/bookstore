// src/pages/BookList.js
import { BooksProvider } from "../contexts/BooksContext";
import { useBooks } from "../hooks/useBooks";
import FiltersSidebar from "../components/FiltersSidebar";
import BookCard from "../components/BookCard";
import Pagination from "../components/Pagination";
import SortDropdown from "../components/SortDropdown";

const BookList = () => {
  return (
    <BooksProvider>
        <div className="content">
          <FiltersSidebar />
          <main className="books-container">
            <SortDropdown />
            <h2>Libros Disponibles</h2>
            <BooksContent />
          </main>
        </div>
    </BooksProvider>
  );
};

const BooksContent = () => {
  const { books, loading, totalPages } = useBooks();
  return loading ? (
    <p>Cargando libros...</p>
  ) : (
    <>
      <div className="book-grid">
        {books.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
      <Pagination totalPages={totalPages} />
    </>
  );
};

export default BookList;
