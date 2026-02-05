
import React, { useState, useEffect, useRef } from 'react';
import { HoneypotSession, Message, IntelligenceReport } from './types';
import { analyzeScam } from './geminiService';
import { 
  ShieldAlert, 
  Terminal, 
  Database, 
  Activity, 
  Camera, 
  Send, 
  Plus, 
  Cpu, 
  Fingerprint, 
  Link as LinkIcon, 
  Phone, 
  CreditCard,
  ChevronRight,
  UserCheck
} from 'lucide-react';

const ConfidenceGauge: React.FC<{ score: number }> = ({ score }) => {
  const percentage = Math.min(Math.max(score * 100, 0), 100);
  const color = percentage > 70 ? 'text-red-500' : percentage > 40 ? 'text-yellow-500' : 'text-emerald-500';
  const strokeColor = percentage > 70 ? '#ef4444' : percentage > 40 ? '#eab308' : '#10b981';
  
  return (
    <div className="relative flex flex-col items-center justify-center p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
      <svg className="w-32 h-20">
        <path
          d="M 10 70 A 50 50 0 0 1 110 70"
          fill="none"
          stroke="#1e293b"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M 10 70 A 50 50 0 0 1 110 70"
          fill="none"
          stroke={strokeColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray="157"
          strokeDashoffset={157 - (157 * (percentage / 100))}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className={`text-2xl font-black mt-[-20px] ${color} mono`}>{percentage.toFixed(0)}%</div>
      <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Confidence Score</div>
    </div>
  );
};

const App: React.FC = () => {
  const [sessions, setSessions] = useState<HoneypotSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [lastIntelCount, setLastIntelCount] = useState(0);
  const [flashIntel, setFlashIntel] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionFileInputRef = useRef<HTMLInputElement>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const latestMessage = activeSession?.messages[activeSession.messages.length - 1];
  const lastReport = latestMessage?.metadata;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages]);

  useEffect(() => {
    if (activeSession && activeSession.extractedIntel.length > lastIntelCount) {
      setFlashIntel(true);
      const timer = setTimeout(() => setFlashIntel(false), 2000);
      setLastIntelCount(activeSession.extractedIntel.length);
      return () => clearTimeout(timer);
    }
  }, [activeSession?.extractedIntel.length]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const startNewAnalysis = async () => {
    if (!inputText && !selectedImage) return;
    setIsAnalyzing(true);
    try {
      const report = await analyzeScam(inputText, selectedImage || undefined);
      const newSession: HoneypotSession = {
        id: Math.random().toString(36).substr(2, 9),
        status: report.analysis.scam_detected ? 'engaging' : 'archived',
        category: report.analysis.scam_category,
        confidence: report.analysis.confidence_score,
        persona: report.response_strategy.current_persona,
        lastActivity: new Date(),
        extractedIntel: Array.from(new Set([
          ...report.intelligence_extraction.upi_ids,
          ...report.intelligence_extraction.phishing_links,
          ...report.intelligence_extraction.phone_numbers,
          ...report.intelligence_extraction.crypto_wallets
        ])),
        messages: [
          {
            id: 'm1',
            role: 'threat_actor',
            content: inputText || "[Visual Evidence Submitted]",
            image: selectedImage || undefined,
            timestamp: new Date()
          },
          {
            id: 'm2',
            role: 'asi_gemini',
            content: report.generated_response,
            timestamp: new Date(),
            metadata: report
          }
        ]
      };
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setInputText('');
      setSelectedImage(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const replyInSession = async () => {
    if (!activeSession || (!inputText && !selectedImage)) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'threat_actor',
      content: inputText || "[Visual Evidence Submitted]",
      image: selectedImage || undefined,
      timestamp: new Date()
    };
    setSessions(prev => prev.map(s => s.id === activeSession.id ? { ...s, messages: [...s.messages, userMsg] } : s));
    const currentInput = inputText;
    const currentImage = selectedImage;
    setInputText('');
    setSelectedImage(null);
    setIsAnalyzing(true);
    try {
      const history = activeSession.messages.map(m => ({
        role: m.role === 'threat_actor' ? 'user' : 'model',
        content: m.content
      }));
      const report = await analyzeScam(currentInput, currentImage || undefined, history);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'asi_gemini',
        content: report.generated_response,
        timestamp: new Date(),
        metadata: report
      };
      setSessions(prev => prev.map(s => s.id === activeSession.id ? { 
          ...s, 
          messages: [...s.messages, aiMsg],
          extractedIntel: Array.from(new Set([
            ...s.extractedIntel,
            ...report.intelligence_extraction.upi_ids,
            ...report.intelligence_extraction.phishing_links,
            ...report.intelligence_extraction.phone_numbers
          ]))
      } : s));
    } catch (error) { console.error(error); } 
    finally { setIsAnalyzing(false); }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-950 overflow-hidden">
      {/* Top Utility Header */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/50 flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center shadow-lg shadow-red-900/20">
            <ShieldAlert size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-black text-sm tracking-tighter">TOKATO <span className="text-slate-500 font-normal">v4.0.2</span></h1>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] text-emerald-500/80 font-bold mono tracking-tighter uppercase tracking-widest">System Autonomous</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active Ops</span>
            <span className="text-xs font-bold mono text-slate-300">{sessions.length}</span>
          </div>
          <button 
            onClick={() => { setActiveSessionId(null); setSelectedImage(null); setInputText(''); }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-lg border border-slate-700 transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>
      </header>

      {/* Main Command Center Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* SIDEBAR: Operation List */}
        <aside className="w-64 border-r border-slate-800 flex flex-col shrink-0 bg-slate-900/20">
          <div className="p-4 border-b border-slate-800 bg-slate-900/40">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Current Operations</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.length === 0 && (
              <div className="p-4 text-center">
                <p className="text-xs text-slate-600 italic">No active deployments</p>
              </div>
            )}
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => { setActiveSessionId(s.id); setSelectedImage(null); setInputText(''); }}
                className={`w-full text-left p-3 rounded-xl transition-all group border ${activeSessionId === s.id ? 'bg-red-500/10 border-red-500/50' : 'bg-transparent border-transparent hover:bg-slate-800/50'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${activeSessionId === s.id ? 'text-red-400' : 'text-slate-500'}`}>{s.category}</span>
                  <span className="text-[9px] text-slate-600 mono">{new Date(s.lastActivity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="text-sm font-bold text-slate-200 truncate group-hover:text-white">{s.persona}</div>
                <div className="flex items-center gap-2 mt-2">
                   <Activity size={10} className={s.status === 'engaging' ? 'text-emerald-500' : 'text-slate-600'} />
                   <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500" style={{ width: `${s.confidence * 100}%` }}></div>
                   </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* PANELS WRAPPER */}
        <div className="flex-1 flex min-w-0">
          {!activeSessionId ? (
            /* EMPTY STATE / DEPLOYMENT HUB */
            <div className="flex-1 flex flex-col items-center justify-center p-12 cyber-grid">
               <div className="max-w-xl w-full space-y-8">
                  <div className="text-center space-y-2">
                    <ShieldAlert size={48} className="text-red-500 mx-auto mb-4" />
                    <h2 className="text-3xl font-black tracking-tight text-white uppercase">Initialize Counter-Measure</h2>
                    <p className="text-slate-400 text-sm">Upload threat data to deploy an autonomous agentic persona.</p>
                  </div>
                  
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
                    <textarea 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Paste suspicious text or phishing email headers..."
                      className="w-full h-40 bg-slate-950 border border-slate-800 rounded-2xl p-6 text-sm focus:ring-2 focus:ring-red-500/50 outline-none transition-all resize-none text-slate-300 font-medium"
                    />
                    
                    <div className="flex gap-4">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex-1 h-14 border border-dashed rounded-2xl flex items-center justify-center gap-3 transition-all ${selectedImage ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'}`}
                      >
                        {selectedImage ? <Activity className="animate-pulse" /> : <Camera size={20} />}
                        <span className="text-xs font-bold uppercase tracking-widest">{selectedImage ? 'Image Loaded' : 'Upload Evidence'}</span>
                      </button>
                      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*" />
                      
                      <button 
                        onClick={startNewAnalysis}
                        disabled={isAnalyzing || (!inputText && !selectedImage)}
                        className={`px-8 h-14 rounded-2xl flex items-center gap-3 font-black text-xs uppercase tracking-widest transition-all ${isAnalyzing ? 'bg-slate-800 text-slate-500' : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20 active:scale-95'}`}
                      >
                        {isAnalyzing ? <Activity className="animate-spin" /> : <Send size={18} />}
                        Analyze
                      </button>
                    </div>
                  </div>
               </div>
            </div>
          ) : (
            /* 3-PANE SPLIT VIEW */
            <div className="flex-1 flex min-w-0">
              
              {/* PANEL 1: ENGAGEMENT FEED (30%) */}
              <section className="w-[30%] border-r border-slate-800 flex flex-col bg-slate-950/40">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Engagement Log</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {activeSession.messages.map((m) => (
                    <div key={m.id} className={`flex ${m.role === 'asi_gemini' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[90%] rounded-2xl p-3 shadow-sm border ${
                        m.role === 'asi_gemini' 
                        ? 'bg-slate-900 border-slate-800 text-slate-200' 
                        : 'bg-red-950/20 border-red-900/30 text-red-50'
                      }`}>
                        <div className="text-[9px] font-bold opacity-40 mb-1 uppercase tracking-tighter">
                          {m.role === 'asi_gemini' ? activeSession.persona : 'THREAT ACTOR'}
                        </div>
                        {m.image && <img src={m.image} alt="evidence" className="rounded-lg mb-2 border border-slate-800" />}
                        <p className="text-xs leading-relaxed whitespace-pre-wrap">{m.content}</p>
                        <div className="mt-2 text-[8px] opacity-30 mono text-right">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                {/* Chat Input */}
                <div className="p-4 border-t border-slate-800 bg-slate-900/20">
                  <div className="relative flex items-center gap-2">
                    <button 
                      onClick={() => sessionFileInputRef.current?.click()}
                      className={`p-2 rounded-lg transition-colors ${selectedImage ? 'text-red-500 bg-red-500/10' : 'text-slate-500 hover:bg-slate-800'}`}
                    >
                      <Camera size={16} />
                    </button>
                    <input type="file" ref={sessionFileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*" />
                    <input 
                      type="text" 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && replyInSession()}
                      placeholder="Input reply..."
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-red-500/30"
                    />
                    <button 
                      onClick={replyInSession}
                      disabled={isAnalyzing || (!inputText && !selectedImage)}
                      className="p-2.5 bg-red-600 rounded-xl text-white hover:bg-red-700 transition-all disabled:bg-slate-800"
                    >
                      {isAnalyzing ? <Activity size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                  </div>
                  {selectedImage && (
                    <div className="mt-2 text-[9px] text-red-400 bg-red-400/5 p-1 rounded border border-red-500/20 inline-block px-2 italic">
                      + Visual payload attached
                    </div>
                  )}
                </div>
              </section>

              {/* PANEL 2: REASONING ENGINE (40%) */}
              <section className="w-[40%] border-r border-slate-800 flex flex-col bg-slate-950">
                <div className="p-4 border-b border-slate-800 flex items-center gap-2">
                  <Cpu size={14} className="text-blue-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reasoning Engine</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Confidence Metric */}
                  <ConfidenceGauge score={activeSession.confidence} />

                  {/* Reasoning Log */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      <div className="flex items-center gap-2"><Terminal size={12} /> Trace Log</div>
                      <span className="mono text-emerald-500">LIVE</span>
                    </div>
                    <div className="terminal-bg border border-slate-800 rounded-2xl p-4 h-64 overflow-y-auto font-mono text-[11px] leading-relaxed shadow-inner">
                      <div className="text-emerald-500/80 mb-2 opacity-50 select-none">
                        [{new Date().toISOString()}] Initializing neural audit...
                      </div>
                      <div className="text-slate-300">
                        {lastReport?.analysis.reasoning_trace || "Waiting for signal analysis..."}
                      </div>
                      {isAnalyzing && (
                         <div className="mt-2 text-blue-400 animate-pulse">
                            Processing new payload...
                         </div>
                      )}
                    </div>
                  </div>

                  {/* Persona State Card */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                     <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500">
                           <UserCheck size={20} />
                        </div>
                        <div>
                           <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active Persona</div>
                           <div className="text-sm font-black text-slate-200 uppercase">{activeSession.persona}</div>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
                           <div className="text-[8px] text-slate-500 font-bold uppercase mb-1">Emotion</div>
                           <div className="text-[10px] font-bold text-slate-300">{lastReport?.response_strategy.emotional_state || "NEUTRAL"}</div>
                        </div>
                        <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
                           <div className="text-[8px] text-slate-500 font-bold uppercase mb-1">Next Vector</div>
                           <div className="text-[10px] font-bold text-slate-300">{lastReport?.response_strategy.next_action || "MONITOR"}</div>
                        </div>
                     </div>
                  </div>
                </div>
              </section>

              {/* PANEL 3: INTELLIGENCE VAULT (30%) */}
              <section className="w-[30%] flex flex-col bg-slate-950/20">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <Database size={14} className="text-amber-500" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Extracted Vault</span>
                   </div>
                   <div className="text-[10px] mono text-slate-600">{activeSession.extractedIntel.length} Entities</div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Category Card: Financial Coordinates */}
                  <div className={`p-4 rounded-2xl border border-slate-800 space-y-3 transition-all ${flashIntel ? 'intel-card-flash' : 'bg-slate-900/30'}`}>
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2 mb-2">
                      <CreditCard size={12} /> Financial Coordinates
                    </div>
                    <div className="space-y-2">
                       {lastReport?.intelligence_extraction.upi_ids.length === 0 && lastReport?.intelligence_extraction.bank_details.length === 0 ? (
                         <div className="text-[10px] italic text-slate-700 py-2">No coordinates identified...</div>
                       ) : (
                         <>
                           {lastReport?.intelligence_extraction.upi_ids.map((id, idx) => (
                             <div key={idx} className="flex items-center justify-between p-2 bg-slate-950 rounded-lg border border-slate-800 group">
                                <div className="text-[10px] font-bold text-amber-400 mono truncate mr-2">{id}</div>
                                <button onClick={() => navigator.clipboard.writeText(id)} className="text-slate-600 hover:text-white transition-colors"><ChevronRight size={14} /></button>
                             </div>
                           ))}
                           {lastReport?.intelligence_extraction.bank_details.map((id, idx) => (
                             <div key={idx} className="flex items-center justify-between p-2 bg-slate-950 rounded-lg border border-slate-800">
                                <div className="text-[10px] font-bold text-blue-400 mono truncate">{id}</div>
                             </div>
                           ))}
                         </>
                       )}
                    </div>
                  </div>

                  {/* Category Card: Phishing Vectors */}
                  <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2 mb-2">
                      <LinkIcon size={12} /> Phishing Vectors
                    </div>
                    <div className="space-y-2">
                       {lastReport?.intelligence_extraction.phishing_links.length === 0 ? (
                         <div className="text-[10px] italic text-slate-700 py-2">No links identified...</div>
                       ) : (
                         lastReport?.intelligence_extraction.phishing_links.map((link, idx) => (
                           <div key={idx} className="p-2 bg-slate-950 rounded-lg border border-red-900/20 text-[10px] text-red-400/80 mono break-all">
                              {link}
                           </div>
                         ))
                       )}
                    </div>
                  </div>

                  {/* Category Card: Communication Nodes */}
                  <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2 mb-2">
                      <Phone size={12} /> Comm Nodes
                    </div>
                    <div className="space-y-2">
                       {lastReport?.intelligence_extraction.phone_numbers.length === 0 ? (
                         <div className="text-[10px] italic text-slate-700 py-2">No numbers identified...</div>
                       ) : (
                         lastReport?.intelligence_extraction.phone_numbers.map((phone, idx) => (
                           <div key={idx} className="flex items-center gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800 text-[10px] text-emerald-400 mono">
                              <Fingerprint size={10} className="text-slate-600" /> {phone}
                           </div>
                         ))
                       )}
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-slate-800">
                   <button className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2">
                      <Database size={14} /> Commit to Intel Database
                   </button>
                </div>
              </section>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
