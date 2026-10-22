const app = require('./app');
const dotenv = require("dotenv");
const userRoutes = require("./routes/userRoutes");

dotenv.config();
const PORT = process.env.PORT || 5000;

app.use("/api/users", userRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
