import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

const AssetDump = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, 'lectureAssets'));
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAssets(all.sort((a, b) => (a.type || '').localeCompare(b.type || '') || (a.title || '').localeCompare(b.title || '')));
      setLoading(false);
    })();
  }, []);

  if (loading) return <div style={{ padding: 40, color: '#fff', background: '#111' }}>Loading assets...</div>;

  const materials = assets.filter(a => a.type === 'material');
  const homework = assets.filter(a => a.type === 'homework');
  const others = assets.filter(a => a.type !== 'material' && a.type !== 'homework');

  return (
    <div style={{ padding: 40, color: '#e2e8f0', background: '#111', fontFamily: 'monospace', fontSize: 13, minHeight: '100vh' }}>
      <h1 style={{ color: '#fff', fontSize: 20, marginBottom: 20 }}>Asset Title Dump ({assets.length} total)</h1>
      
      <h2 style={{ color: '#6ee7b7', marginBottom: 10 }}>Materials ({materials.length})</h2>
      <ul>{materials.map(a => <li key={a.id} style={{ marginBottom: 4 }}>
        <span style={{ color: '#94a3b8' }}>[{a.id}]</span> <b>{a.title}</b>
        {a.lectureIds?.length > 0 && <span style={{ color: '#818cf8' }}> → lectures: {a.lectureIds.join(', ')}</span>}
      </li>)}</ul>

      <h2 style={{ color: '#fbbf24', marginTop: 30, marginBottom: 10 }}>Homework ({homework.length})</h2>
      <ul>{homework.map(a => <li key={a.id} style={{ marginBottom: 4 }}>
        <span style={{ color: '#94a3b8' }}>[{a.id}]</span> <b>{a.title}</b>
        {a.lectureIds?.length > 0 && <span style={{ color: '#818cf8' }}> → lectures: {a.lectureIds.join(', ')}</span>}
      </li>)}</ul>

      <h2 style={{ color: '#f87171', marginTop: 30, marginBottom: 10 }}>Other Types ({others.length})</h2>
      <ul>{others.map(a => <li key={a.id} style={{ marginBottom: 4 }}>
        <span style={{ color: '#94a3b8' }}>[{a.id}] [{a.type}]</span> <b>{a.title}</b>
      </li>)}</ul>
    </div>
  );
};

export default AssetDump;
