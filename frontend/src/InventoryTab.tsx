import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Package, X, ShoppingCart, Filter, ArrowLeft, Printer, CheckCircle, Calendar as CalendarIcon } from 'lucide-react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const API_URL = 'http://localhost:8000/api';
axios.defaults.withCredentials = true;
const localizer = momentLocalizer(moment);

interface InventoryTabProps {
  currentRole: 'admin' | 'user';
  currentUserId: string; 
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

interface ReceiptData {
  billId: string;
  date: string;
  items: CartItem[];
}

interface BorrowEvent {
  title: string;
  start: Date;
  end: Date;
}

interface BorrowingRecord {
  id: number;
  assetId: string;
  studentId: string;
  quantity: number;
  borrowDate: string;
  returnDate: string;
  status: string;
}

const CATEGORIES = ['ทั้งหมด', 'ทั่วไป', 'อิเล็กทรอนิกส์', 'เครื่องเขียน/อุปกรณ์จัดงาน', 'กีฬา', 'อื่นๆ'];

export default function InventoryTab({ currentRole, currentUserId }: InventoryTabProps) {
  const [viewState, setViewState] = useState<'catalog' | 'booking' | 'cart' | 'receipt'>('catalog');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // ✅ เพิ่มฟิลด์ imageUrl เข้าไปใน State
  const [formData, setFormData] = useState({ 
    id: '', name: '', category: 'ทั่วไป', quantity: 1, status: 'available', imageUrl: '' 
  });

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [borrowEvents, setBorrowEvents] = useState<BorrowEvent[]>([]);
  const [bookingForm, setBookingForm] = useState({ startDate: '', startTime: '08:00', endDate: '', endTime: '16:30', quantity: 1 });
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  const fetchAssets = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/items`);
      setAssets(res.data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    // หุ้มฟังก์ชันด้วย Async ใหม่อีกชั้น เพื่อบังคับให้ State ทำงานแบบ Asynchronous
    const initFetch = async () => {
      await fetchAssets();
    };
    initFetch();
    
    const interval = setInterval(fetchAssets, 3000);
    return () => clearInterval(interval);
  }, [fetchAssets]);

  // ✅ ฟังก์ชันสุ่มรหัสอุปกรณ์อัตโนมัติ ตามหมวดหมู่ที่เลือก
  const generateAssetId = (category: string, currentAssets: Asset[]) => {
    const prefixMap: Record<string, string> = {
      'ทั่วไป': 'GEN',
      'อิเล็กทรอนิกส์': 'EAV',
      'เครื่องเขียน/อุปกรณ์จัดงาน': 'EOS',
      'กีฬา': 'SPR',
      'อื่นๆ': 'OTH'
    };
    const prefix = prefixMap[category] || 'GEN';

    const existingIds = currentAssets
      .map(a => a.id)
      .filter(id => id.startsWith(prefix))
      .map(id => parseInt(id.replace(prefix, ''), 10))
      .filter(n => !isNaN(n));
    
    const nextNumber = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  };

  const handleSelectAsset = async (asset: Asset) => {
    setSelectedAsset(asset);
    
    const today = new Date();
    const tmr = new Date(today); tmr.setDate(tmr.getDate() + 1);
    setBookingForm({
      ...bookingForm,
      startDate: today.toISOString().split('T')[0],
      endDate: tmr.toISOString().split('T')[0],
      quantity: 1
    });

    try {
      const res = await axios.get(`${API_URL}/borrowings`);
      const itemHistory = res.data.filter((b: BorrowingRecord) => b.assetId === asset.id && b.status !== 'returned' && b.status !== 'rejected');
      const events: BorrowEvent[] = itemHistory.map((b: BorrowingRecord) => ({
        title: `ถูกยืม (${b.quantity} ชิ้น)`,
        start: new Date(b.borrowDate),
        end: new Date(b.returnDate),
      }));
      setBorrowEvents(events);
    } catch (error) {
      console.error(error);
    }
    setViewState('booking');
  };

  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;

    const startStr = `${bookingForm.startDate}T${bookingForm.startTime}:00`;
    const endStr = `${bookingForm.endDate}T${bookingForm.endTime}:00`;
    
    const startDateTime = new Date(startStr);
    const endDateTime = new Date(endStr);
    const now = new Date();

    if (startDateTime < now) {
      alert("ไม่สามารถเลือกวันและเวลายืมย้อนหลังได้ครับ กรุณาระบุเวลาใหม่");
      return;
    }
    if (endDateTime <= startDateTime) {
      alert("วันและเวลาคืนอุปกรณ์ ต้องอยู่หลังจากเวลายืมครับ!");
      return;
    }

    const newItem: CartItem = {
      asset: selectedAsset,
      quantity: bookingForm.quantity,
      borrowDate: startStr,
      returnDate: endStr
    };

    setCart([...cart, newItem]);
    
    if (confirm(`เพิ่ม ${selectedAsset.name} ลงตะกร้าแล้ว!\n\nต้องการ "เลือกของชิ้นอื่นต่อ" (OK) หรือ "ไปหน้าตะกร้า" (Cancel)?`)) {
      setViewState('catalog');
    } else {
      setViewState('cart');
    }
    setSelectedAsset(null);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      await Promise.all(cart.map(item => 
        // 🌟 FIX: เปลี่ยนจาก /borrow เป็น /borrowings เพื่อให้ตรงกับ Backend
        axios.post(`${API_URL}/borrowings`, {
          assetId: item.asset.id,
          studentId: currentUserId,
          fullName: "ผู้ใช้งานระบบ", 
          quantity: item.quantity,
          borrowDate: item.borrowDate,
          returnDate: item.returnDate
        })
      ));
      
      setReceiptData({
        billId: `REQ-${Math.floor(1000 + Math.random() * 9000)}`, 
        date: new Date().toLocaleString('th-TH'),
        items: [...cart]
      });

      setCart([]);
      fetchAssets();
      setViewState('receipt'); 
    } catch (error) {
      console.error("Checkout Error:", error);
      
      let errorMessage = 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ';
      
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.error || error.response?.data?.message || error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      alert(`ยืมไม่สำเร็จ สาเหตุ: ${errorMessage}\n\n(ลองกด F12 ดูแถบ Console หรือดูในหน้าจอ Terminal ของ Backend)`);
    }
  }; // ✅ เพิ่มวงเล็บปีกกาปิดฟังก์ชันตรงนี้ให้แล้ว

  const handleOpenAddModal = () => {
    setIsEditMode(false);
    const initialCategory = 'ทั่วไป';
    const autoId = generateAssetId(initialCategory, assets);
    setFormData({ id: autoId, name: '', category: initialCategory, quantity: 1, status: 'available', imageUrl: '' });
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
      const payload = {
        ...formData,
        availableQuantity: formData.quantity, 
      };

      if (isEditMode) {
        await axios.put(`${API_URL}/items/${formData.id}`, payload);
        alert('อัปเดตข้อมูลสำเร็จ!');
      } else {
        await axios.post(`${API_URL}/items`, payload);
        alert('เพิ่มอุปกรณ์สำเร็จ!');
      }
      setIsModalOpen(false);
      fetchAssets();
    } catch (error) {
      console.error(error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('ยืนยันการลบอุปกรณ์นี้?')) {
      try {
        await axios.delete(`${API_URL}/items/${id}`);
        fetchAssets();
      } catch (error) {
        console.error(error);
        alert('ลบไม่สำเร็จ');
      }
    }
  };

  const filteredAssets = [...assets]
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }))
    .filter(item => selectedCategory === 'ทั้งหมด' ? true : item.category === selectedCategory);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div style={{ paddingBottom: '40px' }}>
      
      {viewState !== 'receipt' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={24} color="#8b0000" /> บริการยืมของ (Inventory)
          </h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            {currentRole === 'user' && (
              <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#d97706' }} onClick={() => setViewState('cart')}>
                <ShoppingCart size={18} /> ตะกร้าของฉัน {cart.length > 0 && `(${cart.length})`}
              </button>
            )}
            {currentRole === 'admin' && (
              <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={handleOpenAddModal}>
                <Plus size={18} /> เพิ่มอุปกรณ์ใหม่
              </button>
            )}
          </div>
        </div>
      )}

      {viewState === 'catalog' && (
        <>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
            {filteredAssets.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#6b7280' }}>ไม่พบอุปกรณ์ในหมวดหมู่นี้</div>
            ) : (
              filteredAssets.map((item) => {
                const cartItem = cart.find(c => c.asset.id === item.id);
                const displayAvailable = item.availableQuantity - (cartItem ? cartItem.quantity : 0);

                return (
                  <div key={item.id} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    
                    {currentRole === 'admin' && (
                      <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px' }}>
                        <button onClick={() => handleOpenEditModal(item)} style={{ background: 'white', border: 'none', padding: '6px', borderRadius: '50%', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', color: '#3730a3' }}><Edit size={16}/></button>
                        <button onClick={() => handleDelete(item.id)} style={{ background: 'white', border: 'none', padding: '6px', borderRadius: '50%', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', color: '#ef4444' }}><Trash2 size={16}/></button>
                      </div>
                    )}

                    <div style={{ height: '160px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundImage: `url(${item.imageUrl || 'https://placehold.co/400x300?text=No+Image'})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
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
                          {displayAvailable > 0 && item.status === 'available' ? 'เลือกยืม' : 'ของหมด/ปิดยืม'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {viewState === 'booking' && selectedAsset && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <button onClick={() => setViewState('catalog')} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', width: 'fit-content' }}>
            <ArrowLeft size={20} /> กลับไปหน้าเลือกของ
          </button>
          
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ flex: '2 1 500px', backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', minHeight: '550px' }}>
              <h3 style={{ marginTop: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><CalendarIcon size={20}/> ตารางการยืม: {selectedAsset.name}</h3>
              <Calendar
                localizer={localizer}
                events={borrowEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '450px' }}
                views={['month', 'week']}
                messages={{ next: "ถัดไป", previous: "ย้อนกลับ", today: "วันนี้", month: "เดือน", week: "สัปดาห์" }}
              />
            </div>

            <div style={{ flex: '1 1 300px', backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', height: 'fit-content' }}>
              <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#8b0000' }}>📝 ระบุรายละเอียดการยืม</h3>
              <form onSubmit={handleAddToCart} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ backgroundColor: '#f9fafb', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                  <strong>{selectedAsset.name}</strong><br/>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>โควต้าคงเหลือ: {selectedAsset.availableQuantity} ชิ้น</span>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div className="form-field" style={{ flex: 2 }}>
                    <label>วันที่ยืม</label>
                    <input required type="date" className="form-input" min={todayStr} value={bookingForm.startDate} onChange={e => setBookingForm({...bookingForm, startDate: e.target.value})} />
                  </div>
                  <div className="form-field" style={{ flex: 1 }}>
                    <label>เวลา</label>
                    <input required type="time" className="form-input" value={bookingForm.startTime} onChange={e => setBookingForm({...bookingForm, startTime: e.target.value})} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div className="form-field" style={{ flex: 2 }}>
                    <label>วันที่คืน</label>
                    <input required type="date" className="form-input" min={bookingForm.startDate} value={bookingForm.endDate} onChange={e => setBookingForm({...bookingForm, endDate: e.target.value})} />
                  </div>
                  <div className="form-field" style={{ flex: 1 }}>
                    <label>เวลา</label>
                    <input required type="time" className="form-input" value={bookingForm.endTime} onChange={e => setBookingForm({...bookingForm, endTime: e.target.value})} />
                  </div>
                </div>

                <div className="form-field">
                  <label>จำนวนที่ต้องการยืม</label>
                  <input required type="number" min="1" max={selectedAsset.availableQuantity} className="form-input" value={bookingForm.quantity} onChange={e => setBookingForm({...bookingForm, quantity: parseInt(e.target.value)})} />
                </div>

                <button type="submit" className="btn-primary" style={{ marginTop: '16px', padding: '12px', fontSize: '16px' }}>
                  + เพิ่มลงตะกร้า
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {viewState === 'cart' && (
        <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: 'white', padding: '32px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '24px' }}>🛒 สรุปรายการในตะกร้า</h3>
            <button onClick={() => setViewState('catalog')} style={{ background: 'none', border: 'none', color: '#d97706', cursor: 'pointer', fontWeight: 'bold' }}>+ เลือกของเพิ่ม</button>
          </div>

          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>ตะกร้าว่างเปล่าครับ กลับไปเลือกของก่อนนะ</div>
          ) : (
            <>
              <div style={{ borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', padding: '16px 0', marginBottom: '24px' }}>
                {cart.map((item, index) => {
                  const formatDateTime = (dateStr: string) => new Date(dateStr).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
                  return (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: index !== cart.length - 1 ? '1px dashed #f3f4f6' : 'none' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '18px' }}>{item.asset.name} <span style={{ color: '#8b0000' }}>(x{item.quantity})</span></div>
                        <div style={{ fontSize: '14px', color: '#4b5563', marginTop: '4px' }}>
                          📅 ยืม: {formatDateTime(item.borrowDate)} <br/>
                          📅 คืน: {formatDateTime(item.returnDate)}
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(index)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={20}/></button>
                    </div>
                  );
                })}
              </div>
              <button onClick={handleCheckout} className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: '18px' }}>
                ทำการยืมของเสร็จสิ้น
              </button>
            </>
          )}
        </div>
      )}

      {viewState === 'receipt' && receiptData && (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div id="printable-receipt" style={{ backgroundColor: 'white', padding: '40px', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', color: '#000' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px', borderBottom: '2px solid #000', paddingBottom: '24px' }}>
              <CheckCircle size={48} color="#166534" style={{ margin: '0 auto 16px auto' }} />
              <h1 style={{ margin: '0 0 8px 0' }}>เอกสารขอยืมอุปกรณ์</h1>
              <p style={{ margin: 0, fontSize: '18px' }}>สโมสรนักศึกษาคณะวิศวกรรมศาสตร์</p>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '16px' }}>
              <div><strong>รหัสอ้างอิง:</strong> {receiptData.billId}</div>
              <div><strong>วันที่ทำรายการ:</strong> {receiptData.date}</div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '32px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={{ padding: '12px', border: '1px solid #d1d5db', textAlign: 'left' }}>รายการอุปกรณ์</th>
                  <th style={{ padding: '12px', border: '1px solid #d1d5db', textAlign: 'center' }}>จำนวน</th>
                  <th style={{ padding: '12px', border: '1px solid #d1d5db', textAlign: 'left' }}>กำหนดการ</th>
                </tr>
              </thead>
              <tbody>
                {receiptData.items.map((item: CartItem, i: number) => (
                  <tr key={i}>
                    <td style={{ padding: '12px', border: '1px solid #d1d5db' }}>{item.asset.name} (#{item.asset.id})</td>
                    <td style={{ padding: '12px', border: '1px solid #d1d5db', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: '12px', border: '1px solid #d1d5db', fontSize: '14px' }}>
                      ยืม: {new Date(item.borrowDate).toLocaleString('th-TH')}<br/>
                      คืน: {new Date(item.returnDate).toLocaleString('th-TH')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ textAlign: 'center', marginTop: '40px', color: '#6b7280', fontSize: '14px' }}>
              * โปรดแสดงเอกสารนี้แก่เจ้าหน้าที่สโมสรฯ เพื่อรับอุปกรณ์
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }} className="no-print">
            <button onClick={() => window.print()} className="btn-primary" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px' }}>
              <Printer size={20} /> พิมพ์ / บันทึก PDF
            </button>
            <button onClick={() => { setViewState('catalog'); setReceiptData(null); }} className="btn-secondary" style={{ flex: 1, padding: '12px' }}>
              กลับหน้าแรก
            </button>
          </div>
        </div>
      )}

      {isModalOpen && currentRole === 'admin' && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{isEditMode ? '✏️ แก้ไขอุปกรณ์' : '📦 เพิ่มอุปกรณ์ใหม่'}</h3>
              <button className="btn-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            
            {/* ✅ อัปเดตฟอร์ม Modal: ช่อง ID อ่านอย่างเดียว, ดักการเปลี่ยนหมวดหมู่, ใส่รูปลิงก์ */}
            <form className="modal-form" onSubmit={handleSaveAsset}>
              <div className="form-field">
                <label>รหัสอุปกรณ์ (ID) *</label>
                <input required type="text" className="form-input" value={formData.id} readOnly style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed', color: '#6b7280', fontWeight: 'bold' }} />
              </div>
              <div className="form-field">
                <label>ชื่ออุปกรณ์ *</label>
                <input required type="text" className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="เช่น โต๊ะพับ, ไมโครโฟน" />
              </div>
              <div className="form-field">
                <label>หมวดหมู่</label>
                <select className="form-input" value={formData.category} onChange={handleCategoryChange}>
                  <option value="ทั่วไป">ทั่วไป (General)</option>
                  <option value="อิเล็กทรอนิกส์">อิเล็กทรอนิกส์ (Electronics)</option>
                  <option value="เครื่องเขียน/อุปกรณ์จัดงาน">เครื่องเขียน/อุปกรณ์จัดงาน (Event Supplies)</option>
                  <option value="กีฬา">กีฬา (Sports)</option>
                  <option value="อื่นๆ">อื่นๆ (Others)</option>
                </select>
              </div>
              <div className="form-field">
                <label>ลิงก์รูปภาพ (Image URL)</label>
                <input type="text" className="form-input" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} placeholder="https://example.com/image.jpg (เว้นว่างได้)" />
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div className="form-field" style={{ flex: 1 }}>
                  <label>จำนวนทั้งหมด *</label>
                  <input required type="number" min="1" className="form-input" value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} />
                </div>
                <div className="form-field" style={{ flex: 1 }}>
                  <label>สถานะเริ่มต้น *</label>
                  <select className="form-input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
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