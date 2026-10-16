import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Calendar, ArrowRight, Plus, X, Megaphone, Trash2, ExternalLink,
  Settings, Upload, CheckCircle, XCircle, AlertTriangle, ChevronLeft, ChevronRight, Clock, RefreshCw
} from 'lucide-react';
import './HomePage.css';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_URL = `${BASE_URL}/api`;

axios.defaults.withCredentials = true;

const DEFAULT_BANNER_IMG = 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=1600';
const DEFAULT_NEWS_IMG = 'https://images.unsplash.com/photo-1523580494112-071d47141506?auto=format&fit=crop&q=80&w=800';

const HOME_IMAGE_SIZES = {
  heroBanner: {
    width: '100%',
    aspectRatio: '1920 / 1080',
    maxHeight: '540px',
    objectFit: 'contain' as const,
    backgroundColor: '#111827'
  },
  newsCardThumbnail: {
    width: '100%',
    aspectRatio: '16 / 9',
    height: '200px',
    objectFit: 'contain' as const,
    backgroundColor: '#f8fafc'
  },
  newsModalFullImage: {
    width: '100%',
    maxHeight: '520px',
    objectFit: 'contain' as const,
    backgroundColor: '#f8fafc'
  },
  countdownCover: {
    width: '100%',
    aspectRatio: '16 / 9',
    height: '180px',
    objectFit: 'contain' as const,
    backgroundColor: '#1f2937'
  }
};

