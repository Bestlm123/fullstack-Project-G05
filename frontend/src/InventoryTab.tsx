// import { useState, useEffect, useCallback } from 'react';
// import axios from 'axios';
// import { Plus, Edit, Trash2, Package, X, ShoppingCart, Minus } from 'lucide-react';

// const API_URL = 'http://localhost:3000/api';

// interface InventoryTabProps {
//   currentRole: 'admin' | 'user';
//   currentUserId: string; 
// }

// interface Asset {
//   id: string; 
//   name: string;
//   category: string;
//   quantity: number;
//   availableQuantity: number;
//   status: string;
// }

// interface CartItem {
//   asset: Asset;
//   quantity: number;
// }

// export default function InventoryTab({ currentRole, currentUserId }: InventoryTabProps) {
//   const [assets, setAssets] = useState<Asset[]>([]);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [isEditMode, setIsEditMode] = useState(false);
//   const [formData, setFormData] = useState({ id: '', name: '', category: 'ทั่วไป', quantity: 1, status: 'available' });

//   // 🛒 ระบบตะกร้า
//   const [cart, setCart] = useState<CartItem[]>([]);
//   const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  
//   const [assetToAdd, setAssetToAdd] = useState<Asset | null>(null);
//   const [addQty, setAddQty] = useState(1);

//   const today = new Date();
//   const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
//   const [cartDates, setCartDates] = useState(() => {
//     const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
//     return {
//       borrowDate: todayStr,
//       returnDate: nextWeek.toISOString().split('T')[0]
//     };
//   });

//   const fetchAssets = useCallback(async () => {
//     try {
//       const res = await axios.get(`${API_URL}/assets`);
//       setAssets(res.data);
//     } catch (error) {
//       console.error(error);
//     }
//   }, []);

//   useEffect(() => {
//     // eslint-disable-next-line react-hooks/set-state-in-effect
//     fetchAssets();
//   }, [fetchAssets]);

//   const openAddToCartModal = (asset: Asset) => {
//     setAssetToAdd(asset);
//     setAddQty(1);
//   };

//   const confirmAddToCart = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!assetToAdd) return;

//     // เช็คของที่เหลือจริงโดยหักของที่อยู่ในตะกร้าออกก่อน
//     const existingInCart = cart.find(item => item.asset.id === assetToAdd.id);
//     const currentCartQty = existingInCart ? existingInCart.quantity : 0;
//     const realAvailable = assetToAdd.availableQuantity - currentCartQty;

//     if (addQty > realAvailable) {
//       alert('จำนวนที่เลือกเกินกว่าของที่เหลืออยู่ครับ!');
//       return;
//     }

//     if (existingInCart) {
//       setCart(cart.map(item => item.asset.id === assetToAdd.id ? { ...item, quantity: item.quantity + addQty } : item));
//     } else {
//       setCart([...cart, { asset: assetToAdd, quantity: addQty }]);
//     }
//     setAssetToAdd(null);
//   };

//   const removeFromCart = (assetId: string) => {
//     setCart(cart.filter(item => item.asset.id !== assetId));
//   };

//   const updateCartQuantity = (assetId: string, newQty: number, maxQty: number) => {
//     if (newQty < 1 || newQty > maxQty) return;
//     setCart(cart.map(item => item.asset.id === assetId ? { ...item, quantity: newQty } : item));
//   };

//   const handleCheckout = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (cart.length === 0) return;
//     try {
//       await Promise.all(cart.map(item => 
//         axios.post(`${API_URL}/borrowings`, {
//           assetId: item.asset.id,
//           studentId: currentUserId,
//           quantity: item.quantity,
//           borrowDate: cartDates.borrowDate,
//           returnDate: cartDates.returnDate
//         })
//       ));
      
