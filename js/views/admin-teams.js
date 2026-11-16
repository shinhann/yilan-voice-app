/**
 * 簡報達人評分系統 115學年度 - 後台隊伍管理、單隊編輯、形式審查與發信通知模組 (js/views/admin-teams.js)
 * 對應試算表 Teams (A~AE 欄，做法 A)：
 * - C欄 Category = 參賽組別
 * - D欄 Group_Name = 隊伍名稱 (隊名)
 * - H~M欄 + AB~AD欄 = 學生1~3 班級、姓名、郵件
 * - N~S欄 + AE欄 = 指導教師1~2 姓名、郵件、電話 + R欄 主要聯絡人勾選
 * - Z欄 Link_Note = 形式審查補件異常備註
 * - AA欄 Memo = 寄信狀態與時間紀錄
 */

window.AdminTeamsView = function() {
  const { useState, useEffect } = React;

  const QUICK_REVIEW_REASONS = [
    '雲端連結（簡報/心智圖/影片）未開啟「知道連結者皆可檢視」公開權限',
    '缺少指定繳交檔案（影片、簡報、心智圖、授權同意書或校訂課程計畫）',
    '說明影片規格不符（長度未在 5～8 分鐘內、解析度未達 1080p 或無法正常播放）',
    '著作權授權同意書缺少全體參賽學生或法定代理人親筆簽名',
    '簡報內容未標註引用資料來源出處、創用 CC 授權或生成式 AI 輔助使用說明'
  ];

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);
  const [sendingMail, setSendingMail] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('');
  const [submissionFilter, setSubmissionFilter] = useState('all'); // 'all' | 'submitted' | 'unsubmitted'
  const [expandedDescriptions, setExpandedDescriptions] = useState({});

  // 新增/編輯單一隊伍 Modal 狀態
  const [editingTeam, setEditingTeam] = useState(null);

  // 批次或單隊發信確認 Modal 狀態
  const [mailModal, setMailModal] = useState(null);
  // mailModal: { mode: 'single' | 'batch', template_type: 'confirm' | 'remind', targetTeams: [], onlyUnsent: true, customLinkNote: '' }

  useEffect(() => {
    fetchTeams();
  }, []);

  const toggleDescription = (id) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const fetchTeams = async () => {
    setLoading(true);
    const res = await window.ApiService.getAllTeams(window.APP_CONFIG.CURRENT_YEAR);
    if (res.status === 'success' && Array.isArray(res.data)) {
      setTeams(res.data);
    }
    setLoading(false);
  };

  // 萃取該隊所有有效且不重複之師生信箱
  const getTeamValidEmails = (t) => {
    const raw = [
      t.student1_email || t.Student1_Email,
      t.student2_email || t.Student2_Email,
      t.student3_email || t.Student3_Email,
      t.teacher1_email || t.Teacher1_Email,
      t.teacher2_email || t.Teacher2_Email
    ];
    const seen = new Set();
    const list = [];
    raw.forEach(item => {
      const str = String(item || '').trim();
      if (!str || str === '無' || str === '略' || str === '-' || !str.includes('@')) return;
      const lower = str.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        list.push(str);
      }
    });
    return list;
  };

  // SheetJS: 前端解析 Excel/CSV 上傳 (支援完整 31 欄位：學生班級/姓名/信箱、雙教師姓名/信箱/電話、主要聯絡人、C欄組別、D欄隊名)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    setStatusMsg('正在使用 SheetJS 解析 Excel/CSV 檔案...');

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (!Array.isArray(data) || data.length === 0) {
          setStatusMsg('❌ 解析失敗：檔案內無資料！');
          setImporting(false);
          return;
        }

        const formattedTeams = data.map((row, index) => {
          const rawCat = row['參賽組別'] || row['組別'] || row['類別'] || row['Category'] || '【宜蘭在地自然人文特色】國小組';
          const rawTeamName = row['隊伍名稱'] || row['隊名'] || row['Group_Name'] || '';
          return {
            team_id: row['隊伍編號'] || row['Team_ID'] || `team_${Date.now()}_${index}`,
            competition_year: row['學年度'] || row['Competition_Year'] || window.APP_CONFIG.CURRENT_YEAR,
            category: rawCat,
            group_name: rawTeamName,
            team_name: rawTeamName,
            school: row['學校'] || row['學校名稱'] || row['參賽學校'] || row['School'] || '',
            work_title: row['作品名稱'] || row['作品題目'] || row['Work_Title'] || '',
            description: row['作品說明'] || row['Description'] || '',
            // 學生 1 ~ 3 (班級、姓名、郵件)
            student1_class: row['學生1班級'] || row['隊員1班級'] || row['Student1_Class'] || '',
            student1_name: row['學生1'] || row['學生1姓名'] || row['隊員1姓名'] || row['Student1_Name'] || '',
            student1_email: row['學生1信箱'] || row['學生1郵件'] || row['學生1Email'] || row['Student1_Email'] || '',
            student2_class: row['學生2班級'] || row['隊員2班級'] || row['Student2_Class'] || '',
            student2_name: row['學生2'] || row['學生2姓名'] || row['隊員2姓名'] || row['Student2_Name'] || '',
            student2_email: row['學生2信箱'] || row['學生2郵件'] || row['學生2Email'] || row['Student2_Email'] || '',
            student3_class: row['學生3班級'] || row['隊員3班級'] || row['Student3_Class'] || '',
            student3_name: row['學生3'] || row['學生3姓名'] || row['隊員3姓名'] || row['Student3_Name'] || '',
            student3_email: row['學生3信箱'] || row['學生3郵件'] || row['學生3Email'] || row['Student3_Email'] || '',
            // 指導教師 1 ~ 2 (姓名、郵件、電話) 與主要聯絡人
            teacher1_name: row['指導老師1'] || row['指導教師1'] || row['指導教師1姓名'] || row['Teacher1_Name'] || '',
            teacher1_email: row['指導老師1信箱'] || row['指導教師1郵件'] || row['指導教師1Email'] || row['Teacher1_Email'] || '',
            teacher1_phone: row['指導老師1電話'] || row['指導教師1電話'] || row['聯絡電話'] || row['Contact_Phone'] || row['Teacher1_Phone'] || '',
            teacher2_name: row['指導老師2'] || row['指導教師2'] || row['指導教師2姓名'] || row['Teacher2_Name'] || '',
            teacher2_email: row['指導老師2信箱'] || row['指導教師2郵件'] || row['指導教師2Email'] || row['Teacher2_Email'] || '',
            teacher2_phone: row['指導老師2電話'] || row['指導教師2電話'] || row['Teacher2_Phone'] || '',
            contact_person: row['主要聯絡人'] || row['聯絡人'] || row['Contact_Person'] || '指導教師1',
            // 作品連結與備註
            mindmap_link: row['心智圖連結'] || row['MindMap_Link'] || '',
            slides_link: row['簡報檔連結'] || row['簡報連結'] || row['Slides_Link'] || '',
            video_link: row['影片連結'] || row['說明影片連結'] || row['Video_Link'] || '',
            consent_link: row['同意書連結'] || row['授權同意書連結'] || row['Consent_Link'] || '',
            course_plan_link: row['校訂課程計畫連結'] || row['Course_Plan_Link'] || '',
            drive_link: row['備用雲端連結'] || row['Drive_Link'] || '',
            link_note: row['補件備註'] || row['審核備註'] || row['Link_Note'] || '',
            memo: row['備註'] || row['Memo'] || ''
          };
        });

        setStatusMsg(`已解析 ${formattedTeams.length} 隊，正在寫入雲端試算表...`);
        const res = await window.ApiService.importTeams(formattedTeams);
        setImporting(false);

        if (res.status === 'success') {
          setStatusMsg(`✅ ${res.message || `成功匯入 ${formattedTeams.length} 支隊伍！`}`);
          fetchTeams();
        } else {
          setStatusMsg(`❌ 寫入失敗: ${res.message}`);
        }
      } catch (err) {
        console.error(err);
        setStatusMsg(`❌ Excel 解析錯誤: ${err.message}`);
        setImporting(false);
      }
    };

    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // 開啟「新增/編輯單一隊伍」視窗
  const handleOpenEditModal = (team = null) => {
    if (!team) {
      setEditingTeam({
        isNew: true,
        team_id: '',
        competition_year: window.APP_CONFIG.CURRENT_YEAR,
        category: window.APP_CONFIG.ALL_CATEGORIES[0] || '【宜蘭在地自然人文特色】國小組',
        group_name: '',
        school: '',
        work_title: '',
        description: '',
        student1_class: '', student1_name: '', student1_email: '',
        student2_class: '', student2_name: '', student2_email: '',
        student3_class: '', student3_name: '', student3_email: '',
        teacher1_name: '', teacher1_email: '', teacher1_phone: '',
        teacher2_name: '', teacher2_email: '', teacher2_phone: '',
        contact_person: '指導教師1',
        mindmap_link: '', slides_link: '', video_link: '', consent_link: '', course_plan_link: '', drive_link: '',
        link_note: '', memo: ''
      });
      return;
    }

    const cp = String(team.contact_person || team.Contact_Person || '').trim();
    const t2Name = String(team.teacher2_name || team.Teacher2_Name || '').trim();
    const resolvedContactRadio = (cp === '指導教師2' || (t2Name && cp === t2Name)) ? '指導教師2' : '指導教師1';

    setEditingTeam({
      isNew: false,
      team_id: team.team_id || team.Team_ID || '',
      competition_year: team.competition_year || window.APP_CONFIG.CURRENT_YEAR,
      category: team.category || team.Category || '',
      group_name: team.team_name || team.Team_Name || (team.group_name !== team.category ? (team.group_name || '') : ''),
      school: team.school || team.School || '',
      work_title: team.work_title || team.Work_Title || '',
      description: team.description || team.Description || '',
      student1_class: team.student1_class || team.Student1_Class || '',
      student1_name: team.student1_name || team.Student1_Name || '',
      student1_email: team.student1_email || team.Student1_Email || '',
      student2_class: team.student2_class || team.Student2_Class || '',
      student2_name: team.student2_name || team.Student2_Name || '',
      student2_email: team.student2_email || team.Student2_Email || '',
      student3_class: team.student3_class || team.Student3_Class || '',
      student3_name: team.student3_name || team.Student3_Name || '',
      student3_email: team.student3_email || team.Student3_Email || '',
      teacher1_name: team.teacher1_name || team.Teacher1_Name || '',
      teacher1_email: team.teacher1_email || team.Teacher1_Email || '',
      teacher1_phone: team.teacher1_phone || team.Teacher1_Phone || team.contact_phone || team.Contact_Phone || '',
      teacher2_name: team.teacher2_name || team.Teacher2_Name || '',
      teacher2_email: team.teacher2_email || team.Teacher2_Email || '',
      teacher2_phone: team.teacher2_phone || team.Teacher2_Phone || '',
      contact_person: resolvedContactRadio,
      mindmap_link: team.mindmap_link || team.MindMap_Link || '',
      slides_link: team.slides_link || team.Slides_Link || '',
      video_link: team.video_link || team.Video_Link || '',
      consent_link: team.consent_link || team.Consent_Link || '',
      course_plan_link: team.course_plan_link || team.Course_Plan_Link || '',
      drive_link: team.drive_link || team.Drive_Link || '',
      link_note: team.link_note || team.Link_Note || '',
      memo: team.memo || team.Memo || ''
    });
  };

  const handleSaveTeamSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editingTeam) return;
    setSavingTeam(true);

    const payloadTeam = {
      ...editingTeam,
      team_name: editingTeam.group_name,
      contact_phone: editingTeam.teacher1_phone
    };

    const res = await window.ApiService.saveTeam(payloadTeam);
    setSavingTeam(false);

    if (res.status === 'success') {
      setStatusMsg(`✅ 隊伍【${editingTeam.school} - ${editingTeam.work_title}】資料已成功儲存至試算表！`);
      setEditingTeam(null);
      fetchTeams();
    } else {
      alert(`❌ 儲存失敗：${res.message}`);
    }
  };

  // 判定是否為「已繳件」（只要有簡報檔或影片檔其一，即為已繳件）
  const checkIsSubmitted = (t) => {
    const slides = (t.slides_link || t.Slides_Link || '').trim();
    const video = (t.video_link || t.Video_Link || '').trim();
    return !!(slides || video);
  };

  // 開啟單隊或批次寄信確認視窗
  const handleOpenMailModal = (mode, templateType, singleTeam = null) => {
    if (mode === 'single' && singleTeam) {
      setMailModal({
        mode: 'single',
        template_type: templateType,
        targetTeams: [singleTeam],
        onlyUnsent: false,
        customLinkNote: singleTeam.link_note || singleTeam.Link_Note || ''
      });
      return;
    }

    // 批次模式：自動篩選目前符合資格之隊伍
    let pool = currentGroupTeams;
    if (templateType === 'confirm') {
      pool = currentGroupTeams.filter(checkIsSubmitted);
    } else if (templateType === 'remind') {
      pool = currentGroupTeams.filter(t => !checkIsSubmitted(t) || String(t.link_note || t.Link_Note || '').trim() !== '');
    }

    setMailModal({
      mode: 'batch',
      template_type: templateType,
      targetTeams: pool,
      onlyUnsent: true,
      customLinkNote: ''
    });
  };

  const getFilteredMailTargets = () => {
    if (!mailModal) return [];
    const tagPrefix = mailModal.template_type === 'remind' ? '[補件提醒:' : '[參賽通知:';
    return mailModal.targetTeams.filter(t => {
      if (mailModal.mode === 'batch' && mailModal.onlyUnsent) {
        const memoStr = String(t.memo || t.Memo || '');
        if (memoStr.includes(tagPrefix)) return false;
      }
      return true;
    });
  };

  const handleConfirmSendEmails = async () => {
    const finalTargets = getFilteredMailTargets();
    if (finalTargets.length === 0) {
      alert('目前沒有符合條件的待發信隊伍！');
      return;
    }

    setSendingMail(true);
    const res = await window.ApiService.sendTeamEmails({
      year: window.APP_CONFIG.CURRENT_YEAR,
      template_type: mailModal.template_type,
      team_ids: finalTargets.map(t => t.team_id || t.Team_ID),
      custom_link_note: mailModal.mode === 'single' && mailModal.template_type === 'remind' ? mailModal.customLinkNote : undefined
    });
    setSendingMail(false);

    if (res.status === 'success') {
      setStatusMsg(res.message);
      alert(res.message);
      setMailModal(null);
      fetchTeams();
    } else {
      alert(`❌ 發信失敗：${res.message}`);
    }
  };

  const filteredTeams = teams.filter(t => {
    const title = t.work_title || t.Work_Title || '';
    const school = t.school || t.School || '';
    const teamName = t.team_name || t.Team_Name || t.group_name || '';
    const cat = t.category || t.Category || '';
    const matchesSearch = title.includes(searchQuery) || school.includes(searchQuery) || teamName.includes(searchQuery);
    const matchesGroup = !selectedGroupFilter || cat === selectedGroupFilter;

    const isSub = checkIsSubmitted(t);
    let matchesSubmission = true;
    if (submissionFilter === 'submitted') matchesSubmission = isSub;
    if (submissionFilter === 'unsubmitted') matchesSubmission = !isSub;

    return matchesSearch && matchesGroup && matchesSubmission;
  });

  const currentGroupTeams = teams.filter(t => {
    const cat = t.category || t.Category || '';
    return !selectedGroupFilter || cat === selectedGroupFilter;
  });
  const totalInCurrentGroup = currentGroupTeams.length;
  const submittedInCurrentGroup = currentGroupTeams.filter(checkIsSubmitted).length;
  const unsubmittedInCurrentGroup = totalInCurrentGroup - submittedInCurrentGroup;

  return (
    <div className="space-y-4">
      {/* 頂部操作列 */}
      <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-800">115學年度 參賽隊伍管理與通知發送</h2>
          <p className="text-xs text-gray-500">
            共 {teams.length} 隊登記（支援學生班級/信箱、雙指導教師電話、主要聯絡人指定、形式審查與批次發信）
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenEditModal(null)}
            className="bg-amber-900 hover:bg-amber-950 text-white px-3.5 py-2 rounded-lg text-xs font-black flex items-center shadow-sm cursor-pointer"
          >
            <span className="material-icons text-base mr-1">add_circle</span>
            新增單一隊伍
          </button>

          <label className="cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-lg text-xs font-black flex items-center shadow-sm">
            <span className="material-icons text-base mr-1">upload_file</span>
            {importing ? '匯入處理中...' : '匯入 Excel/CSV'}
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" disabled={importing} />
          </label>

          <button
            type="button"
            onClick={() => handleOpenMailModal('batch', 'confirm')}
            className="bg-teal-800 hover:bg-teal-900 text-white px-3.5 py-2 rounded-lg text-xs font-black flex items-center shadow-sm cursor-pointer"
          >
            <span className="material-icons text-base mr-1">mark_email_read</span>
            批次寄發「正式參賽通知」
          </button>

          <button
            type="button"
            onClick={() => handleOpenMailModal('batch', 'remind')}
            className="bg-orange-700 hover:bg-orange-800 text-white px-3.5 py-2 rounded-lg text-xs font-black flex items-center shadow-sm cursor-pointer"
          >
            <span className="material-icons text-base mr-1">notification_important</span>
            批次寄發「補件/權限提醒」
          </button>

          <button
            type="button"
            onClick={fetchTeams}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-xs font-bold flex items-center cursor-pointer"
          >
            <span className="material-icons text-base mr-1">refresh</span>重新整理
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-950 font-bold flex justify-between items-center">
          <span>{statusMsg}</span>
          <button type="button" onClick={() => setStatusMsg('')} className="text-amber-700 hover:text-amber-950 font-black ml-3">✕</button>
        </div>
      )}

      {/* 搜尋與篩選 */}
      <div className="bg-white p-3 rounded-xl border flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <input
          type="text"
          placeholder="搜尋學校、隊伍名稱或作品名稱..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="p-2 text-xs border rounded-lg flex-1"
        />
        <select
          value={selectedGroupFilter}
          onChange={(e) => setSelectedGroupFilter(e.target.value)}
          className="p-2 text-xs border rounded-lg bg-white font-bold"
        >
          <option value="">-- 全部分組 ({window.APP_CONFIG.ALL_CATEGORIES.length}個組別) --</option>
          {window.APP_CONFIG.ALL_CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* 已繳件 / 未繳件切換按鈕 */}
        <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
          <button
            type="button"
            onClick={() => setSubmissionFilter('all')}
            className={`px-3 py-1 text-xs rounded-md font-bold transition cursor-pointer ${
              submissionFilter === 'all'
                ? 'bg-white text-gray-800 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            全部 ({totalInCurrentGroup})
          </button>
          <button
            type="button"
            onClick={() => setSubmissionFilter('submitted')}
            className={`px-3 py-1 text-xs rounded-md font-bold transition flex items-center cursor-pointer ${
              submissionFilter === 'submitted'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            🟢 已繳件 ({submittedInCurrentGroup})
          </button>
          <button
            type="button"
            onClick={() => setSubmissionFilter('unsubmitted')}
            className={`px-3 py-1 text-xs rounded-md font-bold transition flex items-center cursor-pointer ${
              submissionFilter === 'unsubmitted'
                ? 'bg-amber-800 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            ⚪ 未繳件 ({unsubmittedInCurrentGroup})
          </button>
        </div>
      </div>

      {/* 隊伍表格 */}
      <div className="bg-white rounded-xl border overflow-x-auto shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 border-b text-gray-700 font-bold">
            <tr>
              <th className="p-3 w-10">#</th>
              <th className="p-3 min-w-[160px]">組別與學校隊名</th>
              <th className="p-3 min-w-[210px]">作品名稱與說明</th>
              <th className="p-3 min-w-[250px]">參賽學生(班級/郵件) ＆ 指導教師</th>
              <th className="p-3 min-w-[210px]">115 檔案繳件連結 ＆ 審核備註</th>
              <th className="p-3 w-44 text-center">狀態與單隊操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="6" className="p-6 text-center text-gray-400">載入中...</td></tr>
            ) : filteredTeams.length === 0 ? (
              <tr><td colSpan="6" className="p-6 text-center text-gray-400">尚無符合條件之隊伍資料</td></tr>
            ) : (
              filteredTeams.map((t, idx) => {
                const teamKey = t.team_id || t.Team_ID || idx;
                const isExpanded = !!expandedDescriptions[teamKey];
                const desc = (t.description || t.Description || '').trim();
                const catName = t.category || t.Category || '';
                const schoolName = t.school || t.School || '';
                const teamName = t.team_name || t.Team_Name || (t.group_name !== catName ? (t.group_name || '') : '');
                const linkNote = (t.link_note || t.Link_Note || '').trim();
                const memoStr = (t.memo || t.Memo || '').trim();
                const validEmails = getTeamValidEmails(t);

                const stuItems = [1, 2, 3].map(i => {
                  const sName = (t[`student${i}_name`] || t[`Student${i}_Name`] || '').trim();
                  const sClass = (t[`student${i}_class`] || t[`Student${i}_Class`] || '').trim();
                  const sEmail = (t[`student${i}_email`] || t[`Student${i}_Email`] || '').trim();
                  if (!sName && !sEmail) return null;
                  return { idx: i, name: sName || `學生${i}`, cls: sClass, email: sEmail };
                }).filter(Boolean);

                const teacher1 = (t.teacher1_name || t.Teacher1_Name || '').trim();
                const teacher1Email = (t.teacher1_email || t.Teacher1_Email || '').trim();
                const teacher1Phone = (t.teacher1_phone || t.Teacher1_Phone || t.contact_phone || t.Contact_Phone || '').trim();

                const teacher2 = (t.teacher2_name || t.Teacher2_Name || '').trim();
                const teacher2Email = (t.teacher2_email || t.Teacher2_Email || '').trim();
                const teacher2Phone = (t.teacher2_phone || t.Teacher2_Phone || '').trim();

                const contactPerson = (t.contact_person || t.Contact_Person || '').trim();
                const isTeacher2Primary = contactPerson === '指導教師2' || (teacher2 && contactPerson === teacher2);
                const isTeacher1Primary = !isTeacher2Primary;

                return (
                  <tr key={teamKey} className="hover:bg-gray-50 align-top">
                    <td className="p-3 font-semibold text-gray-400">{idx + 1}</td>

                    {/* 組別、學校、隊伍名稱 (D欄 Group_Name) */}
                    <td className="p-3 space-y-1">
                      <div className="text-[11px] font-bold text-amber-900 bg-amber-50 inline-block px-2 py-0.5 rounded border border-amber-200">
                        {catName}
                      </div>
                      <div className="font-black text-gray-900 text-sm">{schoolName}</div>
                      {teamName && (
                        <div className="text-xs font-bold text-indigo-800">
                          🏷️ 隊名：{teamName}
                        </div>
                      )}
                    </td>

                    {/* 作品名稱與說明 */}
                    <td className="p-3 space-y-1.5">
                      <div className="text-gray-900 font-bold text-sm">
                        {t.work_title || t.Work_Title}
                      </div>

                      {desc ? (
                        <div className="bg-gray-50 p-2 rounded-lg border border-gray-200 text-xs space-y-1">
                          <div className={`text-gray-600 transition-all leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                            <span className="font-semibold text-gray-500 mr-1">📝 說明:</span>
                            {desc}
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleDescription(teamKey)}
                            className="text-[11px] text-amber-900 hover:text-amber-950 font-bold flex items-center pt-0.5 focus:outline-none cursor-pointer"
                          >
                            <span className="material-icons text-xs mr-0.5">
                              {isExpanded ? 'expand_less' : 'expand_more'}
                            </span>
                            {isExpanded ? '收合作品說明' : '展開完整作品說明'}
                          </button>
                        </div>
                      ) : (
                        <div className="text-gray-400 text-[11px] italic">尚無作品說明</div>
                      )}
                    </td>

                    {/* 學生 (班級/姓名/信箱) 與 指導教師 (姓名/信箱/電話/主要聯絡人) */}
                    <td className="p-3 space-y-2">
                      <div className="space-y-0.5">
                        <div className="font-bold text-gray-600 text-[11px]">👨‍🎓 參賽學生：</div>
                        {stuItems.length > 0 ? (
                          stuItems.map(s => (
                            <div key={s.idx} className="text-[11px] text-gray-800 pl-1 flex flex-wrap items-center gap-1">
                              {s.cls && (
                                <span className="px-1.5 py-0.2 bg-stone-200 text-stone-800 rounded font-bold text-[10px]">
                                  {s.cls}
                                </span>
                              )}
                              <span className="font-bold">{s.name}</span>
                              {s.email && <span className="text-gray-500 font-mono text-[10px]">&lt;{s.email}&gt;</span>}
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-400 text-[11px] pl-1">未填寫學生資料</div>
                        )}
                      </div>

                      <div className="space-y-0.5 border-t border-gray-100 pt-1.5">
                        <div className="font-bold text-gray-600 text-[11px]">👩‍🏫 指導教師：</div>
                        {teacher1 ? (
                          <div className="text-[11px] pl-1 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="font-bold text-gray-900">{teacher1}</span>
                              {isTeacher1Primary && (
                                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-950 border border-amber-300 rounded font-black text-[10px]">
                                  ⭐ 主要聯絡人
                                </span>
                              )}
                              {teacher1Phone && <span className="text-gray-700 font-semibold">📞 {teacher1Phone}</span>}
                            </div>
                            {teacher1Email && <div className="text-gray-500 font-mono text-[10px] pl-1">&lt;{teacher1Email}&gt;</div>}
                          </div>
                        ) : (
                          <div className="text-gray-400 text-[11px] pl-1">未填寫指導教師一</div>
                        )}

                        {teacher2 && (
                          <div className="text-[11px] pl-1 pt-0.5 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="font-bold text-gray-900">{teacher2}</span>
                              {isTeacher2Primary && (
                                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-950 border border-amber-300 rounded font-black text-[10px]">
                                  ⭐ 主要聯絡人
                                </span>
                              )}
                              {teacher2Phone && <span className="text-gray-700 font-semibold">📞 {teacher2Phone}</span>}
                            </div>
                            {teacher2Email && <div className="text-gray-500 font-mono text-[10px] pl-1">&lt;{teacher2Email}&gt;</div>}
                          </div>
                        )}
                      </div>

                      <div className="pt-0.5">
                        {validEmails.length > 0 ? (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            ✉️ 可收信師生共 {validEmails.length} 人
                          </span>
                        ) : (
                          <span className="text-[10px] font-black text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            ⚠️ 尚未填寫任何有效 Email
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 檔案連結與形式審查備註 */}
                    <td className="p-3 space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {t.MindMap_Link ? (
                          <a href={t.MindMap_Link} target="_blank" rel="noopener noreferrer" className="px-2 py-1 bg-sky-50 text-sky-700 border border-sky-300 hover:bg-sky-100 rounded text-[11px] font-semibold">
                            🧠 心智圖 ↗
                          </a>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded text-[10px]">無心智圖</span>
                        )}

                        {t.Slides_Link ? (
                          <a href={t.Slides_Link} target="_blank" rel="noopener noreferrer" className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100 rounded text-[11px] font-semibold">
                            📊 簡報 ↗
                          </a>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded text-[10px]">無簡報</span>
                        )}

                        {t.Video_Link ? (
                          <a href={t.Video_Link} target="_blank" rel="noopener noreferrer" className="px-2 py-1 bg-red-50 text-red-700 border border-red-300 hover:bg-red-100 rounded text-[11px] font-semibold">
                            🎬 影片 ↗
                          </a>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded text-[10px]">無影片</span>
                        )}

                        {t.Consent_Link ? (
                          <a href={t.Consent_Link} target="_blank" rel="noopener noreferrer" className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 rounded text-[11px] font-semibold">
                            📄 同意書 ↗
                          </a>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded text-[10px]">無同意書</span>
                        )}

                        {t.Course_Plan_Link ? (
                          <a href={t.Course_Plan_Link} target="_blank" rel="noopener noreferrer" className="px-2 py-1 bg-purple-50 text-purple-700 border border-purple-300 hover:bg-purple-100 rounded text-[11px] font-bold">
                            📑 校訂課程PDF ↗
                          </a>
                        ) : (
                          catName.includes('校訂課程') && (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-bold">⚠️ 缺課程計畫</span>
                          )
                        )}
                      </div>

                      {linkNote && (
                        <div className="p-2 bg-orange-50 border border-orange-300 rounded-lg text-[11px] text-orange-950 font-bold">
                          ⚠️ 補件備註：{linkNote}
                        </div>
                      )}

                      {memoStr && (
                        <div className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-1 rounded border border-teal-200">
                          📬 寄信紀錄：{memoStr}
                        </div>
                      )}
                    </td>

                    {/* 狀態與單隊操作按鈕 */}
                    <td className="p-3 text-center align-middle space-y-2">
                      <div>
                        {checkIsSubmitted(t) ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            已繳件
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-300">
                            未繳件
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(t)}
                          className="w-full px-2.5 py-1.5 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-black flex items-center justify-center cursor-pointer"
                        >
                          <span className="material-icons text-xs mr-1">edit</span>
                          編輯資料與信箱
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenMailModal('single', 'confirm', t)}
                          className="w-full px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 rounded-lg text-[11px] font-bold flex items-center justify-center cursor-pointer"
                        >
                          <span className="material-icons text-xs mr-1">mail</span>
                          寄送參賽通知
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenMailModal('single', 'remind', t)}
                          className="w-full px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-300 rounded-lg text-[11px] font-bold flex items-center justify-center cursor-pointer"
                        >
                          <span className="material-icons text-xs mr-1">warning_amber</span>
                          寄送補件提醒
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ==================== 單一隊伍新增／編輯 Modal (含學生班級、雙教師電話、主要聯絡人勾選、形式審查快速標籤) ==================== */}
      {editingTeam && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-5 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-black text-amber-950 flex items-center">
                <span className="material-icons text-amber-800 mr-1.5">group</span>
                {editingTeam.isNew ? '新增參賽隊伍資料' : `編輯隊伍：${editingTeam.school} — ${editingTeam.work_title}`}
              </h3>
              <button type="button" onClick={() => setEditingTeam(null)} className="text-gray-400 hover:text-gray-700 font-black text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveTeamSubmit} className="space-y-4">
              {/* 1. 基本資料區 */}
              <div className="bg-stone-50 p-4 rounded-xl border space-y-3">
                <div className="font-black text-amber-950 text-sm">📌 一、基本與作品資訊（對應試算表 C ～ G 欄）</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">參賽組別 (C欄 Category)</label>
                    <select
                      value={editingTeam.category}
                      onChange={(e) => setEditingTeam({ ...editingTeam, category: e.target.value })}
                      className="w-full p-2 border rounded-lg bg-white font-bold"
                    >
                      {window.APP_CONFIG.ALL_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">學校名稱 (E欄 School)</label>
                    <input
                      type="text"
                      required
                      value={editingTeam.school}
                      onChange={(e) => setEditingTeam({ ...editingTeam, school: e.target.value })}
                      className="w-full p-2 border rounded-lg bg-white font-bold"
                      placeholder="例如：宜蘭國小"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">隊伍名稱 (D欄 Group_Name)</label>
                    <input
                      type="text"
                      value={editingTeam.group_name}
                      onChange={(e) => setEditingTeam({ ...editingTeam, group_name: e.target.value })}
                      className="w-full p-2 border rounded-lg bg-white font-bold"
                      placeholder="例如：蘭陽小尖兵隊"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">作品名稱 (F欄 Work_Title)</label>
                  <input
                    type="text"
                    required
                    value={editingTeam.work_title}
                    onChange={(e) => setEditingTeam({ ...editingTeam, work_title: e.target.value })}
                    className="w-full p-2 border rounded-lg bg-white font-bold text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">作品說明 (G欄 Description)</label>
                  <textarea
                    rows={3}
                    value={editingTeam.description}
                    onChange={(e) => setEditingTeam({ ...editingTeam, description: e.target.value })}
                    className="w-full p-2 border rounded-lg bg-white"
                  />
                </div>
              </div>

              {/* 2. 參賽學生 1~3 (班級、姓名、郵件) */}
              <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 space-y-3">
                <div className="font-black text-amber-950 text-sm">👨‍🎓 二、參賽學生 1 ～ 3（班級、姓名、電子郵件）</div>
                {[1, 2, 3].map(i => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">學生 {i} 班級</label>
                      <input
                        type="text"
                        value={editingTeam[`student${i}_class`] || ''}
                        onChange={(e) => setEditingTeam({ ...editingTeam, [`student${i}_class`]: e.target.value })}
                        className="w-full p-2 border rounded-lg bg-white"
                        placeholder="例如：六年甲班 或 601"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">學生 {i} 姓名</label>
                      <input
                        type="text"
                        value={editingTeam[`student${i}_name`] || ''}
                        onChange={(e) => setEditingTeam({ ...editingTeam, [`student${i}_name`]: e.target.value })}
                        className="w-full p-2 border rounded-lg bg-white font-bold"
                        placeholder={`學生 ${i} 姓名`}
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">學生 {i} 郵件 (Email)</label>
                      <input
                        type="email"
                        value={editingTeam[`student${i}_email`] || ''}
                        onChange={(e) => setEditingTeam({ ...editingTeam, [`student${i}_email`]: e.target.value })}
                        className="w-full p-2 border rounded-lg bg-white font-mono"
                        placeholder="student@..."
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* 3. 指導教師 1~2 (姓名、郵件、電話) 與主要聯絡人勾選 */}
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="font-black text-emerald-950 text-sm">👩‍🏫 三、指導教師 1 ～ 2 與主要聯絡人勾選</div>
                  <div className="flex items-center space-x-4 bg-white px-3 py-1.5 rounded-lg border border-emerald-300">
                    <span className="font-black text-amber-950">⭐ 指定主要聯絡人：</span>
                    <label className="flex items-center space-x-1.5 cursor-pointer font-bold text-gray-800">
                      <input
                        type="radio"
                        name="primary_contact_radio"
                        checked={editingTeam.contact_person !== '指導教師2'}
                        onChange={() => setEditingTeam({ ...editingTeam, contact_person: '指導教師1' })}
                        className="accent-amber-900"
                      />
                      <span>指導教師 1</span>
                    </label>
                    <label className="flex items-center space-x-1.5 cursor-pointer font-bold text-gray-800">
                      <input
                        type="radio"
                        name="primary_contact_radio"
                        checked={editingTeam.contact_person === '指導教師2'}
                        onChange={() => setEditingTeam({ ...editingTeam, contact_person: '指導教師2' })}
                        className="accent-amber-900"
                      />
                      <span>指導教師 2</span>
                    </label>
                  </div>
                </div>

                {[1, 2].map(i => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        指導教師 {i} 姓名 {editingTeam.contact_person === `指導教師${i}` && <span className="text-amber-800">⭐(主要聯絡人)</span>}
                      </label>
                      <input
                        type="text"
                        value={editingTeam[`teacher${i}_name`] || ''}
                        onChange={(e) => setEditingTeam({ ...editingTeam, [`teacher${i}_name`]: e.target.value })}
                        className="w-full p-2 border rounded-lg bg-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">指導教師 {i} 郵件 (Email)</label>
                      <input
                        type="email"
                        value={editingTeam[`teacher${i}_email`] || ''}
                        onChange={(e) => setEditingTeam({ ...editingTeam, [`teacher${i}_email`]: e.target.value })}
                        className="w-full p-2 border rounded-lg bg-white font-mono"
                        placeholder="teacher@..."
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">指導教師 {i} 聯絡電話</label>
                      <input
                        type="tel"
                        value={editingTeam[`teacher${i}_phone`] || ''}
                        onChange={(e) => setEditingTeam({ ...editingTeam, [`teacher${i}_phone`]: e.target.value })}
                        className="w-full p-2 border rounded-lg bg-white"
                        placeholder="0912-345678 或校內分機"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* 4. 檔案連結與形式審查備註 */}
              <div className="bg-gray-50 p-4 rounded-xl border space-y-3">
                <div className="font-black text-gray-800 text-sm">🔗 四、作品繳件連結與形式審查補件備註（對應 T ～ Z 欄）</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">📊 簡報檔連結 (U欄 Slides_Link)</label>
                    <input
                      type="text"
                      value={editingTeam.slides_link}
                      onChange={(e) => setEditingTeam({ ...editingTeam, slides_link: e.target.value })}
                      className="w-full p-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">🎬 說明影片連結 (V欄 Video_Link)</label>
                    <input
                      type="text"
                      value={editingTeam.video_link}
                      onChange={(e) => setEditingTeam({ ...editingTeam, video_link: e.target.value })}
                      className="w-full p-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">🧠 Mindomo心智圖連結 (T欄 MindMap_Link)</label>
                    <input
                      type="text"
                      value={editingTeam.mindmap_link}
                      onChange={(e) => setEditingTeam({ ...editingTeam, mindmap_link: e.target.value })}
                      className="w-full p-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">📄 授權同意書連結 (W欄 Consent_Link)</label>
                    <input
                      type="text"
                      value={editingTeam.consent_link}
                      onChange={(e) => setEditingTeam({ ...editingTeam, consent_link: e.target.value })}
                      className="w-full p-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">📑 校訂課程計畫 PDF (X欄 Course_Plan_Link)</label>
                    <input
                      type="text"
                      value={editingTeam.course_plan_link}
                      onChange={(e) => setEditingTeam({ ...editingTeam, course_plan_link: e.target.value })}
                      className="w-full p-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">☁️ 備用雲端資料夾 (Y欄 Drive_Link)</label>
                    <input
                      type="text"
                      value={editingTeam.drive_link}
                      onChange={(e) => setEditingTeam({ ...editingTeam, drive_link: e.target.value })}
                      className="w-full p-2 border rounded-lg bg-white"
                    />
                  </div>
                </div>

                {/* 形式審查 5 大退件原因快速點選 */}
                <div className="pt-2 border-t space-y-2">
                  <label className="block font-black text-orange-900">
                    ⚠️ 形式審查補件／異常原因備註（Z欄 Link_Note — 將自動套印至「補件提醒通知信」之 {'{補件異常備註}'}）
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_REVIEW_REASONS.map((reason, rIdx) => (
                      <button
                        key={rIdx}
                        type="button"
                        onClick={() => {
                          const prev = editingTeam.link_note ? `${editingTeam.link_note}\n` : '';
                          setEditingTeam({ ...editingTeam, link_note: `${prev}• ${reason}` });
                        }}
                        className="px-2 py-1 bg-orange-100 hover:bg-orange-200 text-orange-950 border border-orange-300 rounded-md text-[11px] font-bold cursor-pointer"
                      >
                        + {reason.substring(0, 16)}...
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    value={editingTeam.link_note}
                    onChange={(e) => setEditingTeam({ ...editingTeam, link_note: e.target.value })}
                    className="w-full p-2 border border-orange-300 rounded-lg bg-white"
                    placeholder="若作品連結正常可留空；若有缺件或權限未開，可點選上方快速標籤或直接輸入..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={savingTeam}
                  className="px-6 py-2.5 bg-amber-900 hover:bg-amber-950 text-white rounded-xl font-black shadow-md cursor-pointer"
                >
                  {savingTeam ? '儲存中...' : '💾 儲存隊伍資料至試算表'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== 批次或單隊發送通知信確認視窗 ==================== */}
      {mailModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border max-w-2xl w-full p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-black text-amber-950 flex items-center">
                <span className="material-icons text-amber-800 mr-1.5">forward_to_inbox</span>
                {mailModal.template_type === 'remind'
                  ? '⚠️ 發送【形式審查補件／權限提醒通知信】'
                  : '📄 發送【正式參賽與作品收件確認通知信】'}
              </h3>
              <button type="button" onClick={() => setMailModal(null)} className="text-gray-400 hover:text-gray-700 font-black text-lg cursor-pointer">✕</button>
            </div>

            {mailModal.mode === 'batch' && (
              <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer font-black text-amber-950">
                  <input
                    type="checkbox"
                    checked={mailModal.onlyUnsent}
                    onChange={(e) => setMailModal({ ...mailModal, onlyUnsent: e.target.checked })}
                    className="w-4 h-4 accent-amber-900"
                  />
                  <span>防重複寄信保護：僅發送給「尚未寄送過此通知」的隊伍（推薦勾選）</span>
                </label>
                <p className="text-[11px] text-gray-600 pl-6">
                  系統會根據試算表 AA 欄 (Memo) 自動過濾已寄過的隊伍；若取消勾選，則會對所有符合資格的隊伍重新發送。
                </p>
              </div>
            )}

            {mailModal.mode === 'single' && mailModal.template_type === 'remind' && (
              <div className="bg-orange-50 p-3.5 rounded-xl border border-orange-300 space-y-2">
                <label className="block font-black text-orange-950">
                  ⚠️ 填寫或點選本隊需補正事項（將同步存入試算表 Z 欄 Link_Note 並套印至信中）：
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_REVIEW_REASONS.map((reason, rIdx) => (
                    <button
                      key={rIdx}
                      type="button"
                      onClick={() => {
                        const prev = mailModal.customLinkNote ? `${mailModal.customLinkNote}\n` : '';
                        setMailModal({ ...mailModal, customLinkNote: `${prev}• ${reason}` });
                      }}
                      className="px-2 py-1 bg-white hover:bg-orange-100 text-orange-950 border border-orange-300 rounded text-[11px] font-bold cursor-pointer"
                    >
                      + {reason.substring(0, 15)}...
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  value={mailModal.customLinkNote}
                  onChange={(e) => setMailModal({ ...mailModal, customLinkNote: e.target.value })}
                  className="w-full p-2 border border-orange-300 rounded-lg bg-white font-bold text-gray-900"
                  placeholder="請輸入要提醒該隊師生補正的具體事項..."
                />
              </div>
            )}

            {/* 預計發送隊伍與收件信箱預覽清單 */}
            <div className="space-y-2">
              <div className="font-black text-gray-800 flex justify-between">
                <span>📋 預計發送隊伍清單（共 {getFilteredMailTargets().length} 隊）：</span>
                <span className="text-emerald-800">
                  預計寄達信箱總數：{getFilteredMailTargets().reduce((acc, t) => acc + getTeamValidEmails(t).length, 0)} 封
                </span>
              </div>
              <div className="max-h-56 overflow-y-auto border rounded-xl divide-y bg-gray-50">
                {getFilteredMailTargets().length === 0 ? (
                  <div className="p-4 text-center text-gray-400 font-bold">目前無待發送隊伍（可能皆已寄送過，可取消上方勾選重新寄送）</div>
                ) : (
                  getFilteredMailTargets().map((t, idx) => {
                    const emails = getTeamValidEmails(t);
                    return (
                      <div key={t.team_id || idx} className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 bg-white">
                        <div>
                          <span className="font-black text-gray-900">{t.school || t.School}</span>
                          <span className="text-gray-600 ml-1.5">《{t.work_title || t.Work_Title}》</span>
                        </div>
                        <div className="text-[11px] font-mono text-emerald-800">
                          {emails.length > 0 ? emails.join(', ') : <span className="text-red-600 font-bold">⚠️ 無有效信箱(將自動略過)</span>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setMailModal(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmSendEmails}
                disabled={sendingMail || getFilteredMailTargets().length === 0}
                className="px-6 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-400 text-white rounded-xl font-black shadow-md flex items-center cursor-pointer"
              >
                <span className="material-icons text-sm mr-1">send</span>
                {sendingMail ? '正在寄送郵件中...' : `確認正式寄出 (${getFilteredMailTargets().length} 隊)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
