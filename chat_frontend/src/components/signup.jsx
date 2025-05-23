import React, { useState } from "react";
import {
  TextField,
  Button,
  Typography,
  Paper
} from "@mui/material";
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
import { motion } from "framer-motion";
import "bootstrap/dist/css/bootstrap.min.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { CircularProgress } from "@mui/material";


const SignUp = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    otp: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const sendOtp = async (e) => {
  e.preventDefault();
  setError("");
  setSuccess("");
  setLoading(true);

  if (form.password !== form.confirmPassword) {
    setError("Passwords do not match.");
    setLoading(false);
    return;
  }

  try {
    await axios.post("http://127.0.0.1:8000/API/signup/send-otp/", {
      first_name: form.firstName,
      last_name: form.lastName,
      username: form.username,
      email: form.email,
      password: form.password
    });
    setSuccess("OTP sent to your email.");
    setStep(2);
  } catch (err) {
    setError(
      err.response?.data?.error ||
      "Signup failed. Email or username may already be registered."
    );
  } finally {
    setLoading(false);
  }
};



const verifyOtp = async (e) => {
  e.preventDefault();
  setError("");
  setSuccess("");
  setLoading(true);

  try {
    await axios.post("http://127.0.0.1:8000/API/signup/verify-otp/", {
      first_name: form.firstName,
      last_name: form.lastName,
      username: form.username,
      email: form.email,
      password: form.password,
      confirm_password: form.confirmPassword,
      otp: form.otp
    });
    setSuccess("Signup complete! Redirecting to login...");
    setTimeout(() => {
      navigate("/");
    }, 1500);
  } catch (err) {
    setError("Invalid OTP or verification failed. Please try again.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center p-3" style={{
      background: "linear-gradient(135deg, rgb(122,149,202), rgb(245,245,245), rgb(122,149,202))"
    }}>
      <Paper
        elevation={5}
        component={motion.div}
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="row w-100 overflow-hidden rounded-4"
        style={{ maxWidth: "900px" }}
      >
        {/* Left Panel */}
        <div
          className="col-md-6 d-none d-md-flex flex-column justify-content-center align-items-center"
          style={{
            background: "linear-gradient(135deg, #004d40, #00695c)",
            color: "white",
            padding: "3rem",
          }}
        >
          <PersonAddAltIcon sx={{ fontSize: 80, color: "white" }} />
          <Typography variant="h4" className="mt-3 fw-bold">
            Create Account
          </Typography>
          <Typography variant="body1" align="center" className="mt-2">
            Join our community and get started in seconds.
          </Typography>
        </div>

        {/* Right Panel */}
        <div className="col-md-6 bg-white p-4 p-md-5">
          <Typography
            variant="h5"
            className="fw-bold text-center"
            sx={{ color: "#004d40", mb: 1 }}
          >
            {step === 1 ? "Sign Up" : "Verify OTP"}
          </Typography>
          <Typography variant="body2" align="center" className="text-muted mb-4">
            {step === 1
              ? "Please fill in the details to register."
              : "Enter the OTP sent to your email."}
          </Typography>

          {error && (
            <Typography variant="body2" color="error" className="mb-3 text-center">
              {error}
            </Typography>
          )}
          {success && (
            <Typography variant="body2" color="success.main" className="mb-3 text-center">
              {success}
            </Typography>
          )}

          {step === 1 ? (
            <form onSubmit={sendOtp}>
              <div className="row">
                <div className="col-12 col-md-6">
                  <TextField
                    fullWidth
                    label="First Name"
                    variant="outlined"
                    margin="normal"
                    name="firstName"
                    required
                    value={form.firstName}
                    onChange={handleChange}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <TextField
                    fullWidth
                    label="Last Name"
                    variant="outlined"
                    margin="normal"
                    name="lastName"
                    required
                    value={form.lastName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <TextField
                fullWidth
                label="Username"
                variant="outlined"
                margin="normal"
                name="username"
                required
                value={form.username}
                onChange={handleChange}
              />
              <TextField
                fullWidth
                label="Email"
                variant="outlined"
                margin="normal"
                type="email"
                name="email"
                required
                value={form.email}
                onChange={handleChange}
              />
              <TextField
                fullWidth
                label="Password"
                variant="outlined"
                margin="normal"
                type="password"
                name="password"
                required
                value={form.password}
                onChange={handleChange}
              />
              <TextField
                fullWidth
                label="Confirm Password"
                variant="outlined"
                margin="normal"
                type="password"
                name="confirmPassword"
                required
                value={form.confirmPassword}
                onChange={handleChange}
              />
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={loading}
                  sx={{
                    backgroundColor: "#004d40",
                    borderRadius: "12px",
                    py: 1.3,
                    fontWeight: "bold",
                    mt: 2
                  }}
                >
                  {loading ? <CircularProgress size={24} sx={{ color: "white" }} /> : "Send OTP"}
                </Button>
              </motion.div>

              <Typography variant="body2" align="center" className="mt-4 text-muted">
                Already have an account?{" "}
                <a href="/" className="text-primary">
                  Log in
                </a>
              </Typography>
            </form>
          ) : (
            <form onSubmit={verifyOtp}>
              <TextField
                fullWidth
                label="OTP"
                variant="outlined"
                margin="normal"
                name="otp"
                required
                value={form.otp}
                onChange={handleChange}
              />
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={loading}
                    sx={{
                      backgroundColor: "#004d40",
                      borderRadius: "12px",
                      py: 1.3,
                      fontWeight: "bold",
                      mt: 2
                    }}
                  >
                    {loading ? <CircularProgress size={24} sx={{ color: "white" }} /> : "Verify OTP"}
                </Button>

              </motion.div>
              <Typography variant="body2" align="center" className="mt-4 text-muted">
                Already have an account?{" "}
                <a href="/" className="text-primary">
                  Log in
                </a>
              </Typography>
            </form>
          )}
        </div>
      </Paper>
    </div>
  );
};

export default SignUp;
