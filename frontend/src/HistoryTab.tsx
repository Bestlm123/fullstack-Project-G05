// import { useState, useEffect, useCallback } from 'react';
// import axios from 'axios';
// import { History, CheckCircle, XCircle } from 'lucide-react';

// const API_URL = 'http://localhost:3000/api';

// interface HistoryTabProps {
//   currentRole: 'admin' | 'user';
//   currentUserId: string;
// }

// interface Borrowing {
//   id: number;
//   studentId: string;
//   assetId: string;
//   quantity: number;
//   borrowDate: string;
//   returnDate: string;
//   status: 'pending' | 'approved' | 'rejected' | 'returned';
// }

// interface Asset {
//   id: string;
//   name: string;
// }

// // 🌟 Interface สำหรับจัดกลุ่มบิล (รวมหลายอุปกรณ์ไว้ในบิลเดียว)
// interface GroupedBorrowing {
//   id: number; // ใช้ ID ของรายการแรกเป็นรหัสบิล
//   studentId: string;
//   borrowDate: string;
//   returnDate: string;
//   status: string;
//   items: Borrowing[];
// }

// export default function HistoryTab({ currentRole, currentUserId }: HistoryTabProps) {
//   const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
//   const [assetsMap, setAssetsMap] = useState<Record<string, string>>({});

//   const fetchData = useCallback(async () => {
//     try {
//       const [borrowRes, assetsRes] = await Promise.all([
//         axios.get(`${API_URL}/borrowings`),
//         axios.get(`${API_URL}/assets`)
//       ]);

//       const map: Record<string, string> = {};
//       assetsRes.data.forEach((a: Asset) => { map[a.id] = a.name; });
//       setAssetsMap(map);

//       if (currentRole === 'admin') {
//         setBorrowings(borrowRes.data);
//       } else {
//         setBorrowings(borrowRes.data.filter((b: Borrowing) => b.studentId === currentUserId));
//       }
//     } catch (error) {
//       console.error(error);
//     }
//   }, [currentRole, currentUserId]);

//   useEffect(() => {
//     // eslint-disable-next-line react-hooks/set-state-in-effect
//     fetchData();
//   }, [fetchData]);

//   // ฟังก์ชันอัปเดตสถานะแบบมัดรวม (Approve / Reject / Return ทั้งบิล)
//   const handleUpdateMultiple = async (ids: number[], newStatus: string) => {
//     let actionName = '';
//     if (newStatus === 'approved') actionName = 'อนุมัติ';
//     else if (newStatus === 'rejected') actionName = 'ปฏิเสธ';
//     else if (newStatus === 'returned') actionName = 'รับคืน';

//     if (!confirm(`ยืนยันการ ${actionName} อุปกรณ์ในบิลนี้ทั้งหมด (${ids.length} รายการ)?`)) return;
    
//     try {
//       await Promise.all(ids.map(id => axios.patch(`${API_URL}/borrowings/${id}`, { status: newStatus })));
//       alert(`ทำรายการ ${actionName} เรียบร้อยแล้ว`);
//       fetchData(); 
//     } catch (error) {
//       console.error(error);
//       alert('เกิดข้อผิดพลาดในการอัปเดตบางรายการ');
//     }
//   };

//   const renderStatusBadge = (status: string) => {
//     switch(status) {
//       case 'pending': return <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500', backgroundColor: '#fef3c7', color: '#92400e' }}>รออนุมัติ</span>;
//       case 'approved': return <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500', backgroundColor: '#dbeafe', color: '#1e40af' }}>กำลังยืม</span>;
//       case 'returned': return <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500', backgroundColor: '#dcfce7', color: '#166534' }}>คืนแล้ว</span>;
//       case 'rejected': return <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500', backgroundColor: '#fee2e2', color: '#991b1b' }}>ไม่อนุมัติ</span>;
//       default: return <span>{status}</span>;
//     }
//   };

//   // 🌟 ฟังก์ชันอเนกประสงค์สำหรับจัดกลุ่มข้อมูลเป็น "บิลเดียว"
//   const groupBorrowings = (list: Borrowing[]): GroupedBorrowing[] => {
//     const grouped = list.reduce((acc, curr) => {
//       // มัดรวมด้วยเงื่อนไข: คนเดียวกัน + วันยืม + วันคืน + สถานะเดียวกัน
//       const key = `${curr.studentId}_${curr.borrowDate}_${curr.returnDate}_${curr.status}`;
//       if (!acc[key]) {
//         acc[key] = {
//           id: curr.id, // ยึด ID แรกที่เจอเป็นเลขที่บิล
//           studentId: curr.studentId,
//           borrowDate: curr.borrowDate,
//           returnDate: curr.returnDate,
//           status: curr.status,
//           items: []
//         };
//       }
//       acc[key].items.push(curr);
//       return acc;
//     }, {} as Record<string, GroupedBorrowing>);
    
