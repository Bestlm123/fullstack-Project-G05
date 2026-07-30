import { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Edit, X, Handshake } from 'lucide-react';

interface Item {
  id: string;
  name: string;
  category: string;
  quantity: number;
  availableQuantity: number;
  status: string;
}

const API_URL = 'https://fsg07.cpecmu.com/api';
const TIME_BLOCKS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

const getTodayString = () => {
  const tzOffset = (new Date()).getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzOffset).toISOString().split('T')[0];
};

export default function InventoryTab() {
  const [items, setItems] = useState<Item[]>([]);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedAssetForBorrow, setSelectedAssetForBorrow] = useState<Item | null>(null);

  const [itemFormData, setItemFormData] = useState({ id: '', name: '', category: 'อุปกรณ์ไอที', quantity: 1, status: 'available' });
  const [borrowFormData, setBorrowFormData] = useState({ studentId: '', fullName: '', quantity: 1, borrowDate: '', borrowTime: '09:00', returnDate: '', returnTime: '16:00' });

  const fetchItems = async () => {
    try {
      const res = await axios.get(`${API_URL}/items`);
      setItems(res.data);
    } catch (error) {
      console.error("Error fetching items:", error);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchItems();
  }, []);

  const handleOpenAddItemModal = () => {
    setEditingId(null);
    setItemFormData({ id: '', name: '', category: 'อุปกรณ์ไอที', quantity: 1, status: 'available' });
    setIsItemModalOpen(true);
  };

  const handleOpenEditItemModal = (item: Item) => {
    setEditingId(item.id);
    setItemFormData({ id: item.id, name: item.name, category: item.category, quantity: item.quantity, status: item.status });
    setIsItemModalOpen(true);
  };

  const handleSubmitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        const originalItem = items.find(i => i.id === editingId);
        if (!originalItem) return;
        const qtyDiff = itemFormData.quantity - originalItem.quantity;
        const newAvailableQty = originalItem.availableQuantity + qtyDiff;
        if (newAvailableQty < 0) return alert('ไม่สามารถลดจำนวนรวมได้ เพราะมีคนยืมของไปเยอะกว่าสต็อกใหม่ที่คุณตั้งไว้!');
        await axios.put(`${API_URL}/items/${editingId}`, { ...itemFormData, availableQuantity: newAvailableQty });
      } else {
        await axios.post(`${API_URL}/items`, { ...itemFormData, availableQuantity: itemFormData.quantity });
      }
      setIsItemModalOpen(false);
      fetchItems();
    } catch (error) {
      const errMsg = axios.isAxiosError(error) ? error.response?.data?.error : 'เกิดข้อผิดพลาด';
      alert(`บันทึกไม่สำเร็จ: ${errMsg}`);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm(`ยืนยันการลบรายการ ${id}?`)) return;
    try {
      await axios.delete(`${API_URL}/items/${id}`);
      fetchItems();
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const handleOpenBorrowModal = (item: Item) => {
    setSelectedAssetForBorrow(item);
    const nowHour = new Date().getHours();
    const defaultTime = nowHour >= 8 && nowHour <= 19 ? `${String(nowHour + 1).padStart(2, '0')}:00` : '08:00';

    setBorrowFormData({ 
      studentId: '', fullName: '', quantity: 1, 
      borrowDate: getTodayString(), borrowTime: defaultTime, 
      returnDate: '', returnTime: '16:00' 
    });
    setIsBorrowModalOpen(true);
  };

  const handleSubmitBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetForBorrow) return;
    if (!/^\d{9}$/.test(borrowFormData.studentId)) return alert('❌ กรุณากรอกรหัสนักศึกษาเป็นตัวเลขให้ถูกต้อง');
    if (/^\d+$/.test(borrowFormData.fullName)) return alert('❌ กรุณากรอกชื่อ-นามสกุลเป็นตัวอักษรให้ถูกต้อง');

    const borrowDateTimeStr = `${borrowFormData.borrowDate}T${borrowFormData.borrowTime}:00`;
    
    const now = new Date();
    const borrowDateObj = new Date(`${borrowDateTimeStr}+07:00`);
    if (borrowDateObj < now) {
      alert(`❌ ไม่สามารถเลือกเวลายืมที่ผ่านไปแล้วได้ครับ\n(ตอนนี้เวลา ${now.toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})} น.)`);
      return;
    }

    let returnDateTimeStr = undefined;
    if (borrowFormData.returnDate) {
      returnDateTimeStr = `${borrowFormData.returnDate}T${borrowFormData.returnTime}:00`;
      if (new Date(returnDateTimeStr) < new Date(borrowDateTimeStr)) return alert('❌ กำหนดคืนต้องไม่อยู่ก่อนวัน-เวลาที่ยืม');
    }

    try {
      await axios.post(`${API_URL}/borrow`, {
        studentId: borrowFormData.studentId,
        fullName: borrowFormData.fullName,
        assetId: selectedAssetForBorrow.id,
        quantity: borrowFormData.quantity,
        borrowDate: `${borrowDateTimeStr}+07:00`,
        returnDate: returnDateTimeStr ? `${returnDateTimeStr}+07:00` : undefined
      });
      setIsBorrowModalOpen(false);
      alert('บันทึกการยืมสำเร็จ!');
      fetchItems();
    } catch (error) {
      const errMsg = axios.isAxiosError(error) ? error.response?.data?.error : 'สต็อกอาจจะไม่พอ หรือข้อผิดพลาดอื่น';
      alert(`ยืมไม่สำเร็จ: ${errMsg}`);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0, color: '#111827', fontSize: '20px' }}>รายการสิ่งของทั้งหมด</h3>
        <button onClick={handleOpenAddItemModal} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> เพิ่มพัสดุใหม่
        </button>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th style={{ width: '100px', textAlign: 'center' }}>ID</th>
              <th>ชื่อสิ่งของ</th>
              <th>หมวดหมู่</th>
              <th className="text-center">สต็อก (ว่าง/รวม)</th>
              <th className="text-center">สถานะ</th>
              <th className="text-center" style={{ width: '200px' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={6} className="empty-state">ยังไม่มีรายการสิ่งของให้ยืม</td></tr>
            ) : (
              items.map((item) => {
                const isUnavailable = item.availableQuantity === 0 || item.status === 'unavailable';
                return (
                  <tr key={item.id}>
                    <td className="text-center font-medium text-muted">{item.id}</td>
                    <td className="font-medium">{item.name}</td>
                    <td className="text-muted">{item.category}</td>
                    <td className="text-center">
                      <span className="badge-qty">{item.availableQuantity} / {item.quantity}</span>
                    </td>
                    <td className="text-center">
                      <span className="badge-qty" style={{ backgroundColor: item.status === 'available' ? '#dcfce7' : '#fee2e2', color: item.status === 'available' ? '#166534' : '#991b1b' }}>
                        {item.status === 'available' ? 'พร้อมใช้งาน' : 'ไม่พร้อมใช้'}
                      </span>
                    </td>
                    <td className="text-center">
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        <button onClick={() => handleOpenBorrowModal(item)} className="btn-icon btn-borrow" title="ยืมของ" disabled={isUnavailable} style={{ opacity: isUnavailable ? 0.5 : 1, width: 'auto', padding: '0 8px', fontSize: '12px' }}>
                          <Handshake size={14} style={{ marginRight: '4px' }}/> ยืม
                        </button>
                        <button onClick={() => handleOpenEditItemModal(item)} className="btn-icon btn-edit" title="แก้ไข"><Edit size={16} /></button>
                        <button onClick={() => handleDeleteItem(item.id)} className="btn-icon btn-delete" title="ลบ"><X size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isItemModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingId ? '📝 แก้ไขข้อมูลสิ่งของ' : '➕ เพิ่มพัสดุใหม่'}</h3>
              <button onClick={() => setIsItemModalOpen(false)} className="btn-close"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmitItem} className="modal-form">
              <div className="form-field">
                <label>รหัสสิ่งของ *</label>
                <input type="text" required maxLength={10} value={itemFormData.id} onChange={(e) => setItemFormData({...itemFormData, id: e.target.value})} className="form-input" disabled={!!editingId} />
              </div>
              <div className="form-field">
                <label>ชื่อสิ่งของ *</label>
                <input type="text" required value={itemFormData.name} onChange={(e) => setItemFormData({...itemFormData, name: e.target.value})} className="form-input" />
              </div>
              <div className="form-field">
                <label>หมวดหมู่ *</label>
                <select value={itemFormData.category} onChange={(e) => setItemFormData({...itemFormData, category: e.target.value})} className="form-input" style={{ padding: '10px 16px' }}>
                  <option value="อุปกรณ์ไอที">อุปกรณ์ไอที</option>
                  <option value="อุปกรณ์สำหรับ STAFF">อุปกรณ์สำหรับ STAFF</option>
                  <option value="อุปกรณ์พยาบาล">อุปกรณ์พยาบาล</option>
                  <option value="อุปกรณ์กีฬา">อุปกรณ์กีฬา</option>
                  <option value="อุปกรณ์ช่าง">อุปกรณ์ช่าง</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>
              </div>
              <div className="form-field">
                <label>จำนวนทั้งหมด *</label>
                <input type="number" required min="1" value={itemFormData.quantity} onChange={(e) => setItemFormData({...itemFormData, quantity: parseInt(e.target.value)})} className="form-input" />
              </div>
              <div className="form-field">
                <label>สถานะเริ่มต้น</label>
                <select value={itemFormData.status} onChange={(e) => setItemFormData({...itemFormData, status: e.target.value})} className="form-input" style={{ padding: '10px 16px' }}>
                  <option value="available">พร้อมใช้งาน (Available)</option>
                  <option value="unavailable">ไม่พร้อมใช้ / ชำรุด (Unavailable)</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setIsItemModalOpen(false)} className="btn-secondary">ยกเลิก</button>
                <button type="submit" className="btn-primary">บันทึกข้อมูล</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isBorrowModalOpen && selectedAssetForBorrow && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>📦 ทำรายการยืม: {selectedAssetForBorrow.name}</h3>
              <button onClick={() => setIsBorrowModalOpen(false)} className="btn-close"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmitBorrow} className="modal-form">
              <div className="form-field">
                <label>รหัสสิ่งของ (Asset ID)</label>
                <input type="text" value={selectedAssetForBorrow.id} className="form-input" disabled />
              </div>
              <div className="form-field">
                <label>รหัสนักศึกษาผู้ยืม *</label>
                <input type="text" required maxLength={9} minLength={9} value={borrowFormData.studentId} onChange={(e) => setBorrowFormData({...borrowFormData, studentId: e.target.value})} className="form-input" placeholder="เช่น 67061xxxx" />
              </div>
              <div className="form-field">
                <label>ชื่อ - นามสกุล ผู้ที่ต้องการยืม *</label>
                <input type="text" required value={borrowFormData.fullName} onChange={(e) => setBorrowFormData({...borrowFormData, fullName: e.target.value})} className="form-input" placeholder="ชื่อ - นามสกุล" />
              </div>
              <div className="form-field">
                <label>จำนวนที่ต้องการยืม * (ว่าง: {selectedAssetForBorrow.availableQuantity})</label>
                <input type="number" required min="1" max={selectedAssetForBorrow.availableQuantity} value={borrowFormData.quantity} onChange={(e) => setBorrowFormData({...borrowFormData, quantity: parseInt(e.target.value)})} className="form-input" />
              </div>
              
              <div className="form-field">
                <label>วันที่และเวลา ยืม *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="date" required min={getTodayString()} value={borrowFormData.borrowDate} onChange={(e) => setBorrowFormData({...borrowFormData, borrowDate: e.target.value})} className="form-input" style={{ flex: 2 }} />
                  <select value={borrowFormData.borrowTime} onChange={(e) => setBorrowFormData({...borrowFormData, borrowTime: e.target.value})} className="form-input" style={{ flex: 1, padding: '10px' }}>
                    {TIME_BLOCKS.map(time => <option key={time} value={time}>{time}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label>วันที่และเวลา คืน</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="date" min={borrowFormData.borrowDate || getTodayString()} value={borrowFormData.returnDate} onChange={(e) => setBorrowFormData({...borrowFormData, returnDate: e.target.value})} className="form-input" style={{ flex: 2 }} />
                  <select value={borrowFormData.returnTime} onChange={(e) => setBorrowFormData({...borrowFormData, returnTime: e.target.value})} className="form-input" style={{ flex: 1, padding: '10px' }} disabled={!borrowFormData.returnDate}>
                    {TIME_BLOCKS.map(time => <option key={time} value={time}>{time}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setIsBorrowModalOpen(false)} className="btn-secondary">ยกเลิก</button>
                <button type="submit" className="btn-primary" style={{ backgroundColor: '#2563eb' }}>ยืนยันการยืม</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}