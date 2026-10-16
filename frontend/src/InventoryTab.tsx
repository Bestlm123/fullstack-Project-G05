import { useState, useEffect, forwardRef } from 'react';
import axios from 'axios';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Plus, Edit, Trash2, Package, X, ShoppingCart, Filter, ArrowLeft,
  Printer, CheckCircle, Calendar as CalendarIcon, XCircle, User as UserIcon,
  AlertCircle, Clock, Check, Ban, QrCode, FileText, Search, ScanLine, Upload, Camera, CameraOff, AlertTriangle
} from 'lucide-react';
import { Calendar, momentLocalizer, type View } from 'react-big-calendar';
import moment from 'moment';
import DatePicker, { registerLocale } from 'react-datepicker';
import { th } from 'date-fns/locale';
import { Html5Qrcode } from 'html5-qrcode';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-datepicker/dist/react-datepicker.css';

moment.updateLocale('th', {
  months: 'มกราคม_กุมภาพันธ์_มีนาคม_เมษายน_พฤษภาคม_มิถุนายน_กรกฎาคม_สิงหาคม_กันยายน_ตุลาคม_พฤศจิกายน_ธันวาคม'.split('_'),
  monthsShort: 'ม.ค._ก.พ._มี.ค._เม.ย._พ.ค._มิ.ย._ก.ค._ส.ค._ก.ย._ต.ค._พ.ย._ธ.ค.'.split('_'),
  weekdays: 'อาทิตย์_จันทร์_อังคาร_พุธ_พฤหัสบดี_ศุกร์_เสาร์'.split('_'),
  weekdaysShort: 'อา._จ._อ._พ._พฤ._ศ._ส.'.split('_'),
});
moment.locale('th');
registerLocale('th', th);

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_URL = `${BASE_URL}/api`;
axios.defaults.withCredentials = true;
const localizer = momentLocalizer(moment);

const CATEGORIES = ['ทั้งหมด', 'ทั่วไป', 'อิเล็กทรอนิกส์', 'เครื่องเขียน/อุปกรณ์จัดงาน', 'กีฬา', 'อื่นๆ'];
const DEFAULT_ITEM_IMG = 'https://placehold.co/400x300/f3f4f6/6b7280?text=ไม่มีรูปภาพ';

// ============================================================================
// 🌟 ตั้งค่าขนาดและอัตราส่วนรูปภาพในหน้ายืม-คืนอุปกรณ์ (ปรับแก้ตัวเลขตรงนี้ได้เลย)
// ============================================================================
const INVENTORY_IMAGE_SIZES = {
  catalogCardImage: {
    width: '100%',
    aspectRatio: '4 / 3',
    height: '180px',
    objectFit: 'contain' as const,
    backgroundColor: '#f8fafc'
  },
  cartThumbnail: {
    width: '72px',
    height: '72px',
    objectFit: 'contain' as const,
    backgroundColor: '#ffffff'
  }
};

const TIME_OPTIONS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
];
const EVENT_COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#9333ea', '#db2777', '#0d9488', '#0284c7', '#ea580c'];

const generateTransactionId = () => `ENTrent${String(Math.floor(1000 + Math.random() * 9000))}`;

const convertImageFileToDbBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 650;
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

interface User {
  studentId: string;
  fullName: string;
  faculty: string;
  email: string;
  role: 'admin' | 'user';
}

interface InventoryTabProps {
  currentRole?: 'admin' | 'user';
  currentUserId?: string;
  currentUser: User;
}

interface Asset {
  id: string;
  name: string;
  category: string;
  quantity: number;
  availableQuantity: number;
  status: string;
  imageUrl?: string;
}

interface CartItem {
  asset: Asset;
  quantity: number;
  borrowDate: string;
  returnDate: string;
}

interface BorrowerInfo {
  fullName: string;
  phone: string;
  email: string;
  studentId: string;
  faculty: string;
  club: string;
  projectName: string;
  purpose: string;
  borrowDate: string;
  borrowTime: string;
  returnDate: string;
  returnTime: string;
  eventStartDate: string;
  eventEndDate: string;
}

interface BorrowingRecord {
  id: number;
  transactionId?: string;
  projectName?: string;
  pickupDate?: string;
  submittedAt?: string;
  assetId: string;
  studentId: string;
  quantity: number;
  borrowDate: string;
  returnDate: string;
  status: string;
  approvalStatus?: string;
  rejectReason?: string;
  borrowerInfo?: BorrowerInfo | null;
}

interface GroupedRequest {
  billId: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'borrowed' | 'rejected' | 'returned';
  rejectReason?: string;
  borrowerInfo: BorrowerInfo;
  items: {
    recordId: number;
    assetId: string;
    assetName: string;
    quantity: number;
    borrowDate: string;
    returnDate: string;
    rawStatus: string;
  }[];
}

interface BorrowEvent {
  id?: number;
  title: string;
  start: Date;
  end: Date;
  color?: string;
}

interface CustomInputProps {
  value?: string;
  onClick?: () => void;
  displayText?: string;
}

const CustomThaiDateInput = forwardRef<HTMLInputElement, CustomInputProps>(({ onClick, displayText, value }, ref) => (
  <input
    className="form-input"
    onClick={onClick}
    ref={ref}
    value={displayText || value || ''}
    readOnly
    style={{ cursor: 'pointer', backgroundColor: 'white', width: '100%' }}
    placeholder="เลือกวันที่..."
  />
));

