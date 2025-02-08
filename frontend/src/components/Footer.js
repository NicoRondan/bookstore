// src/components/Footer.js
import { FaFacebookF, FaInstagram, FaGoogle, FaTimes } from "react-icons/fa";

const Footer = () => (
  <footer className="footer">
    <div className="footer-container">
      <div className="footer-section">
        <h4>Social Media</h4>
        <div className="social-icons">
          <FaFacebookF className="social-icon" />
          <FaInstagram className="social-icon" />
          <FaGoogle className="social-icon" />
          <FaTimes className="social-icon" />
        </div>
      </div>
      <div className="footer-section">
        <h4>Our Store</h4>
        <ul>
          <li>Home</li>
          <li>All Collections</li>
          <li>Shop All</li>
        </ul>
      </div>
      <div className="footer-section">
        <h4>Information</h4>
        <ul>
          <li>Warranty Information</li>
          <li>Privacy policy</li>
          <li>Terms & conditions</li>
        </ul>
      </div>
      <div className="footer-section">
        <h4>Contact</h4>
        <p>info@example.com</p>
        <p>1234567890</p>
      </div>
    </div>
  </footer>
);

export default Footer;
