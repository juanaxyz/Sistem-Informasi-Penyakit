const bcrypt = require("bcryptjs");
const { signToken } = require("../lib/jwt");
const { query } = require("../db/pg");
const { isUniqueViolationError } = require("../middlewares/error-handler");
const AppError = require("../utils/AppError");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateRegisterPayload = (body) => {
  const payload = {
    nama: String(body?.nama ?? "").trim(),
    email: String(body?.email ?? "").trim().toLowerCase(),
    username: String(body?.username ?? "").trim(),
    password: String(body?.password ?? ""),
  };

  if (!payload.nama || !payload.email || !payload.username || !payload.password) {
    throw new AppError("nama, email, username, dan password wajib diisi", 400);
  }
  if (!EMAIL_REGEX.test(payload.email)) {
    throw new AppError("Format email tidak valid", 400);
  }
  if (payload.username.length < 3) {
    throw new AppError("Username minimal 3 karakter", 400);
  }
  if (payload.password.length < 6) {
    throw new AppError("Password minimal 6 karakter", 400);
  }
  return payload;
};

const handleRegister = async (req, res) => {
  const { nama, email, username, password } = validateRegisterPayload(req.body);

  const passwordHash = await bcrypt.hash(password, 10);

  const { rows } = await query(
    `INSERT INTO users (nama, email, username, password, role)
     VALUES ($1, $2, $3, $4, 'user')
     RETURNING id, nama, email, username, role, dibuat_pada`,
    [nama, email, username, passwordHash],
  ).catch((err) => {
    if (isUniqueViolationError(err)) {
      throw new AppError("Email atau username sudah terdaftar", 409);
    }
    throw err;
  });

  const user = rows[0];
  if (!user) {
    throw new AppError("Gagal membuat user", 500);
  }

  const token = signToken({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  });

  res.status(201).json({
    token,
    user: {
      id: user.id,
      nama: user.nama,
      email: user.email,
      username: user.username,
      role: user.role,
      dibuat_pada: user.dibuat_pada,
    },
  });
};

const handleLogin = async (req, res) => {
  const identifier = String(
    req.body?.identifier ?? req.body?.email ?? req.body?.username ?? "",
  ).trim();
  const password = String(req.body?.password ?? "");

  if (!identifier || !password) {
    throw new AppError("Email/username dan password wajib diisi", 400);
  }

  const { rows } = await query(
    `SELECT id, nama, email, username, role, password
     FROM users
     WHERE email = $1 OR username = $1
     LIMIT 1`,
    [identifier],
  );

  const user = rows[0];
  if (!user) {
    throw new AppError("Email/username atau password salah", 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError("Email/username atau password salah", 401);
  }

  const token = signToken({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  });

  res.json({
    token,
    user: {
      id: user.id,
      nama: user.nama,
      email: user.email,
      username: user.username,
      role: user.role,
    },
  });
};

const handleUpdateMe = async (req, res) => {
  const { rows: userRows } = await query(
    `SELECT id, nama, email, username, role, password
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [req.user.id],
  );

  const current = userRows[0];
  if (!current) {
    throw new AppError("User tidak ditemukan", 404);
  }

  const payload = {
    nama: String(req.body?.nama ?? current.nama).trim(),
    email: String(req.body?.email ?? current.email).trim().toLowerCase(),
    username: String(req.body?.username ?? current.username).trim(),
    password: String(req.body?.password ?? ""),
  };

  if (!payload.nama || !payload.email || !payload.username) {
    throw new AppError("nama, email, dan username wajib diisi", 400);
  }
  if (!EMAIL_REGEX.test(payload.email)) {
    throw new AppError("Format email tidak valid", 400);
  }
  if (payload.username.length < 3) {
    throw new AppError("Username minimal 3 karakter", 400);
  }
  if (payload.password && payload.password.length < 6) {
    throw new AppError("Password minimal 6 karakter", 400);
  }

  const passwordHash = payload.password
    ? await bcrypt.hash(payload.password, 10)
    : current.password;

  const { rows } = await query(
    `UPDATE users
     SET nama = $1, email = $2, username = $3, password = $4
     WHERE id = $5
     RETURNING id, nama, email, username, role, dibuat_pada`,
    [payload.nama, payload.email, payload.username, passwordHash, req.user.id],
  ).catch((err) => {
    if (isUniqueViolationError(err)) {
      throw new AppError("Email atau username sudah terdaftar", 409);
    }
    throw err;
  });

  res.json({ user: rows[0] });
};

const handleGetMe = async (req, res) => {
  const { rows } = await query(
    `SELECT id, nama, email, username, role, dibuat_pada
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [req.user.id],
  );

  const user = rows[0];
  if (!user) {
    throw new AppError("User tidak ditemukan", 404);
  }

  res.json({ user });
};

const handleLogout = async (_req, res) => {
  res.json({ message: "Logout berhasil" });
};

module.exports = {
  handleRegister,
  handleLogin,
  handleGetMe,
  handleUpdateMe,
  handleLogout,
};