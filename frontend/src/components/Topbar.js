// src/components/TopBar.js
import React, { useState, useRef, useEffect } from "react";
import { FaHeart, FaUser, FaShoppingCart, FaSearch } from "react-icons/fa";
import { useUserContext } from "../contexts/UserContext";
import { Link, useNavigate } from "react-router-dom";

const TopBar = () => {
  const { user, logout } = useUserContext();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const [visible, setVisible] = useState(true);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    let lastScroll = window.scrollY;

    const handleScroll = () => {
      const currentScroll = window.scrollY;
      if (currentScroll > lastScroll) {
        setVisible(false); // Ocultar cuando baja
      } else {
        setVisible(true); // Mostrar cuando sube
      }
      lastScroll = currentScroll;
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`topbar ${visible ? "visible" : "hidden"}`}>
      <div className="topbar-container">
        <Link to="/" className="logo">
          <img
            src="https://s3-alpha-sig.figma.com/img/2271/6398/0ed1b78403f40306dbe16551b51579bb?Expires=1739750400&Key-Pair-Id=APKAQ4GOSFWCW27IBOMQ&Signature=lZ6yCvBUBAeKbGcwXLQvfFy0E17yni0HrdGDRwBSQeXT8lXcrXzGjabIxixTBNf5bxopySzasYMzyomYdgAW1a4646TH~nJjYtp1EPdGp0zXuKw0GEDp87cN4iezoQuT4h7jje88PbwFs~yzZQc~V1RHuQSuWa9L5xgVPDkQXZfU8I68NOPLagr86L5P5O8F7~7z28QiaanSNvYGMMcRD1VxoHSPyAAZgvUCLI6k14j9W5YmvMQaRRqDtjreDuMz4j9QHHV0X9q0uPEUYIraPItfILYCKWh30A2ke4es7CPDLJgX0hJse~BPZhWidiTYkrrPDHcb~dPQS7beOKwymQ__"
            alt="Logo"
          />
        </Link>
        <div className="search-bar">
          <FaSearch className="search-icon" />
          <input type="text" placeholder="Buscar libros..." />
        </div>
        <div className="topbar-icons">
          {user ? (
            <>
              <Link to="/favorites" className="topbar-item">
                <FaHeart className="topbar-icon" />
                <span>Favoritos</span>
              </Link>
              <Link to="/cart" className="topbar-item">
                <FaShoppingCart className="topbar-icon" />
                <span>Mi Compra</span>
              </Link>
              <div className="topbar-item user-dropdown">
                <div className="user-button">
                  {user.profileImage || user.profile_image ? (
                    <img
                      src={user?.profileImage || user?.profile_image}
                      alt="User"
                      className="user-avatar"
                    />
                  ) : (
                    <FaUser className="user-icon" />
                  )}
                  <span className="username">{user.username}</span>
                </div>
                <div className="dropdown-menu">
                  <Link to="/profile" className="dropdown-item">
                    Perfil
                  </Link>
                  <button onClick={handleLogout} className="dropdown-item">
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </>
          ) : (
            <Link to="/login" className="topbar-item">
              <FaUser className="topbar-icon" />
              <span>Login</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
