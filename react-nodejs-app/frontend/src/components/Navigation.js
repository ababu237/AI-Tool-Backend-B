import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navigation.css';

const Navigation = () => {
  const navItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/clinical-chat', label: 'Clinical Chat', icon: '💬' },
    { path: '/document-analyzer', label: 'Documents', icon: '📄' },
    { path: '/organ-analyzer', label: 'Organ Scan', icon: '🔬' },
    { path: '/speech-to-text', label: 'Speech to Text', icon: '🎤' },
    { path: '/text-to-speech', label: 'Translation', icon: '🌐' },
  ];

  return (
    <nav className="bottom-navigation">
      <div className="nav-container">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            end={item.path === '/'}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;