//     // เรียงบิลล่าสุดขึ้นก่อน (มากไปน้อย)
//     return Object.values(grouped).sort((a, b) => b.id - a.id);
//   };

//   // แยกข้อมูลสำหรับแสดงผล
//   const pendingBorrowings = borrowings.filter(b => b.status === 'pending');
//   const otherBorrowings = borrowings.filter(b => b.status !== 'pending'); 

//   // นำข้อมูลไปเข้าฟังก์ชันจัดกลุ่ม
//   const pendingGroups = groupBorrowings(pendingBorrowings);
  
//   // สำหรับตารางประวัติ: ถ้าเป็น Admin โชว์ที่เหลือ (ไม่รวม pending) / ถ้า User โชว์ทั้งหมดที่จัดกลุ่มแล้ว
//   const displayGroups = currentRole === 'admin' 
//     ? groupBorrowings(otherBorrowings) 
//     : groupBorrowings(borrowings);

//   return (
//     <div>
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
//         <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
//           <History size={24} color="#8b0000" /> 
//           {currentRole === 'admin' ? 'จัดการคำขอยืม (Admin)' : 'สถานะคำขอยืมของฉัน'}
//         </h2>
//       </div>

//       {/* 🌟 โซน 1: คำขอใหม่รอการอนุมัติ (เฉพาะ Admin) */}
//       {currentRole === 'admin' && (
//         <div className="table-card" style={{ marginBottom: '32px', border: '2px solid #fde68a' }}>
//           <div style={{ padding: '16px', backgroundColor: '#fffbeb', borderBottom: '1px solid #fde68a', fontWeight: 'bold', color: '#92400e', fontSize: '16px' }}>
//             🔔 คำขอใหม่รอการอนุมัติ ({pendingGroups.length} บิล)
//           </div>
//           <table>
//             <thead>
//               <tr>
//                 <th>รหัสอ้างอิง</th>
//                 <th>ผู้ขอยืม (รหัสนักศึกษา)</th>
//                 <th>รายการอุปกรณ์ที่ต้องการ</th>
//                 <th className="text-center">กำหนดการ (ยืม - คืน)</th>
//                 <th className="text-center">จัดการคำขอ</th>
//               </tr>
//             </thead>
//             <tbody>
//               {pendingGroups.length === 0 ? (
//                 <tr><td colSpan={5} className="empty-state" style={{ padding: '24px' }}>ยังไม่มีคำขอใหม่ในระบบ</td></tr>
//               ) : (
//                 pendingGroups.map((group) => {
//                   const itemIds = group.items.map((i: Borrowing) => i.id);
//                   return (
//                     <tr key={group.id}>
//                       <td className="text-muted" style={{ fontWeight: 'bold' }}>REQ-{group.id}</td>
//                       <td className="font-medium" style={{ fontSize: '16px' }}>{group.studentId}</td>
//                       <td>
//                         <ul style={{ margin: 0, paddingLeft: '16px', color: '#374151' }}>
//                           {group.items.map((i: Borrowing) => (
//                             <li key={i.id}>{assetsMap[i.assetId] || `#${i.assetId}`} <span style={{ fontWeight: 'bold' }}>(x{i.quantity})</span></li>
//                           ))}
//                         </ul>
//                       </td>
//                       <td className="text-center" style={{ fontSize: '14px' }}>
//                         <div>{new Date(group.borrowDate).toLocaleDateString('th-TH')}</div>
//                         <div style={{ color: '#6b7280', fontSize: '12px' }}>ถึง</div>
//                         <div>{new Date(group.returnDate).toLocaleDateString('th-TH')}</div>
//                       </td>
//                       <td className="text-center">
//                         <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
//                           <button onClick={() => handleUpdateMultiple(itemIds, 'approved')} style={{ padding: '6px 12px', backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '6px', cursor: 'pointer', width: '120px', display: 'flex', justifyContent: 'center', gap: '4px', fontWeight: '500' }}>
//                             <CheckCircle size={16} /> อนุมัติทั้งบิล
//                           </button>
//                           <button onClick={() => handleUpdateMultiple(itemIds, 'rejected')} style={{ padding: '6px 12px', backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', width: '120px', display: 'flex', justifyContent: 'center', gap: '4px' }}>
//                             <XCircle size={16} /> ปฏิเสธทั้งบิล
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   )
//                 })
//               )}
//             </tbody>
//           </table>
//         </div>
//       )}

