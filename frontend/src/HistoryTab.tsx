import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { QRCodeCanvas } from 'qrcode.react';
import { Clock, QrCode, X, ScanLine } from 'lucide-react'; // 🌟 เอา CheckCircle ที่ไม่ได้ใช้ออกแล้ว

const API_URL = 'http://localhost:8000/api';
axios.defaults.withCredentials = true;

interface HistoryTabProps {
  currentRole: 'admin' | 'user';
  currentUserId: string; 
}

interface Asset {
  id: string;
  name: string;
  category: string;
}

interface Borrowing {
  id: number;
  studentId: string;
  assetId: string;
  quantity: number;
  borrowDate: string;
  returnDate: string;
  status: string;
}

export default function HistoryTab({ currentRole, currentUserId }: HistoryTabProps) {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedQr, setSelectedQr] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [borrowRes, itemRes] = await Promise.all([
        axios.get(`${API_URL}/borrowings`),
        axios.get(`${API_URL}/items`)
      ]);
      
      setAssets(itemRes.data);
      
      const historyData = currentRole === 'admin' 
        ? borrowRes.data 
        : borrowRes.data.filter((b: Borrowing) => b.studentId === currentUserId);
        
      setBorrowings(historyData.sort((a: Borrowing, b: Borrowing) => b.id - a.id));
    } catch (error) {
      console.error("Fetch history error:", error);
    }
  }, [currentRole, currentUserId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    
    const interval = setInterval(() => {
      fetchData();
    }, 5000); 
    
    return () => clearInterval(interval);
  }, [fetchData]);

  const getAssetDetails = (assetId: string) => {
    return assets.find(a => a.id === assetId) || { name: 'ไม่ทราบชื่ออุปกรณ์', category: 'Unknown' };
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const handleAdminScan = async (recordId: number, studentId: string) => {
    const mockQrData = `REQ-${recordId.toString().padStart(4, '0')}|${studentId}`;
    
    if (confirm(`คุณกำลังสแกน QR Code: ${mockQrData}\nยืนยันการทำรายการ (รับของ/คืนของ)?`)) {
      try {
        const response = await axios.post(`${API_URL}/borrowings/scan`, { qrData: mockQrData });
        alert(`✅ ${response.data.message}`);
        fetchData();
      } catch (error) { // 🌟 เอา : any ออก
        let errMsg = 'เกิดข้อผิดพลาดในการสแกน';
        
        // 🌟 เช็ค Error แบบถูกหลัก TypeScript
        if (axios.isAxiosError(error)) {
          errMsg = error.response?.data?.error || error.response?.data?.message || error.message;
        } else if (error instanceof Error) {
          errMsg = error.message;
        }
        
        alert(`❌ ${errMsg}`);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'pending') {
      return { text: 'รอรับของ', bg: '#e0f2fe', color: '#0369a1' };
    } else if (status === 'borrowed') {
      return { text: 'กำลังยืม', bg: '#fef3c7', color: '#b45309' };
    } else {
      return { text: 'คืนแล้ว', bg: '#f3f4f6', color: '#6b7280' };
    }
  };

  return (
    <div style={{ paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={24} color="#8b0000" /> {currentRole === 'admin' ? 'ประวัติการยืมทั้งหมด (Admin)' : 'สถานะคำขอยืมของฉัน'}
        </h2>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>รหัสอ้างอิงบิล</th>
              <th>รายการอุปกรณ์</th>
              <th>กำหนดการ (ยืม - คืน)</th>
              <th className="text-center">สถานะ</th>
              <th className="text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {borrowings.length === 0 ? (
              <tr><td colSpan={5} className="empty-state" style={{ textAlign: 'center', padding: '40px' }}>คุณยังไม่มีประวัติการยืมอุปกรณ์</td></tr>
            ) : (
              borrowings.map((record) => {
                const asset = getAssetDetails(record.assetId);
                const isReturned = record.status === 'returned';
                const badge = getStatusBadge(record.status);

                return (
                  <tr key={record.id} style={{ opacity: isReturned ? 0.6 : 1 }}>
                    <td className="text-muted" style={{ fontWeight: '600' }}>REQ-{record.id.toString().padStart(4, '0')}</td>
                    <td>
                      <div className="font-medium">{asset.name} <span style={{ color: '#8b0000' }}>(x{record.quantity})</span></div>
                      <div className="text-muted" style={{ fontSize: '12px' }}>รหัส: #{record.assetId} {currentRole === 'admin' && `| ผู้ยืม: ${record.studentId}`}</div>
                    </td>
                    <td className="text-muted" style={{ fontSize: '14px' }}>
                      <span style={{ color: '#15803d' }}>ยืม: {formatDateTime(record.borrowDate)}</span><br/>
                      <span style={{ color: '#b91c1c' }}>คืน: {formatDateTime(record.returnDate)}</span>
                    </td>
                    <td className="text-center">
                      <span style={{ 
                        fontSize: '12px', padding: '6px 12px', borderRadius: '9999px', fontWeight: '600', 
                        backgroundColor: badge.bg, color: badge.color
                      }}>
                        {badge.text}
                      </span>
                    </td>
                    <td className="text-center">
                      {currentRole === 'user' && !isReturned && (
                        <button 
                          onClick={() => setSelectedQr(`REQ-${record.id.toString().padStart(4, '0')}|${record.studentId}`)}
                          style={{ background: 'none', border: '1px solid #d1d5db', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
                        >
                          <QrCode size={16} /> โชว์ QR
                        </button>
                      )}
                      
                      {currentRole === 'admin' && !isReturned && (
                        <button 
                          className="btn-primary"
                          onClick={() => handleAdminScan(record.id, record.studentId)}
                          style={{ padding: '6px 12px', fontSize: '14px', backgroundColor: record.status === 'pending' ? '#2563eb' : '#059669' }}
                        >
                          <ScanLine size={16} style={{ display: 'inline', marginRight: '4px' }}/> 
                          {record.status === 'pending' ? 'แสกนรับของ' : 'แสกนคืนของ'}
                        </button>
                      )}
                      
                      {isReturned && (
                        <span style={{ color: '#6b7280', fontSize: '14px' }}>เสร็จสิ้น</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedQr && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="modal-header" style={{ justifyContent: 'flex-end', border: 'none' }}>
              <button className="btn-close" onClick={() => setSelectedQr(null)}><X size={20} /></button>
            </div>
            
            <h3 style={{ marginTop: 0 }}>สแกนเพื่อยืนยันการรับ/คืน</h3>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>โปรดแสดง QR Code นี้แก่เจ้าหน้าที่สโมสรฯ</p>
            
            <div style={{ background: 'white', padding: '24px', borderRadius: '16px', display: 'inline-block', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
              <QRCodeCanvas 
                value={selectedQr} 
                size={200} 
                level={"H"}
                imageSettings={{
                  src: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Eq_it-na_pizza-margherita_sep2005_sml.jpg/120px-Eq_it-na_pizza-margherita_sep2005_sml.jpg",
                  x: undefined, y: undefined, height: 40, width: 40, excavate: true,
                }}
              />
            </div>
            
            <div style={{ marginTop: '24px', fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>
              รหัสบิล: {selectedQr.split('|')[0]}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}