import { LayoutDashboard, Package, ClipboardList, LogOut, GraduationCap } from 'lucide-react';

// 1. ระบุโครงสร้าง User ให้เหมือนกับใน App.tsx
interface User {
  studentId: string;
  fullName: string;
  faculty: string;
  email: string;
  role: 'admin' | 'user';
}

// 2. เพิ่ม currentUser และ onLogout เข้าไปใน Props
interface SidebarProps {
  activeTab: 'home' | 'inventory' | 'history';
  setActiveTab: (tab: 'home' | 'inventory' | 'history') => void;
  currentUser?: User | null;
  onLogout?: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, currentUser, onLogout }: SidebarProps) {
  return (
    <div style={{ 
      width: '260px', backgroundColor: '#ffffff', borderRight: '1px solid #e5e7eb', 
      display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0
    }}>
      {/* โลโก้สโมสร */}
      <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <GraduationCap size={28} color="#8b0000" />
        <h2 style={{ color: '#8b0000', margin: 0, fontSize: '18px', fontWeight: 'bold' }}>SMO ENT</h2>
      </div>
      
      {/* เมนูนำทาง */}
      <nav style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button 
          onClick={() => setActiveTab('home')}
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
          onClick={() => setActiveTab('inventory')}
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
          onClick={() => setActiveTab('history')}
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

      {/* โปรไฟล์ผู้ใช้งานและปุ่มออกจากระบบ (ดึงข้อมูลมาจาก currentUser) */}
      {currentUser && (
        <div style={{ padding: '24px', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            {/* วงกลมรูปโปรไฟล์ (ดักเช็คก่อนว่ามี fullName หรือยัง) */}
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
          
          {/* ปุ่มออกจากระบบ (เรียกใช้ฟังก์ชัน onLogout) */}
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
  );
}