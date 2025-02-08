// src/contexts/UserContext.js
import { createContext, useContext, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const location = useLocation();
  const navigate = useNavigate();

  // Manejar autenticación cuando Google redirige con token
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("token", token);
      fetchUser(token);
      navigate("/", { replace: true });
    }
  }, [location, navigate]);

  const fetchUser = async (token) => {
    try {
      const response = await fetch("https://4h2dk6-4000.csb.app/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Error al obtener el usuario");

      const userData = await response.json();
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
    } catch (error) {
      console.error("❌ Error en fetchUser:", error);
      toast.error("Error al cargar usuario.");
    }
  };

  const login = async (email, password) => {
    try {
      const response = await fetch(
        "https://4h2dk6-4000.csb.app/api/users/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
          mode: "cors",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Error en la respuesta: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.token) {
        setUser(data.user);
        localStorage.setItem("token", data.token);
      } else {
        console.error("Error de autenticación: No se recibió un token.");
      }
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const register = async (username, email, password, setIsRegistering) => {
    try {
      const response = await fetch("https://4h2dk6-4000.csb.app/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("Registro exitoso. Ahora puedes iniciar sesión.");
        setIsRegistering(false);
      } else {
        toast.error(data.error || "Error al registrar usuario");
        setIsRegistering(true);
      }
    } catch (error) {
      console.error("Error en el registro:", error);
      toast.error("Hubo un error en el servidor.");
      setIsRegistering(true);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const updateUser = async (updatedUser, profileImageFile) => {
    const formData = new FormData();
    formData.append("username", updatedUser.username);
    formData.append("phone", updatedUser.phone);
    formData.append("address", updatedUser.address);

    // Si el usuario subió una nueva imagen, la agregamos al FormData
    if (profileImageFile) {
      console.log("📤 Se subirá una nueva imagen:", profileImageFile.name);
      formData.append("profile_image", profileImageFile);
    } else {
      console.log("❗ No se subió ninguna imagen nueva, se usará la anterior.");
    }

    try {
      const response = await fetch(
        `https://4h2dk6-4000.csb.app/api/users/${user.id}`,
        {
          method: "PUT",
          body: formData,
        }
      );

      const data = await response.json();

      if (data.message) {
        const updatedUserData = {
          ...user,
          ...updatedUser,
          profileImage:
            data.profile_image || user.profileImage || user.profile_image,
        };

        setUser(updatedUserData);
        localStorage.setItem("user", JSON.stringify(updatedUserData));
        toast.success("Perfil actualizado con éxito.");
      } else {
        console.error("Error en respuesta del servidor:", data);
        toast.error(data.error || "Error al actualizar el perfil.");
      }
    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      toast.error("Hubo un problema con la actualización.");
    }
  };

  return (
    <UserContext.Provider value={{ user, login, logout, updateUser, register }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => useContext(UserContext);