//       {/* 🌟 โซน 2: ตารางประวัติการยืม (แสดงผลแบบรวมบิล) */}
//       <div className="table-card">
//         {currentRole === 'admin' && (
//           <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold', color: '#4b5563' }}>
//             📚 ประวัติอุปกรณ์ที่ถูกยืม / คืนแล้ว
//           </div>
//         )}
//         <table>
//           <thead>
//             <tr>
//               <th>รหัสอ้างอิง</th>
//               {currentRole === 'admin' && <th>รหัสนักศึกษา</th>}
//               <th>รายการอุปกรณ์</th>
//               <th className="text-center">กำหนดการ (ยืม - คืน)</th>
//               <th className="text-center">สถานะ</th>
//               {currentRole === 'admin' && <th className="text-center">การจัดการ</th>}
//             </tr>
//           </thead>
//           <tbody>
//             {displayGroups.length === 0 ? (
//               <tr>
//                 <td colSpan={currentRole === 'admin' ? 6 : 5} className="empty-state">
//                   {currentRole === 'admin' ? 'ไม่มีข้อมูลในระบบ' : 'คุณยังไม่มีประวัติการยืมอุปกรณ์'}
//                 </td>
//               </tr>
//             ) : (
//               displayGroups.map((group) => {
//                 const itemIds = group.items.map(i => i.id);
//                 return (
//                   <tr key={group.id}>
//                     <td className="text-muted" style={{ fontWeight: 'bold' }}>REQ-{group.id}</td>
//                     {currentRole === 'admin' && <td className="font-medium">{group.studentId}</td>}
//                     <td>
//                       <ul style={{ margin: 0, paddingLeft: '16px', color: '#374151' }}>
//                         {group.items.map((i: Borrowing) => (
//                           <li key={i.id}>{assetsMap[i.assetId] || `(ลบไปแล้ว) #${i.assetId}`} <span style={{ fontWeight: 'bold' }}>(x{i.quantity})</span></li>
//                         ))}
//                       </ul>
//                     </td>
//                     <td className="text-center" style={{ fontSize: '14px' }}>
//                       <div>{new Date(group.borrowDate).toLocaleDateString('th-TH')}</div>
//                       <div style={{ color: '#6b7280', fontSize: '12px' }}>ถึง</div>
//                       <div>{new Date(group.returnDate).toLocaleDateString('th-TH')}</div>
//                     </td>
//                     <td className="text-center">{renderStatusBadge(group.status)}</td>
                    
//                     {/* ปุ่มรับคืนของ สำหรับ Admin เท่านั้น (กดรับคืนทั้งบิล) */}
//                     {currentRole === 'admin' && (
//                       <td className="text-center">
//                         {group.status === 'approved' ? (
//                           <button onClick={() => handleUpdateMultiple(itemIds, 'returned')} style={{ padding: '6px 12px', backgroundColor: '#e0e7ff', color: '#3730a3', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', width: '100px' }}>
//                             รับคืนทั้งหมด
//                           </button>
//                         ) : (
//                           <span style={{ color: '#9ca3af', fontSize: '12px' }}>-</span>
//                         )}
//                       </td>
//                     )}
//                   </tr>
//                 )
//               })
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { History, CheckCircle, XCircle } from 'lucide-react';

const API_URL = 'http://localhost:3000/api';

interface HistoryTabProps {
  currentRole: 'admin' | 'user';
  currentUserId: string;
}

interface Borrowing {
  id: number;
  studentId: string;
  assetId: string;
  quantity: number;
  borrowDate: string;
  returnDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'returned';
}

interface Asset {
  id: string;
  name: string;
}

interface GroupedBorrowing {
  id: number;
  studentId: string;
  borrowDate: string;
  returnDate: string;
  status: string;
  items: Borrowing[];
}