//       alert('✅ ส่งคำขอยืมสำเร็จ!\n\nแอดมินได้รับคำขอของคุณแล้ว\nกรุณาเช็คผลการอนุมัติที่เมนู "สถานะคำขอยืมของฉัน" ด้านซ้ายมือครับ');
//       setCart([]);
//       setIsCartModalOpen(false);
//       fetchAssets();
//     } catch (error) {
//       console.error(error);
//       alert('เกิดข้อผิดพลาดในการยืมอุปกรณ์');
//     }
//   };

//   const handleOpenAddModal = () => {
//     setIsEditMode(false);
//     setFormData({ id: '', name: '', category: 'ทั่วไป', quantity: 1, status: 'available' });
//     setIsModalOpen(true);
//   };

//   const handleOpenEditModal = (asset: Asset) => {
//     setIsEditMode(true);
//     setFormData({ id: asset.id, name: asset.name, category: asset.category, quantity: asset.quantity, status: asset.status });
//     setIsModalOpen(true);
//   };

//   const handleSaveAsset = async (e: React.FormEvent) => {
//     e.preventDefault();
//     try {
//       if (isEditMode) {
//         await axios.put(`${API_URL}/assets/${formData.id}`, formData);
//         alert('อัปเดตข้อมูลอุปกรณ์สำเร็จ!');
//       } else {
//         await axios.post(`${API_URL}/assets`, formData);
//         alert('เพิ่มของเข้าระบบสำเร็จ!');
//       }
//       setIsModalOpen(false);
//       fetchAssets();
//     } catch (error) {
//       console.error(error);
//       alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
//     }
//   };

//   const handleDelete = async (id: string) => {
//     if (confirm('ยืนยันการลบอุปกรณ์นี้?')) {
//       try {
//         await axios.delete(`${API_URL}/assets/${id}`);
//         fetchAssets();
//       } catch (error) {
//         console.error(error);
//         alert('ลบไม่สำเร็จ');
//       }
//     }
//   };

//   return (
//     <div>
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
//         <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
//           <Package size={24} color="#8b0000" /> บริการยืมของ (Inventory)
//         </h2>
        
//         <div style={{ display: 'flex', gap: '12px' }}>
//           {currentRole === 'user' && (
//             <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#d97706' }} onClick={() => setIsCartModalOpen(true)}>
//               <ShoppingCart size={18} /> ตะกร้าของฉัน {cart.length > 0 && `(${cart.length})`}
//             </button>
//           )}
//           {currentRole === 'admin' && (
//             <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={handleOpenAddModal}>
//               <Plus size={18} /> เพิ่มอุปกรณ์ใหม่
//             </button>
//           )}
//         </div>
//       </div>

//       <div className="table-card">
//         <table>
//           <thead>
//             <tr>
//               <th>รหัสอุปกรณ์</th>
//               <th>ชื่ออุปกรณ์</th>
//               <th>หมวดหมู่</th>
//               <th className="text-center">จำนวนทั้งหมด</th>
//               <th className="text-center">คงเหลือ</th>
//               <th className="text-center">สถานะ</th>
//               <th className="text-center">จัดการ</th>
//             </tr>
//           </thead>
//           <tbody>
//             {assets.length === 0 ? (
//               <tr><td colSpan={7} className="empty-state">ไม่มีอุปกรณ์ในระบบ</td></tr>
//             ) : (
//               assets.map((item) => {
//                 // 🌟 คำนวณหักลบจำนวนที่อยู่ในตะกร้าแบบเรียลไทม์
//                 const cartItem = cart.find(c => c.asset.id === item.id);
//                 const displayAvailable = item.availableQuantity - (cartItem ? cartItem.quantity : 0);

