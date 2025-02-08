import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserContext } from "../contexts/UserContext";
import { FaGoogle, FaEnvelope, FaLock, FaUser } from "react-icons/fa";
import { motion } from "framer-motion";
import { ClipLoader } from "react-spinners";

const Login = () => {
  const { login, register } = useUserContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = (e) => {
    e.preventDefault();
    window.location.href = "https://4h2dk6-4000.csb.app/api/users/auth/google";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (isRegistering) {
      await register(username, email, password, setIsRegistering);
    } else {
      await login(email, password);
      navigate("/", { replace: true });
    }

    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-logo">
        <img
          src="https://s3-alpha-sig.figma.com/img/a008/9900/7de1f02a3a9cd496d685169962a3654b?Expires=1739750400&Key-Pair-Id=APKAQ4GOSFWCW27IBOMQ&Signature=eloQiq05pUSCCYzRGRi~SY5~p7Q7c8tZf~FGpo27-ixzB~xZjFhmUTqj-NqOLTuM7x4t8~4v6dWHsOXJF1xVPutgydB2HWPluquhgKv1xvme1rzDdwbAq2cig22qMDiTPJijAZxu-oxMntD7smzzR0kROGJG6jDzTxAD9P~U5ZOt31hjylS-lKlHaI2Hueg-~pgambTlstYQmYmp39VBb0HPkZPc5rihOuKcP6szsUnm4hZy8pz20wNg8BFFt7pW8wC6yZyxt9tvabPedHd-wg3Qd~MUTB7iU4wuHieP-FWhv6aCsZaQj3qIhz1sWVZZsQhELxua-9uP5SRIQrtwQw__"
          alt="OHARA"
          className="logo-image"
        />
      </div>

      <motion.div
        className="login-form-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <motion.form
          className="login-form"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <h2 className="login-title">
            {isRegistering ? "Registro" : "Iniciar Sesión"}
          </h2>
          {isRegistering && (
            <div className="input-group">
              <FaUser className="input-icon" />
              <input
                type="text"
                placeholder="Nombre de usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          )}
          <div className="input-group">
            <FaEnvelope className="input-icon" />
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <FaLock className="input-icon" />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {/*<p className="forgot-password">¿Olvidaste tu contraseña?</p>*/}
          <motion.button
            type="submit"
            className="sign-in-button"
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.95 }}
            disabled={loading}
          >
            {loading ? (
              <ClipLoader size={20} color="#fff" />
            ) : isRegistering ? (
              "Registrarse"
            ) : (
              "Iniciar Sesión"
            )}
          </motion.button>
          <motion.button
            className="google-login"
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleGoogleLogin}
          >
            <FaGoogle size={20} />{" "}
            {isRegistering ? "Registrarse " : "Iniciar Sesión "} con Google
          </motion.button>
          <p>
            {isRegistering
              ? "¿Ya tienes una cuenta? "
              : "¿No tienes una cuenta? "}
            <span
              className="signup-link"
              onClick={() => {
                setLoading(true);
                setTimeout(() => {
                  setIsRegistering(!isRegistering);
                  setLoading(false);
                }, 500);
              }}
            >
              {isRegistering ? "Iniciar sesión" : "Regístrate"}
            </span>
          </p>
        </motion.form>
      </motion.div>
    </div>
  );
};

export default Login;