export default function HistoryTab({ currentRole, currentUserId }: HistoryTabProps) {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [assetsMap, setAssetsMap] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    try {
      const [borrowRes, assetsRes] = await Promise.all([
        axios.get(`${API_URL}/borrowings`),
        axios.get(`${API_URL}/assets`)
      ]);

      const map: Record<string, string> = {};
      assetsRes.data.forEach((a: Asset) => { map[a.id] = a.name; });
      setAssetsMap(map);

      if (currentRole === 'admin') {
        setBorrowings(borrowRes.data);
      } else {
        setBorrowings(borrowRes.data.filter((b: Borrowing) => b.studentId === currentUserId));
      }
    } catch (error) {
      console.error(error);
    }
  }, [currentRole, currentUserId]);

  // 🌟 เพิ่มระบบดึงข้อมูลอัตโนมัติ (Polling ทุก 3 วินาที)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleUpdateMultiple = async (ids: number[], newStatus: string) => {
    let actionName = '';
    if (newStatus === 'approved') actionName = 'อนุมัติ';
    else if (newStatus === 'rejected') actionName = 'ปฏิเสธ';
    else if (newStatus === 'returned') actionName = 'รับคืน';

    if (!confirm(`ยืนยันการ ${actionName} อุปกรณ์ในบิลนี้ทั้งหมด (${ids.length} รายการ)?`)) return;
    
    try {
      await Promise.all(ids.map(id => axios.patch(`${API_URL}/borrowings/${id}`, { status: newStatus })));
      alert(`ทำรายการ ${actionName} เรียบร้อยแล้ว`);
      fetchData(); 
    } catch (error) {
      console.error(error);
      alert('เกิดข้อผิดพลาดในการอัปเดตบางรายการ');
    }
  };

  const renderStatusBadge = (status: string) => {
    switch(status) {
      case 'pending': return <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500', backgroundColor: '#fef3c7', color: '#92400e' }}>รออนุมัติ</span>;
      case 'approved': return <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500', backgroundColor: '#dbeafe', color: '#1e40af' }}>กำลังยืม</span>;
      case 'returned': return <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500', backgroundColor: '#dcfce7', color: '#166534' }}>คืนแล้ว</span>;
      case 'rejected': return <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500', backgroundColor: '#fee2e2', color: '#991b1b' }}>ไม่อนุมัติ</span>;
      default: return <span>{status}</span>;
    }
  };

  const groupBorrowings = (list: Borrowing[]): GroupedBorrowing[] => {
    const grouped = list.reduce((acc, curr) => {
      const key = `${curr.studentId}_${curr.borrowDate}_${curr.returnDate}_${curr.status}`;
      if (!acc[key]) {
        acc[key] = {
          id: curr.id, 
          studentId: curr.studentId,
          borrowDate: curr.borrowDate,
          returnDate: curr.returnDate,
          status: curr.status,
          items: []
        };
      }
      acc[key].items.push(curr);
      return acc;
    }, {} as Record<string, GroupedBorrowing>);
    
    return Object.values(grouped).sort((a, b) => b.id - a.id);
  };

  const pendingBorrowings = borrowings.filter(b => b.status === 'pending');
  const otherBorrowings = borrowings.filter(b => b.status !== 'pending'); 

  const pendingGroups = groupBorrowings(pendingBorrowings);
  const displayGroups = groupBorrowings(borrowings); // แสดงผลทั้งหมดของ User คนนั้นๆ

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={24} color="#8b0000" /> 
          {currentRole === 'admin' ? 'จัดการคำขอยืม (Admin)' : 'สถานะคำขอยืมของฉัน'}
        </h2>
      </div>

      {currentRole === 'admin' && (
        <div className="table-card" style={{ marginBottom: '32px', border: '2px solid #fde68a' }}>
          <div style={{ padding: '16px', backgroundColor: '#fffbeb', borderBottom: '1px solid #fde68a', fontWeight: 'bold', color: '#92400e', fontSize: '16px' }}>
            🔔 คำขอใหม่รอการอนุมัติ ({pendingGroups.length} บิล)
          </div>
          <table>
            <thead>
              <tr>
                <th>รหัสอ้างอิง</th>
                <th>ผู้ขอยืม (รหัสนักศึกษา)</th>
                <th>รายการอุปกรณ์ที่ต้องการ</th>
                <th className="text-center">กำหนดการ (ยืม - คืน)</th>
                <th className="text-center">จัดการคำขอ</th>
              </tr>
            </thead>
            <tbody>
              {pendingGroups.length === 0 ? (
                <tr><td colSpan={5} className="empty-state" style={{ padding: '24px' }}>ยังไม่มีคำขอใหม่ในระบบ</td></tr>
              ) : (
                pendingGroups.map((group) => {
                  const itemIds = group.items.map((i: Borrowing) => i.id);
                  return (
                    <tr key={group.id}>
                      <td className="text-muted" style={{ fontWeight: 'bold' }}>REQ-{group.id}</td>
                      <td className="font-medium" style={{ fontSize: '16px' }}>{group.studentId}</td>
                      <td>
                        <ul style={{ margin: 0, paddingLeft: '16px', color: '#374151' }}>
                          {group.items.map((i: Borrowing) => (
                            <li key={i.id}>{assetsMap[i.assetId] || `#${i.assetId}`} <span style={{ fontWeight: 'bold' }}>(x{i.quantity})</span></li>
                          ))}
                        </ul>
                      </td>
                      <td className="text-center" style={{ fontSize: '14px' }}>
                        <div>{new Date(group.borrowDate).toLocaleDateString('th-TH')}</div>
                        <div style={{ color: '#6b7280', fontSize: '12px' }}>ถึง</div>
                        <div>{new Date(group.returnDate).toLocaleDateString('th-TH')}</div>
                      </td>
                      <td className="text-center">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                          <button onClick={() => handleUpdateMultiple(itemIds, 'approved')} style={{ padding: '6px 12px', backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '6px', cursor: 'pointer', width: '120px', display: 'flex', justifyContent: 'center', gap: '4px', fontWeight: '500' }}>
                            <CheckCircle size={16} /> อนุมัติทั้งบิล
                          </button>
                          <button onClick={() => handleUpdateMultiple(itemIds, 'rejected')} style={{ padding: '6px 12px', backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', width: '120px', display: 'flex', justifyContent: 'center', gap: '4px' }}>
                            <XCircle size={16} /> ปฏิเสธทั้งบิล
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="table-card">
        {currentRole === 'admin' && (
          <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold', color: '#4b5563' }}>
            📚 ประวัติอุปกรณ์ที่ถูกยืม / คืนแล้ว
          </div>
        )}
        <table>
          <thead>
            <tr>
              <th>รหัสอ้างอิง</th>
              {currentRole === 'admin' && <th>รหัสนักศึกษา</th>}
              <th>รายการอุปกรณ์</th>
              <th className="text-center">กำหนดการ (ยืม - คืน)</th>
              <th className="text-center">สถานะ</th>
              {currentRole === 'admin' && <th className="text-center">การจัดการ</th>}
            </tr>
          </thead>
          <tbody>
            {(currentRole === 'admin' ? groupBorrowings(otherBorrowings) : displayGroups).length === 0 ? (
              <tr>
                <td colSpan={currentRole === 'admin' ? 6 : 5} className="empty-state">
                  {currentRole === 'admin' ? 'ไม่มีข้อมูลในระบบ' : 'คุณยังไม่มีประวัติการยืมอุปกรณ์'}
                </td>
              </tr>
            ) : (
              (currentRole === 'admin' ? groupBorrowings(otherBorrowings) : displayGroups).map((group) => {
                const itemIds = group.items.map(i => i.id);
                return (
                  <tr key={group.id}>
                    <td className="text-muted" style={{ fontWeight: 'bold' }}>REQ-{group.id}</td>
                    {currentRole === 'admin' && <td className="font-medium">{group.studentId}</td>}
                    <td>
                      <ul style={{ margin: 0, paddingLeft: '16px', color: '#374151' }}>
                        {group.items.map((i: Borrowing) => (
                          <li key={i.id}>{assetsMap[i.assetId] || `(ลบไปแล้ว) #${i.assetId}`} <span style={{ fontWeight: 'bold' }}>(x{i.quantity})</span></li>
                        ))}
                      </ul>
                    </td>
                    <td className="text-center" style={{ fontSize: '14px' }}>
                      <div>{new Date(group.borrowDate).toLocaleDateString('th-TH')}</div>
                      <div style={{ color: '#6b7280', fontSize: '12px' }}>ถึง</div>
                      <div>{new Date(group.returnDate).toLocaleDateString('th-TH')}</div>
                    </td>
                    <td className="text-center">{renderStatusBadge(group.status)}</td>
                    
                    {currentRole === 'admin' && (
                      <td className="text-center">
                        {group.status === 'approved' ? (
                          <button onClick={() => handleUpdateMultiple(itemIds, 'returned')} style={{ padding: '6px 12px', backgroundColor: '#e0e7ff', color: '#3730a3', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', width: '100px' }}>
                            รับคืนทั้งหมด
                          </button>
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: '12px' }}>-</span>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}