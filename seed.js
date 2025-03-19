const mongoose = require("mongoose");
const User = require("./models/User");
const bcrypt = require("bcryptjs");

const seedDB = async () => {
  await User.deleteMany({});

  // Create test customer
  const customer = new User({
    name: "John Customer",
    email: "customer@test.com",
    password: bcrypt.hashSync("test123", 10),
    role: "customer",
  });

  // Create test provider
  const provider = new User({
    name: "Alice Technician",
    email: "provider@test.com",
    password: bcrypt.hashSync("test123", 10),
    role: "provider",
    skills: ["Laptop Repair", "Software Installation"],
    location: "New York, NY", // Keep as simple string
  });

  await customer.save();
  await provider.save();
  console.log("Database seeded!");
  mongoose.connection.close();
};

mongoose
  .connect("mongodb://localhost:27017/itechies")
  .then(() => seedDB())
  .catch((err) => console.error(err));
