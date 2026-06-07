import React, { useState } from 'react';
import axios from 'axios';

export default function AiGatewayTerminal() {
  const [aiIntent, setAiIntent] = useState('');
  const [aiResults, setAiResults] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const handleAiQuery = async (e) => {
    e.preventDefault();
    if (!aiIntent.trim()) return;

    setAiLoading(true);
    setAiError('');
    setAiResults(null);

    const dbMode = localStorage.getItem('db_mode') || 'local';
    const host = dbMode === 'local' ? 'postgres-db' : (localStorage.getItem('db_host') || '');
    const username = dbMode === 'local' ? 'warehouse_admin' : (localStorage.getItem('db_user') || '');
    const password = dbMode === 'local' ? 'supersecretpassword' : (localStorage.getItem('db_pass') || '');
    const databaseName = dbMode === 'local' ? 'warehouse_ledger' : (localStorage.getItem('db_name') || '');
    const port = dbMode === 'local' ? 5432 : parseInt(localStorage.getItem('db_port') || '5432', 10);

    try {
      const res = await axios.post('http://localhost:3000/api/v1/query', {
        targetTable: ["loading_manifest", "archived_manifest", "truck_inventory", "bay_door_routing"],
        intent: aiIntent.trim(),
        clientDB: {
          host,
          username,
          password,
          databaseName,
          port
        }
      });

      if (res.data.success) {
        setAiResults(res.data);
      } else {
        setAiError(res.data.error || 'Unknown query parsing failure.');
      }
    } catch (err) {
      console.error(err);
      setAiError(err.response?.data?.error || 'Security baseline check failed: Destructive or non-read action detected.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div>
      <h3>3. AI Data Access Gateway Terminal</h3>
      <p className="card-desc">Interact with the database using natural language queries (Text-to-SQL + SQLGuard Firewall).</p>

      <form onSubmit={handleAiQuery} className="ai-terminal-form" style={{ marginBottom: '20px' }}>
        <div className="form-group">
          <label>Enter Operational Intent (Natural Language)</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              value={aiIntent} 
              onChange={(e) => setAiIntent(e.target.value)} 
              placeholder="e.g. Show all active trucks or get count of pending packages"
              className="crud-input"
              style={{ flex: 1 }}
            />
            <button type="submit" className="action-btn sync-btn" style={{ width: '120px' }} disabled={aiLoading}>
              {aiLoading ? 'Thinking...' : 'Compile'}
            </button>
          </div>
        </div>
      </form>

      {aiError && (
        <div className="status-toast error-text" style={{ padding: '10px', background: 'rgba(231, 76, 60, 0.05)', borderRadius: '6px', textAlign: 'left', fontSize: '12px', lineHeight: '18px' }}>
          {aiError}
        </div>
      )}

      {aiResults && (
        <div className="ai-response-panel">
          <div className="sql-box" style={{ background: '#0b0c10', border: '1px solid #1f2833', padding: '12px', borderRadius: '6px', marginBottom: '20px' }}>
            <label style={{ fontSize: '9px', color: '#66fcf1' }}>COMPILED SQL (SQLGUARD APPROVED)</label>
            <code style={{ color: '#2ecc71', fontSize: '13px', fontFamily: 'monospace', display: 'block', wordBreak: 'break-all', marginTop: '5px' }}>
              {aiResults.compiledQuery}
            </code>
          </div>

          <label style={{ color: '#66fcf1', fontSize: '10px' }}>
            EXTRACTED RECORDS ({aiResults.recordsCount})
          </label>
          
          {aiResults.data && aiResults.data.length > 0 ? (
            <div className="crud-table-container" style={{ maxHeight: '250px', overflowY: 'auto', marginTop: '10px' }}>
              <table className="crud-table">
                <thead>
                  <tr>
                    {Object.keys(aiResults.data[0]).map(key => (
                      <th key={key}>{key.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {aiResults.data.map((row, idx) => (
                    <tr key={idx}>
                      {Object.values(row).map((val, colIdx) => (
                        <td key={colIdx}>{val === null ? 'NULL' : val.toString()}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#8892b0', fontSize: '12px', marginTop: '10px' }}>No records returned by query.</p>
          )}
        </div>
      )}
    </div>
  );
}
