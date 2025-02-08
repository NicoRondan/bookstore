// src/pages/Favorites.js
import React from "react";
import { useLikesContext } from "../contexts/LikesContext";
import { useUserContext } from "../contexts/UserContext";
import { FaTrash } from "react-icons/fa";
import { Link } from "react-router-dom";

const Favorites = () => {
  const { likedBooks, toggleLike } = useLikesContext();
  const { user } = useUserContext();

  if (!user) {
    return (
      <div className="favorites-container">
        <p className="login-warning">
          Debes iniciar sesión para ver tu lista de favoritos.
        </p>
      </div>
    );
  }

  return (
    <div className="favorites-container">
      <h2>Mis Favoritos</h2>
      {likedBooks.length === 0 ? (
        <p className="no-favorites">No tienes libros en favoritos.</p>
      ) : (
        <div className="favorites-list">
          {likedBooks.map((book) => (
            <div className="favorite-item" key={book.id}>
              <img
                src={book.image_url}
                alt={book.title}
                className="favorite-image"
              />
              <div className="favorite-info">
                <h3>{book.title}</h3>
                <p className="favorite-author">Por {book.author}</p>
                <p className="favorite-price">${book.price}</p>
              </div>
              <button
                className="remove-button"
                onClick={() => toggleLike(book)}
              >
                <FaTrash />
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
      <Link to="/" className="back-link">
        Volver a la tienda
      </Link>
    </div>
  );
};

export default Favorites;
