import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Users, Plus, CheckCircle, XCircle, UserCheck, AlertCircle,
  Sparkles, X, Edit, Trash2, Upload, Eye, BarChart3, QrCode, ArrowLeft, ShieldAlert
} from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_URL = `${BASE_URL}/api`;
axios.defaults.withCredentials = true;

const DEFAULT_EVENT_IMG = 'https://placehold.co/800x400/8b0000/ffffff?text=SMO+ENT+STAFF+RECRUITMENT';

// บีบอัดและแปลงรูปภาพเป็น Base64 เพื่อเก็บใน Database
const convertFileToBase64 = (file: File, maxDim = 650): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.72));
        } else {
          resolve(String(e.target?.result || ''));
        }
      };
      img.onerror = reject;
      img.src = String(e.target?.result || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const getStudentYear = (studentId: string): string => {
  const prefix = parseInt(studentId.substring(0, 2), 10);
  if (isNaN(prefix)) return '1';
  const year = 69 - prefix + 1;
  if (year <= 1) return '1';
  if (year >= 4) return '4';
  return String(year);
};

const checkIsEngineering = (user: User): boolean => {
  if (user.role === 'admin') return true;
  const fac = (user.faculty || '').toLowerCase();
  if (fac.includes('engineer') || fac.includes('วิศว')) return true;
  if (user.studentId && user.studentId.length >= 4 && user.studentId.substring(2, 4) === '06') return true;
  return false;
};

interface User {
  studentId: string;
  fullName: string;
  faculty: string;
  email: string;
  role: 'admin' | 'user';
}

interface StaffRecruitmentTabProps {
  currentUser: User;
}

interface UserProfile {
  studentId: string;
  nickname: string;
  hasShopShirt: boolean;
  major: string;
  height: number;
  medicalCondition: string | null;
  drugAllergies: string | null;
  foodAllergies: string | null;
  contactChannel: string;
  phoneNumber: string;
}

interface EventRole {
  id: number;
  eventId: number;
  roleName: string;
  description?: string;
  allowedYears?: string[];
  lineQrUrl?: string;
  totalQuota: number;
  availableQuota: number;
  appliedCount?: number;
}

interface StaffEvent {
  id: number;
  title: string;
  description: string | null;
  imageUrl?: string;
  allowedYears?: string[];
  qrCount?: 1 | 2;
  mainLineQrUrl?: string;
  status: string;
  createdBy: string;
  createdAt: string;
  roles: EventRole[];
}

interface StaffApplication {
  id: number;
  eventId: number;
  roleId: number;
  studentId: string;
  status: string;
  appliedAt: string;
  eventTitle?: string;
  roleName?: string;
  fullName?: string;
  studentYear?: string;
  profile?: UserProfile | null;
}

interface RoleFormItem {
  id?: number;
  roleName: string;
  totalQuota: number;
  description: string;
  allowedYears: string[];
  lineQrUrl: string;
}

export default function StaffRecruitmentTab({ currentUser }: StaffRecruitmentTabProps) {
  const isAdmin = currentUser.role === 'admin';
  const studentId = currentUser.studentId;
  const isEngVerified = checkIsEngineering(currentUser);
  const currentStudentYear = getStudentYear(studentId);

  const [subTab, setSubTab] = useState<'events' | 'profile' | 'dashboard'>('events');
  const [eventsList, setEventsList] = useState<StaffEvent[]>([]);
  const [applicationsList, setApplicationsList] = useState<StaffApplication[]>([]);
  const [hasProfile, setHasProfile] = useState<boolean>(false);

  const [detailEvent, setDetailEvent] = useState<StaffEvent | null>(null);
  const [confirmationModal, setConfirmationModal] = useState<{
    show: boolean;
    event: StaffEvent;
    role: EventRole;
  } | null>(null);

  const [dashboardEvent, setDashboardEvent] = useState<StaffEvent | null>(null);
  const [selectedDashboardRole, setSelectedDashboardRole] = useState<EventRole | null>(null);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [eventForm, setEventForm] = useState<{
    title: string;
    description: string;
    imageUrl: string;
    allowedYears: string[];
    qrCount: 1 | 2;
    mainLineQrUrl: string;
    roles: RoleFormItem[];
  }>({
    title: '',
    description: '',
    imageUrl: '',
    allowedYears: ['1', '2', '3', '4'],
    qrCount: 1,
    mainLineQrUrl: '',
    roles: [{ roleName: '', totalQuota: 10, description: '', allowedYears: ['1', '2', '3', '4'], lineQrUrl: '' }]
  });

  const [profileForm, setProfileForm] = useState({
    nickname: '',
    hasShopShirt: true,
    major: 'CPE',
    height: 170,
    medicalCondition: '',
    drugAllergies: '',
    foodAllergies: '',
    contactChannel: '',
    phoneNumber: ''
  });

  const [feedbackModal, setFeedbackModal] = useState<{ show: boolean; type: 'success' | 'error'; message: string }>({
    show: false,
    type: 'success',
    message: ''
  });

  // ฟังก์ชันดึงข้อมูลกิจกรรมและรายชื่อผู้สมัคร (ไม่ต้องห่อ useCallback เพื่อให้ React Compiler ทำงานได้สมบูรณ์)
  const refreshEventsAndApps = async () => {
    try {
      const evRes = await axios.get(`${API_URL}/events`);
      if (Array.isArray(evRes.data)) {
        setEventsList(evRes.data);
      }
    } catch { /* ignore */ }

    try {
      const appRes = await axios.get(`${API_URL}/events/applications`);
      if (Array.isArray(appRes.data)) {
        setApplicationsList(appRes.data);
      }
    } catch {
      try {
        const appRes2 = await axios.get(`${API_URL}/applications`);
        if (Array.isArray(appRes2.data)) {
          setApplicationsList(appRes2.data);
        }
      } catch { /* ignore */ }
    }
  };

  // โหลดโปรไฟล์ครั้งแรกเมื่อเข้าหน้าเว็บ
  useEffect(() => {
    let isMounted = true;
    const loadUserProfile = async () => {
      try {
        const profRes = await axios.get(`${API_URL}/profile/${studentId}`);
        if (isMounted && profRes.data?.hasProfile && profRes.data?.profile) {
          const p: UserProfile = profRes.data.profile;
          setHasProfile(true);
          setProfileForm({
            nickname: p.nickname || '',
            hasShopShirt: Boolean(p.hasShopShirt),
            major: p.major || 'CPE',
            height: Number(p.height) || 170,
            medicalCondition: p.medicalCondition || '',
            drugAllergies: p.drugAllergies || '',
            foodAllergies: p.foodAllergies || '',
            contactChannel: p.contactChannel || '',
            phoneNumber: p.phoneNumber || ''
          });
        }
      } catch {
        // ยังไม่มีโปรไฟล์
      }
    };
    loadUserProfile();
    return () => {
      isMounted = false;
    };
  }, [studentId]);

  // โหลดรายการกิจกรรมและใบสมัครแบบ Real-time
  useEffect(() => {
    let isMounted = true;
    const pollData = async () => {
      if (!isMounted) return;
      await refreshEventsAndApps();
    };
    pollData();
    const interval = setInterval(pollData, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = profileForm.phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setFeedbackModal({ show: true, type: 'error', message: 'กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก' });
      return;
    }

    try {
      await axios.post(`${API_URL}/profile`, {
        ...profileForm,
        height: Number(profileForm.height),
        phoneNumber: cleanPhone
      });
      setHasProfile(true);
      setFeedbackModal({ show: true, type: 'success', message: 'บันทึกข้อมูลโปรไฟล์สำหรับสมัครสต๊าฟเรียบร้อยแล้ว!' });
      setSubTab('events');
      await refreshEventsAndApps();
    } catch (error: unknown) {
      let msg = 'เกิดข้อผิดพลาดในการบันทึกโปรไฟล์';
      if (axios.isAxiosError(error) && error.response?.data?.error) msg = error.response.data.error;
      setFeedbackModal({ show: true, type: 'error', message: msg });
    }
  };

  const handleApplyRole = async (ev: StaffEvent, role: EventRole) => {
    if (!hasProfile) {
      setDetailEvent(null);
      setFeedbackModal({
        show: true,
        type: 'error',
        message: 'กรุณากรอกข้อมูลโปรไฟล์สำหรับสต๊าฟ (เช่น เสื้อช็อป, แพ้อาหาร/ยา) ให้ครบก่อนกดสมัครครับ'
      });
      setSubTab('profile');
      return;
    }

    const allowed = role.allowedYears || ev.allowedYears || ['1', '2', '3', '4'];
    if (!allowed.includes(currentStudentYear)) {
      setFeedbackModal({
        show: true,
        type: 'error',
        message: `ฝ่ายนี้เปิดรับเฉพาะนักศึกษาชั้นปีที่ ${allowed.join(', ')} (รหัสของคุณคือชั้นปีที่ ${currentStudentYear})`
      });
      return;
    }

    try {
      await axios.post(`${API_URL}/events/apply`, { eventId: ev.id, roleId: role.id });
      await refreshEventsAndApps();
      setDetailEvent(null);
      setConfirmationModal({ show: true, event: ev, role });
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403 && error.response?.data?.requiresProfile) {
          setDetailEvent(null);
          setSubTab('profile');
        }
        const errMsg = error.response?.data?.error || error.response?.data?.message || 'ไม่สามารถสมัครได้';
        setFeedbackModal({ show: true, type: 'error', message: errMsg });
      }
    }
  };

  const handleCancelStaff = async (appId: number, eventTitle?: string) => {
    if (!confirm(`ยืนยันการยกเลิกการเป็นสต๊าฟในกิจกรรม "${eventTitle || ''}" ใช่หรือไม่?`)) return;
    try {
      await axios.post(`${API_URL}/events/cancel`, { applicationId: appId });
      await refreshEventsAndApps();
      setConfirmationModal(null);
      setFeedbackModal({ show: true, type: 'success', message: 'ยกเลิกการเป็นสต๊าฟและคืนโควต้าให้ฝ่ายเรียบร้อยแล้ว' });
    } catch (error: unknown) {
      let msg = 'ไม่สามารถยกเลิกได้';
      if (axios.isAxiosError(error) && error.response?.data?.error) msg = error.response.data.error;
      setFeedbackModal({ show: true, type: 'error', message: msg });
    }
  };

  const handleOpenCreateEvent = () => {
    setEditingEventId(null);
    setEventForm({
      title: '',
      description: '',
      imageUrl: '',
      allowedYears: ['1', '2', '3', '4'],
      qrCount: 1,
      mainLineQrUrl: '',
      roles: [{ roleName: '', totalQuota: 10, description: '', allowedYears: ['1', '2', '3', '4'], lineQrUrl: '' }]
    });
    setIsEventModalOpen(true);
  };

  const handleOpenEditEvent = (ev: StaffEvent) => {
    setEditingEventId(ev.id);
    setEventForm({
      title: ev.title,
      description: ev.description || '',
      imageUrl: ev.imageUrl || '',
      allowedYears: ev.allowedYears || ['1', '2', '3', '4'],
      qrCount: ev.qrCount === 2 ? 2 : 1,
      mainLineQrUrl: ev.mainLineQrUrl || '',
      roles: ev.roles && ev.roles.length > 0
        ? ev.roles.map(r => ({
            id: r.id,
            roleName: r.roleName,
            totalQuota: r.totalQuota,
            description: r.description || '',
            allowedYears: r.allowedYears || ev.allowedYears || ['1', '2', '3', '4'],
            lineQrUrl: r.lineQrUrl || ''
          }))
        : [{ roleName: '', totalQuota: 10, description: '', allowedYears: ['1', '2', '3', '4'], lineQrUrl: '' }]
    });
    setIsEventModalOpen(true);
  };

  const handleDeleteEvent = async (ev: StaffEvent) => {
    if (!confirm(`ยืนยันการลบกิจกรรม "${ev.title}" ทั้งหมดใช่หรือไม่?`)) return;
    try {
      await axios.delete(`${API_URL}/events/${ev.id}`);
      await refreshEventsAndApps();
      if (dashboardEvent?.id === ev.id) setDashboardEvent(null);
      setFeedbackModal({ show: true, type: 'success', message: `ลบกิจกรรม "${ev.title}" เรียบร้อยแล้ว` });
    } catch {
      setFeedbackModal({ show: true, type: 'error', message: 'ลบกิจกรรมไม่สำเร็จ' });
    }
  };

  const handleSaveEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (eventForm.allowedYears.length === 0) {
      setFeedbackModal({ show: true, type: 'error', message: 'กรุณาเลือกชั้นปีที่มีสิทธิ์สมัครอย่างน้อย 1 ชั้นปี' });
      return;
    }

    try {
      if (editingEventId) {
        await axios.put(`${API_URL}/events/${editingEventId}`, eventForm);
        setFeedbackModal({ show: true, type: 'success', message: 'บันทึกการแก้ไขกิจกรรมเรียบร้อยแล้ว!' });
      } else {
        await axios.post(`${API_URL}/events`, eventForm);
        setFeedbackModal({ show: true, type: 'success', message: 'สร้างกิจกรรมเปิดรับสมัครสต๊าฟเรียบร้อยแล้ว!' });
      }
      setIsEventModalOpen(false);
      await refreshEventsAndApps();
    } catch (error: unknown) {
      let msg = 'บันทึกกิจกรรมไม่สำเร็จ';
      if (axios.isAxiosError(error) && error.response?.data?.error) msg = error.response.data.error;
      setFeedbackModal({ show: true, type: 'error', message: msg });
    }
  };

  const toggleAllowedYear = (year: string) => {
    setEventForm(prev => {
      const exists = prev.allowedYears.includes(year);
      const nextYears = exists ? prev.allowedYears.filter(y => y !== year) : [...prev.allowedYears, year].sort();
      return { ...prev, allowedYears: nextYears };
    });
  };

  const toggleRoleAllowedYear = (roleIdx: number, year: string) => {
    setEventForm(prev => {
      const updated = [...prev.roles];
      const current = updated[roleIdx].allowedYears || ['1', '2', '3', '4'];
      const next = current.includes(year) ? current.filter(y => y !== year) : [...current, year].sort();
      updated[roleIdx] = { ...updated[roleIdx], allowedYears: next };
      return { ...prev, roles: updated };
    });
  };

  if (!isEngVerified) {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto', backgroundColor: 'white', padding: '40px', borderRadius: '16px', textAlign: 'center', border: '2px solid #fca5a5' }}>
        <ShieldAlert size={64} color="#dc2626" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ color: '#991b1b', margin: '0 0 12px 0' }}>สงวนสิทธิ์เฉพาะนักศึกษาคณะวิศวกรรมศาสตร์</h2>
        <p style={{ color: '#4b5563', fontSize: '15px', lineHeight: '1.6' }}>
          บัญชีของคุณ ({studentId} - {currentUser.faculty}) ไม่ได้สังกัดคณะวิศวกรรมศาสตร์ จึงไม่สามารถเข้าใช้งานระบบรับสมัครสต๊าฟของสโมสรนักศึกษาคณะวิศวกรรมศาสตร์ได้ครับ
        </p>
      </div>
    );
  }

  const myApplications = applicationsList.filter(a => a.studentId === studentId);

  return (
    <div style={{ paddingBottom: '40px' }}>
      {feedbackModal.show && (
        <div className="modal-overlay" style={{ zIndex: 1100, backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-content" style={{ maxWidth: '420px', width: '92%', textAlign: 'center', padding: '32px 24px' }}>
            {feedbackModal.type === 'success' ? (
              <CheckCircle size={56} color="#16a34a" style={{ margin: '0 auto 16px' }} />
            ) : (
              <XCircle size={56} color="#dc2626" style={{ margin: '0 auto 16px' }} />
            )}
            <h3 style={{ fontSize: '20px', marginBottom: '8px', color: feedbackModal.type === 'success' ? '#166534' : '#991b1b' }}>
              {feedbackModal.type === 'success' ? 'สำเร็จ!' : 'แจ้งเตือน'}
            </h3>
            <p style={{ color: '#4b5563', marginBottom: '24px', fontSize: '15px' }}>{feedbackModal.message}</p>
            <button className="btn-primary" style={{ width: '100%' }} onClick={() => setFeedbackModal({ ...feedbackModal, show: false })}>
              ตกลง
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Users size={24} color="#8b0000" /> ระบบรับสมัครสต๊าฟกิจกรรม (SMO ENT)
          </h2>
          <div style={{ fontSize: '13px', color: '#166534', fontWeight: '600', marginTop: '4px' }}>
            ✓ ยืนยันตัวตน: นักศึกษาคณะวิศวกรรมศาสตร์ (รหัส {studentId} • ชั้นปีที่ {currentStudentYear})
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setSubTab('events'); setDashboardEvent(null); }}
            style={{
              padding: '9px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px',
              border: subTab === 'events' ? 'none' : '1px solid #d1d5db',
              backgroundColor: subTab === 'events' ? '#8b0000' : 'white',
              color: subTab === 'events' ? 'white' : '#374151',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <Sparkles size={16} /> กิจกรรมที่เปิดรับสมัคร
          </button>

          {!isAdmin && (
            <button
              onClick={() => setSubTab('profile')}
              style={{
                padding: '9px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px',
                border: subTab === 'profile' ? 'none' : '1px solid #d1d5db',
                backgroundColor: subTab === 'profile' ? '#8b0000' : hasProfile ? 'white' : '#fef3c7',
                color: subTab === 'profile' ? 'white' : hasProfile ? '#374151' : '#b45309',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <Edit size={16} /> {hasProfile ? 'แก้ไขโปรไฟล์สต๊าฟ' : '⚠️ กรอกโปรไฟล์ก่อนสมัคร'}
            </button>
          )}

          {isAdmin && (
            <>
              <button
                onClick={() => {
                  setSubTab('dashboard');
                  if (!dashboardEvent && eventsList.length > 0) setDashboardEvent(eventsList[0]);
                }}
                style={{
                  padding: '9px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px',
                  border: subTab === 'dashboard' ? 'none' : '1px solid #d1d5db',
                  backgroundColor: subTab === 'dashboard' ? '#8b0000' : 'white',
                  color: subTab === 'dashboard' ? 'white' : '#374151',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <BarChart3 size={16} /> แดชบอร์ดผู้สมัคร (Dashboard)
              </button>
              <button
                className="btn-primary"
                onClick={handleOpenCreateEvent}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}
              >
                <Plus size={18} /> ตั้งกิจกรรมใหม่
              </button>
            </>
          )}
        </div>
      </div>

      {!isAdmin && !hasProfile && subTab !== 'profile' && (
        <div style={{ backgroundColor: '#fffbeb', borderLeft: '4px solid #d97706', padding: '16px 20px', borderRadius: '8px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#92400e', fontSize: '14px' }}>
            <AlertCircle size={22} color="#d97706" />
            <span><strong>แจ้งเตือน:</strong> กรุณากรอกข้อมูลส่วนตัวสำหรับสต๊าฟ (ชื่อเล่น, เสื้อช็อป, อาหารที่แพ้) ครั้งเดียวก่อนกดสมัครกิจกรรมครับ</span>
          </div>
          <button className="btn-primary" style={{ backgroundColor: '#d97706', borderColor: '#d97706', fontSize: '13px', padding: '8px 16px' }} onClick={() => setSubTab('profile')}>
            ไปหน้ากรอกโปรไฟล์ →
          </button>
        </div>
      )}

      {/* หน้ารายการกิจกรรมทั้งหมด */}
      {subTab === 'events' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '24px' }}>
          {eventsList.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', backgroundColor: 'white', padding: '60px 20px', borderRadius: '12px', textAlign: 'center', color: '#6b7280', border: '1px solid #e5e7eb' }}>
              ยังไม่มีกิจกรรมที่เปิดรับสมัครสต๊าฟในขณะนี้
            </div>
          ) : (
            eventsList.map(ev => {
              const myAppInThisEvent = myApplications.find(a => a.eventId === ev.id);
              const myRoleObj = ev.roles?.find(r => r.id === myAppInThisEvent?.roleId);
              const totalNeeded = (ev.roles || []).reduce((sum, r) => sum + r.totalQuota, 0);
              const totalApplied = (ev.roles || []).reduce((sum, r) => sum + (r.totalQuota - r.availableQuota), 0);

              return (
                <div key={ev.id} style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px rgba(0,0,0,0.04)' }}>
                  <div style={{ height: '190px', backgroundColor: '#f3f4f6', position: 'relative' }}>
                    <img
                      src={ev.imageUrl || DEFAULT_EVENT_IMG}
                      alt={ev.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <span style={{
                      position: 'absolute', top: '12px', right: '12px',
                      padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 'bold',
                      backgroundColor: ev.status === 'open' ? '#dcfce7' : '#f3f4f6',
                      color: ev.status === 'open' ? '#166534' : '#6b7280',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      {ev.status === 'open' ? '🟢 เปิดรับสมัคร' : '🔴 ปิดรับสมัคร'}
                    </span>
                  </div>

                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#111827' }}>{ev.title}</h3>
                    <div style={{ fontSize: '13px', color: '#8b0000', fontWeight: 'bold', marginBottom: '8px' }}>
                      🎓 รับนักศึกษาชั้นปีที่: {(ev.allowedYears || ['1', '2', '3', '4']).join(', ')} | 👥 สมัครแล้ว {totalApplied}/{totalNeeded} คน
                    </div>
                    <p style={{ color: '#4b5563', fontSize: '14px', margin: '0 0 16px 0', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {ev.description || 'ร่วมเป็นส่วนหนึ่งในการจัดกิจกรรมของสโมสรนักศึกษาคณะวิศวกรรมศาสตร์'}
                    </p>

                    {!isAdmin && myAppInThisEvent && (
                      <div style={{ backgroundColor: '#dcfce7', border: '1px solid #86efac', padding: '12px', borderRadius: '10px', marginBottom: '14px' }}>
                        <div style={{ color: '#166534', fontWeight: 'bold', fontSize: '14px' }}>
                          ✓ คุณเป็นสต๊าฟฝ่าย: {myRoleObj?.roleName || myAppInThisEvent.roleName}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          <button
                            onClick={() => myRoleObj && setConfirmationModal({ show: true, event: ev, role: myRoleObj })}
                            style={{ flex: 1, backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                          >
                            <QrCode size={14} /> ดู QR กลุ่มไลน์
                          </button>
                          <button
                            onClick={() => handleCancelStaff(myAppInThisEvent.id, ev.title)}
                            style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                          >
                            ยกเลิกการเป็นสต๊าฟ
                          </button>
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button
                        className="btn-primary"
                        onClick={() => setDetailEvent(ev)}
                        style={{ width: '100%', padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}
                      >
                        <Eye size={18} /> ดูรายละเอียดทั้งหมด & เลือกฝ่าย ({ev.roles?.length || 0} ฝ่าย)
                      </button>

                      {isAdmin && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <button
                            onClick={() => {
                              setDashboardEvent(ev);
                              setSelectedDashboardRole(null);
                              setSubTab('dashboard');
                            }}
                            style={{ flex: 2, backgroundColor: '#1e40af', color: 'white', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                          >
                            <BarChart3 size={15} /> แดชบอร์ด
                          </button>
                          <button
                            onClick={() => handleOpenEditEvent(ev)}
                            style={{ flex: 1, backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                          >
                            <Edit size={15} /> แก้ไข
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(ev)}
                            style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer' }}
                            title="ลบกิจกรรม"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* หน้าต่างดูรายละเอียดกิจกรรมทั้งหมด + ปุ่มสมัครหลังทีละฝ่าย */}
      {detailEvent && (
        <div className="modal-overlay" style={{ zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.65)' }}>
          <div className="modal-content" style={{ maxWidth: '760px', width: '94%', maxHeight: '90vh', overflowY: 'auto', padding: '0', borderRadius: '16px' }}>
            <div style={{ position: 'relative', height: '240px', backgroundColor: '#1f2937' }}>
              <img src={detailEvent.imageUrl || DEFAULT_EVENT_IMG} alt={detailEvent.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button
                onClick={() => setDetailEvent(null)}
                style={{ position: 'absolute', top: '16px', right: '16px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '24px', color: '#111827' }}>{detailEvent.title}</h2>
                <span style={{ backgroundColor: '#fef2f2', color: '#8b0000', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                  รับเฉพาะชั้นปีที่: {(detailEvent.allowedYears || ['1', '2', '3', '4']).join(', ')}
                </span>
              </div>

              <p style={{ color: '#374151', fontSize: '15px', lineHeight: '1.7', backgroundColor: '#f9fafb', padding: '16px', borderRadius: '10px', border: '1px solid #e5e7eb', marginBottom: '24px', whiteSpace: 'pre-line' }}>
                {detailEvent.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
              </p>

              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#8b0000', borderLeft: '4px solid #8b0000', paddingLeft: '10px' }}>
                รายการฝ่ายที่เปิดรับสมัคร (เลือกสมัครได้ 1 ฝ่ายเท่านั้น)
              </h3>

              {(() => {
                const myAppInEvent = myApplications.find(a => a.eventId === detailEvent.id);
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {(detailEvent.roles || []).map(role => {
                      const isMyRole = myAppInEvent?.roleId === role.id;
                      const alreadyInAnotherRole = Boolean(myAppInEvent && myAppInEvent.roleId !== role.id);
                      const isFull = role.availableQuota <= 0;
                      const roleYears = role.allowedYears || detailEvent.allowedYears || ['1', '2', '3', '4'];
                      const isYearEligible = roleYears.includes(currentStudentYear);

                      return (
                        <div key={role.id} style={{ border: isMyRole ? '2px solid #16a34a' : '1px solid #e5e7eb', borderRadius: '12px', padding: '18px', backgroundColor: isMyRole ? '#f0fdf4' : 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                          <div style={{ flex: '1 1 300px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                              <strong style={{ fontSize: '17px', color: '#111827' }}>ฝ่าย{role.roleName}</strong>
                              <span style={{ fontSize: '12px', backgroundColor: isFull ? '#fee2e2' : '#dcfce7', color: isFull ? '#991b1b' : '#166534', padding: '3px 10px', borderRadius: '999px', fontWeight: 'bold' }}>
                                สมัครแล้ว {role.totalQuota - role.availableQuota}/{role.totalQuota} คน (เหลือ {role.availableQuota})
                              </span>
                              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                • รับชั้นปีที่ {roleYears.join(', ')}
                              </span>
                            </div>
                            <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.5' }}>
                              <strong>หน้าที่รับผิดชอบ:</strong> {role.description || 'ช่วยประสานงานและดูแลกิจกรรมตามที่ได้รับมอบหมาย'}
                            </div>
                          </div>

                          {!isAdmin && (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              {isMyRole ? (
                                <>
                                  <button
                                    onClick={() => {
                                      setDetailEvent(null);
                                      setConfirmationModal({ show: true, event: detailEvent, role });
                                    }}
                                    className="btn-primary"
                                    style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', padding: '8px 14px', fontSize: '13px' }}
                                  >
                                    ดู QR กลุ่มไลน์
                                  </button>
                                  <button
                                    onClick={() => myAppInEvent && handleCancelStaff(myAppInEvent.id, detailEvent.title)}
                                    style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                                  >
                                    ยกเลิกฝ่ายนี้
                                  </button>
                                </>
                              ) : (
                                <button
                                  disabled={alreadyInAnotherRole || isFull || !isYearEligible || detailEvent.status !== 'open'}
                                  onClick={() => handleApplyRole(detailEvent, role)}
                                  className="btn-primary"
                                  style={{
                                    padding: '10px 20px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    opacity: (alreadyInAnotherRole || isFull || !isYearEligible || detailEvent.status !== 'open') ? 0.45 : 1
                                  }}
                                >
                                  {alreadyInAnotherRole
                                    ? 'สมัครฝ่ายอื่นไปแล้ว'
                                    : !isYearEligible
                                    ? `รับเฉพาะปี ${roleYears.join(',')}`
                                    : isFull
                                    ? 'โควต้าเต็ม'
                                    : 'กดสมัครฝ่ายนี้'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* หน้าต่างยืนยันการเป็นสต๊าฟ + แสดง QR Code เข้ากลุ่มไลน์ (1 หรือ 2 กลุ่ม) */}
      {confirmationModal && confirmationModal.show && (
        <div className="modal-overlay" style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="modal-content" style={{ maxWidth: '620px', width: '94%', textAlign: 'center', padding: '32px 24px', borderRadius: '16px', maxHeight: '90vh', overflowY: 'auto' }}>
            <CheckCircle size={60} color="#16a34a" style={{ margin: '0 auto 12px' }} />
            <h2 style={{ margin: '0 0 8px 0', color: '#166534', fontSize: '24px' }}>ยืนยันการเป็นสต๊าฟสำเร็จ!</h2>
            <p style={{ margin: '0 0 20px 0', color: '#374151', fontSize: '15px' }}>
              กิจกรรม: <strong>{confirmationModal.event.title}</strong><br />
              คุณได้สังกัดฝ่าย: <strong style={{ color: '#8b0000' }}>ฝ่าย{confirmationModal.role.roleName}</strong> เรียบร้อยแล้ว
            </p>

            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '17px', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <QrCode size={20} /> กรุณาสแกน QR Code เพื่อเข้ากลุ่ม LINE สต๊าฟ
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: confirmationModal.event.qrCount === 2 ? 'repeat(auto-fit, minmax(210px, 1fr))' : '1fr', gap: '20px', justifyItems: 'center' }}>
                <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #d1d5db', width: '100%', maxWidth: '240px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#111827', marginBottom: '10px' }}>
                    1. กลุ่ม LINE รวม (กลุ่มหลัก)
                  </div>
                  {confirmationModal.event.mainLineQrUrl ? (
                    <img src={confirmationModal.event.mainLineQrUrl} alt="Main Line QR" style={{ width: '170px', height: '170px', objectFit: 'contain', margin: '0 auto', display: 'block' }} />
                  ) : (
                    <div style={{ padding: '40px 10px', color: '#6b7280', fontSize: '13px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                      ผู้จัดยังไม่ได้อัปโหลด QR กลุ่มหลัก
                    </div>
                  )}
                </div>

                {confirmationModal.event.qrCount === 2 && (
                  <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #d1d5db', width: '100%', maxWidth: '240px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#8b0000', marginBottom: '10px' }}>
                      2. กลุ่ม LINE ฝ่าย{confirmationModal.role.roleName}
                    </div>
                    {confirmationModal.role.lineQrUrl ? (
                      <img src={confirmationModal.role.lineQrUrl} alt="Role Line QR" style={{ width: '170px', height: '170px', objectFit: 'contain', margin: '0 auto', display: 'block' }} />
                    ) : (
                      <div style={{ padding: '40px 10px', color: '#6b7280', fontSize: '13px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                        ผู้จัดยังไม่ได้อัปโหลด QR ประจำฝ่ายนี้
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: 'bold' }} onClick={() => setConfirmationModal(null)}>
              รับทราบและปิดหน้าต่างนี้
            </button>
          </div>
        </div>
      )}

      {/* หน้า Dashboard สำหรับแอดมิน */}
      {isAdmin && subTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: '16px' }}>เลือกกิจกรรมเพื่อดู Dashboard:</strong>
              <select
                className="form-input"
                style={{ minWidth: '260px' }}
                value={dashboardEvent?.id || ''}
                onChange={e => {
                  const found = eventsList.find(ev => ev.id === Number(e.target.value)) || null;
                  setDashboardEvent(found);
                  setSelectedDashboardRole(null);
                }}
              >
                {eventsList.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>
            </div>
            {dashboardEvent && (
              <button className="btn-secondary" onClick={() => handleOpenEditEvent(dashboardEvent)}>
                ✏️ แก้ไขกิจกรรมนี้
              </button>
            )}
          </div>

          {dashboardEvent && (() => {
            const currentEv = eventsList.find(e => e.id === dashboardEvent.id) || dashboardEvent;
            const eventApps = applicationsList.filter(a => a.eventId === currentEv.id);
            const totalQuotaAll = (currentEv.roles || []).reduce((acc, r) => acc + r.totalQuota, 0);
            const totalAppliedAll = eventApps.length;

            return (
              <div style={{ backgroundColor: 'white', padding: '28px', borderRadius: '14px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '2px solid #f3f4f6', paddingBottom: '20px', marginBottom: '24px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '22px', color: '#8b0000' }}>📊 Dashboard: {currentEv.title}</h3>
                    <div style={{ fontSize: '14px', color: '#4b5563' }}>
                      ชั้นปีที่เปิดรับ: ปี {(currentEv.allowedYears || ['1', '2', '3', '4']).join(', ')}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#fef2f2', border: '2px solid #8b0000', padding: '12px 24px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '13px', color: '#8b0000', fontWeight: 'bold' }}>จำนวนสต๊าฟที่มาสมัครทั้งหมด / ที่ต้องการ</div>
                    <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#111827' }}>
                      {totalAppliedAll} / {totalQuotaAll} คน
                    </div>
                  </div>
                </div>

                {!selectedDashboardRole ? (
                  <>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '17px', color: '#111827' }}>
                      แยกตามฝ่าย (คลิกที่ฝ่ายเพื่อดูรายชื่อและข้อมูลสต๊าฟในฝ่ายนั้น)
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                      {(currentEv.roles || []).map(role => {
                        const roleMembers = eventApps.filter(a => a.roleId === role.id);
                        return (
                          <div
                            key={role.id}
                            onClick={() => setSelectedDashboardRole(role)}
                            style={{ border: '1px solid #d1d5db', borderRadius: '12px', padding: '20px', cursor: 'pointer', backgroundColor: '#f9fafb', transition: '0.2s' }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <strong style={{ fontSize: '18px', color: '#8b0000' }}>ฝ่าย{role.roleName}</strong>
                              <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '999px', fontSize: '13px', fontWeight: 'bold' }}>
                                {roleMembers.length} / {role.totalQuota} คน
                              </span>
                            </div>
                            <p style={{ fontSize: '13px', color: '#4b5563', margin: '0 0 14px 0' }}>
                              {role.description || 'ไม่มีคำอธิบายเพิ่มเติม'}
                            </p>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              กดดูรายชื่อสมาชิกในฝ่ายนี้ ({roleMembers.length} คน) →
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div>
                    <button
                      onClick={() => setSelectedDashboardRole(null)}
                      style={{ backgroundColor: '#1f2937', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', marginBottom: '16px' }}
                    >
                      <ArrowLeft size={16} /> กลับไปดูทุกฝ่าย
                    </button>

                    <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #e5e7eb' }}>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '19px', color: '#8b0000' }}>
                        รายชื่อสต๊าฟ: ฝ่าย{selectedDashboardRole.roleName}
                      </h4>
                      <div style={{ fontSize: '14px', color: '#4b5563' }}>
                        หน้าที่: {selectedDashboardRole.description || '-'} | สมัครแล้ว {eventApps.filter(a => a.roleId === selectedDashboardRole.id).length} / {selectedDashboardRole.totalQuota} คน
                      </div>
                    </div>

                    {(() => {
                      const members = eventApps.filter(a => a.roleId === selectedDashboardRole.id);
                      if (members.length === 0) {
                        return <p style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>ยังไม่มีผู้สมัครในฝ่ายนี้</p>;
                      }
                      return (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', minWidth: '750px', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#f3f4f6' }}>
                                <th style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center', width: '50px' }}>#</th>
                                <th style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'left' }}>รหัสนศ. / ชื่อ-สกุล</th>
                                <th style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'left' }}>ชื่อเล่น / สาขา / ชั้นปี</th>
                                <th style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'left' }}>เบอร์โทร / ช่องทางติดต่อ</th>
                                <th style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'left' }}>เสื้อช็อป / ส่วนสูง</th>
                                <th style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'left' }}>แพ้อาหาร / ยา / โรคประจำตัว</th>
                              </tr>
                            </thead>
                            <tbody>
                              {members.map((m, idx) => (
                                <tr key={m.id}>
                                  <td style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{idx + 1}</td>
                                  <td style={{ padding: '12px', border: '1px solid #e5e7eb' }}>
                                    <strong>{m.studentId}</strong><br />
                                    <span style={{ color: '#4b5563', fontSize: '13px' }}>{m.fullName || '-'}</span>
                                  </td>
                                  <td style={{ padding: '12px', border: '1px solid #e5e7eb' }}>
                                    {m.profile ? `${m.profile.nickname} (${m.profile.major})` : '-'} • ปี {m.studentYear || getStudentYear(m.studentId)}
                                  </td>
                                  <td style={{ padding: '12px', border: '1px solid #e5e7eb' }}>
                                    {m.profile ? `${m.profile.phoneNumber} (${m.profile.contactChannel})` : '-'}
                                  </td>
                                  <td style={{ padding: '12px', border: '1px solid #e5e7eb' }}>
                                    {m.profile ? `${m.profile.hasShopShirt ? 'มีเสื้อช็อป' : 'ไม่มี'} / ${m.profile.height} ซม.` : '-'}
                                  </td>
                                  <td style={{ padding: '12px', border: '1px solid #e5e7eb', fontSize: '13px' }}>
                                    <div><strong>อาหาร:</strong> {m.profile?.foodAllergies || '-'}</div>
                                    <div><strong>ยา/โรค:</strong> {m.profile?.drugAllergies || '-'} / {m.profile?.medicalCondition || '-'}</div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ฟอร์มข้อมูลโปรไฟล์สต๊าฟ */}
      {subTab === 'profile' && (
        <div style={{ maxWidth: '750px', margin: '0 auto', backgroundColor: 'white', padding: '32px', borderRadius: '14px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
            <UserCheck size={24} color="#8b0000" />
            <h3 style={{ margin: 0, fontSize: '20px' }}>ข้อมูลส่วนตัวสำหรับผู้สมัครสต๊าฟคณะวิศวะฯ</h3>
          </div>

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div className="form-field">
                <label>ชื่อเล่น *</label>
                <input required type="text" className="form-input" placeholder="เช่น ไอซ์" value={profileForm.nickname} onChange={e => setProfileForm({ ...profileForm, nickname: e.target.value })} />
              </div>
              <div className="form-field">
                <label>สาขาวิชา (Major) *</label>
                <input required type="text" className="form-input" placeholder="เช่น CPE, ME, CE, EE, IE" value={profileForm.major} onChange={e => setProfileForm({ ...profileForm, major: e.target.value })} />
              </div>
              <div className="form-field">
                <label>ส่วนสูง (ซม.) *</label>
                <input required type="number" min="100" max="250" className="form-input" value={profileForm.height} onChange={e => setProfileForm({ ...profileForm, height: parseInt(e.target.value, 10) || 170 })} />
              </div>
              <div className="form-field">
                <label>เสื้อช็อปคณะ *</label>
                <select className="form-input" value={profileForm.hasShopShirt ? 'yes' : 'no'} onChange={e => setProfileForm({ ...profileForm, hasShopShirt: e.target.value === 'yes' })}>
                  <option value="yes">✅ มีเสื้อช็อป</option>
                  <option value="no">❌ ยังไม่มีเสื้อช็อป</option>
                </select>
              </div>
              <div className="form-field">
                <label>เบอร์โทรศัพท์ (10 หลัก) *</label>
                <input required type="tel" maxLength={10} className="form-input" placeholder="0812345678" value={profileForm.phoneNumber} onChange={e => setProfileForm({ ...profileForm, phoneNumber: e.target.value.replace(/\D/g, '') })} />
              </div>
              <div className="form-field">
                <label>ช่องทางติดต่อ (IG / Line / FB) *</label>
                <input required type="text" className="form-input" placeholder="เช่น IG: @xxx หรือ Line ID" value={profileForm.contactChannel} onChange={e => setProfileForm({ ...profileForm, contactChannel: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div className="form-field">
                <label>โรคประจำตัว (ถ้าไม่มีเว้นว่าง)</label>
                <input type="text" className="form-input" placeholder="ระบุโรคประจำตัว (ถ้ามี)" value={profileForm.medicalCondition} onChange={e => setProfileForm({ ...profileForm, medicalCondition: e.target.value })} />
              </div>
              <div className="form-field">
                <label>ประวัติการแพ้ยา (ถ้าไม่มีเว้นว่าง)</label>
                <input type="text" className="form-input" placeholder="ระบุยาที่แพ้ (ถ้ามี)" value={profileForm.drugAllergies} onChange={e => setProfileForm({ ...profileForm, drugAllergies: e.target.value })} />
              </div>
              <div className="form-field">
                <label>อาหารที่แพ้ / ข้อจำกัดอาหาร</label>
                <input type="text" className="form-input" placeholder="เช่น แพ้กุ้ง, มังสวิรัติ, ฮาลาล" value={profileForm.foodAllergies} onChange={e => setProfileForm({ ...profileForm, foodAllergies: e.target.value })} />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ padding: '14px', fontSize: '16px', fontWeight: 'bold' }}>
              บันทึกข้อมูลโปรไฟล์สต๊าฟ
            </button>
          </form>
        </div>
      )}

      {/* Modal ตั้งกิจกรรม / แก้ไขกิจกรรมของ Admin */}
      {isEventModalOpen && isAdmin && (
        <div className="modal-overlay" style={{ zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.65)' }}>
          <div className="modal-content" style={{ maxWidth: '780px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>{editingEventId ? '✏️ แก้ไขกิจกรรมรับสมัครสต๊าฟ' : '✨ ตั้งกิจกรรมรับสมัครสต๊าฟใหม่'}</h3>
              <button className="btn-close" onClick={() => setIsEventModalOpen(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveEventSubmit} className="modal-form" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="form-field">
                <label>ชื่อกิจกรรม *</label>
                <input required type="text" className="form-input" placeholder="เช่น รับน้องขึ้นดอย 2569, กีฬาเกียร์..." value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} />
              </div>

              <div className="form-field">
                <label>อัปโหลดรูปภาพหน้าปกกิจกรรม (เก็บลง Database)</label>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', border: '2px dashed #d1d5db', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#f9fafb', fontWeight: '600' }}>
                  <Upload size={18} color="#8b0000" /> คลิกเลือกไฟล์รูปภาพกิจกรรม
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const b64 = await convertFileToBase64(file, 750);
                        setEventForm(prev => ({ ...prev, imageUrl: b64 }));
                      }
                    }}
                  />
                </label>
                {eventForm.imageUrl && (
                  <div style={{ marginTop: '8px', textAlign: 'center' }}>
                    <img src={eventForm.imageUrl} alt="Event Preview" style={{ maxHeight: '140px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                  </div>
                )}
              </div>

              <div className="form-field">
                <label>รายละเอียดกิจกรรม *</label>
                <textarea required rows={3} className="form-input" placeholder="ระบุรายละเอียดกิจกรรม วันเวลา สถานที่..." value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} />
              </div>

              <div className="form-field">
                <label>กำหนดชั้นปีที่มีสิทธิ์สมัครเป็นสต๊าฟได้ (คณะวิศวกรรมศาสตร์) *</label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {['1', '2', '3', '4'].map(yr => {
                    const checked = eventForm.allowedYears.includes(yr);
                    return (
                      <button
                        type="button"
                        key={yr}
                        onClick={() => toggleAllowedYear(yr)}
                        style={{
                          padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
                          border: checked ? '2px solid #8b0000' : '1px solid #d1d5db',
                          backgroundColor: checked ? '#fef2f2' : 'white',
                          color: checked ? '#8b0000' : '#4b5563'
                        }}
                      >
                        {checked ? '✓ ' : ''}ชั้นปีที่ {yr}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>รูปแบบ QR Code กลุ่ม LINE หลังสมัครเสร็จ *</label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  <button
                    type="button"
                    onClick={() => setEventForm({ ...eventForm, qrCount: 1 })}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
                      border: eventForm.qrCount === 1 ? '2px solid #8b0000' : '1px solid #d1d5db',
                      backgroundColor: eventForm.qrCount === 1 ? '#fef2f2' : 'white',
                      color: eventForm.qrCount === 1 ? '#8b0000' : '#374151'
                    }}
                  >
                    1 QR Code (เฉพาะกลุ่มหลักรวม)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEventForm({ ...eventForm, qrCount: 2 })}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
                      border: eventForm.qrCount === 2 ? '2px solid #8b0000' : '1px solid #d1d5db',
                      backgroundColor: eventForm.qrCount === 2 ? '#fef2f2' : 'white',
                      color: eventForm.qrCount === 2 ? '#8b0000' : '#374151'
                    }}
                  >
                    2 QR Codes (กลุ่มหลักรวม + กลุ่มแยกตามฝ่าย)
                  </button>
                </div>

                <div className="form-field">
                  <label>อัปโหลดรูป QR Code กลุ่ม LINE หลักของกิจกรรม</label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 14px', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', backgroundColor: 'white', fontSize: '13px', fontWeight: '600' }}>
                    <QrCode size={16} color="#16a34a" /> อัปโหลด QR กลุ่มหลัก
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const b64 = await convertFileToBase64(file, 450);
                          setEventForm(prev => ({ ...prev, mainLineQrUrl: b64 }));
                        }
                      }}
                    />
                  </label>
                  {eventForm.mainLineQrUrl && (
                    <div style={{ marginTop: '8px' }}>
                      <img src={eventForm.mainLineQrUrl} alt="Main QR" style={{ width: '90px', height: '90px', objectFit: 'contain', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white' }} />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '16px', color: '#8b0000' }}>ฝ่ายที่ต้องการรับสมัคร ({eventForm.roles.length} ฝ่าย) *</label>
                  <button
                    type="button"
                    onClick={() =>
                      setEventForm(prev => ({
                        ...prev,
                        roles: [...prev.roles, { roleName: '', totalQuota: 5, description: '', allowedYears: prev.allowedYears, lineQrUrl: '' }]
                      }))
                    }
                    style={{ backgroundColor: '#8b0000', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                  >
                    + เพิ่มฝ่ายใหม่
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {eventForm.roles.map((r, idx) => (
                    <div key={idx} style={{ border: '1px solid #d1d5db', borderRadius: '10px', padding: '14px', backgroundColor: '#f9fafb' }}>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        <div style={{ flex: 2, minWidth: '180px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 'bold' }}>ชื่อฝ่าย *</label>
                          <input
                            required
                            type="text"
                            className="form-input"
                            placeholder="เช่น สวัสดิการ, พยาบาล, สถานที่"
                            value={r.roleName}
                            onChange={e => {
                              const updated = [...eventForm.roles];
                              updated[idx].roleName = e.target.value;
                              setEventForm({ ...eventForm, roles: updated });
                            }}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: '110px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 'bold' }}>จำนวนที่รับ (คน) *</label>
                          <input
                            required
                            type="number"
                            min="1"
                            className="form-input"
                            value={r.totalQuota}
                            onChange={e => {
                              const updated = [...eventForm.roles];
                              updated[idx].totalQuota = parseInt(e.target.value, 10) || 1;
                              setEventForm({ ...eventForm, roles: updated });
                            }}
                          />
                        </div>
                        {eventForm.roles.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setEventForm({ ...eventForm, roles: eventForm.roles.filter((_, i) => i !== idx) })}
                            style={{ alignSelf: 'flex-end', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '9px 12px', borderRadius: '8px', cursor: 'pointer' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 'bold' }}>รายละเอียดว่าฝ่ายนี้ต้องทำอะไรบ้าง *</label>
                        <input
                          required
                          type="text"
                          className="form-input"
                          placeholder="อธิบายหน้าที่ของฝ่ายนี้ให้ผู้สมัครเข้าใจ..."
                          value={r.description}
                          onChange={e => {
                            const updated = [...eventForm.roles];
                            updated[idx].description = e.target.value;
                            setEventForm({ ...eventForm, roles: updated });
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563' }}>ชั้นปีที่รับในฝ่ายนี้:</span>
                          {['1', '2', '3', '4'].map(yr => {
                            const active = (r.allowedYears || ['1', '2', '3', '4']).includes(yr);
                            return (
                              <button
                                type="button"
                                key={yr}
                                onClick={() => toggleRoleAllowedYear(idx, yr)}
                                style={{
                                  padding: '3px 8px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold',
                                  border: active ? '1px solid #8b0000' : '1px solid #d1d5db',
                                  backgroundColor: active ? '#8b0000' : 'white',
                                  color: active ? 'white' : '#6b7280'
                                }}
                              >
                                ปี {yr}
                              </button>
                            );
                          })}
                        </div>

                        {eventForm.qrCount === 2 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 10px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'white', fontSize: '12px', fontWeight: 'bold' }}>
                              <Upload size={14} color="#8b0000" /> {r.lineQrUrl ? 'เปลี่ยน QR ฝ่ายนี้' : 'อัปโหลด QR กลุ่มฝ่ายนี้'}
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const b64 = await convertFileToBase64(file, 450);
                                    const updated = [...eventForm.roles];
                                    updated[idx].lineQrUrl = b64;
                                    setEventForm({ ...eventForm, roles: updated });
                                  }
                                }}
                              />
                            </label>
                            {r.lineQrUrl && <img src={r.lineQrUrl} alt="Role QR" style={{ width: '36px', height: '36px', borderRadius: '4px', border: '1px solid #d1d5db' }} />}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsEventModalOpen(false)}>ยกเลิก</button>
                <button type="submit" className="btn-primary">{editingEventId ? 'บันทึกการแก้ไข' : 'สร้างกิจกรรม'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}