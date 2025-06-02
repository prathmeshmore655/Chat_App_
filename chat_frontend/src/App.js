import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import Login from './components/login';
import Signup from './components/signup';
import ChatApp from './components/chat';
import { SnackbarProvider } from 'notistack';

export default function App() {
  return (
    <SnackbarProvider maxSnack={3}>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/chat" element={<ChatApp />} />
        </Routes>
      </Router>
    </SnackbarProvider>
  );
}
