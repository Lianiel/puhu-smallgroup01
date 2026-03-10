import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  HeartHandshake, 
  CheckSquare, 
  CalendarDays,
  ArrowLeft,
  Plus,
  Send
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

// Types
type View = 'home' | 'devotions' | 'prayer_requests' | 'quiz' | 'schedule';

interface PrayerRequest {
  id: string;
  author: string;
  content: string;
  createdAt: Timestamp | null;
}

export default function App() {
  const [currentView, setCurrentView] = useState<View>('home');

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="bg-indigo-600 text-white p-4 sticky top-0 z-10 shadow-md flex items-center">
        {currentView !== 'home' && (
          <button 
            onClick={() => setCurrentView('home')}
            className="mr-3 p-1 hover:bg-indigo-500 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
        )}
        <h1 className="text-xl font-bold">埔和小組管理系統</h1>
      </header>

      {/* Main Content */}
      <main className="p-4 max-w-md mx-auto">
        {currentView === 'home' && <HomeView onViewChange={setCurrentView} />}
        {currentView === 'prayer_requests' && <PrayerWallView />}
        {currentView === 'devotions' && <PlaceholderView title="每日活水推送經文" icon={<BookOpen size={48} className="text-blue-500 mb-4" />} />}
        {currentView === 'quiz' && <PlaceholderView title="每日活水經文複習測驗" icon={<CheckSquare size={48} className="text-green-500 mb-4" />} />}
        {currentView === 'schedule' && <PlaceholderView title="服事分配表" icon={<CalendarDays size={48} className="text-purple-500 mb-4" />} />}
      </main>
    </div>
  );
}

function HomeView({ onViewChange }: { onViewChange: (view: View) => void }) {
  const features = [
    { id: 'devotions', title: '每日活水推送經文', icon: <BookOpen size={32} />, color: 'bg-blue-100 text-blue-600', desc: '每日靈修分享' },
    { id: 'prayer_requests', title: '代禱牆', icon: <HeartHandshake size={32} />, color: 'bg-rose-100 text-rose-600', desc: '新增與查看代禱事項' },
    { id: 'quiz', title: '經文複習測驗', icon: <CheckSquare size={32} />, color: 'bg-green-100 text-green-600', desc: '每日活水選擇題測驗' },
    { id: 'schedule', title: '服事分配表', icon: <CalendarDays size={32} />, color: 'bg-purple-100 text-purple-600', desc: '小組每週服事安排' },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-4 mt-4">
      {features.map((feature) => (
        <button
          key={feature.id}
          onClick={() => onViewChange(feature.id as View)}
          className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all active:scale-95"
        >
          <div className={`p-4 rounded-full ${feature.color} mb-3`}>
            {feature.icon}
          </div>
          <h2 className="font-semibold text-gray-800 text-center text-sm mb-1">{feature.title}</h2>
          <p className="text-xs text-gray-500 text-center">{feature.desc}</p>
        </button>
      ))}
    </div>
  );
}

function PrayerWallView() {
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newAuthor, setNewAuthor] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 3. 即時更新 (Real-time updates)
  useEffect(() => {
    const q = query(collection(db, 'prayer_requests'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prayerData: PrayerRequest[] = [];
      snapshot.forEach((doc) => {
        prayerData.push({ id: doc.id, ...doc.data() } as PrayerRequest);
      });
      setPrayers(prayerData);
    }, (err) => {
      console.error("Error fetching prayers:", err);
      setError("無法載入代禱事項，請檢查權限或網路連線。");
    });

    return () => unsubscribe();
  }, []);

  // 1. 新增代禱 (Add prayer request)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuthor.trim() || !newContent.trim()) return;

    setIsSubmitting(true);
    setError('');
    try {
      await addDoc(collection(db, 'prayer_requests'), {
        author: newAuthor.trim(),
        content: newContent.trim(),
        createdAt: serverTimestamp()
      });
      setNewAuthor('');
      setNewContent('');
      setIsAdding(false);
    } catch (err) {
      console.error("Error adding prayer:", err);
      setError("新增失敗，請檢查資料庫權限設定。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (timestamp: Timestamp | null) => {
    if (!timestamp) return '剛剛';
    return format(timestamp.toDate(), 'MM/dd HH:mm', { locale: zhTW });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">代禱牆</h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1 bg-rose-100 text-rose-700 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-rose-200 transition-colors"
        >
          {isAdding ? '取消' : <><Plus size={16} /> 新增代禱</>}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-100">
          {error}
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-2xl shadow-sm border border-rose-100 mb-4 animate-in fade-in slide-in-from-top-4">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
            <input
              type="text"
              value={newAuthor}
              onChange={(e) => setNewAuthor(e.target.value)}
              placeholder="您的名字"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              required
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">代禱事項</label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="請輸入代禱內容..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-rose-600 text-white py-2 rounded-lg font-medium hover:bg-rose-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {isSubmitting ? '發送中...' : <><Send size={16} /> 送出代禱</>}
          </button>
        </form>
      )}

      {/* 2. 顯示代禱列表 (Display prayer request list) */}
      <div className="flex-1 overflow-y-auto pb-6 space-y-3 pr-1">
        {prayers.length === 0 ? (
          <div className="text-center text-gray-500 py-10 bg-white rounded-2xl border border-dashed border-gray-200">
            <HeartHandshake size={48} className="mx-auto text-gray-300 mb-3" />
            <p>目前沒有代禱事項</p>
            <p className="text-sm mt-1">點擊上方按鈕新增第一筆代禱</p>
          </div>
        ) : (
          prayers.map((prayer) => (
            <div key={prayer.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-gray-800">{prayer.author}</span>
                <span className="text-xs text-gray-400">{formatDate(prayer.createdAt)}</span>
              </div>
              <p className="text-gray-600 whitespace-pre-wrap text-sm leading-relaxed">{prayer.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PlaceholderView({ title, icon }: { title: string, icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      {icon}
      <h2 className="text-xl font-bold text-gray-800 mb-2">{title}</h2>
      <p className="text-gray-500">功能開發中，敬請期待！</p>
    </div>
  );
}
