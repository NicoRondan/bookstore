const express = require("express");
const jwt = require("jsonwebtoken");
const passport = require("../config/passport");
const { uploadProfile } = require("../config/cloudinary");
const {
  createUser,
  loginUser,
  getUsers,
  updateUser,
  getMe,
} = require("../controllers/usersController");

const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY;

router.post("/", createUser);
router.post("/login", loginUser);
router.get("/", getUsers);
router.put("/:id", uploadProfile.single("profile_image"), updateUser);
router.get("/me", getMe);

// Ruta para iniciar sesión con Google
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Ruta de callback de Google OAuth
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user.id, email: req.user.email },
      SECRET_KEY,
      {
        expiresIn: "2h",
      }
    );
    res.redirect(`https://4h2dk6-3000.csb.app?token=${token}`);
  }
);

module.exports = router;
