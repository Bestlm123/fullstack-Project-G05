import { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckCircle } from 'lucide-react';

interface Borrowing {
  id: number;
  studentId: string;
  assetId: string;
  quantity: number;
  borrowDate: string;
  returnDate: string | null;
  status: string;
}

const API_URL = 'http://fsg07.cpecmu.com/api';

const formatDateTimeDisplay = (isoString: string) => {
  const d = new Date(isoString);
  return `${d.toLocaleDateString('th-TH')} ${d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;
};

export default function HistoryTab() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);

  const fetchBorrowings = async () => {
    try {
      const res = await axios.get(`${API_URL}/borrowings`);
      setBorrowings(res.data);
    } catch (error) {
      console.error("Error fetching borrowings:", error);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBorrowings();
  }, []);

  const handleReturnItem = async (borrowingId: number) => {
    if (!confirm('ยืนยันการคืนของรายการนี้?')) return;
    try {
      await axios.post(`${API_URL}/return`, { borrowingId });
      alert('คืนของสำเร็จ! สต็อกถูกบวกกลับเข้าคลังแล้ว');
      fetchBorrowings();
    } catch (error) {
      const errMsg = axios.isAxiosError(error) ? error.response?.data?.error : 'เกิดข้อผิดพลาด';
      alert(`คืนของไม่สำเร็จ: ${errMsg}`);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0, color: '#111827', fontSize: '20px' }}>ประวัติการยืม-คืน</h3>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th style={{ width: '80px', textAlign: 'center' }}>ID</th>
              <th>รหัสนักศึกษา</th>
              <th>รหัสพัสดุ</th>
              <th className="text-center">จน.</th>
              <th className="text-center" style={{ width: '130px' }}>วัน-เวลายืม</th>
              <th className="text-center" style={{ width: '130px' }}>กำหนด/รับคืน</th> 
              <th className="text-center">สถานะ</th>
              <th className="text-center" style={{ width: '100px' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {borrowings.length === 0 ? (
              <tr><td colSpan={8} className="empty-state">ยังไม่มีประวัติการยืมของ</td></tr>
            ) : (
              borrowings.map((b) => (
                <tr key={b.id}>
                  <td className="text-center font-medium text-muted">{b.id}</td>
                  <td className="font-medium">{b.studentId}</td>
                  <td className="text-muted">{b.assetId}</td>
                  <td className="text-center"><span className="badge-qty">{b.quantity}</span></td>
                  
                  <td className="text-center text-muted" style={{ fontSize: '13px' }}>
                    {formatDateTimeDisplay(b.borrowDate)}
                  </td>
                  
                  <td className="text-center text-muted" style={{ fontSize: '13px', fontWeight: b.status === 'borrowed' ? 'bold' : 'normal', color: b.status === 'borrowed' ? '#d97706' : 'inherit' }}>
                    {b.returnDate ? formatDateTimeDisplay(b.returnDate) : '-'}
                  </td>

                  <td className="text-center">
                    <span className="badge-qty" style={{ backgroundColor: b.status === 'returned' ? '#f3f4f6' : '#fff7ed', color: b.status === 'returned' ? '#6b7280' : '#c2410c' }}>
                      {b.status === 'returned' ? 'คืนแล้ว' : 'กำลังยืม'}
                    </span>
                  </td>
                  <td className="text-center">
                    {b.status === 'borrowed' ? (
                      <button onClick={() => handleReturnItem(b.id)} className="btn-icon btn-return" style={{ width: '100%', fontSize: '12px', padding: '4px 8px' }}>
                        <CheckCircle size={14} style={{ marginRight: '4px' }}/> รับคืน
                      </button>
                    ) : (
                      <span className="text-muted" style={{ fontSize: '12px' }}>เสร็จสิ้น</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}