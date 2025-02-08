import React, { useState } from "react";
import { useUserContext } from "../contexts/UserContext";

const Profile = () => {
  const { user, updateUser } = useUserContext();
  const [username, setUsername] = useState(user?.username || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState(user?.address || "");
  const [profileImage, setProfileImage] = useState(
    user?.profileImage ||
      user?.profile_image ||
      "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png"
  );
  const [profileImageFile, setProfileImageFile] = useState(null);

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await updateUser({ username, phone, address }, profileImageFile);
  };

  return (
    <div className="profile-container">
      <h2 className="profile-title">Mi Perfil</h2>
      <div className="profile-content">
        <div className="profile-image-container">
          <img src={profileImage} className="profile-image" />
          <input
            type="file"
            id="imageUpload"
            accept="image/*"
            onChange={handleImageChange}
            hidden
          />
          <label htmlFor="imageUpload" className="edit-profile-picture">
            Editar Foto de Perfil
          </label>
        </div>
        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nombre de usuario"
            />
          </div>
          <div className="input-group">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Número de teléfono"
            />
          </div>
          <div className="input-group">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Dirección"
            />
          </div>
          <button type="submit" className="save-button">
            Guardar Cambios
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
