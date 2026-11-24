/**
 * 簡報達人評分系統 115學年度 - 前端路由與調度核心 (js/app.js)
 */

window.App = function() {
  const { useState, useEffect } = React;

  const [currentUser, setCurrentUser] = useState(null);
  const [adminTab, setAdminTab] = useState('teams'); // 'teams' | 'judges' | 'config' | 'results'

  // 從 LocalStorage 載入登入狀態
  useEffect(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
  };

  // 1. 未登入狀態 -> 顯示 LoginView
  if (!currentUser) {
    return <window.LoginView onLoginSuccess={(userData) => setCurrentUser(userData)} />;
  }

  // 2. 評審身分 -> 顯示 JudgeView
  if (currentUser.role === 'judge') {
    return <window.JudgeView user={currentUser} onLogout={handleLogout} />;
  }

  // 3. 管理員身分 -> 顯示 AdminDashboard (含分頁)
  return (
    <div className="min-h-screen flex flex-col text-base" style={{ backgroundColor: 'var(--bg-light)' }}>
      {/* 管理端 Header：深曜黑金毛玻璃風格 */}
      <header className="no-print bg-stone-900/95 backdrop-blur-md text-white px-6 py-3.5 shadow-md flex justify-between items-center border-b border-stone-800 sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <span className="material-icons text-amber-400 text-3xl">admin_panel_settings</span>
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-wide">{window.APP_CONFIG.CURRENT_YEAR}學年度 簡報達人擂台賽 — 系統管理後台</h1>
            <p className="text-xs sm:text-sm text-amber-300 font-bold tracking-wider">🏛️ 大會最高權限管理控制台</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="bg-rose-700 hover:bg-rose-800 text-white text-xs sm:text-sm px-3.5 py-2 rounded-xl flex items-center font-bold shadow-xs cursor-pointer transition"
        >
          <span className="material-icons text-sm sm:text-base mr-1">logout</span>登出後台
        </button>
      </header>

      {/* 管理端 Tab 導覽：透光磨砂白玻璃與琥珀金高亮 */}
      <div className="no-print bg-white/85 backdrop-blur-md border-b border-stone-200/80 px-6 shadow-2xs sticky top-[61px] z-30">
        <div className="flex space-x-2 sm:space-x-3 overflow-x-auto pt-1.5">
          {[
            { id: 'teams', icon: 'groups', label: '參賽隊伍管理' },
            { id: 'judges', icon: 'badge', label: '評審名單與密碼' },
            { id: 'config', icon: 'settings', label: '系統與比賽設定' },
            { id: 'results', icon: 'assessment', label: '共識會議與成績總表' },
            { id: 'reports', icon: 'print', label: '列印成績總表' },
            { id: 'health', icon: 'health_and_safety', label: '系統維運/檢測' }
          ].map(tab => {
            const isActive = adminTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAdminTab(tab.id)}
                className={`px-4 py-2.5 text-sm sm:text-base font-black border-b-2 flex items-center transition cursor-pointer whitespace-nowrap rounded-t-xl ${
                  isActive
                    ? 'border-amber-600 text-amber-950 bg-amber-50/80 shadow-2xs'
                    : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-100/60'
                }`}
              >
                <span className={`material-icons text-base sm:text-lg mr-1.5 ${isActive ? 'text-amber-700' : 'text-stone-400'}`}>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 管理端內容裝載 */}
      <main className={`flex-1 p-4 md:p-6 mx-auto w-full ${(adminTab === 'results' || adminTab === 'reports') ? 'max-w-[1800px]' : 'max-w-7xl'}`}>
        {adminTab === 'teams' && <window.AdminTeamsView />}
        {adminTab === 'judges' && <window.AdminJudgesView />}
        {adminTab === 'config' && <window.AdminConfigView />}
        {adminTab === 'results' && <window.AdminResultsView />}
        {adminTab === 'reports' && <window.AdminReportsView />}
        {adminTab === 'health' && <window.AdminHealthView />}
      </main>
    </div>
  );
};
