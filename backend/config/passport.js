const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const db = require("../config/database");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "https://4h2dk6-4000.csb.app/api/users/auth/google/callback",
      scope: ["profile", "email"],
    },
    (accessToken, refreshToken, profile, done) => {
      const email = profile.emails[0].value;
      // Crear username aleatorio para evitar duplicados
      const username = `${profile.displayName
        .replace(/\s+/g, "")
        .toLowerCase()}_${Math.floor(Math.random() * 1000)}`;
      const profileImage = profile.photos[0].value;

      db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
        if (err) return done(err);

        if (user) {
          console.log("✅ Usuario encontrado en DB:", user);
          return done(null, user);
        }

        console.log("🆕 Creando nuevo usuario con Google...");
        const insertQuery = `
          INSERT INTO users (username, email, password, profile_image, address, phone)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.run(
          insertQuery,
          [username, email, "GOOGLE_OAUTH", profileImage, "", ""],
          function (err) {
            if (err) return done(err);

            const newUser = {
              id: this.lastID,
              username,
              email,
              profile_image: profileImage,
              address: "",
              phone: "",
            };

            console.log("✅ Usuario registrado con éxito:", newUser);
            return done(null, newUser);
          }
        );
      });
    }
  )
);

// Serialización y deserialización del usuario en la sesión
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  db.get("SELECT * FROM users WHERE id = ?", [id], (err, user) => {
    done(err, user);
  });
});

module.exports = passport;
