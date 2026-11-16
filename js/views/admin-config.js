/**
 * 簡報達人評分系統 115學年度 - 後台系統參數與三階段郵件草稿/測試中心模組 (js/views/admin-config.js)
 */

window.AdminConfigView = function() {
  const { useState, useEffect } = React;

  const DEFAULT_DRAFTS = {
    sender_config: {
      sender_name: '115學年度宜蘭縣簡報達人擂台賽工作小組',
      from_alias: '',
      reply_to: '',
      bcc_self: false,
      test_email: ''
    },
    email_confirm_subject: '【115簡報達人擂台賽】正式參賽與作品收件確認通知 — {學校}【{隊伍名稱}】',
    email_confirm_body:
`親愛的 {學校} 師生（參賽同學：{學生名單} ／ 指導老師：{指導老師}）您好：

感謝貴隊報名參與「{學年度}學年度 宜蘭縣國民中小學瘋學習簡報達人擂台賽」！
大會已完成貴隊之作品收件與形式審查，確認貴隊正式列入本屆參賽評審名單，基本資料如下：

■ 參賽組別：{參賽組別}
■ 學校名稱：{學校}
■ 隊伍名稱：{隊伍名稱}
■ 作品名稱：{作品名稱}
■ 參賽學生：{學生名單}
■ 指導老師：{指導老師}（主要聯絡人：{主要聯絡人}）

■ 貴隊提交之各項作品連結（請務必點擊下方連結自我檢核雲端權限是否皆已開啟為「知道連結的任何人皆可檢視」）：
{作品連結清單}

📅 後續重要時程提醒：
• 專家評審作業完成後，預計於 115年12月11日（五）公告成績，並以 Email 寄發評審委員指導評語回饋。
• 榮獲「特優、優等」之團隊，將受邀於 115年12月20日（日）出席「宜蘭縣科技競賽暨數位親子嘉年華」現場受獎及成果展現。

預祝貴隊展現探究熱情，勇奪佳績！

宜蘭縣政府教育網路中心 ／ 簡報達人擂台賽工作小組 敬上`,

    email_remind_subject: '【重要補件/權限提醒】{學年度}簡報達人擂台賽形式審查通知 — {學校}【{隊伍名稱}】',
    email_remind_body:
`親愛的 {學校} 指導老師（{指導老師}）與參賽同學（{學生名單}）您好：

感謝貴隊報名參與「{學年度}學年度 宜蘭縣瘋學習簡報達人擂台賽」（作品名稱：《{作品名稱}》）。
工作小組於進行賽前形式審查時，發現貴隊提交之作品資料有以下項目需請協助確認或補正：

⚠️ 【審查需補正事項】：
{補件異常備註}

■ 貴隊目前登記之作品連結如下（請點擊測試是否已開啟「知道連結者皆可檢視」之公開共用權限）：
{作品連結清單}

📌 請於形式審查補正期限（115年11月16日 16:00）前完成權限開啟或補件，並回覆本信件或聯繫承辦單位確認，以免影響後續評審給分權益。

宜蘭縣政府教育網路中心 ／ 簡報達人擂台賽工作小組 敬上`,

    email_result_subject: '【成績公布與評審回饋】{學年度}簡報達人擂台賽評選結果通知 — {學校}【{隊伍名稱}】',
    email_result_body:
`親愛的 {學校} 師生（參賽同學：{學生名單} ／ 指導老師：{指導老師}）您好：

感謝貴隊熱情參與「{學年度}學年度 宜蘭縣國民中小學瘋學習簡報達人擂台賽」！
本屆賽事經評審委員專業評選與決審共識會議討論，貴隊作品《{作品名稱}》（組別：{參賽組別}）表現優異，評選結果如下：

🏆 【貴隊榮獲獎項】：
{榮獲獎項總覽}

🎁 【獎勵內容與領獎說明】：
{獎勵與頒獎說明}

💬 【評審委員專業指導與回饋】（依匿名方式呈現）：
{評審評語彙整}

再次肯定同學們在問題探究、心智圖邏輯思考與簡報表達上的用心投入，也感謝指導老師的辛勤帶領！

宜蘭縣政府教育網路中心 ／ 簡報達人擂台賽工作小組 敬上`
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [activeDraftTab, setActiveDraftTab] = useState('confirm'); // 'confirm' | 'remind' | 'result'
  const [teams, setTeams] = useState([]);
  const [sampleTeamId, setSampleTeamId] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [config, setConfig] = useState({
    current_year: window.APP_CONFIG.CURRENT_YEAR,
    is_registration_open: true,
    is_judging_open: true,
    rubric_link: 'https://example.com/rubric',
    rules_link: 'https://example.com/rules',
    sender_config: DEFAULT_DRAFTS.sender_config,
    email_confirm_subject: DEFAULT_DRAFTS.email_confirm_subject,
    email_confirm_body: DEFAULT_DRAFTS.email_confirm_body,
    email_remind_subject: DEFAULT_DRAFTS.email_remind_subject,
    email_remind_body: DEFAULT_DRAFTS.email_remind_body,
    email_result_subject: DEFAULT_DRAFTS.email_result_subject,
    email_result_body: DEFAULT_DRAFTS.email_result_body,
    mail_env: { remaining_quota: null, gmail_aliases: [], active_account_email: '' }
  });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    loadConfigAndTeams();
  }, []);

  const loadConfigAndTeams = async () => {
    setLoading(true);
    const [cfgRes, teamsRes] = await Promise.all([
      window.ApiService.getSystemConfig(window.APP_CONFIG.CURRENT_YEAR),
      window.ApiService.getAllTeams(window.APP_CONFIG.CURRENT_YEAR)
    ]);

    if (cfgRes.status === 'success' && cfgRes.data) {
      const d = cfgRes.data;
      setConfig(prev => ({
        ...prev,
        ...d,
        sender_config: {
          ...DEFAULT_DRAFTS.sender_config,
          ...(d.sender_config || {}),
          test_email: (d.sender_config && d.sender_config.test_email) || (d.mail_env && d.mail_env.active_account_email) || ''
        },
        email_confirm_subject: d.email_confirm_subject || DEFAULT_DRAFTS.email_confirm_subject,
        email_confirm_body: d.email_confirm_body || DEFAULT_DRAFTS.email_confirm_body,
        email_remind_subject: d.email_remind_subject || DEFAULT_DRAFTS.email_remind_subject,
        email_remind_body: d.email_remind_body || DEFAULT_DRAFTS.email_remind_body,
        email_result_subject: d.email_result_subject || DEFAULT_DRAFTS.email_result_subject,
        email_result_body: d.email_result_body || DEFAULT_DRAFTS.email_result_body
      }));
    }

    if (teamsRes.status === 'success' && Array.isArray(teamsRes.data) && teamsRes.data.length > 0) {
      setTeams(teamsRes.data);
      setSampleTeamId(teamsRes.data[0].team_id || teamsRes.data[0].Team_ID || '');
    }
    setLoading(false);
  };

  const getActiveDraftKeys = () => {
    if (activeDraftTab === 'remind') {
      return { subjectKey: 'email_remind_subject', bodyKey: 'email_remind_body', label: '草稿 2：形式審查補件／權限提醒通知（對應 Year_Config J、K 欄）' };
    }
    if (activeDraftTab === 'result') {
      return { subjectKey: 'email_result_subject', bodyKey: 'email_result_body', label: '草稿 3：成績公布與評審評語通知（對應 Year_Config L、M 欄）' };
    }
    return { subjectKey: 'email_confirm_subject', bodyKey: 'email_confirm_body', label: '草稿 1：正式參賽確認通知（對應 Year_Config H、I 欄）' };
  };

  const handleInsertVariable = (token) => {
    const { bodyKey } = getActiveDraftKeys();
    setConfig(prev => ({
      ...prev,
      [bodyKey]: (prev[bodyKey] || '') + token
    }));
  };

  const handleResetActiveTemplate = () => {
    const { subjectKey, bodyKey, label } = getActiveDraftKeys();
    if (!confirm(`確定要將「${label}」還原為系統預設範本嗎？（記得點選儲存才會寫入試算表）`)) return;
    setConfig(prev => ({
      ...prev,
      [subjectKey]: DEFAULT_DRAFTS[subjectKey],
      [bodyKey]: DEFAULT_DRAFTS[bodyKey]
    }));
  };

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSaving(true);
    setMsg('');

    const res = await window.ApiService.saveSystemConfig({
      current_year: config.current_year,
      Competition_Year: config.current_year,
      is_registration_open: config.is_registration_open,
      is_judging_open: config.is_judging_open,
      rubric_link: config.rubric_link,
      rules_link: config.rules_link,
      Category_Group_Map: window.APP_CONFIG.CATEGORY_GROUP_MAP,
      sender_config: config.sender_config,
      email_confirm_subject: config.email_confirm_subject,
      email_confirm_body: config.email_confirm_body,
      email_remind_subject: config.email_remind_subject,
      email_remind_body: config.email_remind_body,
      email_result_subject: config.email_result_subject,
      email_result_body: config.email_result_body
    });

    setSaving(false);
    if (res.status === 'success') {
      setMsg('✅ 系統設定與三封信件草稿已成功寫入 Google 試算表 (Year_Config A~M 欄)！');
    } else {
      setMsg(`❌ 更新失敗: ${res.message}`);
    }
  };

  // 前端即時套印預覽計算
  const getPreviewTeam = () => {
    const found = teams.find(t => String(t.team_id || t.Team_ID) === String(sampleTeamId));
    if (found) return found;
    return {
      competition_year: config.current_year || 115,
      category: '【宜蘭在地自然人文特色】國小組',
      team_name: '蘭陽小尖兵隊',
      group_name: '蘭陽小尖兵隊',
      school: '宜蘭國小（範例）',
      work_title: '宜蘭古城文化巡禮（範例作品）',
      description: '本作品透過實地踏查與訪談，探究宜蘭舊城歷史建築與民俗文化。',
      student1_class: '六年甲班',
      student1_name: '王小明',
      student2_class: '六年乙班',
      student2_name: '林小華',
      teacher1_name: '陳大文老師',
      teacher1_phone: '0912-345678',
      contact_person: '指導教師1',
      slides_link: 'https://docs.google.com/presentation/',
      mindmap_link: 'https://www.mindomo.com/',
      video_link: 'https://www.youtube.com/',
      consent_link: 'https://drive.google.com/',
      link_note: '貴隊提交之「簡報檔連結」目前未開啟公開檢視權限，請調整為「知道連結的任何人皆可檢視」。'
    };
  };

  const renderLocalPreview = (rawText) => {
    const t = getPreviewTeam();
    const stuList = [
      t.student1_name ? `${t.student1_name}${t.student1_class ? '（' + t.student1_class + '）' : ''}` : '',
      t.student2_name ? `${t.student2_name}${t.student2_class ? '（' + t.student2_class + '）' : ''}` : '',
      t.student3_name ? `${t.student3_name}${t.student3_class ? '（' + t.student3_class + '）' : ''}` : ''
    ].filter(Boolean).join('、') || '王小明（六年甲班）';

    const teacherList = [t.teacher1_name, t.teacher2_name].filter(Boolean).join('、') || '陳大文老師';
    const primaryContact = (t.contact_person === '指導教師2' && t.teacher2_name)
      ? `${t.teacher2_name} (${t.teacher2_phone || ''})`
      : `${t.teacher1_name || '陳大文老師'} (${t.teacher1_phone || t.contact_phone || '0912-345678'})`;

    const linksBlock = [
      `• 📊 簡報檔連結：${t.slides_link || '（未提供）'}`,
      `• 🧠 Mindomo心智圖連結：${t.mindmap_link || '（未提供）'}`,
      `• 🎬 說明影片檔連結：${t.video_link || '（未提供）'}`,
      `• 📄 著作權授權同意書：${t.consent_link || '（未提供）'}`
    ].join('\n');

    const map = {
      '{學年度}': String(t.competition_year || 115),
      '{參賽組別}': t.category || '【宜蘭在地自然人文特色】國小組',
      '{隊伍名稱}': t.team_name || t.group_name || '蘭陽小尖兵隊',
      '{隊名}': t.team_name || t.group_name || '蘭陽小尖兵隊',
      '{學校}': t.school || '宜蘭國小',
      '{作品名稱}': t.work_title || '宜蘭古城文化巡禮',
      '{作品說明}': t.description || '',
      '{學生名單}': stuList,
      '{指導老師}': teacherList,
      '{主要聯絡人}': primaryContact,
      '{聯絡人}': primaryContact,
      '{作品連結清單}': linksBlock,
      '{補件異常備註}': t.link_note || '貴隊提交之「簡報檔連結」目前未開啟公開檢視權限，請調整為「知道連結的任何人皆可檢視」。',
      '{特色優選獎}': '特優（範例）',
      '{特色表現獎}': '簡報之星（範例）',
      '{榮獲獎項總覽}': '恭喜榮獲 特色優選獎【特優】 暨 特色表現獎【簡報之星】殊榮！（範例）',
      '{獎勵與頒獎說明}': '• 【特優獎獎勵】：每位參賽學生可獲 3,000 點 e幣及獎狀乙張；指導教師可獲 3,000 點 e幣及行政敘獎。\n• 【簡報之星獎勵】：每位參賽學生可獲 2,000 點 e幣及獎品乙份；指導教師可獲 2,000 點 e幣。\n• 🎉 【頒獎典禮暨成果展現邀請】：貴隊榮獲「特優」，誠摯邀請貴隊師生於 115年12月20日（日）出席「宜蘭縣科技競賽暨數位親子嘉年華」活動現場受獎及成果展現！',
      '{評審評語彙整}': '• 評審委員一 回饋：\n  主題探究深入，心智圖架構十分清晰，能結合在地生活經驗提出具體觀點。\n\n• 評審委員二 回饋：\n  口語表達自然流暢，團隊成員默契極佳，簡報視覺排版相當吸睛。\n\n• 評審委員三 回饋：\n  資料引用標示完整，時間掌控精準，展現優秀的資訊素養與自信台風！'
    };

    let out = String(rawText || '');
    Object.keys(map).forEach(k => {
      out = out.split(k).join(map[k]);
    });
    return out;
  };

  const handleSendTestEmail = async () => {
    const targetEmail = String(config.sender_config?.test_email || '').trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      alert('請先在「測試收件人信箱」輸入有效的 Email 地址！');
      return;
    }

    const { subjectKey, bodyKey } = getActiveDraftKeys();
    setSendingTest(true);
    setMsg('');

    // 先自動儲存目前草稿至試算表，再發送測試信
    await window.ApiService.saveSystemConfig({
      current_year: config.current_year,
      Competition_Year: config.current_year,
      is_registration_open: config.is_registration_open,
      is_judging_open: config.is_judging_open,
      rubric_link: config.rubric_link,
      rules_link: config.rules_link,
      Category_Group_Map: window.APP_CONFIG.CATEGORY_GROUP_MAP,
      sender_config: config.sender_config,
      email_confirm_subject: config.email_confirm_subject,
      email_confirm_body: config.email_confirm_body,
      email_remind_subject: config.email_remind_subject,
      email_remind_body: config.email_remind_body,
      email_result_subject: config.email_result_subject,
      email_result_body: config.email_result_body
    });

    const res = await window.ApiService.sendTestEmail({
      year: config.current_year,
      template_type: activeDraftTab,
      test_email: targetEmail,
      subject: config[subjectKey],
      body: config[bodyKey],
      sender_config: config.sender_config,
      sample_team_id: sampleTeamId
    });

    setSendingTest(false);
    if (res.status === 'success') {
      setMsg(res.message);
      if (res.data?.mail_env) {
        setConfig(prev => ({ ...prev, mail_env: res.data.mail_env }));
      }
      alert(res.message);
    } else {
      setMsg(`❌ 測試信寄送失敗：${res.message}`);
      alert(`❌ 測試信寄送失敗：${res.message}`);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-400">系統設定與郵件草稿載入中...</div>;

  const { subjectKey, bodyKey, label: activeDraftLabel } = getActiveDraftKeys();
  const aliases = Array.isArray(config.mail_env?.gmail_aliases) ? config.mail_env.gmail_aliases : [];

  const commonTags = ['{學年度}', '{參賽組別}', '{學校}', '{隊伍名稱}', '{作品名稱}', '{學生名單}', '{指導老師}', '{主要聯絡人}'];
  const extraTags = activeDraftTab === 'confirm'
    ? ['{作品連結清單}', '{作品說明}']
    : activeDraftTab === 'remind'
    ? ['{補件異常備註}', '{作品連結清單}']
    : ['{榮獲獎項總覽}', '{獎勵與頒獎說明}', '{評審評語彙整}', '{特色優選獎}', '{特色表現獎}'];

  return (
    <div className="space-y-6 max-w-5xl">
      {msg && (
        <div className="p-4 bg-amber-50 text-amber-950 border-2 border-amber-300 rounded-xl text-sm font-bold shadow-xs flex items-center justify-between">
          <span>{msg}</span>
          <button type="button" onClick={() => setMsg('')} className="text-amber-700 hover:text-amber-950 font-black ml-4">✕</button>
        </div>
      )}

      {/* ==================== 第一區：基本賽事開關與簡章連結 ==================== */}
      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
          <div>
            <h2 className="text-lg font-black text-gray-800 flex items-center">
              <span className="material-icons text-amber-900 mr-1.5">tune</span>
              115學年度 系統開關與規準簡章設定
            </h2>
            <p className="text-xs text-gray-500">管理比賽報名/評分開放狀態、評分規準與比賽簡章連結（儲存於試算表 Year_Config A~F 欄）</p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-amber-900 hover:bg-amber-950 text-white rounded-xl font-black text-xs shadow flex items-center cursor-pointer shrink-0"
          >
            <span className="material-icons text-sm mr-1">save</span>
            {saving ? '儲存設定中...' : '儲存全部設定與信件草稿'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">當前競賽學年度</label>
            <input
              type="number"
              value={config.current_year}
              onChange={(e) => setConfig({ ...config, current_year: e.target.value })}
              className="w-full p-2 border rounded-lg font-bold"
            />
          </div>

          <div className="md:col-span-2 flex flex-wrap items-center gap-6 pt-4">
            <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 px-3.5 py-2 rounded-lg border">
              <input
                type="checkbox"
                checked={config.is_registration_open}
                onChange={(e) => setConfig({ ...config, is_registration_open: e.target.checked })}
                className="w-4 h-4 accent-amber-900"
              />
              <span className="font-bold text-gray-800">開放線上隊伍報名 / 繳件</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 px-3.5 py-2 rounded-lg border">
              <input
                type="checkbox"
                checked={config.is_judging_open}
                onChange={(e) => setConfig({ ...config, is_judging_open: e.target.checked })}
                className="w-4 h-4 accent-amber-900"
              />
              <span className="font-bold text-gray-800">開放評審線上評分</span>
            </label>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">評分規準連結網址 (Rubric Link)</label>
            <input
              type="url"
              value={config.rubric_link}
              onChange={(e) => setConfig({ ...config, rubric_link: e.target.value })}
              className="w-full p-2 border rounded-lg"
              placeholder="https://..."
            />
          </div>

          <div className="md:col-span-2">
            <label className="block font-bold text-gray-700 mb-1">比賽簡章網址 (Rules Link)</label>
            <input
              type="url"
              value={config.rules_link}
              onChange={(e) => setConfig({ ...config, rules_link: e.target.value })}
              className="w-full p-2 border rounded-lg"
              placeholder="https://..."
            />
          </div>
        </div>
      </div>

      {/* ==================== 第二區：郵件草稿管理與測試中心 (Year_Config G~M 欄) ==================== */}
      <div className="bg-white p-6 rounded-xl border-2 border-amber-200 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-amber-200 pb-3">
          <div>
            <h2 className="text-lg font-black text-amber-950 flex items-center">
              <span className="material-icons text-amber-800 mr-1.5">mark_email_read</span>
              郵件草稿管理與測試信中心（Year_Config G ～ M 欄）
            </h2>
            <p className="text-xs text-gray-600 mt-0.5">
              支援公用信箱別名寄送、三階段信件草稿獨立儲存、變數標籤套印預覽，並可先寄送測試信至您個人信箱確認排版
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-black flex items-center">
              <span className="material-icons text-sm mr-1">bolt</span>
              今日剩餘寄信額度：{config.mail_env?.remaining_quota !== null && config.mail_env?.remaining_quota !== undefined ? `${config.mail_env.remaining_quota} 封` : '充足'}
            </span>
          </div>
        </div>

        {/* 步驟 1：公用信箱與寄件身分設定 (對應 G 欄 Email_Sender_Config) */}
        <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-3 text-xs">
          <div className="font-black text-amber-950 text-sm flex items-center justify-between">
            <span>📮 步驟 1：公用信箱與寄件人身分設定（儲存於試算表 Year_Config 第 G 欄）</span>
            {config.mail_env?.active_account_email && (
              <span className="text-[11px] font-bold text-amber-800 bg-white px-2.5 py-0.5 rounded border border-amber-200">
                目前 GAS 執行帳號：{config.mail_env.active_account_email}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-gray-800 mb-1">寄件單位顯示名稱 (Sender Name)</label>
              <input
                type="text"
                value={config.sender_config?.sender_name || ''}
                onChange={(e) => setConfig({
                  ...config,
                  sender_config: { ...config.sender_config, sender_name: e.target.value }
                })}
                className="w-full p-2 bg-white border border-amber-300 rounded-lg font-bold text-gray-900"
                placeholder="115學年度宜蘭縣簡報達人擂台賽工作小組"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-800 mb-1">
                公用信箱寄件別名 (From Alias，選填)
              </label>
              <input
                type="email"
                list="gmail-alias-list"
                value={config.sender_config?.from_alias || ''}
                onChange={(e) => setConfig({
                  ...config,
                  sender_config: { ...config.sender_config, from_alias: e.target.value }
                })}
                className="w-full p-2 bg-white border border-amber-300 rounded-lg"
                placeholder={aliases.length > 0 ? '點擊選擇或輸入已驗證之公用信箱別名' : '若留空則以當前授權帳號寄出'}
              />
              <datalist id="gmail-alias-list">
                {aliases.map(a => <option key={a} value={a} />)}
              </datalist>
            </div>

            <div>
              <label className="block font-bold text-gray-800 mb-1">
                學員按「回覆」時之收件信箱 (Reply-To)
              </label>
              <input
                type="email"
                value={config.sender_config?.reply_to || ''}
                onChange={(e) => setConfig({
                  ...config,
                  sender_config: { ...config.sender_config, reply_to: e.target.value }
                })}
                className="w-full p-2 bg-white border border-amber-300 rounded-lg"
                placeholder="例如：contest@tmail.ilc.edu.tw"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center space-x-2 cursor-pointer text-gray-700 font-semibold">
              <input
                type="checkbox"
                checked={!!config.sender_config?.bcc_self}
                onChange={(e) => setConfig({
                  ...config,
                  sender_config: { ...config.sender_config, bcc_self: e.target.checked }
                })}
                className="w-4 h-4 accent-amber-900"
              />
              <span>發送正式通知信時，自動密件副本 (BCC) 一份至上方「回覆收件信箱」留存備查</span>
            </label>
          </div>
        </div>

        {/* 步驟 2：三封信件草稿切換頁籤與編輯器 (對應 H ~ M 欄) */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-black text-amber-950 text-sm">
              📝 步驟 2：撰寫與管理三階段信件草稿（切換下方頁籤分別編輯）
            </span>
            <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md">
              目前編輯：{activeDraftLabel}
            </span>
          </div>

          {/* 3 個草稿頁籤 */}
          <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
            <button
              type="button"
              onClick={() => setActiveDraftTab('confirm')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center space-x-1.5 border transition cursor-pointer ${
                activeDraftTab === 'confirm'
                  ? 'bg-emerald-800 text-white border-emerald-950 shadow-xs'
                  : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-emerald-50'
              }`}
            >
              <span>📄 1. 正式參賽確認通知</span>
              <span className="opacity-75 text-[11px]">(H、I 欄)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDraftTab('remind')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center space-x-1.5 border transition cursor-pointer ${
                activeDraftTab === 'remind'
                  ? 'bg-amber-700 text-white border-amber-900 shadow-xs'
                  : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-amber-50'
              }`}
            >
              <span>⚠️ 2. 形式審查補件／權限提醒</span>
              <span className="opacity-75 text-[11px]">(J、K 欄)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDraftTab('result')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center space-x-1.5 border transition cursor-pointer ${
                activeDraftTab === 'result'
                  ? 'bg-indigo-800 text-white border-indigo-950 shadow-xs'
                  : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-indigo-50'
              }`}
            >
              <span>🏆 3. 成績公布與評審評語通知</span>
              <span className="opacity-75 text-[11px]">(L、M 欄)</span>
            </button>
          </div>

          {/* 信件主旨 */}
          <div className="text-xs">
            <label className="block font-black text-gray-800 mb-1">信件主旨草稿 (Subject)</label>
            <input
              type="text"
              value={config[subjectKey] || ''}
              onChange={(e) => setConfig({ ...config, [subjectKey]: e.target.value })}
              className="w-full p-2.5 border-2 border-gray-300 focus:border-amber-700 rounded-xl font-bold text-sm text-gray-900"
            />
          </div>

          {/* 快捷插入套印標籤按鈕列 */}
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-gray-600 mr-1">💡 點擊插入基本套印變數：</span>
              {commonTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleInsertVariable(tag)}
                  className="px-2 py-1 bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-md font-mono font-bold text-[11px] transition cursor-pointer"
                >
                  +{tag}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-indigo-800 mr-1">✨ 點擊插入本信專屬智慧區塊：</span>
              {extraTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleInsertVariable(tag)}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 rounded-md font-mono font-black text-[11px] transition cursor-pointer"
                >
                  +{tag}
                </button>
              ))}
            </div>
          </div>

          {/* 信件內文草稿 */}
          <div className="text-xs">
            <div className="flex justify-between items-center mb-1">
              <label className="font-black text-gray-800">信件內文草稿 (Body — 寄出時系統將自動包裝為官方精美 HTML 信紙與按鈕)</label>
              <button
                type="button"
                onClick={handleResetActiveTemplate}
                className="text-gray-500 hover:text-red-700 font-bold underline cursor-pointer"
              >
                🔄 將此封草稿還原為預設範本
              </button>
            </div>
            <textarea
              rows={13}
              value={config[bodyKey] || ''}
              onChange={(e) => setConfig({ ...config, [bodyKey]: e.target.value })}
              className="w-full p-3 border-2 border-gray-300 focus:border-amber-700 rounded-xl font-sans text-xs sm:text-sm leading-relaxed text-gray-900"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-amber-900 hover:bg-amber-950 text-white rounded-xl font-black text-xs sm:text-sm shadow-md flex items-center cursor-pointer"
            >
              <span className="material-icons text-base mr-1.5">cloud_upload</span>
              {saving ? '正在寫入試算表...' : '💾 儲存全部草稿至雲端試算表 (Year_Config)'}
            </button>

            <button
              type="button"
              onClick={() => setShowPreviewModal(!showPreviewModal)}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 rounded-xl font-black text-xs sm:text-sm flex items-center cursor-pointer"
            >
              <span className="material-icons text-base mr-1.5">visibility</span>
              {showPreviewModal ? '收合螢幕套印預覽' : '👁️ 在螢幕上預覽套印結果'}
            </button>
          </div>
        </div>

        {/* 螢幕即時預覽區 */}
        {showPreviewModal && (
          <div className="bg-stone-100 p-4 rounded-xl border-2 border-stone-300 space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-stone-700">
              <span>👁️ 螢幕即時套印預覽（自動代入下方所選樣本隊伍資料）：</span>
              <span className="text-amber-900">主旨預覽：{renderLocalPreview(config[subjectKey])}</span>
            </div>
            <div className="bg-white p-4 rounded-lg border border-stone-300 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed text-gray-900 shadow-inner">
              {renderLocalPreview(config[bodyKey])}
            </div>
          </div>
        )}

        {/* 步驟 3：測試信發送專區 */}
        <div className="bg-emerald-50/80 p-4 rounded-xl border-2 border-emerald-300 space-y-3 text-xs">
          <div className="font-black text-emerald-950 text-sm flex items-center">
            <span className="material-icons text-emerald-700 mr-1.5 text-lg">science</span>
            步驟 3：🧪 測試信發送專區（絕對不會寄給參賽學員，僅寄送 1 封至您下方指定的測試信箱）
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-5">
              <label className="block font-bold text-emerald-950 mb-1">選擇測試代入之樣本隊伍資料</label>
              <select
                value={sampleTeamId}
                onChange={(e) => setSampleTeamId(e.target.value)}
                className="w-full p-2.5 bg-white border border-emerald-400 rounded-lg font-bold text-gray-800"
              >
                {teams.length === 0 ? (
                  <option value="">（使用系統內建宜蘭國小測試範例隊伍）</option>
                ) : (
                  teams.map((t, idx) => (
                    <option key={t.team_id || idx} value={t.team_id || t.Team_ID}>
                      第 {idx + 1} 隊：{t.school || t.School} — {t.work_title || t.Work_Title}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="block font-bold text-emerald-950 mb-1">測試收件人信箱 (您的個人或測試 Email)</label>
              <input
                type="email"
                value={config.sender_config?.test_email || ''}
                onChange={(e) => setConfig({
                  ...config,
                  sender_config: { ...config.sender_config, test_email: e.target.value }
                })}
                className="w-full p-2.5 bg-white border border-emerald-400 rounded-lg font-bold text-gray-900"
                placeholder="輸入您要收測試信的 Email..."
              />
            </div>

            <div className="md:col-span-3">
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={sendingTest}
                className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-400 text-white rounded-xl font-black text-xs sm:text-sm shadow flex items-center justify-center cursor-pointer transition"
              >
                <span className="material-icons text-base mr-1.5">send</span>
                {sendingTest ? '正在寄出測試信...' : '📤 寄送測試信給我'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
