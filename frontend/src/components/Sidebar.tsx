import { useState } from 'react';
import {
  LayoutDashboard, Package, ClipboardList, LogOut, GraduationCap,
  Users, Menu, X, Calendar, Database, BookOpen, FileText,
  HeartHandshake, Clock, ExternalLink, UserCheck, ChevronDown, ChevronRight, Crown
} from 'lucide-react';

interface User {
  studentId: string;
  fullName: string;
  faculty: string;
  email: string;
  role: 'supreme' | 'admin' | 'user';
}

export type AppTab = 'home' | 'inventory' | 'history' | 'staff' | 'directory';

interface SidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  currentUser?: User | null;
  onLogout?: () => void;
  lang?: 'th' | 'en';
}

const CLUB_LOGO_URL = '';

// ============================================================================
// 🌟 ข้อ 6: ตั้งค่าหมวดหมู่ Dropdown ลิงก์ภายนอกของคณะฯ ตรงนี้ได้เลย
// ============================================================================
const CUSTOM_EXTERNAL_DROPDOWNS = [
  {
    id: 'academic_services',
    categoryTh: 'บริการวิชาการ (SD SSO)',
    categoryEn: 'Academic Services',
    defaultOpen: false,
    links: [
      {
        title: 'SIS ENG',
        subtitleTh: 'ระบบฐานข้อมูลนักศึกษา คณะวิศวะฯ',
        subtitleEn: 'Student Information System',
        url: 'https://sis.eng.cmu.ac.th',
        icon: Database
      },
      {
        title: 'Edserv ENG',
        subtitleTh: 'บริการข้อมูลและเอกสารการเรียน',
        subtitleEn: 'Educational Services',
        url: 'https://edserv.eng.cmu.ac.th',
        icon: BookOpen
      },
      {
        title: 'Document Request',
        subtitleTh: 'ระบบขอหนังสือรับรอง คณะวิศวะฯ',
        subtitleEn: 'Official Document Request',
        url: 'https://student.eng.cmu.ac.th/dashboard',
        icon: FileText
      }
    ]
  },
  {
    id: 'student_activities',
    categoryTh: 'พัฒนานักศึกษา (SD SSO)',
    categoryEn: 'Student Support',
    defaultOpen: false,
    links: [
      {
        title: 'Activity Calendar',
        subtitleTh: 'ปฏิทินกิจกรรมสำหรับนักศึกษา',
        subtitleEn: 'Engineering Activity Calendar',
        url: 'https://activity.eng.cmu.ac.th/calendar',
        icon: Calendar
      },
      {
        title: 'Scholarship System',
        subtitleTh: 'ระบบทุนการศึกษาประเภทขัดสน',
        subtitleEn: 'Financial Aid & Scholarships',
        url: 'https://student.eng.cmu.ac.th/dashboard',
        icon: HeartHandshake
      },
      {
        title: 'SD Queue',
        subtitleTh: 'ระบบจองคิวงานพัฒนานักศึกษา',
        subtitleEn: 'Student Development Queue',
        url: 'https://student.eng.cmu.ac.th/dashboard',
        icon: Clock
      }
    ]
  }
];

