import { useEffect, useState } from 'react';
import axios from 'axios';

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
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🛠️ Admin Inventory Dashboard</h1>
      
      <div style={{ background: '#f9f9f9', padding: '15px', marginBottom: '20px', borderRadius: '8px' }}>
        <h3>➕ เพิ่มของใหม่</h3>
        <form onSubmit={handleAddItem} style={{ display: 'flex', gap: '10px' }}>
          <input type="text" placeholder="ชื่อของ" required value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} />
          <input type="text" placeholder="รายละเอียด" value={newItem.description} onChange={(e) => setNewItem({...newItem, description: e.target.value})} />
          <input type="number" placeholder="จำนวน" required min="0" value={newItem.quantity} onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value)})} />
          <button type="submit" style={{ background: 'green', color: 'white', border: 'none', padding: '5px 15px', cursor: 'pointer' }}>เพิ่มรายการ</button>
        </form>
      </div>

      <table border={1} cellPadding={10} style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr style={{ background: '#eee' }}>
            <th>ID</th>
            <th>ชื่อของ</th>
            <th>รายละเอียด</th>
            <th>จำนวน</th>
            <th>จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id} style={{ textAlign: 'center' }}>
              <td>{item.id}</td>
              <td>{item.name}</td>
              <td>{item.description}</td>
              <td>{item.quantity}</td>
              <td>
                <button onClick={() => handleDeleteItem(item.id)} style={{ background: 'red', color: 'white', border: 'none', padding: '5px 10px', cursor: 'pointer' }}>ลบ</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;