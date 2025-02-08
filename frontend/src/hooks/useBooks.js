// hooks/useBooks.js
import { useState, useEffect } from "react";
import { useBooksContext } from "../contexts/BooksContext";

const API_URL = "http://localhost:4000/api/books";

export const useBooks = () => {
  const { filters, currentPage, booksPerPage } = useBooksContext();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: currentPage,
          limit: booksPerPage,
          ...filters,
        }).toString();

        const response = await fetch(`${API_URL}?${params}`);
        const data = await response.json();

        setBooks(data.books);
        setTotalPages(data.total ? Math.ceil(data.total / booksPerPage) : 1);
      } catch (error) {
        console.error("Error fetching books:", error);
      }
      setLoading(false);
    };
    fetchBooks();
  }, [filters, currentPage]);

  return { books, loading, totalPages };
};
