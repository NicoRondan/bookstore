import { FaHeart, FaShoppingCart } from "react-icons/fa";
import { useLikesContext } from "../contexts/LikesContext";

const BookCard = ({ book }) => {
  const { likedBooks, toggleLike } = useLikesContext();
  const isLiked = likedBooks.some((likedBook) => likedBook.id === book.id);

  const handleLikeClick = () => {
    toggleLike(book);
  };

  return (
    <div className="book-card">
      <img src={book.image_url} alt={book.title} className="book-image" />
      <div className="book-info">
        <h3 className="book-title">{book.title}</h3>
        <p className="book-author">{book.author}</p>
        <p className="book-price">${book.price}</p>
        <div className="book-actions">
          <button
            className={`favorite-button ${isLiked ? "liked" : ""}`}
            title="Agregar a favoritos"
            onClick={handleLikeClick}
          >
            <FaHeart size={20} className="heart-icon" />
          </button>
          <button className="cart-button" title="Añadir al carrito">
            <FaShoppingCart size={20} />
          </button>
        </div>
        <button className="buy-button">Comprar</button>
      </div>
    </div>
  );
};

export default BookCard;
