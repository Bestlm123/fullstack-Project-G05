import { useState, useEffect } from 'react';
import axios from 'axios';
import { Globe, Search, ShieldCheck, User as UserIcon, CheckCircle, XCircle, Crown, Lock } from 'lucide-react';
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

export type UserRole = 'supreme' | 'admin' | 'user';

interface User {
  studentId: string;
  fullName: string;
  faculty: string;
  email: string;
  role: UserRole;
}

interface DirectoryMember {
  studentId: string;
  fullName: string;
  faculty: string;
  email: string | null;
  role: UserRole;
  isEngineering?: boolean;
  year: string;
  nickname?: string;
  major?: string;
  phoneNumber?: string;
  contactChannel?: string;
  hasShopShirt?: boolean;
}

const getRoleRank = (role: UserRole): number => {
  if (role === 'supreme') return 3;
  if (role === 'admin') return 2;
  return 1;
};

function OAuthDirectoryView({ currentUser, lang }: { currentUser: User; lang: 'th' | 'en' }) {
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'supreme' | 'admin' | 'user'>('all');
  const [facultyFilter, setFacultyFilter] = useState<'all' | 'engineering'>('all');
  const [popup, setPopup] = useState<{ show: boolean; type: 'success' | 'error'; message: string }>({
    show: false,
    type: 'success',
    message: ''
  });

  useEffect(() => {
    let isMounted = true;
    const loadMembers = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/events/engineering-users`);
        if (isMounted && Array.isArray(res.data)) {
          setMembers(res.data);
        }
      } catch (error) {
        console.error(error);
      }
    };
    loadMembers();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChangeRole = async (target: DirectoryMember, nextRole: UserRole) => {
    try {
      await axios.put(`${BASE_URL}/api/events/engineering-users/${target.studentId}/role`, { role: nextRole });
      const res = await axios.get(`${BASE_URL}/api/events/engineering-users`);
      if (Array.isArray(res.data)) {
        setMembers(res.data);
      }
      setPopup({
        show: true,
        type: 'success',
        message: lang === 'th'
          ? `เปลี่ยนบทบาทของ ${target.fullName} (${target.studentId}) เป็น ${nextRole.toUpperCase()} เรียบร้อยแล้ว`
          : `Updated role for ${target.fullName} to ${nextRole.toUpperCase()}`
      });
    } catch (error: unknown) {
      let msg = lang === 'th' ? 'คุณไม่มีสิทธิ์เปลี่ยนบทบาทของผู้ใช้นี้' : 'Permission denied';
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        msg = error.response.data.error;
      }
      setPopup({ show: true, type: 'error', message: msg });
    }
  };

  const filtered = members.filter(m => {
    if (roleFilter !== 'all' && m.role !== roleFilter) return false;
    if (facultyFilter === 'engineering' && !m.isEngineering) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.studentId.toLowerCase().includes(q) ||
      m.fullName.toLowerCase().includes(q) ||
      (m.faculty || '').toLowerCase().includes(q) ||
      (m.nickname || '').toLowerCase().includes(q) ||
      (m.major || '').toLowerCase().includes(q) ||
      (m.phoneNumber || '').includes(q)
    );
  });

  const renderRoleBadge = (role: UserRole) => {
    if (role === 'supreme') {
      return (
        <span style={{
          padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '800',
          backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #f59e0b',
          display: 'inline-flex', alignItems: 'center', gap: '4px'
        }}>
          SUPREME
        </span>
      );
    }
    if (role === 'admin') {
      return (
        <span style={{
          padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '700',
          backgroundColor: '#fef2f2', color: '#8b0000', border: '1px solid #fecaca'
        }}>
          ADMIN
        </span>
      );
    }
    return (
      <span style={{
        padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '700',
        backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe'
      }}>
        USER
      </span>
    );
  };

  const renderRoleActions = (target: DirectoryMember) => {
    const isSelf = target.studentId === currentUser.studentId;
    const myRank = getRoleRank(currentUser.role);
    const targetRank = getRoleRank(target.role);

    if (isSelf) {
      return (
        <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Lock size={13} /> {lang === 'th' ? 'บัญชีของคุณ' : 'Your Account'}
        </span>
      );
    }

    if (currentUser.role !== 'supreme' || myRank <= targetRank) {
      return (
        <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Lock size={13} /> {lang === 'th' ? 'ล็อกสิทธิ์' : 'Locked'}
        </span>
      );
    }

    return (
      <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {target.role === 'user' && (
          <button
            onClick={() => handleChangeRole(target, 'admin')}
            style={{ padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#8b0000', color: 'white', border: 'none' }}
          >
            + ตั้งเป็น Admin
          </button>
        )}
        {target.role === 'admin' && (
          <>
            <button
              onClick={() => handleChangeRole(target, 'user')}
              style={{ padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}
            >
              ลดขั้นเป็น User
            </button>
            <button
              onClick={() => handleChangeRole(target, 'supreme')}
              style={{ padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#f59e0b', color: 'white', border: 'none' }}
            >
              👑 ตั้งเป็น Supreme
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      <style>
        {`
          .dir-desktop-table {
            display: block;
          }
          .dir-mobile-cards {
            display: none;
          }
          @media (max-width: 768px) {
            .dir-desktop-table {
              display: none !important;
            }
            .dir-mobile-cards {
              display: flex !important;
              flex-direction: column;
              gap: 14px;
            }
          }
        `}
      </style>

      {popup.show && (
        <div className="modal-overlay" style={{ zIndex: 1200, backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-content" style={{ maxWidth: '400px', width: '92%', textAlign: 'center', padding: '32px 24px' }}>
            {popup.type === 'success' ? (
              <CheckCircle size={56} color="#16a34a" style={{ margin: '0 auto 14px' }} />
            ) : (
              <XCircle size={56} color="#dc2626" style={{ margin: '0 auto 14px' }} />
            )}
            <p style={{ color: '#374151', fontSize: '15px', marginBottom: '20px', fontWeight: 600 }}>{popup.message}</p>
            <button className="btn-primary" style={{ width: '100%' }} onClick={() => setPopup({ ...popup, show: false })}>
              {lang === 'th' ? 'ตกลง' : 'OK'}
            </button>
          </div>
        </div>
      )}

      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e5e7eb', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '21px', color: '#8b0000', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={24} />
              {lang === 'th' ? 'ฐานข้อมูลรายชื่อทั้งหมด' : 'All Members'}
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
              {lang === 'th'
                ? `แสดงรายชื่อทั้งหมดในระบบ ${filtered.length} คน • สิทธิ์ของคุณคือ: ${currentUser.role.toUpperCase()}`
                : `Showing ${filtered.length} users from OAuth DB • Your Role: ${currentUser.role.toUpperCase()}`}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFacultyFilter(facultyFilter === 'all' ? 'engineering' : 'all')}
              style={{
                padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px',
                border: '1px solid #d1d5db',
                backgroundColor: facultyFilter === 'engineering' ? '#fef2f2' : 'white',
                color: facultyFilter === 'engineering' ? '#8b0000' : '#374151'
              }}
            >
              {facultyFilter === 'all' ? '🌐 แสดงทุกคณะ' : '⚙️ เฉพาะคณะวิศวกรรมศาสตร์'}
            </button>

            {(['all', 'supreme', 'admin', 'user'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                style={{
                  padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px',
                  border: roleFilter === r ? 'none' : '1px solid #d1d5db',
                  backgroundColor: roleFilter === r ? '#8b0000' : 'white',
                  color: roleFilter === r ? 'white' : '#374151'
                }}
              >
                {r === 'all' ? (lang === 'th' ? 'ทุกบทบาท' : 'All') : r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            placeholder={lang === 'th' ? 'ค้นหารหัสนักศึกษา, ชื่อ-นามสกุล, คณะ, ชื่อเล่น, ภาควิชา หรือเบอร์โทรศัพท์...' : 'Search by ID, Name, Faculty, Major, or Phone...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: '38px' }}
          />
          <Search size={18} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      {/* 1. ตารางสำหรับหน้าจอคอมพิวเตอร์ */}
      <div className="dir-desktop-table" style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '14px', textAlign: 'left' }}>รหัสผู้ใช้ / รหัสนศ.</th>
              <th style={{ padding: '14px', textAlign: 'left' }}>ชื่อ-นามสกุล & คณะ (OAuth)</th>
              <th style={{ padding: '14px', textAlign: 'left' }}>ชื่อเล่น / ภาควิชา / ชั้นปี</th>
              <th style={{ padding: '14px', textAlign: 'left' }}>เบอร์โทรศัพท์ & ติดต่อ</th>
              <th style={{ padding: '14px', textAlign: 'center' }}>บทบาทปัจจุบัน</th>
              <th style={{ padding: '14px', textAlign: 'center' }}>จัดการสิทธิ์</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  ไม่พบรายชื่อสมาชิกที่ค้นหา
                </td>
              </tr>
            ) : (
              filtered.map(st => (
                <tr key={st.studentId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px', fontWeight: '700', color: '#8b0000' }}>{st.studentId}</td>
                  <td style={{ padding: '14px' }}>
                    <div style={{ fontWeight: '600', color: '#111827' }}>{st.fullName}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{st.faculty} • {st.email || '-'}</div>
                  </td>
                  <td style={{ padding: '14px' }}>
                    <div>
                      <strong>{st.nickname || '-'}</strong> • {st.major || st.faculty}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      ชั้นปีที่ {st.year} {st.hasShopShirt !== undefined && `(${st.hasShopShirt ? 'มีเสื้อช็อป' : 'ไม่มีเสื้อช็อป'})`}
                    </div>
                  </td>
                  <td style={{ padding: '14px' }}>
                    <div style={{ fontWeight: '600' }}>{st.phoneNumber || '-'}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{st.contactChannel || '-'}</div>
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    {renderRoleBadge(st.role)}
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    {renderRoleActions(st)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 2. การ์ดสำหรับหน้าจอมือถือ (Responsive Mobile Cards) */}
      <div className="dir-mobile-cards">
        {filtered.map(st => (
          <div key={st.studentId} style={{ backgroundColor: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #f3f4f6' }}>
              <strong style={{ fontSize: '16px', color: '#8b0000' }}>{st.studentId}</strong>
              {renderRoleBadge(st.role)}
            </div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#111827' }}>{st.fullName}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px' }}>{st.faculty} • {st.email || '-'}</div>
            <div style={{ backgroundColor: '#f9fafb', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', lineHeight: 1.6, marginBottom: '12px' }}>
              <div><strong>ชื่อเล่น/สาขา:</strong> {st.nickname || '-'} ({st.major || '-'}) • ปี {st.year}</div>
              <div><strong>เบอร์โทร:</strong> {st.phoneNumber || '-'} ({st.contactChannel || '-'})</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {renderRoleActions(st)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [lang, setLang] = useState<'th' | 'en'>(() => {
    const saved = localStorage.getItem('smo_ent_lang');
    return saved === 'en' ? 'en' : 'th';
  });

  const toggleLanguage = () => {
    const next = lang === 'th' ? 'en' : 'th';
    setLang(next);
    localStorage.setItem('smo_ent_lang', next);
  };

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

  // 🌟 ประกาศฟังก์ชัน async ภายใน useEffect โดยตรง เพื่อไม่ให้ติดกฎ react-hooks/set-state-in-effect
  useEffect(() => {
    let isMounted = true;
    const fetchUserData = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/auth/me`, { withCredentials: true });
        if (res.data.user && isMounted) {
          let finalUser: User = res.data.user;
          try {
            const roleRes = await axios.get(`${BASE_URL}/api/events/my-role`, { withCredentials: true });
            if (roleRes.data?.effectiveRole) {
              finalUser = { ...finalUser, role: roleRes.data.effectiveRole };
            }
          } catch {
            // ignore
          }
          if (isMounted) {
            setCurrentUser(finalUser);
            localStorage.setItem('currentUser', JSON.stringify(finalUser));
          }
        }
      } catch {
        if (isMounted) {
          setCurrentUser(null);
          localStorage.removeItem('currentUser');
        }
      }
    };
    fetchUserData();
    return () => {
      isMounted = false;
    };
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

  const handleDevLogin = async (role: 'supreme' | 'admin' | 'user') => {
    try {
      const dbRole = role === 'supreme' ? 'admin' : role;
      const studentId = role === 'supreme' ? '670610706' : role === 'admin' ? '650610000' : '650610999';
      const fullName = role === 'supreme' ? 'Supreme' : role === 'admin' ? 'Admin Tester' : 'Student Tester';

      const response = await axios.post(`${BASE_URL}/api/auth/login`, {
        studentId,
        fullName,
        role: dbRole,
        faculty: 'Engineering',
        email: `${role}@cmu.ac.th`
      });

      const userData: User = {
        ...response.data.user,
        role
      };
      setCurrentUser(userData);
      localStorage.setItem('currentUser', JSON.stringify(userData));
    } catch (error) {
      console.error('Dev Login Error:', error);
    }
  };

  if (!currentUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100%', background: '#f3f4f6', padding: '16px' }}>
        <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '32px 24px', textAlign: 'center', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }}>
          <h2 style={{ color: '#8b0000', marginBottom: '12px', fontSize: '24px' }}>
            {lang === 'th' ? 'เข้าสู่ระบบ SMO ENT' : 'SMO ENT Sign In'}
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '28px', fontSize: '14px' }}>
            {lang === 'th' ? 'สโมสรนักศึกษาคณะวิศวกรรมศาสตร์ มหาวิทยาลัยเชียงใหม่' : 'Engineering Student Union, Chiang Mai University'}
          </p>

          <button
            onClick={handleLoginCMU}
            className="btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: 'bold', backgroundColor: '#8b0000', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}
          >
            {lang === 'th' ? 'เข้าสู่ระบบด้วย CMU IT Account' : 'Sign in with CMU IT Account'}
          </button>

          <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px' }}>สำหรับนักพัฒนา (Dev Mode)</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleDevLogin('supreme')}
                style={{ flex: 1, minWidth: '110px', padding: '10px 8px', backgroundColor: '#b45309', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
              >
                👑 Supreme
              </button>
              <button
                onClick={() => handleDevLogin('admin')}
                style={{ flex: 1, minWidth: '110px', padding: '10px 8px', backgroundColor: '#dc2626', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
              >
                🛠️ Admin
              </button>
              <button
                onClick={() => handleDevLogin('user')}
                style={{ flex: 1, minWidth: '110px', padding: '10px 8px', backgroundColor: '#2563eb', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
              >
                🎓 User
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const effectiveBinaryRole: 'admin' | 'user' = (currentUser.role === 'supreme' || currentUser.role === 'admin') ? 'admin' : 'user';
  const compatUser = { ...currentUser, role: effectiveBinaryRole };

  return (
    <div className="app-container">
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
        lang={lang}
      />

      <main className="main-content">
        <header className="smo-top-header">
          <div className="smo-header-title">
            <h2>{lang === 'th' ? 'สโมสรนักศึกษาคณะวิศวกรรมศาสตร์' : 'Engineering Student Union (SMO ENT)'}</h2>
          </div>

          <div className="smo-header-socials">
            <a href="https://web.facebook.com/smo.ent.cmu" target="_blank" rel="noreferrer" className="smo-social-circle" title="Facebook"><FacebookIcon /></a>
            <a href="https://www.instagram.com/smo.ent.cmu" target="_blank" rel="noreferrer" className="smo-social-circle" title="Instagram"><InstagramIcon /></a>
            <a href="https://www.tiktok.com/@smo.ent.cmu" target="_blank" rel="noreferrer" className="smo-social-circle" title="TikTok"><TikTokIcon /></a>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={toggleLanguage}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                borderRadius: '999px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb',
                color: '#111827', fontWeight: '700', fontSize: '12px', cursor: 'pointer'
              }}
              title="Switch Language (TH / EN)"
            >
              <Globe size={15} color="#8b0000" />
              {lang === 'th' ? 'ไทย' : 'ENG'}
            </button>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '700', fontSize: '14px', color: '#111827', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                {currentUser.role === 'supreme' ? <Crown size={15} color="#b45309" /> : <UserIcon size={14} />}
                {currentUser.fullName}
              </div>
              <div style={{
                fontSize: '12px',
                color: currentUser.role === 'supreme' ? '#b45309' : currentUser.role === 'admin' ? '#8b0000' : '#1d4ed8',
                fontWeight: '700'
              }}>
                {currentUser.role === 'supreme'
                  ? (lang === 'th' ? 'รุ่นใหญ่' : 'Supreme')
                  : currentUser.role === 'admin'
                  ? (lang === 'th' ? 'ผู้ดูแลระบบ' : 'Administrator')
                  : (lang === 'th' ? 'นักศึกษา' : 'Student')}
              </div>
            </div>
          </div>
        </header>

        <div className="content-area">
          {activeTab === 'home' && <HomePage currentRole={effectiveBinaryRole} lang={lang} />}
          {activeTab === 'staff' && <StaffRecruitmentTab currentUser={compatUser} lang={lang} />}
          {activeTab === 'directory' && effectiveBinaryRole === 'admin' && <OAuthDirectoryView currentUser={currentUser} lang={lang} />}
          {activeTab === 'inventory' && <InventoryTab currentRole={effectiveBinaryRole} currentUserId={currentUser.studentId} currentUser={compatUser} />}
          {activeTab === 'history' && <HistoryTab currentRole={effectiveBinaryRole} currentUserId={currentUser.studentId} />}
        </div>
      </main>
    </div>
  );
}

export default App;