export default function InventoryTab({ currentUser }: InventoryTabProps) {
  const currentRole = currentUser.role;
  const currentUserId = currentUser.studentId;

  const [borrowerInfo, setBorrowerInfo] = useState<BorrowerInfo | null>(null);
  const [viewState, setViewState] = useState<'user-form' | 'catalog' | 'booking' | 'cart' | 'my-requests' | 'receipt'>(
    currentRole === 'user' ? 'user-form' : 'catalog'
  );
  const [adminSubTab, setAdminSubTab] = useState<'assets' | 'approvals' | 'scanner'>('assets');

  const [assets, setAssets] = useState<Asset[]>([]);
  const [borrowings, setBorrowings] = useState<BorrowingRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [cart, setCart] = useState<CartItem[]>([]);

  const [showCartPrompt, setShowCartPrompt] = useState<{ show: boolean; itemName: string }>({ show: false, itemName: '' });
  const [errorModal, setErrorModal] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const [successModal, setSuccessModal] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; title: string; message: string; onConfirm: () => void }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', category: 'ทั่วไป', quantity: 1, status: 'available', imageUrl: '' });
  const [rejectModal, setRejectModal] = useState<{ show: boolean; request: GroupedRequest | null; reason: string }>({
    show: false,
    request: null,
    reason: ''
  });
  const [scanQuery, setScanQuery] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [borrowEvents, setBorrowEvents] = useState<BorrowEvent[]>([]);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [activeReceipt, setActiveReceipt] = useState<GroupedRequest | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>('month');

  const [userInfoForm, setUserInfoForm] = useState<BorrowerInfo>({
    fullName: currentUser.fullName || '',
    phone: '',
    email: currentUser.email || '',
    studentId: currentUser.studentId || '',
    faculty: currentUser.faculty || '',
    club: '',
    projectName: '',
    purpose: '',
    borrowDate: moment().format('YYYY-MM-DD'),
    borrowTime: '08:00',
    returnDate: moment().add(1, 'days').format('YYYY-MM-DD'),
    returnTime: '16:30',
    eventStartDate: moment().format('YYYY-MM-DD'),
    eventEndDate: moment().add(1, 'days').format('YYYY-MM-DD'),
  });

  const fetchAllData = async () => {
    try {
      const [itemsRes, borrowRes] = await Promise.all([
        axios.get(`${API_URL}/items`),
        axios.get(`${API_URL}/borrowings`)
      ]);
      setAssets(itemsRes.data);
      setBorrowings(borrowRes.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const poll = async () => {
      if (!isMounted) return;
      await fetchAllData();
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!isCameraOpen || currentRole !== 'admin' || adminSubTab !== 'scanner') return;

    let html5QrCode: Html5Qrcode | null = null;
    let isScanning = true;

    const startCamera = async () => {
      try {
        html5QrCode = new Html5Qrcode('qr-reader-box');
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          async (decodedText) => {
            if (!isScanning) return;
            isScanning = false;

            if (html5QrCode && html5QrCode.isScanning) {
              await html5QrCode.stop().catch(() => {});
            }
            setIsCameraOpen(false);
            setScanQuery(decodedText);

            try {
              const res = await axios.post(`${API_URL}/borrowings/scan`, { qrData: decodedText });
              await fetchAllData();
              setSuccessModal({ show: true, message: `สแกน QR สำเร็จ! ${res.data.message}` });
            } catch (error: unknown) {
              let errMsg = 'ไม่พบข้อมูล หรือสถานะไม่ถูกต้อง';
              if (axios.isAxiosError(error)) {
                errMsg = error.response?.data?.error || errMsg;
              }
              setErrorModal({ show: true, message: errMsg });
            }
          },
          () => {}
        );
      } catch (err) {
        console.error('Camera start error:', err);
        setIsCameraOpen(false);
        setErrorModal({
          show: true,
          message: 'ไม่สามารถเปิดกล้องได้ กรุณากดอนุญาตการใช้กล้อง (Allow Camera) บนเบราว์เซอร์ของคุณ'
        });
      }
    };

    startCamera();

    return () => {
      isScanning = false;
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [isCameraOpen, currentRole, adminSubTab]);

  const formatThaiDateTime = (dateStr: string) => {
    const m = moment(dateStr);
    if (!m.isValid()) return dateStr;
    return `${m.format('DD')} ${m.format('MMM')} ${m.year() + 543} เวลา ${m.format('HH:mm')} น.`;
  };

  const formatToShortThaiDate = (dateStr: string) => {
    if (!dateStr) return '';
    const m = moment(dateStr, 'YYYY-MM-DD');
    if (!m.isValid()) return dateStr;
    return `${m.format('DD')}   ${m.format('MMM')}   ${m.year() + 543}`;
  };

  const formatEventDateRange = (startStr: string, endStr?: string) => {
    const s = formatToShortThaiDate(startStr);
    if (!endStr || startStr === endStr) return s;
    return `${s} ถึง ${formatToShortThaiDate(endStr)}`;
  };

  const generateAssetId = (category: string, currentAssets: Asset[]) => {
    const prefixMap: Record<string, string> = {
      'ทั่วไป': 'GEN', 'อิเล็กทรอนิกส์': 'EAV', 'เครื่องเขียน/อุปกรณ์จัดงาน': 'EOS', 'กีฬา': 'SPR', 'อื่นๆ': 'OTH'
    };
    const prefix = prefixMap[category] || 'GEN';
    const existingIds = currentAssets
      .map(a => a.id)
      .filter(id => id.startsWith(prefix))
      .map(id => parseInt(id.replace(prefix, ''), 10))
      .filter(n => !isNaN(n));
    return `${prefix}${(existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1).toString().padStart(3, '0')}`;
  };

  const buildGroupedRequests = (): GroupedRequest[] => {
    const groups: Record<string, GroupedRequest> = {};

    borrowings.forEach((rec) => {
      const billId = rec.transactionId && rec.transactionId !== 'LEGACY-TXN'
        ? rec.transactionId
        : `ENT-${String(rec.id).padStart(4, '0')}`;
      const assetObj = assets.find(a => a.id === rec.assetId);

      let normalizedStatus: GroupedRequest['status'] = 'pending';
      if (rec.status === 'rejected' || rec.approvalStatus === 'rejected') normalizedStatus = 'rejected';
      else if (rec.status === 'returned') normalizedStatus = 'returned';
      else if (rec.status === 'borrowed') normalizedStatus = 'borrowed';
      else if (rec.approvalStatus === 'approved') normalizedStatus = 'approved';

      const dbInfo = rec.borrowerInfo;
      const info: BorrowerInfo = dbInfo ? {
        fullName: dbInfo.fullName || currentUser.fullName,
        phone: dbInfo.phone || '-',
        email: dbInfo.email || currentUser.email,
        studentId: dbInfo.studentId || rec.studentId,
        faculty: dbInfo.faculty || currentUser.faculty,
        club: dbInfo.club || '-',
        projectName: dbInfo.projectName || rec.projectName || '-',
        purpose: dbInfo.purpose || '-',
        borrowDate: dbInfo.borrowDate || moment(rec.borrowDate).format('YYYY-MM-DD'),
        borrowTime: dbInfo.borrowTime || moment(rec.borrowDate).format('HH:mm'),
        returnDate: dbInfo.returnDate || moment(rec.returnDate).format('YYYY-MM-DD'),
        returnTime: dbInfo.returnTime || moment(rec.returnDate).format('HH:mm'),
        eventStartDate: dbInfo.eventStartDate || moment(rec.borrowDate).format('YYYY-MM-DD'),
        eventEndDate: dbInfo.eventEndDate || dbInfo.eventStartDate || moment(rec.returnDate).format('YYYY-MM-DD')
      } : {
        fullName: rec.studentId === currentUser.studentId ? currentUser.fullName : `รหัสนักศึกษา ${rec.studentId}`,
        phone: '-',
        email: rec.studentId === currentUser.studentId ? currentUser.email : '-',
        studentId: rec.studentId,
        faculty: rec.studentId === currentUser.studentId ? currentUser.faculty : 'Engineering',
        club: '-',
        projectName: rec.projectName || '-',
        purpose: '-',
        borrowDate: moment(rec.borrowDate).format('YYYY-MM-DD'),
        borrowTime: moment(rec.borrowDate).format('HH:mm'),
        returnDate: moment(rec.returnDate).format('YYYY-MM-DD'),
        returnTime: moment(rec.returnDate).format('HH:mm'),
        eventStartDate: moment(rec.borrowDate).format('YYYY-MM-DD'),
        eventEndDate: moment(rec.returnDate).format('YYYY-MM-DD')
      };

      const exactSubmittedTime = rec.submittedAt || rec.pickupDate || rec.borrowDate;

      if (!groups[billId]) {
        groups[billId] = {
          billId,
          createdAt: exactSubmittedTime,
          status: normalizedStatus,
          rejectReason: rec.rejectReason || '',
          borrowerInfo: info,
          items: []
        };
      }

      groups[billId].items.push({
        recordId: rec.id,
        assetId: rec.assetId,
        assetName: assetObj ? assetObj.name : `อุปกรณ์ #${rec.assetId}`,
        quantity: rec.quantity,
        borrowDate: rec.borrowDate,
        returnDate: rec.returnDate,
        rawStatus: rec.status
      });
    });

    return Object.values(groups).sort((a, b) => {
      const maxIdA = Math.max(...a.items.map(i => i.recordId), 0);
      const maxIdB = Math.max(...b.items.map(i => i.recordId), 0);
      return maxIdB - maxIdA;
    });
  };

  const allGroupedRequests = buildGroupedRequests();
  const myRequests = allGroupedRequests.filter(req => req.borrowerInfo.studentId === currentUserId);
  const latestMyRequest = myRequests.length > 0 ? myRequests[0] : null;
  const activePendingRequest = myRequests.find(req => req.status === 'pending') || null;

  const handleSubmitUserInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (activePendingRequest) {
      setErrorModal({
        show: true,
        message: `คุณมีคำขอยืมรหัส ${activePendingRequest.billId} ที่กำลังรอผู้ดูแลอนุมัติอยู่ ไม่สามารถทำรายการยืมใหม่ซ้ำได้ครับ`
      });
      setViewState('my-requests');
      return;
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(userInfoForm.phone)) {
      setErrorModal({ show: true, message: 'กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก (เฉพาะตัวเลขเท่านั้น)' });
      return;
    }

    const startStr = `${userInfoForm.borrowDate}T${userInfoForm.borrowTime}:00`;
    const endStr = `${userInfoForm.returnDate}T${userInfoForm.returnTime}:00`;

    if (new Date(endStr) <= new Date(startStr)) {
      setErrorModal({ show: true, message: 'วันและเวลาคืนอุปกรณ์ ต้องอยู่หลังจากวันและเวลายืมครับ!' });
      return;
    }

    if (new Date(userInfoForm.eventEndDate) < new Date(userInfoForm.eventStartDate)) {
      setErrorModal({ show: true, message: 'วันสิ้นสุดกิจกรรม ต้องไม่ก่อนวันเริ่มจัดกิจกรรมครับ!' });
      return;
    }

    if (
      moment(userInfoForm.eventStartDate).isBefore(userInfoForm.borrowDate, 'day') ||
      moment(userInfoForm.eventEndDate).isAfter(userInfoForm.returnDate, 'day')
    ) {
      setErrorModal({
        show: true,
        message: 'วันจัดกิจกรรมต้องอยู่ภายในช่วงวันที่ยืมและวันที่คืนอุปกรณ์'
      });
      return;
    }

    setBorrowerInfo({ ...userInfoForm });
    setViewState('catalog');
  };

  const handleSelectAsset = (asset: Asset) => {
    if (activePendingRequest) {
      setErrorModal({
        show: true,
        message: `คุณมีคำขอรหัส ${activePendingRequest.billId} ที่รอผู้ดูแลอนุมัติอยู่ กรุณารอผลการอนุมัติหรือยกเลิกคำขอเดิมก่อนครับ`
      });
      setViewState('my-requests');
      return;
    }

    setSelectedAsset(asset);
    setSelectedQuantity(1);

    const itemHistory = borrowings.filter(
      (b: BorrowingRecord) => b.assetId === asset.id && b.status !== 'returned' && b.status !== 'rejected'
    );
    setBorrowEvents(
      itemHistory.map((b: BorrowingRecord, index: number) => ({
        id: b.id,
        title: `ถูกยืม (${b.quantity} ชิ้น)`,
        start: new Date(b.borrowDate),
        end: new Date(b.returnDate),
        color: EVENT_COLORS[index % EVENT_COLORS.length]
      }))
    );
    setViewState('booking');
  };

  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !borrowerInfo) return;

    const startStr = `${borrowerInfo.borrowDate}T${borrowerInfo.borrowTime}:00`;
    const endStr = `${borrowerInfo.returnDate}T${borrowerInfo.returnTime}:00`;

    const existingIndex = cart.findIndex(c => c.asset.id === selectedAsset.id);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += selectedQuantity;
      setCart(updated);
    } else {
      setCart([...cart, { asset: selectedAsset, quantity: selectedQuantity, borrowDate: startStr, returnDate: endStr }]);
    }

    setShowCartPrompt({ show: true, itemName: selectedAsset.name });
    setViewState('catalog');
    setSelectedAsset(null);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (activePendingRequest) {
      setErrorModal({ show: true, message: 'คุณมีคำขอยืมที่กำลังรออนุมัติอยู่ ไม่สามารถส่งคำขอซ้ำได้ครับ' });
      return;
    }

    const activeInfo = borrowerInfo || userInfoForm;
    const sharedTxnId = generateTransactionId();

    try {
      await Promise.all(
        cart.map(item =>
          axios.post(`${API_URL}/borrowings`, {
            transactionId: sharedTxnId,
            projectName: activeInfo.projectName,
            assetId: item.asset.id,
            studentId: currentUserId,
            fullName: activeInfo.fullName,
            quantity: item.quantity,
            borrowDate: item.borrowDate,
            returnDate: item.returnDate,
            borrowerInfo: activeInfo
          })
        )
      );

      setCart([]);
      await fetchAllData();
      setViewState('my-requests');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: unknown) {
      console.error(error);
      let msg = 'ไม่สามารถบันทึกคำขอยืมได้ กรุณาตรวจสอบการเชื่อมต่อหลังบ้าน';
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        msg = error.response.data.error;
      }
      setErrorModal({ show: true, message: msg });
    }
  };

  // 🌟 เปลี่ยนเป็น Custom Pop-up ยืนยันการยกเลิกคำขอยืม
  const handleUserCancelRequest = (request: GroupedRequest) => {
    setConfirmModal({
      show: true,
      title: 'ยืนยันการยกเลิกคำขอยืม',
      message: `คุณต้องการยกเลิกคำขอยืมรหัส ${request.billId} และคืนโควต้าอุปกรณ์ใช่หรือไม่?`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, show: false }));
        try {
          await Promise.all(
            request.items.map(item =>
              axios.post(`${API_URL}/borrowings/cancel`, { borrowingId: item.recordId })
            )
          );
          await fetchAllData();
          setSuccessModal({ show: true, message: `ยกเลิกคำขอยืมรหัส ${request.billId} และคืนโควต้าอุปกรณ์เรียบร้อยแล้ว` });
          setViewState('user-form');
        } catch (error) {
          console.error(error);
          setErrorModal({ show: true, message: 'ไม่สามารถยกเลิกคำขอยืมได้ กรุณาลองใหม่อีกครั้ง' });
        }
      }
    });
  };

  const handleOpenReceiptView = (request: GroupedRequest) => {
    setIsCameraOpen(false);
    setActiveReceipt(request);
    setViewState('receipt');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExecuteQrScan = async (request: GroupedRequest) => {
    try {
      const results = await Promise.all(
        request.items.map(item => {
          const qrPayload = `REQ-${String(item.recordId).padStart(4, '0')}|${request.borrowerInfo.studentId}|${request.billId}`;
          return axios.post(`${API_URL}/borrowings/scan`, { qrData: qrPayload });
        })
      );
      const msg = results[0]?.data?.message || 'อัปเดตสถานะการรับ/คืนอุปกรณ์สำเร็จ!';
      await fetchAllData();
      setSuccessModal({ show: true, message: `รหัส ${request.billId}: ${msg}` });
    } catch (error: unknown) {
      let errMsg = 'เกิดข้อผิดพลาดในการสแกน QR Code';
      if (axios.isAxiosError(error)) {
        errMsg = error.response?.data?.error || error.response?.data?.message || errMsg;
      }
      setErrorModal({ show: true, message: errMsg });
    }
  };

  const handleAdminApprove = async (request: GroupedRequest) => {
    try {
      await axios.post(`${API_URL}/borrowings/status`, {
        transactionId: request.billId,
        approvalStatus: 'approved'
      });
      await fetchAllData();
      setSuccessModal({ show: true, message: `อนุมัติคำขอรหัส ${request.billId} เรียบร้อยแล้ว! ผู้ยืมสามารถกดพิมพ์เอกสารพร้อม QR Code ได้ทันที` });
    } catch (error) {
      console.error(error);
      setErrorModal({ show: true, message: 'เกิดข้อผิดพลาดในการอนุมัติคำขอ' });
    }
  };

  const handleAdminRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModal.request || !rejectModal.reason.trim()) return;

    const targetReq = rejectModal.request;
    const reasonText = rejectModal.reason.trim();

    try {
      await axios.post(`${API_URL}/borrowings/status`, {
        transactionId: targetReq.billId,
        approvalStatus: 'rejected',
        rejectReason: reasonText
      });
      setRejectModal({ show: false, request: null, reason: '' });
      await fetchAllData();
      setSuccessModal({ show: true, message: `ปฏิเสธคำขอ ${targetReq.billId} พร้อมคืนสต๊อกและแจ้งเหตุผลให้ผู้ยืมเรียบร้อยแล้ว` });
    } catch (error) {
      console.error(error);
      setErrorModal({ show: true, message: 'เกิดข้อผิดพลาดในการปฏิเสธคำขอ' });
    }
  };

  const handleAssetImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await convertImageFileToDbBase64(file);
      setFormData(prev => ({ ...prev, imageUrl: base64 }));
    } catch {
      setErrorModal({ show: true, message: 'ไม่สามารถอ่านไฟล์รูปภาพได้' });
    }
  };

  const handlePrintDocument = (receipt: GroupedRequest) => {
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
      window.print();
      return;
    }

    const firstRecordId = receipt.items[0]?.recordId || 1;
    const qrPayload = `REQ-${String(firstRecordId).padStart(4, '0')}|${receipt.borrowerInfo.studentId}|${receipt.billId}`;

    const itemsRowsHtml = receipt.items
      .map(
        (item, idx) => `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td><strong>${item.assetName}</strong> <span style="color: #555; font-size: 12px;">(#${item.assetId})</span></td>
          <td style="text-align: center; font-weight: bold;">${item.quantity} ชิ้น</td>
          <td style="font-size: 13px; line-height: 1.5;">
            <div><strong>ยืม:</strong> ${formatThaiDateTime(item.borrowDate)}</div>
            <div><strong>คืน:</strong> ${formatThaiDateTime(item.returnDate)}</div>
          </td>
        </tr>
      `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8" />
        <title>เอกสารขอยืมอุปกรณ์ - ${receipt.billId}</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          * { box-sizing: border-box; }
          body { font-family: 'Sarabun', sans-serif; color: #111827; margin: 0; padding: 0; background: #ffffff; font-size: 14px; }
          .doc-container { width: 100%; max-width: 100%; margin: 0 auto; }
          .header-row { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #8b0000; padding-bottom: 16px; margin-bottom: 20px; }
          .title-box h1 { margin: 0 0 6px 0; font-size: 24px; color: #8b0000; }
          .title-box p { margin: 0; font-size: 15px; color: #374151; font-weight: 600; }
          .status-badge { display: inline-block; margin-top: 8px; padding: 4px 12px; background: #dcfce7; color: #166534; border: 1px solid #86efac; border-radius: 6px; font-size: 13px; font-weight: 700; }
          .qr-box { text-align: center; border: 1px solid #d1d5db; padding: 8px; border-radius: 8px; }
          .qr-box img { width: 95px; height: 95px; display: block; margin: 0 auto; }
          .qr-box span { display: block; font-size: 11px; color: #4b5563; margin-top: 4px; }
          .meta-bar { display: flex; justify-content: space-between; background: #f9fafb; border: 1px solid #e5e7eb; padding: 10px 16px; border-radius: 6px; margin-bottom: 20px; font-size: 13px; flex-wrap: wrap; gap: 8px; }
          .section-title { font-size: 16px; font-weight: 700; color: #8b0000; margin: 0 0 10px 0; border-left: 4px solid #8b0000; padding-left: 8px; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          .info-table td { padding: 8px 12px; border: 1px solid #d1d5db; width: 50%; vertical-align: top; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 36px; }
          .items-table th, .items-table td { border: 1px solid #9ca3af; padding: 10px 12px; }
          .items-table th { background-color: #f3f4f6; font-weight: 700; text-align: left; }
          .sign-grid { display: flex; justify-content: space-between; margin-top: 50px; text-align: center; }
          .sign-box { width: 45%; }
          .sign-line { border-bottom: 1px dashed #374151; height: 35px; margin-bottom: 8px; }
          .footer-note { margin-top: 36px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="doc-container">
          <div class="header-row">
            <div class="title-box">
              <h1>เอกสารขอยืมอุปกรณ์ (ใบอนุมัติรับของ)</h1>
              <p>สโมสรนักศึกษาคณะวิศวกรรมศาสตร์ มหาวิทยาลัยเชียงใหม่</p>
              <div class="status-badge">✓ ผ่านการอนุมัติจากผู้ดูแลระบบแล้ว</div>
            </div>
            <div class="qr-box">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(qrPayload)}" alt="QR Code" />
              <span><strong>${receipt.billId}</strong></span>
            </div>
          </div>

          <div class="meta-bar">
            <div><strong>รหัสอ้างอิง:</strong> ${receipt.billId}</div>
            <div><strong>วันจัดกิจกรรม:</strong> ${formatEventDateRange(receipt.borrowerInfo.eventStartDate, receipt.borrowerInfo.eventEndDate)}</div>
            <div><strong>ยื่นคำขอเมื่อ:</strong> ${formatThaiDateTime(receipt.createdAt)}</div>
          </div>

          <div class="section-title">1. ข้อมูลผู้ขอยืมและรายละเอียดโครงการ</div>
          <table class="info-table">
            <tr>
              <td><strong>ชื่อ-นามสกุล:</strong> ${receipt.borrowerInfo.fullName}</td>
              <td><strong>รหัสนักศึกษา/บุคลากร:</strong> ${receipt.borrowerInfo.studentId}</td>
            </tr>
            <tr>
              <td><strong>คณะ/สังกัด:</strong> ${receipt.borrowerInfo.faculty}</td>
              <td><strong>เบอร์โทรศัพท์:</strong> ${receipt.borrowerInfo.phone}</td>
            </tr>
            <tr>
              <td><strong>ชมรม/หน่วยงาน:</strong> ${receipt.borrowerInfo.club}</td>
              <td><strong>อีเมล:</strong> ${receipt.borrowerInfo.email}</td>
            </tr>
            <tr>
              <td colspan="2"><strong>ชื่อโครงการ/กิจกรรม:</strong> ${receipt.borrowerInfo.projectName}</td>
            </tr>
            <tr>
              <td colspan="2"><strong>วัตถุประสงค์การใช้งาน:</strong> ${receipt.borrowerInfo.purpose}</td>
            </tr>
          </table>

          <div class="section-title">2. รายการอุปกรณ์ที่ได้รับอนุมัติ</div>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 55px; text-align: center;">ลำดับ</th>
                <th>รายการอุปกรณ์</th>
                <th style="width: 90px; text-align: center;">จำนวน</th>
                <th style="width: 240px;">กำหนดการยืม - คืน</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRowsHtml}
            </tbody>
          </table>

          <div class="sign-grid">
            <div class="sign-box">
              <div class="sign-line"></div>
              <div><strong>( ${receipt.borrowerInfo.fullName} )</strong></div>
              <div style="color: #4b5563; font-size: 13px; margin-top: 4px;">ผู้ขอยืม / ผู้รับอุปกรณ์</div>
            </div>
            <div class="sign-box">
              <div class="sign-line"></div>
              <div><strong>( ..................................................... )</strong></div>
              <div style="color: #4b5563; font-size: 13px; margin-top: 4px;">ผู้ดูแลระบบ / เจ้าหน้าที่สโมสรฯ ผู้ส่งมอบ</div>
            </div>
          </div>

          <div class="footer-note">
            * เอกสารฉบับนี้สร้างจากระบบยืม-คืนอุปกรณ์ สโมสรนักศึกษาคณะวิศวกรรมศาสตร์ มช. โปรดนำเอกสารนี้มาแสดงพร้อมสแกน QR Code เพื่อรับและคืนอุปกรณ์
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 350);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleOpenAddModal = () => {
    setIsEditMode(false);
    const initCat = 'ทั่วไป';
    setFormData({ id: generateAssetId(initCat, assets), name: '', category: initCat, quantity: 1, status: 'available', imageUrl: '' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (asset: Asset) => {
    setIsEditMode(true);
    setFormData({ id: asset.id, name: asset.name, category: asset.category, quantity: asset.quantity, status: asset.status, imageUrl: asset.imageUrl || '' });
    setIsModalOpen(true);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value;
    if (!isEditMode) {
      const newId = generateAssetId(newCategory, assets);
      setFormData({ ...formData, category: newCategory, id: newId });
    } else {
      setFormData({ ...formData, category: newCategory });
    }
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData, availableQuantity: formData.quantity };
      if (isEditMode) {
        await axios.put(`${API_URL}/items/${formData.id}`, payload);
      } else {
        await axios.post(`${API_URL}/items`, payload);
      }
      setIsModalOpen(false);
      await fetchAllData();
      setSuccessModal({ show: true, message: isEditMode ? 'บันทึกการแก้ไขอุปกรณ์สำเร็จ!' : 'เพิ่มอุปกรณ์ใหม่เข้าคลังสำเร็จ!' });
    } catch (error) {
      console.error(error);
      setErrorModal({ show: true, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลอุปกรณ์' });
    }
  };

  // 🌟 เปลี่ยนเป็น Custom Pop-up ยืนยันการลบอุปกรณ์
  const handleDelete = (id: string) => {
    setConfirmModal({
      show: true,
      title: 'ยืนยันการลบอุปกรณ์',
      message: `คุณต้องการลบอุปกรณ์รหัส #${id} ออกจากคลังพัสดุใช่หรือไม่?`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, show: false }));
        try {
          await axios.delete(`${API_URL}/items/${id}`);
          await fetchAllData();
          setSuccessModal({ show: true, message: `ลบอุปกรณ์รหัส #${id} เรียบร้อยแล้ว` });
        } catch (error) {
          console.error(error);
          setErrorModal({ show: true, message: 'ไม่สามารถลบอุปกรณ์ได้' });
        }
      }
    });
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = DEFAULT_ITEM_IMG;
  };

  const filteredAssets = [...assets]
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }))
    .filter(item => (selectedCategory === 'ทั้งหมด' ? true : item.category === selectedCategory));

  const pendingCount = allGroupedRequests.filter(r => r.status === 'pending').length;
  const scannedResults = scanQuery.trim()
    ? allGroupedRequests.filter(r =>
        r.billId.toLowerCase().includes(scanQuery.trim().toLowerCase()) ||
        r.borrowerInfo.studentId.includes(scanQuery.trim()) ||
        r.items.some(i => `REQ-${String(i.recordId).padStart(4, '0')}`.toLowerCase() === scanQuery.trim().split('|')[0].toLowerCase())
      )
    : [];

  return (
    <div style={{ paddingBottom: '40px' }}>
      <style>
        {`
          .form-input:disabled {
            background-color: #e5e7eb !important;
            color: #6b7280 !important;
            cursor: not-allowed !important;
            border: 1px solid #d1d5db !important;
            opacity: 1 !important;
          }
          .react-datepicker-wrapper {
            width: 100% !important;
            display: block !important;
          }
          .inv-card-box {
            background-color: white;
            padding: 28px;
            border-radius: 14px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 2px 6px rgba(0,0,0,0.03);
          }
          @media (max-width: 768px) {
            .borrow-row-4col {
              grid-template-columns: 1fr 1fr !important;
            }
            .borrow-row-2col {
              grid-template-columns: 1fr !important;
            }
            .inv-card-box {
              padding: 18px !important;
            }
            .inv-top-bar {
              flex-direction: column;
              align-items: stretch !important;
            }
            .inv-action-btns {
              width: 100%;
              display: grid !important;
              grid-template-columns: 1fr 1fr;
              gap: 8px !important;
            }
          }
          @media (max-width: 480px) {
            .borrow-row-4col {
              grid-template-columns: 1fr !important;
            }
            .inv-action-btns {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>

      {/* Pop-up เมื่อกดเพิ่มของลงตะกร้า */}
      {showCartPrompt.show && (
        <div className="modal-overlay" style={{ zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-content" style={{ textAlign: 'center', padding: '32px 24px', maxWidth: '420px', width: '92%' }}>
            <CheckCircle size={56} color="#16a34a" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>เพิ่มลงตะกร้าสำเร็จ!</h3>
            <p style={{ color: '#4b5563', marginBottom: '24px', fontSize: '15px' }}>
              อุปกรณ์ <strong>{showCartPrompt.itemName}</strong> ถูกเพิ่มลงในตะกร้าแล้ว ต้องการทำรายการใดต่อ?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowCartPrompt({ show: false, itemName: '' })}>
                เลือกของชิ้นอื่นต่อ
              </button>
              <button
                className="btn-primary"
                style={{ flex: 1, backgroundColor: '#d97706', borderColor: '#d97706' }}
                onClick={() => {
                  setShowCartPrompt({ show: false, itemName: '' });
                  setViewState('cart');
                }}
              >
                <ShoppingCart size={16} style={{ display: 'inline', marginRight: '6px' }} /> ไปหน้าตะกร้า
              </button>
            </div>
          </div>
        </div>
      )}

      {successModal.show && (
        <div className="modal-overlay" style={{ zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-content" style={{ textAlign: 'center', padding: '32px 24px', maxWidth: '420px', width: '92%' }}>
            <CheckCircle size={56} color="#16a34a" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '20px', marginBottom: '8px', color: '#166534' }}>ดำเนินการสำเร็จ</h3>
            <p style={{ color: '#4b5563', marginBottom: '24px', fontSize: '15px' }}>{successModal.message}</p>
            <button className="btn-primary" style={{ width: '100%', padding: '10px' }} onClick={() => setSuccessModal({ show: false, message: '' })}>
              ตกลง
            </button>
          </div>
        </div>
      )}

      {errorModal.show && (
        <div className="modal-overlay" style={{ zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-content" style={{ textAlign: 'center', padding: '32px 24px', maxWidth: '420px', width: '92%' }}>
            <XCircle size={56} color="#dc2626" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '20px', marginBottom: '8px', color: '#991b1b' }}>แจ้งเตือน</h3>
            <p style={{ color: '#4b5563', marginBottom: '24px', fontSize: '15px' }}>{errorModal.message}</p>
            <button className="btn-secondary" style={{ width: '100%', padding: '10px' }} onClick={() => setErrorModal({ show: false, message: '' })}>
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* Pop-up ยืนยันการทำงาน (แทน window.confirm) */}
      {confirmModal.show && (
        <div className="modal-overlay" style={{ zIndex: 1100, backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-content" style={{ maxWidth: '420px', width: '92%', textAlign: 'center', padding: '32px 24px' }}>
            <AlertTriangle size={56} color="#d97706" style={{ margin: '0 auto 14px' }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#111827' }}>{confirmModal.title}</h3>
            <p style={{ color: '#4b5563', marginBottom: '24px', fontSize: '15px', lineHeight: 1.5 }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}>
                ยกเลิก
              </button>
              <button className="btn-primary" style={{ flex: 1, padding: '10px', backgroundColor: '#dc2626', borderColor: '#dc2626' }} onClick={confirmModal.onConfirm}>
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectModal.show && rejectModal.request && (
        <div className="modal-overlay" style={{ zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-content" style={{ maxWidth: '480px', width: '92%' }}>
            <div className="modal-header">
              <h3 style={{ color: '#991b1b' }}>❌ ระบุเหตุผลที่ไม่อนุมัติการยืม</h3>
              <button className="btn-close" onClick={() => setRejectModal({ show: false, request: null, reason: '' })}><X size={20} /></button>
            </div>
            <form onSubmit={handleAdminRejectSubmit} className="modal-form">
              <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#4b5563' }}>
                รหัสคำขอ: <strong>{rejectModal.request.billId}</strong> ({rejectModal.request.borrowerInfo.fullName})
              </p>
              <div className="form-field">
                <label>สาเหตุที่ไม่อนุมัติ (จะแสดงให้ผู้ยืมเห็นทันที) *</label>
                <textarea
                  required
                  rows={4}
                  className="form-input"
                  placeholder="เช่น อุปกรณ์ต้องใช้ในงานส่วนกลางของคณะในช่วงเวลาดังกล่าว..."
                  value={rejectModal.reason}
                  onChange={e => setRejectModal({ ...rejectModal, reason: e.target.value })}
                />
              </div>
              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={() => setRejectModal({ show: false, request: null, reason: '' })}>ยกเลิก</button>
                <button type="submit" className="btn-primary" style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}>ยืนยันไม่อนุมัติ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header ด้านบนสุด */}
      <div className="inv-top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Package size={24} color="#8b0000" /> บริการยืม-คืนอุปกรณ์
        </h2>

        {currentRole === 'user' && (
          <div className="inv-action-btns" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderColor: viewState === 'my-requests' ? '#8b0000' : '#d1d5db', color: viewState === 'my-requests' ? '#8b0000' : '#374151' }}
              onClick={() => setViewState('my-requests')}
            >
              <FileText size={18} /> คำขอล่าสุดของฉัน {latestMyRequest ? '(1)' : '(0)'}
            </button>
            {borrowerInfo && !activePendingRequest && (
              <button
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#d97706', borderColor: '#d97706' }}
                onClick={() => setViewState('cart')}
              >
                <ShoppingCart size={18} /> ตะกร้าของฉัน
                {cart.length > 0 && (
                  <span style={{ background: 'white', color: '#d97706', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                    {cart.length}
                  </span>
                )}
              </button>
            )}
          </div>
        )}

        {currentRole === 'admin' && (
          <div className="inv-action-btns" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => { setIsCameraOpen(false); setAdminSubTab('assets'); setViewState('catalog'); }}
              style={{
                padding: '9px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px',
                border: adminSubTab === 'assets' && viewState !== 'receipt' ? 'none' : '1px solid #d1d5db',
                backgroundColor: adminSubTab === 'assets' && viewState !== 'receipt' ? '#8b0000' : 'white',
                color: adminSubTab === 'assets' && viewState !== 'receipt' ? 'white' : '#374151'
              }}
            >
              📦 จัดการคลังอุปกรณ์
            </button>
            <button
              onClick={() => { setIsCameraOpen(false); setAdminSubTab('approvals'); setViewState('catalog'); }}
              style={{
                padding: '9px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px',
                border: adminSubTab === 'approvals' && viewState !== 'receipt' ? 'none' : '1px solid #d1d5db',
                backgroundColor: adminSubTab === 'approvals' && viewState !== 'receipt' ? '#8b0000' : 'white',
                color: adminSubTab === 'approvals' && viewState !== 'receipt' ? 'white' : '#374151',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              📋 คำขอรออนุมัติ
              {pendingCount > 0 && (
                <span style={{ backgroundColor: '#dc2626', color: 'white', padding: '2px 8px', borderRadius: '999px', fontSize: '12px' }}>
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => { setAdminSubTab('scanner'); setViewState('catalog'); }}
              style={{
                padding: '9px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px',
                border: adminSubTab === 'scanner' && viewState !== 'receipt' ? 'none' : '1px solid #d1d5db',
                backgroundColor: adminSubTab === 'scanner' && viewState !== 'receipt' ? '#8b0000' : 'white',
                color: adminSubTab === 'scanner' && viewState !== 'receipt' ? 'white' : '#374151',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <QrCode size={18} /> สแกน/ค้นหารหัส ENT
            </button>
            {adminSubTab === 'assets' && viewState !== 'receipt' && (
              <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '14px' }} onClick={handleOpenAddModal}>
                <Plus size={18} /> เพิ่มอุปกรณ์ใหม่
              </button>
            )}
          </div>
        )}
      </div>

      {/* ล็อกการยืมซ้ำหากมีคำขอรออนุมัติค้างอยู่ */}
      {currentRole === 'user' && activePendingRequest && viewState !== 'my-requests' && viewState !== 'receipt' && (
        <div style={{ maxWidth: '750px', margin: '20px auto', backgroundColor: '#fffbeb', border: '2px solid #f59e0b', borderRadius: '14px', padding: '24px 20px', textAlign: 'center' }}>
          <Clock size={52} color="#d97706" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#92400e' }}>คุณมีคำขอยืมอุปกรณ์ที่กำลังรอผู้ดูแลอนุมัติ</h3>
          <p style={{ margin: '0 0 20px 0', color: '#78350f', fontSize: '15px', lineHeight: '1.6' }}>
            รหัสคำขอปัจจุบันของคุณคือ <strong>{activePendingRequest.billId}</strong><br />
            ผู้ใช้งานจะไม่สามารถทำรายการยืมใหม่ซ้ำได้ จนกว่าผู้ดูแลจะพิจารณาอนุมัติ/ปฏิเสธ หรือคุณกดยกเลิกคำขอปัจจุบัน
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => setViewState('my-requests')} style={{ backgroundColor: '#d97706', borderColor: '#d97706' }}>
              ดูรายละเอียดคำขอล่าสุด
            </button>
            <button
              onClick={() => handleUserCancelRequest(activePendingRequest)}
              style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              ยกเลิกคำขอยืมนี้
            </button>
          </div>
        </div>
      )}

      {/* STEP 1 & 2: หน้าแรกกรอกข้อมูลผู้ยืม + วันเวลายืมคืน */}
      {currentRole === 'user' && !activePendingRequest && viewState === 'user-form' && (
        <div style={{ maxWidth: '940px', margin: '0 auto' }}>
          <div style={{ backgroundColor: '#fef2f2', borderLeft: '4px solid #dc2626', padding: '16px', borderRadius: '6px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <AlertCircle color="#dc2626" size={24} style={{ flexShrink: 0 }} />
            <p style={{ margin: 0, color: '#991b1b', fontSize: '14px' }}>
              กรุณากรอกข้อมูลผู้ยืมและระบุช่วงเวลาการยืม-คืน รวมถึงระยะเวลาจัดกิจกรรมให้ครบถ้วน ระบบจะบันทึกข้อมูลทุกช่องลงในฐานข้อมูลโดยตรง
            </p>
          </div>

          <form onSubmit={handleSubmitUserInfo} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="inv-card-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
                <UserIcon size={22} color="#8b0000" />
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', margin: 0 }}>ข้อมูลผู้ยืม</h3>
              </div>

              <div className="borrow-row-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-field">
                  <label>ชื่อ-นามสกุล *</label>
                  <input type="text" className="form-input" required value={userInfoForm.fullName} disabled />
                </div>
                <div className="form-field">
                  <label>เบอร์โทรศัพท์ *</label>
                  <input
                    type="tel"
                    className="form-input"
                    required
                    placeholder="เช่น 08xxxxxxxx"
                    value={userInfoForm.phone}
                    onChange={e => setUserInfoForm({ ...userInfoForm, phone: e.target.value.replace(/\D/g, '') })}
                    maxLength={10}
                  />
                </div>
                <div className="form-field">
                  <label>อีเมล (รับการแจ้งเตือน) *</label>
                  <input type="email" className="form-input" required value={userInfoForm.email} disabled />
                </div>
                <div className="form-field">
                  <label>รหัสนักศึกษา/บุคลากร *</label>
                  <input type="text" className="form-input" required value={userInfoForm.studentId} disabled />
                </div>
                <div className="form-field">
                  <label>คณะ/สังกัด *</label>
                  <input type="text" className="form-input" required value={userInfoForm.faculty} disabled />
                </div>
                <div className="form-field">
                  <label>ชมรม/หน่วยงาน *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="ระบุชมรมหรือหน่วยงานของคุณ..."
                    value={userInfoForm.club}
                    onChange={e => setUserInfoForm({ ...userInfoForm, club: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>ชื่อโครงการหรือกิจกรรม *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="เช่น โครงการค่ายอาสา, งานกีฬาสี..."
                    value={userInfoForm.projectName}
                    onChange={e => setUserInfoForm({ ...userInfoForm, projectName: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>วัตถุประสงค์นำไปใช้งาน *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="เช่น ใช้ประสานงานและจัดกิจกรรม..."
                    value={userInfoForm.purpose}
                    onChange={e => setUserInfoForm({ ...userInfoForm, purpose: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="inv-card-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
                <Clock size={22} color="#8b0000" />
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', margin: 0 }}>ช่วงเวลาการยืม-คืน และวันจัดกิจกรรม</h3>
              </div>

              <div className="borrow-row-4col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div className="form-field">
                  <label>วันที่ยืม *</label>
                  <DatePicker
                    selected={moment(userInfoForm.borrowDate, 'YYYY-MM-DD').toDate()}
                    onChange={(date: Date | null) => {
                      if (date) {
                        const nextBorrow = moment(date).format('YYYY-MM-DD');
                        setUserInfoForm(prev => {
                          const nextReturn = moment(prev.returnDate).isBefore(nextBorrow) ? nextBorrow : prev.returnDate;
                          let nextEvStart = prev.eventStartDate;
                          let nextEvEnd = prev.eventEndDate;
                          if (moment(nextEvStart).isBefore(nextBorrow)) nextEvStart = nextBorrow;
                          if (moment(nextEvStart).isAfter(nextReturn)) nextEvStart = nextReturn;
                          if (moment(nextEvEnd).isBefore(nextEvStart)) nextEvEnd = nextEvStart;
                          if (moment(nextEvEnd).isAfter(nextReturn)) nextEvEnd = nextReturn;

                          return {
                            ...prev,
                            borrowDate: nextBorrow,
                            returnDate: nextReturn,
                            eventStartDate: nextEvStart,
                            eventEndDate: nextEvEnd
                          };
                        });
                      }
                    }}
                    minDate={new Date()}
                    locale="th"
                    customInput={<CustomThaiDateInput displayText={formatToShortThaiDate(userInfoForm.borrowDate)} />}
                    renderCustomHeader={({ date, decreaseMonth, increaseMonth }) => (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px', margin: '8px 0' }}>
                        <button type="button" onClick={decreaseMonth} style={{ cursor: 'pointer', border: 'none', background: '#f3f4f6', padding: '4px 10px', borderRadius: '4px' }}>{'<'}</button>
                        <strong>{moment(date).format('MMMM')} {date.getFullYear() + 543}</strong>
                        <button type="button" onClick={increaseMonth} style={{ cursor: 'pointer', border: 'none', background: '#f3f4f6', padding: '4px 10px', borderRadius: '4px' }}>{'>'}</button>
                      </div>
                    )}
                  />
                </div>

                <div className="form-field">
                  <label>เวลาที่ยืม *</label>
                  <select className="form-input" value={userInfoForm.borrowTime} onChange={e => setUserInfoForm({ ...userInfoForm, borrowTime: e.target.value })}>
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t} น.</option>)}
                  </select>
                </div>

                <div className="form-field">
                  <label>วันที่คืน *</label>
                  <DatePicker
                    selected={moment(userInfoForm.returnDate, 'YYYY-MM-DD').toDate()}
                    onChange={(date: Date | null) => {
                      if (date) {
                        const nextReturn = moment(date).format('YYYY-MM-DD');
                        setUserInfoForm(prev => {
                          let nextEvStart = prev.eventStartDate;
                          let nextEvEnd = prev.eventEndDate;
                          if (moment(nextEvStart).isAfter(nextReturn)) nextEvStart = nextReturn;
                          if (moment(nextEvEnd).isAfter(nextReturn)) nextEvEnd = nextReturn;
                          if (moment(nextEvEnd).isBefore(nextEvStart)) nextEvEnd = nextEvStart;

                          return {
                            ...prev,
                            returnDate: nextReturn,
                            eventStartDate: nextEvStart,
                            eventEndDate: nextEvEnd
                          };
                        });
                      }
                    }}
                    minDate={moment(userInfoForm.borrowDate, 'YYYY-MM-DD').toDate()}
                    locale="th"
                    customInput={<CustomThaiDateInput displayText={formatToShortThaiDate(userInfoForm.returnDate)} />}
                    renderCustomHeader={({ date, decreaseMonth, increaseMonth }) => (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px', margin: '8px 0' }}>
                        <button type="button" onClick={decreaseMonth} style={{ cursor: 'pointer', border: 'none', background: '#f3f4f6', padding: '4px 10px', borderRadius: '4px' }}>{'<'}</button>
                        <strong>{moment(date).format('MMMM')} {date.getFullYear() + 543}</strong>
                        <button type="button" onClick={increaseMonth} style={{ cursor: 'pointer', border: 'none', background: '#f3f4f6', padding: '4px 10px', borderRadius: '4px' }}>{'>'}</button>
                      </div>
                    )}
                  />
                </div>

                <div className="form-field">
                  <label>เวลาที่คืน *</label>
                  <select className="form-input" value={userInfoForm.returnTime} onChange={e => setUserInfoForm({ ...userInfoForm, returnTime: e.target.value })}>
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t} น.</option>)}
                  </select>
                </div>
              </div>

              <div className="borrow-row-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-field">
                  <label>วันที่เริ่มจัดกิจกรรม *</label>
                  <DatePicker
                    selected={moment(userInfoForm.eventStartDate, 'YYYY-MM-DD').toDate()}
                    onChange={(date: Date | null) => {
                      if (date) {
                        const formatted = moment(date).format('YYYY-MM-DD');
                        setUserInfoForm(prev => ({
                          ...prev,
                          eventStartDate: formatted,
                          eventEndDate: moment(prev.eventEndDate).isBefore(formatted) ? formatted : prev.eventEndDate
                        }));
                      }
                    }}
                    minDate={moment(userInfoForm.borrowDate, 'YYYY-MM-DD').toDate()}
                    maxDate={moment(userInfoForm.returnDate, 'YYYY-MM-DD').toDate()}
                    locale="th"
                    customInput={<CustomThaiDateInput displayText={formatToShortThaiDate(userInfoForm.eventStartDate)} />}
                    renderCustomHeader={({ date, decreaseMonth, increaseMonth }) => (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px', margin: '8px 0' }}>
                        <button type="button" onClick={decreaseMonth} style={{ cursor: 'pointer', border: 'none', background: '#f3f4f6', padding: '4px 10px', borderRadius: '4px' }}>{'<'}</button>
                        <strong>{moment(date).format('MMMM')} {date.getFullYear() + 543}</strong>
                        <button type="button" onClick={increaseMonth} style={{ cursor: 'pointer', border: 'none', background: '#f3f4f6', padding: '4px 10px', borderRadius: '4px' }}>{'>'}</button>
                      </div>
                    )}
                  />
                </div>

                <div className="form-field">
                  <label>วันที่สิ้นสุดจัดกิจกรรม *</label>
                  <DatePicker
                    selected={moment(userInfoForm.eventEndDate, 'YYYY-MM-DD').toDate()}
                    onChange={(date: Date | null) => {
                      if (date) setUserInfoForm(prev => ({ ...prev, eventEndDate: moment(date).format('YYYY-MM-DD') }));
                    }}
                    minDate={moment(userInfoForm.eventStartDate, 'YYYY-MM-DD').toDate()}
                    maxDate={moment(userInfoForm.returnDate, 'YYYY-MM-DD').toDate()}
                    locale="th"
                    customInput={<CustomThaiDateInput displayText={formatToShortThaiDate(userInfoForm.eventEndDate)} />}
                    renderCustomHeader={({ date, decreaseMonth, increaseMonth }) => (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px', margin: '8px 0' }}>
                        <button type="button" onClick={decreaseMonth} style={{ cursor: 'pointer', border: 'none', background: '#f3f4f6', padding: '4px 10px', borderRadius: '4px' }}>{'<'}</button>
                        <strong>{moment(date).format('MMMM')} {date.getFullYear() + 543}</strong>
                        <button type="button" onClick={increaseMonth} style={{ cursor: 'pointer', border: 'none', background: '#f3f4f6', padding: '4px 10px', borderRadius: '4px' }}>{'>'}</button>
                      </div>
                    )}
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: '18px', fontWeight: 'bold' }}>
              บันทึกข้อมูลและเข้าสู่หน้าเลือกยืมอุปกรณ์ →
            </button>
          </form>
        </div>
      )}

      {/* ADMIN: หน้าจัดการคำขอรออนุมัติ */}
      {currentRole === 'admin' && adminSubTab === 'approvals' && viewState !== 'receipt' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="inv-card-box">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', color: '#111827' }}>📋 รายการคำขอยืมอุปกรณ์ทั้งหมด ({allGroupedRequests.length} คำขอ)</h3>
            {allGroupedRequests.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>ยังไม่มีรายการคำขอยืมอุปกรณ์ในระบบ</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {allGroupedRequests.map((req) => (
                  <div key={req.billId} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', backgroundColor: req.status === 'pending' ? '#fffbeb' : 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px', marginBottom: '12px' }}>
                      <div>
                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#8b0000', marginRight: '12px' }}>{req.billId}</span>
                        <span style={{ fontSize: '13px', color: '#6b7280' }}>ยื่นเมื่อ: {formatThaiDateTime(req.createdAt)}</span>
                      </div>
                      <div>
                        {req.status === 'pending' && <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '6px 12px', borderRadius: '999px', fontWeight: 'bold', fontSize: '13px' }}>⏳ รอผู้ดูแลอนุมัติ</span>}
                        {req.status === 'approved' && <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '6px 12px', borderRadius: '999px', fontWeight: 'bold', fontSize: '13px' }}>✅ อนุมัติแล้ว (รอรับของ)</span>}
                        {req.status === 'borrowed' && <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '6px 12px', borderRadius: '999px', fontWeight: 'bold', fontSize: '13px' }}>📦 รับของไปแล้ว (กำลังยืม)</span>}
                        {req.status === 'returned' && <span style={{ backgroundColor: '#f3f4f6', color: '#4b5563', padding: '6px 12px', borderRadius: '999px', fontWeight: 'bold', fontSize: '13px' }}>✔️ คืนอุปกรณ์แล้ว</span>}
                        {req.status === 'rejected' && <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '6px 12px', borderRadius: '999px', fontWeight: 'bold', fontSize: '13px' }}>❌ ไม่อนุมัติ</span>}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px', fontSize: '14px', marginBottom: '16px', color: '#374151' }}>
                      <div><strong>ผู้ยืม:</strong> {req.borrowerInfo.fullName} ({req.borrowerInfo.studentId})</div>
                      <div><strong>เบอร์โทร:</strong> {req.borrowerInfo.phone}</div>
                      <div><strong>หน่วยงาน/ชมรม:</strong> {req.borrowerInfo.club}</div>
                      <div><strong>โครงการ:</strong> {req.borrowerInfo.projectName}</div>
                      <div><strong>วันจัดกิจกรรม:</strong> {formatEventDateRange(req.borrowerInfo.eventStartDate, req.borrowerInfo.eventEndDate)}</div>
                      <div style={{ gridColumn: '1 / -1' }}><strong>วัตถุประสงค์:</strong> {req.borrowerInfo.purpose}</div>
                    </div>

                    <div style={{ backgroundColor: '#f9fafb', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
                      <strong style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>รายการอุปกรณ์ที่ขอยืม:</strong>
                      {req.items.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '14px', padding: '4px 0', borderBottom: idx !== req.items.length - 1 ? '1px dashed #e5e7eb' : 'none' }}>
                          <span>• {item.assetName} (#{item.assetId}) <strong>x {item.quantity} ชิ้น</strong></span>
                          <span style={{ color: '#4b5563' }}>{formatThaiDateTime(item.borrowDate)} ถึง {formatThaiDateTime(item.returnDate)}</span>
                        </div>
                      ))}
                    </div>

                    {req.status === 'rejected' && req.rejectReason && (
                      <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', marginBottom: '12px' }}>
                        <strong>เหตุผลที่ไม่อนุมัติ:</strong> {req.rejectReason}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {req.status === 'pending' && (
                        <>
                          <button
                            onClick={() => setRejectModal({ show: true, request: req, reason: '' })}
                            style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Ban size={16} /> ไม่อนุมัติ (ระบุเหตุผล)
                          </button>
                          <button
                            onClick={() => handleAdminApprove(req)}
                            style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Check size={16} /> อนุมัติคำขอนี้
                          </button>
                        </>
                      )}
                      {(req.status === 'approved' || req.status === 'borrowed') && (
                        <>
                          <button
                            onClick={() => handleExecuteQrScan(req)}
                            style={{ backgroundColor: req.status === 'approved' ? '#2563eb' : '#059669', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <ScanLine size={16} /> {req.status === 'approved' ? 'สแกนส่งมอบของ' : 'สแกนรับคืนของ'}
                          </button>
                          <button
                            onClick={() => handleOpenReceiptView(req)}
                            className="btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Printer size={16} /> แสดงเอกสารใบยืม
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADMIN: หน้าสแกนด้วยกล้องมือถือ/โน้ตบุ๊ก หรือ ค้นหารหัส ENT */}
      {currentRole === 'admin' && adminSubTab === 'scanner' && viewState !== 'receipt' && (
        <div className="inv-card-box" style={{ maxWidth: '720px', margin: '0 auto' }}>
          <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#8b0000' }}>
            <QrCode size={24} /> สแกน QR Code ด้วยกล้อง / ค้นหารหัสอ้างอิง (ENT...)
          </h3>
          <p style={{ color: '#4b5563', fontSize: '14px', marginBottom: '20px' }}>
            สามารถกดเปิดกล้องมือถือหรือเว็บแคมโน้ตบุ๊กเพื่อส่องสแกน QR Code บนใบยืมของนักศึกษา หรือพิมพ์ค้นหารหัสอ้างอิงด้านล่างได้เลยครับ
          </p>

          <div style={{ marginBottom: '24px', textAlign: 'center', backgroundColor: '#f9fafb', padding: '20px', borderRadius: '12px', border: '1px dashed #d1d5db' }}>
            <button
              type="button"
              onClick={() => setIsCameraOpen(!isCameraOpen)}
              className="btn-primary"
              style={{
                backgroundColor: isCameraOpen ? '#dc2626' : '#16a34a',
                borderColor: isCameraOpen ? '#dc2626' : '#16a34a',
                padding: '12px 24px',
                fontSize: '15px',
                fontWeight: 'bold',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '10px'
              }}
            >
              {isCameraOpen ? <CameraOff size={20} /> : <Camera size={20} />}
              {isCameraOpen ? 'ปิดกล้องสแกน QR Code' : '📷 เปิดกล้องส่องสแกน QR Code (มือถือ/โน้ตบุ๊ก)'}
            </button>

            {isCameraOpen && (
              <div style={{ marginTop: '16px' }}>
                <div
                  id="qr-reader-box"
                  style={{
                    width: '100%',
                    maxWidth: '380px',
                    margin: '0 auto',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '3px solid #16a34a',
                    backgroundColor: '#000'
                  }}
                />
                <p style={{ fontSize: '13px', color: '#166534', marginTop: '8px', fontWeight: 'bold' }}>
                  🔍 นำ QR Code มาวางในกรอบสี่เหลี่ยม ระบบจะตัดรับของ/คืนของให้อัตโนมัติทันที
                </p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="หรือพิมพ์รหัสอ้างอิง เช่น ENTrent1234..."
                value={scanQuery}
                onChange={e => setScanQuery(e.target.value)}
                style={{ width: '100%', paddingLeft: '16px', fontSize: '16px' }}
              />
            </div>
            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Search size={18} /> ค้นหา
            </button>
          </div>

          {scanQuery.trim() !== '' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {scannedResults.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#991b1b', backgroundColor: '#fef2f2', borderRadius: '8px' }}>
                  ไม่พบรหัสอ้างอิง "{scanQuery}" ในระบบ
                </div>
              ) : (
                scannedResults.map(req => (
                  <div key={req.billId} style={{ border: '2px solid #16a34a', borderRadius: '12px', padding: '20px', backgroundColor: '#f0fdf4' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                      <strong style={{ fontSize: '18px', color: '#166534' }}>รหัสอ้างอิง: {req.billId}</strong>
                      <span style={{ fontWeight: 'bold', color: '#111827' }}>
                        สถานะ: {req.status === 'approved' ? '✅ อนุมัติแล้ว (รอรับของ)' : req.status === 'borrowed' ? '📦 กำลังยืม (รอคืนของ)' : req.status}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0', fontSize: '14px' }}><strong>ผู้ยืม:</strong> {req.borrowerInfo.fullName} ({req.borrowerInfo.studentId}) | <strong>โทร:</strong> {req.borrowerInfo.phone}</p>
                    <p style={{ margin: '4px 0', fontSize: '14px' }}><strong>ชมรม/หน่วยงาน:</strong> {req.borrowerInfo.club} | <strong>โครงการ:</strong> {req.borrowerInfo.projectName}</p>
                    <p style={{ margin: '4px 0 16px 0', fontSize: '14px' }}><strong>ยื่นเมื่อ:</strong> {formatThaiDateTime(req.createdAt)}</p>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {req.status !== 'returned' && req.status !== 'rejected' && (
                        <button
                          onClick={() => handleExecuteQrScan(req)}
                          className="btn-primary"
                          style={{ flex: 1, minWidth: '180px', backgroundColor: '#2563eb', borderColor: '#2563eb', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                        >
                          <ScanLine size={18} /> ยืนยันสแกน (รับของ / คืนของ)
                        </button>
                      )}
                      <button
                        className="btn-secondary"
                        onClick={() => handleOpenReceiptView(req)}
                        style={{ flex: 1, minWidth: '180px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', backgroundColor: 'white' }}
                      >
                        <FileText size={18} /> แสดงเอกสารใบยืมทันที
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* STEP 3: หน้าเลือกอุปกรณ์ (Catalog - ใช้ INVENTORY_IMAGE_SIZES.catalogCardImage) */}
      {viewState === 'catalog' && ((currentRole === 'user' && !activePendingRequest) || (currentRole === 'admin' && adminSubTab === 'assets')) && (
        <>
          {currentRole === 'user' && borrowerInfo && (
            <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderLeft: '4px solid #8b0000', borderRadius: '10px', padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
                <div><strong>ผู้ยืม:</strong> {borrowerInfo.fullName} | <strong>ชมรม/หน่วยงาน:</strong> {borrowerInfo.club} | <strong>โครงการ:</strong> {borrowerInfo.projectName}</div>
                <div><strong>วันจัดกิจกรรม:</strong> {formatEventDateRange(borrowerInfo.eventStartDate, borrowerInfo.eventEndDate)}</div>
                <div style={{ color: '#8b0000', fontWeight: 'bold' }}>
                  ⏰ ช่วงเวลายืม-คืน: {formatToShortThaiDate(borrowerInfo.borrowDate)} ({borrowerInfo.borrowTime} น.) ถึง {formatToShortThaiDate(borrowerInfo.returnDate)} ({borrowerInfo.returnTime} น.)
                </div>
              </div>
              <button onClick={() => setViewState('user-form')} className="btn-secondary" style={{ fontSize: '13px', padding: '8px 14px' }}>
                ✏️ แก้ไขข้อมูล / เปลี่ยนวันเวลา
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', color: '#6b7280', marginRight: '4px' }}><Filter size={18} /></div>
            {CATEGORIES.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                style={{ padding: '6px 16px', borderRadius: '9999px', border: selectedCategory === category ? '1px solid #8b0000' : '1px solid #e5e7eb', backgroundColor: selectedCategory === category ? '#8b0000' : 'white', color: selectedCategory === category ? 'white' : '#4b5563', fontSize: '14px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {category}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
            {filteredAssets.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#6b7280' }}>ไม่พบอุปกรณ์ในหมวดหมู่นี้</div>
            ) : (
              filteredAssets.map((item) => {
                const cartItem = cart.find(c => c.asset.id === item.id);
                const displayAvailable = item.availableQuantity - (cartItem ? cartItem.quantity : 0);

                return (
                  <div key={item.id} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    {currentRole === 'admin' && (
                      <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px', zIndex: 5 }}>
                        <button onClick={() => handleOpenEditModal(item)} style={{ background: 'white', border: 'none', padding: '6px', borderRadius: '50%', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', color: '#3730a3' }}><Edit size={16} /></button>
                        <button onClick={() => handleDelete(item.id)} style={{ background: 'white', border: 'none', padding: '6px', borderRadius: '50%', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', color: '#ef4444' }}><Trash2 size={16} /></button>
                      </div>
                    )}

                    <div style={{ backgroundColor: INVENTORY_IMAGE_SIZES.catalogCardImage.backgroundColor, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderBottom: '1px solid #f3f4f6' }}>
                      <img
                        src={item.imageUrl || DEFAULT_ITEM_IMG}
                        alt={item.name}
                        style={{
                          width: INVENTORY_IMAGE_SIZES.catalogCardImage.width,
                          aspectRatio: INVENTORY_IMAGE_SIZES.catalogCardImage.aspectRatio,
                          height: INVENTORY_IMAGE_SIZES.catalogCardImage.height,
                          objectFit: INVENTORY_IMAGE_SIZES.catalogCardImage.objectFit
                        }}
                        onError={handleImageError}
                      />
                    </div>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>#{item.id} • {item.category}</div>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 12px 0', color: '#111827' }}>{item.name}</h3>
                      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', color: displayAvailable > 0 ? '#166534' : '#991b1b', fontWeight: 'bold', backgroundColor: displayAvailable > 0 ? '#dcfce7' : '#fee2e2', padding: '4px 8px', borderRadius: '6px' }}>
                          เหลือ {displayAvailable} ชิ้น
                        </span>
                      </div>

                      {currentRole === 'user' && (
                        <button
                          className="btn-primary"
                          style={{ marginTop: '16px', width: '100%', opacity: displayAvailable > 0 && item.status === 'available' ? 1 : 0.5 }}
                          disabled={displayAvailable <= 0 || item.status !== 'available'}
                          onClick={() => handleSelectAsset(item)}
                        >
                          {displayAvailable > 0 && item.status === 'available' ? 'เลือกยืมอุปกรณ์นี้' : 'ของหมด/ปิดยืม'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* หน้าดูตารางคิวว่างและระบุจำนวนชิ้น */}
      {viewState === 'booking' && selectedAsset && borrowerInfo && !activePendingRequest && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <button onClick={() => setViewState('catalog')} style={{ backgroundColor: '#1f2937', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 'bold', width: 'fit-content' }}>
            <ArrowLeft size={20} /> กลับไปหน้าเลือกของ
          </button>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ flex: '2 1 320px', backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', minHeight: '480px', overflowX: 'auto' }}>
              <h3 style={{ marginTop: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><CalendarIcon size={20} /> ตารางคิวการยืม: {selectedAsset.name}</h3>
              <Calendar
                localizer={localizer}
                events={borrowEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '420px', minWidth: '300px' }}
                date={currentDate}
                onNavigate={(newDate) => setCurrentDate(newDate)}
                view={currentView}
                onView={(newView) => setCurrentView(newView)}
                formats={{
                  monthHeaderFormat: (date: Date) => `${moment(date).format('MMMM')} ${date.getFullYear() + 543}`,
                  dayHeaderFormat: (date: Date) => `${moment(date).format('DD MMM')} ${date.getFullYear() + 543}`,
                  dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) => `${moment(start).format('DD MMM')} - ${moment(end).format('DD MMM')} ${end.getFullYear() + 543}`
                }}
                eventPropGetter={(event: BorrowEvent) => ({ style: { backgroundColor: event.color || '#3174ad', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', border: 'none', color: 'white', display: 'block' } })}
                messages={{ next: 'ถัดไป', previous: 'ย้อนกลับ', today: 'วันนี้', month: 'เดือน', week: 'สัปดาห์', day: 'วัน', agenda: 'กำหนดการ', date: 'วันที่', time: 'เวลา', event: 'กิจกรรม', noEventsInRange: 'ไม่มีการยืมในช่วงนี้', showMore: total => `+ ดูเพิ่มอีก ${total}` }}
              />
            </div>

            <div style={{ flex: '1 1 280px', backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', height: 'fit-content' }}>
              <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#8b0000' }}>📝 ระบุจำนวนที่ต้องการยืม</h3>
              <form onSubmit={handleAddToCart} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ backgroundColor: '#f9fafb', padding: '14px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>{selectedAsset.name}</div>
                  <div style={{ fontSize: '14px', color: '#166534', fontWeight: 'bold' }}>โควต้าคงเหลือ: {selectedAsset.availableQuantity} ชิ้น</div>
                </div>

                <div style={{ backgroundColor: '#fffbeb', padding: '14px', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '13px', color: '#92400e', lineHeight: '1.6' }}>
                  <strong>กำหนดการยืม-คืนของคุณ:</strong><br />
                  • ยืม: {formatToShortThaiDate(borrowerInfo.borrowDate)} เวลา {borrowerInfo.borrowTime} น.<br />
                  • คืน: {formatToShortThaiDate(borrowerInfo.returnDate)} เวลา {borrowerInfo.returnTime} น.
                </div>

                <div className="form-field">
                  <label>จำนวนที่ต้องการยืม (ชิ้น) *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    max={selectedAsset.availableQuantity}
                    className="form-input"
                    value={selectedQuantity}
                    onChange={e => setSelectedQuantity(parseInt(e.target.value, 10) || 1)}
                  />
                </div>

                <button type="submit" className="btn-primary" style={{ marginTop: '8px', padding: '14px', fontSize: '16px', fontWeight: 'bold' }}>
                  + เพิ่มลงตะกร้า
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* หน้าสรุปตะกร้าสินค้า (ใช้ INVENTORY_IMAGE_SIZES.cartThumbnail) */}
      {viewState === 'cart' && !activePendingRequest && (
        <div className="inv-card-box" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '24px', borderBottom: '2px solid #f3f4f6', paddingBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShoppingCart color="#8b0000" size={24} /> สรุปรายการในตะกร้า
              <span style={{ fontSize: '14px', backgroundColor: '#fee2e2', color: '#991b1b', padding: '4px 12px', borderRadius: '999px' }}>{cart.length} รายการ</span>
            </h3>
            <button onClick={() => setViewState('catalog')} style={{ background: 'none', border: 'none', color: '#d97706', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>+ เลือกของเพิ่ม</button>
          </div>

          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
              <Package size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
              <p style={{ fontSize: '18px' }}>ตะกร้าว่างเปล่าครับ กลับไปเลือกของที่หน้ารายการก่อนนะ</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                {cart.map((item, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', padding: '16px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                      <img
                        src={item.asset.imageUrl || DEFAULT_ITEM_IMG}
                        alt={item.asset.name}
                        style={{
                          width: INVENTORY_IMAGE_SIZES.cartThumbnail.width,
                          height: INVENTORY_IMAGE_SIZES.cartThumbnail.height,
                          objectFit: INVENTORY_IMAGE_SIZES.cartThumbnail.objectFit,
                          backgroundColor: INVENTORY_IMAGE_SIZES.cartThumbnail.backgroundColor,
                          borderRadius: '8px',
                          border: '1px solid #d1d5db'
                        }}
                        onError={handleImageError}
                      />
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#111827', marginBottom: '4px' }}>
                          {item.asset.name} <span style={{ color: '#8b0000', fontSize: '14px' }}>(จำนวน {item.quantity} ชิ้น)</span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#4b5563', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span><strong>ยืม:</strong> {formatThaiDateTime(item.borrowDate)}</span>
                          <span><strong>คืน:</strong> {formatThaiDateTime(item.returnDate)}</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(index)} style={{ background: 'white', color: '#ef4444', border: '1px solid #fca5a5', padding: '10px', borderRadius: '8px', cursor: 'pointer' }} title="ลบรายการนี้">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={handleCheckout} className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: '17px', fontWeight: 'bold' }}>
                ยืนยันส่งคำขอยืมอุปกรณ์ (เพื่อรอผู้ดูแลอนุมัติ)
              </button>
            </>
          )}
        </div>
      )}

      {/* STEP 4: หน้าติดตามสถานะคำขอล่าสุดของฉัน */}
      {viewState === 'my-requests' && (
        <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '20px', color: '#111827' }}>คำขอยืมอุปกรณ์ล่าสุดของฉัน</h3>
            {!activePendingRequest && (
              <button className="btn-secondary" onClick={() => setViewState(borrowerInfo ? 'catalog' : 'user-form')}>
                ← ไปหน้าทำรายการยืมใหม่
              </button>
            )}
          </div>

          {!latestMyRequest ? (
            <div style={{ backgroundColor: 'white', padding: '50px 20px', borderRadius: '12px', textAlign: 'center', color: '#6b7280', border: '1px solid #e5e7eb' }}>
              ยังไม่มีคำขอยืมอุปกรณ์ล่าสุดของคุณในขณะนี้
            </div>
          ) : (
            <div className="inv-card-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: '16px', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#8b0000' }}>รหัสอ้างอิง: {latestMyRequest.billId}</div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    ยื่นเมื่อ: <strong>{formatThaiDateTime(latestMyRequest.createdAt)}</strong>
                  </div>
                </div>
                <div>
                  {latestMyRequest.status === 'pending' && (
                    <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '8px 16px', borderRadius: '999px', fontWeight: 'bold', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={16} /> รอผู้ดูแลอนุมัติ
                    </span>
                  )}
                  {(latestMyRequest.status === 'approved' || latestMyRequest.status === 'borrowed') && (
                    <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '8px 16px', borderRadius: '999px', fontWeight: 'bold', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle size={16} /> อนุมัติแล้ว (พร้อมพิมพ์เอกสาร)
                    </span>
                  )}
                  {latestMyRequest.status === 'returned' && (
                    <span style={{ backgroundColor: '#f3f4f6', color: '#374151', padding: '8px 16px', borderRadius: '999px', fontWeight: 'bold', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle size={16} /> คืนอุปกรณ์เรียบร้อยแล้ว
                    </span>
                  )}
                  {latestMyRequest.status === 'rejected' && (
                    <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '8px 16px', borderRadius: '999px', fontWeight: 'bold', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <XCircle size={16} /> ผู้ดูแลไม่อนุมัติการยืม
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px', fontSize: '14px', marginBottom: '16px', color: '#374151', backgroundColor: '#fdf8f8', padding: '14px', borderRadius: '8px', border: '1px solid #fee2e2' }}>
                <div><strong>ผู้ยืม:</strong> {latestMyRequest.borrowerInfo.fullName} ({latestMyRequest.borrowerInfo.studentId})</div>
                <div><strong>เบอร์โทรศัพท์:</strong> {latestMyRequest.borrowerInfo.phone}</div>
                <div><strong>ชมรม/หน่วยงาน:</strong> {latestMyRequest.borrowerInfo.club}</div>
                <div><strong>ชื่อโครงการ:</strong> {latestMyRequest.borrowerInfo.projectName}</div>
                <div><strong>วันจัดกิจกรรม:</strong> {formatEventDateRange(latestMyRequest.borrowerInfo.eventStartDate, latestMyRequest.borrowerInfo.eventEndDate)}</div>
                <div style={{ gridColumn: '1 / -1' }}><strong>วัตถุประสงค์:</strong> {latestMyRequest.borrowerInfo.purpose}</div>
              </div>

              <div style={{ backgroundColor: '#f9fafb', padding: '14px 18px', borderRadius: '10px', marginBottom: '16px' }}>
                {latestMyRequest.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', padding: '6px 0', fontSize: '14px', borderBottom: idx !== latestMyRequest.items.length - 1 ? '1px dashed #e5e7eb' : 'none' }}>
                    <span><strong>{item.assetName}</strong> (#{item.assetId}) จำนวน <strong>{item.quantity} ชิ้น</strong></span>
                    <span style={{ color: '#4b5563' }}>{formatThaiDateTime(item.borrowDate)} - {formatThaiDateTime(item.returnDate)}</span>
                  </div>
                ))}
              </div>

              {latestMyRequest.status === 'pending' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '14px 16px', borderRadius: '8px', fontSize: '14px' }}>
                  <span>⏳ คำขอของคุณอยู่ระหว่างรอผู้ดูแลตรวจสอบ</span>
                  <button
                    onClick={() => handleUserCancelRequest(latestMyRequest)}
                    style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                  >
                    ยกเลิกคำขอยืมนี้
                  </button>
                </div>
              )}

              {latestMyRequest.status === 'rejected' && (
                <div style={{ backgroundColor: '#fef2f2', borderLeft: '4px solid #dc2626', color: '#991b1b', padding: '16px', borderRadius: '6px', fontSize: '15px' }}>
                  <strong>❌ ผู้ดูแลไม่อนุมัติการยืม เนื่องจาก:</strong> {latestMyRequest.rejectReason || 'ไม่ผ่านเกณฑ์การพิจารณาของผู้ดูแลระบบ'}
                </div>
              )}

              {(latestMyRequest.status === 'approved' || latestMyRequest.status === 'borrowed') && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleOpenReceiptView(latestMyRequest)}
                    className="btn-primary"
                    style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '16px', fontWeight: 'bold', width: '100%', justifyContent: 'center' }}
                  >
                    <Printer size={20} /> เปิดดูและพิมพ์เอกสารใบยืม (พร้อม QR Code)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* STEP 5: หน้าพรีวิวเอกสารใบยืม */}
      {viewState === 'receipt' && activeReceipt && (
        <div style={{ maxWidth: '850px', margin: '0 auto' }}>
          <div className="inv-card-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', borderBottom: '2px solid #8b0000', paddingBottom: '20px', marginBottom: '24px', gap: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <CheckCircle size={32} color="#166534" style={{ flexShrink: 0 }} />
                  <h1 style={{ margin: 0, fontSize: '22px', color: '#8b0000' }}>เอกสารขอยืมอุปกรณ์ (ใบอนุมัติรับของ)</h1>
                </div>
                <p style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#374151', fontWeight: 'bold' }}>
                  สโมสรนักศึกษาคณะวิศวกรรมศาสตร์ มหาวิทยาลัยเชียงใหม่
                </p>
                <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', border: '1px solid #86efac', display: 'inline-block' }}>
                  ✓ ผ่านการอนุมัติจากผู้ดูแลระบบแล้ว
                </span>
              </div>

              <div style={{ textAlign: 'center', border: '1px solid #d1d5db', padding: '12px', borderRadius: '8px', backgroundColor: 'white', margin: '0 auto' }}>
                <QRCodeCanvas
                  value={`REQ-${String(activeReceipt.items[0]?.recordId || 1).padStart(4, '0')}|${activeReceipt.borrowerInfo.studentId}|${activeReceipt.billId}`}
                  size={96}
                  level="H"
                />
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#111827', marginTop: '6px' }}>{activeReceipt.billId}</div>
                <div style={{ fontSize: '10px', color: '#6b7280' }}>สแกนรับ/คืนอุปกรณ์</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px' }}>
              <div><strong>รหัสอ้างอิง:</strong> <span style={{ color: '#8b0000', fontWeight: 'bold' }}>{activeReceipt.billId}</span></div>
              <div><strong>วันจัดกิจกรรม:</strong> {formatEventDateRange(activeReceipt.borrowerInfo.eventStartDate, activeReceipt.borrowerInfo.eventEndDate)}</div>
              <div><strong>ยื่นคำขอเมื่อ:</strong> {formatThaiDateTime(activeReceipt.createdAt)}</div>
            </div>

            <h3 style={{ margin: '0 0 12px 0', fontSize: '17px', color: '#8b0000', borderLeft: '4px solid #8b0000', paddingLeft: '10px' }}>
              1. ข้อมูลผู้ขอยืมและรายละเอียดโครงการ
            </h3>
            <div style={{ overflowX: 'auto', marginBottom: '28px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '10px 14px', border: '1px solid #d1d5db', width: '50%' }}><strong>ชื่อ-นามสกุล:</strong> {activeReceipt.borrowerInfo.fullName}</td>
                    <td style={{ padding: '10px 14px', border: '1px solid #d1d5db', width: '50%' }}><strong>รหัสนักศึกษา/บุคลากร:</strong> {activeReceipt.borrowerInfo.studentId}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 14px', border: '1px solid #d1d5db' }}><strong>คณะ/สังกัด:</strong> {activeReceipt.borrowerInfo.faculty}</td>
                    <td style={{ padding: '10px 14px', border: '1px solid #d1d5db' }}><strong>เบอร์โทรศัพท์:</strong> {activeReceipt.borrowerInfo.phone}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 14px', border: '1px solid #d1d5db' }}><strong>ชมรม/หน่วยงาน:</strong> {activeReceipt.borrowerInfo.club}</td>
                    <td style={{ padding: '10px 14px', border: '1px solid #d1d5db' }}><strong>อีเมล:</strong> {activeReceipt.borrowerInfo.email}</td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={{ padding: '10px 14px', border: '1px solid #d1d5db' }}><strong>ชื่อโครงการ/กิจกรรม:</strong> {activeReceipt.borrowerInfo.projectName}</td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={{ padding: '10px 14px', border: '1px solid #d1d5db' }}><strong>วัตถุประสงค์การใช้งาน:</strong> {activeReceipt.borrowerInfo.purpose}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 style={{ margin: '0 0 12px 0', fontSize: '17px', color: '#8b0000', borderLeft: '4px solid #8b0000', paddingLeft: '10px' }}>
              2. รายการอุปกรณ์ที่ขอยืม
            </h3>
            <div style={{ overflowX: 'auto', marginBottom: '36px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d1d5db', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th style={{ padding: '12px', border: '1px solid #d1d5db', textAlign: 'center', width: '60px' }}>ลำดับ</th>
                    <th style={{ padding: '12px', border: '1px solid #d1d5db', textAlign: 'left' }}>รายการอุปกรณ์</th>
                    <th style={{ padding: '12px', border: '1px solid #d1d5db', textAlign: 'center', width: '90px' }}>จำนวน</th>
                    <th style={{ padding: '12px', border: '1px solid #d1d5db', textAlign: 'left', width: '250px' }}>กำหนดการ (ยืม - คืน)</th>
                  </tr>
                </thead>
                <tbody>
                  {activeReceipt.items.map((item, i) => (
                    <tr key={i}>
                      <td style={{ padding: '12px', border: '1px solid #d1d5db', textAlign: 'center' }}>{i + 1}</td>
                      <td style={{ padding: '12px', border: '1px solid #d1d5db' }}>
                        <strong>{item.assetName}</strong> <span style={{ color: '#6b7280', fontSize: '13px' }}>(#{item.assetId})</span>
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #d1d5db', textAlign: 'center', fontWeight: 'bold' }}>{item.quantity} ชิ้น</td>
                      <td style={{ padding: '12px', border: '1px solid #d1d5db', fontSize: '13px', lineHeight: '1.6' }}>
                        <span style={{ color: '#166534' }}><strong>ยืม:</strong> {formatThaiDateTime(item.borrowDate)}</span><br />
                        <span style={{ color: '#991b1b' }}><strong>คืน:</strong> {formatThaiDateTime(item.returnDate)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '32px', marginTop: '40px', textAlign: 'center' }}>
              <div>
                <div style={{ borderBottom: '1px dashed #374151', width: '80%', height: '30px', margin: '0 auto 8px auto' }}></div>
                <div style={{ fontSize: '15px', fontWeight: 'bold' }}>( {activeReceipt.borrowerInfo.fullName} )</div>
                <div style={{ fontSize: '13px', color: '#4b5563', marginTop: '4px' }}>ผู้ขอยืม / ผู้รับอุปกรณ์</div>
              </div>
              <div>
                <div style={{ borderBottom: '1px dashed #374151', width: '80%', height: '30px', margin: '0 auto 8px auto' }}></div>
                <div style={{ fontSize: '15px', fontWeight: 'bold' }}>( ..................................................... )</div>
                <div style={{ fontSize: '13px', color: '#4b5563', marginTop: '4px' }}>ผู้ดูแลระบบ / เจ้าหน้าที่สโมสรฯ</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginTop: '24px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handlePrintDocument(activeReceipt)}
              className="btn-primary"
              style={{ flex: 2, minWidth: '220px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '16px', fontSize: '16px', fontWeight: 'bold' }}
            >
              <Printer size={20} /> พิมพ์เอกสารขนาด A4 / บันทึกเป็น PDF
            </button>
            <button
              onClick={() => setViewState(currentRole === 'admin' ? 'catalog' : 'my-requests')}
              className="btn-secondary"
              style={{ flex: 1, minWidth: '140px', padding: '16px', fontSize: '16px' }}
            >
              ย้อนกลับ
            </button>
          </div>
        </div>
      )}

      {/* Modal เพิ่ม/แก้ไขอุปกรณ์ของ Admin */}
      {isModalOpen && currentRole === 'admin' && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '92%', maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>{isEditMode ? '✏️ แก้ไขอุปกรณ์' : '📦 เพิ่มอุปกรณ์ใหม่'}</h3>
              <button className="btn-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>

            <form className="modal-form" onSubmit={handleSaveAsset}>
              <div className="form-field">
                <label>รหัสอุปกรณ์ (สร้างให้อัตโนมัติ) *</label>
                <input required type="text" className="form-input" value={formData.id} readOnly style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed', color: '#6b7280', fontWeight: 'bold' }} />
              </div>
              <div className="form-field">
                <label>ชื่ออุปกรณ์ *</label>
                <input required type="text" className="form-input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="เช่น โต๊ะพับ, ไมโครโฟน" />
              </div>
              <div className="form-field">
                <label>หมวดหมู่</label>
                <select className="form-input" value={formData.category} onChange={handleCategoryChange}>
                  <option value="ทั่วไป">ทั่วไป</option>
                  <option value="อิเล็กทรอนิกส์">อิเล็กทรอนิกส์</option>
                  <option value="เครื่องเขียน/อุปกรณ์จัดงาน">เครื่องเขียน/อุปกรณ์จัดงาน</option>
                  <option value="กีฬา">กีฬา</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>
              </div>
              <div className="form-field">
                <label>อัปโหลดรูปภาพอุปกรณ์ (บันทึกลง Database)</label>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', border: '2px dashed #d1d5db', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#f9fafb', color: '#374151', fontWeight: '600' }}>
                  <Upload size={18} color="#8b0000" /> เลือกไฟล์รูปภาพจากเครื่อง
                  <input type="file" accept="image/*" onChange={handleAssetImageUpload} style={{ display: 'none' }} />
                </label>
                {formData.imageUrl && (
                  <div style={{ marginTop: '10px', textAlign: 'center' }}>
                    <img src={formData.imageUrl} alt="Preview" style={{ maxHeight: '120px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div className="form-field" style={{ flex: 1, minWidth: '140px' }}>
                  <label>จำนวนทั้งหมด *</label>
                  <input required type="number" min="1" className="form-input" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 1 })} />
                </div>
                <div style={{ flex: 1, minWidth: '140px' }} className="form-field">
                  <label>สถานะเริ่มต้น *</label>
                  <select className="form-input" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                    <option value="available">✅ พร้อมให้ยืม</option>
                    <option value="unavailable">❌ ยังไม่เปิดให้ยืม</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions" style={{ marginTop: '24px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>ยกเลิก</button>
                <button type="submit" className="btn-primary">{isEditMode ? 'บันทึก' : 'เพิ่มอุปกรณ์'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}