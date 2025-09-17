const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const EXPIRES_IN = process.env.JWT_EXPIRES || "2h";

function signUser(user) {
  // pilih payload minimal
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role?.name || user.role || "participant",
    },
    SECRET,
    { expiresIn: EXPIRES_IN }
  );
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { signUser, verifyToken };
