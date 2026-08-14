import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Calendar, ArrowRight, Image as ImageIcon, Plus, X, Megaphone, Trash2, ExternalLink, Settings } from 'lucide-react';
import './HomePage.css';

const API_URL = 'http://localhost:3000/api'; 

interface Banner { id: number; imageUrl: string; isActive: boolean; }
interface NewsItem { id: number; title: string; content: string; createdAt: string; imageUrl?: string; }
interface SiteSetting { key: string; value: string; }
interface EventItem { id: number; date: string; month: string; title: string; time: string; }

interface HomePageProps {
  currentRole: 'admin' | 'user';
  currentUserId: string; // <-- เพิ่มบรรทัดนี้
}

export default function HomePage({ currentRole, currentUserId }: HomePageProps) {
  
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [showAllNews, setShowAllNews] = useState(false);
  
  const [countdownDate, setCountdownDate] = useState('2026-08-30'); 
  const [countdownTitle, setCountdownTitle] = useState('🔥 กิจกรรมเป้าหมายถัดไป'); 
  const [countdownImage, setCountdownImage] = useState('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=400'); 
  
  const [eventsList] = useState<EventItem[]>([
    { id: 1, date: '14', month: 'ส.ค.', title: 'พรีโปรเจค ! ! !', time: '08:00 - 16:00 น.' },
    { id: 2, date: '15', month: 'ก.ย.', title: 'กีฬาสีวิศวะ (Gear Games)', time: 'ตลอดวัน' }
  ]);

  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [isAddNewsModalOpen, setIsAddNewsModalOpen] = useState(false);
  const [newNewsData, setNewNewsData] = useState({ title: '', content: '', imageUrl: '' });

  const [isEditCountdownModalOpen, setIsEditCountdownModalOpen] = useState(false);
  const [editCountdownData, setEditCountdownData] = useState({ date: '', title: '', imageUrl: '' });

  const fetchHomePageData = useCallback(async () => {
    try {
      const bannerRes = await axios.get(`${API_URL}/banners`);
      const activeBanners = bannerRes.data.filter((b: Banner) => b.isActive);
      if (activeBanners.length > 0) {
        setBanners(activeBanners);
      } else {
        setBanners([{ id: 0, imageUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=1200', isActive: true }]);
      }

      const newsRes = await axios.get(`${API_URL}/news`);
      const sortedNews = newsRes.data.sort((a: NewsItem, b: NewsItem) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNewsList(sortedNews);

      const settingsRes = await axios.get(`${API_URL}/settings`);
      const cdDate = settingsRes.data.find((s: SiteSetting) => s.key === 'countdown_date');
      const cdTitle = settingsRes.data.find((s: SiteSetting) => s.key === 'countdown_title');
      const cdImage = settingsRes.data.find((s: SiteSetting) => s.key === 'countdown_image');

      if (cdDate) setCountdownDate(cdDate.value);
      if (cdTitle) setCountdownTitle(cdTitle.value);
      if (cdImage) setCountdownImage(cdImage.value);
    } catch (error) {
      console.error("Error fetching homepage data:", error);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHomePageData();
  }, [fetchHomePageData]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const slideInterval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(slideInterval);
  }, [banners.length]);

  const calculateDaysLeft = (targetDateString: string) => {
    const target = new Date(targetDateString).getTime();
    const now = new Date().getTime();
    const diff = target - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };
  const daysLeft = calculateDaysLeft(countdownDate);

  const filteredEvents = eventsList.filter(e => e.month === 'ส.ค.');

  const formatThaiDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleAddBannerImage = async () => {
    const url = prompt('ใส่ลิงก์รูปภาพ (URL) เพื่อเพิ่มในสไลด์แบนเนอร์:');
    if (url) {
      try {
        await axios.post(`${API_URL}/banners`, { imageUrl: url, isActive: true });
        fetchHomePageData();
      } catch (error) {
        console.error(error);
        alert('เพิ่มแบนเนอร์ไม่สำเร็จ');
      }
    }
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
        imageUrl: newNewsData.imageUrl || null, 
        authorId: currentUserId // <-- ใช้ไอดีคนที่ล็อกอินอยู่
      });
      alert('เพิ่มข่าวสำเร็จ!');
      setIsAddNewsModalOpen(false); 
      fetchHomePageData(); 
    } catch (error) {
      console.error(error);
      if (axios.isAxiosError(error)) {
        alert(`เพิ่มข่าวไม่สำเร็จ: ${error.response?.data?.error}`);
      } else {
        alert('เกิดข้อผิดพลาดในการเพิ่มข่าว');
      }
    }
  };

  const handleDeleteNews = async (id: number) => {
    if (confirm('ยืนยันการลบข่าวประชาสัมพันธ์นี้ออกจากระบบถาวร?')) {
      try {
        await axios.delete(`${API_URL}/news/${id}`);
        fetchHomePageData();
      } catch (error) {
        console.error(error);
        alert('ลบข่าวไม่สำเร็จ');
      }
    }
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
        axios.post(`${API_URL}/settings`, { key: 'countdown_title', value: editCountdownData.title, description: 'ชื่อกิจกรรม' }),
        axios.post(`${API_URL}/settings`, { key: 'countdown_image', value: editCountdownData.imageUrl, description: 'ลิงก์รูปภาพปก' })
      ]);
      alert('อัปเดตข้อมูลวิดเจ็ตสำเร็จ!');
      setIsEditCountdownModalOpen(false);
      fetchHomePageData(); 
    } catch (error) {
      console.error(error);
      alert('เปลี่ยนข้อมูลไม่สำเร็จ');
    }
  };

  const DEFAULT_NEWS_IMG = 'https://images.unsplash.com/photo-1523580494112-071d47141506?auto=format&fit=crop&q=80&w=400';

  const displayedNews = showAllNews ? newsList : newsList.slice(0, 3);

  return (
    <div className="home-container">
      <div className="hero-banner">
        {currentRole === 'admin' && (
          <button onClick={handleAddBannerImage} className="btn-edit-banner">
            <ImageIcon size={16} /> เพิ่มรูปลงแบนเนอร์
          </button>
        )}
        
        {banners.length > 0 && (
          <img src={banners[currentSlide].imageUrl} alt="Banner Slide" className="hero-slide" key={currentSlide} />
        )}
        
        {banners.length > 1 && (
          <div className="slider-dots">
            {banners.map((_, index) => (
              <span 
                key={index} 
                className={`dot ${currentSlide === index ? 'active' : ''}`}
                onClick={() => setCurrentSlide(index)}
              ></span>
            ))}
          </div>
        )}
      </div>

      <div className="home-grid">
        
        <div className="main-feed">
          <div className="section-header-flex">
            <h3 className="section-title"><Megaphone size={20} color="#8b0000"/> ข่าวสารและประชาสัมพันธ์</h3>
            {currentRole === 'admin' && (
              <button onClick={handleOpenAddNewsModal} className="btn-secondary" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <Plus size={16}/> เพิ่มข่าว
              </button>
            )}
          </div>
          
          <div className="pr-list">
            {displayedNews.map(news => (
              <div key={news.id} className="pr-card">
                {currentRole === 'admin' && (
                  <button onClick={() => handleDeleteNews(news.id)} className="btn-delete-news" title="ลบข่าว">
                    <Trash2 size={14} />
                  </button>
                )}
                <div className="pr-img-placeholder">
                  <img src={news.imageUrl || DEFAULT_NEWS_IMG} alt={news.title} />
                </div>
                <div className="pr-info">
                  <span className="pr-date"><Calendar size={14} /> {formatThaiDate(news.createdAt)}</span>
                  <h4>{news.title}</h4>
                  <p>{news.content}</p>
                  <button onClick={() => setSelectedNews(news)} className="btn-readmore">อ่านรายละเอียด <ArrowRight size={14} /></button>
                </div>
              </div>
            ))}
            
            {newsList.length === 0 && <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>ไม่มีข่าวประชาสัมพันธ์ในขณะนี้</p>}
            
            {newsList.length > 3 && (
              <button 
                className="btn-show-more" 
                onClick={() => setShowAllNews(!showAllNews)}
              >
                {showAllNews ? 'ย่อลง (Show less)' : `ดูข่าวทั้งหมด (${newsList.length} ข่าว)`}
              </button>
            )}
          </div>
        </div>

        <div className="side-feed">
          <div className="countdown-box">
            {currentRole === 'admin' && (
              <button onClick={handleOpenEditCountdown} style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}>
                <Settings size={18} />
              </button>
            )}
            <img src={countdownImage} alt="Event Cover" className="countdown-img" />
            <div className="countdown-content">
              <div className="countdown-title">{countdownTitle}</div>
              <div style={{ color: '#4b5563', fontSize: '14px' }}>เหลือเวลาอีก <span className="countdown-days">{daysLeft > 0 ? daysLeft : 0}</span> วัน</div>
            </div>
          </div>

          <div className="widget-card">
            <div className="widget-header">
              <h4><Calendar size={16} color="#8b0000" /> ปฏิทินกิจกรรม (เดือนนี้)</h4>
            </div>
            <div className="calendar-list">
              {filteredEvents.length > 0 ? filteredEvents.map(event => (
                <div key={event.id} className="event-item">
                  <div className="event-date-box">
                    <div className="date">{event.date}</div>
                    <div className="month">{event.month}</div>
                  </div>
                  <div className="event-details">
                    <h5>{event.title}</h5>
                    <p>{event.time}</p>
                  </div>
                </div>
              )) : (
                <p style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center' }}>ไม่มีกิจกรรมในเดือนนี้</p>
              )}
            </div>
            
            <div style={{ marginTop: '16px', textAlign: 'center', borderTop: '1px solid #f3f4f6', paddingTop: '12px' }}>
              <a href="https://activity.eng.cmu.ac.th/calendar" target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                ดูปฏิทินทั้งหมด <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {isAddNewsModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ เพิ่มข่าวประชาสัมพันธ์</h3>
              <button onClick={() => setIsAddNewsModalOpen(false)} className="btn-close"><X size={20} /></button>
            </div>
            <form onSubmit={submitNewNews} className="modal-form">
              <div className="form-field">
                <label>หัวข้อข่าว *</label>
                <input type="text" required className="form-input" placeholder="เช่น ประกาศรับสมัครสตาฟ" value={newNewsData.title} onChange={(e) => setNewNewsData({...newNewsData, title: e.target.value})} />
              </div>
              <div className="form-field">
                <label>ลิงก์รูปภาพประกอบ (URL)</label>
                <input type="url" className="form-input" placeholder="https://images.unsplash.com/... (ปล่อยว่างได้)" value={newNewsData.imageUrl} onChange={(e) => setNewNewsData({...newNewsData, imageUrl: e.target.value})} />
              </div>
              <div className="form-field">
                <label>รายละเอียดเนื้อหาข่าว *</label>
                <textarea required className="form-input" rows={4} style={{ resize: 'vertical' }} placeholder="พิมพ์รายละเอียดทั้งหมดที่นี่..." value={newNewsData.content} onChange={(e) => setNewNewsData({...newNewsData, content: e.target.value})}></textarea>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsAddNewsModalOpen(false)}>ยกเลิก</button>
                <button type="submit" className="btn-primary">บันทึกข่าว</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditCountdownModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚙️ ตั้งค่ากิจกรรมเป้าหมาย (นับถอยหลัง)</h3>
              <button onClick={() => setIsEditCountdownModalOpen(false)} className="btn-close"><X size={20} /></button>
            </div>
            <form onSubmit={submitEditCountdown} className="modal-form">
              <div className="form-field">
                <label>ชื่อกิจกรรม *</label>
                <input type="text" required className="form-input" value={editCountdownData.title} onChange={(e) => setEditCountdownData({...editCountdownData, title: e.target.value})} />
              </div>
              <div className="form-field">
                <label>วันที่เป้าหมาย (YYYY-MM-DD) *</label>
                <input type="date" required className="form-input" value={editCountdownData.date} onChange={(e) => setEditCountdownData({...editCountdownData, date: e.target.value})} />
              </div>
              <div className="form-field">
                <label>ลิงก์รูปภาพปก (URL) *</label>
                <input type="url" required className="form-input" value={editCountdownData.imageUrl} onChange={(e) => setEditCountdownData({...editCountdownData, imageUrl: e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsEditCountdownModalOpen(false)}>ยกเลิก</button>
                <button type="submit" className="btn-primary">บันทึกการตั้งค่า</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedNews && (
        <div className="modal-overlay" onClick={() => setSelectedNews(null)}>
          <div className="glass-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="glass-modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span className="pr-date" style={{ margin: 0, fontWeight: '600' }}><Calendar size={14} color="#8b0000"/> {formatThaiDate(selectedNews.createdAt)}</span>
                <button onClick={() => setSelectedNews(null)} className="btn-close"><X size={20} /></button>
              </div>
              <img src={selectedNews.imageUrl || DEFAULT_NEWS_IMG} alt={selectedNews.title} className="glass-modal-img" />
              <h3>{selectedNews.title}</h3>
              <p>{selectedNews.content}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}