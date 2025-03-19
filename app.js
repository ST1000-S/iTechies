// app.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const MongoStore = require("connect-mongo");
const path = require("path");

const app = express();

// Models
const User = require("./models/User");
const ServiceRequest = require("./models/ServiceRequest");

// Configuration
mongoose.set("debug", true);
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Security Middleware
app.use(helmet());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many requests from this IP, please try again later",
  })
);

// Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.DB_URI,
      ttl: 24 * 60 * 60,
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Database Connection
mongoose
  .connect(process.env.DB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Middleware
const requireAuth = (req, res, next) => {
  if (!req.session.user) return res.redirect("/login");
  next();
};

const requireRole = (role) => (req, res, next) => {
  if (req.session.user?.role !== role) {
    req.session.destroy();
    return res.redirect("/login");
  }
  next();
};

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Routes
app.get("/", (req, res) => res.render("index", { title: "Home" }));

// Auth Routes
app.get("/register", (req, res) =>
  res.render("register", { title: "Register" })
);

app.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, skills, location } = req.body;

    // Validation
    const errors = [];
    if (!name) errors.push("Name is required");
    if (!email) errors.push("Email is required");
    if (!password) errors.push("Password is required");
    if (!role) errors.push("Role is required");

    if (role === "provider") {
      if (!skills) errors.push("Skills are required for providers");
      if (!location) errors.push("Location is required for providers");
    }

    if (errors.length > 0) {
      return res.render("register", {
        title: "Register",
        errors,
        formData: req.body,
      });
    }

    if (await User.findOne({ email })) {
      return res.render("register", {
        title: "Register",
        errors: ["Email already exists"],
        formData: req.body,
      });
    }

    const newUser = new User({
      name,
      email,
      password: await bcrypt.hash(password, 12),
      role,
      ...(role === "provider" && {
        skills: Array.isArray(skills) ? skills : skills.split(","),
        location,
      }),
    });

    await newUser.save();
    req.session.user = newUser;
    res.redirect("/dashboard");
  } catch (error) {
    res.render("error", {
      title: "Error",
      message: "Registration failed: " + error.message,
    });
  }
});

app.get("/login", (req, res) => {
  if (req.session.user) return res.redirect("/dashboard");
  res.render("login", { title: "Login" });
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.render("login", {
        title: "Login",
        error: "Invalid email or password",
      });
    }

    req.session.user = user;
    res.redirect("/dashboard");
  } catch (error) {
    res.render("error", {
      title: "Error",
      message: "Login failed: " + error.message,
    });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error("Session destruction error:", err);
    res.redirect("/");
  });
});

// Dashboard Routes
app.get("/dashboard", requireAuth, (req, res) => {
  const template =
    req.session.user.role === "customer"
      ? "customer-dashboard"
      : "provider-dashboard";
  res.render(template, { title: "Dashboard" });
});

// Service Request Routes
app.post("/service-requests", requireRole("customer"), async (req, res) => {
  try {
    const request = await ServiceRequest.create({
      customer: req.session.user._id,
      description: req.body.description,
      status: "open",
    });
    res.redirect("/dashboard");
  } catch (error) {
    res.render("error", {
      title: "Error",
      message: "Failed to create request: " + error.message,
    });
  }
});

app.post(
  "/service-requests/:id/accept",
  requireRole("provider"),
  async (req, res) => {
    try {
      const request = await ServiceRequest.findById(req.params.id);

      if (!request) throw new Error("Request not found");
      if (request.status !== "open")
        throw new Error("Request already accepted");

      request.status = "accepted";
      request.provider = req.session.user._id;
      await request.save();

      res.redirect("/dashboard");
    } catch (error) {
      res.render("error", {
        title: "Error",
        message: "Acceptance failed: " + error.message,
      });
    }
  }
);

// Error Handling
app.use((req, res) => {
  res.status(404).render("error", {
    title: "Not Found",
    message: "Page not found",
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("error", {
    title: "Error",
    message: "Something went wrong!",
  });
});

// Server Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
