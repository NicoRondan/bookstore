import { createContext, useContext, useState, useEffect } from "react";
import { useUserContext } from "./UserContext";

const LikesContext = createContext();

export const LikesProvider = ({ children }) => {
  const { user } = useUserContext();
  const [likedBooks, setLikedBooks] = useState([]);

  useEffect(() => {
    if (user) {
      fetch(`https://4h2dk6-4000.csb.app/api/likes/${user.id}`)
        .then((res) => res.json())
        .then((data) => {
          setLikedBooks(data);
        })
        .catch((error) => console.error("Error al obtener likes:", error));
    }
  }, [user]);

  const toggleLike = async (book) => {
    if (!user) return;

    const isLiked = likedBooks.some((likedBook) => likedBook.id === book.id);
    const url = "https://4h2dk6-4000.csb.app/api/likes";
    const options = {
      method: isLiked ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id, book_id: book.id }),
    };

    try {
      await fetch(url, options);
      setLikedBooks((prevLikes) => {
        if (isLiked) {
          return prevLikes.filter((likedBook) => likedBook.id !== book.id);
        } else {
          return [...prevLikes, book];
        }
      });
    } catch (error) {
      console.error("Error al cambiar like:", error);
    }
  };

  return (
    <LikesContext.Provider value={{ likedBooks, toggleLike }}>
      {children}
    </LikesContext.Provider>
  );
};

export const useLikesContext = () => useContext(LikesContext);
