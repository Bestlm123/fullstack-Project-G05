import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar, { type AppTab } from './components/Sidebar';
import HomePage from './pages/HomePage';
import InventoryTab from './InventoryTab';
import HistoryTab from './HistoryTab';
import StaffRecruitmentTab from './StaffRecruitmentTab';
import './index.css';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
axios.defaults.withCredentials = true;

const FacebookIcon = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
);
const InstagramIcon = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
);
const TikTokIcon = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v7.02c-.01 1.69-.5 3.39-1.5 4.77-1.16 1.6-2.9 2.65-4.82 3.01-1.92.35-3.95.12-5.71-.8-1.74-.9-3.07-2.47-3.7-4.28-.62-1.81-.6-3.83.18-5.61.8-1.79 2.37-3.18 4.2-3.83 1.83-.65 3.9-.62 5.67.18V8.34c-1-.34-2.1-.47-3.17-.38-1.29.1-2.55.53-3.62 1.25-1.07.72-1.91 1.74-2.39 2.94-.48 1.19-.57 2.52-.25 3.77.32 1.25 1.01 2.38 1.96 3.2.95.82 2.15 1.3 3.42 1.41 1.27.12 2.56-.16 3.66-.78 1.1-.63 1.96-1.57 2.44-2.73.47-1.16.55-2.46.22-3.68V0h3.29Z"/></svg>
);

interface User {
  studentId: string;
  fullName: string;
  faculty: string;
  email: string;
  role: 'admin' | 'user';
}

function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('home');

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser && savedUser !== "undefined") {
      try {
        return JSON.parse(savedUser);
      } catch {
        localStorage.removeItem('currentUser');
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/auth/me`, { withCredentials: true });
        if (res.data.user) {
          setCurrentUser(res.data.user);
          localStorage.setItem('currentUser', JSON.stringify(res.data.user));
        }
      } catch {
        setCurrentUser(null);
        localStorage.removeItem('currentUser');
      }
    };
    fetchUserData();
  }, []);

  const handleLoginCMU = () => {
    window.location.href = `${BASE_URL}/api/auth/login/cmu`;
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${BASE_URL}/api/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setCurrentUser(null);
      localStorage.removeItem('currentUser');
      setActiveTab('home');
    }
  };

  const handleDevLogin = async (role: 'admin' | 'user') => {
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/login`, {
        studentId: role === 'admin' ? '650610000' : '650610999',
        fullName: role === 'admin' ? 'Admin Tester' : 'Student Tester',
        role: role,
        faculty: 'Engineering',
        email: role === 'admin' ? 'admin@cmu.ac.th' : 'student@cmu.ac.th'
      });

      const userData = response.data.user;
      setCurrentUser(userData);
      localStorage.setItem('currentUser', JSON.stringify(userData));
    } catch (error) {
      console.error('Dev Login Error:', error);
      alert('เกิดข้อผิดพลาดในการล็อกอินจำลอง');
    }
  };

  if (!currentUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100%', background: '#f3f4f6', padding: '16px' }}>
        <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '32px 24px', textAlign: 'center', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }}>
          <h2 style={{ color: '#8b0000', marginBottom: '12px', fontSize: '24px' }}>เข้าสู่ระบบ SMO ENT</h2>
          <p style={{ color: '#6b7280', marginBottom: '28px', fontSize: '14px' }}>
            สโมสรนักศึกษาคณะวิศวกรรมศาสตร์ มหาวิทยาลัยเชียงใหม่
          </p>

          <button
            onClick={handleLoginCMU}
            className="btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: 'bold', backgroundColor: '#8b0000', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}
          >
            เข้าสู่ระบบด้วย CMU IT Account
          </button>

          <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px' }}>สำหรับนักพัฒนา (Dev Mode)</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => handleDevLogin('admin')}
                style={{ flex: 1, padding: '10px', backgroundColor: '#dc2626', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
              >
                🛠️ Login (Admin)
              </button>
              <button
                onClick={() => handleDevLogin('user')}
                style={{ flex: 1, padding: '10px', backgroundColor: '#2563eb', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
              >
                🎓 Login (User)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* 🌟 CSS Responsive ป้องกัน Header ซ้อนทับกันบนมือถือ */}
      <style>
        {`
          .smo-top-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 28px;
            background-color: #ffffff;
            border-bottom: 1px solid #e5e7eb;
            gap: 16px;
            position: relative;
          }
          .smo-header-title h2 {
            margin: 0;
            font-size: 20px;
            font-weight: 700;
            color: #8b0000;
          }
          .smo-header-socials {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .smo-social-circle {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background-color: #fef2f2;
            color: #8b0000;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            border: 1px solid #fecaca;
          }
          .smo-social-circle:hover {
            background-color: #8b0000;
            color: #ffffff;
          }
          @media (max-width: 768px) {
            .app-container {
              flex-direction: column !important;
            }
            .main-content {
              width: 100% !important;
            }
            .smo-top-header {
              padding: 12px 16px !important;
              flex-wrap: wrap;
              justify-content: space-between;
              gap: 10px;
            }
            .smo-header-title {
              width: 100%;
              text-align: center;
              border-bottom: 1px solid #f3f4f6;
              padding-bottom: 8px;
            }
            .smo-header-title h2 {
              font-size: 16px !important;
            }
            .smo-header-socials {
              position: static !important;
              transform: none !important;
            }
            .content-area {
              padding: 14px !important;
            }
          }
        `}
      </style>

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="main-content">
        <header className="smo-top-header">
          <div className="smo-header-title">
            <h2>สโมสรนักศึกษาคณะวิศวกรรมศาสตร์</h2>
          </div>

          <div className="smo-header-socials">
            <a href="https://web.facebook.com/smo.ent.cmu" target="_blank" rel="noreferrer" className="smo-social-circle" title="Facebook"><FacebookIcon /></a>
            <a href="https://www.instagram.com/smo.ent.cmu" target="_blank" rel="noreferrer" className="smo-social-circle" title="Instagram"><InstagramIcon /></a>
            <a href="https://www.tiktok.com/@smo.ent.cmu" target="_blank" rel="noreferrer" className="smo-social-circle" title="TikTok"><TikTokIcon /></a>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '700', fontSize: '14px', color: '#111827' }}>{currentUser.fullName}</div>
              <div style={{ fontSize: '12px', color: currentUser.role === 'admin' ? '#8b0000' : '#1d4ed8', fontWeight: '600' }}>
                {currentUser.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : 'นักศึกษา (User)'}
              </div>
            </div>
          </div>
        </header>

        <div className="content-area">
          {activeTab === 'home' && <HomePage currentRole={currentUser.role} />}
          {activeTab === 'staff' && <StaffRecruitmentTab currentUser={currentUser} />}
          {activeTab === 'inventory' && <InventoryTab currentRole={currentUser.role} currentUserId={currentUser.studentId} currentUser={currentUser} />}
          {activeTab === 'history' && <HistoryTab currentRole={currentUser.role} currentUserId={currentUser.studentId} />}
        </div>
      </main>
    </div>
  );
}

export default App;