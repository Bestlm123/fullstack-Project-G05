import { useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeCanvas } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import { Clock, QrCode, X, ScanLine, Ban, Camera, CameraOff } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_URL = `${BASE_URL}/api`;

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
  transactionId?: string;
  projectName?: string;
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
  const [selectedQr, setSelectedQr] = useState<{ qrValue: string; displayCode: string } | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const fetchData = async () => {
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
      console.error('Fetch history error:', error);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const poll = async () => {
      if (!isMounted) return;
      await fetchData();
    };
    poll();
    const interval = setInterval(poll, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentRole, currentUserId]);

  // ระบบเปิดกล้องสแกน QR Code สำหรับ Admin ในหน้าประวัติยืม-คืน
  useEffect(() => {
    if (!isCameraOpen || currentRole !== 'admin') return;

    let html5QrCode: Html5Qrcode | null = null;
    let isScanning = true;

    const startScanner = async () => {
      try {
        html5QrCode = new Html5Qrcode('history-qr-reader');
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

            try {
              const response = await axios.post(`${API_URL}/borrowings/scan`, { qrData: decodedText });
              alert(`✅ ${response.data.message}`);
              await fetchData();
            } catch (error: unknown) {
              let errMsg = 'เกิดข้อผิดพลาดในการสแกน';
              if (axios.isAxiosError(error)) {
                errMsg = error.response?.data?.error || error.response?.data?.message || error.message;
              }
              alert(`❌ ${errMsg}`);
            }
          },
          () => {}
        );
      } catch (err) {
        console.error(err);
        setIsCameraOpen(false);
        alert('ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการเข้าถึงกล้องบนเบราว์เซอร์');
      }
    };

    startScanner();

    return () => {
      isScanning = false;
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [isCameraOpen, currentRole]);

  const getAssetDetails = (assetId: string) => {
    return assets.find(a => a.id === assetId) || { name: 'ไม่ทราบชื่ออุปกรณ์', category: 'Unknown' };
  };

  const getEntBillCode = (record: Borrowing) => {
    if (record.transactionId && record.transactionId !== 'LEGACY-TXN') {
      return record.transactionId;
    }
    return `ENT-${record.id.toString().padStart(4, '0')}`;
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const handleAdminScan = async (record: Borrowing) => {
    const entCode = getEntBillCode(record);
    const qrPayload = `REQ-${record.id.toString().padStart(4, '0')}|${record.studentId}|${entCode}`;

    if (confirm(`ยืนยันการสแกนรายการรหัส: ${entCode}\n(${record.status === 'pending' ? 'ส่งมอบอุปกรณ์ให้ผู้ยืม' : 'รับคืนอุปกรณ์เข้าคลัง'})?`)) {
      try {
        const response = await axios.post(`${API_URL}/borrowings/scan`, { qrData: qrPayload });
        alert(`✅ ${response.data.message}`);
        await fetchData();
      } catch (error: unknown) {
        let errMsg = 'เกิดข้อผิดพลาดในการสแกน';
        if (axios.isAxiosError(error)) {
          errMsg = error.response?.data?.error || error.response?.data?.message || error.message;
        }
        alert(`❌ ${errMsg}`);
      }
    }
  };

  const handleUserCancel = async (record: Borrowing) => {
    const entCode = getEntBillCode(record);
    if (!confirm(`ยืนยันการยกเลิกคำขอยืมรหัส ${entCode} ใช่หรือไม่?`)) return;

    try {
      try {
        await axios.post(`${API_URL}/borrowings/cancel`, { borrowingId: record.id });
      } catch {
        await axios.post(`${API_URL}/borrowings/return`, { borrowingId: record.id });
      }
      alert(`✅ ยกเลิกคำขอยืมรหัส ${entCode} เรียบร้อยแล้ว`);
      await fetchData();
    } catch (error: unknown) {
      let errMsg = 'ไม่สามารถยกเลิกรายการได้';
      if (axios.isAxiosError(error)) {
        errMsg = error.response?.data?.error || errMsg;
      }
      alert(`❌ ${errMsg}`);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'pending') {
      return { text: 'รออนุมัติ / รอรับของ', bg: '#e0f2fe', color: '#0369a1' };
    } else if (status === 'borrowed') {
      return { text: 'กำลังยืม', bg: '#fef3c7', color: '#b45309' };
    } else if (status === 'cancelled' || status === 'rejected') {
      return { text: 'ยกเลิก/ไม่อนุมัติ', bg: '#fee2e2', color: '#991b1b' };
    } else {
      return { text: 'คืนแล้ว', bg: '#f3f4f6', color: '#6b7280' };
    }
  };

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* 🌟 CSS สลับแสดงตารางบนคอมพิวเตอร์ และแสดงเป็นการ์ดสวยๆ บนมือถือ เพื่อไม่ให้ข้อมูลตกขอบ */}
      <style>
        {`
          .history-desktop-table {
            display: block;
          }
          .history-mobile-cards {
            display: none;
          }
          @media (max-width: 768px) {
            .history-desktop-table {
              display: none !important;
            }
            .history-mobile-cards {
              display: flex !important;
              flex-direction: column;
              gap: 14px;
            }
          }
        `}
      </style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Clock size={24} color="#8b0000" /> {currentRole === 'admin' ? 'ประวัติการยืม-คืนทั้งหมด (Admin)' : 'ประวัติการยืม-คืนอุปกรณ์ของฉัน'}
        </h2>

        {currentRole === 'admin' && (
          <button
            onClick={() => setIsCameraOpen(!isCameraOpen)}
            className="btn-primary"
            style={{
              backgroundColor: isCameraOpen ? '#dc2626' : '#16a34a',
              borderColor: isCameraOpen ? '#dc2626' : '#16a34a',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {isCameraOpen ? <CameraOff size={18} /> : <Camera size={18} />}
            {isCameraOpen ? 'ปิดกล้องสแกน' : '📷 เปิดกล้องสแกน QR'}
          </button>
        )}
      </div>

      {isCameraOpen && currentRole === 'admin' && (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '14px', border: '2px solid #16a34a', marginBottom: '24px', textAlign: 'center' }}>
          <div id="history-qr-reader" style={{ maxWidth: '380px', margin: '0 auto', borderRadius: '10px', overflow: 'hidden' }} />
          <p style={{ margin: '10px 0 0 0', fontSize: '13px', color: '#166534', fontWeight: 'bold' }}>
            ส่องกล้องไปที่ QR Code ของผู้ยืมเพื่อยืนยันการรับของหรือคืนของ
          </p>
        </div>
      )}

      {/* 1. มุมมองตารางสำหรับหน้าจอคอมพิวเตอร์ (Desktop) */}
      <div className="table-card history-desktop-table">
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>รหัสอ้างอิง (ENT)</th>
              <th>รายการอุปกรณ์</th>
              <th>กำหนดการ (ยืม - คืน)</th>
              <th className="text-center">สถานะ</th>
              <th className="text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {borrowings.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-state" style={{ textAlign: 'center', padding: '40px' }}>
                  ยังไม่มีประวัติการยืมอุปกรณ์
                </td>
              </tr>
            ) : (
              borrowings.map((record) => {
                const asset = getAssetDetails(record.assetId);
                const isFinished = record.status === 'returned' || record.status === 'cancelled' || record.status === 'rejected';
                const badge = getStatusBadge(record.status);
                const entCode = getEntBillCode(record);

                return (
                  <tr key={record.id} style={{ opacity: isFinished ? 0.65 : 1 }}>
                    <td style={{ fontWeight: '700', color: '#8b0000' }}>{entCode}</td>
                    <td>
                      <div className="font-medium">{asset.name} <span style={{ color: '#8b0000' }}>(x{record.quantity})</span></div>
                      <div className="text-muted" style={{ fontSize: '12px' }}>
                        รหัส: #{record.assetId} {currentRole === 'admin' && `| ผู้ยืม: ${record.studentId}`}
                      </div>
                    </td>
                    <td className="text-muted" style={{ fontSize: '13px' }}>
                      <span style={{ color: '#15803d' }}>ยืม: {formatDateTime(record.borrowDate)}</span><br />
                      <span style={{ color: '#b91c1c' }}>คืน: {formatDateTime(record.returnDate)}</span>
                    </td>
                    <td className="text-center">
                      <span style={{
                        fontSize: '12px', padding: '6px 12px', borderRadius: '9999px', fontWeight: '600',
                        backgroundColor: badge.bg, color: badge.color, whiteSpace: 'nowrap'
                      }}>
                        {badge.text}
                      </span>
                    </td>
                    <td className="text-center">
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                        {currentRole === 'user' && !isFinished && (
                          <>
                            <button
                              onClick={() => setSelectedQr({
                                qrValue: `REQ-${record.id.toString().padStart(4, '0')}|${record.studentId}|${entCode}`,
                                displayCode: entCode
                              })}
                              style={{ background: 'white', border: '1px solid #d1d5db', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                            >
                              <QrCode size={15} /> โชว์ QR
                            </button>
                            {record.status === 'pending' && (
                              <button
                                onClick={() => handleUserCancel(record)}
                                style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: '600' }}
                              >
                                <Ban size={14} /> ยกเลิก
                              </button>
                            )}
                          </>
                        )}

                        {currentRole === 'admin' && !isFinished && (
                          <button
                            className="btn-primary"
                            onClick={() => handleAdminScan(record)}
                            style={{ padding: '6px 12px', fontSize: '13px', backgroundColor: record.status === 'pending' ? '#2563eb' : '#059669', borderColor: 'transparent', whiteSpace: 'nowrap' }}
                          >
                            <ScanLine size={15} style={{ display: 'inline', marginRight: '4px' }} />
                            {record.status === 'pending' ? 'สแกนรับของ' : 'สแกนคืนของ'}
                          </button>
                        )}

                        {isFinished && (
                          <span style={{ color: '#6b7280', fontSize: '13px' }}>เสร็จสิ้น</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 2. มุมมองการ์ดสำหรับหน้าจอมือถือ (Mobile Card Layout - ไม่ตกขอบ 100%) */}
      <div className="history-mobile-cards">
        {borrowings.length === 0 ? (
          <div style={{ backgroundColor: 'white', padding: '40px 20px', borderRadius: '12px', textAlign: 'center', color: '#6b7280', border: '1px solid #e5e7eb' }}>
            ยังไม่มีประวัติการยืมอุปกรณ์
          </div>
        ) : (
          borrowings.map((record) => {
            const asset = getAssetDetails(record.assetId);
            const isFinished = record.status === 'returned' || record.status === 'cancelled' || record.status === 'rejected';
            const badge = getStatusBadge(record.status);
            const entCode = getEntBillCode(record);

            return (
              <div
                key={record.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '14px',
                  border: '1px solid #e5e7eb',
                  padding: '16px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                  opacity: isFinished ? 0.75 : 1
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontWeight: '800', fontSize: '16px', color: '#8b0000' }}>{entCode}</span>
                  <span style={{
                    fontSize: '12px', padding: '4px 10px', borderRadius: '9999px', fontWeight: '700',
                    backgroundColor: badge.bg, color: badge.color
                  }}>
                    {badge.text}
                  </span>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontWeight: '700', fontSize: '16px', color: '#111827' }}>
                    {asset.name} <span style={{ color: '#8b0000' }}>(x{record.quantity} ชิ้น)</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                    รหัสอุปกรณ์: #{record.assetId} {currentRole === 'admin' && `• ผู้ยืม: ${record.studentId}`}
                  </div>
                </div>

                <div style={{ backgroundColor: '#f9fafb', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', lineHeight: '1.6', marginBottom: '12px' }}>
                  <div style={{ color: '#15803d', fontWeight: '600' }}>📅 ยืม: {formatDateTime(record.borrowDate)}</div>
                  <div style={{ color: '#b91c1c', fontWeight: '600' }}>📅 คืน: {formatDateTime(record.returnDate)}</div>
                </div>

                {!isFinished && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {currentRole === 'user' && (
                      <>
                        <button
                          onClick={() => setSelectedQr({
                            qrValue: `REQ-${record.id.toString().padStart(4, '0')}|${record.studentId}|${entCode}`,
                            displayCode: entCode
                          })}
                          style={{ flex: 1, background: 'white', border: '1px solid #d1d5db', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: '#111827' }}
                        >
                          <QrCode size={16} color="#8b0000" /> โชว์ QR Code
                        </button>
                        {record.status === 'pending' && (
                          <button
                            onClick={() => handleUserCancel(record)}
                            style={{ flex: 1, background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px', fontWeight: '700' }}
                          >
                            <Ban size={15} /> ยกเลิกคำขอ
                          </button>
                        )}
                      </>
                    )}

                    {currentRole === 'admin' && (
                      <button
                        className="btn-primary"
                        onClick={() => handleAdminScan(record)}
                        style={{ width: '100%', padding: '10px', fontSize: '14px', fontWeight: 'bold', backgroundColor: record.status === 'pending' ? '#2563eb' : '#059669', borderColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <ScanLine size={16} />
                        {record.status === 'pending' ? 'สแกนส่งมอบของ' : 'สแกนรับคืนของ'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {selectedQr && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '380px', width: '92%', textAlign: 'center' }}>
            <div className="modal-header" style={{ justifyContent: 'flex-end', border: 'none' }}>
              <button className="btn-close" onClick={() => setSelectedQr(null)}><X size={20} /></button>
            </div>

            <h3 style={{ marginTop: 0 }}>สแกนเพื่อยืนยันการรับ/คืน</h3>
            <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '14px' }}>โปรดแสดง QR Code นี้แก่เจ้าหน้าที่สโมสรฯ</p>

            <div style={{ background: 'white', padding: '20px', borderRadius: '16px', display: 'inline-block', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
              <QRCodeCanvas
                value={selectedQr.qrValue}
                size={200}
                level="H"
              />
            </div>

            <div style={{ marginTop: '20px', fontSize: '18px', fontWeight: 'bold', color: '#8b0000' }}>
              รหัสอ้างอิง: {selectedQr.displayCode}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}