//                 return (
//                   <tr key={item.id}>
//                     <td className="text-muted" style={{ fontWeight: '600' }}>#{item.id}</td>
//                     <td className="font-medium">{item.name}</td>
//                     <td className="text-muted"><span style={{ backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{item.category}</span></td>
//                     <td className="text-center">{item.quantity}</td>
//                     <td className="text-center">
//                       <span className="badge-qty" style={{ backgroundColor: displayAvailable > 0 ? '#dcfce7' : '#fee2e2', color: displayAvailable > 0 ? '#166534' : '#991b1b' }}>
//                         {displayAvailable}
//                       </span>
//                     </td>
//                     <td className="text-center">
//                       <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', fontWeight: '500', backgroundColor: item.status === 'available' ? '#dcfce7' : '#f3f4f6', color: item.status === 'available' ? '#166534' : '#4b5563' }}>
//                         {item.status === 'available' ? 'พร้อมยืม' : 'ปิดใช้งาน'}
//                       </span>
//                     </td>
//                     <td className="text-center" style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
//                       {currentRole === 'admin' ? (
//                         <>
//                           <button className="btn-icon btn-edit" title="แก้ไข" onClick={() => handleOpenEditModal(item)}><Edit size={16} /></button>
//                           <button className="btn-icon btn-delete" title="ลบ" onClick={() => handleDelete(item.id)}><Trash2 size={16} /></button>
//                         </>
//                       ) : (
//                         <button 
//                           className="btn-borrow" 
//                           style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: (displayAvailable > 0 && item.status === 'available') ? 'pointer' : 'not-allowed', backgroundColor: '#e0e7ff', color: '#3730a3', opacity: (displayAvailable > 0 && item.status === 'available') ? 1 : 0.5 }}
//                           disabled={displayAvailable <= 0 || item.status !== 'available'}
//                           onClick={() => openAddToCartModal(item)}
//                         >
//                           {displayAvailable > 0 && item.status === 'available' ? '+ ใส่ตะกร้า' : 'หมดแล้ว'}
//                         </button>
//                       )}
//                     </td>
//                   </tr>
//                 );
//               })
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* Modal เลือกจำนวนก่อนลงตะกร้า */}
//       {assetToAdd && (
//         <div className="modal-overlay" style={{ zIndex: 1000 }}>
//           <div className="modal-content" style={{ maxWidth: '400px' }}>
//             <div className="modal-header">
//               <h3>📦 ระบุจำนวนที่ต้องการ</h3>
//               <button className="btn-close" onClick={() => setAssetToAdd(null)}><X size={20} /></button>
//             </div>
//             <form className="modal-form" onSubmit={confirmAddToCart}>
//               <div style={{ marginBottom: '16px' }}>
//                 <strong>{assetToAdd.name}</strong> (คงเหลือให้เลือก: {assetToAdd.availableQuantity - (cart.find(c => c.asset.id === assetToAdd.id)?.quantity || 0)})
//               </div>
//               <div className="form-field">
//                 <input required type="number" min="1" max={assetToAdd.availableQuantity - (cart.find(c => c.asset.id === assetToAdd.id)?.quantity || 0)} className="form-input" value={addQty} onChange={e => setAddQty(parseInt(e.target.value))} autoFocus />
//               </div>
//               <div className="modal-actions" style={{ marginTop: '24px' }}>
//                 <button type="button" className="btn-secondary" onClick={() => setAssetToAdd(null)}>ยกเลิก</button>
//                 <button type="submit" className="btn-primary">ยืนยัน</button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* Modal ตะกร้าของฉัน */}
//       {isCartModalOpen && (
//         <div className="modal-overlay">
//           <div className="modal-content" style={{ maxWidth: '600px' }}>
//             <div className="modal-header">
//               <h3>🛒 ตะกร้ายืมของ</h3>
//               <button className="btn-close" onClick={() => setIsCartModalOpen(false)}><X size={20} /></button>
//             </div>
            
