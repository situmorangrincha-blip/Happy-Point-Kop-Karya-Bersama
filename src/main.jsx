import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import Form from './Form.jsx';
import Admin from './Admin.jsx';

const isAdmin = location.pathname.replace(/\/$/, '') === '/admin';
createRoot(document.getElementById('root')).render(isAdmin ? <Admin /> : <Form />);
