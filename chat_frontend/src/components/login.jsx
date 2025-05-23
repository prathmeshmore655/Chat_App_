import React, { useState } from "react";
import {
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Typography,
  Box,
  Paper
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { motion } from "framer-motion";
import "bootstrap/dist/css/bootstrap.min.css";
import axios from "axios";
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await axios.post("http://127.0.0.1:8000/API/token/", {
        username,
        password,
      });

      const { access, refresh } = response.data;

      // Store tokens securely (you can use context or localStorage as needed)
      localStorage.setItem("accessToken", access);
      localStorage.setItem("refreshToken", refresh);

      // Redirect or do something after login
      console.log("Login successful");
      navigate("/chat");
    } catch (err) {
      setError("Invalid credentials. Please try again.");
    }
  };

  return (
    <div
      className="container-fluid vh-100 d-flex align-items-center justify-content-center"
      style={{
        background: "linear-gradient(135deg,rgb(122, 149, 202),rgb(245, 245, 245), rgb(122, 149, 202))",
        padding: "2rem",
      }}
    >
      <Paper
        elevation={5}
        component={motion.div}
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="row w-100 overflow-hidden rounded-4"
        style={{ maxWidth: "850px" }}
      >
        {/* Left Gradient Panel */}
        <div
          className="col-md-6 d-none d-md-flex flex-column justify-content-center align-items-center"
          style={{
            background: "linear-gradient(135deg, #3f51b5, #1a237e)",
            color: "white",
            padding: "3rem",
          }}
        >
          <LockOutlinedIcon sx={{ fontSize: 80, color: "white" }} />
          <Typography variant="h4" className="mt-3 fw-bold">
            Welcome Back
          </Typography>
          <Typography variant="body1" align="center" className="mt-2">
            Sign in to continue to your account and manage your dashboard.
          </Typography>
        </div>

        {/* Right Panel */}
        <div className="col-md-6 bg-white p-5">
          <Typography
            variant="h5"
            className="fw-bold text-center"
            sx={{ color: "#0d47a1", mb: 1 }}
          >
            Sign In
          </Typography>
          <Typography
            variant="body2"
            align="center"
            className="text-muted mb-4"
          >
            Please enter your login credentials.
          </Typography>

          {error && (
            <Typography variant="body2" color="error" className="mb-2 text-center">
              {error}
            </Typography>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              variant="outlined"
              margin="normal"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <TextField
              fullWidth
              label="Password"
              variant="outlined"
              margin="normal"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Box className="d-flex justify-content-between align-items-center mt-2 mb-3">
              <FormControlLabel control={<Checkbox />} label="Remember me" />
              <a href="#" className="text-decoration-none text-primary">
                Forgot password?
              </a>
            </Box>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                sx={{
                  backgroundColor: "#0d47a1",
                  borderRadius: "12px",
                  py: 1.3,
                  fontWeight: "bold",
                }}
              >
                Sign In
              </Button>
            </motion.div>

            <Typography
              variant="body2"
              align="center"
              className="mt-4 text-muted"
            >
              Don't have an account?{" "}
              <a href="/signup" className="text-primary">
                Create one
              </a>
            </Typography>

            <Typography
              variant="caption"
              display="block"
              align="center"
              className="mt-3 text-muted"
            >
              By continuing, you agree to our{" "}
              <a href="#" className="text-primary">
                Terms
              </a>{" "}
              and{" "}
              <a href="#" className="text-primary">
                Privacy Policy
              </a>
            </Typography>
          </form>
        </div>
      </Paper>
    </div>
  );
};

export default Login;
