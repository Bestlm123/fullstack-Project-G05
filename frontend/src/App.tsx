import { useState } from 'react';
import { GraduationCap, LayoutDashboard, ArchiveRestore, LogOut, ClipboardList } from 'lucide-react';
import InventoryTab from './InventoryTab';
import HistoryTab from './HistoryTab';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'history'>('inventory');

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <GraduationCap size={28} color="#8b0000" />
          <h1>SMO ENT</h1>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-item inactive">
            <LayoutDashboard size={20} />
            <span>หน้าหลัก</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'inventory' ? 'active' : 'inactive'}`}
            onClick={() => setActiveTab('inventory')}
            style={{ cursor: 'pointer' }}
          >
            <ArchiveRestore size={20} />
            <span>บริการยืมของ</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'history' ? 'active' : 'inactive'}`}
            onClick={() => setActiveTab('history')}
            style={{ cursor: 'pointer' }}
          >
            <ClipboardList size={20} />
            <span>ประวัติยืม - คืน</span>
          </div>
        </nav>
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              <img src="https://ui-avatars.com/api/?name=Admin&background=2d3748&color=fff" alt="Profile" />
            </div>
            <div className="user-info">
              <div className="name">Admin</div>
              <div className="email">admin@cmu.ac.th</div>
            </div>
          </div>
          <button className="logout-btn">
            <LogOut size={18} />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* ============ เนื้อหาหลัก (Main Content) ============ */}
      <main className="main-content">
        <header className="header">
          <h2>ระบบยืมของ - สโมสรนักศึกษาคณะวิศวกรรมศาสตร์</h2>
        </header>

        <div className="content-area">
          {/* ดึง Component มาโชว์ตามเมนูที่กด */}
          {activeTab === 'inventory' && <InventoryTab />}
          {activeTab === 'history' && <HistoryTab />}
        </div>
      </main>
    </div>
  );
}

export default App;