import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  HeartHandshake, 
  CheckSquare, 
  CalendarDays,
  ArrowLeft,
  Plus,
  Send,
  Trash2,
  X,
  Users
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  deleteDoc,
  doc
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

interface ServiceSchedule {
  id: string;
  date: string;
  leader: string;
  worship: string;
  icebreaker: string;
  snacks: string;
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
        {currentView === 'devotions' && <DevotionsView />}
        {currentView === 'quiz' && <PlaceholderView title="每日活水經文複習測驗" icon={<CheckSquare size={48} className="text-green-500 mb-4" />} />}
        {currentView === 'schedule' && <ServiceScheduleView />}
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 3. 即時更新 (Real-time updates)
  useEffect(() => {
    const q = query(collection(db, 'prayers'), orderBy('createdAt', 'desc'));
    
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
    
    // Add a timeout to prevent hanging if Firestore connection fails silently
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("連線逾時，請檢查網路或資料庫設定")), 10000)
    );

    try {
      await Promise.race([
        addDoc(collection(db, 'prayers'), {
          author: newAuthor.trim(),
          content: newContent.trim(),
          createdAt: serverTimestamp()
        }),
        timeoutPromise
      ]);
      
      setNewAuthor('');
      setNewContent('');
      setIsAdding(false);
    } catch (err: any) {
      console.error("Error adding prayer:", err);
      if (err.message === "連線逾時，請檢查網路或資料庫設定") {
        setError(err.message);
      } else {
        setError("新增失敗，請確認 Firebase Firestore 是否已建立且規則設為允許寫入。");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '剛剛';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'MM/dd HH:mm', { locale: zhTW });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'prayers', id));
      setDeletingId(null);
    } catch (err) {
      console.error("Error deleting prayer:", err);
      setError("刪除失敗，請檢查權限。");
    }
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
                <span className="font-semibold text-gray-800">{prayer.author || '匿名'}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{formatDate(prayer.createdAt)}</span>
                  {deletingId === prayer.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDelete(prayer.id)} className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors">確認刪除</button>
                      <button onClick={() => setDeletingId(null)} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300 transition-colors">取消</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeletingId(prayer.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-gray-600 whitespace-pre-wrap text-sm leading-relaxed">{prayer.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DevotionsView() {
  const [devotions, setDevotions] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'dailyDevotions'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setDevotions(data);
    }, (err) => {
      console.error("Error fetching devotions:", err);
      setError("無法載入靈修分享，請檢查權限或網路連線。");
    });

    return () => unsubscribe();
  }, []);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '剛剛';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'yyyy/MM/dd', { locale: zhTW });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">每日活水靈修分享</h2>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-100">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-6 space-y-3 pr-1">
        {devotions.length === 0 ? (
          <div className="text-center text-gray-500 py-10 bg-white rounded-2xl border border-dashed border-gray-200">
            <BookOpen size={48} className="mx-auto text-gray-300 mb-3" />
            <p>目前沒有靈修分享</p>
          </div>
        ) : (
          devotions.map((devotion) => (
            <div key={devotion.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-indigo-600">每日靈修</span>
                <span className="text-xs text-gray-400">{formatDate(devotion.createdAt)}</span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{devotion.content}</p>
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

function ServiceScheduleView() {
  const [schedules, setSchedules] = useState<ServiceSchedule[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [date, setDate] = useState('');
  const [leader, setLeader] = useState('');
  const [worship, setWorship] = useState('');
  const [icebreaker, setIcebreaker] = useState('');
  const [snacks, setSnacks] = useState('');

  useEffect(() => {
    // 取得服事表，依日期排序
    const q = query(collection(db, 'service_schedule'), orderBy('date', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: ServiceSchedule[] = [];
      const today = new Date().toISOString().split('T')[0];
      
      snapshot.forEach((doc) => {
        const schedule = { id: doc.id, ...doc.data() } as ServiceSchedule;
        // 只顯示今天之後的服事表
        if (schedule.date >= today) {
          data.push(schedule);
        }
      });
      setSchedules(data);
    }, (err) => {
      console.error("Error fetching schedules:", err);
      setError("無法載入服事表，請檢查權限或網路連線。");
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;

    setIsSubmitting(true);
    setError('');
    try {
      await addDoc(collection(db, 'service_schedule'), {
        date,
        leader: leader.trim(),
        worship: worship.trim(),
        icebreaker: icebreaker.trim(),
        snacks: snacks.trim(),
        createdAt: serverTimestamp()
      });
      
      // Reset form
      setDate('');
      setLeader('');
      setWorship('');
      setIcebreaker('');
      setSnacks('');
      setIsAdding(false);
    } catch (err) {
      console.error("Error adding schedule:", err);
      setError("新增失敗，請檢查資料庫權限設定。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'service_schedule', id));
      setDeletingId(null);
    } catch (err) {
      console.error("Error deleting schedule:", err);
      setError("刪除失敗，請檢查權限。");
    }
  };

  // 產生器功能：隨機指派
  const handleAutoGenerate = () => {
    const members = ['小明', '小華', '阿強', '美美', '大谷', '約翰', '馬利亞'];
    const shuffled = [...members].sort(() => 0.5 - Math.random());
    setLeader(shuffled[0] || '');
    setWorship(shuffled[1] || '');
    setIcebreaker(shuffled[2] || '');
    setSnacks(shuffled[3] || '');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">服事分配表</h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-purple-200 transition-colors"
        >
          {isAdding ? '取消' : <><Plus size={16} /> 新增服事</>}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-100">
          {error}
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-2xl shadow-sm border border-purple-100 mb-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-700">新增服事安排</h3>
            <button 
              type="button" 
              onClick={handleAutoGenerate}
              className="text-xs flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
            >
              <Users size={14} /> 隨機產生名單
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">日期</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">主理 / 查經</label>
                <input
                  type="text"
                  value={leader}
                  onChange={(e) => setLeader(e.target.value)}
                  placeholder="姓名"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">敬拜</label>
                <input
                  type="text"
                  value={worship}
                  onChange={(e) => setWorship(e.target.value)}
                  placeholder="姓名"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">破冰</label>
                <input
                  type="text"
                  value={icebreaker}
                  onChange={(e) => setIcebreaker(e.target.value)}
                  placeholder="姓名"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">招待 / 點心</label>
                <input
                  type="text"
                  value={snacks}
                  onChange={(e) => setSnacks(e.target.value)}
                  placeholder="姓名"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-4 bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {isSubmitting ? '儲存中...' : <><Send size={16} /> 儲存服事表</>}
          </button>
        </form>
      )}

      {/* 顯示服事列表 */}
      <div className="flex-1 overflow-y-auto pb-6 space-y-3 pr-1">
        {schedules.length === 0 ? (
          <div className="text-center text-gray-500 py-10 bg-white rounded-2xl border border-dashed border-gray-200">
            <CalendarDays size={48} className="mx-auto text-gray-300 mb-3" />
            <p>目前沒有近期的服事安排</p>
            <p className="text-sm mt-1">點擊上方按鈕新增</p>
          </div>
        ) : (
          schedules.map((schedule) => (
            <div key={schedule.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
              <div className="flex justify-between items-center mb-3 border-b border-gray-50 pb-2">
                <div className="flex items-center gap-2">
                  <CalendarDays size={18} className="text-purple-500" />
                  <span className="font-bold text-gray-800 text-lg">{schedule.date}</span>
                </div>
                
                {deletingId === schedule.id ? (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleDelete(schedule.id)}
                      className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors"
                    >
                      確認刪除
                    </button>
                    <button 
                      onClick={() => setDeletingId(null)}
                      className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setDeletingId(schedule.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 mb-0.5">主理 / 查經</span>
                  <span className="font-medium text-gray-700">{schedule.leader || '-'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 mb-0.5">敬拜</span>
                  <span className="font-medium text-gray-700">{schedule.worship || '-'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 mb-0.5">破冰</span>
                  <span className="font-medium text-gray-700">{schedule.icebreaker || '-'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 mb-0.5">招待 / 點心</span>
                  <span className="font-medium text-gray-700">{schedule.snacks || '-'}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
