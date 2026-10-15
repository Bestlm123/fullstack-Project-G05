import { useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeCanvas } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Users, Plus, CheckCircle, XCircle, UserCheck, AlertCircle,
  Sparkles, X, Edit, Trash2, Upload, Eye, BarChart3, QrCode, ArrowLeft,
  ShieldAlert, AlertTriangle, ScanLine, FolderArchive, Star, Camera, CameraOff, FileText, Calendar, Clock
} from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_URL = `${BASE_URL}/api`;
axios.defaults.withCredentials = true;

const DEFAULT_EVENT_IMG = 'https://placehold.co/800x450/8b0000/ffffff?text=SMO+ENT+STAFF+RECRUITMENT';

const STAFF_IMAGE_SIZES = {
  eventCardCover: {
    width: '100%',
    aspectRatio: '16 / 9',
    height: '210px',
    objectFit: 'contain' as const,
    backgroundColor: '#111827'
  },
  eventDetailFullBanner: {
    width: '100%',
    aspectRatio: '16 / 9',
    maxHeight: '380px',
    objectFit: 'contain' as const,
    backgroundColor: '#111827'
  },
  lineQrImage: {
    width: '190px',
    height: '190px',
    objectFit: 'contain' as const
  }
};

const ENGINEERING_MAJORS = [
  'ภาควิชาวิศวกรรมโยธา (CE)',
  'ภาควิชาวิศวกรรมไฟฟ้า (EE)',
  'ภาควิชาวิศวกรรมสิ่งแวดล้อม (ENVI)',
  'ภาควิชาวิศวกรรมอุตสาหการ (IE)',
  'ภาควิชาวิศวกรรมเครื่องกล (ME)',
  'ภาควิชาวิศวกรรมคอมพิวเตอร์ (CPE)',
  'ภาควิชาวิศวกรรมเหมืองแร่และปิโตรเลียม (MNP)',
  'ภาควิชาวิศวกรรมหุ่นยนต์และปัญญาประดิษฐ์ (REAI)',
  'ภาควิชาวิศวกรรมบูรณาการ (IGE)',
  'ภาควิชาวิศวกรรมเครื่องกลและการบริหารโครงการวิศวกรรม (MEPM)',
  'ภาควิชาวิศวกรรมระบบสารสนเทศและเครือข่าย (ISNE)',
  'ภาควิชาวิศวกรรมไฟฟ้าและเทคโนโลยีโครงข่ายไฟฟ้าอัจฉริยะ (EESG)',
  'ภาควิชาวิศวกรรมโยธา (นานาชาติ) (CIE)',
  'ภาควิชาวิศวกรรมอุตสาหการและการจัดการ โลจิสติกส์ (IEL)'
];

const convertFileToBase64 = (file: File, maxDim = 420, quality = 0.55): Promise<string> => {
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
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
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
  const year = 69 - prefix;
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
  lang?: 'th' | 'en';
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
  eventDate?: string;
  eventStartTime?: string;
  eventEndTime?: string;
  recruitStartDate?: string;
  recruitStartTime?: string;
  recruitEndDate?: string;
  recruitEndTime?: string;
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
  attendanceStatus?: 'none' | 'checked_in' | 'checked_out';
  checkInTime?: string;
  checkOutTime?: string;
  feedbackSubmitted?: boolean;
}

interface FeedbackRecord {
  id: string;
  eventId: number;
  eventTitle: string;
  studentId: string;
  fullName: string;
  roleName: string;
  rating: number;
  comment: string;
  suggestionsForNextGen: string;
  submittedAt: string;
}

interface ArchiveDocRecord {
  id: string;
  eventId: number;
  eventTitle: string;
  docTitle: string;
  summaryNote: string;
  fileLinkOrData?: string;
  createdBy: string;
  createdAt: string;
}

interface RoleFormItem {
  id?: number;
  roleName: string;
  totalQuota: number;
  description: string;
  lineQrUrl: string;
}

// 🌟 ข้อ 3: ฟังก์ชันตรวจสอบว่ากิจกรรมนี้หมดเขตช่วงเวลารับสมัครสต๊าฟหรือยัง
const checkIsRecruitmentExpired = (ev: StaffEvent): boolean => {
  if (ev.status !== 'open') return true;
  if (!ev.recruitEndDate) return false;
  const endTime = ev.recruitEndTime || '23:59';
  const deadline = new Date(`${ev.recruitEndDate}T${endTime}:00`);
  if (isNaN(deadline.getTime())) return false;
  return new Date().getTime() > deadline.getTime();
};

const checkIsRecruitmentNotStartedYet = (ev: StaffEvent): boolean => {
  if (!ev.recruitStartDate) return false;
  const startTime = ev.recruitStartTime || '00:00';
  const startObj = new Date(`${ev.recruitStartDate}T${startTime}:00`);
  if (isNaN(startObj.getTime())) return false;
  return new Date().getTime() < startObj.getTime();
};

const formatShortThaiDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function StaffRecruitmentTab({ currentUser, lang = 'th' }: StaffRecruitmentTabProps) {
  const isAdmin = currentUser.role === 'admin';
  const studentId = currentUser.studentId;
  const isEngVerified = checkIsEngineering(currentUser);
  const currentStudentYear = getStudentYear(studentId);

  const [subTab, setSubTab] = useState<'events' | 'profile' | 'dashboard' | 'scanner' | 'archive'>('events');
  const [eventsList, setEventsList] = useState<StaffEvent[]>([]);
  const [applicationsList, setApplicationsList] = useState<StaffApplication[]>([]);
  const [feedbacksList, setFeedbacksList] = useState<FeedbackRecord[]>([]);
  const [archivesList, setArchivesList] = useState<ArchiveDocRecord[]>([]);
  const [hasProfile, setHasProfile] = useState<boolean>(false);

  const [detailEvent, setDetailEvent] = useState<StaffEvent | null>(null);
  const [confirmationModal, setConfirmationModal] = useState<{
    show: boolean;
    event: StaffEvent;
    role: EventRole;
  } | null>(null);

  const [personalQrModal, setPersonalQrModal] = useState<{
    show: boolean;
    app: StaffApplication;
    qrString: string;
  } | null>(null);

  const [feedbackFormModal, setFeedbackFormModal] = useState<{
    show: boolean;
    app: StaffApplication;
    rating: number;
    comment: string;
    suggestionsForNextGen: string;
  } | null>(null);

  const [isStaffCameraOpen, setIsStaffCameraOpen] = useState(false);
  const [manualStaffQrInput, setManualStaffQrInput] = useState('');

  // 🌟 ข้อ 4: State สำหรับคลังข้อมูลที่แยกเป็นหมวดหมู่ตามแต่ละกิจกรรม
  const [selectedArchiveEvent, setSelectedArchiveEvent] = useState<StaffEvent | null>(null);
  const [archiveCategoryTab, setArchiveCategoryTab] = useState<'documents' | 'feedbacks'>('feedbacks');
  const [newArchiveForm, setNewArchiveForm] = useState({
    docTitle: '',
    summaryNote: '',
    fileLinkOrData: ''
  });

  const [dashboardEvent, setDashboardEvent] = useState<StaffEvent | null>(null);
  const [selectedDashboardRole, setSelectedDashboardRole] = useState<EventRole | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [eventForm, setEventForm] = useState<{
    title: string;
    description: string;
    imageUrl: string;
    allowedYears: string[];
    qrCount: 1 | 2;
    mainLineQrUrl: string;
    eventDate: string;
    eventStartTime: string;
    eventEndTime: string;
    recruitStartDate: string;
    recruitStartTime: string;
    recruitEndDate: string;
    recruitEndTime: string;
    roles: RoleFormItem[];
  }>({
    title: '',
    description: '',
    imageUrl: '',
    allowedYears: ['1', '2', '3', '4'],
    qrCount: 1,
    mainLineQrUrl: '',
    eventDate: todayStr,
    eventStartTime: '08:00',
    eventEndTime: '17:00',
    recruitStartDate: todayStr,
    recruitStartTime: '08:00',
    recruitEndDate: todayStr,
    recruitEndTime: '23:59',
    roles: [{ roleName: '', totalQuota: 10, description: '', lineQrUrl: '' }]
  });

  const [profileForm, setProfileForm] = useState({
    nickname: '',
    hasShopShirt: true,
    major: ENGINEERING_MAJORS[5],
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

  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const refreshEventsAndApps = async () => {
    try {
      const [evRes, appRes, archiveRes] = await Promise.all([
        axios.get(`${API_URL}/events`),
        axios.get(`${API_URL}/events/applications`),
        axios.get(`${API_URL}/events/archive`)
      ]);

      if (Array.isArray(evRes.data)) setEventsList(evRes.data);
      if (Array.isArray(appRes.data)) {
        setApplicationsList(appRes.data);

        // เด้งหน้าต่างให้สต๊าฟกรอกฟีดแบคของกิจกรรมนั้นทันทีที่สแกน Check-out ออกงาน
        const myJustCheckedOut = (appRes.data as StaffApplication[]).find(
          a => a.studentId === studentId && a.attendanceStatus === 'checked_out' && !a.feedbackSubmitted
        );
        if (myJustCheckedOut) {
          setFeedbackFormModal(prev => prev ? prev : {
            show: true,
            app: myJustCheckedOut,
            rating: 5,
            comment: '',
            suggestionsForNextGen: ''
          });
        }
      }
      if (archiveRes.data) {
        if (Array.isArray(archiveRes.data.feedbacks)) setFeedbacksList(archiveRes.data.feedbacks);
        if (Array.isArray(archiveRes.data.archives)) setArchivesList(archiveRes.data.archives);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    let isMounted = true;
    const loadUserProfile = async () => {
      try {
        const profRes = await axios.get(`${API_URL}/profile/${studentId}`);
        if (isMounted && profRes.data?.hasProfile && profRes.data?.profile) {
          const p: UserProfile = profRes.data.profile;
          setHasProfile(true);
          const matchedMajor = ENGINEERING_MAJORS.find(m => m.includes(`(${p.major})`) || m === p.major) || p.major || ENGINEERING_MAJORS[5];
          setProfileForm({
            nickname: p.nickname || '',
            hasShopShirt: Boolean(p.hasShopShirt),
            major: matchedMajor,
            height: Number(p.height) || 170,
            medicalCondition: p.medicalCondition || '',
            drugAllergies: p.drugAllergies || '',
            foodAllergies: p.foodAllergies || '',
            contactChannel: p.contactChannel || '',
            phoneNumber: p.phoneNumber || ''
          });
        }
      } catch { /* ignore */ }
    };
    loadUserProfile();
    return () => {
      isMounted = false;
    };
  }, [studentId]);

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
  }, [studentId]);

  useEffect(() => {
    if (!isStaffCameraOpen || !isAdmin || subTab !== 'scanner') return;

    let html5QrCode: Html5Qrcode | null = null;
    let isScanning = true;

    const startCamera = async () => {
      try {
        html5QrCode = new Html5Qrcode('staff-qr-reader');
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          async (decodedText) => {
            if (!isScanning) return;
            isScanning = false;

            if (html5QrCode && html5QrCode.isScanning) {
              await html5QrCode.stop().catch(() => {});
            }
            setIsStaffCameraOpen(false);
            setManualStaffQrInput(decodedText);

            try {
              const res = await axios.post(`${API_URL}/events/attendance/scan`, { qrData: decodedText });
              await refreshEventsAndApps();
              setFeedbackModal({ show: true, type: 'success', message: res.data.message });
            } catch (error: unknown) {
              let errMsg = 'รูปแบบ QR ไม่ถูกต้อง หรือไม่พบข้อมูลสต๊าฟ';
              if (axios.isAxiosError(error) && error.response?.data?.error) errMsg = error.response.data.error;
              setFeedbackModal({ show: true, type: 'error', message: errMsg });
            }
          },
          () => {}
        );
      } catch {
        setIsStaffCameraOpen(false);
        setFeedbackModal({ show: true, type: 'error', message: 'ไม่สามารถเปิดกล้องได้ กรุณากดอนุญาตการใช้กล้องบนเบราว์เซอร์' });
      }
    };

    startCamera();

    return () => {
      isScanning = false;
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [isStaffCameraOpen, isAdmin, subTab]);

  const handleManualStaffScan = async (qrPayload: string) => {
    if (!qrPayload.trim()) return;
    try {
      const res = await axios.post(`${API_URL}/events/attendance/scan`, { qrData: qrPayload.trim() });
      await refreshEventsAndApps();
      setFeedbackModal({ show: true, type: 'success', message: res.data.message });
    } catch (error: unknown) {
      let errMsg = 'ไม่สามารถสแกนเช็คชื่อได้';
      if (axios.isAxiosError(error) && error.response?.data?.error) errMsg = error.response.data.error;
      setFeedbackModal({ show: true, type: 'error', message: errMsg });
    }
  };

  // ส่งฟอร์มประเมินกิจกรรมหลังเช็คเอาท์ออกงาน (ผูกเข้ากับแฟ้มของกิจกรรมนั้นโดยตรง)
  const handleSubmitStaffFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackFormModal) return;
    try {
      await axios.post(`${API_URL}/events/feedback`, {
        applicationId: feedbackFormModal.app.id,
        eventId: feedbackFormModal.app.eventId,
        eventTitle: feedbackFormModal.app.eventTitle || `กิจกรรม #${feedbackFormModal.app.eventId}`,
        roleName: feedbackFormModal.app.roleName || '-',
        fullName: currentUser.fullName,
        rating: feedbackFormModal.rating,
        comment: feedbackFormModal.comment,
        suggestionsForNextGen: feedbackFormModal.suggestionsForNextGen
      });
      setFeedbackFormModal(null);
      await refreshEventsAndApps();
      setFeedbackModal({
        show: true,
        type: 'success',
        message: `ขอบคุณสำหรับการปฏิบัติหน้าที่! ระบบได้จัดเก็บฟีดแบคเข้าสู่แฟ้มคลังข้อมูลกิจกรรม "${feedbackFormModal.app.eventTitle}" เรียบร้อยแล้วครับ`
      });
    } catch {
      setFeedbackModal({ show: true, type: 'error', message: 'ไม่สามารถบันทึกแบบประเมินได้' });
    }
  };

  // บันทึกเอกสารเข้าสู่หมวดรวมเอกสารของกิจกรรมที่เลือก
  const handleSaveArchiveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArchiveEvent) return;
    try {
      await axios.post(`${API_URL}/events/archive`, {
        eventId: selectedArchiveEvent.id,
        eventTitle: selectedArchiveEvent.title,
        docTitle: newArchiveForm.docTitle,
        summaryNote: newArchiveForm.summaryNote,
        fileLinkOrData: newArchiveForm.fileLinkOrData
      });
      setNewArchiveForm({ docTitle: '', summaryNote: '', fileLinkOrData: '' });
      await refreshEventsAndApps();
      setFeedbackModal({ show: true, type: 'success', message: `บันทึกเอกสารเข้าสู่คลังข้อมูลกิจกรรม "${selectedArchiveEvent.title}" เรียบร้อยแล้ว!` });
    } catch {
      setFeedbackModal({ show: true, type: 'error', message: 'ไม่สามารถบันทึกข้อมูลเข้าคลังได้' });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = profileForm.phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setFeedbackModal({ show: true, type: 'error', message: 'กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก' });
      return;
    }

    const codeMatch = profileForm.major.match(/\(([A-Z]+)\)$/);
    const majorShortCode = codeMatch ? codeMatch[1] : profileForm.major.substring(0, 20);

    try {
      await axios.post(`${API_URL}/profile`, {
        ...profileForm,
        major: majorShortCode,
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
    if (checkIsRecruitmentExpired(ev)) {
      setFeedbackModal({ show: true, type: 'error', message: 'ขออภัย กิจกรรมนี้หมดเวลาเปิดรับสมัครสต๊าฟแล้วครับ' });
      return;
    }

    if (checkIsRecruitmentNotStartedYet(ev)) {
      setFeedbackModal({ show: true, type: 'error', message: 'กิจกรรมนี้ยังไม่ถึงเวลาเปิดรับสมัครสต๊าฟครับ' });
      return;
    }

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

    const allowed = ev.allowedYears || ['1', '2', '3', '4'];
    if (!allowed.includes(currentStudentYear)) {
      setFeedbackModal({
        show: true,
        type: 'error',
        message: `กิจกรรมนี้เปิดรับเฉพาะนักศึกษาชั้นปีที่ ${allowed.join(', ')} (รหัสของคุณคือชั้นปีที่ ${currentStudentYear})`
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

  const handleCancelStaff = (appId: number, eventTitle?: string) => {
    setConfirmModal({
      show: true,
      title: 'ยืนยันการยกเลิกการเป็นสต๊าฟ',
      message: `คุณต้องการยกเลิกการเป็นสต๊าฟในกิจกรรม "${eventTitle || ''}" และคืนโควต้าให้ระบบใช่หรือไม่?`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, show: false }));
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
      }
    });
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
      eventDate: todayStr,
      eventStartTime: '08:00',
      eventEndTime: '17:00',
      recruitStartDate: todayStr,
      recruitStartTime: '08:00',
      recruitEndDate: todayStr,
      recruitEndTime: '23:59',
      roles: [{ roleName: '', totalQuota: 10, description: '', lineQrUrl: '' }]
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
      eventDate: ev.eventDate || todayStr,
      eventStartTime: ev.eventStartTime || '08:00',
      eventEndTime: ev.eventEndTime || '17:00',
      recruitStartDate: ev.recruitStartDate || todayStr,
      recruitStartTime: ev.recruitStartTime || '08:00',
      recruitEndDate: ev.recruitEndDate || todayStr,
      recruitEndTime: ev.recruitEndTime || '23:59',
      roles: ev.roles && ev.roles.length > 0
        ? ev.roles.map(r => ({
            id: r.id,
            roleName: r.roleName,
            totalQuota: r.totalQuota,
            description: r.description || '',
            lineQrUrl: r.lineQrUrl || ''
          }))
        : [{ roleName: '', totalQuota: 10, description: '', lineQrUrl: '' }]
    });
    setIsEventModalOpen(true);
  };

  const handleDeleteEvent = (ev: StaffEvent) => {
    setConfirmModal({
      show: true,
      title: 'ยืนยันการลบกิจกรรม',
      message: `คุณต้องการลบกิจกรรม "${ev.title}" และข้อมูลผู้สมัครในกิจกรรมนี้ทั้งหมดใช่หรือไม่?`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, show: false }));
        try {
          await axios.delete(`${API_URL}/events/${ev.id}`);
          await refreshEventsAndApps();
          if (dashboardEvent?.id === ev.id) setDashboardEvent(null);
          setFeedbackModal({ show: true, type: 'success', message: `ลบกิจกรรม "${ev.title}" เรียบร้อยแล้ว` });
        } catch {
          setFeedbackModal({ show: true, type: 'error', message: 'ลบกิจกรรมไม่สำเร็จ' });
        }
      }
    });
  };

  const handleSaveEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (eventForm.allowedYears.length === 0) {
      setFeedbackModal({ show: true, type: 'error', message: 'กรุณาเลือกชั้นปีที่มีสิทธิ์สมัครอย่างน้อย 1 ชั้นปี' });
      return;
    }

    const recStart = new Date(`${eventForm.recruitStartDate}T${eventForm.recruitStartTime}:00`);
    const recEnd = new Date(`${eventForm.recruitEndDate}T${eventForm.recruitEndTime}:00`);
    if (recEnd <= recStart) {
      setFeedbackModal({ show: true, type: 'error', message: 'วัน-เวลาปิดรับสมัครสต๊าฟ ต้องอยู่หลังจากวัน-เวลาเริ่มเปิดรับสมัครครับ!' });
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
        <div className="modal-overlay" style={{ zIndex: 1200, backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-content" style={{ maxWidth: '420px', width: '92%', textAlign: 'center', padding: '32px 24px' }}>
            {feedbackModal.type === 'success' ? (
              <CheckCircle size={56} color="#16a34a" style={{ margin: '0 auto 16px' }} />
            ) : (
              <XCircle size={56} color="#dc2626" style={{ margin: '0 auto 16px' }} />
            )}
            <h3 style={{ fontSize: '20px', marginBottom: '8px', color: feedbackModal.type === 'success' ? '#166534' : '#991b1b' }}>
              {feedbackModal.type === 'success' ? 'ดำเนินการสำเร็จ' : 'แจ้งเตือน'}
            </h3>
            <p style={{ color: '#4b5563', marginBottom: '24px', fontSize: '15px' }}>{feedbackModal.message}</p>
            <button className="btn-primary" style={{ width: '100%' }} onClick={() => setFeedbackModal({ ...feedbackModal, show: false })}>
              ตกลง
            </button>
          </div>
        </div>
      )}

      {confirmModal.show && (
        <div className="modal-overlay" style={{ zIndex: 1200, backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-content" style={{ maxWidth: '420px', width: '92%', textAlign: 'center', padding: '32px 24px' }}>
            <AlertTriangle size={56} color="#d97706" style={{ margin: '0 auto 14px' }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#111827' }}>{confirmModal.title}</h3>
            <p style={{ color: '#4b5563', marginBottom: '24px', fontSize: '15px', lineHeight: 1.5 }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-secondary" style={{ flex: 1, padding: '12px' }} onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}>
                ยกเลิก
              </button>
              <button className="btn-primary" style={{ flex: 1, padding: '12px', backgroundColor: '#dc2626', borderColor: '#dc2626' }} onClick={confirmModal.onConfirm}>
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal บัตร QR Code ประจำตัวสต๊าฟ */}
      {personalQrModal && personalQrModal.show && (
        <div className="modal-overlay" style={{ zIndex: 1150, backgroundColor: 'rgba(0,0,0,0.65)' }}>
          <div className="modal-content" style={{ maxWidth: '420px', width: '92%', textAlign: 'center', padding: '28px 24px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-close" onClick={() => setPersonalQrModal(null)}><X size={20} /></button>
            </div>
            <h3 style={{ margin: '0 0 6px 0', color: '#8b0000', fontSize: '20px' }}>บัตร QR Code ประจำตัวสต๊าฟ</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#4b5563' }}>
              โปรดแสดง QR Code นี้ให้ผู้ดูแลระบบ (Admin) สแกนเพื่อเข้างานและออกงาน
            </p>

            <div style={{ backgroundColor: 'white', padding: '18px', borderRadius: '14px', border: '2px solid #8b0000', display: 'inline-block', marginBottom: '16px' }}>
              <QRCodeCanvas value={personalQrModal.qrString} size={190} level="H" />
            </div>

            <div style={{ fontSize: '14px', color: '#111827', marginBottom: '16px', backgroundColor: '#f9fafb', padding: '12px', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
              <div><strong>ชื่อ-สกุล:</strong> {currentUser.fullName} ({studentId})</div>
              <div><strong>กิจกรรม:</strong> {personalQrModal.app.eventTitle}</div>
              <div><strong>ฝ่าย:</strong> ฝ่าย{personalQrModal.app.roleName}</div>
              <div style={{ marginTop: '6px', fontWeight: 'bold', color: personalQrModal.app.attendanceStatus === 'checked_in' ? '#16a34a' : personalQrModal.app.attendanceStatus === 'checked_out' ? '#1d4ed8' : '#d97706' }}>
                สถานะ: {personalQrModal.app.attendanceStatus === 'checked_in'
                  ? '🟢 เช็คอินเข้างานแล้ว'
                  : personalQrModal.app.attendanceStatus === 'checked_out'
                  ? '🔵 เช็คเอาท์ออกงานแล้ว'
                  : '⏳ รอแอดมินสแกนเข้างาน'}
              </div>
            </div>

            <button className="btn-secondary" style={{ width: '100%', padding: '10px' }} onClick={() => setPersonalQrModal(null)}>
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* Modal แบบฟอร์มประเมินกิจกรรมหลังสแกน Check-out ออกงาน */}
      {feedbackFormModal && feedbackFormModal.show && (
        <div className="modal-overlay" style={{ zIndex: 1250, backgroundColor: 'rgba(0,0,0,0.75)' }}>
          <div className="modal-content" style={{ maxWidth: '520px', width: '94%', padding: '28px', borderRadius: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <Sparkles size={44} color="#d97706" style={{ margin: '0 auto 8px' }} />
              <h3 style={{ margin: 0, fontSize: '21px', color: '#8b0000' }}>
                ประเมินกิจกรรม: {feedbackFormModal.app.eventTitle}
              </h3>
              <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#4b5563' }}>
                คุณได้เช็คเอาท์ออกงานแล้ว ฟีดแบคนี้จะถูกจัดเก็บเข้าสู่แฟ้มคลังข้อมูลของกิจกรรม <strong>{feedbackFormModal.app.eventTitle}</strong> เพื่อส่งต่อให้รุ่นถัดไปครับ
              </p>
            </div>

            <form onSubmit={handleSubmitStaffFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ textAlign: 'center', backgroundColor: '#fffbeb', padding: '12px', borderRadius: '10px', border: '1px solid #fde68a' }}>
                <label style={{ fontWeight: 'bold', fontSize: '14px', display: 'block', marginBottom: '8px', color: '#92400e' }}>
                  ระดับความพึงพอใจในการจัดกิจกรรมครั้งนี้ *
                </label>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map(num => (
                    <button
                      type="button"
                      key={num}
                      onClick={() => setFeedbackFormModal({ ...feedbackFormModal, rating: num })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                    >
                      <Star
                        size={30}
                        color={num <= feedbackFormModal.rating ? '#f59e0b' : '#d1d5db'}
                        fill={num <= feedbackFormModal.rating ? '#f59e0b' : 'none'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-field">
                <label>ปัญหาหรืออุปสรรคที่พบในการทำงานของฝ่าย{feedbackFormModal.app.roleName} *</label>
                <textarea
                  required
                  rows={3}
                  className="form-input"
                  placeholder="ระบุปัญหาที่พบหน้างาน..."
                  value={feedbackFormModal.comment}
                  onChange={e => setFeedbackFormModal({ ...feedbackFormModal, comment: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label>ข้อเสนอแนะถึงรุ่นถัดไปสำหรับการจัดงาน "{feedbackFormModal.app.eventTitle}" ในปีหน้า *</label>
                <textarea
                  required
                  rows={3}
                  className="form-input"
                  placeholder="ระบุสิ่งที่ควรปรับปรุงหรือเตรียมการล่วงหน้าสำหรับปีถัดไป..."
                  value={feedbackFormModal.suggestionsForNextGen}
                  onChange={e => setFeedbackFormModal({ ...feedbackFormModal, suggestionsForNextGen: e.target.value })}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: 'bold' }}>
                บันทึกฟีดแบคเข้าแฟ้มกิจกรรม
              </button>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Users size={24} color="#8b0000" /> {lang === 'th' ? 'ระบบรับสมัครสต๊าฟ & เช็คชื่อเข้า-ออกงาน' : 'Staff Recruitment & QR Attendance'}
          </h2>
          <div style={{ fontSize: '13px', color: '#166534', fontWeight: '600', marginTop: '4px' }}>
            ✓ ยืนยันตัวตน: นักศึกษาคณะวิศวกรรมศาสตร์ (รหัส {studentId} • ชั้นปีที่ {currentStudentYear})
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setIsStaffCameraOpen(false); setSubTab('events'); setDashboardEvent(null); setSelectedArchiveEvent(null); }}
            style={{
              padding: '9px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px',
              border: subTab === 'events' ? 'none' : '1px solid #d1d5db',
              backgroundColor: subTab === 'events' ? '#8b0000' : 'white',
              color: subTab === 'events' ? 'white' : '#374151',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <Sparkles size={15} /> กิจกรรมที่เปิดรับ
          </button>

          {!isAdmin && (
            <button
              onClick={() => setSubTab('profile')}
              style={{
                padding: '9px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px',
                border: subTab === 'profile' ? 'none' : '1px solid #d1d5db',
                backgroundColor: subTab === 'profile' ? '#8b0000' : hasProfile ? 'white' : '#fef3c7',
                color: subTab === 'profile' ? 'white' : hasProfile ? '#374151' : '#b45309',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <Edit size={15} /> {hasProfile ? 'แก้ไขโปรไฟล์สต๊าฟ' : '⚠️ กรอกโปรไฟล์ก่อนสมัคร'}
            </button>
          )}

          {isAdmin && (
            <>
              <button
                onClick={() => {
                  setIsStaffCameraOpen(false);
                  setSubTab('dashboard');
                  if (!dashboardEvent && eventsList.length > 0) setDashboardEvent(eventsList[0]);
                }}
                style={{
                  padding: '9px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px',
                  border: subTab === 'dashboard' ? 'none' : '1px solid #d1d5db',
                  backgroundColor: subTab === 'dashboard' ? '#8b0000' : 'white',
                  color: subTab === 'dashboard' ? 'white' : '#374151',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <BarChart3 size={15} /> แดชบอร์ดผู้สมัคร
              </button>
              <button
                onClick={() => setSubTab('scanner')}
                style={{
                  padding: '9px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px',
                  border: subTab === 'scanner' ? 'none' : '1px solid #d1d5db',
                  backgroundColor: subTab === 'scanner' ? '#8b0000' : 'white',
                  color: subTab === 'scanner' ? 'white' : '#374151',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <ScanLine size={15} /> สแกน QR เข้า-ออกงาน
              </button>
              <button
                onClick={() => { setIsStaffCameraOpen(false); setSelectedArchiveEvent(null); setSubTab('archive'); }}
                style={{
                  padding: '9px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px',
                  border: subTab === 'archive' ? 'none' : '1px solid #d1d5db',
                  backgroundColor: subTab === 'archive' ? '#8b0000' : 'white',
                  color: subTab === 'archive' ? 'white' : '#374151',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <FolderArchive size={15} /> คลังข้อมูลรายกิจกรรม
              </button>
              <button
                className="btn-primary"
                onClick={handleOpenCreateEvent}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '9px 14px' }}
              >
                <Plus size={16} /> ตั้งกิจกรรมใหม่
              </button>
            </>
          )}
        </div>
      </div>

      {!isAdmin && !hasProfile && subTab !== 'profile' && (
        <div style={{ backgroundColor: '#fffbeb', borderLeft: '4px solid #d97706', padding: '16px 20px', borderRadius: '8px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#92400e', fontSize: '14px' }}>
            <AlertCircle size={22} color="#d97706" />
            <span><strong>แจ้งเตือน:</strong> กรุณากรอกข้อมูลส่วนตัวสำหรับสต๊าฟ (ชื่อเล่น, ภาควิชา, เสื้อช็อป, อาหารที่แพ้) ครั้งเดียวก่อนกดสมัครกิจกรรมครับ</span>
          </div>
          <button className="btn-primary" style={{ backgroundColor: '#d97706', borderColor: '#d97706', fontSize: '13px', padding: '8px 16px' }} onClick={() => setSubTab('profile')}>
            ไปหน้ากรอกโปรไฟล์ →
          </button>
        </div>
      )}

      {/* =====================================================================
          🌟 ข้อ 3: หน้ารายการกิจกรรมทั้งหมด (เปลี่ยนการ์ดเป็นสีขาว-ดำอัตโนมัติเมื่อหมดเขตรับสมัคร)
         ===================================================================== */}
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
              const isExpired = checkIsRecruitmentExpired(ev);

              return (
                <div
                  key={ev.id}
                  style={{
                    backgroundColor: isExpired ? '#f3f4f6' : 'white',
                    borderRadius: '16px',
                    border: '1px solid #e5e7eb',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.04)',
                    // 🌟 เปลี่ยนการ์ดเป็นสีโทนขาว-ดำเมื่อหมดเขตช่วงเวลารับสมัครสต๊าฟ
                    filter: isExpired ? 'grayscale(100%)' : 'none',
                    opacity: isExpired ? 0.82 : 1,
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{ backgroundColor: STAFF_IMAGE_SIZES.eventCardCover.backgroundColor, position: 'relative' }}>
                    <img
                      src={ev.imageUrl || DEFAULT_EVENT_IMG}
                      alt={ev.title}
                      style={{
                        width: STAFF_IMAGE_SIZES.eventCardCover.width,
                        aspectRatio: STAFF_IMAGE_SIZES.eventCardCover.aspectRatio,
                        height: STAFF_IMAGE_SIZES.eventCardCover.height,
                        objectFit: STAFF_IMAGE_SIZES.eventCardCover.objectFit,
                        display: 'block'
                      }}
                    />
                    <span style={{
                      position: 'absolute', top: '12px', right: '12px',
                      padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 'bold',
                      backgroundColor: isExpired ? '#374151' : '#dcfce7',
                      color: isExpired ? '#ffffff' : '#166534',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                    }}>
                      {isExpired ? '⚫ หมดเขตรับสมัครแล้ว' : '🟢 เปิดรับสมัคร'}
                    </span>
                  </div>

                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#111827' }}>{ev.title}</h3>

                    {/* แสดงวัน-เวลาจัดกิจกรรม และช่วงเวลาเปิดรับสมัครสต๊าฟ */}
                    <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '10px 12px', fontSize: '12px', color: '#374151', marginBottom: '12px', lineHeight: 1.6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', color: '#111827' }}>
                        <Calendar size={14} color="#8b0000" />
                        วันจัดกิจกรรม: {formatShortThaiDate(ev.eventDate)} ({ev.eventStartTime || '08:00'} - {ev.eventEndTime || '17:00'} น.)
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isExpired ? '#dc2626' : '#4b5563' }}>
                        <Clock size={14} color="#8b0000" />
                        รับสมัครสต๊าฟ: {formatShortThaiDate(ev.recruitStartDate)} ({ev.recruitStartTime || '08:00'} น.) ถึง {formatShortThaiDate(ev.recruitEndDate)} ({ev.recruitEndTime || '23:59'} น.)
                      </div>
                    </div>

                    <div style={{ fontSize: '13px', color: '#8b0000', fontWeight: 'bold', marginBottom: '8px' }}>
                      🎓 รับชั้นปีที่: {(ev.allowedYears || ['1', '2', '3', '4']).join(', ')} | 👥 สมัครแล้ว {totalApplied}/{totalNeeded} คน
                    </div>
                    <p style={{ color: '#4b5563', fontSize: '14px', margin: '0 0 16px 0', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {ev.description || 'ร่วมเป็นส่วนหนึ่งในการจัดกิจกรรมของสโมสรนักศึกษาคณะวิศวกรรมศาสตร์'}
                    </p>

                    {!isAdmin && myAppInThisEvent && (
                      <div style={{ backgroundColor: '#dcfce7', border: '1px solid #86efac', padding: '12px', borderRadius: '10px', marginBottom: '14px' }}>
                        <div style={{ color: '#166534', fontWeight: 'bold', fontSize: '14px' }}>
                          ✓ คุณเป็นสต๊าฟฝ่าย: {myRoleObj?.roleName || myAppInThisEvent.roleName}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => myRoleObj && setConfirmationModal({ show: true, event: ev, role: myRoleObj })}
                            style={{ flex: 1, backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '7px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                          >
                            <QrCode size={14} /> QR กลุ่มไลน์
                          </button>
                          <button
                            onClick={() =>
                              setPersonalQrModal({
                                show: true,
                                app: { ...myAppInThisEvent, eventTitle: ev.title, roleName: myRoleObj?.roleName },
                                qrString: `STAFF|${myAppInThisEvent.id}|${ev.id}|${studentId}`
                              })
                            }
                            style={{ flex: 1, backgroundColor: '#1d4ed8', color: 'white', border: 'none', padding: '7px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                          >
                            <ScanLine size={14} /> บัตร QR เช็คชื่อ
                          </button>
                          {!isExpired && (
                            <button
                              onClick={() => handleCancelStaff(myAppInThisEvent.id, ev.title)}
                              style={{ width: '100%', backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginTop: '4px' }}
                            >
                              ยกเลิกการเป็นสต๊าฟ
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button
                        className="btn-primary"
                        onClick={() => setDetailEvent(ev)}
                        style={{
                          width: '100%', padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontWeight: 'bold',
                          backgroundColor: isExpired ? '#4b5563' : '#8b0000',
                          borderColor: isExpired ? '#4b5563' : '#8b0000'
                        }}
                      >
                        <Eye size={18} /> {isExpired ? 'ดูรายละเอียด (ปิดรับสมัครแล้ว)' : `ดูรายละเอียดทั้งหมด & เลือกฝ่าย (${ev.roles?.length || 0} ฝ่าย)`}
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

      {/* =====================================================================
          🌟 ข้อ 4: คลังข้อมูลส่งต่อรุ่นถัดไป (แยกตามแฟ้มกิจกรรม -> แบ่งหมวดเอกสาร & ฟีดแบคสต๊าฟ)
         ===================================================================== */}
      {isAdmin && subTab === 'archive' && (
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          {!selectedArchiveEvent ? (
            /* หน้าแรกของคลังข้อมูล: แสดงเป็นแฟ้มแยกตามแต่ละกิจกรรมอย่างชัดเจน */
            <div style={{ backgroundColor: 'white', padding: '28px', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
              <div style={{ marginBottom: '20px', borderBottom: '2px solid #f3f4f6', paddingBottom: '16px' }}>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '22px', color: '#8b0000', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FolderArchive size={26} /> คลังข้อมูลกิจกรรมสโมสรฯ (แยกตามหมวดหมู่กิจกรรม)
                </h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#4b5563' }}>
                  เลือกคลิกที่แฟ้มกิจกรรมเพื่อดูหรือเพิ่ม <strong>1) เอกสารสรุปงาน</strong> และ <strong>2) ฟีดแบคของสต๊าฟที่เช็คเอาท์จากกิจกรรมนั้นๆ</strong>
                </p>
              </div>

              {eventsList.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>ยังไม่มีกิจกรรมในระบบ</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                  {eventsList.map(ev => {
                    const evDocsCount = archivesList.filter(a => Number(a.eventId) === ev.id).length;
                    const evFeedbacks = feedbacksList.filter(f => Number(f.eventId) === ev.id);
                    const avgRating = evFeedbacks.length > 0
                      ? (evFeedbacks.reduce((s, f) => s + f.rating, 0) / evFeedbacks.length).toFixed(1)
                      : '-';

                    return (
                      <div
                        key={ev.id}
                        onClick={() => {
                          setSelectedArchiveEvent(ev);
                          setArchiveCategoryTab('feedbacks');
                        }}
                        style={{
                          border: '1px solid #d1d5db',
                          borderRadius: '14px',
                          padding: '22px',
                          backgroundColor: '#fafafa',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                            <FolderArchive size={28} color="#8b0000" />
                            <div>
                              <h4 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>{ev.title}</h4>
                              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                วันจัดกิจกรรม: {formatShortThaiDate(ev.eventDate)}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '16px 0' }}>
                            <div style={{ backgroundColor: 'white', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>📁 เอกสารสรุปงาน</div>
                              <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e40af' }}>{evDocsCount} ไฟล์</div>
                            </div>
                            <div style={{ backgroundColor: 'white', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>⭐ ฟีดแบคสต๊าฟ</div>
                              <div style={{ fontSize: '18px', fontWeight: '800', color: '#d97706' }}>{evFeedbacks.length} คน ({avgRating}★)</div>
                            </div>
                          </div>
                        </div>

                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#8b0000', textAlign: 'right' }}>
                          เปิดดูแฟ้มข้อมูลกิจกรรมนี้ →
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* เมื่อกดเข้ามาในแฟ้มกิจกรรม: แบ่งเป็น 2 หมวดหมู่ชัดเจน (1. ฟีดแบคของสต๊าฟ / 2. รวมเอกสารสรุปงาน) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ backgroundColor: 'white', padding: '22px 28px', borderRadius: '16px', border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                  <button
                    onClick={() => setSelectedArchiveEvent(null)}
                    style={{ backgroundColor: '#1f2937', color: 'white', border: 'none', padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '13px', marginBottom: '10px' }}
                  >
                    <ArrowLeft size={15} /> กลับไปหน้ารวมแฟ้มทุกกิจกรรม
                  </button>
                  <h3 style={{ margin: 0, fontSize: '22px', color: '#8b0000' }}>
                    📂 แฟ้มคลังข้อมูล: {selectedArchiveEvent.title}
                  </h3>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>
                    วันจัดกิจกรรม: {formatShortThaiDate(selectedArchiveEvent.eventDate)} ({selectedArchiveEvent.eventStartTime || '08:00'} - {selectedArchiveEvent.eventEndTime || '17:00'} น.)
                  </span>
                </div>

                {/* ปุ่มสลับหมวดหมู่ภายในกิจกรรม */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setArchiveCategoryTab('feedbacks')}
                    style={{
                      padding: '10px 18px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px',
                      border: archiveCategoryTab === 'feedbacks' ? 'none' : '1px solid #d1d5db',
                      backgroundColor: archiveCategoryTab === 'feedbacks' ? '#d97706' : 'white',
                      color: archiveCategoryTab === 'feedbacks' ? 'white' : '#374151',
                      display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    <Star size={17} /> หมวดฟีดแบคของสต๊าฟ ({feedbacksList.filter(f => Number(f.eventId) === selectedArchiveEvent.id).length})
                  </button>
                  <button
                    onClick={() => setArchiveCategoryTab('documents')}
                    style={{
                      padding: '10px 18px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px',
                      border: archiveCategoryTab === 'documents' ? 'none' : '1px solid #d1d5db',
                      backgroundColor: archiveCategoryTab === 'documents' ? '#1e40af' : 'white',
                      color: archiveCategoryTab === 'documents' ? 'white' : '#374151',
                      display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    <FileText size={17} /> หมวดรวมเอกสารสรุปงาน ({archivesList.filter(a => Number(a.eventId) === selectedArchiveEvent.id).length})
                  </button>
                </div>
              </div>

              {/* หมวดที่ 1: รวบรวมฟีดแบคของสต๊าฟในกิจกรรมนี้ */}
              {archiveCategoryTab === 'feedbacks' && (
                <div style={{ backgroundColor: 'white', padding: '28px', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
                  <h4 style={{ margin: '0 0 18px 0', fontSize: '18px', color: '#111827' }}>
                    ⭐ รายการฟีดแบคและข้อเสนอแนะจากสต๊าฟหลังเช็คเอาท์ ({selectedArchiveEvent.title})
                  </h4>

                  {(() => {
                    const evFeedbacks = feedbacksList.filter(f => Number(f.eventId) === selectedArchiveEvent.id);
                    if (evFeedbacks.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#6b7280', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px dashed #d1d5db' }}>
                          ยังไม่มีฟีดแบคจากสต๊าฟในกิจกรรมนี้ (ฟีดแบคจะถูกส่งเข้ามาอัตโนมัติเมื่อสต๊าฟสแกน QR Check-out ออกงาน)
                        </div>
                      );
                    }
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                        {evFeedbacks.map(fb => (
                          <div key={fb.id} style={{ border: '1px solid #fde68a', borderRadius: '12px', padding: '18px', backgroundColor: '#fffbeb' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ backgroundColor: '#8b0000', color: 'white', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 'bold' }}>
                                ฝ่าย{fb.roleName}
                              </span>
                              <span style={{ color: '#d97706', fontWeight: 'bold', fontSize: '15px' }}>
                                {'★'.repeat(fb.rating)} ({fb.rating}/5)
                              </span>
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#111827', marginBottom: '10px' }}>
                              ผู้ประเมิน: {fb.fullName} ({fb.studentId})
                            </div>
                            <div style={{ fontSize: '13px', color: '#374151', marginBottom: '8px', backgroundColor: 'white', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                              <strong>ปัญหาที่พบหน้างาน:</strong><br />{fb.comment}
                            </div>
                            <div style={{ fontSize: '13px', color: '#166534', backgroundColor: '#dcfce7', padding: '10px', borderRadius: '8px', border: '1px solid #86efac' }}>
                              <strong>ข้อเสนอแนะถึงรุ่นถัดไป:</strong><br />{fb.suggestionsForNextGen}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* หมวดที่ 2: รวมเอกสารและสรุปงานของกิจกรรมนี้ */}
              {archiveCategoryTab === 'documents' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
                    <h4 style={{ margin: '0 0 14px 0', fontSize: '17px', color: '#1e40af' }}>
                      ➕ เพิ่มเอกสารหรือบันทึกสรุปงานเข้าแฟ้ม "{selectedArchiveEvent.title}"
                    </h4>
                    <form onSubmit={handleSaveArchiveDoc} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div className="form-field">
                        <label>ชื่อเอกสาร / หัวข้อสรุปงาน *</label>
                        <input
                          required
                          type="text"
                          className="form-input"
                          placeholder="เช่น สรุปงบประมาณ, กำหนดการจริง, หรือรายชื่อผู้ประสานงาน..."
                          value={newArchiveForm.docTitle}
                          onChange={e => setNewArchiveForm({ ...newArchiveForm, docTitle: e.target.value })}
                        />
                      </div>
                      <div className="form-field">
                        <label>รายละเอียดบันทึกส่งต่อรุ่นถัดไป *</label>
                        <textarea
                          required
                          rows={3}
                          className="form-input"
                          placeholder="บันทึกรายละเอียดสำคัญของกิจกรรมนี้..."
                          value={newArchiveForm.summaryNote}
                          onChange={e => setNewArchiveForm({ ...newArchiveForm, summaryNote: e.target.value })}
                        />
                      </div>
                      <div className="form-field">
                        <label>ลิงก์ไฟล์เอกสาร Google Drive / โฟลเดอร์งาน (ถ้ามี)</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="https://drive.google.com/..."
                          value={newArchiveForm.fileLinkOrData}
                          onChange={e => setNewArchiveForm({ ...newArchiveForm, fileLinkOrData: e.target.value })}
                        />
                      </div>
                      <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-end', backgroundColor: '#1e40af', borderColor: '#1e40af', padding: '10px 24px', fontWeight: 'bold' }}>
                        บันทึกเอกสารเข้าแฟ้มกิจกรรมนี้
                      </button>
                    </form>
                  </div>

                  <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '17px', color: '#111827' }}>
                      📁 เอกสารที่บันทึกไว้ในกิจกรรม "{selectedArchiveEvent.title}"
                    </h4>
                    {(() => {
                      const evDocs = archivesList.filter(a => Number(a.eventId) === selectedArchiveEvent.id);
                      if (evDocs.length === 0) {
                        return <p style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>ยังไม่มีเอกสารในแฟ้มกิจกรรมนี้</p>;
                      }
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {evDocs.map(doc => (
                            <div key={doc.id} style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <strong style={{ fontSize: '16px', color: '#1e40af' }}>{doc.docTitle}</strong>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>บันทึกเมื่อ: {new Date(doc.createdAt).toLocaleDateString('th-TH')}</span>
                              </div>
                              <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#334155', whiteSpace: 'pre-line' }}>{doc.summaryNote}</p>
                              {doc.fileLinkOrData && (
                                <a href={doc.fileLinkOrData} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: '#2563eb', fontWeight: 'bold' }}>
                                  🔗 เปิดลิงก์เอกสารแนบ
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* แท็บสแกน QR เข้า-ออกงานของสต๊าฟ (สำหรับ Admin) */}
      {isAdmin && subTab === 'scanner' && (
        <div style={{ maxWidth: '720px', margin: '0 auto', backgroundColor: 'white', padding: '28px', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ marginTop: 0, color: '#8b0000', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ScanLine size={24} /> สแกนบัตร QR Code ประจำตัวสต๊าฟ (เข้างาน / ออกงาน)
          </h3>
          <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '20px' }}>
            • <strong>สแกนครั้งที่ 1:</strong> บันทึกเวลาเข้าปฏิบัติงาน (Check-in)<br />
            • <strong>สแกนครั้งที่ 2:</strong> บันทึกเวลาออกงาน (Check-out) และส่งแบบฟอร์มประเมินเข้าแฟ้มกิจกรรมนั้นโดยอัตโนมัติ
          </p>

          <div style={{ textAlign: 'center', backgroundColor: '#f9fafb', padding: '20px', borderRadius: '12px', border: '1px dashed #d1d5db', marginBottom: '20px' }}>
            <button
              type="button"
              onClick={() => setIsStaffCameraOpen(!isStaffCameraOpen)}
              className="btn-primary"
              style={{
                backgroundColor: isStaffCameraOpen ? '#dc2626' : '#16a34a',
                borderColor: 'transparent',
                padding: '12px 24px',
                fontSize: '15px',
                fontWeight: 'bold',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isStaffCameraOpen ? <CameraOff size={20} /> : <Camera size={20} />}
              {isStaffCameraOpen ? 'ปิดกล้องสแกน' : '📷 เปิดกล้องสแกนบัตร QR สต๊าฟ'}
            </button>

            {isStaffCameraOpen && (
              <div style={{ marginTop: '16px' }}>
                <div id="staff-qr-reader" style={{ maxWidth: '380px', margin: '0 auto', borderRadius: '12px', overflow: 'hidden', border: '3px solid #16a34a' }} />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="หรือวางรหัส QR เช่น STAFF|1|1|670610706..."
              value={manualStaffQrInput}
              onChange={e => setManualStaffQrInput(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="btn-primary" onClick={() => handleManualStaffScan(manualStaffQrInput)}>
              ยืนยันเช็คชื่อ
            </button>
          </div>

          <h4 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>รายชื่อสต๊าฟทั้งหมด (เฉพาะ Admin กดเช็คอิน/เช็คเอาท์)</h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'left' }}>รหัสนศ. / ชื่อ</th>
                  <th style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'left' }}>กิจกรรม / ฝ่าย</th>
                  <th style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>สถานะเข้า-ออกงาน</th>
                  <th style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {applicationsList.map(app => {
                  const qrStr = `STAFF|${app.id}|${app.eventId}|${app.studentId}`;
                  return (
                    <tr key={app.id}>
                      <td style={{ padding: '10px', border: '1px solid #e5e7eb' }}>
                        <strong>{app.studentId}</strong><br />{app.fullName || app.profile?.nickname || '-'}
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #e5e7eb' }}>
                        <strong>{app.eventTitle}</strong><br />ฝ่าย{app.roleName}
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                        {app.attendanceStatus === 'checked_in' && <span style={{ color: '#16a34a', fontWeight: 'bold' }}>🟢 เข้างานแล้ว</span>}
                        {app.attendanceStatus === 'checked_out' && <span style={{ color: '#1d4ed8', fontWeight: 'bold' }}>🔵 ออกงานแล้ว</span>}
                        {(!app.attendanceStatus || app.attendanceStatus === 'none') && <span style={{ color: '#6b7280' }}>ยังไม่เช็คอิน</span>}
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                        {app.attendanceStatus !== 'checked_out' ? (
                          <button
                            onClick={() => handleManualStaffScan(qrStr)}
                            style={{
                              backgroundColor: app.attendanceStatus === 'checked_in' ? '#2563eb' : '#16a34a',
                              color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px'
                            }}
                          >
                            {app.attendanceStatus === 'checked_in' ? 'สแกนออกงาน (Check-out)' : 'สแกนเข้างาน (Check-in)'}
                          </button>
                        ) : (
                          <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓ เสร็จสิ้น</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* หน้าต่างดูรายละเอียดกิจกรรมทั้งหมด */}
      {detailEvent && (
        <div className="modal-overlay" style={{ zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.65)' }}>
          <div className="modal-content" style={{ maxWidth: '760px', width: '94%', maxHeight: '90vh', overflowY: 'auto', padding: '0', borderRadius: '16px' }}>
            <div style={{ position: 'relative', backgroundColor: STAFF_IMAGE_SIZES.eventDetailFullBanner.backgroundColor }}>
              <img
                src={detailEvent.imageUrl || DEFAULT_EVENT_IMG}
                alt={detailEvent.title}
                style={{
                  width: STAFF_IMAGE_SIZES.eventDetailFullBanner.width,
                  aspectRatio: STAFF_IMAGE_SIZES.eventDetailFullBanner.aspectRatio,
                  maxHeight: STAFF_IMAGE_SIZES.eventDetailFullBanner.maxHeight,
                  objectFit: STAFF_IMAGE_SIZES.eventDetailFullBanner.objectFit,
                  display: 'block',
                  margin: '0 auto'
                }}
              />
              <button
                onClick={() => setDetailEvent(null)}
                style={{ position: 'absolute', top: '16px', right: '16px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '22px', color: '#111827' }}>{detailEvent.title}</h2>
                <span style={{ backgroundColor: '#fef2f2', color: '#8b0000', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                  รับเฉพาะชั้นปีที่: {(detailEvent.allowedYears || ['1', '2', '3', '4']).join(', ')}
                </span>
              </div>

              <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#92400e', marginBottom: '16px', lineHeight: 1.7 }}>
                <div><strong>📅 วันและเวลาจัดกิจกรรม:</strong> {formatShortThaiDate(detailEvent.eventDate)} เวลา {detailEvent.eventStartTime || '08:00'} - {detailEvent.eventEndTime || '17:00'} น.</div>
                <div><strong>⏰ ช่วงเวลาเปิดรับสมัครสต๊าฟ:</strong> {formatShortThaiDate(detailEvent.recruitStartDate)} ({detailEvent.recruitStartTime || '08:00'} น.) ถึง {formatShortThaiDate(detailEvent.recruitEndDate)} ({detailEvent.recruitEndTime || '23:59'} น.)</div>
              </div>

              <p style={{ color: '#374151', fontSize: '15px', lineHeight: '1.7', backgroundColor: '#f9fafb', padding: '16px', borderRadius: '10px', border: '1px solid #e5e7eb', marginBottom: '24px', whiteSpace: 'pre-line' }}>
                {detailEvent.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
              </p>

              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#8b0000', borderLeft: '4px solid #8b0000', paddingLeft: '10px' }}>
                รายการฝ่ายที่เปิดรับสมัคร (เลือกสมัครได้ 1 ฝ่ายเท่านั้น)
              </h3>

              {(() => {
                const myAppInEvent = myApplications.find(a => a.eventId === detailEvent.id);
                const eventYears = detailEvent.allowedYears || ['1', '2', '3', '4'];
                const isYearEligible = eventYears.includes(currentStudentYear);
                const isExpired = checkIsRecruitmentExpired(detailEvent);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {(detailEvent.roles || []).map(role => {
                      const isMyRole = myAppInEvent?.roleId === role.id;
                      const alreadyInAnotherRole = Boolean(myAppInEvent && myAppInEvent.roleId !== role.id);
                      const isFull = role.availableQuota <= 0;

                      return (
                        <div key={role.id} style={{ border: isMyRole ? '2px solid #16a34a' : '1px solid #e5e7eb', borderRadius: '12px', padding: '18px', backgroundColor: isMyRole ? '#f0fdf4' : 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                          <div style={{ flex: '1 1 280px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                              <strong style={{ fontSize: '17px', color: '#111827' }}>ฝ่าย{role.roleName}</strong>
                              <span style={{ fontSize: '12px', backgroundColor: isFull ? '#fee2e2' : '#dcfce7', color: isFull ? '#991b1b' : '#166534', padding: '3px 10px', borderRadius: '999px', fontWeight: 'bold' }}>
                                สมัครแล้ว {role.totalQuota - role.availableQuota}/{role.totalQuota} คน (เหลือ {role.availableQuota})
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
                                  {!isExpired && (
                                    <button
                                      onClick={() => myAppInEvent && handleCancelStaff(myAppInEvent.id, detailEvent.title)}
                                      style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                                    >
                                      ยกเลิกฝ่ายนี้
                                    </button>
                                  )}
                                </>
                              ) : (
                                <button
                                  disabled={alreadyInAnotherRole || isFull || !isYearEligible || isExpired}
                                  onClick={() => handleApplyRole(detailEvent, role)}
                                  className="btn-primary"
                                  style={{
                                    padding: '10px 20px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    opacity: (alreadyInAnotherRole || isFull || !isYearEligible || isExpired) ? 0.45 : 1
                                  }}
                                >
                                  {isExpired
                                    ? 'หมดเขตรับสมัคร'
                                    : alreadyInAnotherRole
                                    ? 'สมัครฝ่ายอื่นไปแล้ว'
                                    : !isYearEligible
                                    ? `รับเฉพาะปี ${eventYears.join(',')}`
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

      {/* หน้าต่างยืนยันการเป็นสต๊าฟ + แสดง QR Code เข้ากลุ่มไลน์ */}
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
                    <img
                      src={confirmationModal.event.mainLineQrUrl}
                      alt="Main Line QR"
                      style={{
                        width: STAFF_IMAGE_SIZES.lineQrImage.width,
                        height: STAFF_IMAGE_SIZES.lineQrImage.height,
                        objectFit: STAFF_IMAGE_SIZES.lineQrImage.objectFit,
                        margin: '0 auto',
                        display: 'block'
                      }}
                    />
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
                      <img
                        src={confirmationModal.role.lineQrUrl}
                        alt="Role Line QR"
                        style={{
                          width: STAFF_IMAGE_SIZES.lineQrImage.width,
                          height: STAFF_IMAGE_SIZES.lineQrImage.height,
                          objectFit: STAFF_IMAGE_SIZES.lineQrImage.objectFit,
                          margin: '0 auto',
                          display: 'block'
                        }}
                      />
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
                style={{ minWidth: '240px' }}
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
              <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '14px', border: '1px solid #e5e7eb' }}>
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
                          <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#f3f4f6' }}>
                                <th style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center', width: '50px' }}>#</th>
                                <th style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'left' }}>รหัสนศ. / ชื่อ-สกุล</th>
                                <th style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'left' }}>ชื่อเล่น / สาขา / ชั้นปี</th>
                                <th style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'left' }}>เบอร์โทร / ช่องทางติดต่อ</th>
                                <th style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'left' }}>แพ้อาหาร / ยา / โรค</th>
                                <th style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>สถานะเช็คชื่อ QR</th>
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
                                  <td style={{ padding: '12px', border: '1px solid #e5e7eb', fontSize: '13px' }}>
                                    <div><strong>อาหาร:</strong> {m.profile?.foodAllergies || '-'}</div>
                                    <div><strong>ยา/โรค:</strong> {m.profile?.drugAllergies || '-'} / {m.profile?.medicalCondition || '-'}</div>
                                  </td>
                                  <td style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                                    {m.attendanceStatus === 'checked_in' && <span style={{ color: '#16a34a', fontWeight: 'bold' }}>🟢 เข้างานแล้ว</span>}
                                    {m.attendanceStatus === 'checked_out' && <span style={{ color: '#1d4ed8', fontWeight: 'bold' }}>🔵 ออกงานแล้ว</span>}
                                    {(!m.attendanceStatus || m.attendanceStatus === 'none') && <span style={{ color: '#6b7280' }}>ยังไม่เช็คอิน</span>}
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
        <div style={{ maxWidth: '750px', margin: '0 auto', backgroundColor: 'white', padding: '28px', borderRadius: '14px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
            <UserCheck size={24} color="#8b0000" />
            <h3 style={{ margin: 0, fontSize: '20px' }}>ข้อมูลส่วนตัวสำหรับผู้สมัครสต๊าฟคณะวิศวะฯ</h3>
          </div>

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div className="form-field">
                <label>ชื่อเล่น *</label>
                <input required type="text" className="form-input" placeholder="เช่น ไอซ์" value={profileForm.nickname} onChange={e => setProfileForm({ ...profileForm, nickname: e.target.value })} />
              </div>

              <div className="form-field">
                <label>ภาควิชา / สาขาวิชา (Major) *</label>
                <select
                  required
                  className="form-input"
                  value={profileForm.major}
                  onChange={e => setProfileForm({ ...profileForm, major: e.target.value })}
                >
                  {ENGINEERING_MAJORS.map((majorName) => (
                    <option key={majorName} value={majorName}>
                      {majorName}
                    </option>
                  ))}
                </select>
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

      {/* =====================================================================
          🌟 ข้อ 3: Modal ตั้งกิจกรรม / แก้ไขกิจกรรม (เพิ่มตั้งวันที่-เวลาจัดกิจกรรม และช่วงเวลาเปิดรับสมัครสต๊าฟ)
         ===================================================================== */}
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

              {/* 🌟 ส่วนกำหนดวันที่จัดกิจกรรม และ เวลาเริ่ม - เวลาจบ */}
              <div style={{ backgroundColor: '#fef2f2', padding: '16px', borderRadius: '10px', border: '1px solid #fecaca' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px', color: '#8b0000' }}>
                  📅 กำหนดวันและเวลาจัดกิจกรรมจริง *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div className="form-field">
                    <label>วันที่จัดกิจกรรม *</label>
                    <input
                      required
                      type="date"
                      className="form-input"
                      value={eventForm.eventDate}
                      onChange={e => setEventForm({ ...eventForm, eventDate: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label>เวลาเริ่มกิจกรรม *</label>
                    <input
                      required
                      type="time"
                      className="form-input"
                      value={eventForm.eventStartTime}
                      onChange={e => setEventForm({ ...eventForm, eventStartTime: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label>เวลาจบกิจกรรม *</label>
                    <input
                      required
                      type="time"
                      className="form-input"
                      value={eventForm.eventEndTime}
                      onChange={e => setEventForm({ ...eventForm, eventEndTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* 🌟 ส่วนกำหนดช่วงเวลาที่เปิดรับสมัครสต๊าฟ (หากพ้นกำหนดนี้ การ์ดจะเปลี่ยนเป็นขาว-ดำอัตโนมัติ) */}
              <div style={{ backgroundColor: '#fffbeb', padding: '16px', borderRadius: '10px', border: '1px solid #fde68a' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px', color: '#92400e' }}>
                  ⏰ กำหนดช่วงเวลาเปิดรับสมัครสต๊าฟ (เมื่อพ้นเวลานี้ การ์ดกิจกรรมจะเปลี่ยนเป็นสีขาว-ดำอัตโนมัติ) *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                  <div className="form-field">
                    <label>วันที่เริ่มรับสมัคร *</label>
                    <input
                      required
                      type="date"
                      className="form-input"
                      value={eventForm.recruitStartDate}
                      onChange={e => setEventForm({ ...eventForm, recruitStartDate: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label>เวลาเริ่มรับสมัคร *</label>
                    <input
                      required
                      type="time"
                      className="form-input"
                      value={eventForm.recruitStartTime}
                      onChange={e => setEventForm({ ...eventForm, recruitStartTime: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label>วันที่ปิดรับสมัคร *</label>
                    <input
                      required
                      type="date"
                      className="form-input"
                      value={eventForm.recruitEndDate}
                      onChange={e => setEventForm({ ...eventForm, recruitEndDate: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label>เวลาปิดรับสมัคร *</label>
                    <input
                      required
                      type="time"
                      className="form-input"
                      value={eventForm.recruitEndTime}
                      onChange={e => setEventForm({ ...eventForm, recruitEndTime: e.target.value })}
                    />
                  </div>
                </div>
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
                        const b64 = await convertFileToBase64(file, 420, 0.55);
                        setEventForm(prev => ({ ...prev, imageUrl: b64 }));
                      }
                    }}
                  />
                </label>
                {eventForm.imageUrl && (
                  <div style={{ marginTop: '8px', textAlign: 'center' }}>
                    <img src={eventForm.imageUrl} alt="Event Preview" style={{ maxHeight: '140px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                  </div>
                )}
              </div>

              <div className="form-field">
                <label>รายละเอียดกิจกรรม *</label>
                <textarea required rows={3} className="form-input" placeholder="ระบุรายละเอียดกิจกรรม สถานที่ การแต่งกาย..." value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} />
              </div>

              <div className="form-field">
                <label>กำหนดชั้นปีที่มีสิทธิ์สมัครเป็นสต๊าฟได้ (ใช้ร่วมกันทุกฝ่ายในกิจกรรมนี้) *</label>
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
                          const b64 = await convertFileToBase64(file, 260, 0.55);
                          setEventForm(prev => ({ ...prev, mainLineQrUrl: b64 }));
                        }
                      }}
                    />
                  </label>
                  {eventForm.mainLineQrUrl && (
                    <div style={{ marginTop: '8px' }}>
                      <img src={eventForm.mainLineQrUrl} alt="Main QR" style={{ width: '85px', height: '85px', objectFit: 'contain', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white' }} />
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
                        roles: [...prev.roles, { roleName: '', totalQuota: 5, description: '', lineQrUrl: '' }]
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

                      <div style={{ marginBottom: eventForm.qrCount === 2 ? '10px' : '0' }}>
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

                      {eventForm.qrCount === 2 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'white', fontSize: '12px', fontWeight: 'bold' }}>
                            <Upload size={14} color="#8b0000" /> {r.lineQrUrl ? 'เปลี่ยน QR ฝ่ายนี้' : 'อัปโหลด QR กลุ่มฝ่ายนี้'}
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const b64 = await convertFileToBase64(file, 260, 0.55);
                                  const updated = [...eventForm.roles];
                                  updated[idx].lineQrUrl = b64;
                                  setEventForm({ ...eventForm, roles: updated });
                                }
                              }}
                            />
                          </label>
                          {r.lineQrUrl && <img src={r.lineQrUrl} alt="Role QR" style={{ width: '38px', height: '38px', objectFit: 'contain', borderRadius: '4px', border: '1px solid #d1d5db' }} />}
                        </div>
                      )}
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