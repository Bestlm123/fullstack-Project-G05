import { useEffect, useState } from 'react';
import axios from 'axios';
import { GraduationCap, LayoutDashboard, ArchiveRestore, LogOut } from 'lucide-react';
import './index.css'; // นำเข้าไฟล์ CSS ตรงนี้

interface Item {
  id: number;
  name: string;
  description: string;
  quantity: number;
}

const API_URL = 'http://localhost:3000/api/admin/items';

function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [newItem, setNewItem] = useState({ name: '', description: '', quantity: 0 });

  const fetchItems = async () => {
    try {
      const response = await axios.get(API_URL);
      setItems(response.data);
    } catch (error) {
      console.error("Error fetching items:", error);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchItems();
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(API_URL, newItem);
      setNewItem({ name: '', description: '', quantity: 0 });
      fetchItems();
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm('แน่ใจนะว่าจะลบชิ้นนี้?')) return;
    try {
      await axios.delete(`${API_URL}/${id}`);
      fetchItems();
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  return (
    <div className="app-container">
      
      {/* 1. Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <GraduationCap size={28} color="#8b0000" />
          <h1>ทุนเรียนดี</h1>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-item inactive">
            <LayoutDashboard size={20} />
            <span>หน้าหลัก</span>
          </div>
          <div className="nav-item active">
            <ArchiveRestore size={20} />
            <span>ระบบยืมของ</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              <img src="https://scontent.fcnx1-1.fna.fbcdn.net/v/t39.30808-1/454320986_3789311998016642_7333894274257071936_n.jpg?stp=c120.0.720.720a_cp6_dst-jpg_tt6&cstp=mx720x720&ctp=s160x160&_nc_cat=111&ccb=1-7&_nc_sid=1d2534&_nc_ohc=g9hP_Wg8i68Q7kNvwF7XwD-&_nc_oc=AdpxO3IPVzzuY-OJ4kb3ed_YHm7RC11MpVbNnaNdbLMXOs3pKMwu9Trth3DgAN43CRE&_nc_zt=24&_nc_ht=scontent.fcnx1-1.fna&_nc_gid=07lNooGH6MaxP3owEPtoNQ&_nc_ss=7b2a8&oh=00_AQAD-pf5IIFeh9pnI7SswPJpbhCRaSOiylL8S9CLcBrnTg&oe=6A701413" alt="Profile" />
            </div>
            <div className="user-info">
              <div className="name">Thittawin Khongna</div>
              <div className="email">thittawin_khongna@cmu.ac.th</div>
            </div>
          </div>
          <button className="logout-btn">
            <LogOut size={18} />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* 2. Main Content */}
      <main className="main-content">
        <header className="header">
          <h2>ระบบยืมของ - สโมสรนักศึกษาคณะวิศวกรรมศาสตร์</h2>
        </header>

        <div className="content-area">
          
          {/* ฟอร์มเพิ่มของ */}
          <div className="card">
            <h3 className="card-title">➕ เพิ่มรายการของใหม่</h3>
            <form onSubmit={handleAddItem} className="form-group">
              <input 
                type="text" 
                placeholder="ชื่อของ" 
                required 
                value={newItem.name} 
                onChange={(e) => setNewItem({...newItem, name: e.target.value})} 
                className="form-input" 
              />
              <input 
                type="text" 
                placeholder="รายละเอียด" 
                value={newItem.description} 
                onChange={(e) => setNewItem({...newItem, description: e.target.value})} 
                className="form-input desc" 
              />
              <input 
                type="number" 
                placeholder="จำนวน" 
                required 
                min="0" 
                value={newItem.quantity} 
                onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value)})} 
                className="form-input qty" 
              />
              <button type="submit" className="btn-primary">
                เพิ่มรายการ
              </button>
            </form>
          </div>

          {/* ตาราง Inventory */}
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>ชื่อของ</th>
                  <th>รายละเอียด</th>
                  <th>จำนวน</th>
                  <th className="text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-state">ยังไม่มีรายการสิ่งของ</td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td className="font-medium">{item.name}</td>
                      <td className="text-muted">{item.description}</td>
                      <td>
                        <span className="badge-qty">{item.quantity}</span>
                      </td>
                      <td className="text-center">
                        <button onClick={() => handleDeleteItem(item.id)} className="btn-delete">
                          ลบ
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </main>
    </div>
  );
}

export default App;