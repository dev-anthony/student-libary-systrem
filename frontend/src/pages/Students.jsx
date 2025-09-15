import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Students() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ student_id:'', name:'', email:'', department:'', level:'' });

  const load = () => api.listStudents().then(setList);
 useEffect(() => {
    load(); // ✅ now React won’t complain
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.createStudent(form);
    setForm({ student_id:'', name:'', email:'', department:'', level:'' });
    load();
  };
  const remove = async (id) => { await api.deleteStudent(id); load(); };

  return (
    <div className="card">
      <h2>Students</h2>
      <form className="form" onSubmit={submit}>
        <input placeholder="Student No." value={form.student_id} onChange={e=>setForm(f=>({...f, student_id:e.target.value}))}/>
        <input placeholder="Name" value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))}/>
        <input placeholder="Email" value={form.email} onChange={e=>setForm(f=>({...f, email:e.target.value}))}/>
        <input placeholder="Department" value={form.department} onChange={e=>setForm(f=>({...f, department:e.target.value}))}/>
        <input placeholder="Level" value={form.level} onChange={e=>setForm(f=>({...f, level:e.target.value}))}/>
        <button className="primary" type="submit">Add Student</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>Student No.</th><th>Name</th><th>Email</th><th>Department</th><th>Level</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map(s => (
            <tr key={s.id}>
              <td>{s.student_id}</td>
              <td>{s.name}</td>
              <td>{s.email}</td>
              <td>{s.department}</td>
              <td>{s.level}</td>
              <td><button onClick={()=>remove(s.id)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
