import { useEffect, useState, useRef } from 'react';
import './BuildLogs.css';

interface BuildLogsProps {
  deploymentId: string;
  onBack: () => void;
}

export default function BuildLogs({ deploymentId, onBack }: BuildLogsProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Connect to Server-Sent Events (SSE) stream for real-time logs
    const eventSource = new EventSource(`http://localhost:5000/api/import/logs/${deploymentId}`);
    
    eventSource.onmessage = (event) => {
      setLogs(prev => [...prev, event.data]);
    };
    
    eventSource.onerror = () => {
      // Stream closed or error
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [deploymentId]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="build-wrapper">
      <div className="build-header">
        <div>
          <h2 className="build-title">Building Deployment</h2>
          <p className="build-subtitle">Deployment ID: {deploymentId}</p>
        </div>
        <button className="build-back-btn" onClick={onBack}>Cancel Build</button>
      </div>

      <div className="build-terminal">
        <div className="build-terminal-header">
          <div className="build-terminal-dots">
            <span className="dot red"></span>
            <span className="dot yellow"></span>
            <span className="dot green"></span>
          </div>
          <span className="build-terminal-title">bash - build</span>
        </div>
        <div className="build-terminal-body">
          {logs.length === 0 && <div className="log-line text-muted">Connecting to build server...</div>}
          {logs.map((log, i) => (
            <div key={i} className="log-line">
              <span className="log-timestamp">{new Date().toLocaleTimeString()}</span>
              <span className={`log-text ${log.includes('[ERROR]') ? 'text-red' : ''} ${log.includes('[SYSTEM]') ? 'text-blue' : ''}`}>
                {log}
              </span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
