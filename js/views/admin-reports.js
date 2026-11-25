/**
 * 簡報達人評分系統 115學年度 - 成績總表與大會報表列印中心 (js/views/admin-reports.js)
 * 提供三種專屬報表：
 * 1. 🏛️ 縣府備查版：評審決審評分總表（6 組別，含分數、序位、排名與 3 位評審評語，無須評審簽章）
 * 2. ✍️ 評審簽名版：個別評審成績表（9 位評審，8 欄式，評語 56%，最末頁含「評審委員簽章」）
 * 3. 📢 大會公告版：獲獎成績榮譽榜（6 組別，不公開分數與排名；特優/優等附評語，簡報/學習之星不附評語）
 */

window.AdminReportsView = function() {
  const { useState, useEffect, useMemo } = React;

  const CATEGORIES = window.APP_CONFIG?.ALL_CATEGORIES || [
    '宜蘭在地國中組', '宜蘭在地國小組',
    '環境永續國中組', '環境永續國小組',
    '校訂課程國中組', '校訂課程國小組'
  ];

  const CATEGORY_FULL_TITLE_MAP = {
    '宜蘭在地國中組': '【宜蘭在地自然人文特色—國中組】',
    '宜蘭在地國小組': '【宜蘭在地自然人文特色—國小組】',
    '環境永續國中組': '【環境永續×SDGs及生活裡的永續—國中組】',
    '環境永續國小組': '【環境永續×SDGs及生活裡的永續—國小組】',
    '校訂課程國中組': '【學校校訂課程—國中組】',
    '校訂課程國小組': '【學校校訂課程—國小組】'
  };

  const DEFAULT_CATEGORY_JUDGES = {
    '宜蘭在地國中組': ['A', 'B', 'C'],
    '宜蘭在地國小組': ['A', 'B', 'C'],
    '環境永續國中組': ['D', 'E', 'F'],
    '環境永續國小組': ['D', 'E', 'F'],
    '校訂課程國中組': ['G', 'H', 'I'],
    '校訂課程國小組': ['G', 'H', 'I']
  };

  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [judges, setJudges] = useState([]);
  const [scores, setScores] = useState([]);
  const [decisionsMap, setDecisionsMap] = useState({});

  // 模態視窗狀態：modalType: null | 'county' | 'judge' | 'public'
  const [modalType, setModalType] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [selectedJudgeCode, setSelectedJudgeCode] = useState('A');

  // 列印時間戳記
  const getFormattedPrintTime = () => {
    const now = new Date();
    const rocYear = (now.getFullYear() - 1911) > 0 ? (now.getFullYear() - 1911) : (window.APP_CONFIG.CURRENT_YEAR || 115);
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `中華民國 ${rocYear} 年 ${m} 月 ${d} 日 ${hh}:${mm}`;
  };

  const [printTimestamp, setPrintTimestamp] = useState(getFormattedPrintTime);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const res = await window.ApiService.getAdminResults(window.APP_CONFIG.CURRENT_YEAR);
    if (res.status === 'success' && res.data) {
      setTeams(Array.isArray(res.data.teams) ? res.data.teams : []);
      setJudges(Array.isArray(res.data.judges) ? res.data.judges : []);
      setScores(Array.isArray(res.data.scores) ? res.data.scores : []);

      // 讀取雲端已存之 Final_Results
      const dMap = {};
      const loadedFinals = Array.isArray(res.data.final_results) ? res.data.final_results : [];
      loadedFinals.forEach(fr => {
        const tid = String(fr.team_id || '');
        if (tid) {
          dMap[tid] = {
            feature_award: String(fr.feature_award || ''),
            rank_award: String(fr.rank_award || ''),
            saved: true
          };
        }
      });

      // 同時檢查本地 LocalStorage 暫存
      try {
        const cached = localStorage.getItem(`consensus_decisions_${window.APP_CONFIG.CURRENT_YEAR}`);
        if (cached) {
          const localDraftMap = JSON.parse(cached);
          Object.keys(localDraftMap).forEach(tid => {
            if (localDraftMap[tid]) {
              dMap[tid] = { ...dMap[tid], ...localDraftMap[tid] };
            }
          });
        }
      } catch (e) {
        console.warn('讀取本地暫存失敗', e);
      }

      setDecisionsMap(dMap);
    } else {
      alert('讀取資料失敗：' + (res.message || '未知錯誤'));
    }
    setLoading(false);
  };

  // 取得組別指派的 3 位評審
  const getJudgesForCategory = (cat) => {
    const matched = judges.filter(j => {
      const code = String(j.judge_code || j.Judge_Code || '').trim();
      const catShort = String(j.category_short || j.Category_Short || '');
      if (!code) return false;
      if (catShort.includes(cat)) return true;
      if (cat.includes('宜蘭在地') && catShort.includes('宜蘭在地')) return true;
      if (cat.includes('環境永續') && catShort.includes('環境永續')) return true;
      if (cat.includes('校訂課程') && catShort.includes('校訂課程')) return true;
      return false;
    }).sort((a, b) => String(a.judge_code || a.Judge_Code).localeCompare(String(b.judge_code || b.Judge_Code)));

    if (matched.length >= 3) {
      return matched.slice(0, 3).map(j => ({
        code: String(j.judge_code || j.Judge_Code),
        name: String(j.judge_name || j.Judge_Name || `評審${j.judge_code || j.Judge_Code}`)
      }));
    }

    const fallbackCodes = DEFAULT_CATEGORY_JUDGES[cat] || ['A', 'B', 'C'];
    return fallbackCodes.map(c => {
      const found = judges.find(j => String(j.judge_code || j.Judge_Code) === c);
      return {
        code: c,
        name: found ? String(found.judge_name || found.Judge_Name) : `評審${c}`
      };
    });
  };

  // 核心演算法：計算某組別所有隊伍之成績、名次與三位評審資料
  const getProcessedDataForCategory = (cat) => {
    const catJudges = getJudgesForCategory(cat);

    const groupTeams = teams.filter(t => {
      const c = String(t.category || t.Category || t.group_name || t.Group_Name || '').trim();
      const matchesCat = c === cat;
      const slides = (t.slides_link || t.Slides_Link || '').trim();
      const video = (t.video_link || t.Video_Link || '').trim();
      return matchesCat && (slides || video);
    });

    const judgeRankMap = {};
    catJudges.forEach(j => {
      judgeRankMap[j.code] = {};
      const scoredList = [];
      groupTeams.forEach(t => {
        const tid = String(t.team_id || t.Team_ID);
        const rec = scores.find(s => String(s.team_id) === tid && String(s.judge_code) === j.code);
        if (rec && rec.total_score !== undefined && rec.total_score !== '') {
          scoredList.push({ tid, score: Number(rec.total_score) });
        }
      });
      scoredList.sort((a, b) => b.score - a.score);
      let curRank = 1;
      scoredList.forEach((item, idx) => {
        if (idx > 0 && item.score < scoredList[idx - 1].score) {
          curRank = idx + 1;
        }
        judgeRankMap[j.code][item.tid] = curRank;
      });
    });

    const enriched = groupTeams.map((t, idx) => {
      const tid = String(t.team_id || t.Team_ID);
      const judgeDetails = catJudges.map(j => {
        const rec = scores.find(s => String(s.team_id) === tid && String(s.judge_code) === j.code);
        const rank = judgeRankMap[j.code]?.[tid] ?? null;
        return {
          judge_code: j.code,
          judge_name: j.name,
          has_scored: !!rec,
          total_score: rec ? Number(rec.total_score) : null,
          score_content: rec ? Number(rec.score_content) : null,
          score_expression: rec ? Number(rec.score_expression) : null,
          score_stage: rec ? Number(rec.score_stage) : null,
          score_technique: rec ? Number(rec.score_technique) : null,
          rank: rank,
          award_rec: rec ? String(rec.award_recommendation || rec.award || '') : '',
          comment: rec ? String(rec.comment || '') : ''
        };
      });

      const validScores = judgeDetails.filter(d => d.has_scored && d.total_score !== null);
      const avgScore = validScores.length > 0
        ? Number((validScores.reduce((acc, cur) => acc + cur.total_score, 0) / validScores.length).toFixed(1))
        : null;

      const validRanks = judgeDetails.filter(d => d.rank !== null);
      const rankSum = validRanks.length > 0
        ? validRanks.reduce((acc, cur) => acc + cur.rank, 0)
        : null;

      const dec = decisionsMap[tid] || { feature_award: '', rank_award: '' };

      return {
        seq_index: idx + 1,
        team_id: tid,
        category: cat,
        school: String(t.school || t.School || ''),
        team_name: String(t.team_name || t.Team_Name || (t.group_name !== cat ? (t.group_name || t.Group_Name || '') : '')),
        work_title: String(t.work_title || t.Work_Title || ''),
        judgeDetails,
        avg_score: avgScore,
        rank_sum: rankSum,
        feature_award: dec.feature_award || '',
        rank_award: dec.rank_award || ''
      };
    });

    // 計算平均總分排名
    const byAvg = [...enriched].filter(item => item.avg_score !== null).sort((a, b) => {
      if (b.avg_score !== a.avg_score) return b.avg_score - a.avg_score;
      return (a.rank_sum ?? 999) - (b.rank_sum ?? 999);
    });
    const avgRankLookup = {};
    let curAvgRank = 1;
    byAvg.forEach((item, i) => {
      if (i > 0 && item.avg_score < byAvg[i - 1].avg_score) {
        curAvgRank = i + 1;
      }
      avgRankLookup[item.team_id] = curAvgRank;
    });

    return enriched.map((item, idx) => ({
      ...item,
      final_rank: avgRankLookup[item.team_id] ?? (idx + 1)
    }));
  };

  // 列印執行函式
  const executePrint = (docTitle) => {
    setPrintTimestamp(getFormattedPrintTime());
    const originalTitle = document.title;
    document.title = docTitle;
    const restore = () => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    setTimeout(() => {
      window.print();
      setTimeout(restore, 2000);
    }, 50);
  };

  // 1. 開啟「縣府備查評分總表」
  const openCountyModal = (cat) => {
    setSelectedCategory(cat);
    setModalType('county');
  };

  // 2. 開啟「評審個人評分表」
  const openJudgeModal = (judgeCode, cat) => {
    setSelectedJudgeCode(judgeCode);
    setSelectedCategory(cat);
    setModalType('judge');
  };

  // 3. 開啟「大會公告榮譽榜」
  const openPublicModal = (cat) => {
    setSelectedCategory(cat);
    setModalType('public');
  };

  // 評審名冊統計 (A ~ I)
  const judgeList = useMemo(() => {
    const list = [];
    const allCodes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
    allCodes.forEach(code => {
      const found = judges.find(j => String(j.judge_code || j.Judge_Code) === code);
      const name = found ? String(found.judge_name || found.Judge_Name) : `評審 ${code}`;
      const catShort = found ? String(found.category_short || found.Category_Short || '') : '';
      
      let assignedCategories = [];
      if (['A', 'B', 'C'].includes(code)) {
        assignedCategories = ['宜蘭在地國中組', '宜蘭在地國小組'];
      } else if (['D', 'E', 'F'].includes(code)) {
        assignedCategories = ['環境永續國中組', '環境永續國小組'];
      } else if (['G', 'H', 'I'].includes(code)) {
        assignedCategories = ['校訂課程國中組', '校訂課程國小組'];
      }

      list.push({
        code,
        name,
        categoryText: catShort || assignedCategories.join('、'),
        assignedCategories
      });
    });
    return list;
  }, [judges]);

  return (
    <div className="space-y-8 pb-16">
      {/* ==================== 頂部標題與快速同步工具列 ==================== */}
      <div className="no-print bg-white p-5 rounded-2xl border border-amber-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="material-icons text-amber-700 text-3xl">print</span>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              成績總表與大會報表列印中心
            </h2>
          </div>
          <p className="text-sm text-gray-600 mt-1 font-medium">
            全組別一鍵快速預覽與高品質列印：提供【縣府備查評分總表】、【評審個人評分簽名單】及【大會獲獎公告榮譽榜】三大專屬規格。
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="bg-amber-900 hover:bg-amber-950 disabled:bg-gray-400 text-white px-4 py-2.5 rounded-xl text-sm font-black flex items-center shadow-md transition cursor-pointer shrink-0"
        >
          <span className={`material-icons text-base mr-1.5 ${loading ? 'animate-spin' : ''}`}>sync</span>
          同步最新成績與得獎名單
        </button>
      </div>

      {/* ==================== 專區 1：🏛️ 縣府備查版 — 評審決審評分總表 ==================== */}
      <section className="no-print bg-white rounded-2xl border-2 border-stone-200 p-6 shadow-sm space-y-4">
        <div className="border-b border-stone-200 pb-3 flex justify-between items-baseline">
          <div>
            <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-lg text-xs font-black tracking-wider uppercase mr-2">
              專區一
            </span>
            <h3 className="text-xl font-black text-gray-900 inline-block">
              🏛️ 縣府備查版 — 評審決審評分總表
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              包含完整三位評審原始評分、評審評語、平均分數、序位加總、排名與決審獎項。提供縣府存檔備查（★ 依大會規範無須評審個別簽章）。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {CATEGORIES.map(cat => {
            const catData = getProcessedDataForCategory(cat);
            return (
              <div
                key={`county-${cat}`}
                className="border border-stone-300 hover:border-amber-500 bg-stone-50/60 hover:bg-amber-50/40 p-4 rounded-xl flex flex-col justify-between transition shadow-2xs group"
              >
                <div>
                  <div className="text-base font-black text-gray-900 group-hover:text-amber-900 transition mb-1">
                    {cat}
                  </div>
                  <div className="text-xs text-gray-500 font-bold mb-3">
                    參賽隊數：<span className="text-amber-900 font-black">{catData.length} 隊</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openCountyModal(cat)}
                  disabled={catData.length === 0}
                  className="w-full bg-stone-900 hover:bg-black disabled:bg-gray-300 text-white text-xs sm:text-sm font-bold py-2 px-3 rounded-lg flex items-center justify-center transition cursor-pointer shadow-xs"
                >
                  <span className="material-icons text-base mr-1">print</span>
                  開啟備查評分總表
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ==================== 專區 2：✍️ 評審個人簽名版 — 個別評審成績表 ==================== */}
      <section className="no-print bg-white rounded-2xl border-2 border-stone-200 p-6 shadow-sm space-y-4">
        <div className="border-b border-stone-200 pb-3 flex justify-between items-baseline">
          <div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-900 rounded-lg text-xs font-black tracking-wider uppercase mr-2">
              專區二
            </span>
            <h3 className="text-xl font-black text-gray-900 inline-block">
              ✍️ 評審個人簽名版 — 個別評審成績表
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              9 位評審各自評分細項（內容40%、表達30%、臺風20%、技巧10%、分數加總、序位、評語56%），最末頁含「評審委員簽章」與「日期」欄位。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {judgeList.map(j => (
            <div
              key={`judge-card-${j.code}`}
              className="border border-stone-300 hover:border-emerald-600 bg-stone-50/60 hover:bg-emerald-50/30 p-4 rounded-xl flex flex-col justify-between transition shadow-2xs group"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="w-7 h-7 bg-emerald-800 text-white rounded-lg flex items-center justify-center font-black text-sm">
                      {j.code}
                    </span>
                    <span className="text-base font-black text-gray-900">
                      {j.name}
                    </span>
                  </div>
                  <span className="text-xs bg-stone-200 text-stone-700 px-2 py-0.5 rounded-md font-bold">
                    評審代號 {j.code}
                  </span>
                </div>
                <div className="text-xs text-stone-600 font-medium mb-3">
                  負責組別：{j.categoryText}
                </div>
              </div>

              {/* 該評審指派之各組別列印按鈕 */}
              <div className="flex flex-col gap-2 pt-2 border-t border-stone-200">
                {j.assignedCategories.map(cat => {
                  const catTeams = teams.filter(t => {
                    const c = String(t.category || t.Category || t.group_name || t.Group_Name || '').trim();
                    const s = (t.slides_link || t.Slides_Link || '').trim();
                    const v = (t.video_link || t.Video_Link || '').trim();
                    return c === cat && (s || v);
                  });
                  return (
                    <button
                      key={`j-${j.code}-${cat}`}
                      type="button"
                      onClick={() => openJudgeModal(j.code, cat)}
                      disabled={catTeams.length === 0}
                      className="w-full bg-emerald-800 hover:bg-emerald-900 disabled:bg-gray-300 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center justify-between transition cursor-pointer shadow-2xs"
                    >
                      <span className="flex items-center">
                        <span className="material-icons text-sm mr-1">badge</span>
                        {cat.replace('宜蘭在地', '').replace('環境永續', '').replace('校訂課程', '')} 評分表（簽名單）
                      </span>
                      <span className="text-[11px] bg-emerald-950/40 px-1.5 py-0.5 rounded font-black">
                        {catTeams.length} 隊
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== 專區 3：📢 大會公告版 — 獲獎成績榮譽榜 ==================== */}
      <section className="no-print bg-white rounded-2xl border-2 border-stone-200 p-6 shadow-sm space-y-4">
        <div className="border-b border-stone-200 pb-3 flex justify-between items-baseline">
          <div>
            <span className="px-3 py-1 bg-rose-100 text-rose-900 rounded-lg text-xs font-black tracking-wider uppercase mr-2">
              專區三
            </span>
            <h3 className="text-xl font-black text-gray-900 inline-block">
              📢 大會公告版 — 獲獎成績榮譽榜
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              公開給學生、指導老師與社會大眾看。★ 嚴格不公開任何評審原始分數與名次；【特優、優等】刊登作品評語，【簡報之星、學習之星】僅公告名單（評語專函寄送）。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {CATEGORIES.map(cat => {
            const catData = getProcessedDataForCategory(cat);
            const winnersCount = catData.filter(d => d.rank_award || d.feature_award).length;
            return (
              <div
                key={`public-${cat}`}
                className="border border-stone-300 hover:border-rose-500 bg-stone-50/60 hover:bg-rose-50/40 p-4 rounded-xl flex flex-col justify-between transition shadow-2xs group"
              >
                <div>
                  <div className="text-base font-black text-gray-900 group-hover:text-rose-900 transition mb-1">
                    {cat}
                  </div>
                  <div className="text-xs text-gray-500 font-bold mb-3 flex items-center justify-between">
                    <span>參賽：{catData.length} 隊</span>
                    <span className="text-rose-800 font-black">已獲獎：{winnersCount} 隊</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openPublicModal(cat)}
                  disabled={catData.length === 0}
                  className="w-full bg-rose-800 hover:bg-rose-900 disabled:bg-gray-300 text-white text-xs sm:text-sm font-bold py-2 px-3 rounded-lg flex items-center justify-center transition cursor-pointer shadow-xs"
                >
                  <span className="material-icons text-base mr-1">campaign</span>
                  開啟大會公告榮譽榜
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 模態視窗 1：🏛️ 縣府備查版 — 評審決審評分總表                                */}
      {/* ========================================================================= */}
      {modalType === 'county' && (
        <div
          className="print-sheet-modal-backdrop fixed inset-0 bg-black/80 flex justify-center items-start overflow-y-auto p-4 sm:p-6"
          style={{ zIndex: 9999 }}
        >
          <div className="print-sheet-modal-box bg-white w-full max-w-[1700px] rounded-2xl shadow-2xl border border-gray-300 overflow-hidden my-4 relative">
            {/* Modal 操作工具列 (列印時隱藏) */}
            <div className="no-print bg-stone-900 text-white px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 sticky top-0 z-50">
              <div className="flex items-center space-x-3">
                <span className="material-icons text-amber-400 text-2xl">account_balance</span>
                <div>
                  <h3 className="text-base sm:text-lg font-black">
                    🏛️ 縣府備查版 評審評分總表預覽 ── 【{selectedCategory}】
                  </h3>
                  <p className="text-xs text-amber-200">
                    A4 橫向排版・含三位評審分數與評語・送縣府備查專用（無須簽章）
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => executePrint(`${window.APP_CONFIG.CURRENT_YEAR}簡報達人縣府備查評分總表_【${selectedCategory}】`)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-black flex items-center shadow-md transition cursor-pointer"
                >
                  <span className="material-icons text-base mr-1.5">print</span>
                  列印 / 另存為 PDF
                </button>
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-sm font-bold flex items-center transition cursor-pointer"
                >
                  <span className="material-icons text-base mr-1">close</span>
                  關閉
                </button>
              </div>
            </div>

            {/* 縣府備查總表主體 */}
            <div className="p-4 sm:p-6 overflow-x-auto bg-white">
              {(() => {
                const groupJudges = getJudgesForCategory(selectedCategory);
                const processed = getProcessedDataForCategory(selectedCategory);
                const fullHeading = `${CATEGORY_FULL_TITLE_MAP[selectedCategory] || `【${selectedCategory}】`}評分總表`;

                return (
                  <div className="consensus-print-container">
                    <table className="w-full border-collapse judge-print-table text-black" style={{ border: '2px solid #000', tableLayout: 'fixed' }}>
                      <colgroup>
                        <col style={{ width: '12%' }} />
                        <col style={{ width: '3.5%' }} />
                        <col style={{ width: '3.5%' }} />
                        <col style={{ width: '3.5%' }} />
                        <col style={{ width: '3.5%' }} />
                        <col style={{ width: '3.5%' }} />
                        <col style={{ width: '3%' }} />
                        <col style={{ width: '18.5%' }} />
                        <col style={{ width: '18.5%' }} />
                        <col style={{ width: '18.5%' }} />
                        <col style={{ width: '5.25%' }} />
                        <col style={{ width: '5.25%' }} />
                      </colgroup>

                      <thead>
                        {/* 表頭大標題 */}
                        <tr style={{ backgroundColor: '#FFFFFF' }}>
                          <th colSpan={12} className="p-3 border border-black text-left">
                            <div className="flex flex-col sm:flex-row justify-between items-baseline gap-2">
                              <span className="text-xl font-black text-black">
                                {fullHeading}（縣府備查版）
                              </span>
                              <span className="text-xs sm:text-sm font-bold text-black">
                                115學年度 宜蘭縣瘋學習簡報達人擂台賽 ｜ 參賽隊數：共 {processed.length} 隊 ｜ 列印時間：{printTimestamp}
                              </span>
                            </div>
                          </th>
                        </tr>

                        {/* 欄位標題 */}
                        <tr className="font-black text-center print-text-base">
                          <th className="p-2 border border-black" style={{ backgroundColor: '#F9EBC8' }}>
                            隊伍與作品標題
                          </th>
                          {groupJudges.map(j => (
                            <th key={j.code} className="p-1.5 border border-black" style={{ backgroundColor: '#F9EBC8' }}>
                              評審{j.code}
                            </th>
                          ))}
                          <th className="p-1.5 border border-black" style={{ backgroundColor: '#DCE6F1' }}>
                            平均<br />總分
                          </th>
                          <th className="p-1.5 border border-black" style={{ backgroundColor: '#F2F2F2' }}>
                            序位法<br />總分
                          </th>
                          <th className="p-1.5 border border-black" style={{ backgroundColor: '#D7BDE2' }}>
                            排名
                          </th>
                          {groupJudges.map(j => (
                            <th key={`comment-${j.code}`} className="p-2 border border-black" style={{ backgroundColor: '#F5D6D6' }}>
                              {j.code}評語
                            </th>
                          ))}
                          <th className="p-1 border border-black text-center" style={{ backgroundColor: '#F5D6D6' }}>
                            特色<br />表現獎
                          </th>
                          <th className="p-1 border border-black text-center" style={{ backgroundColor: '#F5D6D6' }}>
                            特色<br />優選獎
                          </th>
                        </tr>
                      </thead>

                      <tfoot>
                        <tr style={{ backgroundColor: '#FFFFFF' }}>
                          <td colSpan={12} className="p-1.5 border-t border-black text-xs font-bold text-black">
                            <div className="flex justify-between items-center px-1">
                              <span>115學年度 宜蘭縣瘋學習簡報達人擂台賽 ── {selectedCategory} 縣府備查評審總表</span>
                              <span>大會審定無誤（送縣府核備專用）</span>
                            </div>
                          </td>
                        </tr>
                      </tfoot>

                      <tbody>
                        {processed.map((item, idx) => {
                          const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#FDF8EC';
                          return (
                            <tr key={item.team_id} style={{ backgroundColor: rowBg }}>
                              {/* 1. 隊伍標題 */}
                              <td className="p-2 border border-black align-middle">
                                <div className="text-xs font-bold text-gray-800 mb-0.5 print-text-sm">
                                  第 {String(idx + 1).padStart(2, '0')} 隊 ｜ {item.school}{item.team_name ? `【${item.team_name}】` : ''}
                                </div>
                                <div className="text-sm font-black text-black leading-snug print-text-base">
                                  {item.work_title || '（未填作品名稱）'}
                                </div>
                              </td>

                              {/* 2~4. 三位評審給分與序位 */}
                              {item.judgeDetails.map(jd => (
                                <td key={`sc-${jd.judge_code}`} className="p-1.5 border border-black text-center align-middle">
                                  <div className="font-black text-sm text-black">
                                    {jd.total_score !== null ? jd.total_score : '—'}
                                  </div>
                                  <div className="text-[11px] font-bold text-gray-600">
                                    {jd.rank !== null ? `序位 ${jd.rank}` : ''}
                                  </div>
                                </td>
                              ))}

                              {/* 5. 平均總分 */}
                              <td className="p-1.5 border border-black text-center align-middle font-black text-sm text-blue-900" style={{ backgroundColor: '#EBF1F5' }}>
                                {item.avg_score !== null ? item.avg_score : '—'}
                              </td>

                              {/* 6. 序位法總分 */}
                              <td className="p-1.5 border border-black text-center align-middle font-black text-sm text-stone-900" style={{ backgroundColor: '#F9F9F9' }}>
                                {item.rank_sum !== null ? item.rank_sum : '—'}
                              </td>

                              {/* 7. 排名 */}
                              <td className="p-1.5 border border-black text-center align-middle font-black text-sm text-purple-900" style={{ backgroundColor: '#F4ECF7' }}>
                                {item.final_rank || '—'}
                              </td>

                              {/* 8~10. 三位評審評語 */}
                              {item.judgeDetails.map(jd => (
                                <td key={`cm-${jd.judge_code}`} className="p-2 border border-black text-left align-middle text-xs leading-relaxed text-gray-950">
                                  {jd.comment ? jd.comment : <span className="text-gray-400 italic">（無評語）</span>}
                                  {jd.award_rec && (
                                    <div className="text-[11px] font-bold text-amber-900 mt-0.5">
                                      （推薦：{jd.award_rec}）
                                    </div>
                                  )}
                                </td>
                              ))}

                              {/* 11. 特色表現獎 */}
                              <td className="p-1 border border-black text-center align-middle font-black text-xs">
                                {item.feature_award || '—'}
                              </td>

                              {/* 12. 特色優選獎 */}
                              <td className="p-1 border border-black text-center align-middle font-black text-xs text-amber-950">
                                {item.rank_award || '—'}
                              </td>
                            </tr>
                          );
                        })}

                        {/* 以下空白列 */}
                        <tr className="border-t-2 border-black font-black text-center bg-white print-text-base">
                          <td className="p-2 border border-black font-black">以下空白</td>
                          <td className="p-1.5 border border-black text-gray-700">—</td>
                          <td className="p-1.5 border border-black text-gray-700">—</td>
                          <td className="p-1.5 border border-black text-gray-700">—</td>
                          <td className="p-1.5 border border-black text-gray-700">—</td>
                          <td className="p-1.5 border border-black text-gray-700">—</td>
                          <td className="p-1.5 border border-black text-gray-700">—</td>
                          <td className="p-1.5 border border-black text-gray-700">—</td>
                          <td className="p-1.5 border border-black text-gray-700">—</td>
                          <td className="p-1.5 border border-black text-gray-700">—</td>
                          <td className="p-1.5 border border-black text-gray-700">—</td>
                          <td className="p-1.5 border border-black text-gray-700">—</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 模態視窗 2：✍️ 評審個人簽名版 — 個別評審成績表                                */}
      {/* ========================================================================= */}
      {modalType === 'judge' && (
        <div
          className="print-sheet-modal-backdrop fixed inset-0 bg-black/80 flex justify-center items-start overflow-y-auto p-4 sm:p-6"
          style={{ zIndex: 9999 }}
        >
          <div className="print-sheet-modal-box bg-white w-full max-w-[1600px] rounded-2xl shadow-2xl border border-gray-300 overflow-hidden my-4 relative">
            {/* Modal 操作工具列 */}
            {(() => {
              const currentJudge = judgeList.find(j => j.code === selectedJudgeCode);
              const judgeName = currentJudge ? currentJudge.name : `評審 ${selectedJudgeCode}`;
              const docTitle = `${window.APP_CONFIG.CURRENT_YEAR}簡報達人評分表_【${selectedCategory}】_評審${selectedJudgeCode}_${judgeName}`;

              return (
                <div className="no-print bg-emerald-950 text-white px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 sticky top-0 z-50">
                  <div className="flex items-center space-x-3">
                    <span className="material-icons text-emerald-400 text-2xl">badge</span>
                    <div>
                      <h3 className="text-base sm:text-lg font-black">
                        ✍️ 評審個人評分表預覽 ── 評審 {selectedJudgeCode}（{judgeName}）｜【{selectedCategory}】
                      </h3>
                      <p className="text-xs text-emerald-200">
                        8 欄固定比例版型・評語空間 56%・最末頁含「評審委員簽章」與日期
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => executePrint(docTitle)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-black flex items-center shadow-md transition cursor-pointer"
                    >
                      <span className="material-icons text-base mr-1.5">print</span>
                      列印 / 另存為 PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalType(null)}
                      className="px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-sm font-bold flex items-center transition cursor-pointer"
                    >
                      <span className="material-icons text-base mr-1">close</span>
                      關閉
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* 個別評審評分表主體 (與 judge.js 評審端完全一致之 100% 同規格版型) */}
            <div className="p-4 sm:p-6 overflow-x-auto bg-white">
              {(() => {
                const currentJudge = judgeList.find(j => j.code === selectedJudgeCode);
                const judgeName = currentJudge ? currentJudge.name : `評審 ${selectedJudgeCode}`;

                const groupTeams = teams.filter(t => {
                  const c = String(t.category || t.Category || t.group_name || t.Group_Name || '').trim();
                  const s = (t.slides_link || t.Slides_Link || '').trim();
                  const v = (t.video_link || t.Video_Link || '').trim();
                  return c === selectedCategory && (s || v);
                });

                const calculateTotal = (sc) => {
                  if (!sc) return 0;
                  return (Number(sc.score_content) || 0) +
                         (Number(sc.score_expression) || 0) +
                         (Number(sc.score_stage) || 0) +
                         (Number(sc.score_technique) || 0);
                };

                // 計算該評審組內序位
                const scoredList = [];
                groupTeams.forEach(t => {
                  const tid = String(t.team_id || t.Team_ID);
                  const sc = scores.find(s => String(s.team_id) === tid && String(s.judge_code) === selectedJudgeCode);
                  if (sc) {
                    scoredList.push({ tid, total: calculateTotal(sc) });
                  }
                });
                scoredList.sort((a, b) => b.total - a.total);
                const rankMap = {};
                scoredList.forEach((item, idx) => {
                  if (idx > 0 && item.total === scoredList[idx - 1].total) {
                    rankMap[item.tid] = rankMap[scoredList[idx - 1].tid];
                  } else {
                    rankMap[item.tid] = idx + 1;
                  }
                });

                const savedCount = groupTeams.filter(t => {
                  const tid = String(t.team_id || t.Team_ID);
                  const sc = scores.find(s => String(s.team_id) === tid && String(s.judge_code) === selectedJudgeCode);
                  return sc && (sc.score_content !== undefined && sc.score_content !== '');
                }).length;

                return (
                  <table className="judge-print-table w-full border-collapse border-2 border-black text-black text-sm" style={{ tableLayout: 'fixed' }}>
                    {/* 強制 8 欄固定寬度比例：解決瀏覽器列印因第一列 colspan 導致欄寬被等分問題 */}
                    <colgroup>
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '4%' }} />
                      <col style={{ width: '4%' }} />
                      <col style={{ width: '4%' }} />
                      <col style={{ width: '4%' }} />
                      <col style={{ width: '4.5%' }} />
                      <col style={{ width: '3.5%' }} />
                      <col style={{ width: '56%' }} />
                    </colgroup>

                    {/* 跨頁自動重複之表頭 (thead) */}
                    <thead>
                      {/* 表頭第一列：組別大標題與評審資訊 */}
                      <tr style={{ backgroundColor: '#FFFFFF' }}>
                        <th
                          colSpan={8}
                          className="p-3 border border-black text-left"
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-baseline gap-2">
                            <span className="text-lg sm:text-xl font-black tracking-wide text-black">
                              【{selectedCategory}】評分表
                            </span>
                            <span className="text-sm font-bold text-black">
                              115學年度 宜蘭縣瘋學習簡報達人擂台賽　｜　評審委員：{judgeName}（代號 {selectedJudgeCode}）　｜　已評 {savedCount} / 共 {groupTeams.length} 隊
                            </span>
                          </div>
                        </th>
                      </tr>

                      {/* 表頭第二列：各欄位名稱 */}
                      <tr className="text-center font-black text-black">
                        <th className="p-2.5 border border-black w-[20%]" style={{ backgroundColor: '#F3E5AB' }}>
                          隊伍與作品標題
                        </th>
                        <th className="p-2 border border-black w-[4%]" style={{ backgroundColor: '#DCE6F1' }}>
                          內容<br />40%
                        </th>
                        <th className="p-2 border border-black w-[4%]" style={{ backgroundColor: '#DCE6F1' }}>
                          表達能力<br />30%
                        </th>
                        <th className="p-2 border border-black w-[4%]" style={{ backgroundColor: '#DCE6F1' }}>
                          臺風表現<br />20%
                        </th>
                        <th className="p-2 border border-black w-[4%]" style={{ backgroundColor: '#DCE6F1' }}>
                          製作技巧<br />10%
                        </th>
                        <th className="p-2 border border-black w-[4.5%]" style={{ backgroundColor: '#E4DFEC' }}>
                          分數<br />加總
                        </th>
                        <th className="p-2 border border-black w-[3.5%]" style={{ backgroundColor: '#D8E4BC' }}>
                          序位
                        </th>
                        <th className="p-2.5 border border-black w-[56%]" style={{ backgroundColor: '#F2F2F2' }}>
                          評語
                        </th>
                      </tr>
                    </thead>

                    {/* 跨頁自動重複之頁尾 (tfoot)：防散頁大會標註 */}
                    <tfoot>
                      <tr style={{ backgroundColor: '#FFFFFF' }}>
                        <td colSpan={8} className="p-1.5 border-t border-black text-xs font-bold text-black">
                          <div className="flex justify-between items-center px-1">
                            <span>115學年度 宜蘭縣瘋學習簡報達人擂台賽 — 【{selectedCategory}】評審評分表</span>
                            <span>評審委員：{judgeName}（代號 {selectedJudgeCode}）</span>
                          </div>
                        </td>
                      </tr>
                    </tfoot>

                    {/* 表格內容列 (依參賽隊伍順序排列 + 斑馬紋交替色) */}
                    <tbody>
                      {groupTeams.map((team, idx) => {
                        const tid = String(team.team_id || team.Team_ID);
                        const sc = scores.find(s => String(s.team_id) === tid && String(s.judge_code) === selectedJudgeCode);
                        const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#FDF8EC';
                        const schoolStr = team.school || team.School || '';
                        const teamNameStr = team.team_name || team.Team_Name || '';
                        const workTitle = team.work_title || team.Work_Title || '';
                        const totalVal = sc ? calculateTotal(sc) : 0;
                        const rankVal = sc ? (rankMap[tid] || '-') : '-';

                        return (
                          <tr key={tid} style={{ backgroundColor: rowBg }}>
                            {/* 1. 隊伍序號 + 學校隊伍名稱 (上) + 作品標題 (下) */}
                            <td className="p-2.5 border border-black align-middle">
                              <div className="text-xs font-bold text-gray-800 mb-1">
                                第 {String(idx + 1).padStart(2, '0')} 隊｜{schoolStr}{teamNameStr ? `【${teamNameStr}】` : ''}
                              </div>
                              <div className="text-sm sm:text-base font-black text-black leading-snug">
                                {workTitle}
                              </div>
                            </td>

                            {/* 2~5. 四項配分 */}
                            <td className="p-2 border border-black text-center align-middle font-bold text-sm">
                              {sc ? sc.score_content : ''}
                            </td>
                            <td className="p-2 border border-black text-center align-middle font-bold text-sm">
                              {sc ? sc.score_expression : ''}
                            </td>
                            <td className="p-2 border border-black text-center align-middle font-bold text-sm">
                              {sc ? sc.score_stage : ''}
                            </td>
                            <td className="p-2 border border-black text-center align-middle font-bold text-sm">
                              {sc ? sc.score_technique : ''}
                            </td>

                            {/* 6. 分數加總 */}
                            <td className="p-2 border border-black text-center align-middle font-black text-base">
                              {sc ? totalVal : 0}
                            </td>

                            {/* 7. 序位 */}
                            <td className="p-2 border border-black text-center align-middle font-black text-base">
                              {rankVal}
                            </td>

                            {/* 8. 評語 (純淨評語，最大化寬度) */}
                            <td className="p-2.5 border border-black align-top text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                              {sc && sc.comment ? sc.comment : ''}
                            </td>
                          </tr>
                        );
                      })}

                      {/* 防竄改「以下空白」列 */}
                      <tr style={{ backgroundColor: '#FFFFFF' }}>
                        <td className="p-2.5 border border-black text-center font-black text-sm tracking-widest">
                          以下空白
                        </td>
                        <td className="p-2 border border-black text-center text-gray-400"></td>
                        <td className="p-2 border border-black text-center text-gray-400"></td>
                        <td className="p-2 border border-black text-center text-gray-400"></td>
                        <td className="p-2 border border-black text-center text-gray-400"></td>
                        <td className="p-2 border border-black text-center font-bold text-gray-500">0</td>
                        <td className="p-2 border border-black text-center font-bold text-gray-500">—</td>
                        <td className="p-2 border border-black text-center text-gray-400">—</td>
                      </tr>

                      {/* 最下方：請評審委員簽名 (維持只在最後一頁簽署) */}
                      <tr className="judge-signature-block">
                        <td
                          colSpan={2}
                          className="p-5 border border-black text-center align-middle font-black text-base sm:text-lg"
                          style={{ backgroundColor: '#F9EBC8' }}
                        >
                          請評審委員簽名
                        </td>
                        <td
                          colSpan={6}
                          className="p-3 border border-black align-top"
                          style={{ backgroundColor: '#FDF8EC', height: '90px' }}
                        >
                          <div className="h-full flex flex-col justify-between" style={{ minHeight: '70px' }}>
                            <div className="text-xs font-bold text-gray-800 text-left">
                              評審委員簽章：
                            </div>
                            <div className="text-xs font-bold text-gray-800 text-right">
                              日期：中華民國 115 年 　　 月 　　 日
                            </div>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 模態視窗 3：📢 大會公告版 — 獲獎成績榮譽榜                                */}
      {/* ========================================================================= */}
      {modalType === 'public' && (
        <div
          className="print-sheet-modal-backdrop fixed inset-0 bg-black/80 flex justify-center items-start overflow-y-auto p-4 sm:p-6"
          style={{ zIndex: 9999 }}
        >
          <div className="print-sheet-modal-box bg-white w-full max-w-[1500px] rounded-2xl shadow-2xl border border-gray-300 overflow-hidden my-4 relative">
            {/* Modal 操作工具列 */}
            <div className="no-print bg-rose-950 text-white px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 sticky top-0 z-50">
              <div className="flex items-center space-x-3">
                <span className="material-icons text-amber-300 text-2xl">emoji_events</span>
                <div>
                  <h3 className="text-base sm:text-lg font-black">
                    📢 大會公告獲獎榮譽榜預覽 ── 【{selectedCategory}】
                  </h3>
                  <p className="text-xs text-rose-200">
                    學生與大眾公開版・不公開分數與排名・特優/優等附評語・簡報/學習之星僅公告獎項
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => executePrint(`${window.APP_CONFIG.CURRENT_YEAR}簡報達人大會公告榮譽榜_【${selectedCategory}】`)}
                  className="px-5 py-2.5 bg-rose-700 hover:bg-rose-600 text-white rounded-xl text-sm font-black flex items-center shadow-md transition cursor-pointer"
                >
                  <span className="material-icons text-base mr-1.5">print</span>
                  列印 / 另存為 PDF
                </button>
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2.5 bg-stone-700 hover:bg-stone-800 text-white rounded-xl text-sm font-bold flex items-center transition cursor-pointer"
                >
                  <span className="material-icons text-base mr-1">close</span>
                  關閉
                </button>
              </div>
            </div>

            {/* 大會公告榮譽榜主體 (紅白金獎狀風格) */}
            <div className="p-6 sm:p-10 bg-white space-y-8">
              {(() => {
                const processed = getProcessedDataForCategory(selectedCategory);

                // 篩選特優與優等隊伍 (特色優選獎)
                const topWinners = processed.filter(d => d.rank_award === '特優' || d.rank_award === '優等');
                // 依特優在前、優等在後排序
                topWinners.sort((a, b) => {
                  if (a.rank_award === '特優' && b.rank_award !== '特優') return -1;
                  if (b.rank_award === '特優' && a.rank_award !== '特優') return 1;
                  return a.seq_index - b.seq_index;
                });

                // 篩選簡報之星與學習之星 (特色表現獎)
                const starWinners = processed.filter(d => d.feature_award === '簡報之星' || d.feature_award === '學習之星');
                starWinners.sort((a, b) => {
                  if (a.feature_award === '簡報之星' && b.feature_award !== '簡報之星') return -1;
                  if (b.feature_award === '簡報之星' && a.feature_award !== '簡報之星') return 1;
                  return a.seq_index - b.seq_index;
                });

                return (
                  <div className="space-y-8">
                    {/* 大會公告榮譽榜標頭 */}
                    <div className="text-center border-b-4 border-amber-500 pb-5 space-y-2">
                      <div className="text-sm sm:text-base font-extrabold tracking-widest text-amber-800">
                        115學年度 宜蘭縣瘋學習簡報達人擂台賽
                      </div>
                      <h2 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight">
                        {selectedCategory} ── 決審得獎榮譽榜
                      </h2>
                      <p className="text-xs sm:text-sm font-bold text-stone-600 max-w-3xl mx-auto pt-1">
                        ★ 恭賀所有榮獲殊榮之參賽隊伍與指導教師！依大會決審成績規準，本榜單僅呈現獲獎肯定與作品講評，不公開原始給分與名次。
                      </p>
                    </div>

                    {/* ================= 第一部分：特色優選獎（特優・優等）================= */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 border-l-4 border-amber-600 pl-3">
                        <span className="material-icons text-amber-600 text-2xl">military_tech</span>
                        <h3 className="text-lg sm:text-xl font-black text-stone-900">
                          【特色優選獎】獲獎榮譽榜（特優・優等）
                        </h3>
                        <span className="text-xs text-amber-900 font-bold bg-amber-100 px-2.5 py-0.5 rounded-full">
                          共 {topWinners.length} 隊
                        </span>
                      </div>

                      {topWinners.length === 0 ? (
                        <div className="p-8 text-center bg-stone-50 border border-stone-200 rounded-xl text-stone-500 text-sm font-bold">
                          本組別目前尚未勾選或審定「特優」與「優等」得獎名單。
                        </div>
                      ) : (
                        <table className="judge-print-table w-full border-collapse border-2 border-black text-black text-sm" style={{ tableLayout: 'fixed' }}>
                          <colgroup>
                            <col style={{ width: '8%' }} />
                            <col style={{ width: '18%' }} />
                            <col style={{ width: '22%' }} />
                            <col style={{ width: '52%' }} />
                          </colgroup>
                          <thead>
                            <tr className="font-black text-center" style={{ backgroundColor: '#FDF3D8' }}>
                              <th className="p-2.5 border border-black">獲獎殊榮</th>
                              <th className="p-2.5 border border-black">學校與參賽隊伍</th>
                              <th className="p-2.5 border border-black">作品標題</th>
                              <th className="p-2.5 border border-black">大會評審綜合評語與講評</th>
                            </tr>
                          </thead>
                          <tbody>
                            {topWinners.map((winner, wIdx) => {
                              const isGold = winner.rank_award === '特優';
                              const rowBg = wIdx % 2 === 0 ? '#FFFFFF' : '#FFFDF7';
                              const allComments = winner.judgeDetails
                                .filter(jd => jd.comment && jd.comment.trim())
                                .map(jd => `【評審${jd.judge_code}】：${jd.comment}`);

                              return (
                                <tr key={`top-${winner.team_id}`} style={{ backgroundColor: rowBg }}>
                                  {/* 1. 獎項標籤 */}
                                  <td className="p-3 border border-black text-center align-middle">
                                    <span className={`inline-block px-3 py-1 rounded-lg text-sm font-black border ${
                                      isGold
                                        ? 'bg-yellow-400 text-yellow-950 border-yellow-600'
                                        : 'bg-amber-200 text-amber-950 border-amber-500'
                                    }`}>
                                      {winner.rank_award}
                                    </span>
                                  </td>

                                  {/* 2. 學校隊名 */}
                                  <td className="p-3 border border-black align-middle text-stone-900 font-bold">
                                    <div className="text-xs text-stone-600">
                                      第 {String(winner.seq_index).padStart(2, '0')} 隊
                                    </div>
                                    <div className="text-sm font-black text-black">
                                      {winner.school}
                                    </div>
                                    {winner.team_name && (
                                      <div className="text-xs text-amber-950 font-bold">
                                        【{winner.team_name}】
                                      </div>
                                    )}
                                  </td>

                                  {/* 3. 作品標題 */}
                                  <td className="p-3 border border-black align-middle font-black text-sm sm:text-base text-black leading-snug">
                                    {winner.work_title}
                                  </td>

                                  {/* 4. 評語摘要 */}
                                  <td className="p-3 border border-black align-middle text-xs sm:text-sm leading-relaxed text-stone-900 space-y-1">
                                    {allComments.length > 0 ? (
                                      allComments.map((cm, cIdx) => (
                                        <div key={cIdx} className="border-b border-stone-200/60 pb-1 last:border-none">
                                          {cm}
                                        </div>
                                      ))
                                    ) : (
                                      <span className="text-stone-400 italic">（作品表現卓越，獲評審團一致肯定）</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* ================= 第二部分：特色表現獎（簡報之星・學習之星）================= */}
                    <div className="space-y-4 pt-4 border-t-2 border-dashed border-stone-300">
                      <div className="flex items-center space-x-2 border-l-4 border-teal-600 pl-3">
                        <span className="material-icons text-teal-600 text-2xl">stars</span>
                        <h3 className="text-lg sm:text-xl font-black text-stone-900">
                          【特色表現獎】獲獎榮譽榜（簡報之星・學習之星）
                        </h3>
                        <span className="text-xs text-teal-900 font-bold bg-teal-100 px-2.5 py-0.5 rounded-full">
                          共 {starWinners.length} 隊
                        </span>
                      </div>
                      <p className="text-xs font-bold text-stone-500 pl-3">
                        ★ 備註：依大會作業規劃，【簡報之星】與【學習之星】獲獎隊伍之個別評審指導評語，後續將由大會專函郵寄至各校指導老師與選手，線上僅公告獲獎殊榮。
                      </p>

                      {starWinners.length === 0 ? (
                        <div className="p-8 text-center bg-stone-50 border border-stone-200 rounded-xl text-stone-500 text-sm font-bold">
                          本組別目前尚未勾選或審定「簡報之星」與「學習之星」得獎名單。
                        </div>
                      ) : (
                        <table className="judge-print-table w-full border-collapse border-2 border-black text-black text-sm" style={{ tableLayout: 'fixed' }}>
                          <colgroup>
                            <col style={{ width: '10%' }} />
                            <col style={{ width: '25%' }} />
                            <col style={{ width: '35%' }} />
                            <col style={{ width: '30%' }} />
                          </colgroup>
                          <thead>
                            <tr className="font-black text-center" style={{ backgroundColor: '#E6F4F1' }}>
                              <th className="p-2.5 border border-black">獲獎殊榮</th>
                              <th className="p-2.5 border border-black">學校與參賽隊伍</th>
                              <th className="p-2.5 border border-black">作品標題</th>
                              <th className="p-2.5 border border-black">指導評語發布方式</th>
                            </tr>
                          </thead>
                          <tbody>
                            {starWinners.map((winner, sIdx) => {
                              const isPresentation = winner.feature_award === '簡報之星';
                              const rowBg = sIdx % 2 === 0 ? '#FFFFFF' : '#F6FBF9';

                              return (
                                <tr key={`star-${winner.team_id}`} style={{ backgroundColor: rowBg }}>
                                  {/* 1. 獎項標籤 */}
                                  <td className="p-3 border border-black text-center align-middle">
                                    <span className={`inline-block px-3 py-1 rounded-lg text-sm font-black border ${
                                      isPresentation
                                        ? 'bg-teal-600 text-white border-teal-700'
                                        : 'bg-indigo-600 text-white border-indigo-700'
                                    }`}>
                                      {winner.feature_award}
                                    </span>
                                  </td>

                                  {/* 2. 學校隊名 */}
                                  <td className="p-3 border border-black align-middle text-stone-900 font-bold">
                                    <div className="text-xs text-stone-600">
                                      第 {String(winner.seq_index).padStart(2, '0')} 隊
                                    </div>
                                    <div className="text-sm font-black text-black">
                                      {winner.school}
                                    </div>
                                    {winner.team_name && (
                                      <div className="text-xs text-stone-700 font-bold">
                                        【{winner.team_name}】
                                      </div>
                                    )}
                                  </td>

                                  {/* 3. 作品標題 */}
                                  <td className="p-3 border border-black align-middle font-black text-sm sm:text-base text-black leading-snug">
                                    {winner.work_title}
                                  </td>

                                  {/* 4. 評語發送說明 */}
                                  <td className="p-3 border border-black align-middle text-center text-xs text-stone-700 font-bold">
                                    <span className="inline-block bg-stone-100 text-stone-800 px-3 py-1 rounded-md border border-stone-300">
                                      ✉️ 評審專屬評語後續專函郵寄寄發
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* 大會官方頁尾資訊 */}
                    <div className="pt-6 border-t-2 border-black flex flex-col sm:flex-row justify-between items-center text-xs font-bold text-stone-700">
                      <div>主辦單位：宜蘭縣政府教育處 ｜ 承辦學校：宜蘭縣瘋學習推動小組</div>
                      <div>中華民國 115 年 11 月 大會決審公布</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