const compressImageForDb = (file: File, maxWidth = 960): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(e.target?.result || ''));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.65;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > 85000 && quality > 0.25) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = String(e.target?.result || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

interface Banner { id: number; imageUrl: string; isActive: boolean; }
interface NewsItem { id: number; title: string; content: string; createdAt: string; imageUrl?: string; }
interface SiteSetting { key: string; value: string; }
interface CalendarEventItem { id: string; date: string; month: string; title: string; time: string; link?: string; }

interface HomePageProps {
  currentRole: 'admin' | 'user';
  lang?: 'th' | 'en';
}

export default function HomePage({ currentRole, lang = 'th' }: HomePageProps) {
  const bannerFileInputRef = useRef<HTMLInputElement | null>(null);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [showAllNews, setShowAllNews] = useState(false);

  const [countdownDate, setCountdownDate] = useState('');
  const [countdownTitle, setCountdownTitle] = useState('');
  const [countdownImage, setCountdownImage] = useState('');

  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([]);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);

  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [isAddNewsModalOpen, setIsAddNewsModalOpen] = useState(false);
  const [newNewsData, setNewNewsData] = useState({ title: '', content: '', imageUrl: '' });

  const [isEditCountdownModalOpen, setIsEditCountdownModalOpen] = useState(false);
  const [editCountdownData, setEditCountdownData] = useState({ date: '', title: '', imageUrl: '' });

  const [popupAlert, setPopupAlert] = useState<{ show: boolean; type: 'success' | 'error'; title: string; message: string }>({
    show: false,
    type: 'success',
    title: '',
    message: ''
  });
  const [confirmDialog, setConfirmDialog] = useState<{ show: boolean; title: string; message: string; onConfirm: () => void }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showAlert = (type: 'success' | 'error', title: string, message: string) => {
    setPopupAlert({ show: true, type, title, message });
  };

  const fetchHomePageData = async () => {
    try {
      const [bannerRes, newsRes, settingsRes] = await Promise.all([
        axios.get(`${API_URL}/banners`),
        axios.get(`${API_URL}/news`),
        axios.get(`${API_URL}/settings`)
      ]);

      const activeBanners = (bannerRes.data || []).filter((b: Banner) => b.isActive);
      if (activeBanners.length > 0) {
        setBanners(activeBanners);
        setCurrentSlide(prev => (prev >= activeBanners.length ? 0 : prev));
      } else {
        setBanners([{ id: 0, imageUrl: DEFAULT_BANNER_IMG, isActive: true }]);
        setCurrentSlide(0);
      }

      const sortedNews = (newsRes.data || []).sort(
        (a: NewsItem, b: NewsItem) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setNewsList(sortedNews);

      const cdDate = settingsRes.data.find((s: SiteSetting) => s.key === 'countdown_date');
      const cdTitle = settingsRes.data.find((s: SiteSetting) => s.key === 'countdown_title');
      const cdImage = settingsRes.data.find((s: SiteSetting) => s.key === 'countdown_image');

      setCountdownDate(cdDate ? cdDate.value : '');
      setCountdownTitle(cdTitle ? cdTitle.value : '');
      setCountdownImage(cdImage ? cdImage.value : '');
    } catch (error) {
      console.error('Error fetching homepage data:', error);
    }
  };

  const fetchCmuActivityCalendar = async (showPopup = false) => {
    setIsSyncingCalendar(true);
    try {
      const res = await axios.get(`${API_URL}/events/cmu-calendar`);
      if (Array.isArray(res.data)) {
        // 🌟 ข้อ 2: เก็บและแสดงเฉพาะ 3 กิจกรรมที่ใกล้ที่สุดเท่านั้น
        setCalendarEvents(res.data.slice(0, 3));
        if (showPopup) {
          showAlert('success', 'ซิงก์ปฏิทินสำเร็จ', 'ดึงข้อมูล 3 กิจกรรมที่ใกล้ที่สุดจาก activity.eng.cmu.ac.th เรียบร้อยแล้ว');
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const initFetch = async () => {
      if (!isMounted) return;
      await Promise.all([fetchHomePageData(), fetchCmuActivityCalendar(false)]);
    };
    initFetch();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const slideInterval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(slideInterval);
  }, [banners.length]);

  const calculateDaysLeft = (targetDateString: string) => {
    if (!targetDateString) return 0;
    const target = new Date(targetDateString).getTime();
    const now = new Date().getTime();
    const diff = target - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };
  const daysLeft = calculateDaysLeft(countdownDate);

  const formatThaiDate = (isoString: string) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64Image = await compressImageForDb(file, 960);
      await axios.post(`${API_URL}/banners`, { imageUrl: base64Image, isActive: true });
      await fetchHomePageData();
      showAlert('success', 'อัปโหลดแบนเนอร์สำเร็จ', 'เพิ่มรูปภาพแบนเนอร์ใหม่เข้าสู่ระบบเรียบร้อยแล้ว');
    } catch (error: unknown) {
      let msg = 'ไม่สามารถเพิ่มรูปแบนเนอร์ได้';
      if (axios.isAxiosError(error) && error.response?.data?.error) msg = error.response.data.error;
      showAlert('error', 'อัปโหลดไม่สำเร็จ', msg);
    } finally {
      if (bannerFileInputRef.current) bannerFileInputRef.current.value = '';
    }
  };

  const handleDeleteCurrentBanner = (bannerId: number) => {
    if (bannerId === 0) return;
    setConfirmDialog({
      show: true,
      title: 'ยืนยันการลบรูปแบนเนอร์',
      message: 'คุณต้องการลบรูปแบนเนอร์สไลด์ใบนี้ออกจากหน้าแรกใช่หรือไม่?',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, show: false }));
        try {
          await axios.delete(`${API_URL}/banners/${bannerId}`);
          await fetchHomePageData();
          showAlert('success', 'ลบแบนเนอร์สำเร็จ', 'ลบรูปแบนเนอร์ออกจากระบบเรียบร้อยแล้ว');
        } catch {
          showAlert('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถลบแบนเนอร์ได้');
        }
      }
    });
  };

  const handleOpenAddNewsModal = () => {
    setNewNewsData({ title: '', content: '', imageUrl: '' });
    setIsAddNewsModalOpen(true);
  };

  const submitNewNews = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/news`, {
        title: newNewsData.title,
        content: newNewsData.content,
        imageUrl: newNewsData.imageUrl || null
      });
      setIsAddNewsModalOpen(false);
      await fetchHomePageData();
      showAlert('success', 'เผยแพร่ข่าวสำเร็จ', 'เพิ่มประกาศข่าวประชาสัมพันธ์เข้าสู่ระบบเรียบร้อยแล้ว');
    } catch (error: unknown) {
      let errorMsg = 'เกิดข้อผิดพลาดในการเพิ่มข่าว';
      if (axios.isAxiosError(error)) {
        errorMsg = error.response?.data?.error || error.response?.data?.message || error.message;
      }
      showAlert('error', 'เพิ่มข่าวไม่สำเร็จ', errorMsg);
    }
  };

  const handleDeleteNews = (id: number, title: string) => {
    setConfirmDialog({
      show: true,
      title: 'ยืนยันการลบข่าวประชาสัมพันธ์',
      message: `คุณต้องการลบข่าว "${title}" ออกจากระบบถาวรใช่หรือไม่?`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, show: false }));
        try {
          await axios.delete(`${API_URL}/news/${id}`);
          await fetchHomePageData();
          showAlert('success', 'ลบข่าวเรียบร้อย', 'ลบข่าวประชาสัมพันธ์ออกจากระบบแล้ว');
        } catch {
          showAlert('error', 'ลบข่าวไม่สำเร็จ', 'ไม่สามารถลบข่าวประชาสัมพันธ์ได้');
        }
      }
    });
  };

  const handleOpenEditCountdown = () => {
    setEditCountdownData({
      date: countdownDate,
      title: countdownTitle,
      imageUrl: countdownImage
    });
    setIsEditCountdownModalOpen(true);
  };

  const submitEditCountdown = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await Promise.all([
        axios.post(`${API_URL}/settings`, { key: 'countdown_date', value: editCountdownData.date, description: 'วันที่เป้าหมาย' }),
        axios.post(`${API_URL}/settings`, { key: 'countdown_title', value: editCountdownData.title.trim(), description: 'ชื่อกิจกรรม' }),
        axios.post(`${API_URL}/settings`, { key: 'countdown_image', value: editCountdownData.imageUrl, description: 'รูปภาพปก' })
      ]);
      setIsEditCountdownModalOpen(false);
      await fetchHomePageData();
      showAlert('success', 'บันทึกการตั้งค่าสำเร็จ', 'อัปเดตข้อมูลกิจกรรมสำคัญถัดไปเรียบร้อยแล้ว');
    } catch {
      showAlert('error', 'บันทึกไม่สำเร็จ', 'เกิดข้อผิดพลาดในการอัปเดตกิจกรรมเป้าหมาย');
    }
  };

  const handleClearCountdown = async () => {
    try {
      await Promise.all([
        axios.post(`${API_URL}/settings`, { key: 'countdown_date', value: '', description: 'วันที่เป้าหมาย' }),
        axios.post(`${API_URL}/settings`, { key: 'countdown_title', value: '', description: 'ชื่อกิจกรรม' }),
        axios.post(`${API_URL}/settings`, { key: 'countdown_image', value: '', description: 'รูปภาพปก' })
      ]);
      setIsEditCountdownModalOpen(false);
      await fetchHomePageData();
      showAlert('success', 'ตั้งค่าเรียบร้อย', 'เปลี่ยนสถานะเป็น "ยังไม่มีกิจกรรมสำคัญถัดไป" เรียบร้อยแล้ว');
    } catch {
      showAlert('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถล้างค่ากิจกรรมได้');
    }
  };

  const displayedNews = showAllNews ? newsList : newsList.slice(0, 6);
  const activeBanner = banners[currentSlide];
  const hasUpcomingCountdown = Boolean(countdownTitle && countdownTitle.trim() !== '' && countdownTitle !== 'NONE');

  // 🌟 บังคับตัดให้แสดงแค่ 3 รายการที่ใกล้ที่สุดเท่านั้น
  const top3ClosestEvents = calendarEvents.slice(0, 3);

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '48px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <style>
        {`
          .official-section-card {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.03);
          }
          .official-news-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 20px;
          }
          .official-mid-grid {
            display: grid;
            grid-template-columns: 1.15fr 1.85fr;
            gap: 24px;
          }
          @media (max-width: 900px) {
            .official-mid-grid {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>

      {popupAlert.show && (
        <div className="modal-overlay" style={{ zIndex: 1200, backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-content" style={{ maxWidth: '420px', width: '92%', textAlign: 'center', padding: '32px 24px' }}>
            {popupAlert.type === 'success' ? (
              <CheckCircle size={56} color="#16a34a" style={{ margin: '0 auto 14px' }} />
            ) : (
              <XCircle size={56} color="#dc2626" style={{ margin: '0 auto 14px' }} />
            )}
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: popupAlert.type === 'success' ? '#166534' : '#991b1b' }}>
              {popupAlert.title}
            </h3>
            <p style={{ color: '#4b5563', marginBottom: '24px', fontSize: '15px', lineHeight: 1.5 }}>{popupAlert.message}</p>
            <button className="btn-primary" style={{ width: '100%', padding: '12px' }} onClick={() => setPopupAlert({ ...popupAlert, show: false })}>
              ตกลง
            </button>
          </div>
        </div>
      )}

      {confirmDialog.show && (
        <div className="modal-overlay" style={{ zIndex: 1200, backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-content" style={{ maxWidth: '420px', width: '92%', textAlign: 'center', padding: '32px 24px' }}>
            <AlertTriangle size={56} color="#d97706" style={{ margin: '0 auto 14px' }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#111827' }}>{confirmDialog.title}</h3>
            <p style={{ color: '#4b5563', marginBottom: '24px', fontSize: '15px', lineHeight: 1.5 }}>{confirmDialog.message}</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-secondary" style={{ flex: 1, padding: '12px' }} onClick={() => setConfirmDialog(prev => ({ ...prev, show: false }))}>
                ยกเลิก
              </button>
              <button className="btn-primary" style={{ flex: 1, padding: '12px', backgroundColor: '#dc2626', borderColor: '#dc2626' }} onClick={confirmDialog.onConfirm}>
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ส่วนที่ 1: แบนเนอร์ประชาสัมพันธ์หลัก */}
      <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e5e7eb', backgroundColor: HOME_IMAGE_SIZES.heroBanner.backgroundColor }}>
        {currentRole === 'admin' && (
          <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 20, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              ref={bannerFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleBannerFileChange}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => bannerFileInputRef.current?.click()}
              style={{ backgroundColor: 'rgba(255,255,255,0.95)', color: '#8b0000', border: '1px solid #fecaca', padding: '8px 14px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}
            >
              <Upload size={16} /> {lang === 'th' ? 'เพิ่มรูปแบนเนอร์' : 'Upload Banner'}
            </button>
            {activeBanner && activeBanner.id !== 0 && (
              <button
                onClick={() => handleDeleteCurrentBanner(activeBanner.id)}
                style={{ backgroundColor: 'rgba(220,38,38,0.95)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}
              >
                <Trash2 size={15} /> {lang === 'th' ? 'ลบรูปนี้' : 'Delete'}
              </button>
            )}
          </div>
        )}

        {activeBanner && (
          <img
            src={activeBanner.imageUrl || DEFAULT_BANNER_IMG}
            alt="Official Banner"
            style={{
              width: HOME_IMAGE_SIZES.heroBanner.width,
              aspectRatio: HOME_IMAGE_SIZES.heroBanner.aspectRatio,
              maxHeight: HOME_IMAGE_SIZES.heroBanner.maxHeight,
              objectFit: HOME_IMAGE_SIZES.heroBanner.objectFit,
              display: 'block',
              margin: '0 auto'
            }}
            onError={(e) => {
              e.currentTarget.src = DEFAULT_BANNER_IMG;
            }}
          />
        )}

        {banners.length > 1 && (
          <>
            <button
              onClick={() => setCurrentSlide(prev => (prev - 1 + banners.length) % banners.length)}
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '38px', height: '38px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ChevronLeft size={22} />
            </button>
            <button
              onClick={() => setCurrentSlide(prev => (prev + 1) % banners.length)}
              style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '38px', height: '38px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}
      </div>

      {/* ส่วนที่ 2: ข่าวสารและประกาศอย่างเป็นทางการ */}
      <div className="official-section-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '2px solid #f3f4f6', paddingBottom: '16px', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Megaphone size={22} color="#8b0000" /> {lang === 'th' ? 'ข่าวสารและประกาศอย่างเป็นทางการ' : 'Official News & Announcements'}
            </h3>
          </div>
          {currentRole === 'admin' && (
            <button onClick={handleOpenAddNewsModal} className="btn-primary" style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '10px 18px', fontSize: '14px', fontWeight: '700' }}>
              <Plus size={18} /> {lang === 'th' ? 'เพิ่มประกาศข่าวใหม่' : 'Add Announcement'}
            </button>
          )}
        </div>

        {newsList.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px 20px' }}>
            {lang === 'th' ? 'ยังไม่มีประกาศข่าวประชาสัมพันธ์ในขณะนี้' : 'No official announcements at this moment.'}
          </p>
        ) : (
          <div className="official-news-grid">
            {displayedNews.map(news => (
              <div
                key={news.id}
                style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', position: 'relative' }}
              >
                {currentRole === 'admin' && (
                  <button
                    onClick={() => handleDeleteNews(news.id, news.title)}
                    style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10, backgroundColor: 'rgba(220,38,38,0.9)', color: 'white', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}
                    title="ลบประกาศนี้"
                  >
                    <Trash2 size={15} />
                  </button>
                )}

                <div style={{ backgroundColor: HOME_IMAGE_SIZES.newsCardThumbnail.backgroundColor, borderBottom: '1px solid #f3f4f6' }}>
                  <img
                    src={news.imageUrl || DEFAULT_NEWS_IMG}
                    alt={news.title}
                    style={{
                      width: HOME_IMAGE_SIZES.newsCardThumbnail.width,
                      aspectRatio: HOME_IMAGE_SIZES.newsCardThumbnail.aspectRatio,
                      height: HOME_IMAGE_SIZES.newsCardThumbnail.height,
                      objectFit: HOME_IMAGE_SIZES.newsCardThumbnail.objectFit,
                      display: 'block'
                    }}
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_NEWS_IMG;
                    }}
                  />
                </div>

                <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <span style={{ fontSize: '12px', color: '#8b0000', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                    <Calendar size={13} /> {formatThaiDate(news.createdAt)}
                  </span>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: '700', color: '#111827', lineHeight: 1.4 }}>{news.title}</h4>
                  <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#4b5563', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {news.content}
                  </p>
                  <button
                    onClick={() => setSelectedNews(news)}
                    style={{ marginTop: 'auto', background: 'none', border: 'none', color: '#8b0000', fontWeight: '700', fontSize: '14px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: 0 }}
                  >
                    {lang === 'th' ? 'อ่านรายละเอียดฉบับเต็ม' : 'Read full announcement'} <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {newsList.length > 6 && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button className="btn-secondary" onClick={() => setShowAllNews(!showAllNews)}>
              {showAllNews ? 'ย่อรายการข่าว' : `ดูประกาศทั้งหมด (${newsList.length} รายการ)`}
            </button>
          </div>
        )}
      </div>

      {/* ส่วนที่ 3: กิจกรรมสำคัญถัดไป & กำหนดการปฏิทิน 3 อันดับที่ใกล้ที่สุด */}
      <div className="official-mid-grid">
        <div className="official-section-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h4 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#8b0000', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={19} /> {lang === 'th' ? 'กิจกรรมสำคัญถัดไป' : 'Next Highlight Event'}
            </h4>
            {currentRole === 'admin' && (
              <button
                onClick={handleOpenEditCountdown}
                style={{ background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600' }}
              >
                <Settings size={14} /> {lang === 'th' ? 'ตั้งค่า' : 'Configure'}
              </button>
            )}
          </div>

          {!hasUpcomingCountdown ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '12px', padding: '48px 20px', textAlign: 'center', color: '#6b7280' }}>
              <Calendar size={42} color="#9ca3af" style={{ marginBottom: '10px', opacity: 0.6 }} />
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#374151' }}>
                {lang === 'th' ? 'ยังไม่มีกิจกรรมถัดไปในขณะนี้' : 'No upcoming highlight event'}
              </div>
              <div style={{ fontSize: '13px', marginTop: '4px' }}>
                {lang === 'th' ? 'ติดตามประกาศกิจกรรมใหม่จากสโมสรนักศึกษาได้เร็วๆ นี้' : 'Stay tuned for upcoming union events.'}
              </div>
            </div>
          ) : (
            <>
              <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #e5e7eb', marginBottom: '14px', backgroundColor: HOME_IMAGE_SIZES.countdownCover.backgroundColor }}>
                <img
                  src={countdownImage || DEFAULT_BANNER_IMG}
                  alt="Countdown Event"
                  style={{
                    width: HOME_IMAGE_SIZES.countdownCover.width,
                    aspectRatio: HOME_IMAGE_SIZES.countdownCover.aspectRatio,
                    height: HOME_IMAGE_SIZES.countdownCover.height,
                    objectFit: HOME_IMAGE_SIZES.countdownCover.objectFit,
                    display: 'block'
                  }}
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_BANNER_IMG;
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '14px 18px', borderRadius: '10px', gap: '12px' }}>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '16px', color: '#111827' }}>{countdownTitle}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                    {lang === 'th' ? 'วันที่เป้าหมาย:' : 'Target Date:'} {formatThaiDate(countdownDate)}
                  </div>
                </div>
                <div style={{ textAlign: 'center', backgroundColor: '#8b0000', color: 'white', padding: '8px 16px', borderRadius: '8px', minWidth: '85px', flexShrink: 0 }}>
                  <div style={{ fontSize: '22px', fontWeight: '800', lineHeight: 1 }}>{daysLeft > 0 ? daysLeft : 0}</div>
                  <div style={{ fontSize: '11px', marginTop: '2px' }}>{lang === 'th' ? 'วันที่เหลือ' : 'Days Left'}</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 🌟 ข้อ 2: แสดงเฉพาะ 3 กิจกรรมที่ใกล้ที่สุด และซ่อนปุ่มซิงก์จาก User ทั่วไป */}
        <div className="official-section-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={19} color="#8b0000" /> {lang === 'th' ? 'กำหนดการกิจกรรมคณะฯ' : 'Upcoming Faculty Activities'}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {currentRole === 'admin' && (
                <button
                  onClick={() => fetchCmuActivityCalendar(true)}
                  disabled={isSyncingCalendar}
                  style={{ background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#374151' }}
                  title="เฉพาะผู้ดูแลระบบ: ซิงก์ข้อมูลล่าสุดจาก activity.eng.cmu.ac.th"
                >
                  <RefreshCw size={13} /> {isSyncingCalendar ? 'กำลังซิงก์...' : (lang === 'th' ? 'ซิงก์ข้อมูลล่าสุด' : 'Sync')}
                </button>
              )}
              <a
                href="https://activity.eng.cmu.ac.th/calendar"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '13px', color: '#8b0000', textDecoration: 'none', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                {lang === 'th' ? 'ดูปฏิทินทั้งหมด' : 'Full Calendar'} <ExternalLink size={14} />
              </a>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'center' }}>
            {top3ClosestEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280', fontSize: '14px' }}>
                {lang === 'th' ? 'ยังไม่มีกำหนดการกิจกรรมในเดือนนี้' : 'No scheduled events found.'}
              </div>
            ) : (
              top3ClosestEvents.map(event => (
                <a
                  key={event.id}
                  href={event.link || 'https://activity.eng.cmu.ac.th/calendar'}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '14px 16px', borderRadius: '10px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', textDecoration: 'none', color: 'inherit' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ backgroundColor: '#8b0000', color: 'white', borderRadius: '8px', padding: '8px 12px', textAlign: 'center', minWidth: '62px' }}>
                      <div style={{ fontSize: '18px', fontWeight: '800', lineHeight: 1 }}>{event.date}</div>
                      <div style={{ fontSize: '11px', marginTop: '2px' }}>{event.month}</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '15px', color: '#111827' }}>{event.title}</div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>⏰ {event.time}</div>
                    </div>
                  </div>
                  <ExternalLink size={15} color="#9ca3af" style={{ flexShrink: 0 }} />
                </a>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal เพิ่มข่าวประชาสัมพันธ์ */}
      {isAddNewsModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', width: '92%' }}>
            <div className="modal-header">
              <h3>➕ เพิ่มประกาศข่าวประชาสัมพันธ์</h3>
              <button onClick={() => setIsAddNewsModalOpen(false)} className="btn-close"><X size={20} /></button>
            </div>
            <form onSubmit={submitNewNews} className="modal-form">
              <div className="form-field">
                <label>หัวข้อประกาศ / ข่าวประชาสัมพันธ์ *</label>
                <input type="text" required className="form-input" placeholder="ระบุหัวข้อข่าวอย่างเป็นทางการ..." value={newNewsData.title} onChange={(e) => setNewNewsData({ ...newNewsData, title: e.target.value })} />
              </div>
              <div className="form-field">
                <label>อัปโหลดรูปภาพประกอบ (บันทึกลง Database)</label>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', border: '2px dashed #d1d5db', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#f9fafb', color: '#374151', fontWeight: '600' }}>
                  <Upload size={18} color="#8b0000" /> คลิกเลือกไฟล์รูปภาพจากเครื่อง
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const base64 = await compressImageForDb(file, 850);
                        setNewNewsData(prev => ({ ...prev, imageUrl: base64 }));
                      }
                    }}
                  />
                </label>
                {newNewsData.imageUrl && (
                  <div style={{ marginTop: '10px', textAlign: 'center' }}>
                    <img src={newNewsData.imageUrl} alt="News Preview" style={{ maxHeight: '150px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                  </div>
                )}
              </div>
              <div className="form-field">
                <label>รายละเอียดเนื้อหาข่าว *</label>
                <textarea required className="form-input" rows={5} style={{ resize: 'vertical' }} placeholder="พิมพ์รายละเอียดเนื้อหาประกาศ..." value={newNewsData.content} onChange={(e) => setNewNewsData({ ...newNewsData, content: e.target.value })}></textarea>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsAddNewsModalOpen(false)}>ยกเลิก</button>
                <button type="submit" className="btn-primary">เผยแพร่ประกาศ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal ตั้งค่ากิจกรรมนับถอยหลัง */}
      {isEditCountdownModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', width: '92%' }}>
            <div className="modal-header">
              <h3>⚙️ ตั้งค่ากิจกรรมสำคัญถัดไป</h3>
              <button onClick={() => setIsEditCountdownModalOpen(false)} className="btn-close"><X size={20} /></button>
            </div>
            <form onSubmit={submitEditCountdown} className="modal-form">
              <div className="form-field">
                <label>ชื่อกิจกรรม *</label>
                <input type="text" required className="form-input" placeholder="ระบุชื่อกิจกรรมสำคัญถัดไป..." value={editCountdownData.title} onChange={(e) => setEditCountdownData({ ...editCountdownData, title: e.target.value })} />
              </div>
              <div className="form-field">
                <label>วันที่จัดกิจกรรม *</label>
                <input type="date" required className="form-input" value={editCountdownData.date} onChange={(e) => setEditCountdownData({ ...editCountdownData, date: e.target.value })} />
              </div>
              <div className="form-field">
                <label>อัปโหลดรูปภาพปกกิจกรรม (บันทึกลง Database)</label>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', border: '2px dashed #d1d5db', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#f9fafb', color: '#374151', fontWeight: '600' }}>
                  <Upload size={18} color="#8b0000" /> คลิกเลือกไฟล์รูปภาพปก
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const base64 = await compressImageForDb(file, 800);
                        setEditCountdownData(prev => ({ ...prev, imageUrl: base64 }));
                      }
                    }}
                  />
                </label>
                {editCountdownData.imageUrl && (
                  <div style={{ marginTop: '10px', textAlign: 'center' }}>
                    <img
                      src={editCountdownData.imageUrl}
                      alt="Countdown Preview"
                      style={{ maxHeight: '140px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #d1d5db' }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsEditCountdownModalOpen(false)}>ยกเลิก</button>
                  <button type="submit" className="btn-primary" style={{ flex: 1 }}>บันทึกการตั้งค่า</button>
                </div>
                <button
                  type="button"
                  onClick={handleClearCountdown}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                >
                  🗑️ ล้างค่า / แสดงว่า "ยังไม่มีกิจกรรมถัดไป"
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal อ่านข่าวฉบับเต็ม */}
      {selectedNews && (
        <div className="modal-overlay" onClick={() => setSelectedNews(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px', width: '94%', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', color: '#8b0000', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={15} /> {formatThaiDate(selectedNews.createdAt)}
              </span>
              <button onClick={() => setSelectedNews(null)} className="btn-close"><X size={20} /></button>
            </div>
            <div style={{ backgroundColor: HOME_IMAGE_SIZES.newsModalFullImage.backgroundColor, borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb', marginBottom: '20px' }}>
              <img
                src={selectedNews.imageUrl || DEFAULT_NEWS_IMG}
                alt={selectedNews.title}
                style={{
                  width: HOME_IMAGE_SIZES.newsModalFullImage.width,
                  maxHeight: HOME_IMAGE_SIZES.newsModalFullImage.maxHeight,
                  objectFit: HOME_IMAGE_SIZES.newsModalFullImage.objectFit,
                  display: 'block',
                  margin: '0 auto'
                }}
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_NEWS_IMG;
                }}
              />
            </div>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '22px', color: '#111827' }}>{selectedNews.title}</h3>
            <p style={{ color: '#374151', fontSize: '15px', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{selectedNews.content}</p>
          </div>
        </div>
      )}
    </div>
  );
}