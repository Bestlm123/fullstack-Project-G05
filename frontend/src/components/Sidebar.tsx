import { useState } from 'react';
import { LayoutDashboard, Package, ClipboardList, LogOut, GraduationCap, Users, Menu, X } from 'lucide-react';

interface User {
  studentId: string;
  fullName: string;
  faculty: string;
  email: string;
  role: 'admin' | 'user';
}

export type AppTab = 'home' | 'inventory' | 'history' | 'staff';

interface SidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  currentUser?: User | null;
  onLogout?: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, currentUser, onLogout }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSelectTab = (tab: AppTab) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };

  return (
    <>
      <style>
        {`
          .smo-mobile-topbar {
            display: none;
          }
          .smo-sidebar-container {
            width: 260px;
            background-color: #ffffff;
            border-right: 1px solid #e5e7eb;
            display: flex;
            flex-direction: column;
            height: 100vh;
            flex-shrink: 0;
            z-index: 900;
          }
          .smo-mobile-backdrop {
            display: none;
          }
          @media (max-width: 768px) {
            .smo-mobile-topbar {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 12px 16px;
              background-color: #ffffff;
              border-bottom: 1px solid #e5e7eb;
              position: sticky;
              top: 0;
              z-index: 850;
              width: 100%;
            }
            .smo-sidebar-container {
              position: fixed;
              top: 0;
              left: 0;
              bottom: 0;
              transform: translateX(-100%);
              transition: transform 0.25s ease-in-out;
              box-shadow: 4px 0 15px rgba(0,0,0,0.12);
            }
            .smo-sidebar-container.open {
              transform: translateX(0);
            }
            .smo-mobile-backdrop.open {
              display: block;
              position: fixed;
              inset: 0;
              background: rgba(0,0,0,0.45);
              z-index: 880;
            }
          }
        `}
      </style>

      {/* แถบด้านบนสำหรับหน้าจอมือถือ */}
      <div className="smo-mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <GraduationCap size={26} color="#8b0000" />
          <strong style={{ color: '#8b0000', fontSize: '17px' }}>SMO ENT</strong>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '6px 10px', color: '#8b0000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />} เมนู
        </button>
      </div>

      <div className={`smo-mobile-backdrop ${mobileOpen ? 'open' : ''}`} onClick={() => setMobileOpen(false)} />

      {/* ตัว Sidebar หลัก */}
      <div className={`smo-sidebar-container ${mobileOpen ? 'open' : ''}`}>
        <div style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <GraduationCap size={28} color="#8b0000" />
            <h2 style={{ color: '#8b0000', margin: 0, fontSize: '18px', fontWeight: 'bold' }}>SMO ENT</h2>
          </div>
          {mobileOpen && (
            <button onClick={() => setMobileOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
              <X size={20} />
            </button>
          )}
        </div>

        <nav style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ padding: '0 16px', marginTop: '8px', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            เมนูหลัก
          </div>
          <button
            onClick={() => handleSelectTab('home')}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', border: 'none',
              background: activeTab === 'home' ? '#fef2f2' : 'transparent',
              color: activeTab === 'home' ? '#8b0000' : '#4b5563',
              cursor: 'pointer', fontWeight: '500', width: '100%', textAlign: 'left', transition: 'all 0.2s'
            }}
          >
            <LayoutDashboard size={20} /> หน้าหลัก
          </button>

          <button
            onClick={() => handleSelectTab('staff')}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', border: 'none',
              background: activeTab === 'staff' ? '#fef2f2' : 'transparent',
              color: activeTab === 'staff' ? '#8b0000' : '#4b5563',
              cursor: 'pointer', fontWeight: '500', width: '100%', textAlign: 'left', transition: 'all 0.2s'
            }}
          >
            <Users size={20} /> สมัครสต๊าฟกิจกรรม
          </button>

          <div style={{ padding: '0 16px', marginTop: '24px', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            บริการยืม-คืน
          </div>
          <button
            onClick={() => handleSelectTab('inventory')}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', border: 'none',
              background: activeTab === 'inventory' ? '#fef2f2' : 'transparent',
              color: activeTab === 'inventory' ? '#8b0000' : '#4b5563',
              cursor: 'pointer', fontWeight: '500', width: '100%', textAlign: 'left', transition: 'all 0.2s'
            }}
          >
            <Package size={20} /> บริการยืมของ
          </button>

          <button
            onClick={() => handleSelectTab('history')}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', border: 'none',
              background: activeTab === 'history' ? '#fef2f2' : 'transparent',
              color: activeTab === 'history' ? '#8b0000' : '#4b5563',
              cursor: 'pointer', fontWeight: '500', width: '100%', textAlign: 'left', transition: 'all 0.2s'
            }}
          >
            <ClipboardList size={20} /> ประวัติยืม - คืน
          </button>
        </nav>

        {currentUser && (
          <div style={{ padding: '24px', borderTop: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#1f2937',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', flexShrink: 0
              }}>
                {currentUser?.fullName ? currentUser.fullName.substring(0, 2).toUpperCase() : 'U'}
              </div>

              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {currentUser.fullName}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {currentUser.email}
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', border: 'none',
                background: 'transparent', color: '#ef4444', cursor: 'pointer', fontWeight: '500', width: '100%', textAlign: 'left'
              }}
            >
              <LogOut size={18} /> ออกจากระบบ
            </button>
          </div>
        )}
      </div>
    </>
  );
}