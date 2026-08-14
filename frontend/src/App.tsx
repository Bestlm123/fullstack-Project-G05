// import { useState } from 'react';
// import axios from 'axios';
// import Sidebar from './components/Sidebar';
// import HomePage from './pages/HomePage';
// import InventoryTab from './InventoryTab';
// import HistoryTab from './HistoryTab';
// import './index.css';

// const FacebookIcon = ({ size = 20, color = "currentColor" }) => (
//   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
// );
// const InstagramIcon = ({ size = 20, color = "currentColor" }) => (
//   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
// );
// const TikTokIcon = ({ size = 20, color = "currentColor" }) => (
//   <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v7.02c-.01 1.69-.5 3.39-1.5 4.77-1.16 1.6-2.9 2.65-4.82 3.01-1.92.35-3.95.12-5.71-.8-1.74-.9-3.07-2.47-3.7-4.28-.62-1.81-.6-3.83.18-5.61.8-1.79 2.37-3.18 4.2-3.83 1.83-.65 3.9-.62 5.67.18V8.34c-1-.34-2.1-.47-3.17-.38-1.29.1-2.55.53-3.62 1.25-1.07.72-1.91 1.74-2.39 2.94-.48 1.19-.57 2.52-.25 3.77.32 1.25 1.01 2.38 1.96 3.2.95.82 2.15 1.3 3.42 1.41 1.27.12 2.56-.16 3.66-.78 1.1-.63 1.96-1.57 2.44-2.73.47-1.16.55-2.46.22-3.68V0h3.29Z"/></svg>
// );

// interface User {
//   studentId: string;
//   fullName: string;
//   faculty: string;
//   email: string;
//   role: 'admin' | 'user';
// }

// function App() {
//   const [activeTab, setActiveTab] = useState<'home' | 'inventory' | 'history'>('home');
//   const [currentUser, setCurrentUser] = useState<User | null>(null);
  
//   const [loginData, setLoginData] = useState({ email: '', studentId: '', fullName: '', faculty: 'Engineering' });

//   // === อัปเดต: ดักจับ Error ให้แสดงผลชัดเจนขึ้น ===
//   const handleLogin = async (e: React.FormEvent) => {
//     e.preventDefault();
//     try {
//       const res = await axios.post('http://localhost:3000/api/auth/login', loginData);
//       setCurrentUser(res.data); 
//     } catch (error) {
//       console.error(error);
//       if (axios.isAxiosError(error)) {
//         const errorMsg = error.response?.data?.error || error.message;
//         alert(`เข้าสู่ระบบไม่สำเร็จ!\nสาเหตุ: ${errorMsg}`);
//       } else {
//         alert('เข้าสู่ระบบไม่สำเร็จ! (ข้อผิดพลาดระบบ)');
//       }
//     }
//   };

//   const handleLogout = () => {
//     setCurrentUser(null);
//     setActiveTab('home');
//   };

//   if (!currentUser) {
//     return (
//       <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f3f4f6' }}>
//         <div className="card" style={{ width: '400px', padding: '32px' }}>
//           <h2 style={{ textAlign: 'center', color: '#8b0000', marginBottom: '24px' }}>⚙️ เข้าสู่ระบบสโมสรฯ</h2>
//           <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
//             <div className="form-field">
//               <label>อีเมลมหาลัย (@cmu.ac.th)</label>
//               <input required type="email" className="form-input" placeholder="thittawin_k@cmu.ac.th" value={loginData.email} onChange={e => setLoginData({...loginData, email: e.target.value})} />
//             </div>
//             <div className="form-field">
//               <label>รหัสนักศึกษา</label>
//               <input required type="text" className="form-input" placeholder="670610706" value={loginData.studentId} onChange={e => setLoginData({...loginData, studentId: e.target.value})} />
//             </div>
//             <div className="form-field">
//               <label>ชื่อ-นามสกุล</label>
//               <input required type="text" className="form-input" placeholder="ธิษณ์ธาวิน คงนา" value={loginData.fullName} onChange={e => setLoginData({...loginData, fullName: e.target.value})} />
//             </div>
//             <button type="submit" className="btn-primary" style={{ marginTop: '8px' }}>เข้าสู่ระบบ</button>
//           </form>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="app-container">
//       <Sidebar 
//         activeTab={activeTab} 
//         setActiveTab={setActiveTab} 
//         currentUser={currentUser} 
//         onLogout={handleLogout}
//       />

