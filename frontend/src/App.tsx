import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import InventoryTab from './InventoryTab';
import HistoryTab from './HistoryTab';
import './index.css';
axios.defaults.withCredentials = true; // บังคับแนบคุกกี้ไปกับทุก API ในโปรเจกต์

const FacebookIcon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
);
const InstagramIcon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
);
const TikTokIcon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v7.02c-.01 1.69-.5 3.39-1.5 4.77-1.16 1.6-2.9 2.65-4.82 3.01-1.92.35-3.95.12-5.71-.8-1.74-.9-3.07-2.47-3.7-4.28-.62-1.81-.6-3.83.18-5.61.8-1.79 2.37-3.18 4.2-3.83 1.83-.65 3.9-.62 5.67.18V8.34c-1-.34-2.1-.47-3.17-.38-1.29.1-2.55.53-3.62 1.25-1.07.72-1.91 1.74-2.39 2.94-.48 1.19-.57 2.52-.25 3.77.32 1.25 1.01 2.38 1.96 3.2.95.82 2.15 1.3 3.42 1.41 1.27.12 2.56-.16 3.66-.78 1.1-.63 1.96-1.57 2.44-2.73.47-1.16.55-2.46.22-3.68V0h3.29Z"/></svg>
);

interface User {
  studentId: string;
  fullName: string;
  faculty: string;
  email: string;
  role: 'admin' | 'user';
}
<button 
  onClick={() => {
    localStorage.clear();
    window.location.reload();
  }}
  style={{ 
    padding: '10px 20px', backgroundColor: '#ef4444', color: 'white', 
    position: 'fixed', top: 20, right: 20, zIndex: 9999, borderRadius: '8px'
  }}
>
  🚨 ฉุกเฉิน: ล้างข้อมูล & รีเซ็ต
</button>

function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'inventory' | 'history'>('home');
  
  // 🌟 FIX: อัปเดตฟังก์ชันดึงค่า User เพื่อดักจับ Error กรณี localStorage คืนค่า "undefined" เป็น String
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser && savedUser !== "undefined") {
      try {
        return JSON.parse(savedUser);
      } catch {
        console.error("Local storage corrupted, clearing data...");
        localStorage.removeItem('currentUser');
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/auth/me', { withCredentials: true });
        if (res.data.user) {
          setCurrentUser(res.data.user);
          localStorage.setItem('currentUser', JSON.stringify(res.data.user));
        }
      } catch {
        console.log("ยังไม่ได้ล็อกอิน หรือ Session หมดอายุ");
        // 🌟 FIX: ถ้า Backend บอกว่าไม่ได้ล็อกอิน ให้ล้างข้อมูลทิ้งเพื่อให้กลับไปหน้า Login
        setCurrentUser(null);
        localStorage.removeItem('currentUser');
      }
    };

    // 🌟 FIX: สั่งให้ตรวจสอบกับ Backend เสมอเมื่อโหลดแอป (เอา if (!currentUser) ออก)
    fetchUserData();
  }, []); // 👈 ใส่เป็น Dependency ว่างเปล่า [] เพื่อให้รันแค่ตอนเปิดเว็บครั้งแรก

  const handleLoginCMU = () => {
    window.location.href = 'http://localhost:8000/api/auth/login/cmu';
  };

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:8000/api/auth/logout', {}, { withCredentials: true });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setCurrentUser(null);
      localStorage.removeItem('currentUser');
      setActiveTab('home');
    }
  };

  // 🛠️ ฟังก์ชันสำหรับ Dev Login จำลองการเข้าระบบ
  const handleDevLogin = async (role: 'admin' | 'user') => {
    try {
      const response = await axios.post('http://localhost:8000/api/auth/login', {
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100%', background: '#f3f4f6' }}>
        <div className="card" style={{ width: '400px', padding: '32px', textAlign: 'center', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: '#8b0000', marginBottom: '16px' }}>Log in</h2>
          <p style={{ color: '#6b7280', marginBottom: '32px', fontSize: '14px' }}>
            กรุณาเข้าสู่ระบบด้วยบัญชี CMU IT Account
          </p>
          
          <button 
            onClick={handleLoginCMU} 
            className="btn-primary" 
            style={{ width: '100%', padding: '12px', fontSize: '16px', backgroundColor: '#8b0000', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            เข้าสู่ระบบด้วย CMU Account
          </button>

          {/* 🛠️ ปุ่ม Dev Login โผล่มาให้กดเทสต์ง่ายๆ */}
          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px' }}>สำหรับนักพัฒนา (Dev Mode)</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                onClick={() => handleDevLogin('admin')}
                style={{ flex: 1, padding: '8px', backgroundColor: '#dc2626', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '14px' }}
              >
                🛠️ Login (Admin)
              </button>
              <button 
                onClick={() => handleDevLogin('user')}
                style={{ flex: 1, padding: '8px', backgroundColor: '#2563eb', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '14px' }}
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
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentUser={currentUser} 
        onLogout={handleLogout}
      />

      <main className="main-content">
        <header className="header">
          <div className="header-title">
            <h2>สโมสรนักศึกษาคณะวิศวกรรมศาสตร์</h2>
          </div>
          
          <div className="header-socials">
            <a href="https://web.facebook.com/smo.ent.cmu" target="_blank" rel="noreferrer" className="header-social-btn"><FacebookIcon /></a>
            <a href="https://www.instagram.com/smo.ent.cmu?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" rel="noreferrer" className="header-social-btn"><InstagramIcon /></a>
            <a href="https://www.tiktok.com/@smo.ent.cmu?is_from_webapp=1&sender_device=pc" target="_blank" rel="noreferrer" className="header-social-btn"><TikTokIcon /></a>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827' }}>{currentUser.fullName}</div>
              <div style={{ fontSize: '12px', color: currentUser.role === 'admin' ? '#8b0000' : '#002d86', fontWeight: '500' }}>
                {currentUser.role === 'admin' ? 'Admin' : 'User'}
              </div>
            </div>
          </div> 
        </header>

        <div className="content-area">
          {activeTab === 'home' && <HomePage currentRole={currentUser.role} currentUserId={currentUser.studentId} />}
          {activeTab === 'inventory' && <InventoryTab currentRole={currentUser.role} currentUserId={currentUser.studentId} />}
          {activeTab === 'history' && <HistoryTab currentRole={currentUser.role} currentUserId={currentUser.studentId} />}
        </div>
      </main>
    </div>
  );
}

export default App;