//             {cart.length === 0 ? (
//               <div style={{ padding: '40px 0', textAlign: 'center', color: '#6b7280' }}>ยังไม่มีของในตะกร้า ลองเลือกของที่ต้องการยืมดูสิครับ</div>
//             ) : (
//               <form className="modal-form" onSubmit={handleCheckout}>
//                 <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px' }}>
//                   {cart.map(item => (
//                     <div key={item.asset.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed #f3f4f6' }}>
//                       <div style={{ flex: 1 }}>
//                         <div style={{ fontWeight: '600' }}>{item.asset.name}</div>
//                         <div style={{ fontSize: '12px', color: '#6b7280' }}>รหัส: #{item.asset.id}</div>
//                       </div>
//                       <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//                         <input type="number" min="1" max={item.asset.availableQuantity} value={item.quantity} onChange={(e) => updateCartQuantity(item.asset.id, parseInt(e.target.value), item.asset.availableQuantity)} style={{ width: '60px', padding: '4px', textAlign: 'center' }} />
//                         <button type="button" onClick={() => removeFromCart(item.asset.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Minus size={18} /></button>
//                       </div>
//                     </div>
//                   ))}
//                 </div>

//                 <div style={{ display: 'flex', gap: '16px' }}>
//                   <div className="form-field" style={{ flex: 1 }}>
//                     <label>วันที่ยืมทั้งหมด</label>
//                     <input required type="date" className="form-input" min={todayStr} value={cartDates.borrowDate} onChange={e => setCartDates(prev => ({ ...prev, borrowDate: e.target.value, returnDate: prev.returnDate < e.target.value ? e.target.value : prev.returnDate }))} />
//                   </div>
//                   <div className="form-field" style={{ flex: 1 }}>
//                     <label>วันที่กำหนดคืนทั้งหมด</label>
//                     <input required type="date" className="form-input" min={cartDates.borrowDate} value={cartDates.returnDate} onChange={e => setCartDates({...cartDates, returnDate: e.target.value})} />
//                   </div>
//                 </div>

//                 <div className="modal-actions" style={{ marginTop: '24px' }}>
//                   <button type="button" className="btn-secondary" onClick={() => setIsCartModalOpen(false)}>เลือกของเพิ่ม</button>
//                   <button type="submit" className="btn-primary">ส่งคำขอยืม</button>
//                 </div>
//               </form>
//             )}
//           </div>
//         </div>
//       )}

//       {/* Modal เพิ่ม/แก้ไข อุปกรณ์ (Admin) */}
//       {isModalOpen && (
//         <div className="modal-overlay">
//           <div className="modal-content">
//             <div className="modal-header">
//               <h3>{isEditMode ? '✏️ แก้ไขอุปกรณ์' : '📦 เพิ่มอุปกรณ์ใหม่'}</h3>
//               <button className="btn-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
//             </div>
//             <form className="modal-form" onSubmit={handleSaveAsset}>
//               <div className="form-field">
//                 <label>รหัสอุปกรณ์ (ID) *</label>
//                 <input required type="text" maxLength={10} className="form-input" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} disabled={isEditMode} style={{ backgroundColor: isEditMode ? '#f3f4f6' : 'white' }} />
//               </div>
//               <div className="form-field">
//                 <label>ชื่ออุปกรณ์ *</label>
//                 <input required type="text" className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
//               </div>
//               <div className="form-field">
//                 <label>หมวดหมู่</label>
//                 <select className="form-input" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
//                   <option value="ทั่วไป">ทั่วไป (General)</option>
//                   <option value="อิเล็กทรอนิกส์">อิเล็กทรอนิกส์ (Electronics)</option>
//                   <option value="เครื่องเขียน/อุปกรณ์จัดงาน">เครื่องเขียน/อุปกรณ์จัดงาน (Event Supplies)</option>
//                   <option value="กีฬา">กีฬา (Sports)</option>
//                   <option value="อื่นๆ">อื่นๆ (Others)</option>
//                 </select>
//               </div>
//               <div style={{ display: 'flex', gap: '16px' }}>
//                 <div className="form-field" style={{ flex: 1 }}>
//                   <label>จำนวนทั้งหมด *</label>
//                   <input required type="number" min="1" className="form-input" value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} />
//                 </div>
//                 <div className="form-field" style={{ flex: 1 }}>
//                   <label>สถานะเริ่มต้น *</label>
//                   <select className="form-input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
//                     <option value="available">✅ พร้อมให้ยืม</option>
//                     <option value="unavailable">❌ ยังไม่เปิดให้ยืม</option>
//                   </select>
//                 </div>
//               </div>
//               <div className="modal-actions" style={{ marginTop: '24px' }}>
//                 <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>ยกเลิก</button>
//                 <button type="submit" className="btn-primary">{isEditMode ? 'บันทึกการเปลี่ยนแปลง' : 'บันทึกอุปกรณ์'}</button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Package, X, ShoppingCart, Minus } from 'lucide-react';