export default function Sidebar({ activeTab, setActiveTab, currentUser, onLogout, lang = 'th' }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdminOrSupreme = currentUser?.role === 'admin' || currentUser?.role === 'supreme';

  // State เปิด-ปิด Dropdown ทุกหมวดหมู่ให้เหมือนกันทั้งหมด
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {
      main_club_menu: false,
      borrowing_menu: false
    };
    CUSTOM_EXTERNAL_DROPDOWNS.forEach(g => {
      init[g.id] = Boolean(g.defaultOpen);
    });
    return init;
  });

  const toggleGroup = (id: string) => {
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

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
            width: 280px;
            background-color: #ffffff;
            border-right: 1px solid #e5e7eb;
            display: flex;
            flex-direction: column;
            height: 100vh;
            flex-shrink: 0;
            z-index: 900;
            overflow-y: auto;
          }
          .smo-group-box {
            margin-bottom: 8px;
          }
          .smo-dropdown-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            padding: 10px 14px;
            border-radius: 10px;
            border: 1px solid #e5e7eb;
            background-color: #f9fafb;
            color: #111827;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            text-align: left;
          }
          .smo-dropdown-header:hover {
            background-color: #fef2f2;
            color: #8b0000;
            border-color: #fecaca;
          }
          .smo-dropdown-header.open {
            background-color: #fef2f2;
            color: #8b0000;
            border-color: #fecaca;
          }
          .smo-dropdown-body {
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-top: 6px;
            padding-left: 10px;
            margin-left: 12px;
            border-left: 2px solid #fecaca;
          }
          .smo-menu-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            padding: 9px 12px;
            border-radius: 8px;
            border: none;
            background: transparent;
            color: #374151;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            width: 100%;
            text-align: left;
            text-decoration: none;
            transition: all 0.2s;
          }
          .smo-menu-item:hover {
            background-color: #fef2f2;
            color: #8b0000;
          }
          .smo-menu-item.active {
            background-color: #8b0000;
            color: #ffffff;
            font-weight: 700;
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

      {/* แถบเมนูบนมือถือ */}
      <div className="smo-mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {CLUB_LOGO_URL ? (
            <img src={CLUB_LOGO_URL} alt="SMO ENT Logo" style={{ width: '34px', height: '34px', objectFit: 'contain' }} />
          ) : (
            <GraduationCap size={26} color="#8b0000" />
          )}
          <strong style={{ color: '#8b0000', fontSize: '17px' }}>SMO ENT CMU</strong>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '6px 10px', color: '#8b0000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />} {lang === 'th' ? 'เมนู' : 'Menu'}
        </button>
      </div>

      <div className={`smo-mobile-backdrop ${mobileOpen ? 'open' : ''}`} onClick={() => setMobileOpen(false)} />

      {/* Sidebar หลัก */}
      <div className={`smo-sidebar-container ${mobileOpen ? 'open' : ''}`}>
        <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {CLUB_LOGO_URL ? (
              <img src={CLUB_LOGO_URL} alt="SMO ENT Logo" style={{ width: '42px', height: '42px', objectFit: 'contain', borderRadius: '8px' }} />
            ) : (
              <GraduationCap size={32} color="#8b0000" />
            )}
            <div>
              <h2 style={{ color: '#8b0000', margin: 0, fontSize: '18px', fontWeight: '800', lineHeight: 1.1 }}>SMO ENT</h2>
              <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>Engineering CMU</span>
            </div>
          </div>
          {mobileOpen && (
            <button onClick={() => setMobileOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
              <X size={20} />
            </button>
          )}
        </div>

        <nav style={{ flex: 1, padding: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* 🌟 Dropdown หมวดที่ 1: เมนูหลักสโมสรฯ */}
          <div className="smo-group-box">
            <button
              type="button"
              onClick={() => toggleGroup('main_club_menu')}
              className={`smo-dropdown-header ${openGroups.main_club_menu ? 'open' : ''}`}
            >
              <span>{lang === 'th' ? 'เมนูหลักสโมสรฯ' : 'Main Club Menu'}</span>
              {openGroups.main_club_menu ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {openGroups.main_club_menu && (
              <div className="smo-dropdown-body">
                <button
                  onClick={() => handleSelectTab('home')}
                  className={`smo-menu-item ${activeTab === 'home' ? 'active' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <LayoutDashboard size={17} />
                    <span>{lang === 'th' ? 'หน้าหลักประชาสัมพันธ์' : 'Home & Announcements'}</span>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectTab('staff')}
                  className={`smo-menu-item ${activeTab === 'staff' ? 'active' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Users size={17} />
                    <span>{lang === 'th' ? 'สมัครสต๊าฟ & เช็คชื่อ QR' : 'Staff & QR Attendance'}</span>
                  </div>
                </button>

                {isAdminOrSupreme && (
                  <button
                    onClick={() => handleSelectTab('directory')}
                    className={`smo-menu-item ${activeTab === 'directory' ? 'active' : ''}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <UserCheck size={17} />
                      <span>{lang === 'th' ? 'ฐานข้อมูลสมาชิก (OAuth)' : 'OAuth Member Directory'}</span>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 🌟 Dropdown หมวดที่ 2: บริการยืม-คืนพัสดุ */}
          <div className="smo-group-box">
            <button
              type="button"
              onClick={() => toggleGroup('borrowing_menu')}
              className={`smo-dropdown-header ${openGroups.borrowing_menu ? 'open' : ''}`}
            >
              <span>{lang === 'th' ? 'บริการยืม-คืนพัสดุ' : 'Equipment Borrowing'}</span>
              {openGroups.borrowing_menu ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {openGroups.borrowing_menu && (
              <div className="smo-dropdown-body">
                <button
                  onClick={() => handleSelectTab('inventory')}
                  className={`smo-menu-item ${activeTab === 'inventory' ? 'active' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Package size={17} />
                    <span>{lang === 'th' ? 'บริการยืมของ' : 'Borrow Equipment'}</span>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectTab('history')}
                  className={`smo-menu-item ${activeTab === 'history' ? 'active' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ClipboardList size={17} />
                    <span>{lang === 'th' ? 'ประวัติยืม - คืน' : 'Borrowing History'}</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* 🌟 Dropdown หมวดที่ 3 & 4: เว็บไซต์บริการนักศึกษา (ดีไซน์เดียวกันทั้งหมด) */}
          {CUSTOM_EXTERNAL_DROPDOWNS.map((group) => {
            const isOpen = Boolean(openGroups[group.id]);
            return (
              <div key={group.id} className="smo-group-box">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={`smo-dropdown-header ${isOpen ? 'open' : ''}`}
                >
                  <span>{lang === 'th' ? group.categoryTh : group.categoryEn}</span>
                  {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                {isOpen && (
                  <div className="smo-dropdown-body">
                    {group.links.map((link, lIdx) => {
                      const IconComp = link.icon;
                      return (
                        <a
                          key={lIdx}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="smo-menu-item"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                            <IconComp size={16} style={{ flexShrink: 0, color: '#8b0000' }} />
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                {link.title}
                              </div>
                              <div style={{ fontSize: '11px', color: '#6b7280', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                {lang === 'th' ? link.subtitleTh : link.subtitleEn}
                              </div>
                            </div>
                          </div>
                          <ExternalLink size={12} style={{ flexShrink: 0, opacity: 0.6 }} />
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {currentUser && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid #e5e7eb', backgroundColor: '#fafafa' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                backgroundColor: currentUser.role === 'supreme' ? '#b45309' : '#8b0000',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', flexShrink: 0, fontSize: '13px'
              }}>
                {currentUser.role === 'supreme' ? <Crown size={18} /> : (currentUser?.fullName ? currentUser.fullName.substring(0, 2).toUpperCase() : 'U')}
              </div>

              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: '700', fontSize: '13px', color: '#111827', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {currentUser.fullName}
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {currentUser.email}
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', border: 'none',
                background: 'transparent', color: '#dc2626', cursor: 'pointer', fontWeight: '600', width: '100%', textAlign: 'left', fontSize: '13px'
              }}
            >
              <LogOut size={16} /> {lang === 'th' ? 'ออกจากระบบ' : 'Log out'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}