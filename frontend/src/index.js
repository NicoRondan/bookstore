// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";

import BookList from "./pages/BookList";
import Favorites from "./pages/Favorites";
import Login from "./pages/Login";
import Profile from "./pages/Profile";

import TopBar from "./components/Topbar";
import Footer from "./components/Footer";

import { UserProvider, useUserContext } from "./contexts/UserContext";
import { LikesProvider } from "./contexts/LikesContext";
import "react-toastify/dist/ReactToastify.css";
import "./styles/styles.scss";

const PrivateRoute = ({ children }) => {
  const { user } = useUserContext();
  return user ? children : <Navigate to="/login" replace />;
};

const App = () => (
  <div className="layout">
    <Router>
      <UserProvider>
        <LikesProvider>
          <TopBar />
          <Routes>
            <Route path="/" element={<BookList />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/favorites"
              element={
                <PrivateRoute>
                  <Favorites />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
          </Routes>
          <Footer />
        </LikesProvider>
      </UserProvider>
    </Router>
  </div>
);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
    <ToastContainer position="top-right" autoClose={3000} />
  </React.StrictMode>
);
