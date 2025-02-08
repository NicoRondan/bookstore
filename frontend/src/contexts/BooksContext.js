// contexts/BooksContext.js
import { createContext, useContext, useState } from "react";

const BooksContext = createContext();

export const BooksProvider = ({ children }) => {
  const [filters, setFilters] = useState({
    genre: "",
    author: "",
    minPrice: "",
    maxPrice: "",
    title: "",
    sort: "default",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const booksPerPage = 9;

  return (
    <BooksContext.Provider
      value={{ filters, setFilters, currentPage, setCurrentPage, booksPerPage }}
    >
      {children}
    </BooksContext.Provider>
  );
};

export const useBooksContext = () => useContext(BooksContext);