const API_URL = 'http://localhost:3000/api';

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
}

interface CartItem {
  asset: Asset;
  quantity: number;
}

export default function InventoryTab({ currentRole, currentUserId }: InventoryTabProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', category: 'ทั่วไป', quantity: 1, status: 'available' });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  
  const [assetToAdd, setAssetToAdd] = useState<Asset | null>(null);
  const [addQty, setAddQty] = useState(1);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [cartDates, setCartDates] = useState(() => {
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return {
      borrowDate: todayStr,
      returnDate: nextWeek.toISOString().split('T')[0]
    };
  });

  const fetchAssets = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/assets`);
      setAssets(res.data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  // 🌟 เพิ่มระบบดึงข้อมูลอัตโนมัติ (Polling ทุก 3 วินาที) เพื่อให้เห็นการเปลี่ยนแปลงแบบเรียลไทม์
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAssets();
    const interval = setInterval(fetchAssets, 3000);
    return () => clearInterval(interval);
  }, [fetchAssets]);

  const openAddToCartModal = (asset: Asset) => {
    setAssetToAdd(asset);
    setAddQty(1);
  };

  const confirmAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetToAdd) return;

    const existingInCart = cart.find(item => item.asset.id === assetToAdd.id);
    const currentCartQty = existingInCart ? existingInCart.quantity : 0;
    const realAvailable = assetToAdd.availableQuantity - currentCartQty;

    if (addQty > realAvailable) {
      alert('จำนวนที่เลือกเกินกว่าของที่เหลืออยู่');
      return;
    }

    if (existingInCart) {
      setCart(cart.map(item => item.asset.id === assetToAdd.id ? { ...item, quantity: item.quantity + addQty } : item));
    } else {
      setCart([...cart, { asset: assetToAdd, quantity: addQty }]);
    }
    setAssetToAdd(null);
  };

  const removeFromCart = (assetId: string) => {
    setCart(cart.filter(item => item.asset.id !== assetId));
  };

  const updateCartQuantity = (assetId: string, newQty: number, maxQty: number) => {
    if (newQty < 1 || newQty > maxQty) return;
    setCart(cart.map(item => item.asset.id === assetId ? { ...item, quantity: newQty } : item));
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    try {
      await Promise.all(cart.map(item => 
        axios.post(`${API_URL}/borrowings`, {
          assetId: item.asset.id,
          studentId: currentUserId,
          quantity: item.quantity,
          borrowDate: cartDates.borrowDate,
          returnDate: cartDates.returnDate
        })
      ));
      
      alert('✅ ส่งคำขอยืมสำเร็จ!\n\nแอดมินได้รับคำขอของคุณแล้ว\nกรุณาเช็คผลการอนุมัติที่เมนู "สถานะคำขอยืมของฉัน"');
      setCart([]);
      setIsCartModalOpen(false);
      fetchAssets();
    } catch (error) {
      console.error(error);
      alert('เกิดข้อผิดพลาดในการยืมอุปกรณ์');
    }
  };

  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setFormData({ id: '', name: '', category: 'ทั่วไป', quantity: 1, status: 'available' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (asset: Asset) => {
    setIsEditMode(true);
    setFormData({ id: asset.id, name: asset.name, category: asset.category, quantity: asset.quantity, status: asset.status });
    setIsModalOpen(true);
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditMode) {
        await axios.put(`${API_URL}/assets/${formData.id}`, formData);
        alert('อัปเดตข้อมูลอุปกรณ์สำเร็จ!');
      } else {
        await axios.post(`${API_URL}/assets`, formData);
        alert('เพิ่มของเข้าระบบสำเร็จ!');
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
        await axios.delete(`${API_URL}/assets/${id}`);
        fetchAssets();
      } catch (error) {
        console.error(error);
        alert('ลบไม่สำเร็จ');
      }
    }
  };

  // 🌟 จัดเรียงรายการอุปกรณ์ตามรหัส (Alphanumeric Sort เช่น MD01, MIC01, MIC02)
  const sortedAssets = [...assets].sort((a, b) => 
    a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' })
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Package size={24} color="#8b0000" /> บริการยืมของ (Inventory)
        </h2>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          {currentRole === 'user' && (
            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#d97706' }} onClick={() => setIsCartModalOpen(true)}>
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

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>รหัสอุปกรณ์</th>
              <th>ชื่ออุปกรณ์</th>
              <th>หมวดหมู่</th>
              <th className="text-center">จำนวนทั้งหมด</th>
              <th className="text-center">คงเหลือ</th>
              <th className="text-center">สถานะ</th>
              <th className="text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {sortedAssets.length === 0 ? (
              <tr><td colSpan={7} className="empty-state">ไม่มีอุปกรณ์ในระบบ</td></tr>
            ) : (
              sortedAssets.map((item) => {
                const cartItem = cart.find(c => c.asset.id === item.id);
                const displayAvailable = item.availableQuantity - (cartItem ? cartItem.quantity : 0);

                return (
                  <tr key={item.id}>
                    <td className="text-muted" style={{ fontWeight: '600' }}>#{item.id}</td>
                    <td className="font-medium">{item.name}</td>
                    <td className="text-muted"><span style={{ backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{item.category}</span></td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-center">
                      <span className="badge-qty" style={{ backgroundColor: displayAvailable > 0 ? '#dcfce7' : '#fee2e2', color: displayAvailable > 0 ? '#166534' : '#991b1b' }}>
                        {displayAvailable}
                      </span>
                    </td>
                    <td className="text-center">
                      <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', fontWeight: '500', backgroundColor: item.status === 'available' ? '#dcfce7' : '#f3f4f6', color: item.status === 'available' ? '#166534' : '#4b5563' }}>
                        {item.status === 'available' ? 'พร้อมยืม' : 'ปิดใช้งาน'}
                      </span>
                    </td>
                    <td className="text-center" style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      {currentRole === 'admin' ? (
                        <>
                          <button className="btn-icon btn-edit" title="แก้ไข" onClick={() => handleOpenEditModal(item)}><Edit size={16} /></button>
                          <button className="btn-icon btn-delete" title="ลบ" onClick={() => handleDelete(item.id)}><Trash2 size={16} /></button>
                        </>
                      ) : (
                        <button 
                          className="btn-borrow" 
                          style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: (displayAvailable > 0 && item.status === 'available') ? 'pointer' : 'not-allowed', backgroundColor: '#e0e7ff', color: '#3730a3', opacity: (displayAvailable > 0 && item.status === 'available') ? 1 : 0.5 }}
                          disabled={displayAvailable <= 0 || item.status !== 'available'}
                          onClick={() => openAddToCartModal(item)}
                        >
                          {displayAvailable > 0 && item.status === 'available' ? '+ ใส่ตะกร้า' : 'ไม่สามารถยืมได้'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal เลือกจำนวนก่อนลงตะกร้า */}
      {assetToAdd && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>📦 ระบุจำนวนที่ต้องการ</h3>
              <button className="btn-close" onClick={() => setAssetToAdd(null)}><X size={20} /></button>
            </div>
            <form className="modal-form" onSubmit={confirmAddToCart}>
              <div style={{ marginBottom: '16px' }}>
                <strong>{assetToAdd.name}</strong> (คงเหลือให้เลือก: {assetToAdd.availableQuantity - (cart.find(c => c.asset.id === assetToAdd.id)?.quantity || 0)})
              </div>
              <div className="form-field">
                <input required type="number" min="1" max={assetToAdd.availableQuantity - (cart.find(c => c.asset.id === assetToAdd.id)?.quantity || 0)} className="form-input" value={addQty} onChange={e => setAddQty(parseInt(e.target.value))} autoFocus />
              </div>
              <div className="modal-actions" style={{ marginTop: '24px' }}>
                <button type="button" className="btn-secondary" onClick={() => setAssetToAdd(null)}>ยกเลิก</button>
                <button type="submit" className="btn-primary">ยืนยัน</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal ตะกร้าของฉัน */}
      {isCartModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>🛒 ตะกร้ายืมของ</h3>
              <button className="btn-close" onClick={() => setIsCartModalOpen(false)}><X size={20} /></button>
            </div>
            
            {cart.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#6b7280' }}>ยังไม่มีของในตะกร้า</div>
            ) : (
              <form className="modal-form" onSubmit={handleCheckout}>
                <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px' }}>
                  {cart.map(item => (
                    <div key={item.asset.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed #f3f4f6' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600' }}>{item.asset.name}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>รหัส: #{item.asset.id}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="number" min="1" max={item.asset.availableQuantity} value={item.quantity} onChange={(e) => updateCartQuantity(item.asset.id, parseInt(e.target.value), item.asset.availableQuantity)} style={{ width: '60px', padding: '4px', textAlign: 'center' }} />
                        <button type="button" onClick={() => removeFromCart(item.asset.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Minus size={18} /></button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div className="form-field" style={{ flex: 1 }}>
                    <label>วันที่ยืม</label>
                    <input required type="date" className="form-input" min={todayStr} value={cartDates.borrowDate} onChange={e => setCartDates(prev => ({ ...prev, borrowDate: e.target.value, returnDate: prev.returnDate < e.target.value ? e.target.value : prev.returnDate }))} />
                  </div>
                  <div className="form-field" style={{ flex: 1 }}>
                    <label>วันที่กำหนดคืน</label>
                    <input required type="date" className="form-input" min={cartDates.borrowDate} value={cartDates.returnDate} onChange={e => setCartDates({...cartDates, returnDate: e.target.value})} />
                  </div>
                </div>

                <div className="modal-actions" style={{ marginTop: '24px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setIsCartModalOpen(false)}>เลือกของเพิ่ม</button>
                  <button type="submit" className="btn-primary">ส่งคำขอยืม</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal เพิ่ม/แก้ไข อุปกรณ์ (Admin) */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{isEditMode ? '✏️ แก้ไขอุปกรณ์' : '📦 เพิ่มอุปกรณ์ใหม่'}</h3>
              <button className="btn-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <form className="modal-form" onSubmit={handleSaveAsset}>
              <div className="form-field">
                <label>รหัสอุปกรณ์ (ID) *</label>
                <input required type="text" maxLength={10} className="form-input" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} disabled={isEditMode} style={{ backgroundColor: isEditMode ? '#f3f4f6' : 'white' }} />
              </div>
              <div className="form-field">
                <label>ชื่ออุปกรณ์ *</label>
                <input required type="text" className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="form-field">
                <label>หมวดหมู่</label>
                <select className="form-input" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  <option value="ทั่วไป">ทั่วไป (General)</option>
                  <option value="อิเล็กทรอนิกส์">อิเล็กทรอนิกส์ (Electronics)</option>
                  <option value="เครื่องเขียน/อุปกรณ์จัดงาน">เครื่องเขียน/อุปกรณ์จัดงาน (Event Supplies)</option>
                  <option value="กีฬา">กีฬา (Sports)</option>
                  <option value="อื่นๆ">อื่นๆ (Others)</option>
                </select>
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
                    <option value="unavailable">❌ ไม่พร้อมให้ยืม</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions" style={{ marginTop: '24px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>ยกเลิก</button>
                <button type="submit" className="btn-primary">{isEditMode ? 'บันทึกการเปลี่ยนแปลง' : 'บันทึกอุปกรณ์'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}