//       <main className="main-content">
//         <header className="header">
//           <div className="header-title">
//             <h2>สโมสรนักศึกษาคณะวิศวกรรมศาสตร์</h2>
//           </div>
          
//           <div className="header-socials">
//             <a href="https://www.facebook.com/SMOENTCMU" target="_blank" rel="noreferrer" className="header-social-btn"><FacebookIcon /></a>
//             <a href="https://www.instagram.com/smoentcmu" target="_blank" rel="noreferrer" className="header-social-btn"><InstagramIcon /></a>
//             <a href="https://www.tiktok.com/@smoentcmu" target="_blank" rel="noreferrer" className="header-social-btn"><TikTokIcon /></a>
//           </div>
          
//           <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
//             <div style={{ textAlign: 'right' }}>
//               <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827' }}>{currentUser.fullName}</div>
//               <div style={{ fontSize: '12px', color: currentUser.role === 'admin' ? '#8b0000' : '#6b7280', fontWeight: '500' }}>
//                 {currentUser.role === 'admin' ? '👑 Admin' : '👤 User'}
//               </div>
//             </div>
//           </div> 
//         </header>

//         <div className="content-area">
//           {activeTab === 'home' && <HomePage currentRole={currentUser.role} currentUserId={currentUser.studentId} />}
//           {activeTab === 'inventory' && <InventoryTab currentRole={currentUser.role} currentUserId={currentUser.studentId} />}
//           {activeTab === 'history' && <HistoryTab currentRole={currentUser.role} currentUserId={currentUser.studentId} />}
//         </div>
//       </main>
//     </div>
//   );
// }

// export default App;

import { useState } from 'react';
import axios from 'axios';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import InventoryTab from './InventoryTab';
import HistoryTab from './HistoryTab';
import './index.css';

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

function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'inventory' | 'history'>('home');
  
  // 🌟 โหลดค่า User จาก localStorage เพื่อไม่ให้หลุดตอนรีเฟรช
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('currentUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [loginData, setLoginData] = useState({ email: '', studentId: '', fullName: '', faculty: 'Engineering' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:3000/api/auth/login', loginData);
      setCurrentUser(res.data); 
      localStorage.setItem('currentUser', JSON.stringify(res.data)); // บันทึกลงเครื่อง
    } catch (error) {
      console.error(error);
      if (axios.isAxiosError(error)) {
        const errorMsg = error.response?.data?.error || error.message;
        alert(`เข้าสู่ระบบไม่สำเร็จ!\nสาเหตุ: ${errorMsg}`);
      } else {
        alert('เข้าสู่ระบบไม่สำเร็จ!');
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser'); // ลบข้อมูลเมื่อกดออกจากระบบ
    setActiveTab('home');
  };

  if (!currentUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100%', background: '#f3f4f6' }}>
        <div className="card" style={{ width: '400px', padding: '32px' }}>
          <h2 style={{ textAlign: 'center', color: '#8b0000', marginBottom: '24px' }}>Log in</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-field">
              <label>Email(@cmu.ac.th)</label>
              <input required type="email" className="form-input" placeholder="test@cmu.ac.th" value={loginData.email} onChange={e => setLoginData({...loginData, email: e.target.value})} />
            </div>
            <div className="form-field">
              <label>รหัสนักศึกษา</label>
              <input required type="text" className="form-input" placeholder="6xxxxxxxx" value={loginData.studentId} onChange={e => setLoginData({...loginData, studentId: e.target.value})} />
            </div>
            <div className="form-field">
              <label>ชื่อ-นามสกุล</label>
              <input required type="text" className="form-input" placeholder="เขียนโค้ด บัคตลอด" value={loginData.fullName} onChange={e => setLoginData({...loginData, fullName: e.target.value})} />
            </div>
            <button type="submit" className="btn-primary" style={{ marginTop: '8px' }}>เข้าสู่ระบบ</button>
          </form>
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