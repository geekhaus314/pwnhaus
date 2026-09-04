import React, { useState } from 'react';
import './App.css';

interface Project {
  id: string;
  name: string;
  description: string;
  tech: string[];
  url: string;
}

const PROJECTS: Project[] = [
  {
    id: 'react-1',
    name: 'Real-time Dashboard',
    description: 'Live metrics visualization with WebSocket updates and React Hooks optimization',
    tech: ['React 19', 'TypeScript', 'WebSocket', 'Vite'],
    url: '#',
  },
  {
    id: 'react-2',
    name: 'State Management Lab',
    description: 'Exploring Zustand, Redux, and Context API performance comparisons',
    tech: ['React', 'Zustand', 'Redux', 'Testing Library'],
    url: '#',
  },
  {
    id: 'react-3',
    name: 'Component Library',
    description: 'Reusable component system with Storybook and full accessibility support',
    tech: ['React', 'Storybook', 'TypeScript', 'WCAG 2.1'],
    url: '#',
  },
];

export const Showcase: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  return (
    <div className={`react-showcase ${theme}`}>
      <header className="showcase-header">
        <div className="header-content">
          <h1>React Showcase</h1>
          <p>Built with React 19, TypeScript, and Vite</p>
          <button
            className="theme-toggle"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main className="showcase-main">
        <section className="projects-section">
          <h2>React Projects</h2>
          <div className="projects-grid">
            {PROJECTS.map((project) => (
              <div
                key={project.id}
                className="project-card"
                onClick={() => setSelectedProject(project)}
              >
                <h3>{project.name}</h3>
                <p>{project.description}</p>
                <div className="tech-stack">
                  {project.tech.map((t) => (
                    <span key={t} className="tech-badge">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="capabilities-section">
          <h2>React Capabilities</h2>
          <ul className="capabilities-list">
            <li>✅ Server Components & Suspense</li>
            <li>✅ Custom Hooks & Performance Optimization</li>
            <li>✅ Concurrent Rendering</li>
            <li>✅ Context API & State Management</li>
            <li>✅ React Router & Code Splitting</li>
            <li>✅ Testing with React Testing Library</li>
            <li>✅ TypeScript Integration</li>
            <li>✅ Module Federation Remote</li>
          </ul>
        </section>
      </main>

      {selectedProject && (
        <div className="modal-overlay" onClick={() => setSelectedProject(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedProject(null)}>
              ✕
            </button>
            <h2>{selectedProject.name}</h2>
            <p>{selectedProject.description}</p>
            <div className="tech-stack">
              {selectedProject.tech.map((t) => (
                <span key={t} className="tech-badge">
                  {t}
                </span>
              ))}
            </div>
            <a href={selectedProject.url} className="project-link">
              View Project →
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

const App = () => <Showcase />;
export default App;
