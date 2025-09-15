import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Books() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ title:'', author:'', category:'', total_copies:1 });

  const load = () => api.listBooks().then(setList);
  useEffect(() => {
    load(); // ✅ now React won’t complain
  }, []);
  const submit = async (e) => {
    e.preventDefault();
    await api.createBook({ ...form, total_copies: Number(form.total_copies) || 1 });
    setForm({ title:'', author:'', category:'', total_copies:1 });
    load();
  };
  const remove = async (id) => { await api.deleteBook(id); load(); };

  return (
    <div className="card">
      <h2>Books</h2>
      <form className="form" onSubmit={submit}>
        <input placeholder="Title" value={form.title} onChange={e=>setForm(f=>({...f, title:e.target.value}))}/>
        <input placeholder="Author" value={form.author} onChange={e=>setForm(f=>({...f, author:e.target.value}))}/>
        <input placeholder="Category" value={form.category} onChange={e=>setForm(f=>({...f, category:e.target.value}))}/>
        <input type="number" min="1" placeholder="Total Copies" value={form.total_copies} onChange={e=>setForm(f=>({...f, total_copies:e.target.value}))}/>
        <button className="primary" type="submit">Add Book</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>Title</th><th>Author</th><th>Category</th><th>Total</th><th>Available</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map(b => (
            <tr key={b.id}>
              <td>{b.title}</td>
              <td>{b.author}</td>
              <td>{b.category}</td>
              <td>{b.total_copies}</td>
              <td>{b.available_copies}</td>
              <td><button onClick={()=>remove(b.id)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
