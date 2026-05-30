'use client';

import { useState, useEffect, DragEvent, useRef } from 'react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [eventLinks, setEventLinks] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  
  const [studyPlanModalOpen, setStudyPlanModalOpen] = useState(false);
  const [studyPlanContent, setStudyPlanContent] = useState('');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [activeTaskTitle, setActiveTaskTitle] = useState('');

  const listBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'success') {
      setIsAuthenticated(true);
      window.history.replaceState({}, document.title, '/');
    }
  }, []);

  const handleLogin = () => {
    window.location.href = 'http://localhost:5000/api/auth/google';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setStatusMessage("Please select a syllabus PDF first!");
      return;
    }
    
    setLoading(true);
    setStatusMessage('');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include', 
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setParsedData(result.data);
      setStatusMessage(result.message);
    } catch (error: any) {
      setStatusMessage(error.message || 'Error processing syllabus.');
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const newData = { ...parsedData };
    newData.schedule[index][field] = value;
    setParsedData(newData);
  };

  const handleCourseTitleChange = (value: string) => {
    setParsedData({ ...parsedData, course_name: value });
  };

  const handleAddItem = () => {
    const newData = { ...parsedData };
    const newIndex = newData.schedule.length;
    
    newData.schedule.push({ 
      title: '', 
      due_date: '', 
      type: 'assignment',
      priority: 'Medium' 
    });
    
    setParsedData(newData);
    setEditingIndex(newIndex);
    setDeletingIndex(null);

    setTimeout(() => {
      listBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleDeleteItem = (index: number) => {
    const newData = { ...parsedData };
    newData.schedule.splice(index, 1); 
    setParsedData(newData);
    
    setOpenDropdown(null); 
    setDeletingIndex(null); 
    if (editingIndex === index) setEditingIndex(null);
  };

  const handleGenerateStudyPlan = async (item: any) => {
    setIsGeneratingPlan(true);
    setStudyPlanModalOpen(true);
    setActiveTaskTitle(item.title || 'Assignment');
    setStudyPlanContent('');

    try {
      const response = await fetch('http://localhost:5000/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_name: parsedData.course_name,
          task_title: item.title,
          due_date: item.due_date
        }),
        credentials: 'include', 
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setStudyPlanContent(result.plan);
    } catch (error: any) {
      setStudyPlanContent(error.message || 'Failed to generate plan.');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    setStatusMessage('');
    setEditingIndex(null); 
    setDeletingIndex(null);
    setIsEditingTitle(false);
    
    try {
      const response = await fetch('http://localhost:5000/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedData),
        credentials: 'include', 
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setStatusMessage(result.message);
      setEventLinks(result.links);
      setParsedData(null); 
      setFile(null);
    } catch (error: any) {
      setStatusMessage(error.message || 'Error syncing to Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      
      {studyPlanModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
            <div className="bg-indigo-600 p-6 flex justify-between items-center text-white">
              <div>
                <h3 className="font-bold text-lg leading-tight">AI Study Strategy</h3>
                <p className="text-indigo-200 text-sm">{activeTaskTitle}</p>
              </div>
              <button onClick={() => setStudyPlanModalOpen(false)} className="text-indigo-200 hover:text-white transition-colors bg-indigo-700/50 p-2 rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 text-slate-700 max-h-[60vh] overflow-y-auto">
              {isGeneratingPlan ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="font-semibold text-indigo-900 animate-pulse">Engineering your study plan...</p>
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {studyPlanContent}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 w-full max-w-4xl overflow-hidden relative">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Syllabus Sync</h1>
          <p className="text-slate-500 mt-2 text-sm max-w-sm mx-auto">
            Drop your PDF syllabus below. Our AI will extract your deadlines and seamlessly schedule them in Google Calendar.
          </p>
        </div>

        {!isAuthenticated ? (
          <div className="flex justify-center border-t border-slate-100 pt-8 mt-4">
            <button 
              onClick={handleLogin} 
              className="flex items-center justify-center gap-3 bg-white border border-slate-300 text-slate-700 px-8 py-3.5 rounded-xl font-semibold hover:bg-slate-50 hover:shadow-sm transition-all w-full max-w-md"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google Calendar
            </button>
          </div>
        ) : !parsedData ? (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer group
                ${isDragging ? 'border-indigo-500 bg-indigo-50 shadow-inner' : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-slate-100'}
              `}
            >
              <input 
                type="file" 
                accept=".pdf" 
                onChange={(e) => setFile(e.target.files?.[0] || null)} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <svg className={`w-10 h-10 mb-4 transition-colors ${isDragging ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm font-semibold text-slate-700">
                {file ? file.name : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs text-slate-500 mt-1">PDF documents only</p>
            </div>

            <button 
              onClick={handleUpload} 
              disabled={loading || !file}
              className="mt-6 w-full bg-slate-900 text-white px-6 py-3.5 rounded-xl font-semibold hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex justify-center items-center gap-2"
            >
              {loading ? 'Analyzing AI Document...' : 'Extract Dates'}
            </button>
          </div>
        ) : (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
              
              <div className="flex-grow flex items-center group/title mr-4">
                {isEditingTitle ? (
                  <input 
                    type="text"
                    value={parsedData.course_name}
                    onChange={(e) => handleCourseTitleChange(e.target.value)}
                    onBlur={() => setIsEditingTitle(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                    className="text-lg font-bold text-slate-800 bg-white border border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-lg px-2 py-1 outline-none w-full max-w-sm transition-all"
                    autoFocus
                  />
                ) : (
                  <>
                    <h2 className="text-lg font-bold text-slate-800 px-2 py-1 truncate max-w-sm">
                      {parsedData.course_name}
                    </h2>
                    <button
                      onClick={() => setIsEditingTitle(true)}
                      className="text-slate-400 hover:text-indigo-500 transition-colors p-1.5 ml-1 rounded-lg opacity-0 group-hover/title:opacity-100 focus:opacity-100 focus:outline-none shrink-0"
                      title="Edit course name"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </>
                )}
              </div>

              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full shrink-0">
                {parsedData.schedule.length} Events
              </span>
            </div>
            
            <div className="grid grid-cols-4 gap-4 px-5 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <div className="col-span-1">Assignment Name</div>
              <div className="col-span-1">Due Date</div>
              <div className="col-span-1 text-center">Priority</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
              {parsedData.schedule.map((item: any, index: number) => (
                <div key={index} className="grid grid-cols-4 gap-4 items-center bg-white border border-slate-200 p-2.5 rounded-xl hover:border-indigo-200 hover:shadow-sm transition-all group">
                  
                  {editingIndex === index ? (
                    <>
                      {/* COLUMN 1: TITLE */}
                      <div className="col-span-1">
                        <input 
                          type="text" 
                          value={item.title} 
                          onChange={(e) => handleItemChange(index, 'title', e.target.value)}
                          className="w-full border-none bg-indigo-50 p-2 rounded-lg text-sm font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="Assignment Name"
                          autoFocus
                        />
                      </div>
                      
                      {/* COLUMN 2: DATE */}
                      <div className="col-span-1">
                        <input 
                          type="date" 
                          value={item.due_date} 
                          onChange={(e) => handleItemChange(index, 'due_date', e.target.value)}
                          className="w-full border-none bg-indigo-50 p-2 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                        />
                      </div>
                      
                      {/* COLUMN 3: PRIORITY */}
                      <div className="col-span-1 relative flex justify-center">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === index ? null : index)}
                          className="w-28 bg-indigo-50 border-none p-2 rounded-lg text-sm font-bold flex justify-between items-center outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <span className={
                            item.priority === 'High' ? 'text-red-600' : 
                            item.priority === 'Low' ? 'text-emerald-600' : 
                            'text-amber-600'
                          }>
                            {item.priority || 'Medium'}
                          </span>
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {openDropdown === index && (
                          <div className="absolute top-10 z-10 w-28 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100">
                            {['High', 'Medium', 'Low'].map((p) => (
                              <button
                                key={p}
                                onClick={() => {
                                  handleItemChange(index, 'priority', p);
                                  setOpenDropdown(null);
                                }}
                                className={`w-full text-left px-4 py-2 text-sm font-bold hover:bg-slate-50 transition-colors
                                  ${p === 'High' ? 'text-red-600' : p === 'Low' ? 'text-emerald-600' : 'text-amber-600'}
                                `}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* COLUMN 4: ACTIONS */}
                      <div className="col-span-1 flex justify-end">
                        <button
                          onClick={() => setEditingIndex(null)}
                          className="text-emerald-500 hover:text-emerald-700 transition-colors p-1.5 rounded-lg hover:bg-emerald-50 focus:outline-none"
                          title="Save changes"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* COLUMN 1: TITLE */}
                      <div className="col-span-1 text-sm font-semibold text-slate-700 px-2 truncate">
                        {item.title || <span className="text-slate-400 italic">Untitled</span>}
                      </div>
                      
                      {/* COLUMN 2: DATE */}
                      <div className="col-span-1 text-sm text-slate-600 px-2 truncate">
                        {item.due_date ? new Date(item.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'}) : <span className="text-slate-400 italic">No Date</span>}
                      </div>
                      
                      {/* COLUMN 3: PRIORITY */}
                      <div className="col-span-1 text-center">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full
                          ${item.priority === 'High' ? 'bg-red-100 text-red-700' : 
                            item.priority === 'Low' ? 'bg-emerald-100 text-emerald-700' : 
                            'bg-amber-100 text-amber-700'}
                        `}>
                          {item.priority || 'Medium'}
                        </span>
                      </div>

                      {/* COLUMN 4: ACTIONS */}
                      <div className="col-span-1 flex justify-end gap-1">
                        
                        {/* Sparkle Button */}
                        {item.priority === 'High' && deletingIndex !== index && (
                          <button
                            onClick={() => handleGenerateStudyPlan(item)}
                            className="text-indigo-400 hover:text-indigo-600 transition-colors p-1.5 rounded-lg hover:bg-indigo-50 focus:outline-none opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Generate AI Study Plan"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </button>
                        )}

                        {/* Edit Button */}
                        {deletingIndex !== index && (
                          <button
                            onClick={() => setEditingIndex(index)}
                            className="text-slate-400 hover:text-indigo-500 transition-colors p-1.5 rounded-lg hover:bg-indigo-50 focus:outline-none opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Edit assignment"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        )}

                        {/* Delete/Confirm Button */}
                        {deletingIndex === index ? (
                          <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-100 animate-in fade-in">
                            <button
                              onClick={() => handleDeleteItem(index)}
                              className="text-[11px] uppercase tracking-wider font-bold text-white bg-red-500 hover:bg-red-600 px-2 py-1.5 rounded transition-colors"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setDeletingIndex(null)}
                              className="text-[11px] uppercase tracking-wider font-bold text-slate-500 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-1.5 rounded transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingIndex(index)}
                            className={`text-slate-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50 focus:outline-none 
                              ${editingIndex !== index ? 'opacity-0 group-hover:opacity-100 focus:opacity-100' : 'hidden'}`}
                            title="Delete assignment"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                  
                </div>
              ))}
              
              <div ref={listBottomRef} />
            </div>

            <button
              onClick={handleAddItem}
              className="mt-3 text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Deadline
            </button>
            
            <div className="flex gap-4 mt-6 pt-6 border-t border-slate-100">
              <button 
                onClick={() => { setParsedData(null); setFile(null); }}
                className="bg-white border border-slate-300 text-slate-700 px-6 py-3 rounded-xl font-semibold w-1/3 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSync} disabled={loading}
                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold w-2/3 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-all shadow-sm shadow-indigo-200 flex justify-center items-center gap-2"
              >
                {loading ? 'Syncing to Calendar...' : 'Approve & Sync to Google'}
              </button>
            </div>
          </div>
        )}

        {statusMessage && (
          <div className={`mt-6 p-4 rounded-xl text-sm border flex flex-col gap-2 animate-in fade-in
            ${statusMessage.toLowerCase().includes('error') ? 'bg-red-50 text-red-800 border-red-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}
          `}>
            <div className="flex items-center gap-2">
              <p className="font-semibold">{statusMessage}</p>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}